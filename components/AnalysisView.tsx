
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Filter, History, AlertCircle } from 'lucide-react';
import { Transaction, TransactionType, CategoryItem } from '../types';
import { CURRENCY_FORMATTER, SYSTEM_IDS } from '../constants';
import { SankeyDiagram } from './SankeyDiagram';

interface AnalysisViewProps {
  transactions: Transaction[];
  categories: CategoryItem[];
  includeBalanceInSavings?: boolean;
}

type PeriodType = 'YEAR' | 'QUARTER' | 'MONTH';
type SankeyScope = 'ALL' | 'FILTERED';

export const AnalysisView: React.FC<AnalysisViewProps> = ({ transactions, categories, includeBalanceInSavings = false }) => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [periodType, setPeriodType] = useState<PeriodType>('YEAR');
  const [periodValue, setPeriodValue] = useState<number>(0); 
  const [sankeyScope, setSankeyScope] = useState<SankeyScope>('ALL');

  const availableYears = useMemo(() => {
    const years = new Set(transactions.map(t => new Date(t.date).getFullYear()));
    return Array.from(years).sort((a: number, b: number) => b - a);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
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

  const sankeyTransactions = sankeyScope === 'ALL' ? transactions : filteredTransactions;

  const monthlyData = useMemo(() => {
    const grouped = filteredTransactions.reduce((acc, t) => {
      const date = new Date(t.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; 
      if (!acc[key]) {
        acc[key] = { date: key, displayDate: date.toLocaleDateString('pl-PL', { month: 'short' }), income: 0, expense: 0, balance: 0 };
      }

      if (t.type === TransactionType.INCOME) {
        acc[key].income += t.amount;
      } else {
        const category = categories.find(c => c.id === t.categoryId);
        const isSavings = category?.isIncludedInSavings;
        
        if (!isSavings) acc[key].expense += t.amount;
      }
      return acc;
    }, {} as Record<string, any>);

    Object.keys(grouped).forEach(key => {
        const bucketTxs = filteredTransactions.filter(t => {
             const d = new Date(t.date);
             return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === key;
        });
        const inc = bucketTxs.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
        const consumption = bucketTxs.filter(t => {
             if (t.type !== TransactionType.EXPENSE) return false;
             const cat = categories.find(c => c.id === t.categoryId);
             return !cat?.isIncludedInSavings;
        }).reduce((s, t) => s + t.amount, 0);
        grouped[key].balance = inc - consumption;
    });

    return Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [filteredTransactions, categories]);

  const stats = useMemo(() => {
    const totalIncome = filteredTransactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    
    // Consumption = Expenses NOT flagged as savings
    const totalConsumption = filteredTransactions.filter(t => {
        if (t.type !== TransactionType.EXPENSE) return false;
        const cat = categories.find(c => c.id === t.categoryId);
        return !cat?.isIncludedInSavings;
    }).reduce((sum, t) => sum + t.amount, 0);
    
    // Active Savings = Expenses flagged as savings
    const activeSavings = filteredTransactions.filter(t => {
        if (t.type !== TransactionType.EXPENSE) return false;
        const cat = categories.find(c => c.id === t.categoryId);
        return !!cat?.isIncludedInSavings;
    }).reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalConsumption - activeSavings; // Net remaining cash
    
    // Savings Rate Calculation
    // Base: Active Savings
    // Optional: Add balance (if positive)
    let totalSavingsForRate = activeSavings;
    if (includeBalanceInSavings && balance > 0) {
      totalSavingsForRate += balance;
    }

    const savingsRate = totalIncome > 0 ? (totalSavingsForRate / totalIncome) * 100 : 0;

    return { totalIncome, totalConsumption, balance, savingsRate, activeSavings };
  }, [filteredTransactions, categories, includeBalanceInSavings]);

  if (transactions.length === 0) return <div className="p-8 text-center text-slate-400 border rounded-2xl">Brak danych.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className={`bg-white p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 ${sankeyScope === 'FILTERED' ? 'border-indigo-300 ring-2 ring-indigo-50' : 'border-slate-100'}`}>
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${sankeyScope === 'FILTERED' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-50 text-slate-500'}`}><Filter size={18} /></div>
          <span className="font-semibold text-sm">Filtruj statystyki</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm">
            {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
          <div className="flex bg-slate-50 p-1 rounded-lg">
            {(['YEAR', 'QUARTER', 'MONTH'] as PeriodType[]).map((type) => (
              <button key={type} onClick={() => { setPeriodType(type); if(type==='QUARTER') setPeriodValue(1); if(type==='MONTH') setPeriodValue(new Date().getMonth()); }} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${periodType === type ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{type === 'YEAR' ? 'Rok' : type === 'QUARTER' ? 'Kwartał' : 'Miesiąc'}</button>
            ))}
          </div>
          {periodType === 'QUARTER' && <select value={periodValue} onChange={(e)=>setPeriodValue(Number(e.target.value))} className="bg-slate-50 border rounded-lg px-3 py-1.5 text-sm"><option value={1}>Q1</option><option value={2}>Q2</option><option value={3}>Q3</option><option value={4}>Q4</option></select>}
          {periodType === 'MONTH' && <select value={periodValue} onChange={(e)=>setPeriodValue(Number(e.target.value))} className="bg-slate-50 border rounded-lg px-3 py-1.5 text-sm">{Array.from({length:12}).map((_,i)=><option key={i} value={i}>{new Date(2000,i,1).toLocaleDateString('pl-PL',{month:'short'})}</option>)}</select>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm"><p className="text-[10px] text-slate-500 font-bold uppercase">Przychody</p><p className="text-lg font-bold text-green-600 mt-1">{CURRENCY_FORMATTER.format(stats.totalIncome)}</p></div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm"><p className="text-[10px] text-slate-500 font-bold uppercase">Wydatki</p><p className="text-lg font-bold text-red-500 mt-1">{CURRENCY_FORMATTER.format(stats.totalConsumption)}</p></div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm"><p className="text-[10px] text-slate-500 font-bold uppercase">Nadwyżka</p><p className="text-lg font-bold text-indigo-600 mt-1">{CURRENCY_FORMATTER.format(stats.balance)}</p></div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm"><p className="text-[10px] text-slate-500 font-bold uppercase">Stopa oszcz.</p><p className="text-lg font-bold text-emerald-600 mt-1">{stats.savingsRate.toFixed(1)}%</p></div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex justify-between mb-6">
          <h3 className="font-semibold text-slate-800">Przepływ środków</h3>
          <div className="flex bg-slate-50 p-1 rounded-lg">
            <button onClick={()=>setSankeyScope('ALL')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${sankeyScope==='ALL'?'bg-white shadow-sm':'text-slate-500'}`}>Cała historia</button>
            <button onClick={()=>setSankeyScope('FILTERED')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${sankeyScope==='FILTERED'?'bg-white shadow-sm ring-1 ring-indigo-200 text-indigo-700':'text-slate-500'}`}>Wybrany okres</button>
          </div>
        </div>
        <SankeyDiagram transactions={sankeyTransactions} categories={categories} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100"><h3 className="font-semibold mb-6">Przychody vs Wydatki</h3><div className="h-64"><ResponsiveContainer><BarChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="displayDate" fontSize={10}/><YAxis fontSize={10}/><Tooltip formatter={(v:number)=>CURRENCY_FORMATTER.format(v)}/><Bar dataKey="income" fill="#22c55e" radius={[4,4,0,0]}/><Bar dataKey="expense" fill="#ef4444" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100"><h3 className="font-semibold mb-6">Trend Nadwyżki</h3><div className="h-64"><ResponsiveContainer><AreaChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="displayDate" fontSize={10}/><YAxis fontSize={10}/><Tooltip formatter={(v:number)=>CURRENCY_FORMATTER.format(v)}/><Area type="monotone" dataKey="balance" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1}/></AreaChart></ResponsiveContainer></div></div>
      </div>
    </div>
  );
};
