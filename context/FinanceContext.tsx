
import React, { createContext, useContext, useMemo, ReactNode, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CategoryItem, Transaction, TransactionType, BackupData, SubcategoryItem, FinancialSummary, RecurringTransaction, Frequency } from '../types';
import { DEFAULT_CATEGORIES, SYSTEM_IDS } from '../constants';
import { db, migrateFromLocalStorage } from '../db';

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

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // --- IndexedDB Live Queries ---
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const recurringTransactions = useLiveQuery(() => db.recurringTransactions.toArray()) || [];
  const settingsArray = useLiveQuery(() => db.settings.toArray()) || [];

  // Parse Settings from DB Key-Value Store
  const savedTags = useMemo(() => settingsArray.find(s => s.key === 'savedTags')?.value || [], [settingsArray]);
  const isPrivateMode = useMemo(() => settingsArray.find(s => s.key === 'isPrivateMode')?.value || false, [settingsArray]);
  const theme = useMemo<Theme>(() => settingsArray.find(s => s.key === 'theme')?.value || 'light', [settingsArray]);

  // --- Initial Migration ---
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

  // --- Recurring Engine (Catch-up Logic) ---
  const calculateNextDate = (dateStr: string, freq: Frequency): string => {
    const date = new Date(dateStr);
    if (freq === 'WEEKLY') date.setDate(date.getDate() + 7);
    else if (freq === 'MONTHLY') date.setMonth(date.getMonth() + 1);
    else if (freq === 'YEARLY') date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  };

  useEffect(() => {
    // Only run if we have loaded the rules
    if (recurringTransactions.length === 0) return;

    const processRecurring = async () => {
        const today = new Date().toISOString().split('T')[0];
        let hasChanges = false;
        
        // We iterate carefully to avoid async race conditions
        for (const rule of recurringTransactions) {
            if (rule.autoPay && rule.nextDueDate <= today) {
                hasChanges = true;
                let currentDueDate = rule.nextDueDate;
                const newTxBatch: Transaction[] = [];

                // Catch-up Loop
                while (currentDueDate <= today) {
                    newTxBatch.push({
                        id: crypto.randomUUID(),
                        date: currentDueDate,
                        description: rule.description,
                        amount: rule.amount,
                        type: rule.type,
                        categoryId: rule.categoryId,
                        subcategoryId: rule.subcategoryId,
                        tags: rule.tags,
                        isRecurring: true
                    });
                    currentDueDate = calculateNextDate(currentDueDate, rule.frequency);
                }

                // Atomic updates
                await (db as any).transaction('rw', db.transactions, db.recurringTransactions, async () => {
                    await db.transactions.bulkAdd(newTxBatch);
                    await db.recurringTransactions.update(rule.id, { nextDueDate: currentDueDate });
                });
            }
        }
    };

    processRecurring();
  }, [recurringTransactions]); 

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
  const ensureSubcategory = async (categoryId: string, providedSubId?: string): Promise<string> => {
    if (providedSubId) return providedSubId;
    const category = categories.find(c => c.id === categoryId);
    if (!category) return ''; 
    const inneSub = category.subcategories.find(s => s.name.toLowerCase() === 'inne');
    if (inneSub) return inneSub.id;

    const newSubId = crypto.randomUUID();
    const newSub: SubcategoryItem = { id: newSubId, name: 'Inne' };
    const updatedCategory = { ...category, subcategories: [...category.subcategories, newSub] };
    await db.categories.put(updatedCategory);
    return newSubId;
  };

  // --- Actions ---

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

  // Recurring Actions
  const addRecurringTransaction = async (rule: Omit<RecurringTransaction, 'id'>) => {
    const subId = await ensureSubcategory(rule.categoryId, rule.subcategoryId);
    const newRule: RecurringTransaction = {
      ...rule,
      id: crypto.randomUUID(),
      subcategoryId: subId
    };
    await db.recurringTransactions.add(newRule);
  };

  const deleteRecurringTransaction = async (id: string) => {
    await db.recurringTransactions.delete(id);
  };

  const processRecurringTransaction = async (ruleId: string, amount?: number) => {
    const rule = recurringTransactions.find(r => r.id === ruleId);
    if (!rule) return;

    await (db as any).transaction('rw', db.transactions, db.recurringTransactions, async () => {
        // 1. Create transaction
        const newTx: Transaction = {
            id: crypto.randomUUID(),
            date: rule.nextDueDate,
            description: rule.description,
            amount: amount !== undefined ? amount : rule.amount,
            type: rule.type,
            categoryId: rule.categoryId,
            subcategoryId: rule.subcategoryId,
            tags: rule.tags,
            isRecurring: true
        };
        await db.transactions.add(newTx);

        // 2. Advance rule
        const nextDate = calculateNextDate(rule.nextDueDate, rule.frequency);
        await db.recurringTransactions.update(ruleId, { nextDueDate: nextDate });
    });
  };

  const skipRecurringTransaction = async (ruleId: string) => {
    const rule = recurringTransactions.find(r => r.id === ruleId);
    if (!rule) return;
    const nextDate = calculateNextDate(rule.nextDueDate, rule.frequency);
    await db.recurringTransactions.update(ruleId, { nextDueDate: nextDate });
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
      // For bulk replacement, clear and add. But safer to put individually to not lose IDs if logic changes
      // Since newCategories replaces the whole array in memory state, we mirror that in DB
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

  const importData = async (importedTransactions: Transaction[], clearHistory: boolean, newCategories?: CategoryItem[]) => {
    await (db as any).transaction('rw', db.transactions, db.categories, async () => {
        if (newCategories) {
            // Merge categories logic
            const currentCats = await db.categories.toArray();
            for (const newCat of newCategories) {
                const existing = currentCats.find(c => c.name.toLowerCase() === newCat.name.toLowerCase());
                if (!existing) {
                    await db.categories.add(newCat);
                }
            }
        }

        if (clearHistory) {
            await db.transactions.clear();
            await db.transactions.bulkAdd(importedTransactions);
        } else {
            // Deduplicate based on simple signature
            const currentTxs = await db.transactions.toArray();
            const existingSignatures = new Set(currentTxs.map(t => `${t.date}-${t.amount}-${t.description}`));
            const uniqueToAdd = importedTransactions.filter(t => !existingSignatures.has(`${t.date}-${t.amount}-${t.description}`));
            if (uniqueToAdd.length > 0) {
                await db.transactions.bulkAdd(uniqueToAdd);
            }
        }
    });
  };

  const restoreBackup = async (backup: BackupData) => {
     await (db as any).transaction('rw', db.categories, db.transactions, db.recurringTransactions, db.settings, async () => {
         await db.categories.clear();
         await db.categories.bulkAdd(backup.categories);

         await db.transactions.clear();
         await db.transactions.bulkAdd(backup.transactions);

         await db.recurringTransactions.clear();
         if (backup.recurringTransactions) {
             await db.recurringTransactions.bulkAdd(backup.recurringTransactions);
         }

         await db.settings.put({ key: 'isPrivateMode', value: backup.settings.isPrivateMode });
     });
  };

  const loadDemoData = () => {
    import('../utils/demoData').then(module => {
       // Since demo generation depends on Categories, we need current categories from state or DB.
       // We can use the 'categories' from useLiveQuery here.
       if (categories.length > 0) {
           const demoTxs = module.generateDemoTransactions(categories);
           db.transactions.bulkAdd(demoTxs);
       }
    });
  };

  const factoryReset = async () => {
      try {
        // 1. Clear IndexedDB Tables
        await Promise.all([
            db.transactions.clear(),
            db.categories.clear(),
            db.recurringTransactions.clear(),
            db.settings.clear()
        ]);
        
        // 2. Clear LocalStorage (cleanup legacy keys)
        localStorage.clear();

        // 3. Re-seed Defaults (Soft Reset)
        // This function checks if DB is empty and seeds default categories.
        // We use this instead of window.reload() to prevent crashes in some environments.
        await migrateFromLocalStorage();

        // 4. Reset Theme manually in DOM (Context state will follow via LiveQuery)
        const root = window.document.documentElement;
        root.classList.remove('dark'); 
      } catch (error) {
        console.error("Factory Reset failed:", error);
      }
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
