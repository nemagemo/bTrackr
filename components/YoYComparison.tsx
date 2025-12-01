
import React, { useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { MultiLineChart } from './D3Charts';

interface YoYComparisonProps {
  transactions: Transaction[];
  isPrivateMode?: boolean;
}

// Distinct palette for historical years (mix of warm/cool, clear contrast)
const HISTORY_COLORS = [
  '#94a3b8', // Slate-400 (Neutral)
  '#f59e0b', // Amber-500 (Warm)
  '#10b981', // Emerald-500 (Cool)
  '#ec4899', // Pink-500 (Vibrant)
  '#06b6d4', // Cyan-500 (Cool)
  '#8b5cf6', // Violet-500 (Vibrant)
  '#ef4444', // Red-500 (Alert)
  '#84cc16', // Lime-500 (Fresh)
];

const CURRENT_YEAR_COLOR = '#0f172a'; // Slate-900 (Bold Black/Blue) or Indigo '#4f46e5'

export const YoYComparison: React.FC<YoYComparisonProps> = ({ transactions, isPrivateMode }) => {
  const currentYear = new Date().getFullYear();

  const chartData = useMemo(() => {
    // 1. Identify all years
    const years: number[] = Array.from<number>(new Set(transactions.map(t => new Date(t.date).getFullYear()))).sort((a: number, b: number) => a - b);
    
    // 2. Initialize buckets for 12 months
    const buckets: Record<number, any> = {};
    for (let i = 0; i < 12; i++) {
        buckets[i] = { name: new Date(2000, i, 1).toLocaleDateString('pl-PL', { month: 'short' }) };
        years.forEach(y => {
            buckets[i][y] = 0;
        });
    }

    // 3. Aggregate Expenses
    transactions.forEach(t => {
       if (t.type !== TransactionType.EXPENSE) return;
       const d = new Date(t.date);
       const y = d.getFullYear();
       const m = d.getMonth();
       if (buckets[m]) {
          buckets[m][y] += t.amount;
       }
    });

    // 4. Assign Colors dynamically
    // If the year is Current Year, use special color. Else cycle through history colors.
    const colors = years.map((y, index) => {
        if (y === currentYear) return CURRENT_YEAR_COLOR;
        return HISTORY_COLORS[index % HISTORY_COLORS.length];
    });

    return { 
        data: Object.values(buckets), 
        keys: years.map(String),
        colors
    };

  }, [transactions, currentYear]);

  if (chartData.keys.length === 0) {
      return null;
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col">
       <div className="mb-6">
        <h3 className="font-semibold text-slate-800">Porównanie Rok do Roku</h3>
        <p className="text-xs text-slate-400">Historia wydatków we wszystkich latach</p>
      </div>
      
      <div className="flex-1 min-h-[300px]">
         <MultiLineChart 
            data={chartData.data} 
            keys={chartData.keys} 
            colors={chartData.colors} 
            height={320}
            isPrivateMode={isPrivateMode}
            highlightKey={currentYear.toString()}
         />
      </div>
    </div>
  );
};