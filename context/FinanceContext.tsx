
import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { CategoryItem, Transaction, TransactionType, BackupData, SubcategoryItem, FinancialSummary } from '../types';
import { DEFAULT_CATEGORIES, SYSTEM_IDS } from '../constants';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useDataMigration } from '../hooks/useDataMigration';

interface FinanceContextType {
  // State
  transactions: Transaction[];
  categories: CategoryItem[];
  savedTags: string[];
  isPrivateMode: boolean;
  
  // Derived State
  allTags: string[];
  summary: FinancialSummary;
  operationalBalance: number;

  // Setters / Actions
  setIsPrivateMode: (val: boolean) => void;
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  clearTransactions: () => void;
  
  // Bulk Actions
  bulkUpdateCategory: (ids: string[], categoryId: string, subcategoryId?: string) => void;
  bulkUpdateTags: (ids: string[], tags: string[], mode: 'ADD' | 'REPLACE') => void;
  splitTransaction: (originalId: string, newTransactions: Omit<Transaction, 'id'>[]) => void;

  // Category Actions
  updateCategories: (cats: CategoryItem[]) => void;
  deleteCategory: (id: string, targetCatId?: string, targetSubId?: string) => void;
  deleteSubcategory: (catId: string, subId: string) => void;

  // Tag Actions
  addTag: (tag: string) => void;
  renameTag: (oldName: string, newName: string) => void;
  deleteTag: (tagName: string) => void;

  // Import/Export
  importData: (importedTxs: Transaction[], clear: boolean, newCategories?: CategoryItem[]) => void;
  restoreBackup: (backup: BackupData) => void;
  loadDemoData: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useLocalStorage<CategoryItem[]>('btrackr_categories', DEFAULT_CATEGORIES);
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('btrackr_transactions', []);
  const [savedTags, setSavedTags] = useLocalStorage<string[]>('btrackr_tags', []);
  const [isPrivateMode, setIsPrivateMode] = useLocalStorage<boolean>('btrackr_private_mode', false);

  // --- Migration ---
  useDataMigration({ categories, setCategories, transactions, setTransactions });

  // --- Derived State ---
  const allTags = useMemo(() => {
     const tags = new Set<string>(savedTags);
     transactions.forEach(t => t.tags?.forEach(tag => tags.add(tag)));
     return Array.from(tags).sort();
  }, [transactions, savedTags]);

  const summary = useMemo(() => {
    return transactions.reduce(
      (acc, t) => {
        const cat = categories.find(c => c.id === t.categoryId);
        if (t.type === TransactionType.INCOME) {
          acc.totalIncome += t.amount;
        } else {
          if (cat?.isIncludedInSavings) {
            acc.savingsAmount += t.amount;
          } else {
            acc.totalExpense += t.amount;
          }
        }
        return acc;
      },
      { totalIncome: 0, totalExpense: 0, savingsAmount: 0, balance: 0 } as FinancialSummary
    );
  }, [transactions, categories]);

  // Update balance in summary object (Income - Consumption)
  summary.balance = summary.totalIncome - summary.totalExpense;

  // Operational Balance (Net Cashflow) = Income - Expense - Savings
  const operationalBalance = summary.totalIncome - summary.totalExpense - summary.savingsAmount;

