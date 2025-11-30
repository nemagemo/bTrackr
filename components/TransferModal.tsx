
import React, { useState, useMemo, useEffect } from 'react';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import { CategoryItem, Transaction, TransactionType } from '../types';
import { Button } from './Button';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToDelete: CategoryItem | null;
  transactions: Transaction[];
  categories: CategoryItem[];
  onConfirm: (targetCategoryId?: string, targetSubcategoryId?: string) => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  categoryToDelete,
  transactions,
  categories,
  onConfirm
}) => {
  const [targetCategoryId, setTargetCategoryId] = useState<string>('');
  const [targetSubcategoryId, setTargetSubcategoryId] = useState<string>('');

  // Count affected transactions
  const affectedCount = useMemo(() => {
    if (!categoryToDelete) return 0;
    return transactions.filter(t => t.categoryId === categoryToDelete.id).length;
  }, [categoryToDelete, transactions]);

  // Available target categories (same type, excluding self)
  const availableCategories = useMemo(() => {
    if (!categoryToDelete) return [];
    return categories.filter(c => c.type === categoryToDelete.type && c.id !== categoryToDelete.id);
  }, [categoryToDelete, categories]);

  const selectedTargetCategory = categories.find(c => c.id === targetCategoryId);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTargetCategoryId('');
      setTargetSubcategoryId('');
    }
  }, [isOpen]);

  if (!isOpen || !categoryToDelete) return null;

  const handleConfirm = () => {
    if (targetCategoryId) {
      onConfirm(targetCategoryId, targetSubcategoryId || undefined);
    } else {
      // No target selected -> Default behavior (Inne)
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <h2 className="text-lg font-bold text-slate-800">Usuwanie kategorii</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex gap-3 items-start">
            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm text-red-800 font-medium">
                Zamierzasz usunąć kategorię <span className="font-bold">"{categoryToDelete.name}"</span>.
              </p>
              {affectedCount > 0 ? (
                <p className="text-xs text-red-600 mt-1">
                  Ta kategoria zawiera <strong>{affectedCount}</strong> transakcji.
                </p>
              ) : (
                <p className="text-xs text-red-600 mt-1">
                  Ta kategoria jest pusta.
                </p>
              )}
            </div>
          </div>

          {affectedCount > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Gdzie chcesz przenieść te transakcje?
              </p>
              
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-500">Nowa kategoria</label>
                <select
                  value={targetCategoryId}
                  onChange={(e) => {
                    setTargetCategoryId(e.target.value);
                    setTargetSubcategoryId('');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900"
                >
                  <option value="">Domyślnie ("Inne")</option>
                  {availableCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {selectedTargetCategory && selectedTargetCategory.subcategories.length > 0 && (
                <div className="space-y-2 animate-fade-in">
                  <label className="block text-xs font-medium text-slate-500">Nowa podkategoria</label>
                  <select
                    value={targetSubcategoryId}
                    onChange={(e) => setTargetSubcategoryId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900"
                  >
                    <option value="">Domyślnie ("Inne")</option>
                    {selectedTargetCategory.subcategories.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {!targetCategoryId && (
                 <p className="text-xs text-slate-400 italic">
                    Jeśli nie wybierzesz kategorii, transakcje trafią do kategorii "Inne".
                 </p>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>Anuluj</Button>
          <Button variant="danger" onClick={handleConfirm}>
            {targetCategoryId ? 'Przenieś i Usuń' : 'Usuń'}
          </Button>
        </div>
      </div>
    </div>
  );
};
