import React, { useMemo } from 'react';
import { Transaction, TransactionType, CategoryItem } from '../types';
import { CURRENCY_FORMATTER } from '../constants';

interface BudgetPulseProps {
  transactions: Transaction[];
  categories: CategoryItem[];
  isPrivateMode?: boolean;
}

export const BudgetPulse: React.FC<BudgetPulseProps> = ({ transactions, categories, isPrivateMode }) => {
  const data = useMemo(() => {
    const now = new Date();
    
    // Only process categories that have a budget limit set
    const budgetedCategories = categories.filter(c => 
        c.type === TransactionType.EXPENSE && 
        c.budgetLimit && 
        c.budgetLimit > 0
    );

    if (budgetedCategories.length === 0) return [];

    // Filter transactions for the CURRENT month only
    const currentMonthTxs = transactions.filter(t => 
        t.type === TransactionType.EXPENSE &&
        new Date(t.date).getMonth() === now.getMonth() &&
        new Date(t.date).getFullYear() === now.getFullYear()
    );

    const result = budgetedCategories.map(cat => {
        const currentSpent = currentMonthTxs
            .filter(t => t.categoryId === cat.id)
            .reduce((acc, t) => acc + t.amount, 0);

        const limit = cat.budgetLimit || 0;
        const remaining = limit - currentSpent;
        const percent = (currentSpent / limit) * 100;

        return {
            id: cat.id,
            name: cat.name,
            color: cat.color,
            current: currentSpent,
            limit: limit,
            remaining: remaining,
            percent: percent
        };
    }).sort((a, b) => b.percent - a.percent); // Sort by highest usage %

    return result;
  }, [transactions, categories]);

  if (data.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
       <div className="mb-6">
        <h3 className="font-semibold text-slate-800">Stan Budżetu</h3>
        <p className="text-xs text-slate-400">Realizacja limitów w bieżącym miesiącu</p>
      </div>
      
      <div className="space-y-6">
         {data.map(item => {
             // Logic for colors
             let barColor = 'bg-emerald-500';
             let statusColor = 'text-emerald-600 bg-emerald-50';

             if (item.percent > 75) {
                 barColor = 'bg-amber-400';
                 statusColor = 'text-amber-600 bg-amber-50';
             }
             if (item.percent > 100) {
                 barColor = 'bg-red-500';
                 statusColor = 'text-red-600 bg-red-50';
             }
             
             const barWidth = Math.min(100, item.percent);

             return (
                 <div key={item.id} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium text-slate-700">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                           <span className="truncate max-w-[120px]">{item.name}</span>
                        </div>
                        <div className={`flex gap-1 ${isPrivateMode ? 'blur-[5px] select-none' : ''}`}>
                           <span className={item.percent > 100 ? 'text-red-600 font-bold' : ''}>{CURRENCY_FORMATTER.format(item.current)}</span>
                           <span className="text-slate-400">/ {CURRENCY_FORMATTER.format(item.limit)}</span>
                        </div>
                    </div>
                    
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative">
                        <div 
                           className={`h-full rounded-full transition-all duration-500 ${barColor}`} 
                           style={{ width: `${barWidth}%` }}
                        ></div>
                    </div>

                    <div className="flex justify-end">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusColor} ${isPrivateMode ? 'blur-[4px] select-none' : ''}`}>
                          {item.remaining >= 0 
                             ? `Pozostało: ${CURRENCY_FORMATTER.format(item.remaining)}` 
                             : `Przekroczono o: ${CURRENCY_FORMATTER.format(Math.abs(item.remaining))}`
                          }
                       </span>
                    </div>
                 </div>
             )
         })}
      </div>
    </div>
  );
};