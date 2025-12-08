
import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, ChevronRight, ChevronDown, Target, Download, FileJson, Database, Hash, Tag, Repeat, AlertTriangle } from 'lucide-react';
import { CategoryItem, SubcategoryItem, TransactionType, Transaction, BackupData } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { TransferModal } from './TransferModal';
import { CURRENCY_FORMATTER } from '../constants';
import { Button } from './Button';
import { useFinance } from '../context/FinanceContext';

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
          <button
            onClick={() => setValue('')}
            className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5"
          >
            <X size={12} />
          </button>
        )}
      </div>
      <button 
        onClick={handleSave} 
        disabled={!value.trim()}
        className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded disabled:opacity-50"
      >
        <Check size={14} />
      </button>
      <button 
        onClick={handleCancel}
        className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
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
  onOpenImport,
  onRenameTag,
  onDeleteTag,
  onAddTag,
  allTags = []
}) => {
  const { recurringTransactions, deleteRecurringTransaction, factoryReset, isPrivateMode } = useFinance();
  
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

  // Confirmation Modal State
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

  const handleDeleteRecurringConfirm = (id: string) => {
    setConfirmModal({
        isOpen: true,
        title: 'Usuń transakcję cykliczną',
        message: 'Czy na pewno chcesz usunąć ten cykl? Historia utworzonych transakcji pozostanie bez zmian.',
        action: () => deleteRecurringTransaction(id)
    });
  };

  const handleFactoryResetConfirm = () => {
      setConfirmModal({
          isOpen: true,
          title: 'Reset do ustawień fabrycznych',
          message: 'UWAGA: Ta operacja nieodwracalnie usunie WSZYSTKIE Twoje dane (transakcje, kategorie, ustawienia). Aplikacja zostanie przywrócona do stanu początkowego. Czy na pewno chcesz kontynuować?',
          action: factoryReset
      });
  };

  const generateBackupData = (): string => {
    // Use value from context, not direct localStorage, to ensure we get the migrated state
    const backup: BackupData = {
      version: 1,
      timestamp: new Date().toISOString(),
      categories: categories,
      transactions: transactions,
      recurringTransactions: recurringTransactions,
      settings: { isPrivateMode: isPrivateMode }
    };
    return JSON.stringify(backup, null, 2);
  };

  const handleExportBackup = () => {
    const dataStr = generateBackupData();
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
      
      {/* Manual Backup Section */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 p-5 rounded-2xl shadow-sm text-white">
        <div className="flex justify-between items-center gap-4 mb-4">
           <div>
             <h2 className="text-lg font-bold flex items-center gap-2">
               <Database size={20} className="text-indigo-400" /> Kopia Lokalna (Plik)
             </h2>
             <p className="text-xs text-slate-300 mt-1">
               Tradycyjny eksport/import do pliku JSON.
             </p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {onOpenImport && (
              <Button 
                 onClick={onOpenImport} 
                 variant="secondary"
                 className="bg-white/10 !text-white border-white/20 hover:bg-white/20 py-3 px-4 flex-row justify-start items-center gap-4 h-auto group"
              >
                 <div className="p-2 bg-indigo-500/20 rounded-lg shrink-0">
                    <FileJson size={20} className="text-indigo-300 group-hover:text-indigo-200" />
                 </div>
                 <div className="text-left">
                    <span className="block font-bold text-sm text-white">Importuj Plik</span>
                    <span className="block text-[10px] font-normal text-slate-300">CSV lub JSON</span>
                 </div>
              </Button>
           )}
           
           <Button 
              onClick={handleExportBackup} 
              variant="secondary"
              className="bg-white/10 !text-white border-white/20 hover:bg-white/20 py-3 px-4 flex-row justify-start items-center gap-4 h-auto group"
           >
              <div className="p-2 bg-emerald-500/20 rounded-lg shrink-0">
                 <Download size={20} className="text-emerald-300 group-hover:text-emerald-200" />
              </div>
              <div className="text-left">
                 <span className="block font-bold text-sm text-white">Pobierz Backup</span>
                 <span className="block text-[10px] font-normal text-slate-300">Zapisz na dysku</span>
              </div>
           </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        
        {/* Zarządzanie Stałymi */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] dark:shadow-none border border-slate-100 dark:border-slate-700 w-full transition-colors">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                Zarządzanie Stałymi <span className="text-sm font-normal text-slate-400">({recurringTransactions.length})</span>
            </h2>

            {recurringTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[120px] text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-xl">
                    <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-full mb-2">
                        <Repeat size={20} className="opacity-40" />
                    </div>
                    <p className="text-sm">Brak zdefiniowanych płatności cyklicznych.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {recurringTransactions.map(rule => (
                        <div key={rule.id} className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group bg-white dark:bg-slate-800">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${rule.autoPay ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                    <Repeat size={16} />
                                </div>
                                <div>
                                    <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">{rule.description}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                        <span>{CURRENCY_FORMATTER.format(rule.amount)}</span>
                                        <span>•</span>
                                        <span>{rule.frequency === 'MONTHLY' ? 'Co miesiąc' : rule.frequency === 'WEEKLY' ? 'Co tydzień' : 'Co rok'}</span>
                                        <span>•</span>
                                        <span className={`font-medium ${rule.autoPay ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                            {rule.autoPay ? 'Automat' : 'Manual'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right hidden sm:block">
                                    <div className="text-[10px] text-slate-400 uppercase font-bold">Następna</div>
                                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300">{rule.nextDueDate}</div>
                                </div>
                                <button 
                                    onClick={() => handleDeleteRecurringConfirm(rule.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Zarządzanie Kategoriami */}
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
                          <button
                            onClick={() => setEditName('')}
                            className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5"
                          >
                            <X size={12} />
                          </button>
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
                      <button onClick={() => requestDeleteCategory(cat)} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded">
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
                              onClick={() => requestDeleteSubcategory(cat.id, sub.id)}
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
                    <button
                      onClick={() => setNewCatName('')}
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5"
                    >
                      <X size={12} />
                    </button>
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

        {/* Zarządzanie Tagami */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] dark:shadow-none border border-slate-100 dark:border-slate-700 w-full transition-colors">
           <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              Zarządzanie Tagami <span className="text-sm font-normal text-slate-400">({allTags.length})</span>
           </h2>
           
           {allTags.length === 0 && !isAddingTag ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-xl mb-4">
                 <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-full mb-3">
                    <Tag size={24} className="opacity-40" />
                 </div>
                 <p className="text-sm">Brak zdefiniowanych tagów.</p>
              </div>
           ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                 {allTags.map(tag => (
                    <div key={tag} className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group bg-white dark:bg-slate-800">
                       {editingTag === tag ? (
                           <div className="flex items-center gap-2 flex-1">
                              <span className="text-slate-400">#</span>
                              <div className="relative flex-1 min-w-0">
                                <input 
                                   type="text" 
                                   value={tagEditValue} 
                                   onChange={(e) => setTagEditValue(e.target.value)}
                                   className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none pr-6"
                                   autoFocus
                                />
                                {tagEditValue && (
                                  <button
                                    onClick={() => setTagEditValue('')}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </div>
                              <button onClick={handleSaveTag} className="text-green-600 dark:text-green-400 p-1 bg-green-50 dark:bg-green-900/30 rounded hover:bg-green-100 dark:hover:bg-green-900/50"><Check size={16}/></button>
                              <button onClick={() => setEditingTag(null)} className="text-slate-400 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><X size={16}/></button>
                           </div>
                       ) : (
                           <>
                              <div className="flex items-center gap-2 truncate">
                                 <span className="bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 px-2 py-0.5 rounded text-sm font-medium truncate">#{tag}</span>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => handleStartEditTag(tag)} className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded" title="Zmień nazwę">
                                    <Edit2 size={14} />
                                 </button>
                                 <button onClick={() => handleDeleteTagConfirm(tag)} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="Usuń tag">
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
              <div className="border border-pink-200 dark:border-pink-800 rounded-xl p-3 bg-pink-50 dark:bg-pink-900/20 flex items-center gap-2 h-[58px]">
                <div className="bg-white dark:bg-slate-800 p-1.5 rounded-lg text-pink-500 dark:text-pink-400">
                   <Hash size={16} />
                </div>
                <div className="relative flex-1">
                  <input 
                    type="text" 
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Nowy tag (np. wakacje)"
                    className="w-full border border-pink-200 dark:border-pink-800 rounded px-2 py-1 text-sm focus:outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white pr-6"
                    autoFocus
                    onKeyDown={(e) => {
                       if(e.key === 'Enter') handleAddTag();
                       if(e.key === 'Escape') setIsAddingTag(false);
                    }}
                  />
                  {newTagName && (
                    <button
                      onClick={() => setNewTagName('')}
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button onClick={handleAddTag} className="text-pink-600 dark:text-pink-400 p-1 bg-white dark:bg-slate-800 rounded shadow-sm hover:bg-pink-100 dark:hover:bg-pink-900/50"><Check size={16}/></button>
                <button onClick={() => setIsAddingTag(false)} className="text-slate-400 p-1 hover:text-slate-600 dark:hover:text-slate-300"><X size={16}/></button>
              </div>
            ) : (
              <button 
                onClick={() => setIsAddingTag(true)}
                className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:border-pink-300 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-all font-medium text-sm gap-2 h-[58px] w-full"
              >
                <Plus size={16} /> Dodaj nowy tag
              </button>
            )}
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-5 rounded-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="font-bold text-red-800 dark:text-red-400 flex items-center gap-2">
                        <AlertTriangle size={18} /> Strefa Niebezpieczna
                    </h3>
                    <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                        Działania tutaj są nieodwracalne.
                    </p>
                </div>
                <Button 
                    variant="danger" 
                    onClick={handleFactoryResetConfirm}
                    className="w-full sm:w-auto bg-white hover:bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/50"
                >
                    Resetuj aplikację
                </Button>
            </div>
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
