
import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, ChevronRight, ChevronDown, Target } from 'lucide-react';
import { CategoryItem, SubcategoryItem, TransactionType } from '../../types';

// Helper component
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
    if (e.key === 'Enter') handleSave();
    else if (e.key === 'Escape') handleCancel();
  };

  if (!isEditing) {
    return (
      <button 
        onClick={() => setIsEditing(true)}
        className="text-xs text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 py-1 px-2 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors w-fit"
      >
        <Plus size={14} /> Dodaj podkategorię
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 animate-fade-in w-full max-w-xs">
      <div className="relative flex-1">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nazwa..."
          autoFocus
          className="w-full bg-white dark:bg-slate-700 border border-indigo-300 dark:border-indigo-700 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white pr-6"
        />
        {value && (
          <button onClick={() => setValue('')} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5"><X size={12} /></button>
        )}
      </div>
      <button onClick={handleSave} disabled={!value.trim()} className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded disabled:opacity-50"><Check size={14} /></button>
      <button onClick={handleCancel} className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><X size={14} /></button>
    </div>
  );
};

interface CategoryManagerProps {
  categories: CategoryItem[];
  onUpdateCategories: (categories: CategoryItem[]) => void;
  onRequestDeleteCategory: (category: CategoryItem) => void;
  onRequestDeleteSubcategory: (catId: string, subId: string) => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ 
  categories, 
  onUpdateCategories, 
  onRequestDeleteCategory,
  onRequestDeleteSubcategory 
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

  const handleAddSubcategory = (catId: string, name: string) => {
    if (!name) return;
    const newSub: SubcategoryItem = { id: crypto.randomUUID(), name };
    onUpdateCategories(categories.map(c => 
      c.id === catId ? { ...c, subcategories: [...c.subcategories, newSub] } : c
    ));
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] dark:shadow-none border border-slate-100 dark:border-slate-700 w-full transition-colors">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Zarządzanie Kategoriami</h2>
      
      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg w-full mb-6">
        <button
          onClick={() => setActiveTab(TransactionType.EXPENSE)}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === TransactionType.EXPENSE ? 'bg-white dark:bg-slate-600 text-red-600 dark:text-red-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          Wydatki
        </button>
        <button
          onClick={() => setActiveTab(TransactionType.INCOME)}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === TransactionType.INCOME ? 'bg-white dark:bg-slate-600 text-green-600 dark:text-green-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          Przychody
        </button>
      </div>

      {/* List - Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredCategories.map(cat => (
          <div key={cat.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 h-fit transition-colors">
            <div className="p-3 flex items-center justify-between bg-slate-50/50 dark:bg-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              {editingCatId === cat.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input 
                    type="color" 
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-none"
                  />
                  <div className="relative flex-1">
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none pr-6"
                      autoFocus
                    />
                    {editName && (
                      <button onClick={() => setEditName('')} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5"><X size={12} /></button>
                    )}
                  </div>
                  <button onClick={handleSaveEdit} className="text-green-600 dark:text-green-400 p-1"><Check size={18}/></button>
                  <button onClick={() => setEditingCatId(null)} className="text-slate-400 dark:text-slate-500 p-1"><X size={18}/></button>
                </div>
              ) : (
                <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}>
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate max-w-[120px] sm:max-w-none">{cat.name}</span>
                  <span className="text-xs text-slate-400">({cat.subcategories.length})</span>
                  {expandedCategory === cat.id ? <ChevronDown size={14} className="text-slate-400"/> : <ChevronRight size={14} className="text-slate-400"/>}
                </div>
              )}

              {/* Edit Budget Limit (Only for Expense) */}
              {activeTab === TransactionType.EXPENSE && !editingCatId && (
                <div className="flex items-center mr-2 relative group/limit shrink-0">
                    <Target size={14} className={`mr-1 ${cat.budgetLimit && cat.budgetLimit > 0 ? 'text-indigo-500' : 'text-slate-300 dark:text-slate-600'}`} />
                    <div className="relative w-14">
                      <input 
                        type="number"
                        placeholder="Limit"
                        value={cat.budgetLimit && cat.budgetLimit > 0 ? cat.budgetLimit : ''}
                        onChange={(e) => handleUpdateBudgetLimit(cat.id, e.target.value)}
                        className="w-full border-b border-slate-200 dark:border-slate-600 focus:border-indigo-500 bg-transparent text-xs text-right focus:outline-none text-slate-700 dark:text-slate-300 placeholder-slate-300 dark:placeholder-slate-600 pr-3"
                        onClick={(e) => e.stopPropagation()}
                      />
                      {(cat.budgetLimit && cat.budgetLimit > 0) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUpdateBudgetLimit(cat.id, ''); }}
                          className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                </div>
              )}

              <div className="flex items-center gap-1 shrink-0">
                {!editingCatId && (
                  <button onClick={() => handleStartEdit(cat)} className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded">
                    <Edit2 size={14} />
                  </button>
                )}
                {!editingCatId && (
                  <button onClick={() => onRequestDeleteCategory(cat)} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
            
            {/* Savings Toggle for Expenses */}
            {activeTab === TransactionType.EXPENSE && (
              <div className="px-3 py-2 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={!!cat.isIncludedInSavings}
                    onChange={() => handleToggleSavingsInclusion(cat.id)}
                    className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer bg-white dark:bg-slate-700 accent-emerald-600"
                    style={{ colorScheme: 'light' }}
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">Wliczaj do stopy oszczędności</span>
              </div>
            )}

            {/* Subcategories */}
            {expandedCategory === cat.id && (
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
                <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-2 flex justify-between px-2">
                  <span>Nazwa</span>
                  <div className="flex gap-2">
                      <span>Usuń</span>
                  </div>
                </div>
                {cat.subcategories.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between text-sm pl-4 pr-2 group hover:bg-slate-100 dark:hover:bg-slate-800 rounded py-1 transition-colors">
                    <span className="text-slate-600 dark:text-slate-300">{sub.name}</span>
                    <div className="flex items-center gap-1">
                      <button 
                          onClick={() => onRequestDeleteSubcategory(cat.id, sub.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
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
          <div className="border border-indigo-200 dark:border-indigo-800 rounded-xl p-3 bg-indigo-50 dark:bg-indigo-900/20 flex items-center gap-2 h-[58px]">
            <input 
              type="color" 
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
            />
            <div className="relative flex-1">
              <input 
                type="text" 
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Nazwa kategorii"
                className="w-full border border-indigo-200 dark:border-indigo-700 rounded px-2 py-1 text-sm focus:outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white pr-6"
                autoFocus
              />
              {newCatName && (
                <button onClick={() => setNewCatName('')} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5"><X size={12} /></button>
              )}
            </div>
            <button onClick={handleAddCategory} className="text-indigo-600 dark:text-indigo-400 p-1 bg-white dark:bg-slate-800 rounded shadow-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/50"><Check size={16}/></button>
            <button onClick={() => setIsAddingCat(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"><X size={16}/></button>
          </div>
        ) : (
          <button 
            onClick={() => setIsAddingCat(true)}
            className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all font-medium text-sm gap-2 h-[58px] w-full"
          >
            <Plus size={16} /> Dodaj nową kategorię
          </button>
        )}
      </div>
    </div>
  );
};
