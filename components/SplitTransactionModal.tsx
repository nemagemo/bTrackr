
import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Check, Calculator, AlertCircle, ArrowDown } from 'lucide-react';
import { Transaction, CategoryItem, TransactionType } from '../types';
import { Button } from './Button';
import { CURRENCY_FORMATTER } from '../constants';

interface SplitTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalTransaction: Transaction | null;
  categories: CategoryItem[];
  onConfirm: (originalId: string, newTransactions: Omit<Transaction, 'id'>[]) => void;
}

interface SplitRow {
  localId: string;
  description: string;
  amount: string;
  categoryId: string;
  subcategoryId: string;
}

export const SplitTransactionModal: React.FC<SplitTransactionModalProps> = ({
  isOpen,
  onClose,
  originalTransaction,
  categories,
  onConfirm
}) => {
  const [splits, setSplits] = useState<SplitRow[]>([]);

  // Initialize splits when modal opens
  useEffect(() => {
    if (isOpen && originalTransaction) {
      // Create 2 initial splits
      // Split 1: Exact copy of original (but full amount initially for easy editing)
      // Split 2: Empty/Default
      const cat1 = categories.find(c => c.id === originalTransaction.categoryId);
      
      // Default category for the second split (try to find same type)
      const defaultCat = categories.find(c => c.type === originalTransaction.type && c.id !== originalTransaction.categoryId) || categories[0];

      setSplits([
        {
          localId: crypto.randomUUID(),
          description: originalTransaction.description,
          amount: '', // Let user type, or we could put full amount
          categoryId: originalTransaction.categoryId,
          subcategoryId: originalTransaction.subcategoryId || ''
        },
        {
          localId: crypto.randomUUID(),
          description: originalTransaction.description, // Copy desc or leave blank? Copy is usually better
          amount: '',
          categoryId: defaultCat?.id || '',
          subcategoryId: ''
        }
      ]);
    }
  }, [isOpen, originalTransaction, categories]);

  const totalOriginal = originalTransaction?.amount || 0;
  
  const currentSum = useMemo(() => {
    return splits.reduce((acc, split) => acc + (parseFloat(split.amount) || 0), 0);
  }, [splits]);

  const remainder = totalOriginal - currentSum;
  // Precision fix for floating point math
  const roundedRemainder = Math.round(remainder * 100) / 100;
  const isBalanced = Math.abs(roundedRemainder) < 0.01;

  if (!isOpen || !originalTransaction) return null;

  const handleAddSplit = () => {
    // Try to find a default category
    const defaultCat = categories.find(c => c.type === originalTransaction.type) || categories[0];
    
    setSplits(prev => [
      ...prev,
      {
        localId: crypto.randomUUID(),
        description: originalTransaction.description,
        amount: roundedRemainder > 0 ? roundedRemainder.toString() : '',
        categoryId: defaultCat.id,
        subcategoryId: ''
      }
    ]);
  };

  const handleRemoveSplit = (localId: string) => {
    setSplits(prev => prev.filter(s => s.localId !== localId));
  };

  const updateSplit = (localId: string, field: keyof SplitRow, value: string) => {
    setSplits(prev => prev.map(s => {
      if (s.localId !== localId) return s;
      
      if (field === 'categoryId') {
        // Reset subcategory if category changes
        return { ...s, [field]: value, subcategoryId: '' };
      }
      return { ...s, [field]: value };
    }));
  };

  const fillRemainder = (localId: string) => {
    // Calculate remainder EXCLUDING the current row
    const otherSum = splits
      .filter(s => s.localId !== localId)
      .reduce((acc, s) => acc + (parseFloat(s.amount) || 0), 0);
    
    const newAmount = Math.max(0, Math.round((totalOriginal - otherSum) * 100) / 100);
    updateSplit(localId, 'amount', newAmount.toString());
  };

  const handleSave = () => {
    if (!isBalanced) return;

    // Convert SplitRows to Transactions
    const newTransactions: Omit<Transaction, 'id'>[] = splits.map(s => ({
      date: originalTransaction.date,
      type: originalTransaction.type, // Inherit type
      amount: parseFloat(s.amount),
      description: s.description || 'Bez opisu',
      categoryId: s.categoryId,
      subcategoryId: s.subcategoryId || undefined
    }));

    onConfirm(originalTransaction.id, newTransactions);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <div>
             <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                Rozdziel transakcję
             </h2>
             <p className="text-xs text-slate-500 mt-1">
                Oryginał: <span className="font-medium text-slate-900">{originalTransaction.description}</span> na kwotę <span className="font-bold text-indigo-600">{CURRENCY_FORMATTER.format(totalOriginal)}</span>
             </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-3">
           {splits.map((split, index) => {
             const activeCategory = categories.find(c => c.id === split.categoryId);
             const availableCategories = categories.filter(c => c.type === originalTransaction.type);

             return (
               <div key={split.localId} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-start md:items-center animate-fade-in">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-xs font-bold text-slate-500 shrink-0">
                    {index + 1}
                  </div>
                  
                  {/* Inputs */}
                  <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-12 gap-2">
                     {/* Description */}
                     <div className="md:col-span-4">
                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 block md:hidden">Opis</label>
                        <input 
                           type="text" 
                           value={split.description}
                           onChange={(e) => updateSplit(split.localId, 'description', e.target.value)}
                           className="w-full text-sm border-slate-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-indigo-500"
                           placeholder="Opis"
                        />
                     </div>

                     {/* Categories */}
                     <div className="md:col-span-3">
                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 block md:hidden">Kategoria</label>
                        <select
                           value={split.categoryId}
                           onChange={(e) => updateSplit(split.localId, 'categoryId', e.target.value)}
                           className="w-full text-sm border-slate-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 bg-white"
                        >
                           {availableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                     </div>

                     {/* Subcategories */}
                     <div className="md:col-span-3">
                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 block md:hidden">Podkategoria</label>
                         <select
                           value={split.subcategoryId}
                           onChange={(e) => updateSplit(split.localId, 'subcategoryId', e.target.value)}
                           className="w-full text-sm border-slate-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 bg-white"
                           disabled={!activeCategory || activeCategory.subcategories.length === 0}
                        >
                           <option value="">-- Podkategoria --</option>
                           {activeCategory?.subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                     </div>

                     {/* Amount */}
                     <div className="md:col-span-2 relative">
                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 block md:hidden">Kwota</label>
                        <input 
                           type="number" 
                           step="0.01"
                           value={split.amount}
                           onChange={(e) => updateSplit(split.localId, 'amount', e.target.value)}
                           className="w-full text-sm font-semibold text-right border-slate-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-indigo-500"
                           placeholder="0.00"
                        />
                        <button 
                           onClick={() => fillRemainder(split.localId)}
                           className="absolute right-0 -top-4 md:-top-3 md:-right-2 p-1 text-slate-300 hover:text-indigo-500"
                           title="Wypełnij resztą"
                        >
                           <ArrowDown size={12} />
                        </button>
                     </div>
                  </div>

                  {/* Actions */}
                  {splits.length > 2 && (
                    <button 
                      onClick={() => handleRemoveSplit(split.localId)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0"
                    >
                       <Trash2 size={16} />
                    </button>
                  )}
               </div>
             )
           })}

           <button 
             onClick={handleAddSplit}
             className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-medium text-sm flex items-center justify-center gap-2"
           >
             <Plus size={16} /> Dodaj kolejny podział
           </button>
        </div>

        {/* Footer with Calculation Logic */}
        <div className="bg-white border-t border-slate-100 p-4">
           <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-4">
              <div className="flex-1 w-full">
                 <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Suma wprowadzona</span>
                    <span className="font-medium text-slate-900">{CURRENCY_FORMATTER.format(currentSum)}</span>
                 </div>
                 <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                       className={`h-full transition-all duration-300 ${currentSum > totalOriginal ? 'bg-red-500' : 'bg-indigo-500'}`}
                       style={{ width: `${Math.min(100, (currentSum / totalOriginal) * 100)}%` }}
                    />
                 </div>
              </div>

              <div className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border w-full sm:w-auto justify-center ${
                 isBalanced 
                 ? 'bg-green-50 text-green-700 border-green-200' 
                 : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                 {isBalanced ? (
                    <>
                       <Check size={18} /> OK
                    </>
                 ) : (
                    <>
                       <AlertCircle size={18} />
                       {roundedRemainder > 0 
                          ? `Brakuje ${CURRENCY_FORMATTER.format(roundedRemainder)}` 
                          : `Nadmiar ${CURRENCY_FORMATTER.format(Math.abs(roundedRemainder))}`
                       }
                    </>
                 )}
              </div>
           </div>

           <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={onClose}>Anuluj</Button>
              <Button onClick={handleSave} disabled={!isBalanced}>
                 Podziel i Zapisz
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
};
