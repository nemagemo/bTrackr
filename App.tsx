
import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, PieChart as PieChartIcon, ArrowDownCircle, ArrowUpCircle, Sparkles, LayoutDashboard, LineChart, History, Settings } from 'lucide-react';
import { Transaction, TransactionType, CategoryItem, SubcategoryItem } from './types';
import { DEFAULT_CATEGORIES, SYSTEM_IDS, CURRENCY_FORMATTER, getCategoryName } from './constants';
import { StatCard } from './components/StatCard';
import { TransactionForm } from './components/TransactionForm';
import { TransactionList } from './components/TransactionList';
import { ExpenseChart } from './components/ExpenseChart';
import { AnalysisView } from './components/AnalysisView';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { ImportModal } from './components/ImportModal';
import { EditTransactionModal } from './components/EditTransactionModal';
import { ConfirmModal } from './components/ConfirmModal';
import { BulkCategoryModal } from './components/BulkCategoryModal';
import { getFinancialAdvice } from './services/geminiService';

type Tab = 'dashboard' | 'analysis' | 'history' | 'settings';

const App: React.FC = () => {
  // Categories State
  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    const saved = localStorage.getItem('btrackr_categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });

  // Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('btrackr_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  // Settings State
  const [includeBalanceInSavings, setIncludeBalanceInSavings] = useState<boolean>(() => {
    const saved = localStorage.getItem('btrackr_cfg_savings_balance');
    return saved ? JSON.parse(saved) : false;
  });

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

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

  // Persist State
  useEffect(() => {
    localStorage.setItem('btrackr_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('btrackr_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('btrackr_cfg_savings_balance', JSON.stringify(includeBalanceInSavings));
  }, [includeBalanceInSavings]);

  // Migration Logic
  useEffect(() => {
    // 1. Migrate legacy ID strings to new default structure if necessary
    const hasLegacyData = transactions.some(t => {
      return !categories.some(c => c.id === t.categoryId);
    });

    if (hasLegacyData && transactions.length > 0) {
      console.log("Migrating legacy data...");
      const migrated = transactions.map(t => {
        if (categories.some(c => c.id === t.categoryId)) return t;
        const legacyName = (t as any).category || t.categoryId; 
        const match = categories.find(c => c.name === legacyName);
        if (match) {
           return { ...t, categoryId: match.id };
        }
        const otherId = t.type === TransactionType.INCOME ? SYSTEM_IDS.OTHER_INCOME : SYSTEM_IDS.OTHER_EXPENSE;
        const fallback = categories.find(c => c.id === otherId);
        return { ...t, categoryId: fallback ? fallback.id : categories[0].id };
      });
      setTransactions(migrated);
    }
  }, []);

  const summary = useMemo(() => {
    return transactions.reduce(
      (acc, t) => {
        if (t.type === TransactionType.INCOME) {
          acc.totalIncome += t.amount;
        } else {
          // Identify if it's savings based on the Category Flag
          const category = categories.find(c => c.id === t.categoryId);
          const isSavings = category?.isIncludedInSavings || false;

          if (!isSavings) {
            acc.totalExpense += t.amount; 
            acc.totalOutflow += t.amount;
          } else {
            acc.totalTransfers += t.amount;
          }
        }
        return acc;
      },
      { totalIncome: 0, totalExpense: 0, totalOutflow: 0, totalTransfers: 0 }
    );
  }, [transactions, categories]);

  const balance = summary.totalIncome - summary.totalOutflow - summary.totalTransfers; 

  // --- Handlers ---

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

  const handleBulkCategoryUpdate = (ids: string[], newCategoryName: string, newSubcategoryId?: string) => {
     let targetId = newCategoryName;
     const match = categories.find(c => c.name === newCategoryName || c.id === newCategoryName);
     if (match) targetId = match.id;

     setTransactions(prev => prev.map(t => 
      ids.includes(t.id) ? { ...t, categoryId: targetId, subcategoryId: newSubcategoryId || undefined } : t
    ));
  };

  const handleImportTransactions = (importedTxs: Transaction[], clearHistory: boolean, newCategories?: CategoryItem[]) => {
    if (newCategories && newCategories.length > 0) {
      setCategories(prev => [...prev, ...newCategories]);
    }
    
    if (clearHistory) {
      setTransactions(importedTxs);
    } else {
      setTransactions((prev) => [...importedTxs, ...prev]);
    }
  };

  const performDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    if (editingTransaction?.id === id) {
      setEditingTransaction(null);
    }
  };

  const performClearAll = () => {
    setTransactions([]);
    localStorage.removeItem('btrackr_transactions');
    setEditingTransaction(null);
  };

  const requestDeleteTransaction = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Usuń transakcję',
      message: 'Czy na pewno chcesz usunąć tę transakcję?',
      action: () => performDeleteTransaction(id),
    });
  };

  const requestClearAllTransactions = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Wyczyść historię',
      message: 'Czy na pewno chcesz usunąć WSZYSTKIE transakcje?',
      action: () => performClearAll(),
    });
  };

  const handleGetAdvice = async () => {
    setIsLoadingAdvice(true);
    const advice = await getFinancialAdvice(transactions, categories);
    setAiAdvice(advice);
    setIsLoadingAdvice(false);
  };

  // --- COMPLEX DELETE LOGIC ---

  const handleDeleteSubcategory = (categoryId: string, subcategoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    // 1. Find or Create "Inne" subcategory in the same category
    let otherSub = category.subcategories.find(s => s.name.toLowerCase() === 'inne' && s.id !== subcategoryId);
    let newCategories = [...categories];

    if (!otherSub) {
      // Create 'Inne' if it doesn't exist
      const newSub: SubcategoryItem = { id: crypto.randomUUID(), name: 'Inne' };
      newCategories = newCategories.map(c => 
        c.id === categoryId ? { ...c, subcategories: [...c.subcategories, newSub] } : c
      );
      otherSub = newSub;
    }

    // 2. Move transactions
    setTransactions(prev => prev.map(t => {
      if (t.categoryId === categoryId && t.subcategoryId === subcategoryId) {
        return { ...t, subcategoryId: otherSub!.id };
      }
      return t;
    }));

    // 3. Delete the subcategory
    setCategories(currentCats => {
      // We need to use the state-safe update, in case 'Inne' was just created above
      // But we handled 'newCategories' above. Let's start fresh from newCategories.
      return newCategories.map(c => 
        c.id === categoryId ? { ...c, subcategories: c.subcategories.filter(s => s.id !== subcategoryId) } : c
      );
    });
  };

  const handleDeleteCategory = (categoryId: string) => {
    const categoryToDelete = categories.find(c => c.id === categoryId);
    if (!categoryToDelete) return;

    // 1. Find target "Inne" category of the same type
    let targetCat = categories.find(c => 
      c.type === categoryToDelete.type && 
      c.id !== categoryId && 
      c.name.toLowerCase().includes('inne')
    );
    
    let updatedCategories = [...categories];
    
    // Create 'Inne' Category if it doesn't exist
    if (!targetCat) {
       targetCat = {
         id: crypto.randomUUID(),
         name: 'Inne',
         type: categoryToDelete.type,
         color: '#64748b',
         isSystem: false,
         subcategories: []
       };
       updatedCategories.push(targetCat);
    }

    // 2. Find or Create "Inne" subcategory in target
    let targetSub = targetCat.subcategories.find(s => s.name.toLowerCase() === 'inne');
    if (!targetSub) {
       targetSub = { id: crypto.randomUUID(), name: 'Inne' };
       targetCat.subcategories = [...targetCat.subcategories, targetSub];
       // Update reference in list
       updatedCategories = updatedCategories.map(c => c.id === targetCat!.id ? targetCat! : c);
    }

    // 3. Move transactions
    setTransactions(prev => prev.map(t => {
      if (t.categoryId === categoryId) {
        return { ...t, categoryId: targetCat!.id, subcategoryId: targetSub!.id };
      }
      return t;
    }));

    // 4. Delete the category
    setCategories(updatedCategories.filter(c => c.id !== categoryId));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10 backdrop-blur-md bg-white/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 p-2 rounded-lg text-white">
              <Wallet size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 hidden sm:block">bTrackr</h1>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto">
            <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <LayoutDashboard size={16} /> <span className="hidden sm:inline">Pulpit</span>
            </button>
            <button onClick={() => setActiveTab('analysis')} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'analysis' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <LineChart size={16} /> <span className="hidden sm:inline">Analiza</span>
            </button>
             <button onClick={() => setActiveTab('history')} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <History size={16} /> <span className="hidden sm:inline">Historia</span>
            </button>
            <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'settings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Settings size={16} /> <span className="hidden sm:inline">Ustawienia</span>
            </button>
          </div>

          <button onClick={handleGetAdvice} disabled={isLoadingAdvice || transactions.length === 0} className="text-xs font-medium bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors flex items-center gap-1.5 disabled:opacity-50">
            <Sparkles size={14} /> {isLoadingAdvice ? '...' : 'AI'}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {aiAdvice && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded-xl shadow-lg flex items-start gap-3 animate-fade-in">
            <Sparkles size={20} className="mt-1 flex-shrink-0 text-indigo-200" />
            <p className="text-sm font-medium leading-relaxed">{aiAdvice}</p>
            <button onClick={() => setAiAdvice('')} className="ml-auto text-indigo-200 hover:text-white">×</button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard label="Dostępne środki" value={CURRENCY_FORMATTER.format(balance)} icon={<Wallet size={20} className="text-slate-600" />} colorClass="text-slate-900"/>
              <StatCard label="Przychody" value={CURRENCY_FORMATTER.format(summary.totalIncome)} icon={<ArrowUpCircle size={20} className="text-green-600" />} colorClass="text-green-600"/>
              <StatCard label="Wydatki" value={CURRENCY_FORMATTER.format(summary.totalExpense)} icon={<ArrowDownCircle size={20} className="text-red-600" />} colorClass="text-red-600"/>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-8">
                <TransactionForm onAdd={handleAddTransaction} onImportClick={() => setIsImportModalOpen(true)} categories={categories}/>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      Ostatnie operacje <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{transactions.length}</span>
                    </h2>
                    <button onClick={() => setActiveTab('history')} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">Zobacz wszystkie</button>
                  </div>
                  <div className="space-y-3">
                     {transactions.slice(0, 5).map(t => {
                        const cat = categories.find(c => c.id === t.categoryId);
                        return (
                           <div key={t.id} className="flex justify-between items-center p-3 bg-white border rounded-xl">
                              <div>
                                 <p className="font-semibold text-slate-800">{t.description}</p>
                                 <p className="text-xs text-slate-400">{cat?.name || 'Inne'}</p>
                              </div>
                              <span className={t.type === 'INCOME' ? 'text-green-600 font-bold' : 'text-slate-900 font-bold'}>
                                 {t.type === 'INCOME' ? '+' : '-'}{CURRENCY_FORMATTER.format(t.amount)}
                              </span>
                           </div>
                        )
                     })}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-6">
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-semibold mb-4 text-slate-800">Struktura Wydatków</h3>
                    <ExpenseChart transactions={transactions} categories={categories} /> 
                 </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'analysis' && (
          <AnalysisView 
            transactions={transactions} 
            categories={categories} 
            includeBalanceInSavings={includeBalanceInSavings}
          />
        )}
        
        {activeTab === 'history' && <HistoryView transactions={transactions} categories={categories} onEdit={setEditingTransaction} onDelete={requestDeleteTransaction} onClearAll={requestClearAllTransactions} onOpenBulkAction={() => setIsBulkModalOpen(true)} />}
        
        {activeTab === 'settings' && (
          <SettingsView 
            categories={categories} 
            onUpdateCategories={setCategories} 
            onDeleteCategory={handleDeleteCategory}
            onDeleteSubcategory={handleDeleteSubcategory}
            includeBalanceInSavings={includeBalanceInSavings}
            onToggleBalanceInSavings={setIncludeBalanceInSavings}
          />
        )}
      </main>

      <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImport={handleImportTransactions} hasExistingTransactions={transactions.length > 0} categories={categories} />
      <EditTransactionModal isOpen={!!editingTransaction} transaction={editingTransaction} onClose={() => setEditingTransaction(null)} onSave={handleUpdateTransaction} onDelete={requestDeleteTransaction} categories={categories} />
      <BulkCategoryModal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} transactions={transactions} onUpdate={handleBulkCategoryUpdate} categories={categories} />
      <ConfirmModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} onConfirm={() => { confirmModal.action(); setConfirmModal(prev => ({ ...prev, isOpen: false })); }} title={confirmModal.title} message={confirmModal.message} />
    </div>
  );
};

export default App;
