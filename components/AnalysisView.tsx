
import React, { useState } from 'react';
import { Filter, Calendar, Layers, ChevronDown, BarChart2, TrendingUp, Activity, Grip, LayoutList, LayoutGrid, Hash, Eye, EyeOff, BarChart, GitMerge } from 'lucide-react';
import { Transaction, CategoryItem } from '../types';
import { CURRENCY_FORMATTER } from '../constants';
import { SankeyDiagram } from './SankeyDiagram';
import { CategoryTrendAnalysis } from './CategoryTrendAnalysis';
import { CalendarHeatmap } from './CalendarHeatmap';
import { YoYComparison } from './YoYComparison';
import { ComboChart, DifferenceChart, WaterfallChart } from './D3Charts';
import { SpendingVelocity } from './SpendingVelocity';
import { DayOfWeekStats } from './DayOfWeekStats';
import { TopTags } from './TopTags';
import { useAnalysisData, PeriodType } from '../hooks/useAnalysisData';

interface AnalysisViewProps {
  transactions: Transaction[];
  categories: CategoryItem[];
  isPrivateMode?: boolean;
}

type FinancialHealthViewMode = 'COMBO' | 'DIFFERENCE';
type FlowViewMode = 'SANKEY' | 'WATERFALL';

export const AnalysisView: React.FC<AnalysisViewProps> = ({ transactions, categories, isPrivateMode }) => {
  // Use Custom Hook for Logic
  const {
    selectedYear, setSelectedYear,
    periodType, setPeriodType,
    periodValue, setPeriodValue,
    selectedTag, setSelectedTag,
    historyAggregation, setHistoryAggregation,
    yearAggregation, setYearAggregation,
    availableYears, availableTags,
    filteredTransactions, financialHealthData, waterfallData, stats
  } = useAnalysisData(transactions, categories);

  // Local UI State
  const [financialViewMode, setFinancialViewMode] = useState<FinancialHealthViewMode>('COMBO');
  const [flowViewMode, setFlowViewMode] = useState<FlowViewMode>('SANKEY');
  const [showSurplus, setShowSurplus] = useState(true);
  const [showSavingsRate, setShowSavingsRate] = useState(true);

  // UI Helpers
  const isTagSelected = selectedTag !== 'ALL';
  const effectiveShowSurplus = showSurplus && !isTagSelected;
  const effectiveShowSavingsRate = showSavingsRate && !isTagSelected;

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
      <div className="sticky top-20 z-20 flex justify-center">
         <div className="inline-flex items-center p-1.5 bg-white/90 backdrop-blur-xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-full gap-2 flex-wrap justify-center">
            
            <div className="flex items-center bg-slate-100/80 p-1 rounded-full">
               {(['ALL', 'YEAR', 'QUARTER', 'MONTH'] as PeriodType[]).map((type) => (
                  <button key={type} onClick={() => { setPeriodType(type); if(type==='QUARTER') setPeriodValue(1); if(type==='MONTH') setPeriodValue(new Date().getMonth()); }} 
                     className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${periodType === type ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                     {type === 'ALL' ? 'Cała historia' : type === 'YEAR' ? 'Rok' : type === 'QUARTER' ? 'Kwartał' : 'Miesiąc'}
                  </button>
               ))}
            </div>

            {periodType !== 'ALL' && (
                <div className="relative group">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-slate-50 transition-colors cursor-pointer text-slate-700 font-medium text-sm">
                        <Calendar size={14} className="text-slate-400" /><span>{selectedYear}</span><ChevronDown size={12} className="text-slate-300" />
                    </div>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="absolute inset-0 opacity-0 cursor-pointer">{availableYears.map(year => <option key={year} value={year}>{year}</option>)}</select>
                </div>
            )}

            {(periodType === 'QUARTER' || periodType === 'MONTH') && (
               <div className="relative group animate-fade-in ml-1">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 transition-colors cursor-pointer font-medium text-sm">
                     <span>{periodType === 'QUARTER' ? `Q${periodValue}` : new Date(2000, periodValue, 1).toLocaleDateString('pl-PL', {month:'long'})}</span>
                     <ChevronDown size={12} className="text-indigo-400" />
                  </div>
                  <select value={periodValue} onChange={(e)=>setPeriodValue(Number(e.target.value))} className="absolute inset-0 opacity-0 cursor-pointer">
                     {periodType === 'QUARTER' && [1,2,3,4].map(q => <option key={q} value={q}>Q{q}</option>)}
                     {periodType === 'MONTH' && Array.from({length:12}).map((_,i)=><option key={i} value={i}>{new Date(2000,i,1).toLocaleDateString('pl-PL',{month:'long'})}</option>)}
                  </select>
               </div>
            )}

            {/* Tag Filter */}
            {availableTags.length > 0 && (
               <div className="relative group ml-1 border-l border-slate-200 pl-2">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors cursor-pointer font-medium text-sm ${selectedTag !== 'ALL' ? 'bg-pink-50 text-pink-700' : 'hover:bg-slate-50 text-slate-700'}`}>
                     <Hash size={14} className={selectedTag !== 'ALL' ? 'text-pink-400' : 'text-slate-400'} />
                     <span>{selectedTag === 'ALL' ? 'Tag' : selectedTag}</span>
                     <ChevronDown size={12} className="text-slate-300" />
                  </div>
                  <select value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer">
                     <option value="ALL">Wszystkie tagi</option>
                     {availableTags.map(tag => <option key={tag} value={tag}>#{tag}</option>)}
                  </select>
               </div>
            )}
         </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm"><p className="text-[10px] text-slate-500 font-bold uppercase">Przychody</p><p className={`text-lg font-bold text-green-600 mt-1`}>{isPrivateMode ? '***' : CURRENCY_FORMATTER.format(stats.totalIncome)}</p></div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm"><p className="text-[10px] text-slate-500 font-bold uppercase">Wydatki</p><p className={`text-lg font-bold text-red-500 mt-1`}>{isPrivateMode ? '***' : CURRENCY_FORMATTER.format(stats.totalExpenses)}</p></div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm"><p className="text-[10px] text-slate-500 font-bold uppercase">Nadwyżka</p><p className={`text-lg font-bold text-indigo-600 mt-1`}>{isPrivateMode ? '***' : CURRENCY_FORMATTER.format(stats.balance)}</p></div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm"><p className="text-[10px] text-slate-500 font-bold uppercase">Stopa oszcz.</p><p className="text-lg font-bold text-emerald-600 mt-1">{stats.savingsRate.toFixed(1)}%</p></div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
         <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
            <div><h3 className="font-semibold text-slate-800">Zdrowie Finansowe ({getPeriodLabel()})</h3><p className="text-xs text-slate-400">Analiza przychodów, wydatków i stopy oszczędności</p></div>
            <div className="flex flex-wrap items-center gap-2">
               {/* Controls for Chart Lines */}
               <div className="flex bg-slate-50 p-1 rounded-lg mr-2 animate-fade-in items-center">
                  <button 
                     onClick={() => setShowSurplus(!showSurplus)} 
                     disabled={isTagSelected}
                     className={`px-2 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${showSurplus && !isTagSelected ? 'bg-sky-100 text-sky-700 shadow-sm' : 'text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed'}`}
                     title={isTagSelected ? "Niedostępne przy filtrze tagów" : "Pokaż/Ukryj Nadwyżkę"}
                  >
                     {showSurplus ? <Eye size={14} /> : <EyeOff size={14} />} Nadwyżka
                  </button>
                  <button 
                     onClick={() => setShowSavingsRate(!showSavingsRate)} 
                     disabled={isTagSelected}
                     className={`px-2 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${showSavingsRate && !isTagSelected ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed'}`}
                     title={isTagSelected ? "Niedostępne przy filtrze tagów" : "Pokaż/Ukryj Stopę Oszczędności"}
                  >
                     {showSavingsRate ? <Eye size={14} /> : <EyeOff size={14} />} Stopa
                  </button>
               </div>

               {periodType === 'ALL' && (
                  <div className="flex bg-slate-50 p-1 rounded-lg mr-2 animate-fade-in">
                     <button onClick={() => setHistoryAggregation('YEARLY')} className={`px-2 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${historyAggregation === 'YEARLY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Grip size={14} /> <span className="hidden sm:inline">Rocznie</span></button>
                     <button onClick={() => setHistoryAggregation('QUARTERLY')} className={`px-2 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${historyAggregation === 'QUARTERLY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><LayoutGrid size={14} /> <span className="hidden sm:inline">Kwartalnie</span></button>
                     <button onClick={() => setHistoryAggregation('MONTHLY')} className={`px-2 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${historyAggregation === 'MONTHLY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><LayoutList size={14} /> <span className="hidden sm:inline">Miesięcznie</span></button>
                  </div>
               )}
               {periodType === 'YEAR' && (
                   <div className="flex bg-slate-50 p-1 rounded-lg mr-2 animate-fade-in">
                      <button onClick={() => setYearAggregation('MONTHLY')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${yearAggregation === 'MONTHLY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><LayoutList size={14} /> Miesięcznie</button>
                      <button onClick={() => setYearAggregation('QUARTERLY')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${yearAggregation === 'QUARTERLY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><LayoutGrid size={14} /> Kwartalnie</button>
                   </div>
               )}
               <div className="flex bg-slate-50 p-1 rounded-lg">
                  <button onClick={() => setFinancialViewMode('COMBO')} className={`p-2 rounded-md transition-all ${financialViewMode === 'COMBO' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><BarChart2 size={16} /></button>
                  <button onClick={() => setFinancialViewMode('DIFFERENCE')} className={`p-2 rounded-md transition-all ${financialViewMode === 'DIFFERENCE' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><Activity size={16} /></button>
               </div>
            </div>
         </div>
         <div className="min-h-[350px]">
            {financialViewMode === 'COMBO' && <ComboChart data={financialHealthData} isPrivateMode={isPrivateMode} showSurplusLine={effectiveShowSurplus} showSavingsRateLine={effectiveShowSavingsRate} />}
            {financialViewMode === 'DIFFERENCE' && <DifferenceChart data={financialHealthData} isPrivateMode={isPrivateMode} showSurplusLine={effectiveShowSurplus} showSavingsRateLine={effectiveShowSavingsRate} />}
         </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="flex flex-col gap-1">
               <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                   {flowViewMode === 'SANKEY' ? 'Diagram Przepływu (Sankey)' : 'Bilans Kaskadowy (Waterfall)'}
               </h3>
               <p className="text-xs font-normal text-slate-400">
                   {flowViewMode === 'SANKEY' 
                       ? 'Wizualizacja podziału przychodów na kategorie' 
                       : 'Szczegółowa analiza wpływu kategorii na saldo końcowe'}
               </p>
            </div>
            
            <div className="flex bg-slate-50 p-1 rounded-lg animate-fade-in">
                <button
                    onClick={() => setFlowViewMode('SANKEY')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${flowViewMode === 'SANKEY' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <GitMerge size={16} className="rotate-90" /> Sankey
                </button>
                <button
                    onClick={() => setFlowViewMode('WATERFALL')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${flowViewMode === 'WATERFALL' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <BarChart size={16} /> Waterfall
                </button>
            </div>
        </div>

        <div className="min-h-[400px]">
            {flowViewMode === 'SANKEY' ? (
                <SankeyDiagram transactions={filteredTransactions} categories={categories} isPrivateMode={isPrivateMode} />
            ) : (
                <WaterfallChart data={waterfallData} isPrivateMode={isPrivateMode} height={450} />
            )}
        </div>
      </div>

      <SpendingVelocity transactions={transactions} categories={categories} currentYear={selectedYear} isPrivateMode={isPrivateMode} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DayOfWeekStats transactions={filteredTransactions} categories={categories} isPrivateMode={isPrivateMode} />
          <TopTags transactions={filteredTransactions} categories={categories} isPrivateMode={isPrivateMode} />
      </div>

      <div className="grid grid-cols-1 gap-6">
         <CategoryTrendAnalysis transactions={filteredTransactions} categories={categories} filterYear={selectedYear} periodType={periodType} periodValue={periodValue} historyAggregation={historyAggregation} yearAggregation={yearAggregation} onToggleAggregation={setHistoryAggregation} isPrivateMode={isPrivateMode} />
         <YoYComparison transactions={transactions} categories={categories} isPrivateMode={isPrivateMode} />
      </div>

      <CalendarHeatmap transactions={filteredTransactions} categories={categories} year={selectedYear} periodType={periodType} isPrivateMode={isPrivateMode} />
    </div>
  );
};
