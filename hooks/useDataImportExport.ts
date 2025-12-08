
import { db, migrateFromLocalStorage } from '../db';
import { Transaction, CategoryItem, BackupData } from '../types';

export const useDataImportExport = (categories: CategoryItem[]) => {
  
  const importData = async (importedTransactions: Transaction[], clearHistory: boolean, newCategories?: CategoryItem[]) => {
    await (db as any).transaction('rw', db.transactions, db.categories, async () => {
        if (newCategories) {
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
       if (categories.length > 0) {
           const demoTxs = module.generateDemoTransactions(categories);
           db.transactions.bulkAdd(demoTxs);
       }
    });
  };

  const factoryReset = async () => {
      try {
        await Promise.all([
            db.transactions.clear(),
            db.categories.clear(),
            db.recurringTransactions.clear(),
            db.settings.clear()
        ]);
        
        localStorage.clear();
        await migrateFromLocalStorage();

        const root = window.document.documentElement;
        root.classList.remove('dark'); 
      } catch (error) {
        console.error("Factory Reset failed:", error);
      }
  };

  return {
    importData,
    restoreBackup,
    loadDemoData,
    factoryReset
  };
};
