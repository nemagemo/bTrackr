
import Dexie, { Table } from 'dexie';
import { CategoryItem, Transaction, RecurringTransaction } from './types';
import { DEFAULT_CATEGORIES } from './constants';

export class BTrackrDB extends Dexie {
  transactions!: Table<Transaction>;
  categories!: Table<CategoryItem>;
  recurringTransactions!: Table<RecurringTransaction>;
  settings!: Table<{ key: string; value: any }>;

  constructor() {
    super('bTrackrDB');
    (this as any).version(1).stores({
      transactions: 'id, date, categoryId, type',
      categories: 'id, type',
      recurringTransactions: 'id',
      settings: 'key' // For tags, theme, privacy mode
    });
  }
}

export const db = new BTrackrDB();

// --- Migration Logic ---
export const migrateFromLocalStorage = async () => {
  const txJson = localStorage.getItem('btrackr_transactions');
  const catJson = localStorage.getItem('btrackr_categories');
  const recJson = localStorage.getItem('btrackr_recurring');
  const tagsJson = localStorage.getItem('btrackr_tags');
  const themeJson = localStorage.getItem('btrackr_theme');
  const privacyJson = localStorage.getItem('btrackr_private_mode');

  // Check DB state
  const txCount = await db.transactions.count();
  const catCount = await db.categories.count();
  
  if (txCount === 0 && txJson) {
    console.log('Migrating data from LocalStorage to IndexedDB...');
    
    await (db as any).transaction('rw', db.transactions, db.categories, db.recurringTransactions, db.settings, async () => {
      // 1. Transactions
      if (txJson) {
        const txs = JSON.parse(txJson);
        await db.transactions.bulkAdd(txs);
      }

      // 2. Categories
      if (catJson) {
        const cats = JSON.parse(catJson);
        // Only add if table is empty to avoid conflicts
        const currentCatCount = await db.categories.count();
        if (currentCatCount === 0) {
            await db.categories.bulkPut(cats);
        }
      } else {
        const currentCatCount = await db.categories.count();
        if (currentCatCount === 0) {
            await db.categories.bulkPut(DEFAULT_CATEGORIES);
        }
      }

      // 3. Recurring
      if (recJson) {
        const recs = JSON.parse(recJson);
        await db.recurringTransactions.bulkAdd(recs);
      }

      // 4. Settings
      if (tagsJson) await db.settings.put({ key: 'savedTags', value: JSON.parse(tagsJson) });
      if (themeJson) await db.settings.put({ key: 'theme', value: JSON.parse(themeJson) });
      if (privacyJson) await db.settings.put({ key: 'isPrivateMode', value: JSON.parse(privacyJson) });
    });

    console.log('Migration complete. Clearing LocalStorage...');
    localStorage.removeItem('btrackr_transactions');
    localStorage.removeItem('btrackr_categories');
    localStorage.removeItem('btrackr_recurring');
    
  } else if (catCount === 0) {
     // Fresh install -> Seed defaults
     // Use bulkPut to avoid ConstraintError if this runs multiple times (e.g. React StrictMode)
     await (db as any).transaction('rw', db.categories, async () => {
         const currentCatCount = await db.categories.count();
         if (currentCatCount === 0) {
             await db.categories.bulkPut(DEFAULT_CATEGORIES);
         }
     });
  } else {
     // Categories exist, check if we are missing any system categories (partial init fix)
     await (db as any).transaction('rw', db.categories, async () => {
         const existingKeys = await db.categories.toCollection().primaryKeys();
         const existingSet = new Set(existingKeys);
         const toAdd = DEFAULT_CATEGORIES.filter(c => !existingSet.has(c.id));
         
         if (toAdd.length > 0) {
             console.log(`Seeding ${toAdd.length} missing default categories...`);
             await db.categories.bulkAdd(toAdd); // bulkAdd is fine here as we explicitly filtered
         }
     });
  }
};
