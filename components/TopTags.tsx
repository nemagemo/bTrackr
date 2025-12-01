import React, { useMemo } from 'react';
import { Hash } from 'lucide-react';
import { Transaction, TransactionType } from '../types';
import { CURRENCY_FORMATTER } from '../constants';

interface TopTagsProps {
  transactions: Transaction[];
  isPrivateMode?: boolean;
}

export const TopTags: React.FC<TopTagsProps> = ({ transactions, isPrivateMode }) => {
  const data = useMemo(() => {
    const tagMap = new Map<string, number>();
    
    transactions.forEach(t => {
      if (t.type !== TransactionType.EXPENSE || !t.tags || t.tags.length === 0) return;
      
      t.tags.forEach(tag => {
         tagMap.set(tag, (tagMap.get(tag) || 0) + t.amount);
      });
      // Note: A transaction with 2 tags counts its amount towards both tags, logic is correct for "Cost of Project X".
    });

    const totalExpenses = transactions
        .filter(t => t.type === TransactionType.EXPENSE)
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
  }, [transactions]);

  if (data.sorted.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-slate-800">Ranking Tagów</h3>
          <p className="text-xs text-slate-400">Najdroższe projekty i oznaczenia</p>
        </div>
        <div className="p-2 bg-pink-50 text-pink-600 rounded-lg">
           <Hash size={18} />
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
        {data.sorted.map((item, index) => {
           const barWidth = (item.value / data.maxVal) * 100;
           
           return (
             <div key={item.name} className="relative group">
                <div className="flex justify-between items-end text-sm mb-1 relative z-10">
                   <div className="flex items-center gap-2">
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded">#{item.name}</span>
                   </div>
                   <div className="text-right">
                      <span className="font-semibold text-slate-800">
                         {isPrivateMode ? '***' : CURRENCY_FORMATTER.format(item.value)}
                      </span>
                   </div>
                </div>
                
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-1">
                   <div 
                      className="h-full rounded-full bg-pink-500 transition-all duration-500"
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