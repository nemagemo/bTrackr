
import React, { useState, useEffect } from 'react';
import { Plus, X, Database, Repeat, CalendarClock } from 'lucide-react';
import { Transaction, TransactionType, CategoryItem, Frequency } from '../types';
import { Button } from './Button';
import { TagInput } from './TagInput';
import { useFinance } from '../context/FinanceContext';

interface TransactionFormProps {
  onAdd: (transaction: Omit<Transaction, 'id'>) => void;
  categories: CategoryItem[];
  allTags?: string[]; 
  onLoadDemo?: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ onAdd, categories, allTags = [], onLoadDemo }) => {
  const { addRecurringTransaction } = useFinance();
  
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [categoryId, setCategoryId] = useState<string>('');
  const [subcategoryId, setSubcategoryId] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);

  // Recurring State
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>('MONTHLY');
  const [autoPay, setAutoPay] = useState(false); // Default to Manual

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

    const dateObj = new Date(date);
    dateObj.setHours(12, 0, 0, 0);
    const finalDate = dateObj.toISOString();
    const numAmount = parseFloat(amount);

    // 1. Add the immediate transaction
    onAdd({
      description,
      amount: numAmount,
      type,
      categoryId,
      subcategoryId: subcategoryId || undefined,
      date: finalDate,
      tags: tags
    });

    // 2. If Recurring checked, create the rule/template
    if (isRecurring) {
        // Calculate the FIRST due date for the rule (which is the NEXT occurrence)
        const nextDate = new Date(dateObj);
        if (frequency === 'WEEKLY') nextDate.setDate(nextDate.getDate() + 7);
        else if (frequency === 'MONTHLY') nextDate.setMonth(nextDate.getMonth() + 1);
        else if (frequency === 'YEARLY') nextDate.setFullYear(nextDate.getFullYear() + 1);

        addRecurringTransaction({
            description,
            amount: numAmount,
            type,
            categoryId,
            subcategoryId: subcategoryId || undefined,
            frequency,
            nextDueDate: nextDate.toISOString().split('T')[0],
            autoPay,
            tags
        });
    }

    // Reset Form
    setDescription('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setTags([]);
    setIsRecurring(false);
    setAutoPay(false);
    
    const defaultName = type === TransactionType.INCOME ? 'Wynagrodzenie' : 'Inne';
    const defaultCat = availableCategories.find(c => c.name === defaultName) || availableCategories[0];
    setCategoryId(defaultCat?.id || '');
    setSubcategoryId('');
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] dark:shadow-none border border-slate-100 dark:border-slate-700 space-y-4 relative transition-colors">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Nowa Transakcja</h3>
        {onLoadDemo && (
           <button 
             type="button" 
             onClick={onLoadDemo} 
             className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-indigo-600 bg-slate-50 dark:bg-slate-700 dark:text-slate-400 dark:hover:text-indigo-300 dark:hover:bg-slate-600 hover:bg-indigo-50 px-2 py-1 rounded-md transition-colors"
             title="Wgraj przykładowe dane"
           >
              <Database size={12} /> Wgraj demo
           </button>
        )}
      </div>
      
      <div className="flex justify-start mb-4">
          <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setType(TransactionType.EXPENSE)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                type === TransactionType.EXPENSE ? 'bg-white dark:bg-slate-600 text-red-600 dark:text-red-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Wydatek
            </button>
            <button
              type="button"
              onClick={() => setType(TransactionType.INCOME)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                type === TransactionType.INCOME ? 'bg-white dark:bg-slate-600 text-green-600 dark:text-green-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Przychód
            </button>
          </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Opis</label>
          <div className="relative flex-1">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === TransactionType.INCOME ? "np. Wypłata, Dywidenda" : "np. Zakupy w Biedronce"}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 focus:border-transparent transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
              required
            />
            {description && (
              <button
                type="button"
                onClick={() => setDescription('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 focus:border-transparent transition-all text-slate-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
              required
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Kwota (PLN)</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 focus:border-transparent transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
                required
              />
              {amount && (
                <button
                  type="button"
                  onClick={() => setAmount('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Kategoria</label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setSubcategoryId('');
              }}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 focus:border-transparent transition-all appearance-none text-slate-900 dark:text-white"
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
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 focus:border-transparent transition-all appearance-none text-slate-600 dark:text-slate-300"
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

        {/* Recurring Toggle */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
                <button
                    type="button"
                    onClick={() => setIsRecurring(!isRecurring)}
                    className={`flex items-center gap-2 text-xs font-medium transition-colors ${isRecurring ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${isRecurring ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'}`}>
                        {isRecurring && <Repeat size={10} className="text-white" />}
                    </div>
                    Powtarzaj tę transakcję
                </button>
            </div>

            {isRecurring && (
                <div className="pl-6 space-y-3 animate-fade-in">
                    <div className="flex gap-2">
                        <select 
                            value={frequency}
                            onChange={(e) => setFrequency(e.target.value as Frequency)}
                            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                        >
                            <option value="WEEKLY">Co tydzień</option>
                            <option value="MONTHLY">Co miesiąc</option>
                            <option value="YEARLY">Co rok</option>
                        </select>
                        
                        <div className="flex bg-slate-100 dark:bg-slate-700 p-0.5 rounded text-[10px]">
                            <button
                                type="button"
                                onClick={() => setAutoPay(true)}
                                className={`px-2 py-1 rounded transition-all ${autoPay ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-300 font-bold' : 'text-slate-500 dark:text-slate-400'}`}
                                title="Dodaj automatycznie w dniu płatności"
                            >
                                Automat
                            </button>
                            <button
                                type="button"
                                onClick={() => setAutoPay(false)}
                                className={`px-2 py-1 rounded transition-all ${!autoPay ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-300 font-bold' : 'text-slate-500 dark:text-slate-400'}`}
                                title="Przypomnij o zatwierdzeniu"
                            >
                                Ręcznie
                            </button>
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                        {autoPay 
                            ? "Transakcja zostanie dodana automatycznie w dniu wymagalności." 
                            : "W dniu wymagalności pojawi się powiadomienie do zatwierdzenia (idealne dla zmiennych kwot)."
                        }
                    </p>
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
