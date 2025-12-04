
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-2">
            <div className="bg-pink-50 text-pink-600 p-2 rounded-lg">
              <Hash size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Grupowe Tagowanie</h2>
              <p className="text-xs text-slate-400">Wyszukaj transakcje i zarządzaj tagami masowo</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-3">
          <div className="flex bg-white p-1 rounded-lg border border-slate-200 w-fit">
            <button
              onClick={() => setActiveType(TransactionType.EXPENSE)}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeType === TransactionType.EXPENSE ? 'bg-red-50 text-red-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Wydatki
            </button>
            <button
              onClick={() => setActiveType(TransactionType.INCOME)}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeType === TransactionType.INCOME ? 'bg-green-50 text-green-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
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
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all shadow-sm text-slate-900"
              autoFocus
            />
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto">
          {filteredTransactions.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">
                    <input 
                      type="checkbox" 
                      checked={isAllVisibleSelected}
                      onChange={handleSelectAllVisible}
                      className="w-4 h-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500 cursor-pointer bg-white accent-pink-600"
                      style={{ colorScheme: 'light' }}
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Opis</th>
                  <th className="px-4 py-3 font-semibold">Tagi</th>
                  <th className="px-4 py-3 font-semibold text-right">Kwota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((t) => {
                  const catColor = getCategoryColor(t.categoryId, categories);
                  return (
                    <tr key={t.id} className={`transition-colors ${selectedIds.has(t.id) ? 'bg-pink-50/50 hover:bg-pink-50' : 'hover:bg-slate-50'}`}>
                      <td className="px-4 py-3 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.has(t.id)}
                          onChange={() => handleToggleSelect(t.id)}
                          className="w-4 h-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500 cursor-pointer bg-white accent-pink-600"
                          style={{ colorScheme: 'light' }}
                        />
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(t.date).toLocaleDateString('pl-PL')}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {t.description}
                        <div className="text-[10px] text-slate-400 mt-0.5" style={{ color: catColor }}>
                           {getCategoryName(t.categoryId, categories)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                           {t.tags && t.tags.length > 0 ? t.tags.map(tag => (
                               <span key={tag} className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">#{tag}</span>
                           )) : <span className="text-slate-300 text-xs">-</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {CURRENCY_FORMATTER.format(t.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
               <div className="bg-slate-100 p-3 rounded-full mb-3">
                 <Tag size={24} className="opacity-50" />
               </div>
               <p>Wpisz frazę powyżej, aby znaleźć transakcje.</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-col gap-4 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center text-sm">
             <span className="font-medium text-slate-600">Zaznaczono: <span className="text-pink-600 font-bold">{selectedIds.size}</span></span>
             
             <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                    onClick={() => setMode('ADD')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        mode === 'ADD' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                >
                    Dodaj
                </button>
                <button
                    onClick={() => setMode('REPLACE')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        mode === 'REPLACE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
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
               disabled={selectedIds.size === 0}
               className="w-full sm:w-auto mb-[1px]" // align with input
             >
               <Check size={16} /> Zastosuj
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
