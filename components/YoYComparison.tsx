import React, { useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { MultiLineChart } from './D3Charts';

interface YoYComparisonProps {
  transactions: Transaction[];
  currentYear: number;
  isPrivateMode?: boolean;
}

export const YoYComparison: React.FC<YoYComparisonProps> = ({ transactions, currentYear, isPrivateMode }) => {
  const prevYear = currentYear - 1;

  const chartData = useMemo(() => {
    // Buckets for 12 months
    const buckets: Record<number, { current: number, previous: number }> = {};
    for (let i = 0; i < 12; i++) {
        buckets[i] = { current: 0, previous: 0 };
    }

    transactions.forEach(t => {
       if (t.type !== TransactionType.EXPENSE) return;
       const d = new Date(t.date);
       const y = d.getFullYear();
       const m = d.getMonth();

       if (y === currentYear) {
          buckets[m].current += t.amount;
       } else if (y === prevYear) {
          buckets[m].previous += t.amount;
       }
    });

    return Object.entries(buckets).map(([monthIndex, vals]) => ({
       name: new Date(2000, Number(monthIndex), 1).toLocaleDateString('pl-PL', { month: 'short' }),
       [currentYear]: vals.current,
       [prevYear]: vals.previous
    }));

  }, [transactions, currentYear, prevYear]);

  const hasData = chartData.some(d => d[currentYear] > 0 || d[prevYear] > 0);

  if (!hasData) {
      return null;
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col">
       <div className="mb-6">
        <h3 className="font-semibold text-slate-800">Porównanie Rok do Roku</h3>
        <p className="text-xs text-slate-400">Wydatki {currentYear} vs {prevYear}</p>
      </div>
      
      <div className="flex-1 min-h-[300px]">
         <MultiLineChart 
            data={chartData} 
            keys={[String(prevYear), String(currentYear)]} 
            colors={['#cbd5e1', '#4f46e5']} // Gray for prev, Indigo for current
            height={320}
            isPrivateMode={isPrivateMode}
         />
      </div>
    </div>
  );
};