
import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, ChevronRight, ChevronDown, Lock } from 'lucide-react';
import { CategoryItem, SubcategoryItem, TransactionType } from '../types';
import { Button } from './Button';

interface SettingsViewProps {
  categories: CategoryItem[];
  onUpdateCategories: (categories: CategoryItem[]) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ categories, onUpdateCategories }) => {
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
      subcategories: []
    };
    onUpdateCategories([...categories, newCategory]);
    setIsAddingCat(false);
    setNewCatName('');
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm('Czy na pewno chcesz usunąć tę kategorię? Przypisane do niej transakcje mogą stracić kategoryzację.')) {
      onUpdateCategories(categories.filter(c => c.id !== id));
    }
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

  // Subcategory Logic
  const handleAddSubcategory = (catId: string, name: string) => {
    if (!name) return;
    const newSub: SubcategoryItem = { id: crypto.randomUUID(), name };
    onUpdateCategories(categories.map(c => 
      c.id === catId ? { ...c, subcategories: [...c.subcategories, newSub] } : c
    ));
  };

  const handleDeleteSubcategory = (catId: string, subId: string) => {
    onUpdateCategories(categories.map(c => 
      c.id === catId ? { ...c, subcategories: c.subcategories.filter(s => s.id !== subId) } : c
    ));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Zarządzanie Kategoriami</h2>
        <p className="text-sm text-slate-500 mb-6">Dodawaj, edytuj i usuwaj kategorie oraz podkategorie.</p>

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

                <div className="flex items-center gap-1">
                  {!editingCatId && (
                    <button onClick={() => handleStartEdit(cat)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded">
                      <Edit2 size={14} />
                    </button>
                  )}
                  {cat.isSystem ? (
                    <div className="p-1.5 text-slate-300 cursor-help" title="Kategoria systemowa">
                      <Lock size={14} />
                    </div>
                  ) : (
                    !editingCatId && (
                      <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
                        <Trash2 size={14} />
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Subcategories */}
              {expandedCategory === cat.id && (
                <div className="bg-slate-50 p-3 border-t border-slate-100 space-y-2">
                  {cat.subcategories.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between text-sm pl-8 pr-2 group">
                      <span className="text-slate-600">{sub.name}</span>
                      <button 
                        onClick={() => handleDeleteSubcategory(cat.id, sub.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  
                  <div className="pl-8 pt-2 flex items-center gap-2">
                    <input 
                      type="text" 
                      placeholder="Nowa podkategoria..."
                      className="bg-white border border-slate-200 rounded px-2 py-1 text-xs w-full focus:ring-1 focus:ring-indigo-500 outline-none text-slate-900"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddSubcategory(cat.id, e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add New Category Button */}
          {isAddingCat ? (
            <div className="border border-indigo-200 rounded-xl p-3 bg-indigo-50 flex items-center gap-2">
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
    </div>
  );
};
