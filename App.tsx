
import React, { useState } from 'react';
import { LayoutDashboard, LineChart, History, Settings, Eye, EyeOff, Upload, Sun, Moon } from 'lucide-react';
import { Transaction } from './types';
import { AnalysisView } from './components/AnalysisView';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { ImportModal } from './components/ImportModal';
import { EditTransactionModal } from './components/EditTransactionModal';
import { ConfirmModal } from './components/ConfirmModal';
import { BulkCategoryModal } from './components/BulkCategoryModal';
import { BulkTagModal } from './components/BulkTagModal';
import { Logo } from './components/Logo';
import { DashboardView } from './components/DashboardView';
import { FinanceProvider, useFinance } from './context/FinanceContext';

type Tab = 'dashboard' | 'analysis' | 'history' | 'settings';

/**
 * Inner App Component holding the UI Logic.
 * Needs to be inside FinanceProvider to use the hook.
 */
const AppContent: React.FC = () => {
  // Global State from Context
  const { 
    transactions, categories, isPrivateMode, setIsPrivateMode, allTags, theme, toggleTheme,
    updateTransaction, deleteTransaction, clearTransactions,
    updateCategories, deleteCategory, deleteSubcategory,
    renameTag, deleteTag, addTag,
    importData, restoreBackup, loadDemoData,
    bulkUpdateCategory, bulkUpdateTags, splitTransaction
  } = useFinance();

  // UI State
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

  const handleLoadDemoRequest = () => {
    if (transactions.length > 0) {
      setConfirmModal({
        isOpen: true,
        title: 'Załaduj dane demo',
        message: 'W historii istnieją już transakcje. Czy chcesz je USUNĄĆ i załadować przykładowe dane demo? Tej operacji nie można cofnąć.',
        action: () => {
           loadDemoData(); 
           setActiveTab('analysis');
        },
      });
    } else {
      loadDemoData();
      setActiveTab('analysis');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 pb-20 md:pb-0 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between relative">
          <div className="flex items-center">
            <Logo className="h-10 w-auto text-slate-900 dark:text-white" />
          </div>
          
          <nav className="hidden md:flex gap-1 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>Pulpit</button>
            <button onClick={() => setActiveTab('analysis')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'analysis' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>Analiza</button>
            <button onClick={() => setActiveTab('history')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'history' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>Historia</button>
            <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'settings' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>Ustawienia</button>
          </nav>

          <div className="flex items-center gap-1">
            <button 
               onClick={toggleTheme}
               className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
               title={theme === 'dark' ? "Tryb jasny" : "Tryb ciemny"}
            >
               {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
               onClick={() => setIsImportModalOpen(true)}
               className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
               title="Importuj dane"
            >
               <Upload size={20} />
            </button>
            <button 
               onClick={() => setIsPrivateMode(!isPrivateMode)}
               className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
               title={isPrivateMode ? "Pokaż kwoty" : "Ukryj kwoty"}
            >
               {isPrivateMode ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView onSetActiveTab={setActiveTab} onLoadDemoRequest={handleLoadDemoRequest} />
        )}

        {activeTab === 'analysis' && (
          <AnalysisView transactions={transactions} categories={categories} isPrivateMode={isPrivateMode} />
        )}

        {activeTab === 'history' && (
          <HistoryView 
             transactions={transactions} 
             categories={categories} 
             onEdit={setEditingTransaction} 
             onDelete={deleteTransaction}
             onClearAll={() => setConfirmModal({
                isOpen: true,
                title: 'Wyczyść całą historię',
                message: 'Czy na pewno chcesz usunąć wszystkie transakcje? Tej operacji nie można cofnąć.',
                action: clearTransactions
             })}
             onOpenBulkAction={() => setIsBulkModalOpen(true)}
             onOpenBulkTagAction={() => setIsBulkTagModalOpen(true)}
             onSplit={splitTransaction}
             isPrivateMode={isPrivateMode}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView 
            categories={categories} 
            transactions={transactions}
            onUpdateCategories={updateCategories}
            onDeleteCategory={deleteCategory}
            onDeleteSubcategory={deleteSubcategory}
            onOpenImport={() => setIsImportModalOpen(true)}
            onRenameTag={renameTag}
            onDeleteTag={deleteTag}
            onAddTag={addTag}
            allTags={allTags}
          />
        )}
      </main>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-2 flex justify-around z-50 pb-safe">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'dashboard' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
          <LayoutDashboard size={20} />
          <span className="text-[10px] font-medium mt-1">Pulpit</span>
        </button>
        <button onClick={() => setActiveTab('analysis')} className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'analysis' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
          <LineChart size={20} />
          <span className="text-[10px] font-medium mt-1">Analiza</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'history' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
          <History size={20} />
          <span className="text-[10px] font-medium mt-1">Historia</span>
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'settings' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
          <Settings size={20} />
          <span className="text-[10px] font-medium mt-1">Opcje</span>
        </button>
      </div>

      <ImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onImport={importData}
        onRestore={restoreBackup}
        hasExistingTransactions={transactions.length > 0}
        categories={categories}
      />

      <EditTransactionModal 
        isOpen={!!editingTransaction} 
        transaction={editingTransaction} 
        onClose={() => setEditingTransaction(null)} 
        onSave={updateTransaction}
        onDelete={deleteTransaction}
        categories={categories}
        allTags={allTags}
      />

      <BulkCategoryModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        transactions={transactions}
        categories={categories}
        onUpdate={bulkUpdateCategory}
      />

      <BulkTagModal
        isOpen={isBulkTagModalOpen}
        onClose={() => setIsBulkTagModalOpen(false)}
        transactions={transactions}
        categories={categories}
        allTags={allTags}
        onUpdate={bulkUpdateTags}
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

const App: React.FC = () => {
  return (
    <FinanceProvider>
      <AppContent />
    </FinanceProvider>
  );
};

export default App;
