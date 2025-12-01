import React, { useMemo } from 'react';
import { Store } from 'lucide-react';
import { Transaction, TransactionType } from '../types';
import { CURRENCY_FORMATTER } from '../constants';

interface TopMerchantsProps {
  transactions: Transaction[];
  isPrivateMode?: boolean;
}

export const TopMerchants: React.FC<TopMerchantsProps> = ({ transactions, isPrivateMode }) => {
  const data = useMemo(() => {
    const merchantMap = new Map<string, number>();
    let totalExpenses = 0;

    transactions.forEach(t => {
      if (t.type !== TransactionType.EXPENSE) return;
      
      // Simple normalization: trim and lowercase
      // In future this could use the sophisticated grouping logic from ImportModal
      const name = t.description.trim();
      if (!name) return;

      const key = name.toLowerCase();
      merchantMap.set(key, (merchantMap.get(key) || 0) + t.amount);
      totalExpenses += t.amount;
    });

    // Convert to array and sort
    const sorted = Array.from(merchantMap.entries())
      .map(([key, value]) => {
        // Restore original casing logic could be added here, simplified for now:
        // Find one original desc for this key
        const originalTx = transactions.find(t => t.description.trim().toLowerCase() === key);
        return {
          name: originalTx?.description.trim() || key,
          value,
          percent: totalExpenses > 0 ? (value / totalExpenses) * 100 : 0
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10

    return { sorted, maxVal: sorted[0]?.value || 0 };
  }, [transactions]);

  if (data.sorted.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-slate-800">Ranking Sprzedawców</h3>
          <p className="text-xs text-slate-400">Top 10 miejsc generujących koszty</p>
        </div>
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
           <Store size={18} />
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
        {data.sorted.map((item, index) => {
           const isTop3 = index < 3;
           const barWidth = (item.value / data.maxVal) * 100;
           
           return (
             <div key={item.name} className="relative group">
                <div className="flex justify-between items-end text-sm mb-1 relative z-10">
                   <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold w-4 text-center ${isTop3 ? 'text-indigo-600' : 'text-slate-400'}`}>
                        {index + 1}
                      </span>
                      <span className="font-medium text-slate-700 truncate max-w-[140px] sm:max-w-[180px]" title={item.name}>
                        {item.name}
                      </span>
                   </div>
                   <div className="text-right">
                      <span className="font-semibold text-slate-800">
                         {isPrivateMode ? '***' : CURRENCY_FORMATTER.format(item.value)}
                      </span>
                   </div>
                </div>
                
                {/* Progress Bar Background */}
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-1">
                   <div 
                      className={`h-full rounded-full ${isTop3 ? 'bg-indigo-500' : 'bg-slate-300'} transition-all duration-500`}
                      style={{ width: `${barWidth}%` }}
                   />
                </div>
             </div>
           )
        })}
      </div>
    </div>
  );
};