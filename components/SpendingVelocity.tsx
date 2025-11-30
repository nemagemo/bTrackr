import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType } from '../types';
import { CumulativeChart } from './D3Charts';

interface SpendingVelocityProps {
  transactions: Transaction[];
  currentYear: number;
  isPrivateMode?: boolean;
}

type ComparisonMode = 'PREV_MONTH' | 'AVG_3M' | 'AVG_6M' | 'AVG_12M';

export const SpendingVelocity: React.FC<SpendingVelocityProps> = ({ transactions, currentYear, isPrivateMode }) => {
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('PREV_MONTH');

  const chartData = useMemo(() => {
    const now = new Date();
    // Default target: current real month if year matches, else December of selected year
    let targetMonth = now.getMonth();
    if (currentYear !== now.getFullYear()) {
        targetMonth = 11;
    }

    const currentSeriesLabel = new Date(currentYear, targetMonth, 1).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });

    // 1. Get Current Series Data
    const getDailyCumulative = (month: number, year: number) => {
        const expenses = transactions.filter(t => 
            t.type === TransactionType.EXPENSE &&
            new Date(t.date).getMonth() === month &&
            new Date(t.date).getFullYear() === year
        );
        
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const data: { day: number, value: number }[] = [];
        
        let sum = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            const dailySum = expenses
                .filter(t => new Date(t.date).getDate() === d)
                .reduce((acc, t) => acc + t.amount, 0);
            sum += dailySum;
            
            // Optimization: Stop adding points if it's the future (only for current live month)
            if (year === now.getFullYear() && month === now.getMonth() && d > now.getDate()) {
               break; 
            }
            data.push({ day: d, value: sum });
        }
        return data;
    };

    const currentSeriesData = getDailyCumulative(targetMonth, currentYear);

    // 2. Get Comparison Series Data
    let comparisonSeriesData: { day: number, value: number }[] = [];
    let comparisonLabel = '';

    if (comparisonMode === 'PREV_MONTH') {
        const prevMonth = targetMonth === 0 ? 11 : targetMonth - 1;
        const prevMonthYear = targetMonth === 0 ? currentYear - 1 : currentYear;
        comparisonLabel = new Date(prevMonthYear, prevMonth, 1).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
        comparisonSeriesData = getDailyCumulative(prevMonth, prevMonthYear);
    } else {
        // Averages (3M, 6M, 12M)
        let monthsBack = 3;
        if (comparisonMode === 'AVG_6M') monthsBack = 6;
        if (comparisonMode === 'AVG_12M') monthsBack = 12;
        comparisonLabel = `Średnia z ${monthsBack} miesięcy`;

        // Calculate Average Curve
        // Start from month prior to current target
        // E.g. if Target is March, Avg 3M is Feb, Jan, Dec
        const refDate = new Date(currentYear, targetMonth, 1);
        
        const accumulatedDailySums: Record<number, number> = {};
        const countPerDay: Record<number, number> = {};

        for (let i = 1; i <= monthsBack; i++) {
            const d = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1);
            const m = d.getMonth();
            const y = d.getFullYear();
            
            const monthData = getDailyCumulative(m, y);
            monthData.forEach(p => {
                accumulatedDailySums[p.day] = (accumulatedDailySums[p.day] || 0) + p.value;
                countPerDay[p.day] = (countPerDay[p.day] || 0) + 1;
            });
        }

        // Build average series (up to 31 days)
        for (let d = 1; d <= 31; d++) {
             if (countPerDay[d] > 0) {
                 comparisonSeriesData.push({
                     day: d,
                     value: accumulatedDailySums[d] / countPerDay[d]
                 });
             }
        }
    }

    return [
        { 
            label: currentSeriesLabel, 
            data: currentSeriesData, 
            color: '#4f46e5', // Indigo-600
            dashed: false 
        },
        { 
            label: comparisonLabel, 
            data: comparisonSeriesData, 
            color: '#94a3b8', // Slate-400
            dashed: true 
        }
    ];
  }, [transactions, currentYear, comparisonMode]);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col w-full">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
            <h3 className="font-semibold text-slate-800">Wyścig Wydatków</h3>
            <p className="text-xs text-slate-400">Tempo wydawania w bieżącym okresie</p>
        </div>
        
        <div className="bg-slate-100 p-1 rounded-lg flex overflow-x-auto max-w-full">
            <button
                onClick={() => setComparisonMode('PREV_MONTH')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all ${comparisonMode === 'PREV_MONTH' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Poprzedni msc.
            </button>
            <button
                onClick={() => setComparisonMode('AVG_3M')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all ${comparisonMode === 'AVG_3M' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Średnia 3M
            </button>
            <button
                onClick={() => setComparisonMode('AVG_6M')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all ${comparisonMode === 'AVG_6M' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Średnia 6M
            </button>
             <button
                onClick={() => setComparisonMode('AVG_12M')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all ${comparisonMode === 'AVG_12M' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Średnia 12M
            </button>
        </div>
      </div>
      
      <div className="min-h-[250px]">
         <CumulativeChart series={chartData} height={280} isPrivateMode={isPrivateMode} />
      </div>
    </div>
  );
};