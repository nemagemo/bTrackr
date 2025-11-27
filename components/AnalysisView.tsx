import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { Filter, History, AlertCircle } from 'lucide-react';
import { Transaction, TransactionType, Category } from '../types';
import { CURRENCY_FORMATTER } from '../constants';
import { SankeyDiagram } from './SankeyDiagram';

interface AnalysisViewProps {
  transactions: Transaction[];
}

type PeriodType = 'YEAR' | 'QUARTER' | 'MONTH';
type SankeyScope = 'ALL' | 'FILTERED';

export const AnalysisView: React.FC<AnalysisViewProps> = ({ transactions }) => {
  // --- State for Filters ---
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [periodType, setPeriodType] = useState<PeriodType>('YEAR');
  const [periodValue, setPeriodValue] = useState<number>(0); 
  const [sankeyScope, setSankeyScope] = useState<SankeyScope>('ALL');

  // --- Extract Available Years ---
  const availableYears = useMemo(() => {
    const years = new Set(transactions.map(t => new Date(t.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // --- Filtering Logic ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const date = new Date(t.date);
      const yearMatches = date.getFullYear() === selectedYear;
      
      if (!yearMatches) return false;

      if (periodType === 'YEAR') return true;
      
      if (periodType === 'QUARTER') {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return quarter === periodValue;
      }

      if (periodType === 'MONTH') {
        return date.getMonth() === periodValue;
      }

      return true;
    });
  }, [transactions, selectedYear, periodType, periodValue]);

  // --- Sankey Data Selection ---
  const sankeyTransactions = sankeyScope === 'ALL' ? transactions : filteredTransactions;

  // --- Data Processing for Charts (Monthly Aggregation) ---
  const monthlyData = useMemo(() => {
    const grouped = filteredTransactions.reduce((acc, t) => {
      const date = new Date(t.date);
      // For chart grouping, we stick to monthly granularity even if looking at a year
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; 
      
      if (!acc[key]) {
        acc[key] = {
          date: key,
          displayDate: date.toLocaleDateString('pl-PL', { month: 'short' }),
          income: 0,
          expense: 0,
          balance: 0
        };
      }

      if (t.type === TransactionType.INCOME) {
        acc[key].income += t.amount;
      } else {
        // Only count 'real' expenses (not internal transfers) for the Expense Bar
        if (t.category !== Category.INTERNAL_TRANSFER) {
           acc[key].expense += t.amount;
        }
        // Balance always subtracts everything that left the wallet, including transfers?
        // Actually, if we view Balance as "Available to Spend", then yes.
        // But if we view it as "Net Worth Change" (ignoring transfer), it differs.
        // Let's keep the chart showing Balance = Income - All Outflows
        // BUT, the Expense BAR will be lower.
        // This might look confusing if Balance != Income - Expense Bar.
        // Let's stick to consistency:
        // Expense Bar = Consumer Expenses.
        // Balance Line = Income - Consumer Expenses - Transfers.
        // We will calculate Balance fully.
        const outflow = t.amount; 
        // We accumulate balance change separately
        // Wait, for the Area Chart "Trend Oszczędności", usually it's accumulating surplus.
        // If I transfer to savings, my "Wallet Balance" drops, but "Total Savings" goes up.
        // Let's assume this chart tracks "Wallet Balance".
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Second pass to calculate balance correctly per bucket
    // We need to loop again or handle full balance logic
    // Simplified: Just use the accumulations above.
    
    // Actually, to make the chart consistent: Balance = Income - (Expenses + Transfers)
    // But Expense Bar = Expenses (without Transfers).
    // This is fine.
    
    // We need to re-calculate balance for each bucket because the loop above skips transfers for 'expense' prop
    Object.keys(grouped).forEach(key => {
        const bucketTxs = filteredTransactions.filter(t => {
             const d = new Date(t.date);
             return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === key;
        });
        const inc = bucketTxs.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
        const out = bucketTxs.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
        grouped[key].balance = inc - out;
    });

    return Object.values(grouped)
      .sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [filteredTransactions]);

  // --- Statistics Calculation ---
  const stats = useMemo(() => {
    const totalIncome = filteredTransactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);
      
    // "Wydatki" statistic - Exclude transfers
    const totalExpense = filteredTransactions
      .filter(t => t.type === TransactionType.EXPENSE && t.category !== Category.INTERNAL_TRANSFER)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalTransfers = filteredTransactions
      .filter(t => t.type === TransactionType.EXPENSE && t.category === Category.INTERNAL_TRANSFER)
      .reduce((sum, t) => sum + t.amount, 0);

    // "Oszczędności" = Income - ConsumerExpenses (Money not spent on consumption)
    // This includes money left in account + money transferred to savings
    const balance = totalIncome - totalExpense; 
    
    // Savings Rate
    const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

    return { totalIncome, totalExpense, balance, savingsRate, totalTransfers };
  }, [filteredTransactions]);

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white rounded-2xl border border-slate-100 p-8">
        <p>Brak danych do analizy. Dodaj transakcje.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* --- Filters Bar --- */}
      <div 
        className={`bg-white p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300 ${
          sankeyScope === 'FILTERED' 
            ? 'border-indigo-300 ring-2 ring-indigo-50 shadow-md' 
            : 'border-slate-100'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg transition-colors ${sankeyScope === 'FILTERED' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-50 text-slate-500'}`}>
            <Filter size={18} />
          </div>
          <div>
            <span className={`font-semibold text-sm block ${sankeyScope === 'FILTERED' ? 'text-indigo-900' : 'text-slate-700'}`}>
              Filtruj statystyki
            </span>
            {sankeyScope === 'FILTERED' && (
              <span className="text-[10px] text-indigo-500 font-medium">Te ustawienia wpływają teraz na wykres Sankeya</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Year Selector */}
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          {/* Period Type Selector */}
          <div className="flex bg-slate-50 p-1 rounded-lg">
            {(['YEAR', 'QUARTER', 'MONTH'] as PeriodType[]).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setPeriodType(type);
                  if (type === 'QUARTER') setPeriodValue(1); 
                  if (type === 'MONTH') setPeriodValue(new Date().getMonth());
                }}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  periodType === type
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {type === 'YEAR' ? 'Rok' : type === 'QUARTER' ? 'Kwartał' : 'Miesiąc'}
              </button>
            ))}
          </div>

          {/* Sub-Period Selector (Conditional) */}
          {periodType === 'QUARTER' && (
            <select 
              value={periodValue}
              onChange={(e) => setPeriodValue(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 animate-fade-in"
            >
              <option value={1}>Q1</option>
              <option value={2}>Q2</option>
              <option value={3}>Q3</option>
              <option value={4}>Q4</option>
            </select>
          )}

          {periodType === 'MONTH' && (
            <select 
              value={periodValue}
              onChange={(e) => setPeriodValue(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 animate-fade-in"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i} value={i}>
                  {new Date(2000, i, 1).toLocaleDateString('pl-PL', { month: 'short' })}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* --- Summary Cards --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Przychody</p>
          <p className="text-lg font-bold text-green-600 mt-1">{CURRENCY_FORMATTER.format(stats.totalIncome)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Wydatki (Konsumpcja)</p>
          <p className="text-lg font-bold text-red-500 mt-1">{CURRENCY_FORMATTER.format(stats.totalExpense)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Oszczędności</p>
          <p className={`text-lg font-bold mt-1 ${stats.balance >= 0 ? 'text-indigo-600' : 'text-orange-500'}`}>
            {CURRENCY_FORMATTER.format(stats.balance)}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
             (w tym {CURRENCY_FORMATTER.format(stats.totalTransfers)} przelewów)
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Stopa oszczędności</p>
          <p className="text-lg font-bold text-slate-800 mt-1">{stats.savingsRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* --- Sankey Diagram --- */}
      <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] border border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h3 className="font-semibold text-slate-800">Przepływ środków</h3>
            <p className="text-xs text-slate-400 mt-1">
              Wizualizacja drogi pieniądza od źródła do kategorii wydatków
            </p>
          </div>
          
          <div className="flex bg-slate-50 p-1 rounded-lg self-start">
            <button
              onClick={() => setSankeyScope('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                sankeyScope === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <History size={14} />
              Cała historia
            </button>
            <button
              onClick={() => setSankeyScope('FILTERED')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                sankeyScope === 'FILTERED'
                  ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Filter size={14} />
              Wybrany okres
            </button>
          </div>
        </div>
        
        <SankeyDiagram transactions={sankeyTransactions} />
      </div>

      {/* --- Charts Grid --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Przychody vs Wydatki */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-6">Przychody vs Wydatki</h3>
          {monthlyData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="displayDate" 
                    tick={{ fill: '#64748b', fontSize: 10 }} 
                    axisLine={false} 
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 10 }} 
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={(val) => `${val / 1000}k`}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => CURRENCY_FORMATTER.format(value)}
                  />
                  <Bar name="Przychody" dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar name="Wydatki" dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <div className="flex flex-col items-center">
                  <AlertCircle size={24} className="mb-2 opacity-50" />
                  <span className="text-xs">Brak danych dla wykresu</span>
                </div>
             </div>
          )}
        </div>

        {/* Trend Oszczędności */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-2">Trend Salda</h3>
          <p className="text-xs text-slate-400 mb-6">Zmiana salda portfela w czasie (uwzględnia wszystkie wypływy)</p>
          {monthlyData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="displayDate" 
                    tick={{ fill: '#64748b', fontSize: 10 }} 
                    axisLine={false} 
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 10 }} 
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={(val) => `${val / 1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => CURRENCY_FORMATTER.format(value)}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="balance" 
                    name="Bilans"
                    stroke="#6366f1" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorBalance)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
           ) : (
             <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <div className="flex flex-col items-center">
                  <AlertCircle size={24} className="mb-2 opacity-50" />
                  <span className="text-xs">Brak danych dla wykresu</span>
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};