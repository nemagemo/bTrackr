import React, { useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { DayOfWeekChart } from './D3Charts';

interface DayOfWeekStatsProps {
  transactions: Transaction[];
  isPrivateMode?: boolean;
}

export const DayOfWeekStats: React.FC<DayOfWeekStatsProps> = ({ transactions, isPrivateMode }) => {
  const chartData = useMemo(() => {
    const days = ['Ndz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];
    // Reorder to Mon-Sun
    const orderedDays = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];
    const buckets: Record<string, number> = {};
    orderedDays.forEach(d => buckets[d] = 0);

    transactions.forEach(t => {
       if (t.type !== TransactionType.EXPENSE) return;
       const d = new Date(t.date);
       const dayName = days[d.getDay()];
       if (buckets[dayName] !== undefined) {
          buckets[dayName] += t.amount;
       }
    });

    return orderedDays.map(d => ({
        day: d,
        value: buckets[d],
        isWeekend: d === 'Sob' || d === 'Ndz'
    }));
  }, [transactions]);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col">
       <div className="mb-6">
        <h3 className="font-semibold text-slate-800">Radar Nawyków</h3>
        <p className="text-xs text-slate-400">Rozkład wydatków w dniach tygodnia</p>
      </div>
      
      <div className="flex-1 min-h-[250px]">
         <DayOfWeekChart data={chartData} height={250} isPrivateMode={isPrivateMode} />
      </div>
    </div>
  );
};