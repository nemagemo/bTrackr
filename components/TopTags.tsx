
import React, { useMemo } from 'react';
import { Hash } from 'lucide-react';
import { Transaction, TransactionType, CategoryItem } from '../types';
import { CURRENCY_FORMATTER } from '../constants';

interface TopTagsProps {
  transactions: Transaction[];
  categories: CategoryItem[];
  isPrivateMode?: boolean;
}

export const TopTags: React.FC<TopTagsProps> = ({ transactions, categories, isPrivateMode }) => {
  const savingsCategoryIds = useMemo(() => {
      return new Set(categories.filter(c => c.isIncludedInSavings).map(c => c.id));
  }, [categories]);

  const data = useMemo(() => {
    const tagMap = new Map<string, number>();
    
    transactions.forEach(t => {
      if (t.type !== TransactionType.EXPENSE || !t.tags || t.tags.length === 0) return;
      
      // Skip savings
      if (savingsCategoryIds.has(t.categoryId)) return;

      t.tags.forEach(tag => {
         tagMap.set(tag, (tagMap.get(tag) || 0) + t.amount);
      });
    });

    const totalExpenses = transactions
        .filter(t => t.type === TransactionType.EXPENSE && !savingsCategoryIds.has(t.categoryId))
        .reduce((sum, t) => sum + t.amount, 0);

    const sorted = Array.from(tagMap.entries())
      .map(([key, value]) => ({
        name: key,
        value,
        percent: totalExpenses > 0 ? (value / totalExpenses) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return { sorted, maxVal: sorted[0]?.value || 0 };
  }, [transactions, savingsCategoryIds]);

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 h-full flex flex-col transition-colors">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-white">Ranking Tagów</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">Najdroższe projekty i oznaczenia</p>
        </div>
        <div className="p-2 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 rounded-lg">
           <Hash size={18} />
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
        {data.sorted.length > 0 ? (
            data.sorted.map((item, index) => {
               const barWidth = (item.value / data.maxVal) * 100;
               
               return (
                 <div key={item.name} className="relative group">
                    <div className="flex justify-between items-end text-sm mb-1 relative z-10">
                       <div className="flex items-center gap-2">
                          <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">#{item.name}</span>
                       </div>
                       <div className="text-right">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                             {isPrivateMode ? '***' : CURRENCY_FORMATTER.format(item.value)}
                          </span>
                       </div>
                    </div>
                    
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-1">
                       <div 
                          className="h-full rounded-full bg-pink-500 dark:bg-pink-600 transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                       />
                    </div>
                 </div>
               )
            })
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 py-8">
               <div className="w-12 h-12 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mb-3">
                  <Hash size={20} className="opacity-40" />
               </div>
               <p className="text-sm font-medium">Brak tagów</p>
               <p className="text-xs mt-1 text-center max-w-[200px]">
                  Dodawaj tagi do transakcji (np. #wakacje, #remont), aby śledzić koszty projektów.
               </p>
            </div>
        )}
      </div>
    </div>
  );
};
