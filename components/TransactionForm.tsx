import React, { useState } from 'react';
import { Plus, Wand2, Upload } from 'lucide-react';
import { Category, Transaction, TransactionType } from '../types';
import { Button } from './Button';
import { suggestCategory } from '../services/geminiService';

interface TransactionFormProps {
  onAdd: (transaction: Omit<Transaction, 'id'>) => void;
  onImportClick?: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ onAdd, onImportClick }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [category, setCategory] = useState<string>(Category.OTHER);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    onAdd({
      description,
      amount: parseFloat(amount),
      type,
      category: type === TransactionType.INCOME ? Category.SALARY : category,
      date: new Date().toISOString(),
    });

    setDescription('');
    setAmount('');
    setCategory(Category.OTHER);
  };

  const handleAiSuggest = async () => {
    if (!description) return;
    setIsSuggesting(true);
    const suggestion = await suggestCategory(description);
    if (suggestion) {
      setCategory(suggestion);
      setType(TransactionType.EXPENSE); // Usually categorized items are expenses
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
              placeholder="np. Zakupy w Biedronce"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Kwota (PLN)</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              required
            />
          </div>
          
          {type === TransactionType.EXPENSE && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Kategoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all appearance-none"
              >
                {Object.values(Category).filter(c => c !== Category.SALARY).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <Button type="submit" className="w-full mt-2">
          <Plus size={16} /> Dodaj
        </Button>
      </form>
    </div>
  );
};