
import React, { useState, useEffect } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { Transaction, TransactionType, CategoryItem } from '../types';
import { Button } from './Button';
import { TagInput } from './TagInput';

interface EditTransactionModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTransaction: Transaction) => void;
  onDelete: (id: string) => void;
  categories: CategoryItem[];
  allTags?: string[];
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ 
  transaction, 
  isOpen, 
  onClose, 
  onSave,
  onDelete,
  categories,
  allTags = []
}) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [categoryId, setCategoryId] = useState<string>('');
  const [subcategoryId, setSubcategoryId] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);

  const availableCategories = categories.filter(c => c.type === type);
  const currentCategory = categories.find(c => c.id === categoryId);

  useEffect(() => {
    if (transaction) {
      setDescription(transaction.description);
      setAmount(transaction.amount.toString());
      const d = new Date(transaction.date);
      const formattedDate = d.toISOString().split('T')[0];
      setDate(formattedDate);
      setType(transaction.type);
      setCategoryId(transaction.categoryId);
      setSubcategoryId(transaction.subcategoryId || '');
      setTags(transaction.tags || []);
    }
  }, [transaction]);

  useEffect(() => {
    if (!transaction || !isOpen) return;
    const isValid = availableCategories.some(c => c.id === categoryId);
    if (!isValid && availableCategories.length > 0) {
       setCategoryId(availableCategories[0].id);
       setSubcategoryId('');
    }
  }, [type, categories]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !date) return;

    onSave({
      ...transaction,
      description,
      amount: parseFloat(amount),
      type,
      categoryId,
      subcategoryId: subcategoryId || undefined,
      date: new Date(date).toISOString(),
      tags
    });
    onClose();
  };

  const handleDelete = () => {
    onDelete(transaction.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <h2 className="text-lg font-bold text-slate-800">Edytuj transakcję</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
            <button
              type="button"
              onClick={() => setType(TransactionType.EXPENSE)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                type === TransactionType.EXPENSE ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              Wydatek
            </button>
            <button
              type="button"
              onClick={() => setType(TransactionType.INCOME)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                type === TransactionType.INCOME ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              Przychód
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-slate-900"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Opis</label>
            <div className="relative">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-slate-900"
                required
              />
              {description && (
                <button
                  type="button"
                  onClick={() => setDescription('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Kwota</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-slate-900"
                  required
                />
                {amount && (
                  <button
                    type="button"
                    onClick={() => setAmount('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Kategoria</label>
                <select
                  value={categoryId}
                  onChange={(e) => {
                     setCategoryId(e.target.value);
                     setSubcategoryId('');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-slate-900"
                >
                  {availableCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {currentCategory && currentCategory.subcategories.length > 0 && (
                <div>
                   <select
                    value={subcategoryId}
                    onChange={(e) => setSubcategoryId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-slate-600"
                  >
                    <option value="">-- Podkategoria --</option>
                    {currentCategory.subcategories.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <TagInput tags={tags} onChange={setTags} existingTags={allTags} />

          <div className="flex gap-3 pt-4">
             <Button type="button" variant="danger" onClick={handleDelete} className="px-3">
              <Trash2 size={18} />
            </Button>
            <Button type="submit" className="flex-1">
              <Save size={18} /> Zapisz zmiany
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
