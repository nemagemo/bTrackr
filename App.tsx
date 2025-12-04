
import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, ArrowDownCircle, ArrowUpCircle, LayoutDashboard, LineChart, History, Settings, Eye, EyeOff, PiggyBank, Upload } from 'lucide-react';
import { Transaction, TransactionType, CategoryItem, SubcategoryItem, BackupData } from './types';
import { DEFAULT_CATEGORIES, SYSTEM_IDS, CURRENCY_FORMATTER } from './constants';
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
import { BulkTagModal } from './components/BulkTagModal';
import { BudgetPulse } from './components/BudgetPulse';
import { Logo } from './components/Logo';

type Tab = 'dashboard' | 'analysis' | 'history' | 'settings';

/**
 * Główny komponent aplikacji (Root).
 * Odpowiada za:
 * 1. Zarządzanie stanem globalnym (transakcje, kategorie, ustawienia).
 * 2. Persystencję danych w LocalStorage.
 * 3. Routing (zakładki).
 * 4. Migracje struktur danych między wersjami.
 * 5. Logikę biznesową obliczania sald (Balance Calculation).
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

  // Independent tag list (for tags created in settings but not yet used)
  const [savedTags, setSavedTags] = useState<string[]>(() => {
    const saved = localStorage.getItem('btrackr_tags');
    return saved ? JSON.parse(saved) : [];
  });

  const [isPrivateMode, setIsPrivateMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('btrackr_private_mode');
    return saved ? JSON.parse(saved) : false;
  });

  // --- UI STATE ---
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);
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
    localStorage.setItem('btrackr_tags', JSON.stringify(savedTags));
  }, [savedTags]);

  useEffect(() => {
    localStorage.setItem('btrackr_private_mode', JSON.stringify(isPrivateMode));
  }, [isPrivateMode]);

  // Pobranie wszystkich unikalnych tagów (zarówno z transakcji jak i zapisanych ręcznie)
  const allTags = useMemo(() => {
     const tags = new Set<string>(savedTags);
     transactions.forEach(t => t.tags?.forEach(tag => tags.add(tag)));
     return Array.from(tags).sort();
  }, [transactions, savedTags]);

  // --- MIGRATION LOGIC ---
  // Uruchamia się raz po załadowaniu aplikacji.
  useEffect(() => {
    const performMigration = () => {
       let updatedCategories = [...categories];
       let updatedTransactions = [...transactions];
       let hasChanges = false;

       // MIGRACJA 1: Ustawienie flag isIncludedInSavings dla kategorii systemowych
       updatedCategories = updatedCategories.map(c => {
          if (c.id === SYSTEM_IDS.SAVINGS || c.id === SYSTEM_IDS.INVESTMENTS) {
             if (c.isIncludedInSavings !== true) {
                console.log(`Migrating category ${c.name}: setting isIncludedInSavings=true`);
                hasChanges = true;
                return { ...c, isIncludedInSavings: true };
             }
          }
          return c;
       });

       // MIGRACJA 2: Rozbicie starej kategorii 'cat_liabilities'
       const oldLiabilityCat = updatedCategories.find(c => c.id === 'cat_liabilities');
       if (oldLiabilityCat) {
          console.log("Migrating 'Zobowiązania i Inne' structure...");
          hasChanges = true;

          const createCatIfMissing = (id: string, name: string, color: string, subNames: string[]) => {
             if (!updatedCategories.some(c => c.id === id)) {
                updatedCategories.push({
                   id, name, type: TransactionType.EXPENSE, color, isSystem: false, isIncludedInSavings: false,
                   subcategories: subNames.map(s => ({ id: crypto.randomUUID(), name: s }))
                });
             }
          };

          createCatIfMissing(SYSTEM_IDS.INTERNAL_TRANSFER, 'Przelew własny', '#0ea5e9', ['Inne']);
          createCatIfMissing('cat_insurance', 'Ubezpieczenia', '#db2777', ['Ubezpieczenie na życie', 'Ubezpieczenie podróżne', 'Ubezpieczenie auta', 'Ubezpieczenie domu', 'Inne']);
          createCatIfMissing('cat_loans', 'Zobowiązania', '#7f1d1d', ['Kredyt hipoteczny', 'Kredyt konsumpcyjny', 'Pożyczka', 'Inne']);
          createCatIfMissing(SYSTEM_IDS.OTHER_EXPENSE, 'Inne', '#94a3b8', ['Inne']);

          const getTargetSubId = (catId: string, subNameToCheck: string) => {
             const cat = updatedCategories.find(c => c.id === catId);
             if (!cat) return '';
             const sub = cat.subcategories.find(s => s.name.toLowerCase() === subNameToCheck.toLowerCase());
             if (sub) return sub.id;
             const inne = cat.subcategories.find(s => s.name.toLowerCase() === 'inne');
             return inne ? inne.id : (cat.subcategories[0]?.id || '');
          };

          updatedTransactions = updatedTransactions.map(t => {
             if (t.categoryId === 'cat_liabilities') {
                const oldSub = oldLiabilityCat.subcategories.find(s => s.id === t.subcategoryId);
                const oldSubName = oldSub ? oldSub.name.toLowerCase() : 'inne';

                let targetCatId = 'cat_loans'; 
                let targetSubName = 'Inne';

                if (oldSubName.includes('ubezpiecz')) {
                   targetCatId = 'cat_insurance';
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
       }

       if (hasChanges) {
          setCategories(updatedCategories);
          setTransactions(updatedTransactions);
       }
    };

    performMigration();
  }, []); // Run once on mount

  /**
   * KLUCZOWA LOGIKA FINANSOWA (BALANCE CALCULATION).
   * 
   * Zaktualizowana logika (User Request v3):
   * "Transakcje z kategorii które wliczaja sie do stopy oszczędności NIE traktuj jako wydatek."
   * 
   * totalIncome: Suma wpływów.
   * totalExpense: Suma wydatków KONSUMPCYJNYCH (bez oszczędności).
   * savingsAmount: Kwota wydana na kategorie z flagą `isIncludedInSavings`.
   * 
   * Balance (Dostępne środki - Księgowe) = Income - Consumption(TotalExpense). 
   * (Oszczędności są wliczone w Balance jako posiadane środki - to jest widoczne w Analizie).
   * 
   * Operational Balance (Dostępne środki - Operacyjne "na życie") = Income - TotalExpense - SavingsAmount.
   * (Używane na Pulpicie).
   */
  const summary = useMemo(() => {
    return transactions.reduce(
      (acc, t) => {
        const cat = categories.find(c => c.id === t.categoryId);
        
        if (t.type === TransactionType.INCOME) {
          acc.totalIncome += t.amount;
        } else {
          // Jeśli kategoria jest oszczędnościowa, NIE dodajemy do totalExpense
          if (cat?.isIncludedInSavings) {
            acc.savingsAmount += t.amount;
          } else {
            acc.totalExpense += t.amount;
          }
        }
        return acc;
      },
      { totalIncome: 0, totalExpense: 0, savingsAmount: 0 }
    );
  }, [transactions, categories]);

  // Saldo operacyjne (na życie) = Przychody - Wydatki - Oszczędności
  const operationalBalance = summary.totalIncome - summary.totalExpense - summary.savingsAmount;

  // --- EVENT HANDLERS ---

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
    const transaction: Transaction = {
      ...newTx,
      id: crypto.randomUUID(),
      subcategoryId: ensureSubcategory(newTx.categoryId, newTx.subcategoryId)
    };
    setTransactions(prev => [transaction, ...prev]);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleUpdateTransaction = (updated: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === updated.id ? {
       ...updated,
       subcategoryId: ensureSubcategory(updated.categoryId, updated.subcategoryId)
    } : t));
  };

  const handleClearHistory = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Wyczyść całą historię',
      message: 'Czy na pewno chcesz usunąć wszystkie transakcje? Tej operacji nie można cofnąć.',
      action: () => setTransactions([]),
    });
  };

  const handleImport = (importedTransactions: Transaction[], clearHistory: boolean, newCategories?: CategoryItem[]) => {
    if (newCategories) {
       setCategories(prev => {
          const combined = [...prev];
          newCategories.forEach(newCat => {
             if (!combined.find(c => c.name.toLowerCase() === newCat.name.toLowerCase())) {
                combined.push(newCat);
             }
          });
          return combined;
       });
    }

    if (clearHistory) {
      setTransactions(importedTransactions);
    } else {
      setTransactions(prev => {
        const existingSignatures = new Set(prev.map(t => `${t.date}-${t.amount}-${t.description}`));
        const newUnique = importedTransactions.filter(t => !existingSignatures.has(`${t.date}-${t.amount}-${t.description}`));
        return [...newUnique, ...prev];
      });
    }
  };

  const handleRestoreBackup = (backup: BackupData) => {
     setCategories(backup.categories);
     setTransactions(backup.transactions);
     setIsPrivateMode(backup.settings.isPrivateMode);
  };

  const handleUpdateCategories = (newCategories: CategoryItem[]) => {
    setCategories(newCategories);
  };

  const handleDeleteCategory = (id: string, targetCategoryId?: string, targetSubcategoryId?: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    
    const fallbackId = SYSTEM_IDS.OTHER_EXPENSE;
    const finalTargetId = targetCategoryId || fallbackId;

    setTransactions(prev => prev.map(t => {
      if (t.categoryId === id) {
        return { 
           ...t, 
           categoryId: finalTargetId,
           subcategoryId: targetSubcategoryId || undefined
        };
      }
      return t;
    }));
  };

  const handleDeleteSubcategory = (catId: string, subId: string) => {
    setCategories(prev => prev.map(c => {
       if (c.id !== catId) return c;
       return { ...c, subcategories: c.subcategories.filter(s => s.id !== subId) };
    }));

    const cat = categories.find(c => c.id === catId);
    const inneSub = cat?.subcategories.find(s => s.name === 'Inne');
    const targetSubId = inneSub ? inneSub.id : undefined;

    setTransactions(prev => prev.map(t => {
       if (t.categoryId === catId && t.subcategoryId === subId) {
          return { ...t, subcategoryId: targetSubId };
       }
       return t;
    }));
  };
  
  const handleBulkUpdate = (ids: string[], newCategoryId: string, newSubcategoryId?: string) => {
     setTransactions(prev => prev.map(t => {
        if (ids.includes(t.id)) {
           return {
              ...t,
              categoryId: newCategoryId,
              subcategoryId: ensureSubcategory(newCategoryId, newSubcategoryId)
           };
        }
        return t;
     }));
     setIsBulkModalOpen(false);
  };

  const handleBulkTagUpdate = (ids: string[], tags: string[], mode: 'ADD' | 'REPLACE') => {
      setTransactions(prev => prev.map(t => {
          if (ids.includes(t.id)) {
              let newTags = t.tags || [];
              if (mode === 'REPLACE') {
                  newTags = tags;
              } else {
                  // Add only unique new tags
                  const existingSet = new Set(newTags);
                  tags.forEach(tag => existingSet.add(tag));
                  newTags = Array.from(existingSet);
              }
              return { ...t, tags: newTags };
          }
          return t;
      }));
      setIsBulkTagModalOpen(false);
  };

  const handleRenameTag = (oldName: string, newName: string) => {
     // Rename in transactions
     setTransactions(prev => prev.map(t => {
        if (t.tags && t.tags.includes(oldName)) {
           const newTags = t.tags.map(tag => tag === oldName ? newName : tag);
           return { ...t, tags: Array.from(new Set(newTags)) };
        }
        return t;
     }));
     // Rename in savedTags
     setSavedTags(prev => prev.map(tag => tag === oldName ? newName : tag));
  };

  const handleDeleteTag = (tagName: string) => {
     // Delete from transactions
     setTransactions(prev => prev.map(t => {
        if (t.tags && t.tags.includes(tagName)) {
           return { ...t, tags: t.tags.filter(tag => tag !== tagName) };
        }
        return t;
     }));
     // Delete from savedTags
     setSavedTags(prev => prev.filter(tag => tag !== tagName));
  };

  const handleAddTag = (tagName: string) => {
     if (!savedTags.includes(tagName)) {
        setSavedTags(prev => [...prev, tagName]);
     }
  };

  const handleSplitTransaction = (originalId: string, newTransactions: Omit<Transaction, 'id'>[]) => {
     setTransactions(prev => {
        const filtered = prev.filter(t => t.id !== originalId);
        const added = newTransactions.map(t => ({
           ...t,
           id: crypto.randomUUID(),
           subcategoryId: ensureSubcategory(t.categoryId, t.subcategoryId)
        }));
        return [...added, ...filtered];
     });
  };

  const executeLoadDemo = () => {
    import('./utils/demoData').then(module => {
       const demoTxs = module.generateDemoTransactions(categories);
       setTransactions(demoTxs);
       setActiveTab('analysis');
    });
  };

  const handleLoadDemoRequest = () => {
    if (transactions.length > 0) {
      setConfirmModal({
        isOpen: true,
        title: 'Załaduj dane demo',
        message: 'W historii istnieją już transakcje. Czy chcesz je USUNĄĆ i załadować przykładowe dane demo? Tej operacji nie można cofnąć.',
        action: executeLoadDemo,
      });
    } else {
      executeLoadDemo();
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 pb-20 md:pb-0">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between relative">
          <div className="flex items-center">
            {/* Logo Component */}
            <Logo className="h-10 w-auto text-slate-900" />
          </div>
          
          <nav className="hidden md:flex gap-1 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>Pulpit</button>
            <button onClick={() => setActiveTab('analysis')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'analysis' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>Analiza</button>
            <button onClick={() => setActiveTab('history')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'history' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>Historia</button>
            <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'settings' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>Ustawienia</button>
          </nav>

          <div className="flex items-center gap-1">
            <button 
               onClick={() => setIsImportModalOpen(true)}
               className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
               title="Importuj dane"
            >
               <Upload size={20} />
            </button>
            <button 
               onClick={() => setIsPrivateMode(!isPrivateMode)}
               className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
               title={isPrivateMode ? "Pokaż kwoty" : "Ukryj kwoty"}
            >
               {isPrivateMode ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                label="Dostępne środki" 
                value={CURRENCY_FORMATTER.format(operationalBalance)} 
                icon={<Wallet className="text-slate-900" size={24} />}
                colorClass="text-slate-900"
                isPrivateMode={isPrivateMode}
              />
              <StatCard 
                label="Przychody" 
                value={CURRENCY_FORMATTER.format(summary.totalIncome)} 
                icon={<ArrowUpCircle className="text-green-600" size={24} />}
                colorClass="text-green-600"
                isPrivateMode={isPrivateMode}
              />
              <StatCard 
                label="Wydatki" 
                value={CURRENCY_FORMATTER.format(summary.totalExpense)} 
                icon={<ArrowDownCircle className="text-red-600" size={24} />}
                colorClass="text-red-600"
                isPrivateMode={isPrivateMode}
              />
              <StatCard 
                label="Oszczędności/Inwestycje" 
                value={CURRENCY_FORMATTER.format(summary.savingsAmount)} 
                icon={<PiggyBank className="text-emerald-600" size={24} />}
                colorClass="text-emerald-600"
                isPrivateMode={isPrivateMode}
              />
            </div>

            {/* Main Content Stack */}
            
            {/* 1. Limits/Pulse - Full Width */}
            <BudgetPulse transactions={transactions} categories={categories} isPrivateMode={isPrivateMode} />

            {/* 2. New Transaction & Recent Transactions - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TransactionForm 
                onAdd={handleAddTransaction} 
                categories={categories}
                allTags={allTags}
                onLoadDemo={handleLoadDemoRequest}
              />
              
              <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-800">Ostatnie transakcje</h3>
                  <button onClick={() => setActiveTab('history')} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Zobacz wszystkie</button>
                </div>
                <TransactionList 
                  transactions={transactions.slice(0, 5)} 
                  categories={categories} 
                  onDelete={handleDeleteTransaction}
                  isPrivateMode={isPrivateMode}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <AnalysisView transactions={transactions} categories={categories} isPrivateMode={isPrivateMode} />
        )}

        {activeTab === 'history' && (
          <HistoryView 
             transactions={transactions} 
             categories={categories} 
             onEdit={setEditingTransaction} 
             onDelete={handleDeleteTransaction}
             onClearAll={handleClearHistory}
             onOpenBulkAction={() => setIsBulkModalOpen(true)}
             onOpenBulkTagAction={() => setIsBulkTagModalOpen(true)}
             onSplit={handleSplitTransaction}
             isPrivateMode={isPrivateMode}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView 
            categories={categories} 
            transactions={transactions}
            onUpdateCategories={handleUpdateCategories}
            onDeleteCategory={handleDeleteCategory}
            onDeleteSubcategory={handleDeleteSubcategory}
            onOpenImport={() => setIsImportModalOpen(true)}
            onRenameTag={handleRenameTag}
            onDeleteTag={handleDeleteTag}
            onAddTag={handleAddTag}
            allTags={allTags}
          />
        )}
      </main>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 flex justify-around z-50 pb-safe">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <LayoutDashboard size={20} />
          <span className="text-[10px] font-medium mt-1">Pulpit</span>
        </button>
        <button onClick={() => setActiveTab('analysis')} className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'analysis' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <LineChart size={20} />
          <span className="text-[10px] font-medium mt-1">Analiza</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <History size={20} />
          <span className="text-[10px] font-medium mt-1">Historia</span>
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'settings' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <Settings size={20} />
          <span className="text-[10px] font-medium mt-1">Opcje</span>
        </button>
      </div>

      <ImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onImport={handleImport}
        onRestore={handleRestoreBackup}
        hasExistingTransactions={transactions.length > 0}
        categories={categories}
      />

      <EditTransactionModal 
        isOpen={!!editingTransaction} 
        transaction={editingTransaction} 
        onClose={() => setEditingTransaction(null)} 
        onSave={handleUpdateTransaction}
        onDelete={handleDeleteTransaction}
        categories={categories}
        allTags={allTags}
      />

      <BulkCategoryModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        transactions={transactions}
        categories={categories}
        onUpdate={handleBulkUpdate}
      />

      <BulkTagModal
        isOpen={isBulkTagModalOpen}
        onClose={() => setIsBulkTagModalOpen(false)}
        transactions={transactions}
        categories={categories}
        allTags={allTags}
        onUpdate={handleBulkTagUpdate}
      />

      <ConfirmModal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
        onConfirm={() => { confirmModal.action(); setConfirmModal(prev => ({ ...prev, isOpen: false })); }} 
        title={confirmModal.title} 
        message={confirmModal.message} 
      />
    </div>
  );
};

export default App;
