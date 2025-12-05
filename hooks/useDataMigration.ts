
import { useEffect } from 'react';
import { CategoryItem, Transaction, TransactionType } from '../types';
import { SYSTEM_IDS } from '../constants';

interface MigrationProps {
  categories: CategoryItem[];
  setCategories: (c: CategoryItem[]) => void;
  transactions: Transaction[];
  setTransactions: (t: Transaction[]) => void;
}

export const useDataMigration = ({ categories, setCategories, transactions, setTransactions }: MigrationProps) => {
  useEffect(() => {
    const performMigration = () => {
       let updatedCategories = [...categories];
       let updatedTransactions = [...transactions];
       let hasChanges = false;

       // MIGRACJA 1 (v1.0.1): Ustawienie flag isIncludedInSavings
       updatedCategories = updatedCategories.map(c => {
          if (c.id === SYSTEM_IDS.SAVINGS || c.id === SYSTEM_IDS.INVESTMENTS) {
             if (c.isIncludedInSavings !== true) {
                console.log(`Migrating category ${c.name}: setting isIncludedInSavings=true`);
                hasChanges = true;
                return { ...c, isIncludedInSavings: true };
             }
          }
          return c;
       });

       // MIGRACJA 2 (v1.0.2): Rozbicie starej kategorii 'cat_liabilities'
       const oldLiabilityCat = updatedCategories.find(c => c.id === 'cat_liabilities');
       if (oldLiabilityCat) {
          console.log("Migrating 'Zobowiązania i Inne' structure...");
          hasChanges = true;

          const createCatIfMissing = (id: string, name: string, color: string, subNames: string[]) => {
             if (!updatedCategories.some(c => c.id === id)) {
                updatedCategories.push({
                   id, name, type: TransactionType.EXPENSE, color, isSystem: false, isIncludedInSavings: false,
                   subcategories: subNames.map(s => ({ id: crypto.randomUUID(), name: s }))
                });
             }
          };

          createCatIfMissing(SYSTEM_IDS.INTERNAL_TRANSFER, 'Przelew własny', '#0ea5e9', ['Inne']);
          createCatIfMissing('cat_insurance', 'Ubezpieczenia', '#db2777', ['Ubezpieczenie na życie', 'Ubezpieczenie podróżne', 'Ubezpieczenie auta', 'Ubezpieczenie domu', 'Inne']);
          createCatIfMissing('cat_loans', 'Zobowiązania', '#7f1d1d', ['Kredyt hipoteczny', 'Kredyt konsumpcyjny', 'Pożyczka', 'Inne']);
          createCatIfMissing(SYSTEM_IDS.OTHER_EXPENSE, 'Inne', '#94a3b8', ['Inne']);

          const getTargetSubId = (catId: string, subNameToCheck: string) => {
             const cat = updatedCategories.find(c => c.id === catId);
             if (!cat) return '';
             const sub = cat.subcategories.find(s => s.name.toLowerCase() === subNameToCheck.toLowerCase());
             if (sub) return sub.id;
             const inne = cat.subcategories.find(s => s.name.toLowerCase() === 'inne');
             return inne ? inne.id : (cat.subcategories[0]?.id || '');
          };

          updatedTransactions = updatedTransactions.map(t => {
             if (t.categoryId === 'cat_liabilities') {
                const oldSub = oldLiabilityCat.subcategories.find(s => s.id === t.subcategoryId);
                const oldSubName = oldSub ? oldSub.name.toLowerCase() : 'inne';

                let targetCatId = 'cat_loans'; 
                let targetSubName = 'Inne';

                if (oldSubName.includes('ubezpiecz')) {
                   targetCatId = 'cat_insurance';
                } else if (oldSubName.includes('przelew')) {
                   targetCatId = SYSTEM_IDS.INTERNAL_TRANSFER;
                } else if (oldSubName === 'inne' || oldSubName === 'zobowiązania i inne') {
                   targetCatId = SYSTEM_IDS.OTHER_EXPENSE;
                } else {
                   targetCatId = 'cat_loans';
                }

                return {
                   ...t,
                   categoryId: targetCatId,
                   subcategoryId: getTargetSubId(targetCatId, targetSubName)
                };
             }
             return t;
          });

          updatedCategories = updatedCategories.filter(c => c.id !== 'cat_liabilities');
       }

       if (hasChanges) {
          setCategories(updatedCategories);
          setTransactions(updatedTransactions);
       }
    };

    performMigration();
  }, []); // Run once on mount
};
