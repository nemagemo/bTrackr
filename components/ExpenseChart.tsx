import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Transaction, TransactionType, CategoryItem } from '../types';
import { SYSTEM_IDS, getCategoryColor, getCategoryName } from '../constants';

interface ExpenseChartProps {
  transactions: Transaction[];
  categories: CategoryItem[];
}

export const ExpenseChart: React.FC<ExpenseChartProps> = ({ transactions, categories }) => {
  const data = useMemo(() => {
    const expenses = transactions.filter(t => 
       t.type === TransactionType.EXPENSE && 
       t.categoryId !== SYSTEM_IDS.SAVINGS &&
       t.categoryId !== SYSTEM_IDS.INVESTMENTS
    );
    const categoryTotals: Record<string, { value: number, color: string, name: string }> = {};

    expenses.forEach(t => {
      if (!categoryTotals[t.categoryId]) {
         categoryTotals[t.categoryId] = { 
            value: 0, 
            color: getCategoryColor(t.categoryId, categories),
            name: getCategoryName(t.categoryId, categories)
         };
      }
      categoryTotals[t.categoryId].value += t.amount;
    });

    return Object.values(categoryTotals).sort((a, b) => b.value - a.value);
  }, [transactions, categories]);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <span className="text-slate-400 text-sm">Brak danych</span>
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
          </Pie>
          <Tooltip formatter={(value: number) => `${value.toFixed(2)} PLN`} contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 grid grid-cols-2 gap-2">
         {data.slice(0, 4).map((entry) => (
            <div key={entry.name} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-lg">
               <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{background: entry.color}}></div>
                  <span className="text-slate-600 truncate max-w-[80px]">{entry.name}</span>
               </div>
               <span className="font-medium text-slate-900">{Math.round(entry.value)} zł</span>
            </div>
         ))}
      </div>
    </div>
  );
};