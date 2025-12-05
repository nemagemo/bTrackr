
import React, { createContext, useContext, useMemo, ReactNode, useEffect } from 'react';
import { CategoryItem, Transaction, TransactionType, BackupData, SubcategoryItem, FinancialSummary, RecurringTransaction, Frequency } from '../types';
import { DEFAULT_CATEGORIES, SYSTEM_IDS } from '../constants';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useDataMigration } from '../hooks/useDataMigration';

type Theme = 'light' | 'dark';

interface FinanceContextType {
  // State
  transactions: Transaction[];
  categories: CategoryItem[];
  recurringTransactions: RecurringTransaction[];
  savedTags: string[];
  isPrivateMode: boolean;
  theme: Theme;
  
  // Derived State
  allTags: string[];
  summary: FinancialSummary;
  operationalBalance: number;

  // Setters / Actions
  setIsPrivateMode: (val: boolean) => void;
  toggleTheme: () => void;
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  clearTransactions: () => void;
  
  // Recurring Actions
  addRecurringTransaction: (rule: Omit<RecurringTransaction, 'id'>) => void;
  deleteRecurringTransaction: (id: string) => void;
  processRecurringTransaction: (ruleId: string, amount?: number) => void; // For manual approval
  skipRecurringTransaction: (ruleId: string) => void; // Just advance date without paying

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
  importData: (importedTransactions: Transaction[], clearHistory: boolean, newCategories?: CategoryItem[]) => void;
  restoreBackup: (backup: BackupData) => void;
  loadDemoData: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useLocalStorage<CategoryItem[]>('btrackr_categories', DEFAULT_CATEGORIES);
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('btrackr_transactions', []);
  const [recurringTransactions, setRecurringTransactions] = useLocalStorage<RecurringTransaction[]>('btrackr_recurring', []);
  const [savedTags, setSavedTags] = useLocalStorage<string[]>('btrackr_tags', []);
  const [isPrivateMode, setIsPrivateMode] = useLocalStorage<boolean>('btrackr_private_mode', false);
  const [theme, setTheme] = useLocalStorage<Theme>('btrackr_theme', 'light');

  // --- Migration ---
  useDataMigration({ categories, setCategories, transactions, setTransactions });

  // --- Theme Effect ---
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // --- Recurring Engine ---
  // Helper to calculate next date
  const calculateNextDate = (dateStr: string, freq: Frequency): string => {
    const date = new Date(dateStr);
    if (freq === 'WEEKLY') date.setDate(date.getDate() + 7);
    else if (freq === 'MONTHLY') date.setMonth(date.getMonth() + 1);
    else if (freq === 'YEARLY') date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  };

  useEffect(() => {
    // Check for auto-pay transactions that are due
    const today = new Date().toISOString().split('T')[0];
    let newTransactions: Transaction[] = [];
    let updatedRecurring = [...recurringTransactions];
    let hasChanges = false;

    updatedRecurring = updatedRecurring.map(rule => {
      // Only process AUTO pay rules here
      if (rule.autoPay && rule.nextDueDate <= today) {
        hasChanges = true;
        
        let currentDueDate = rule.nextDueDate;
        
        // Loop while the due date is in the past or today (Catch-up logic)
        // This ensures if we missed 3 months, we generate 3 transactions
        while (currentDueDate <= today) {
            // 1. Create Transaction for this specific occurrence
            const newTx: Transaction = {
              id: crypto.randomUUID(),
              date: currentDueDate, // Use the historical date, not 'today'
              description: rule.description,
              amount: rule.amount,
              type: rule.type,
              categoryId: rule.categoryId,
              subcategoryId: rule.subcategoryId,
              tags: rule.tags,
              isRecurring: true
            };
            newTransactions.push(newTx);

            // 2. Advance to the next period
            currentDueDate = calculateNextDate(currentDueDate, rule.frequency);
        }

        // 3. Update the rule with the new future date
        return { ...rule, nextDueDate: currentDueDate };
      }
      return rule;
    });

    if (hasChanges) {
      setTransactions(prev => [...newTransactions, ...prev]);
      setRecurringTransactions(updatedRecurring);
    }
  }, [recurringTransactions]); // Dependency on recurringTransactions ensures it runs on load

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

  summary.balance = summary.totalIncome - summary.totalExpense;
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

  // Recurring Actions
  const addRecurringTransaction = (rule: Omit<RecurringTransaction, 'id'>) => {
    const newRule: RecurringTransaction = {
      ...rule,
      id: crypto.randomUUID(),
      subcategoryId: ensureSubcategory(rule.categoryId, rule.subcategoryId)
    };
    setRecurringTransactions(prev => [...prev, newRule]);
  };

  const deleteRecurringTransaction = (id: string) => {
    setRecurringTransactions(prev => prev.filter(r => r.id !== id));
  };

  const processRecurringTransaction = (ruleId: string, amount?: number) => {
    const rule = recurringTransactions.find(r => r.id === ruleId);
    if (!rule) return;

    // 1. Create the transaction
    const newTx: Transaction = {
      id: crypto.randomUUID(),
      date: rule.nextDueDate, // Or new Date().toISOString() if we want "paid today"
      description: rule.description,
      amount: amount !== undefined ? amount : rule.amount, // Allow override
      type: rule.type,
      categoryId: rule.categoryId,
      subcategoryId: rule.subcategoryId,
      tags: rule.tags,
      isRecurring: true
    };
    setTransactions(prev => [newTx, ...prev]);

    // 2. Advance the rule
    const nextDate = calculateNextDate(rule.nextDueDate, rule.frequency);
    setRecurringTransactions(prev => prev.map(r => r.id === ruleId ? { ...r, nextDueDate: nextDate } : r));
  };

  const skipRecurringTransaction = (ruleId: string) => {
    const rule = recurringTransactions.find(r => r.id === ruleId);
    if (!rule) return;
    const nextDate = calculateNextDate(rule.nextDueDate, rule.frequency);
    setRecurringTransactions(prev => prev.map(r => r.id === ruleId ? { ...r, nextDueDate: nextDate } : r));
  };

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
     if (backup.recurringTransactions) {
        setRecurringTransactions(backup.recurringTransactions);
     }
     setIsPrivateMode(backup.settings.isPrivateMode);
  };

  const loadDemoData = () => {
    import('../utils/demoData').then(module => {
       const demoTxs = module.generateDemoTransactions(categories);
       setTransactions(demoTxs);
    });
  };

  const value = {
    transactions, categories, recurringTransactions, savedTags, isPrivateMode, setIsPrivateMode, theme, toggleTheme,
    allTags, summary, operationalBalance,
    addTransaction, updateTransaction, deleteTransaction, clearTransactions,
    addRecurringTransaction, deleteRecurringTransaction, processRecurringTransaction, skipRecurringTransaction,
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
