import React, { useMemo, useState } from 'react';
import { Grip, LayoutList, LayoutGrid } from 'lucide-react';
import { Transaction, TransactionType, CategoryItem } from '../types';
import { StackedBarChart } from './D3Charts';
import { PeriodType, AggregationMode } from './AnalysisView';

interface CategoryTrendAnalysisProps {
  transactions: Transaction[];
  categories: CategoryItem[];
  filterYear: number;
  periodType: PeriodType;
  periodValue: number;
  historyAggregation?: AggregationMode;
  yearAggregation?: 'MONTHLY' | 'QUARTERLY';
  onToggleAggregation?: (mode: AggregationMode) => void;
  isPrivateMode?: boolean;
}

const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#84cc16', '#f43f5e', '#14b8a6'
];

export const CategoryTrendAnalysis: React.FC<CategoryTrendAnalysisProps> = ({ 
   transactions, 
   categories,
   filterYear,
   periodType,
   periodValue,
   historyAggregation = 'YEARLY',
   yearAggregation = 'MONTHLY',
   onToggleAggregation,
   isPrivateMode
}) => {
  const expenseCategories = useMemo(() => 
    categories
      .filter(c => c.type === TransactionType.EXPENSE)
      .sort((a, b) => a.name.localeCompare(b.name, 'pl')), 
  [categories]);
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(expenseCategories[0]?.id || '');
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  const chartData = useMemo(() => {
    if (!selectedCategoryId) return [];

    // 1. Filter transactions based on ALL criteria from parent
    const filteredTxs = transactions.filter(t => {
      if (t.categoryId !== selectedCategoryId) return false;

      if (periodType === 'ALL') return true;

      const d = new Date(t.date);
      const isYearMatch = d.getFullYear() === filterYear;
      if (!isYearMatch) return false;

      if (periodType === 'QUARTER') {
         const q = Math.floor(d.getMonth() / 3) + 1;
         return q === periodValue;
      }
      if (periodType === 'MONTH') {
         return d.getMonth() === periodValue;
      }
      return true; // YEAR
    });

    // 2. Initialize X-Axis Buckets
    const buckets: Record<number, any> = {};
    let bucketCount = 0;
    let getLabel = (idx: number) => `${idx}`;
    let getBucketIndex = (date: Date) => 0;

    if (periodType === 'ALL') {
        if (filteredTxs.length === 0) return [];
        const dates = filteredTxs.map(t => new Date(t.date).getTime());
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));

        if (historyAggregation === 'YEARLY') {
            const minYear = minDate.getFullYear();
            const maxYear = maxDate.getFullYear();
            const yearSpan = maxYear - minYear + 1;
            bucketCount = yearSpan;
            getLabel = (i) => `${minYear + i}`;
            getBucketIndex = (d) => d.getFullYear() - minYear;

        } else if (historyAggregation === 'QUARTERLY') {
            const startYear = minDate.getFullYear();
            const startQ = Math.floor(minDate.getMonth() / 3);
            const endYear = maxDate.getFullYear();
            const endQ = Math.floor(maxDate.getMonth() / 3);
            
            bucketCount = (endYear - startYear) * 4 + (endQ - startQ) + 1;
            getLabel = (i) => {
                const totalQ = startQ + i;
                const y = startYear + Math.floor(totalQ / 4);
                const q = (totalQ % 4) + 1;
                return `Q${q} '${y.toString().slice(2)}`;
            };
            getBucketIndex = (d) => {
                const q = Math.floor(d.getMonth() / 3);
                return (d.getFullYear() - startYear) * 4 + (q - startQ);
            };

        } else {
            // MONTHLY
            const startYear = minDate.getFullYear();
            const startMonth = minDate.getMonth();
            const endYear = maxDate.getFullYear();
            const endMonth = maxDate.getMonth();
            const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
            
            bucketCount = totalMonths;
            getLabel = (i) => {
                const d = new Date(startYear, startMonth + i, 1);
                return d.toLocaleDateString('pl-PL', { month: 'short', year: '2-digit' });
            };
            getBucketIndex = (d) => (d.getFullYear() - startYear) * 12 + (d.getMonth() - startMonth);
        }

    } else if (periodType === 'YEAR') {
       if (yearAggregation === 'QUARTERLY') {
          bucketCount = 4;
          getLabel = (i) => `Q${i+1}`;
          getBucketIndex = (d) => Math.floor(d.getMonth() / 3);
       } else {
          bucketCount = 12;
          getLabel = (i) => new Date(2000, i, 1).toLocaleDateString('pl-PL', { month: 'short' });
          getBucketIndex = (d) => d.getMonth();
       }

    } else if (periodType === 'QUARTER') {
       // 3 Months of the quarter
       const startMonth = (periodValue - 1) * 3;
       bucketCount = 3;
       getLabel = (i) => new Date(2000, startMonth + i, 1).toLocaleDateString('pl-PL', { month: 'long' });
       getBucketIndex = (d) => d.getMonth() - startMonth;

    } else {
       // MONTH: Days of month
       const daysInMonth = new Date(filterYear, periodValue + 1, 0).getDate();
       bucketCount = daysInMonth;
       getLabel = (i) => `${i + 1}`; // Day number
       getBucketIndex = (d) => d.getDate() - 1; // 0-indexed
    }

    // Init Buckets
    for (let i = 0; i < bucketCount; i++) {
       buckets[i] = { name: getLabel(i) };
       // Init subcategories to 0
       selectedCategory?.subcategories.forEach(sub => {
          buckets[i][sub.name] = 0;
       });
       buckets[i]['Inne'] = 0;
    }

    // 3. Aggregate
    filteredTxs.forEach(t => {
      const d = new Date(t.date);
      const idx = getBucketIndex(d);

      if (buckets[idx]) {
         let subName = 'Inne';
         if (t.subcategoryId) {
            const sub = selectedCategory?.subcategories.find(s => s.id === t.subcategoryId);
            if (sub) subName = sub.name;
         }
         // Handle potential casing mismatches or missing keys safely
         if (buckets[idx][subName] !== undefined) {
             buckets[idx][subName] += t.amount;
         } else {
             buckets[idx]['Inne'] += t.amount;
         }
      }
    });

    return Object.values(buckets);
  }, [transactions, selectedCategoryId, filterYear, periodType, periodValue, selectedCategory, historyAggregation, yearAggregation]);

  if (!selectedCategoryId) return null;

  // Fix: Use Set to ensure unique keys, preventing duplicate 'Inne'
  const subNames = selectedCategory?.subcategories.map(s => s.name) || [];
  const uniqueSubKeys = Array.from(new Set([...subNames, 'Inne']));
  
  // Filter keys: Only show keys that have value > 0 in at least one data point
  const activeKeys = uniqueSubKeys.filter(key => {
      return chartData.some(d => d[key] > 0);
  });

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-semibold text-slate-800">Kategorie</h3>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Aggregation Switcher (Only visible for ALL history) */}
          {periodType === 'ALL' && onToggleAggregation && (
            <div className="flex bg-slate-50 p-1 rounded-lg mr-2 animate-fade-in">
               <button
                  onClick={() => onToggleAggregation('YEARLY')}
                  className={`px-2 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${historyAggregation === 'YEARLY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               >
                  <Grip size={14} /> Rocznie
               </button>
               <button
                  onClick={() => onToggleAggregation('QUARTERLY')}
                  className={`px-2 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${historyAggregation === 'QUARTERLY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               >
                  <LayoutGrid size={14} /> Kwartalnie
               </button>
               <button
                  onClick={() => onToggleAggregation('MONTHLY')}
                  className={`px-2 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${historyAggregation === 'MONTHLY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               >
                  <LayoutList size={14} /> Miesięcznie
               </button>
            </div>
          )}

          <select 
            value={selectedCategoryId} 
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 min-w-[180px]"
          >
            {expenseCategories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="w-full">
        <StackedBarChart data={chartData} keys={activeKeys} colors={COLORS} isPrivateMode={isPrivateMode} />
      </div>
    </div>
  );
};