  // --- Helpers ---
  const ensureSubcategory = (categoryId: string, providedSubId?: string): string => {
    if (providedSubId) return providedSubId;
    const category = categories.find(c => c.id === categoryId);
    if (!category) return ''; 
    const inneSub = category.subcategories.find(s => s.name.toLowerCase() === 'inne');
    if (inneSub) return inneSub.id;

    const newSubId = crypto.randomUUID();
    const newSub: SubcategoryItem = { id: newSubId, name: 'Inne' };
    setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, subcategories: [...c.subcategories, newSub] } : c));
    return newSubId;
  };

  // --- Actions ---

  const addTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const transaction: Transaction = {
      ...newTx,
      id: crypto.randomUUID(),
      subcategoryId: ensureSubcategory(newTx.categoryId, newTx.subcategoryId)
    };
    setTransactions(prev => [transaction, ...prev]);
  };

  const updateTransaction = (updated: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === updated.id ? {
       ...updated,
       subcategoryId: ensureSubcategory(updated.categoryId, updated.subcategoryId)
    } : t));
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const clearTransactions = () => setTransactions([]);

  const bulkUpdateCategory = (ids: string[], newCategoryId: string, newSubcategoryId?: string) => {
     setTransactions(prev => prev.map(t => {
        if (ids.includes(t.id)) {
           return {
              ...t,
              categoryId: newCategoryId,
              subcategoryId: ensureSubcategory(newCategoryId, newSubcategoryId)
           };
        }
        return t;
     }));
  };

  const bulkUpdateTags = (ids: string[], tags: string[], mode: 'ADD' | 'REPLACE') => {
      setTransactions(prev => prev.map(t => {
          if (ids.includes(t.id)) {
              let newTags = t.tags || [];
              if (mode === 'REPLACE') {
                  newTags = tags;
              } else {
                  const existingSet = new Set(newTags);
                  tags.forEach(tag => existingSet.add(tag));
                  newTags = Array.from(existingSet);
              }
              return { ...t, tags: newTags };
          }
          return t;
      }));
  };

  const splitTransaction = (originalId: string, newTransactions: Omit<Transaction, 'id'>[]) => {
     setTransactions(prev => {
        const filtered = prev.filter(t => t.id !== originalId);
        const added = newTransactions.map(t => ({
           ...t,
           id: crypto.randomUUID(),
           subcategoryId: ensureSubcategory(t.categoryId, t.subcategoryId)
        }));
        return [...added, ...filtered];
     });
  };

  const updateCategories = (newCategories: CategoryItem[]) => setCategories(newCategories);

  const deleteCategory = (id: string, targetCategoryId?: string, targetSubcategoryId?: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    const fallbackId = SYSTEM_IDS.OTHER_EXPENSE;
    const finalTargetId = targetCategoryId || fallbackId;
    setTransactions(prev => prev.map(t => {
      if (t.categoryId === id) {
        return { ...t, categoryId: finalTargetId, subcategoryId: targetSubcategoryId || undefined };
      }
      return t;
    }));
  };

  const deleteSubcategory = (catId: string, subId: string) => {
    setCategories(prev => prev.map(c => {
       if (c.id !== catId) return c;
       return { ...c, subcategories: c.subcategories.filter(s => s.id !== subId) };
    }));
    // Remap transactions to 'Inne'
    const cat = categories.find(c => c.id === catId);
    const inneSub = cat?.subcategories.find(s => s.name === 'Inne');
    const targetSubId = inneSub ? inneSub.id : undefined;
    setTransactions(prev => prev.map(t => {
       if (t.categoryId === catId && t.subcategoryId === subId) {
          return { ...t, subcategoryId: targetSubId };
       }
       return t;
    }));
  };

  const addTag = (tagName: string) => {
     if (!savedTags.includes(tagName)) setSavedTags(prev => [...prev, tagName]);
  };

  const renameTag = (oldName: string, newName: string) => {
     setTransactions(prev => prev.map(t => {
        if (t.tags && t.tags.includes(oldName)) {
           const newTags = t.tags.map(tag => tag === oldName ? newName : tag);
           return { ...t, tags: Array.from(new Set(newTags)) };
        }
        return t;
     }));
     setSavedTags(prev => prev.map(tag => tag === oldName ? newName : tag));
  };

  const deleteTag = (tagName: string) => {
     setTransactions(prev => prev.map(t => {
        if (t.tags && t.tags.includes(tagName)) {
           return { ...t, tags: t.tags.filter(tag => tag !== tagName) };
        }
        return t;
     }));
     setSavedTags(prev => prev.filter(tag => tag !== tagName));
  };

  const importData = (importedTransactions: Transaction[], clearHistory: boolean, newCategories?: CategoryItem[]) => {
    if (newCategories) {
       setCategories(prev => {
          const combined = [...prev];
          newCategories.forEach(newCat => {
             if (!combined.find(c => c.name.toLowerCase() === newCat.name.toLowerCase())) {
                combined.push(newCat);
             }
          });
          return combined;
       });
    }
    if (clearHistory) {
      setTransactions(importedTransactions);
    } else {
      setTransactions(prev => {
        const existingSignatures = new Set(prev.map(t => `${t.date}-${t.amount}-${t.description}`));
        const newUnique = importedTransactions.filter(t => !existingSignatures.has(`${t.date}-${t.amount}-${t.description}`));
        return [...newUnique, ...prev];
      });
    }
  };

  const restoreBackup = (backup: BackupData) => {
     setCategories(backup.categories);
     setTransactions(backup.transactions);
     setIsPrivateMode(backup.settings.isPrivateMode);
  };

  const loadDemoData = () => {
    import('../utils/demoData').then(module => {
       const demoTxs = module.generateDemoTransactions(categories);
       setTransactions(demoTxs);
    });
  };

  const value = {
    transactions, categories, savedTags, isPrivateMode, setIsPrivateMode,
    allTags, summary, operationalBalance,
    addTransaction, updateTransaction, deleteTransaction, clearTransactions,
    bulkUpdateCategory, bulkUpdateTags, splitTransaction,
    updateCategories, deleteCategory, deleteSubcategory,
    addTag, renameTag, deleteTag,
    importData, restoreBackup, loadDemoData
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
