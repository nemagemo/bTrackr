import React, { useMemo, useState, useEffect } from 'react';
import { Filter, Calendar, Layers, ChevronDown, BarChart2, TrendingUp, Activity, Grip, LayoutList, LayoutGrid } from 'lucide-react';
import { Transaction, TransactionType, CategoryItem } from '../types';
import { CURRENCY_FORMATTER } from '../constants';
import { SankeyDiagram } from './SankeyDiagram';
import { CategoryTrendAnalysis } from './CategoryTrendAnalysis';
import { CalendarHeatmap } from './CalendarHeatmap';
import { YoYComparison } from './YoYComparison';
import { ComboChart, DifferenceChart } from './D3Charts';
import { SpendingVelocity } from './SpendingVelocity';
import { DayOfWeekStats } from './DayOfWeekStats';
import { BudgetPulse } from './BudgetPulse';

interface AnalysisViewProps {
  transactions: Transaction[];
  categories: CategoryItem[];
  includeBalanceInSavings?: boolean;
  isPrivateMode?: boolean;
}

export type PeriodType = 'ALL' | 'YEAR' | 'QUARTER' | 'MONTH';
export type AggregationMode = 'YEARLY' | 'QUARTERLY' | 'MONTHLY';
type FinancialHealthViewMode = 'COMBO' | 'DIFFERENCE';

