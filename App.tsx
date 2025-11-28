import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, PieChart as PieChartIcon, ArrowDownCircle, ArrowUpCircle, Sparkles, LayoutDashboard, LineChart, History } from 'lucide-react';
import { Transaction, TransactionType, Category } from './types';
import { INITIAL_TRANSACTIONS, CURRENCY_FORMATTER } from './constants';
import { StatCard } from './components/StatCard';
import { TransactionForm } from './components/TransactionForm';
import { TransactionList } from './components/TransactionList';
import { ExpenseChart } from './components/ExpenseChart';
import { AnalysisView } from './components/AnalysisView';
import { HistoryView } from './components/HistoryView';
import { ImportModal } from './components/ImportModal';
import { EditTransactionModal } from './components/EditTransactionModal';
import { ConfirmModal } from './components/ConfirmModal';
import { BulkCategoryModal } from './components/BulkCategoryModal';
import { getFinancialAdvice } from './services/geminiService';

type Tab = 'dashboard' | 'analysis' | 'history';

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('zenbudget_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  
  // Edit Modal State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {},
  });

  useEffect(() => {
    localStorage.setItem('zenbudget_transactions', JSON.stringify(transactions));
  }, [transactions]);

  const summary = useMemo(() => {
    return transactions.reduce(
      (acc, t) => {
        if (t.type === TransactionType.INCOME) {
          acc.totalIncome += t.amount;
        } else {
          // If it is internal transfer, we don't count it as "Consumer Expense" for the stats
          // but we track it as outflow for balance calculation
          if (t.category !== Category.INTERNAL_TRANSFER) {
            acc.totalExpense += t.amount;
          }
          acc.totalOutflow += t.amount;
        }
        return acc;
      },
      { totalIncome: 0, totalExpense: 0, totalOutflow: 0 }
    );
  }, [transactions]);

  // Balance = Income - All Outflows (including transfers to savings)
  const balance = summary.totalIncome - summary.totalOutflow;

  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const transaction: Transaction = {
      ...newTx,
      id: crypto.randomUUID(),
    };
    setTransactions((prev) => [transaction, ...prev]);
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    setTransactions((prev) => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
  };

  const handleBulkCategoryUpdate = (ids: string[], newCategory: string) => {
    setTransactions(prev => prev.map(t => 
      ids.includes(t.id) ? { ...t, category: newCategory } : t
    ));
  };

  const handleImportTransactions = (importedTxs: Transaction[], clearHistory: boolean) => {
    if (clearHistory) {
      setTransactions(importedTxs);
    } else {
      setTransactions((prev) => [...importedTxs, ...prev]);
    }
  };

  // Internal implementation that actually removes data
  const performDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    if (editingTransaction?.id === id) {
      setEditingTransaction(null);
    }
  };

  const performClearAll = () => {
    setTransactions([]);
    localStorage.removeItem('zenbudget_transactions');
    setEditingTransaction(null);
  };

  // Request handlers that open the confirmation modal
  const requestDeleteTransaction = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Usuń transakcję',
      message: 'Czy na pewno chcesz usunąć tę transakcję? Tej operacji nie można cofnąć.',
      action: () => performDeleteTransaction(id),
    });
  };

  const requestClearAllTransactions = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Wyczyść historię',
      message: 'UWAGA: Czy na pewno chcesz trwale usunąć WSZYSTKIE transakcje? Tej operacji nie można cofnąć.',
      action: () => performClearAll(),
    });
  };

  const handleGetAdvice = async () => {
    setIsLoadingAdvice(true);
    const advice = await getFinancialAdvice(transactions);
    setAiAdvice(advice);
    setIsLoadingAdvice(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10 backdrop-blur-md bg-white/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 p-2 rounded-lg text-white">
              <Wallet size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 hidden sm:block">ZenBudget</h1>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutDashboard size={16} />
              <span className="hidden sm:inline">Pulpit</span>
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                activeTab === 'analysis'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LineChart size={16} />
              <span className="hidden sm:inline">Analiza</span>
            </button>
             <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <History size={16} />
              <span className="hidden sm:inline">Historia</span>
            </button>
          </div>

          <button 
            onClick={handleGetAdvice}
            disabled={isLoadingAdvice || transactions.length === 0}
            className="text-xs font-medium bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles size={14} />
            {isLoadingAdvice ? '...' : 'AI'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* AI Insight Banner */}
        {aiAdvice && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded-xl shadow-lg flex items-start gap-3 animate-fade-in">
            <Sparkles size={20} className="mt-1 flex-shrink-0 text-indigo-200" />
            <div>
              <p className="text-sm font-medium leading-relaxed">{aiAdvice}</p>
            </div>
            <button 
              onClick={() => setAiAdvice('')} 
              className="ml-auto text-indigo-200 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard 
                label="Dostępne środki" 
                value={CURRENCY_FORMATTER.format(balance)} 
                icon={<Wallet size={20} className="text-slate-600" />}
                colorClass="text-slate-900"
              />
              <StatCard 
                label="Przychody" 
                value={CURRENCY_FORMATTER.format(summary.totalIncome)} 
                icon={<ArrowUpCircle size={20} className="text-green-600" />}
                colorClass="text-green-600"
              />
              <StatCard 
                label="Wydatki" 
                value={CURRENCY_FORMATTER.format(summary.totalExpense)} 
                icon={<ArrowDownCircle size={20} className="text-red-600" />}
                colorClass="text-red-600"
              />
            </div>

            {/* Two Column Layout for Desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Form & History */}
              <div className="lg:col-span-7 space-y-8">
                <TransactionForm 
                  onAdd={handleAddTransaction} 
                  onImportClick={() => setIsImportModalOpen(true)}
                />
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      Ostatnie operacje
                      <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {transactions.length}
                      </span>
                    </h2>
                    <button 
                      onClick={() => setActiveTab('history')}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      Zobacz wszystkie
                    </button>
                  </div>
                  <TransactionList transactions={transactions.slice(0, 5)} onDelete={requestDeleteTransaction} />
                </div>
              </div>

              {/* Right Column: Analytics */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] border border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                      <PieChartIcon size={18} className="text-slate-400" />
                      Struktura Wydatków
                    </h3>
                  </div>
                  <ExpenseChart transactions={transactions} />
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {/* Minimal Legend - Exclude Internal Transfer from this view? Usually yes */}
                    {Object.entries(
                      transactions
                        .filter(t => t.type === TransactionType.EXPENSE && t.category !== Category.INTERNAL_TRANSFER)
                        .reduce((acc, t) => {
                          acc[t.category] = (acc[t.category] || 0) + t.amount;
                          return acc;
                        }, {} as Record<string, number>)
                    )
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .slice(0, 4)
                    .map(([cat, val]) => (
                      <div key={cat} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-lg">
                        <span className="text-slate-600 truncate">{cat}</span>
                        <span className="font-medium text-slate-900">{Math.round(val as number)} zł</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'analysis' && (
          <AnalysisView transactions={transactions} />
        )}

        {activeTab === 'history' && (
          <HistoryView 
            transactions={transactions} 
            onEdit={setEditingTransaction} 
            onDelete={requestDeleteTransaction} 
            onClearAll={requestClearAllTransactions}
            onOpenBulkAction={() => setIsBulkModalOpen(true)}
          />
        )}
      </main>

      {/* Modals */}
      <ImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onImport={handleImportTransactions}
        hasExistingTransactions={transactions.length > 0}
      />
      
      <EditTransactionModal 
        isOpen={!!editingTransaction}
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onSave={handleUpdateTransaction}
        onDelete={requestDeleteTransaction}
      />

      <BulkCategoryModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        transactions={transactions}
        onUpdate={handleBulkCategoryUpdate}
      />

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          confirmModal.action();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </div>
  );
};

export default App;