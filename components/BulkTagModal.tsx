
import React, { useState, useMemo } from 'react';
import { X, Search, Check, Hash, Tag } from 'lucide-react';
import { Transaction, TransactionType, CategoryItem } from '../types';
import { Button } from './Button';
import { TagInput } from './TagInput';
import { CURRENCY_FORMATTER, getCategoryColor, getCategoryName } from '../constants';

interface BulkTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  categories: CategoryItem[];
  allTags: string[];
  onUpdate: (ids: string[], tags: string[], mode: 'ADD' | 'REPLACE') => void;
}

export const BulkTagModal: React.FC<BulkTagModalProps> = ({
  isOpen,
  onClose,
  transactions,
  categories,
  allTags,
  onUpdate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tagsToApply, setTagsToApply] = useState<string[]>([]);
  const [mode, setMode] = useState<'ADD' | 'REPLACE'>('ADD');
  const [activeType, setActiveType] = useState<TransactionType>(TransactionType.EXPENSE);

  const filteredTransactions = useMemo(() => {
    if (!searchTerm) return [];
    const lowerTerm = searchTerm.toLowerCase();
    return transactions
      .filter(t => t.type === activeType)
      .filter(t => 
        t.description.toLowerCase().includes(lowerTerm) ||
        t.amount.toString().includes(lowerTerm) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(lowerTerm)))
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, activeType]);

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAllVisible = () => {
    const newSelected = new Set(selectedIds);
    const allVisibleSelected = filteredTransactions.length > 0 && filteredTransactions.every(t => selectedIds.has(t.id));

    if (allVisibleSelected) {
      filteredTransactions.forEach(t => newSelected.delete(t.id));
    } else {
      filteredTransactions.forEach(t => newSelected.add(t.id));
    }
    setSelectedIds(newSelected);
  };

  const handleApply = () => {
    if (selectedIds.size === 0) return;
    onUpdate(Array.from(selectedIds), tagsToApply, mode);
    setSelectedIds(new Set());
    setTagsToApply([]);
  };

  const isAllVisibleSelected = filteredTransactions.length > 0 && filteredTransactions.every(t => selectedIds.has(t.id));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden transition-colors">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800">
          <div className="flex items-center gap-2">
            <div className="bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 p-2 rounded-lg">
              <Hash size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Grupowe Tagowanie</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Wyszukaj transakcje i zarządzaj tagami masowo</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 space-y-3">
          <div className="flex bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-600 w-fit">
            <button
              onClick={() => setActiveType(TransactionType.EXPENSE)}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeType === TransactionType.EXPENSE ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              Wydatki
            </button>
            <button
              onClick={() => setActiveType(TransactionType.INCOME)}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeType === TransactionType.INCOME ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              Przychody
            </button>
          </div>
          
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Wpisz frazę lub tag...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all shadow-sm text-slate-900 dark:text-white"
              autoFocus
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-800">
          {filteredTransactions.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">
                    <input 
                      type="checkbox" 
                      checked={isAllVisibleSelected}
                      onChange={handleSelectAllVisible}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-pink-600 focus:ring-pink-500 cursor-pointer bg-white dark:bg-slate-800 accent-pink-600"
                      style={{ colorScheme: 'light' }}
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Opis</th>
                  <th className="px-4 py-3 font-semibold">Tagi</th>
                  <th className="px-4 py-3 font-semibold text-right">Kwota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredTransactions.map((t) => {
                  const catColor = getCategoryColor(t.categoryId, categories);
                  return (
                    <tr key={t.id} className={`transition-colors ${selectedIds.has(t.id) ? 'bg-pink-50/50 dark:bg-pink-900/30 hover:bg-pink-50 dark:hover:bg-pink-900/40' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                      <td className="px-4 py-3 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.has(t.id)}
                          onChange={() => handleToggleSelect(t.id)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-pink-600 focus:ring-pink-500 cursor-pointer bg-white dark:bg-slate-800 accent-pink-600"
                          style={{ colorScheme: 'light' }}
                        />
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(t.date).toLocaleDateString('pl-PL')}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                        {t.description}
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5" style={{ color: catColor }}>
                           {getCategoryName(t.categoryId, categories)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                           {t.tags && t.tags.length > 0 ? t.tags.map(tag => (
                               <span key={tag} className="text-[9px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">#{tag}</span>
                           )) : <span className="text-slate-300 dark:text-slate-600 text-xs">-</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                        {CURRENCY_FORMATTER.format(t.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 p-8">
               <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-full mb-3">
                 <Tag size={24} className="opacity-50" />
               </div>
               <p>Wpisz frazę powyżej, aby znaleźć transakcje.</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col gap-4 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center text-sm">
             <span className="font-medium text-slate-600 dark:text-slate-400">Zaznaczono: <span className="text-pink-600 dark:text-pink-400 font-bold">{selectedIds.size}</span></span>
             
             <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                <button
                    onClick={() => setMode('ADD')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        mode === 'ADD' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
                    }`}
                >
                    Dodaj
                </button>
                <button
                    onClick={() => setMode('REPLACE')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        mode === 'REPLACE' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
                    }`}
                >
                    Zastąp
                </button>
             </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
             <div className="w-full sm:flex-1 relative">
                 <TagInput tags={tagsToApply} onChange={setTagsToApply} existingTags={allTags} direction="up" />
             </div>
             <Button 
               onClick={handleApply} 
               disabled={selectedIds.size === 0 || tagsToApply.length === 0}
               className="w-full sm:w-auto"
             >
               <Check size={16} /> Zastosuj
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
