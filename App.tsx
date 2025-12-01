
import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, PieChart as PieChartIcon, ArrowDownCircle, ArrowUpCircle, Sparkles, LayoutDashboard, LineChart, History, Settings, Eye, EyeOff } from 'lucide-react';
import { Transaction, TransactionType, CategoryItem, SubcategoryItem, BackupData } from './types';
import { DEFAULT_CATEGORIES, SYSTEM_IDS, CURRENCY_FORMATTER, getCategoryName } from './constants';
import { StatCard } from './components/StatCard';
import { TransactionForm } from './components/TransactionForm';
import { TransactionList } from './components/TransactionList';
import { AnalysisView } from './components/AnalysisView';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { ImportModal } from './components/ImportModal';
import { EditTransactionModal } from './components/EditTransactionModal';
import { ConfirmModal } from './components/ConfirmModal';
import { BulkCategoryModal } from './components/BulkCategoryModal';
import { getFinancialAdvice } from './services/geminiService';
import { BudgetPulse } from './components/BudgetPulse';

type Tab = 'dashboard' | 'analysis' | 'history' | 'settings';

/**
 * Główny komponent aplikacji.
 * Odpowiada za zarządzanie stanem globalnym (transakcje, kategorie),
 * routing (zakładki) i komunikację między modalami.
 */
