
import React, { createContext, useContext, useMemo, ReactNode, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CategoryItem, Transaction, TransactionType, BackupData, FinancialSummary, RecurringTransaction } from '../types';
import { db, migrateFromLocalStorage } from '../db';
import { ensureSubcategory } from '../utils/dbHelpers';
import { SYSTEM_IDS } from '../constants';

// Hooks
import { useRecurringTransactions } from '../hooks/useRecurringTransactions';
import { useDataImportExport } from '../hooks/useDataImportExport';

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
  processRecurringTransaction: (ruleId: string, amount?: number) => void;
  skipRecurringTransaction: (ruleId: string) => void;

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
  factoryReset: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

/**
 * Provider danych finansowych.
 * 
 * Architektura:
 * - Źródło prawdy: IndexedDB (za pośrednictwem biblioteki Dexie.js).
 * - Reaktywność: Hook `useLiveQuery` automatycznie odświeża komponenty, gdy dane w bazie ulegną zmianie.
 * - Logika: Rozdzielona na mniejsze hooki (useRecurringTransactions, useDataImportExport).
 */
export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // --- IndexedDB Live Queries (Core Data) ---
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const settingsArray = useLiveQuery(() => db.settings.toArray()) || [];

  // --- Sub-Hooks ---
  const { 
    recurringTransactions, 
    addRecurringTransaction, 
    deleteRecurringTransaction, 
    processRecurringTransaction, 
    skipRecurringTransaction 
  } = useRecurringTransactions();

  const { 
    importData, 
    restoreBackup, 
    loadDemoData, 
    factoryReset 
  } = useDataImportExport(categories);

  // --- Settings State ---
  const savedTags = useMemo(() => settingsArray.find(s => s.key === 'savedTags')?.value || [], [settingsArray]);
  const isPrivateMode = useMemo(() => settingsArray.find(s => s.key === 'isPrivateMode')?.value || false, [settingsArray]);
  const theme = useMemo<Theme>(() => settingsArray.find(s => s.key === 'theme')?.value || 'light', [settingsArray]);

  // --- Initial Migration (LocalStorage -> IndexedDB) ---
  useEffect(() => {
    migrateFromLocalStorage();
  }, []);

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
    const newTheme = theme === 'light' ? 'dark' : 'light';
    db.settings.put({ key: 'theme', value: newTheme });
  };

  const setIsPrivateMode = (val: boolean) => {
    db.settings.put({ key: 'isPrivateMode', value: val });
  };

  const setSavedTags = (tags: string[]) => {
    db.settings.put({ key: 'savedTags', value: tags });
  };

  // --- Derived State (Memoized Calculations) ---
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

  // --- Core CRUD Actions (Direct DB Operations) ---

  const addTransaction = async (newTx: Omit<Transaction, 'id'>) => {
    const subId = await ensureSubcategory(newTx.categoryId, newTx.subcategoryId);
    const transaction: Transaction = {
      ...newTx,
      id: crypto.randomUUID(),
      subcategoryId: subId
    };
    await db.transactions.add(transaction);
  };

  const updateTransaction = async (updated: Transaction) => {
    const subId = await ensureSubcategory(updated.categoryId, updated.subcategoryId);
    await db.transactions.put({ ...updated, subcategoryId: subId });
  };

  const deleteTransaction = async (id: string) => {
    await db.transactions.delete(id);
  };

  const clearTransactions = async () => {
    await db.transactions.clear();
  };

  const bulkUpdateCategory = async (ids: string[], newCategoryId: string, newSubcategoryId?: string) => {
     // Batch processing
     const subId = await ensureSubcategory(newCategoryId, newSubcategoryId);
     const txsToUpdate = transactions.filter(t => ids.includes(t.id));
     const updates = txsToUpdate.map(t => ({ ...t, categoryId: newCategoryId, subcategoryId: subId }));
     await db.transactions.bulkPut(updates);
  };

  const bulkUpdateTags = async (ids: string[], tags: string[], mode: 'ADD' | 'REPLACE') => {
      const txsToUpdate = transactions.filter(t => ids.includes(t.id));
      const updates = txsToUpdate.map(t => {
          let newTags = t.tags || [];
          if (mode === 'REPLACE') {
              newTags = tags;
          } else {
              const existingSet = new Set(newTags);
              tags.forEach(tag => existingSet.add(tag));
              newTags = Array.from(existingSet);
          }
          return { ...t, tags: newTags };
      });
      await db.transactions.bulkPut(updates);
  };

  const splitTransaction = async (originalId: string, newTransactions: Omit<Transaction, 'id'>[]) => {
     await (db as any).transaction('rw', db.transactions, db.categories, async () => {
        await db.transactions.delete(originalId);
        
        const txsToAdd: Transaction[] = [];
        for (const t of newTransactions) {
            const subId = await ensureSubcategory(t.categoryId, t.subcategoryId);
            txsToAdd.push({
                ...t,
                id: crypto.randomUUID(),
                subcategoryId: subId
            });
        }
        await db.transactions.bulkAdd(txsToAdd);
     });
  };

  const updateCategories = async (newCategories: CategoryItem[]) => {
      await (db as any).transaction('rw', db.categories, async () => {
          await db.categories.clear();
          await db.categories.bulkAdd(newCategories);
      });
  };

  const deleteCategory = async (id: string, targetCategoryId?: string, targetSubcategoryId?: string) => {
    await (db as any).transaction('rw', db.categories, db.transactions, async () => {
        await db.categories.delete(id);
        
        const fallbackId = SYSTEM_IDS.OTHER_EXPENSE;
        const finalTargetId = targetCategoryId || fallbackId;
        
        // Find affected transactions
        const affected = await db.transactions.where('categoryId').equals(id).toArray();
        const updates = affected.map(t => ({
            ...t,
            categoryId: finalTargetId,
            subcategoryId: targetSubcategoryId || undefined
        }));
        
        if (updates.length > 0) {
            await db.transactions.bulkPut(updates);
        }
    });
  };

  const deleteSubcategory = async (catId: string, subId: string) => {
    await (db as any).transaction('rw', db.categories, db.transactions, async () => {
        const cat = await db.categories.get(catId);
        if (cat) {
            const updatedCat = { ...cat, subcategories: cat.subcategories.filter(s => s.id !== subId) };
            await db.categories.put(updatedCat);
            
            const inneSub = updatedCat.subcategories.find(s => s.name === 'Inne');
            const targetSubId = inneSub ? inneSub.id : undefined;

            // Update transactions that used this subcategory
            const affected = await db.transactions
                .filter(t => t.categoryId === catId && t.subcategoryId === subId)
                .toArray();
                
            const updates = affected.map(t => ({ ...t, subcategoryId: targetSubId }));
            if (updates.length > 0) await db.transactions.bulkPut(updates);
        }
    });
  };

  const addTag = (tagName: string) => {
     if (!savedTags.includes(tagName)) {
         setSavedTags([...savedTags, tagName]);
     }
  };

  const renameTag = async (oldName: string, newName: string) => {
     await (db as any).transaction('rw', db.transactions, db.settings, async () => {
         // Update Settings
         const newSavedTags = savedTags.map(tag => tag === oldName ? newName : tag);
         await db.settings.put({ key: 'savedTags', value: newSavedTags });

         // Update Transactions
         const affected = await db.transactions
            .filter(t => !!(t.tags && t.tags.includes(oldName)))
            .toArray();
         
         const updates = affected.map(t => {
             const newTags = t.tags!.map(tag => tag === oldName ? newName : tag);
             return { ...t, tags: Array.from(new Set(newTags)) };
         });
         
         if (updates.length > 0) await db.transactions.bulkPut(updates);
     });
  };

  const deleteTag = async (tagName: string) => {
     await (db as any).transaction('rw', db.transactions, db.settings, async () => {
         // Update Settings
         const newSavedTags = savedTags.filter(tag => tag !== tagName);
         await db.settings.put({ key: 'savedTags', value: newSavedTags });

         // Update Transactions
         const affected = await db.transactions
            .filter(t => !!(t.tags && t.tags.includes(tagName)))
            .toArray();
         
         const updates = affected.map(t => ({
             ...t,
             tags: t.tags!.filter(tag => tag !== tagName)
         }));
         
         if (updates.length > 0) await db.transactions.bulkPut(updates);
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
    importData, restoreBackup, loadDemoData, factoryReset
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
