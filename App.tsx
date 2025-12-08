
import React, { useState } from 'react';
import { Transaction } from './types';
import { AnalysisView } from './components/AnalysisView';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { ImportModal } from './components/ImportModal';
import { EditTransactionModal } from './components/EditTransactionModal';
import { ConfirmModal } from './components/ConfirmModal';
import { BulkCategoryModal } from './components/BulkCategoryModal';
import { BulkTagModal } from './components/BulkTagModal';
import { DashboardView } from './components/DashboardView';
import { Layout, Tab } from './components/Layout';
import { FinanceProvider, useFinance } from './context/FinanceContext';

/**
 * Główny kontroler aplikacji (Controller).
 * 
 * Odpowiedzialności:
 * 1. Zarządzanie routingiem (activeTab).
 * 2. Zarządzanie globalnymi oknami modalnymi (Import, Edycja, Potwierdzenia).
 * 3. Orkiestracja przepływu danych między Contextem a Widokami.
 * 
 * Warstwa wizualna (nagłówek, nawigacja) jest wydzielona do komponentu `Layout`.
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
    <>
      <Layout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        toggleTheme={toggleTheme}
        isPrivateMode={isPrivateMode}
        togglePrivateMode={() => setIsPrivateMode(!isPrivateMode)}
        onOpenImport={() => setIsImportModalOpen(true)}
      >
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
      </Layout>

      {/* Global Modals */}
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
    </>
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
