


import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, ChevronRight, ChevronDown, PiggyBank, Target } from 'lucide-react';
import { CategoryItem, SubcategoryItem, TransactionType, Transaction } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { TransferModal } from './TransferModal';
import { CURRENCY_FORMATTER } from '../constants';

interface SettingsViewProps {
  categories: CategoryItem[];
  transactions: Transaction[];
  onUpdateCategories: (categories: CategoryItem[]) => void;
  onDeleteCategory: (id: string, targetCategoryId?: string, targetSubcategoryId?: string) => void;
  onDeleteSubcategory: (catId: string, subId: string) => void;
  includeBalanceInSavings: boolean;
  onToggleBalanceInSavings: (val: boolean) => void;
}

// Mini-component for adding subcategories with better UX
const AddSubcategoryInput = ({ onAdd }: { onAdd: (name: string) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState('');

  const handleSave = () => {
    if (value.trim()) {
      onAdd(value.trim());
      setValue('');
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setValue('');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isEditing) {
    return (
      <button 
        onClick={() => setIsEditing(true)}
        className="text-xs text-slate-400 hover:text-indigo-600 flex items-center gap-1 py-1 px-2 rounded hover:bg-indigo-50 transition-colors w-fit"
      >
        <Plus size={14} /> Dodaj podkategorię
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 animate-fade-in w-full max-w-xs">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nazwa..."
        autoFocus
        className="flex-1 bg-white border border-indigo-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-slate-900"
      />
      <button 
        onClick={handleSave} 
        disabled={!value.trim()}
        className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
      >
        <Check size={14} />
      </button>
      <button 
        onClick={handleCancel}
        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  categories, 
  transactions,
  onUpdateCategories, 
  onDeleteCategory, 
  onDeleteSubcategory,
  includeBalanceInSavings,
  onToggleBalanceInSavings
}) => {
  const [activeTab, setActiveTab] = useState<TransactionType>(TransactionType.EXPENSE);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  
  // Editing states
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  
  // Adding states
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#64748b');

  // Deletion logic
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryItem | null>(null);

  // Confirmation Modal State (for Subcategories)
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

  const filteredCategories = categories.filter(c => c.type === activeTab);

  const handleAddCategory = () => {
    if (!newCatName) return;
    const newCategory: CategoryItem = {
      id: crypto.randomUUID(),
      name: newCatName,
      color: newCatColor,
      type: activeTab,
      isSystem: false,
      isIncludedInSavings: false,
      budgetLimit: 0,
      subcategories: [{ id: crypto.randomUUID(), name: 'Inne' }]
    };
    onUpdateCategories([...categories, newCategory]);
    setIsAddingCat(false);
    setNewCatName('');
  };

  const handleStartEdit = (cat: CategoryItem) => {
    setEditingCatId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color);
  };

  const handleSaveEdit = () => {
    onUpdateCategories(categories.map(c => 
      c.id === editingCatId ? { ...c, name: editName, color: editColor } : c
    ));
    setEditingCatId(null);
  };

  const handleToggleSavingsInclusion = (catId: string) => {
    onUpdateCategories(categories.map(c => 
      c.id === catId ? { ...c, isIncludedInSavings: !c.isIncludedInSavings } : c
    ));
  };

  const handleUpdateBudgetLimit = (catId: string, limit: string) => {
    const numLimit = limit === '' ? 0 : parseFloat(limit);
    onUpdateCategories(categories.map(c => 
      c.id === catId ? { ...c, budgetLimit: numLimit } : c
    ));
  };

  // Subcategory Logic
  const handleAddSubcategory = (catId: string, name: string) => {
    if (!name) return;
    const newSub: SubcategoryItem = { id: crypto.randomUUID(), name };
    onUpdateCategories(categories.map(c => 
      c.id === catId ? { ...c, subcategories: [...c.subcategories, newSub] } : c
    ));
  };

  const requestDeleteCategory = (category: CategoryItem) => {
    setCategoryToDelete(category);
  };

  const requestDeleteSubcategory = (catId: string, subId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Usuń podkategorię',
      message: 'Usunięcie podkategorii spowoduje przeniesienie jej transakcji do "Inne". Czy kontynuować?',
      action: () => onDeleteSubcategory(catId, subId),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Zarządzanie Kategoriami</h2>
        
        {/* Savings Rate Configuration */}
        <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
           <h3 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
             <PiggyBank size={18} /> Konfiguracja Stopy Oszczędności
           </h3>
           <p className="text-sm text-indigo-700 mb-3">
             Zaznacz poniżej kategorie wydatków, które mają być traktowane jako oszczędności/inwestycje.
           </p>
           <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="includeBalance"
                checked={includeBalanceInSavings}
                onChange={(e) => onToggleBalanceInSavings(e.target.checked)}
                className="w-4 h-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer bg-white accent-indigo-600"
                style={{ colorScheme: 'light' }}
              />
              <label htmlFor="includeBalance" className="text-sm font-medium text-indigo-900 cursor-pointer select-none">
                Wliczaj nadwyżkę finansową (Dostępne Środki) do stopy oszczędności
              </label>
           </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-lg w-full max-w-md mb-6">
          <button
            onClick={() => setActiveTab(TransactionType.EXPENSE)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === TransactionType.EXPENSE ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            Wydatki
          </button>
          <button
            onClick={() => setActiveTab(TransactionType.INCOME)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === TransactionType.INCOME ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            Przychody
          </button>
        </div>

        {/* List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCategories.map(cat => (
            <div key={cat.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="p-3 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors">
                {editingCatId === cat.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input 
                      type="color" 
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-none"
                    />
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                      autoFocus
                    />
                    <button onClick={handleSaveEdit} className="text-green-600 p-1"><Check size={18}/></button>
                    <button onClick={() => setEditingCatId(null)} className="text-slate-400 p-1"><X size={18}/></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}>
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="font-semibold text-slate-800 text-sm">{cat.name}</span>
                    <span className="text-xs text-slate-400">({cat.subcategories.length})</span>
                    {expandedCategory === cat.id ? <ChevronDown size={14} className="text-slate-400"/> : <ChevronRight size={14} className="text-slate-400"/>}
                  </div>
                )}

                {/* Edit Budget Limit (Only for Expense) */}
                {activeTab === TransactionType.EXPENSE && !editingCatId && (
                   <div className="flex items-center mr-2 relative group/limit">
                      <Target size={14} className={`mr-1 ${cat.budgetLimit && cat.budgetLimit > 0 ? 'text-indigo-500' : 'text-slate-300'}`} />
                      <input 
                        type="number"
                        placeholder="Limit"
                        value={cat.budgetLimit && cat.budgetLimit > 0 ? cat.budgetLimit : ''}
                        onChange={(e) => handleUpdateBudgetLimit(cat.id, e.target.value)}
                        className="w-16 border-b border-slate-200 focus:border-indigo-500 bg-transparent text-xs text-right focus:outline-none text-slate-700 placeholder-slate-300"
                        onClick={(e) => e.stopPropagation()}
                      />
                   </div>
                )}

                <div className="flex items-center gap-1">
                  {!editingCatId && (
                    <button onClick={() => handleStartEdit(cat)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded">
                      <Edit2 size={14} />
                    </button>
                  )}
                  {!editingCatId && (
                    <button onClick={() => requestDeleteCategory(cat)} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Savings Toggle for Expenses */}
              {activeTab === TransactionType.EXPENSE && (
                <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={!!cat.isIncludedInSavings}
                      onChange={() => handleToggleSavingsInclusion(cat.id)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer bg-white accent-emerald-600"
                      style={{ colorScheme: 'light' }}
                    />
                    <span className="text-xs text-slate-500">Wliczaj do stopy oszczędności</span>
                </div>
              )}

              {/* Subcategories */}
              {expandedCategory === cat.id && (
                <div className="bg-slate-50 p-3 border-t border-slate-100 space-y-2">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 flex justify-between px-2">
                     <span>Nazwa</span>
                     <div className="flex gap-2">
                        <span>Usuń</span>
                     </div>
                  </div>
                  {cat.subcategories.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between text-sm pl-4 pr-2 group hover:bg-slate-100 rounded py-1">
                      <span className="text-slate-600">{sub.name}</span>
                      <div className="flex items-center gap-1">
                         <button 
                            onClick={() => requestDeleteSubcategory(cat.id, sub.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                         >
                            <Trash2 size={14} />
                         </button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pl-4 pt-2">
                    <AddSubcategoryInput onAdd={(name) => handleAddSubcategory(cat.id, name)} />
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add New Category Button */}
          {isAddingCat ? (
            <div className="border border-indigo-200 rounded-xl p-3 bg-indigo-50 flex items-center gap-2 h-[58px]">
              <input 
                type="color" 
                value={newCatColor}
                onChange={(e) => setNewCatColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
              />
              <input 
                type="text" 
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Nazwa kategorii"
                className="flex-1 border border-indigo-200 rounded px-2 py-1 text-sm focus:outline-none bg-white text-slate-900"
                autoFocus
              />
              <button onClick={handleAddCategory} className="text-indigo-600 p-1 bg-white rounded shadow-sm hover:bg-indigo-100"><Check size={16}/></button>
              <button onClick={() => setIsAddingCat(false)} className="text-slate-400 p-1 hover:text-slate-600"><X size={16}/></button>
            </div>
          ) : (
            <button 
              onClick={() => setIsAddingCat(true)}
              className="border-2 border-dashed border-slate-200 rounded-xl p-3 flex items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-medium text-sm gap-2 h-[58px]"
            >
              <Plus size={16} /> Dodaj nową kategorię
            </button>
          )}
        </div>
      </div>
      
      <ConfirmModal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
        onConfirm={() => { confirmModal.action(); setConfirmModal(prev => ({ ...prev, isOpen: false })); }} 
        title={confirmModal.title} 
        message={confirmModal.message} 
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
