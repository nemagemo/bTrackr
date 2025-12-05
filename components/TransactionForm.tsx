import React, { useState, useEffect } from 'react';
import { Plus, X, Database } from 'lucide-react';
import { Transaction, TransactionType, CategoryItem } from '../types';
import { Button } from './Button';
import { TagInput } from './TagInput';

interface TransactionFormProps {
  onAdd: (transaction: Omit<Transaction, 'id'>) => void;
  categories: CategoryItem[];
  allTags?: string[]; // Passed from parent for autocomplete
  onLoadDemo?: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ onAdd, categories, allTags = [], onLoadDemo }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  // Data inicjalizowana jako YYYY-MM-DD
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [categoryId, setCategoryId] = useState<string>('');
  const [subcategoryId, setSubcategoryId] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);

  const availableCategories = categories.filter(c => c.type === type);
  const currentCategory = categories.find(c => c.id === categoryId);

  useEffect(() => {
    if (availableCategories.length > 0) {
      // Logic to set default category when type switches
      const defaultName = type === TransactionType.INCOME ? 'Wynagrodzenie' : 'Inne';
      const defaultCat = availableCategories.find(c => c.name === defaultName) || availableCategories[0];
      setCategoryId(defaultCat.id);
      setSubcategoryId('');
    }
  }, [type, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !categoryId || !date) return;

    // FIX TIMEZONE: Ustawiamy godzinę na 12:00:00 (Południe).
    // Domyślne new Date(date) ustawia 00:00 UTC. W strefie GMT+1 to jest 23:00 poprzedniego dnia.
    // Ustawienie godziny 12:00 jest bezpieczne dla większości stref czasowych.
    const dateObj = new Date(date);
    dateObj.setHours(12, 0, 0, 0);
    const finalDate = dateObj.toISOString();

    onAdd({
      description,
      amount: parseFloat(amount),
      type,
      categoryId,
      subcategoryId: subcategoryId || undefined,
      date: finalDate,
      tags: tags
    });

    setDescription('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setTags([]);
    
    // Reset category to default for the current type
    const defaultName = type === TransactionType.INCOME ? 'Wynagrodzenie' : 'Inne';
    const defaultCat = availableCategories.find(c => c.name === defaultName) || availableCategories[0];
    setCategoryId(defaultCat?.id || '');
    setSubcategoryId('');
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] border border-slate-100 space-y-4 relative">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-slate-800">Nowa Transakcja</h3>
        {onLoadDemo && (
           <button 
             type="button" 
             onClick={onLoadDemo} 
             className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 px-2 py-1 rounded-md transition-colors"
             title="Wgraj przykładowe dane"
           >
              <Database size={12} /> Wgraj demo
           </button>
        )}
      </div>
      
      <div className="flex justify-start mb-4">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setType(TransactionType.EXPENSE)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                type === TransactionType.EXPENSE ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              Wydatek
            </button>
            <button
              type="button"
              onClick={() => setType(TransactionType.INCOME)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                type === TransactionType.INCOME ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              Przychód
            </button>
          </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Opis</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={type === TransactionType.INCOME ? "np. Wypłata, Dywidenda" : "np. Zakupy w Biedronce"}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all text-slate-900"
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
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all text-slate-900"
              required
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Kwota (PLN)</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all text-slate-900"
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
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all appearance-none text-slate-900"
            >
              {availableCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {currentCategory && currentCategory.subcategories.length > 0 && (
            <div className="animate-fade-in">
                <select
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all appearance-none text-slate-600"
              >
                <option value="">-- Podkategoria --</option>
                {currentCategory.subcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <TagInput tags={tags} onChange={setTags} existingTags={allTags} />

        <Button type="submit" className="w-full mt-2">
          <Plus size={16} /> Dodaj
        </Button>
      </form>
    </div>
  );
};