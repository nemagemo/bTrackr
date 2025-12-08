
import React, { useState } from 'react';
import { CategoryItem, Transaction } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { TransferModal } from './TransferModal';
import { RecurringManager } from './settings/RecurringManager';
import { CategoryManager } from './settings/CategoryManager';
import { TagManager } from './settings/TagManager';
import { DataManagement } from './settings/DataManagement';

interface SettingsViewProps {
  categories: CategoryItem[];
  transactions: Transaction[];
  onUpdateCategories: (categories: CategoryItem[]) => void;
  onDeleteCategory: (id: string, targetCategoryId?: string, targetSubcategoryId?: string) => void;
  onDeleteSubcategory: (catId: string, subId: string) => void;
  onOpenImport?: () => void;
  onRenameTag?: (oldName: string, newName: string) => void;
  onDeleteTag?: (tagName: string) => void;
  onAddTag?: (tagName: string) => void;
  allTags?: string[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  categories, 
  transactions,
  onUpdateCategories, 
  onDeleteCategory, 
  onDeleteSubcategory,
  onOpenImport,
  onRenameTag,
  onDeleteTag,
  onAddTag,
  allTags = []
}) => {
  // Modal State for Category Operations
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryItem | null>(null);
  const [confirmSubModal, setConfirmSubModal] = useState<{
    isOpen: boolean;
    catId: string;
    subId: string;
  } | null>(null);

  const handleRequestDeleteSubcategory = (catId: string, subId: string) => {
      setConfirmSubModal({ isOpen: true, catId, subId });
  };

  const handleConfirmDeleteSubcategory = () => {
      if (confirmSubModal) {
          onDeleteSubcategory(confirmSubModal.catId, confirmSubModal.subId);
          setConfirmSubModal(null);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. Import/Export & Data */}
      <DataManagement 
         onOpenImport={onOpenImport} 
         categories={categories} 
         transactions={transactions} 
      />

      <div className="flex flex-col gap-6">
        {/* 2. Recurring Transactions */}
        <RecurringManager />

        {/* 3. Categories */}
        <CategoryManager 
            categories={categories}
            onUpdateCategories={onUpdateCategories}
            onRequestDeleteCategory={setCategoryToDelete}
            onRequestDeleteSubcategory={handleRequestDeleteSubcategory}
        />

        {/* 4. Tags */}
        <TagManager 
            allTags={allTags}
            onRenameTag={onRenameTag}
            onDeleteTag={onDeleteTag}
            onAddTag={onAddTag}
        />
      </div>
      
      {/* --- Modals Handled at View Level --- */}
      
      <ConfirmModal 
        isOpen={!!confirmSubModal?.isOpen} 
        onClose={() => setConfirmSubModal(null)} 
        onConfirm={handleConfirmDeleteSubcategory} 
        title="Usuń podkategorię" 
        message='Usunięcie podkategorii spowoduje przeniesienie jej transakcji do "Inne". Czy kontynuować?' 
      />

      <TransferModal 
        isOpen={!!categoryToDelete}
        categoryToDelete={categoryToDelete}
        transactions={transactions}
        categories={categories}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={(targetCatId, targetSubId) => {
          if (categoryToDelete) {
             onDeleteCategory(categoryToDelete.id, targetCatId, targetSubId);
             setCategoryToDelete(null);
          }
        }}
      />
    </div>
  );
};