const App: React.FC = () => {
  // --- GLOBAL STATE ---
  // Ładowanie z localStorage przy starcie.
  
  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    const saved = localStorage.getItem('btrackr_categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('btrackr_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [isPrivateMode, setIsPrivateMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('btrackr_private_mode');
    return saved ? JSON.parse(saved) : false;
  });

  // --- UI STATE ---
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

  // --- PERSISTENCE ---
  // Automatyczny zapis do localStorage przy zmianie stanu
  useEffect(() => {
    localStorage.setItem('btrackr_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('btrackr_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('btrackr_private_mode', JSON.stringify(isPrivateMode));
  }, [isPrivateMode]);

  // Pobranie wszystkich unikalnych tagów do autouzupełniania
  const allTags = useMemo(() => {
     const tags = new Set<string>();
     transactions.forEach(t => t.tags?.forEach(tag => tags.add(tag)));
     return Array.from(tags).sort();
  }, [transactions]);

  // --- MIGRATION LOGIC ---
  // Uruchamia się raz przy zmianie kategorii/transakcji, aby naprawić stare struktury danych.
  // Główne zadanie: Rozbicie starej kategorii "Zobowiązania i Inne" na nowe, bardziej szczegółowe.
  useEffect(() => {
    const performMigration = () => {
       const oldLiabilityCat = categories.find(c => c.id === 'cat_liabilities');

       if (oldLiabilityCat) {
          console.log("Migrating 'Zobowiązania i Inne' structure...");

          const newCatsToCreate: CategoryItem[] = [];
          const createCatIfMissing = (id: string, name: string, color: string, subNames: string[]) => {
             if (!categories.some(c => c.id === id)) {
                newCatsToCreate.push({
                   id, name, type: TransactionType.EXPENSE, color, isSystem: false, isIncludedInSavings: false,
                   subcategories: subNames.map(s => ({ id: crypto.randomUUID(), name: s }))
                });
             }
          };

          createCatIfMissing(SYSTEM_IDS.INTERNAL_TRANSFER, 'Przelew własny', '#0ea5e9', ['Inne']);
          createCatIfMissing('cat_insurance', 'Ubezpieczenia', '#db2777', ['Ubezpieczenie na życie', 'Ubezpieczenie podróżne', 'Ubezpieczenie auta', 'Ubezpieczenie domu', 'Inne']);
          createCatIfMissing('cat_loans', 'Zobowiązania', '#7f1d1d', ['Kredyt hipoteczny', 'Kredyt konsumpcyjny', 'Pożyczka', 'Inne']);
          createCatIfMissing(SYSTEM_IDS.OTHER_EXPENSE, 'Inne', '#94a3b8', ['Inne']);

          let updatedCategories = [...categories, ...newCatsToCreate];

          const getTargetSubId = (catId: string, subNameToCheck: string) => {
             const cat = updatedCategories.find(c => c.id === catId);
             if (!cat) return '';
             const sub = cat.subcategories.find(s => s.name.toLowerCase() === subNameToCheck.toLowerCase());
             if (sub) return sub.id;
             const inne = cat.subcategories.find(s => s.name.toLowerCase() === 'inne');
             return inne ? inne.id : (cat.subcategories[0]?.id || '');
          };

          const updatedTransactions = transactions.map(t => {
             if (t.categoryId === 'cat_liabilities') {
                const oldSub = oldLiabilityCat.subcategories.find(s => s.id === t.subcategoryId);
                const oldSubName = oldSub ? oldSub.name.toLowerCase() : 'inne';

                let targetCatId = 'cat_loans'; 
                let targetSubName = 'Inne';

                if (oldSubName.includes('ubezpiecz')) {
                   targetCatId = 'cat_insurance';
                   // ... (logic for insurance subs)
                } else if (oldSubName.includes('przelew')) {
                   targetCatId = SYSTEM_IDS.INTERNAL_TRANSFER;
                } else if (oldSubName === 'inne' || oldSubName === 'zobowiązania i inne') {
                   targetCatId = SYSTEM_IDS.OTHER_EXPENSE;
                } else {
                   targetCatId = 'cat_loans';
                }

                return {
                   ...t,
                   categoryId: targetCatId,
                   subcategoryId: getTargetSubId(targetCatId, targetSubName)
                };
             }
             return t;
          });

          updatedCategories = updatedCategories.filter(c => c.id !== 'cat_liabilities');

          setCategories(updatedCategories);
          setTransactions(updatedTransactions);
       }
    };

    performMigration();
  }, [categories, transactions]);

  /**
   * Kluczowa logika finansowa.
   * Oblicza salda na podstawie flagi `isIncludedInSavings`.
   * 
   * totalIncome: Wszystkie przychody.
   * totalExpense: Wydatki KONSUMPCYJNE (te, które NIE mają isIncludedInSavings).
   * totalTransfers: Wydatki OSZCZĘDNOŚCIOWE (te, które MAJĄ isIncludedInSavings).
   * 
   * Balance (Dostępne środki) = Income - Expense - Transfers.
   */
  const summary = useMemo(() => {
    return transactions.reduce(
      (acc, t) => {
        const cat = categories.find(c => c.id === t.categoryId);
        
        if (t.type === TransactionType.INCOME) {
          acc.totalIncome += t.amount;
        } else {
          const isSavings = cat?.isIncludedInSavings || false;

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

  // --- EVENT HANDLERS ---

  /**
   * Zapewnia istnienie podkategorii (jeśli ID jest puste lub nieprawidłowe, przypisuje 'Inne').
   * Tworzy podkategorię 'Inne' jeśli nie istnieje w danej kategorii.
   */
  const ensureSubcategory = (categoryId: string, providedSubId?: string): string => {
    if (providedSubId) return providedSubId;

    const category = categories.find(c => c.id === categoryId);
    if (!category) return ''; 

    const inneSub = category.subcategories.find(s => s.name.toLowerCase() === 'inne');
    if (inneSub) return inneSub.id;

    const newSubId = crypto.randomUUID();
    const newSub: SubcategoryItem = { id: newSubId, name: 'Inne' };
    
    setCategories(prev => prev.map(c => 
      c.id === categoryId ? { ...c, subcategories: [...c.subcategories, newSub] } : c
    ));
    
    return newSubId;
  };

  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const subId = ensureSubcategory(newTx.categoryId, newTx.subcategoryId);
    const transaction: Transaction = {
      ...newTx,
      subcategoryId: subId,
      id: crypto.randomUUID(),
    };
    setTransactions((prev) => [transaction, ...prev]);
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    const subId = ensureSubcategory(updatedTx.categoryId, updatedTx.subcategoryId);
    const finalTx = { ...updatedTx, subcategoryId: subId };
    setTransactions((prev) => prev.map(t => t.id === updatedTx.id ? finalTx : t));
  };

  const handleBulkCategoryUpdate = (ids: string[], newCategoryName: string, newSubcategoryId?: string) => {
     let targetId = newCategoryName;
     const match = categories.find(c => c.name === newCategoryName || c.id === newCategoryName);
     if (match) targetId = match.id;

     const finalSubId = ensureSubcategory(targetId, newSubcategoryId);

     setTransactions(prev => prev.map(t => 
      ids.includes(t.id) ? { ...t, categoryId: targetId, subcategoryId: finalSubId } : t
    ));
  };

  /**
   * Import transakcji (np. z CSV).
   * Sprawdza duplikaty na podstawie: Data + Kwota + Opis.
   */
  const handleImportTransactions = (importedTxs: Transaction[], clearHistory: boolean, categoriesToMerge?: CategoryItem[]) => {
    if (categoriesToMerge && categoriesToMerge.length > 0) {
      setCategories(prev => {
        const prevMap = new Map(prev.map(c => [c.id, c]));
        categoriesToMerge.forEach(c => prevMap.set(c.id, c));
        return Array.from(prevMap.values());
      });
    }
    
    if (clearHistory) {
      setTransactions(importedTxs);
    } else {
      setTransactions((prev) => {
          const existingSignatures = new Set(prev.map(t => 
             `${t.date}_${t.amount}_${t.description.trim().toLowerCase()}`
          ));
          
          const uniqueNewTxs = importedTxs.filter(t => 
             !existingSignatures.has(`${t.date}_${t.amount}_${t.description.trim().toLowerCase()}`)
          );

          return [...uniqueNewTxs, ...prev];
      });
    }
  };

  const handleRestoreBackup = (backup: BackupData) => {
     setCategories(backup.categories);
     setTransactions(backup.transactions);
     if (backup.settings) {
        setIsPrivateMode(backup.settings.isPrivateMode);
     }
  };

  const handleSplitTransaction = (originalId: string, newTransactions: Omit<Transaction, 'id'>[]) => {
    const transactionsToAdd: Transaction[] = newTransactions.map(tx => {
        const subId = ensureSubcategory(tx.categoryId, tx.subcategoryId);
        return {
           ...tx,
           id: crypto.randomUUID(),
           subcategoryId: subId
        };
    });

    setTransactions(prev => {
       const filtered = prev.filter(t => t.id !== originalId);
       return [...transactionsToAdd, ...filtered];
    });
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

  /**
   * Logika usuwania kategorii/podkategorii.
   * Zawsze przenosi transakcje do 'Inne' lub innej wskazanej kategorii,
   * aby uniknąć osieroconych rekordów.
   */
  const handleDeleteSubcategory = (categoryId: string, subcategoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    let otherSub = category.subcategories.find(s => s.name.toLowerCase() === 'inne' && s.id !== subcategoryId);
    let newCategories = [...categories];

    if (!otherSub) {
      const newSub: SubcategoryItem = { id: crypto.randomUUID(), name: 'Inne' };
      newCategories = newCategories.map(c => 
        c.id === categoryId ? { ...c, subcategories: [...c.subcategories, newSub] } : c
      );
      otherSub = newSub;
    }

    setTransactions(prev => prev.map(t => {
      if (t.categoryId === categoryId && t.subcategoryId === subcategoryId) {
        return { ...t, subcategoryId: otherSub!.id };
      }
      return t;
    }));

    setCategories(currentCats => {
      return newCategories.map(c => 
        c.id === categoryId ? { ...c, subcategories: c.subcategories.filter(s => s.id !== subcategoryId) } : c
      );
    });
  };

  const handleDeleteCategory = (categoryId: string, targetCategoryId?: string, targetSubcategoryId?: string) => {
    const categoryToDelete = categories.find(c => c.id === categoryId);
    if (!categoryToDelete) return;

    let targetCatId = targetCategoryId;
    let targetSubId = targetSubcategoryId;
    let updatedCategories = [...categories];

    if (!targetCatId) {
        let targetCat = categories.find(c => 
          c.type === categoryToDelete.type && 
          c.id !== categoryId && 
          c.name.toLowerCase().includes('inne')
        );
        
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
        targetCatId = targetCat.id;
    }

    const finalTargetCat = updatedCategories.find(c => c.id === targetCatId);
    
    if (finalTargetCat) {
        if (!targetSubId) {
             let targetSub = finalTargetCat.subcategories.find(s => s.name.toLowerCase() === 'inne');
             if (!targetSub) {
                targetSub = { id: crypto.randomUUID(), name: 'Inne' };
                finalTargetCat.subcategories = [...finalTargetCat.subcategories, targetSub];
             }
             targetSubId = targetSub.id;
        } else {
             if (!finalTargetCat.subcategories.find(s => s.id === targetSubId)) {
                let targetSub = finalTargetCat.subcategories.find(s => s.name.toLowerCase() === 'inne');
                 if (!targetSub) {
                    targetSub = { id: crypto.randomUUID(), name: 'Inne' };
                    finalTargetCat.subcategories = [...finalTargetCat.subcategories, targetSub];
                 }
                 targetSubId = targetSub.id;
             }
        }
    }

    setTransactions(prev => prev.map(t => {
      if (t.categoryId === categoryId) {
        return { ...t, categoryId: targetCatId!, subcategoryId: targetSubId };
      }
      return t;
    }));

    setCategories(updatedCategories.filter(c => c.id !== categoryId));
  };

  const handleLoadDemo = () => {
     import('./utils/demoData').then(({ generateDemoTransactions }) => {
        const demoTxs = generateDemoTransactions(categories);
        setTransactions(demoTxs);
        localStorage.setItem('btrackr_transactions', JSON.stringify(demoTxs));
     });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 backdrop-blur-md bg-white/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 p-2 rounded-lg text-white">
              <Wallet size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 hidden sm:block">bTrackr</h1>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto">
            <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><LayoutDashboard size={16} /> <span className="hidden sm:inline">Pulpit</span></button>
            <button onClick={() => setActiveTab('analysis')} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'analysis' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><LineChart size={16} /> <span className="hidden sm:inline">Analiza</span></button>
             <button onClick={() => setActiveTab('history')} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><History size={16} /> <span className="hidden sm:inline">Historia</span></button>
            <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'settings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Settings size={16} /> <span className="hidden sm:inline">Ustawienia</span></button>
          </div>

          <div className="flex items-center gap-2">
             <button onClick={() => setIsPrivateMode(!isPrivateMode)} className={`p-2 rounded-full transition-colors ${isPrivateMode ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`} title={isPrivateMode ? "Wyłącz tryb prywatny" : "Włącz tryb prywatny"}>{isPrivateMode ? <EyeOff size={18} /> : <Eye size={18} />}</button>
             <button onClick={handleGetAdvice} disabled={isLoadingAdvice || transactions.length === 0} className="text-xs font-medium bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"><Sparkles size={14} /> {isLoadingAdvice ? '...' : 'AI'}</button>
          </div>
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
              <StatCard label="Dostępne środki" value={CURRENCY_FORMATTER.format(balance)} icon={<Wallet size={20} className="text-slate-600" />} colorClass="text-slate-900" isPrivateMode={isPrivateMode}/>
              <StatCard label="Przychody" value={CURRENCY_FORMATTER.format(summary.totalIncome)} icon={<ArrowUpCircle size={20} className="text-green-600" />} colorClass="text-green-600" isPrivateMode={isPrivateMode}/>
              <StatCard label="Wydatki" value={CURRENCY_FORMATTER.format(summary.totalExpense)} icon={<ArrowDownCircle size={20} className="text-red-600" />} colorClass="text-red-600" isPrivateMode={isPrivateMode}/>
            </div>
            <div className="animate-fade-in"><BudgetPulse transactions={transactions} categories={categories} isPrivateMode={isPrivateMode} /></div>
            <div className="grid grid-cols-1 gap-8">
              <div className="space-y-8">
                <TransactionForm onAdd={handleAddTransaction} onImportClick={() => setIsImportModalOpen(true)} categories={categories} allTags={allTags}/>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">Ostatnie operacje <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{transactions.length}</span></h2>
                    <button onClick={() => setActiveTab('history')} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">Zobacz wszystkie</button>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-100 p-2">
                    <div className="space-y-1">
                        {transactions.slice(0, 5).map(t => {
                            const cat = categories.find(c => c.id === t.categoryId);
                            return (
                              <div key={t.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition-colors">
                                  <div>
                                    <div className="flex items-center gap-2">
                                       <p className="font-semibold text-slate-800">{t.description}</p>
                                       {t.tags && t.tags.length > 0 && <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">#{t.tags[0]}</span>}
                                    </div>
                                    <p className="text-xs text-slate-400">{cat?.name || 'Inne'}</p>
                                  </div>
                                  <span className={`${t.type === 'INCOME' ? 'text-green-600 font-bold' : 'text-slate-900 font-bold'} ${isPrivateMode ? 'blur-[5px] select-none' : ''}`}>{t.type === 'INCOME' ? '+' : '-'}{CURRENCY_FORMATTER.format(t.amount)}</span>
                              </div>
                            )
                        })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'analysis' && <AnalysisView transactions={transactions} categories={categories} isPrivateMode={isPrivateMode} />}
        {activeTab === 'history' && <HistoryView transactions={transactions} categories={categories} onEdit={setEditingTransaction} onDelete={requestDeleteTransaction} onClearAll={requestClearAllTransactions} onOpenBulkAction={() => setIsBulkModalOpen(true)} onSplit={handleSplitTransaction} isPrivateMode={isPrivateMode} />}
        {activeTab === 'settings' && <SettingsView categories={categories} transactions={transactions} onUpdateCategories={setCategories} onDeleteCategory={handleDeleteCategory} onDeleteSubcategory={handleDeleteSubcategory} onLoadDemo={handleLoadDemo} />}
      </main>

      <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImport={handleImportTransactions} onRestore={handleRestoreBackup} hasExistingTransactions={transactions.length > 0} categories={categories} />
      <EditTransactionModal isOpen={!!editingTransaction} transaction={editingTransaction} onClose={() => setEditingTransaction(null)} onSave={handleUpdateTransaction} onDelete={requestDeleteTransaction} categories={categories} allTags={allTags} />
      <BulkCategoryModal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} transactions={transactions} onUpdate={handleBulkCategoryUpdate} categories={categories} />
      <ConfirmModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} onConfirm={() => { confirmModal.action(); setConfirmModal(prev => ({ ...prev, isOpen: false })); }} title={confirmModal.title} message={confirmModal.message} />
    </div>
  );
};

export default App;
