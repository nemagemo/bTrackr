
import React from 'react';
import { Wallet, ArrowUpCircle, ArrowDownCircle, PiggyBank } from 'lucide-react';
import { StatCard } from './StatCard';
import { BudgetPulse } from './BudgetPulse';
import { TransactionForm } from './TransactionForm';
import { TransactionList } from './TransactionList';
import { CURRENCY_FORMATTER } from '../constants';
import { useFinance } from '../context/FinanceContext';

interface DashboardViewProps {
  onSetActiveTab: (tab: any) => void;
  onLoadDemoRequest: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onSetActiveTab, onLoadDemoRequest }) => {
  const { 
    transactions, 
    categories, 
    summary, 
    operationalBalance, 
    allTags, 
    isPrivateMode, 
    addTransaction, 
    deleteTransaction
  } = useFinance();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Dostępne środki" 
          value={CURRENCY_FORMATTER.format(operationalBalance)} 
          icon={<Wallet size={24} strokeWidth={1.5} />}
          colorClass="text-slate-900"
          bgClass="bg-slate-100 dark:bg-slate-700/40"
          isPrivateMode={isPrivateMode}
        />
        <StatCard 
          label="Przychody" 
          value={CURRENCY_FORMATTER.format(summary.totalIncome)} 
          icon={<ArrowUpCircle size={24} strokeWidth={1.5} />}
          colorClass="text-green-600"
          bgClass="bg-green-50 dark:bg-green-500/10"
          isPrivateMode={isPrivateMode}
        />
        <StatCard 
          label="Wydatki" 
          value={CURRENCY_FORMATTER.format(summary.totalExpense)} 
          icon={<ArrowDownCircle size={24} strokeWidth={1.5} />}
          colorClass="text-red-600"
          bgClass="bg-red-50 dark:bg-red-500/10"
          isPrivateMode={isPrivateMode}
        />
        <StatCard 
          label="Oszczędności" 
          value={CURRENCY_FORMATTER.format(summary.savingsAmount)} 
          icon={<PiggyBank size={24} strokeWidth={1.5} />}
          colorClass="text-emerald-600"
          bgClass="bg-emerald-50 dark:bg-emerald-500/10"
          isPrivateMode={isPrivateMode}
        />
      </div>

      {/* Main Content Stack */}
      
      {/* 1. Limits/Pulse - Full Width */}
      <BudgetPulse transactions={transactions} categories={categories} isPrivateMode={isPrivateMode} />

      {/* 2. New Transaction & Recent Transactions - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TransactionForm 
          onAdd={addTransaction} 
          categories={categories}
          allTags={allTags}
          onLoadDemo={onLoadDemoRequest}
        />
        
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] dark:shadow-none border border-slate-100 dark:border-slate-700 flex flex-col h-full transition-colors">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h3 className="font-semibold text-slate-800 dark:text-white">Ostatnie transakcje</h3>
            <button onClick={() => onSetActiveTab('history')} className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium">Zobacz wszystkie</button>
          </div>
          <div className="flex-1 min-h-0">
            <TransactionList 
              transactions={transactions.slice(0, 5)} 
              categories={categories} 
              onDelete={deleteTransaction}
              isPrivateMode={isPrivateMode}
              onLoadDemo={onLoadDemoRequest}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
