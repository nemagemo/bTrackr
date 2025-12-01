
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Wand2, Upload } from 'lucide-react';
import { Transaction, TransactionType, CategoryItem } from '../types';
import { Button } from './Button';
import { suggestCategory } from '../services/geminiService';
import { TagInput } from './TagInput';

interface TransactionFormProps {
  onAdd: (transaction: Omit<Transaction, 'id'>) => void;
  onImportClick?: () => void;
  categories: CategoryItem[];
  allTags?: string[]; // Passed from parent for autocomplete
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ onAdd, onImportClick, categories, allTags = [] }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [categoryId, setCategoryId] = useState<string>('');
  const [subcategoryId, setSubcategoryId] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const availableCategories = categories.filter(c => c.type === type);
  const currentCategory = categories.find(c => c.id === categoryId);

  useEffect(() => {
    if (availableCategories.length > 0) {
      const defaultName = type === TransactionType.INCOME ? 'Wynagrodzenie' : 'Inne';
      const defaultCat = availableCategories.find(c => c.name === defaultName) || availableCategories[0];
      setCategoryId(defaultCat.id);
      setSubcategoryId('');
    }
  }, [type, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !categoryId || !date) return;

    onAdd({
      description,
      amount: parseFloat(amount),
      type,
      categoryId,
      subcategoryId: subcategoryId || undefined,
      date: new Date(date).toISOString(),
      tags: tags
    });

    setDescription('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setTags([]);
    const defaultName = type === TransactionType.INCOME ? 'Wynagrodzenie' : 'Inne';
    const defaultCat = availableCategories.find(c => c.name === defaultName) || availableCategories[0];
    setCategoryId(defaultCat?.id || '');
    setSubcategoryId('');
  };

  const handleAiSuggest = async () => {
    if (!description) return;
    setIsSuggesting(true);
    const suggestedId = await suggestCategory(description, categories);
    if (suggestedId) {
      const cat = categories.find(c => c.id === suggestedId);
      if (cat) {
        setType(cat.type);
        setCategoryId(cat.id);
        setSubcategoryId('');
      }
    }
    setIsSuggesting(false);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] border border-slate-100 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-slate-800">Nowa Transakcja</h3>
        <div className="flex gap-2">
          {onImportClick && (
            <button
              type="button"
              onClick={onImportClick}
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              title="Importuj CSV"
            >
              <Upload size={18} />
            </button>
          )}
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
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Opis</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === TransactionType.INCOME ? "np. Wypłata, Dywidenda" : "np. Zakupy w Biedronce"}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all text-slate-900"
              required
            />
            <button
              type="button"
              onClick={handleAiSuggest}
              disabled={!description || isSuggesting}
              className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors"
              title="Sugeruj kategorię (AI)"
            >
              {isSuggesting ? <span className="animate-spin text-xs">↻</span> : <Wand2 size={18} />}
            </button>
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
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all text-slate-900"
              required
            />
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