export const AnalysisView: React.FC<AnalysisViewProps> = ({ transactions, categories, includeBalanceInSavings = false, isPrivateMode }) => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [periodType, setPeriodType] = useState<PeriodType>('ALL');
  const [periodValue, setPeriodValue] = useState<number>(0); 
  const [financialViewMode, setFinancialViewMode] = useState<FinancialHealthViewMode>('COMBO');
  
  // Aggregation state for 'ALL' view
  const [historyAggregation, setHistoryAggregation] = useState<AggregationMode>('MONTHLY');
  // Aggregation state for 'YEAR' view
  const [yearAggregation, setYearAggregation] = useState<'MONTHLY' | 'QUARTERLY'>('MONTHLY');

  // Determine default aggregation based on history span (> 3 years -> YEARLY, else MONTHLY)
  useEffect(() => {
    if (transactions.length === 0) return;
    
    const dates = transactions.map(t => new Date(t.date).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    const yearDiff = maxDate.getFullYear() - minDate.getFullYear();
    
    // If span is greater than 3 years, default to Yearly, otherwise Monthly
    if (yearDiff > 3) {
       setHistoryAggregation('YEARLY');
    } else {
       setHistoryAggregation('MONTHLY');
    }
  }, [transactions.length]); // Check when data loaded/length changes

  const availableYears = useMemo(() => {
    const years = new Set(transactions.map(t => new Date(t.date).getFullYear()));
    return Array.from(years).sort((a: number, b: number) => b - a);
  }, [transactions]);

  // Main Filtered Data (for Stats & Sankey)
  const filteredTransactions = useMemo(() => {
    if (periodType === 'ALL') return transactions;

    return transactions.filter(t => {
      const date = new Date(t.date);
      const yearMatches = date.getFullYear() === selectedYear;
      if (!yearMatches) return false;
      if (periodType === 'YEAR') return true;
      if (periodType === 'QUARTER') return (Math.floor(date.getMonth() / 3) + 1) === periodValue;
      if (periodType === 'MONTH') return date.getMonth() === periodValue;
      return true;
    });
  }, [transactions, selectedYear, periodType, periodValue]);

  // Financial Health Data (Dynamic Aggregation based on Period)
  const financialHealthData = useMemo(() => {
     let buckets: any[] = [];
     let getBucketIndex = (d: Date) => 0;

     if (periodType === 'ALL') {
        if (filteredTransactions.length === 0) return [];
        
        const dates = filteredTransactions.map(t => new Date(t.date).getTime());
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        const minYear = minDate.getFullYear();
        const maxYear = maxDate.getFullYear();

        if (historyAggregation === 'YEARLY') {
            const span = maxYear - minYear + 1;
            for(let i=0; i<span; i++) {
               buckets.push({ 
                  name: `${minYear + i}`, 
                  income: 0, expense: 0, savings: 0, savingsRate: 0 
               });
            }
            getBucketIndex = (d) => d.getFullYear() - minYear;

        } else if (historyAggregation === 'QUARTERLY') {
            // QUARTERLY for ALL
            const startYear = minDate.getFullYear();
            const startQ = Math.floor(minDate.getMonth() / 3);
            const endYear = maxDate.getFullYear();
            const endQ = Math.floor(maxDate.getMonth() / 3);
            
            const totalQuarters = (endYear - startYear) * 4 + (endQ - startQ) + 1;
            
            for(let i=0; i<totalQuarters; i++) {
                const totalQ = startQ + i;
                const y = startYear + Math.floor(totalQ / 4);
                const q = (totalQ % 4) + 1;
                buckets.push({
                    name: `Q${q} '${y.toString().slice(2)}`,
                    income: 0, expense: 0, savings: 0, savingsRate: 0
                });
            }
            getBucketIndex = (d) => {
                const q = Math.floor(d.getMonth() / 3);
                return (d.getFullYear() - startYear) * 4 + (q - startQ);
            };

        } else {
            // MONTHLY for ALL
            const startYear = minDate.getFullYear();
            const startMonth = minDate.getMonth();
            const endYear = maxDate.getFullYear();
            const endMonth = maxDate.getMonth();
            
            const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
            
            for(let i=0; i<totalMonths; i++) {
                const currentMonthDate = new Date(startYear, startMonth + i, 1);
                buckets.push({
                    name: currentMonthDate.toLocaleDateString('pl-PL', { month: 'short', year: '2-digit' }),
                    income: 0, expense: 0, savings: 0, savingsRate: 0
                });
            }
            getBucketIndex = (d) => {
                return (d.getFullYear() - startYear) * 12 + (d.getMonth() - startMonth);
            };
        }

     } else if (periodType === 'YEAR') {
        if (yearAggregation === 'QUARTERLY') {
            // 4 Quarters
            for(let i=1; i<=4; i++) {
                buckets.push({
                    name: `Q${i}`,
                    income: 0, expense: 0, savings: 0, savingsRate: 0
                });
            }
            getBucketIndex = (d) => Math.floor(d.getMonth() / 3);
        } else {
            // 12 Months
            for(let i=0; i<12; i++) {
               buckets.push({ 
                  name: new Date(selectedYear, i, 1).toLocaleDateString('pl-PL', { month: 'short' }),
                  income: 0, expense: 0, savings: 0, savingsRate: 0
               });
            }
            getBucketIndex = (d) => d.getMonth();
        }

     } else if (periodType === 'QUARTER') {
        const startMonth = (periodValue - 1) * 3;
        for(let i=0; i<3; i++) {
           buckets.push({
              name: new Date(selectedYear, startMonth + i, 1).toLocaleDateString('pl-PL', { month: 'long' }),
              income: 0, expense: 0, savings: 0, savingsRate: 0
           });
        }
        getBucketIndex = (d) => d.getMonth() - startMonth;

     } else {
        // MONTH
        const daysInMonth = new Date(selectedYear, periodValue + 1, 0).getDate();
        for(let i=0; i<daysInMonth; i++) {
           buckets.push({ name: `${i+1}`, income: 0, expense: 0, savings: 0, savingsRate: 0 });
        }
        getBucketIndex = (d) => d.getDate() - 1;
     }

     // Aggregate filtered transactions into buckets
     filteredTransactions.forEach(t => {
        const date = new Date(t.date);
        const idx = getBucketIndex(date);
        const cat = categories.find(c => c.id === t.categoryId);

        // Safety check for index bounds
        if (buckets[idx]) {
            if (t.type === TransactionType.INCOME) {
               buckets[idx].income += t.amount;
            } else {
               if (cat?.isIncludedInSavings) {
                  buckets[idx].savings += t.amount;
               } else {
                  buckets[idx].expense += t.amount;
               }
            }
        }
     });

     // Post-calculate Rates
     buckets.forEach(b => {
        let totalSavings = b.savings;
        const balance = b.income - b.expense - b.savings;
        if (includeBalanceInSavings && balance > 0) {
           totalSavings += balance;
        }
        b.savingsRate = b.income > 0 ? (totalSavings / b.income) * 100 : 0;
     });

     return buckets;
  }, [filteredTransactions, periodType, periodValue, selectedYear, categories, includeBalanceInSavings, historyAggregation, yearAggregation]);

  const stats = useMemo(() => {
    const totalIncome = filteredTransactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    const totalConsumption = filteredTransactions.filter(t => {
        if (t.type !== TransactionType.EXPENSE) return false;
        const cat = categories.find(c => c.id === t.categoryId);
        return !cat?.isIncludedInSavings;
    }).reduce((sum, t) => sum + t.amount, 0);
    const activeSavings = filteredTransactions.filter(t => {
        if (t.type !== TransactionType.EXPENSE) return false;
        const cat = categories.find(c => c.id === t.categoryId);
        return !!cat?.isIncludedInSavings;
    }).reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalConsumption - activeSavings; 
    let totalSavingsForRate = activeSavings;
    if (includeBalanceInSavings && balance > 0) {
      totalSavingsForRate += balance;
    }

    const savingsRate = totalIncome > 0 ? (totalSavingsForRate / totalIncome) * 100 : 0;

    return { totalIncome, totalConsumption, balance, savingsRate };
  }, [filteredTransactions, categories, includeBalanceInSavings]);

  const getPeriodLabel = () => {
     if (periodType === 'ALL') return 'Cała historia';
     if (periodType === 'YEAR') return `${selectedYear}`;
     if (periodType === 'QUARTER') return `Q${periodValue} ${selectedYear}`;
     if (periodType === 'MONTH') return `${new Date(selectedYear, periodValue, 1).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}`;
     return '';
  };

  if (transactions.length === 0) return <div className="p-8 text-center text-slate-400 border rounded-2xl">Brak danych.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Modern Filter Bar */}
      <div className="sticky top-20 z-20 flex justify-center">
         <div className="inline-flex items-center p-1.5 bg-white/90 backdrop-blur-xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-full gap-2">
            
            <div className="flex items-center bg-slate-100/80 p-1 rounded-full">
               {(['ALL', 'YEAR', 'QUARTER', 'MONTH'] as PeriodType[]).map((type) => (
                  <button 
                     key={type} 
                     onClick={() => { 
                        setPeriodType(type); 
                        if(type==='QUARTER') setPeriodValue(1); 
                        if(type==='MONTH') setPeriodValue(new Date().getMonth()); 
                     }} 
                     className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                        periodType === type 
                        ? 'bg-white text-slate-900 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                     }`}
                  >
                     {type === 'ALL' ? 'Cała historia' : type === 'YEAR' ? 'Rok' : type === 'QUARTER' ? 'Kwartał' : 'Miesiąc'}
                  </button>
               ))}
            </div>

            {/* Year Selector - Only if not ALL */}
            {periodType !== 'ALL' && (
                <>
                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                    <div className="relative group">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-slate-50 transition-colors cursor-pointer text-slate-700 font-medium text-sm">
                        <Calendar size={14} className="text-slate-400" />
                        <span>{selectedYear}</span>
                        <ChevronDown size={12} className="text-slate-300" />
                    </div>
                    <select 
                        value={selectedYear} 
                        onChange={(e) => setSelectedYear(Number(e.target.value))} 
                        className="absolute inset-0 opacity-0 cursor-pointer"
                    >
                        {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                    </div>
                </>
            )}

            {/* Sub-Selection (Month/Quarter) */}
            {(periodType === 'QUARTER' || periodType === 'MONTH') && (
               <div className="relative group animate-fade-in ml-1">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 transition-colors cursor-pointer font-medium text-sm">
                     <span>
                        {periodType === 'QUARTER' ? `Q${periodValue}` : new Date(2000, periodValue, 1).toLocaleDateString('pl-PL', {month:'long'})}
                     </span>
                     <ChevronDown size={12} className="text-indigo-400" />
                  </div>
                  <select 
                     value={periodValue} 
                     onChange={(e)=>setPeriodValue(Number(e.target.value))} 
                     className="absolute inset-0 opacity-0 cursor-pointer"
                  >
                     {periodType === 'QUARTER' && [1,2,3,4].map(q => <option key={q} value={q}>Q{q}</option>)}
                     {periodType === 'MONTH' && Array.from({length:12}).map((_,i)=><option key={i} value={i}>{new Date(2000,i,1).toLocaleDateString('pl-PL',{month:'long'})}</option>)}
                  </select>
               </div>
            )}
         </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm"><p className="text-[10px] text-slate-500 font-bold uppercase">Przychody</p><p className={`text-lg font-bold text-green-600 mt-1 ${isPrivateMode ? 'blur-[6px] select-none' : ''}`}>{CURRENCY_FORMATTER.format(stats.totalIncome)}</p></div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm"><p className="text-[10px] text-slate-500 font-bold uppercase">Wydatki</p><p className={`text-lg font-bold text-red-500 mt-1 ${isPrivateMode ? 'blur-[6px] select-none' : ''}`}>{CURRENCY_FORMATTER.format(stats.totalConsumption)}</p></div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm"><p className="text-[10px] text-slate-500 font-bold uppercase">Nadwyżka</p><p className={`text-lg font-bold text-indigo-600 mt-1 ${isPrivateMode ? 'blur-[6px] select-none' : ''}`}>{CURRENCY_FORMATTER.format(stats.balance)}</p></div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm"><p className="text-[10px] text-slate-500 font-bold uppercase">Stopa oszcz.</p><p className="text-lg font-bold text-emerald-600 mt-1">{stats.savingsRate.toFixed(1)}%</p></div>
      </div>

      {/* Financial Health Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
               <h3 className="font-semibold text-slate-800">Zdrowie Finansowe ({getPeriodLabel()})</h3>
               <p className="text-xs text-slate-400">Analiza przychodów, wydatków i stopy oszczędności</p>
            </div>
            <div className="flex items-center gap-2">
               
               {/* Aggregation Switcher for ALL */}
               {periodType === 'ALL' && (
                  <div className="flex bg-slate-50 p-1 rounded-lg mr-2 animate-fade-in">
                     <button
                        onClick={() => setHistoryAggregation('YEARLY')}
                        className={`px-2 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${historyAggregation === 'YEARLY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                     >
                        <Grip size={14} /> <span className="hidden sm:inline">Rocznie</span>
                     </button>
                     <button
                        onClick={() => setHistoryAggregation('QUARTERLY')}
                        className={`px-2 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${historyAggregation === 'QUARTERLY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                     >
                        <LayoutGrid size={14} /> <span className="hidden sm:inline">Kwartalnie</span>
                     </button>
                     <button
                        onClick={() => setHistoryAggregation('MONTHLY')}
                        className={`px-2 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${historyAggregation === 'MONTHLY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                     >
                        <LayoutList size={14} /> <span className="hidden sm:inline">Miesięcznie</span>
                     </button>
                  </div>
               )}

               {/* Aggregation Switcher for YEAR */}
               {periodType === 'YEAR' && (
                   <div className="flex bg-slate-50 p-1 rounded-lg mr-2 animate-fade-in">
                      <button
                        onClick={() => setYearAggregation('MONTHLY')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${yearAggregation === 'MONTHLY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                     >
                        <LayoutList size={14} /> Miesięcznie
                     </button>
                     <button
                        onClick={() => setYearAggregation('QUARTERLY')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${yearAggregation === 'QUARTERLY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                     >
                        <LayoutGrid size={14} /> Kwartalnie
                     </button>
                   </div>
               )}

               <div className="flex bg-slate-50 p-1 rounded-lg">
                  <button 
                     onClick={() => setFinancialViewMode('COMBO')}
                     className={`p-2 rounded-md transition-all ${financialViewMode === 'COMBO' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                     title="Wykres Mieszany (Słupki + Linia)"
                  >
                     <BarChart2 size={16} />
                  </button>
                  <button 
                     onClick={() => setFinancialViewMode('DIFFERENCE')}
                     className={`p-2 rounded-md transition-all ${financialViewMode === 'DIFFERENCE' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                     title="Różnica (The Gap)"
                  >
                     <Activity size={16} />
                  </button>
               </div>
            </div>
         </div>
         
         <div className="min-h-[350px]">
            {financialViewMode === 'COMBO' && <ComboChart data={financialHealthData} isPrivateMode={isPrivateMode} />}
            {financialViewMode === 'DIFFERENCE' && <DifferenceChart data={financialHealthData} isPrivateMode={isPrivateMode} />}
         </div>
      </div>

      {/* Spending Velocity - Full Width */}
      <SpendingVelocity transactions={transactions} currentYear={selectedYear} isPrivateMode={isPrivateMode} />

      {/* Other Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DayOfWeekStats transactions={filteredTransactions} isPrivateMode={isPrivateMode} />
          <BudgetPulse transactions={transactions} categories={categories} isPrivateMode={isPrivateMode} />
      </div>

      {/* Sankey */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-start mb-6">
          <div className="flex flex-col gap-1">
            <h3 className="font-semibold text-slate-800">Przepływ środków</h3>
            <p className="text-xs font-normal text-slate-400">Kliknij kategorię wydatków, aby zobaczyć szczegóły</p>
          </div>
        </div>
        <SankeyDiagram transactions={filteredTransactions} categories={categories} isPrivateMode={isPrivateMode} />
      </div>

      {/* Stacked Layout for Trend & YoY */}
      <div className="grid grid-cols-1 gap-6">
         <CategoryTrendAnalysis 
            transactions={transactions} 
            categories={categories} 
            filterYear={selectedYear}
            periodType={periodType}
            periodValue={periodValue}
            historyAggregation={historyAggregation}
            yearAggregation={yearAggregation}
            onToggleAggregation={setHistoryAggregation}
            isPrivateMode={isPrivateMode}
         />
         <YoYComparison transactions={transactions} currentYear={selectedYear} isPrivateMode={isPrivateMode} />
      </div>

      {/* Calendar Heatmap */}
      <CalendarHeatmap 
        transactions={transactions} 
        year={selectedYear} 
        periodType={periodType}
        isPrivateMode={isPrivateMode}
      />
    </div>
  );
};