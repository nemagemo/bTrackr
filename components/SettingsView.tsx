
import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, Check, X, ChevronRight, ChevronDown, PiggyBank, Target, Download, FileJson, Database, Hash, Tag } from 'lucide-react';
import { CategoryItem, SubcategoryItem, TransactionType, Transaction, BackupData } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { TransferModal } from './TransferModal';
import { CURRENCY_FORMATTER } from '../constants';
import { Button } from './Button';

interface SettingsViewProps {
  categories: CategoryItem[];
  transactions: Transaction[];
  onUpdateCategories: (categories: CategoryItem[]) => void;
  onDeleteCategory: (id: string, targetCategoryId?: string, targetSubcategoryId?: string) => void;
  onDeleteSubcategory: (catId: string, subId: string) => void;
  onLoadDemo?: () => void;
  onRenameTag?: (oldName: string, newName: string) => void;
  onDeleteTag?: (tagName: string) => void;
  onAddTag?: (tagName: string) => void;
  allTags?: string[];
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
  onLoadDemo,
  onRenameTag,
  onDeleteTag,
  onAddTag,
  allTags = []
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

  // Tag Editing & Adding
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [tagEditValue, setTagEditValue] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  // Deletion logic
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryItem | null>(null);

  // Confirmation Modal State (for Subcategories/Tags)
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

  // Tag Logic
  const handleStartEditTag = (tag: string) => {
     setEditingTag(tag);
     setTagEditValue(tag);
  };
  
  const handleSaveTag = () => {
     if (editingTag && tagEditValue.trim() && tagEditValue !== editingTag) {
        if (onRenameTag) onRenameTag(editingTag, tagEditValue.trim());
     }
     setEditingTag(null);
  };

  const handleAddTag = () => {
     if (newTagName.trim() && onAddTag) {
        onAddTag(newTagName.trim().replace(/^#/, ''));
        setNewTagName('');
        setIsAddingTag(false);
     }
  };

  const handleDeleteTagConfirm = (tag: string) => {
     setConfirmModal({
        isOpen: true,
        title: 'Usuń Tag',
        message: `Czy na pewno chcesz usunąć tag #${tag} ze wszystkich transakcji?`,
        action: () => { if(onDeleteTag) onDeleteTag(tag); }
     });
  };

  const handleExportBackup = () => {
    const isPrivateMode = JSON.parse(localStorage.getItem('btrackr_private_mode') || 'false');
    
    const backup: BackupData = {
      version: 1,
      timestamp: new Date().toISOString(),
      categories: categories,
      transactions: transactions,
      settings: {
        isPrivateMode: isPrivateMode
      }
    };

    const dataStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bTrackr_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Backup Section */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-2xl shadow-sm text-white flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FileJson size={20} className="text-indigo-400" /> Kopia Zapasowa i Demo
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            Zarządzaj danymi aplikacji. Eksportuj historię lub załaduj przykładowe dane.
          </p>
        </div>
        <div className="flex gap-2">
           {onLoadDemo && (
              <Button 
                 onClick={onLoadDemo} 
                 className="bg-indigo-600 hover:bg-indigo-700 text-white border-none whitespace-nowrap"
              >
                 <Database size={16} /> Załaduj Demo (2020-2025)
              </Button>
           )}
           <Button 
              onClick={handleExportBackup} 
              variant="secondary"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 whitespace-nowrap"
           >
              <Download size={16} /> Backup (JSON)
           </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Zarządzanie Kategoriami */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] border border-slate-100 w-full">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Zarządzanie Kategoriami</h2>
          
          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-lg w-full mb-6">
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
          <div className="space-y-4">
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
                className="border-2 border-dashed border-slate-200 rounded-xl p-3 flex items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-medium text-sm gap-2 h-[58px] w-full"
              >
                <Plus size={16} /> Dodaj nową kategorię
              </button>
            )}
          </div>
        </div>

        {/* Zarządzanie Tagami */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] border border-slate-100 w-full">
           <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              Zarządzanie Tagami <span className="text-sm font-normal text-slate-400">({allTags.length})</span>
           </h2>
           
           {allTags.length === 0 && !isAddingTag ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-slate-400 border-2 border-dashed border-slate-100 rounded-xl mb-4">
                 <div className="bg-slate-100 p-3 rounded-full mb-3">
                    <Tag size={24} className="opacity-40" />
                 </div>
                 <p className="text-sm">Brak zdefiniowanych tagów.</p>
              </div>
           ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                 {allTags.map(tag => (
                    <div key={tag} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors group bg-white">
                       {editingTag === tag ? (
                           <div className="flex items-center gap-2 flex-1">
                              <span className="text-slate-400">#</span>
                              <input 
                                 type="text" 
                                 value={tagEditValue} 
                                 onChange={(e) => setTagEditValue(e.target.value)}
                                 className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none min-w-0"
                                 autoFocus
                              />
                              <button onClick={handleSaveTag} className="text-green-600 p-1 bg-green-50 rounded hover:bg-green-100"><Check size={16}/></button>
                              <button onClick={() => setEditingTag(null)} className="text-slate-400 p-1 hover:bg-slate-100 rounded"><X size={16}/></button>
                           </div>
                       ) : (
                           <>
                              <div className="flex items-center gap-2 truncate">
                                 <span className="bg-pink-50 text-pink-600 px-2 py-0.5 rounded text-sm font-medium truncate">#{tag}</span>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => handleStartEditTag(tag)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Zmień nazwę">
                                    <Edit2 size={14} />
                                 </button>
                                 <button onClick={() => handleDeleteTagConfirm(tag)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Usuń tag">
                                    <Trash2 size={14} />
                                 </button>
                              </div>
                           </>
                       )}
                    </div>
                 ))}
              </div>
           )}

           {/* Add New Tag Button */}
           {isAddingTag ? (
              <div className="border border-pink-200 rounded-xl p-3 bg-pink-50 flex items-center gap-2 h-[58px]">
                <div className="bg-white p-1.5 rounded-lg text-pink-500">
                   <Hash size={16} />
                </div>
                <input 
                  type="text" 
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Nowy tag (np. wakacje)"
                  className="flex-1 border border-pink-200 rounded px-2 py-1 text-sm focus:outline-none bg-white text-slate-900"
                  autoFocus
                  onKeyDown={(e) => {
                     if(e.key === 'Enter') handleAddTag();
                     if(e.key === 'Escape') setIsAddingTag(false);
                  }}
                />
                <button onClick={handleAddTag} className="text-pink-600 p-1 bg-white rounded shadow-sm hover:bg-pink-100"><Check size={16}/></button>
                <button onClick={() => setIsAddingTag(false)} className="text-slate-400 p-1 hover:text-slate-600"><X size={16}/></button>
              </div>
            ) : (
              <button 
                onClick={() => setIsAddingTag(true)}
                className="border-2 border-dashed border-slate-200 rounded-xl p-3 flex items-center justify-center text-slate-400 hover:border-pink-300 hover:text-pink-600 hover:bg-pink-50 transition-all font-medium text-sm gap-2 h-[58px] w-full"
              >
                <Plus size={16} /> Dodaj nowy tag
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
