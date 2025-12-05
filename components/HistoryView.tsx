
import React, { useState, useMemo } from 'react';
import { Search, TrendingUp, TrendingDown, Edit2, Trash2, ListChecks, ArrowUp, ArrowDown, ArrowUpDown, Scissors, Hash, X } from 'lucide-react';
import { Transaction, TransactionType, CategoryItem } from '../types';
import { CURRENCY_FORMATTER, getCategoryColor, getCategoryName } from '../constants';
import { SplitTransactionModal } from './SplitTransactionModal';

interface HistoryViewProps {
  transactions: Transaction[];
  categories: CategoryItem[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onOpenBulkAction?: () => void;
  onOpenBulkTagAction?: () => void;
  onSplit?: (originalId: string, newTransactions: Omit<Transaction, 'id'>[]) => void;
  isPrivateMode?: boolean;
}

type SortKey = 'date' | 'amount';
type SortDirection = 'asc' | 'desc';

/**
 * Komponent wyświetlający pełną listę transakcji z filtrami i sortowaniem.
 */
export const HistoryView: React.FC<HistoryViewProps> = ({ transactions, categories, onEdit, onDelete, onClearAll, onOpenBulkAction, onOpenBulkTagAction, onSplit, isPrivateMode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterTag, setFilterTag] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
  const [splittingTransaction, setSplittingTransaction] = useState<Transaction | null>(null);

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'date',
    direction: 'desc'
  });

  const availableTags = useMemo(() => {
     const tags = new Set<string>();
     transactions.forEach(t => t.tags?.forEach(tag => tags.add(tag)));
     return Array.from(tags).sort();
  }, [transactions]);

  /**
   * Logika filtrowania.
   */
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    return transactions.filter(t => {
      // 2. Search Filter
      let matchesSearch = true;
      if (searchTerm && searchTerm.trim() !== '') {
        const lowerTerm = searchTerm.toLowerCase();
        const inDesc = t.description.toLowerCase().includes(lowerTerm);
        const inAmount = t.amount !== undefined && t.amount.toString().includes(searchTerm);
        const inTags = t.tags && Array.isArray(t.tags) ? t.tags.some(tag => tag.toLowerCase().includes(lowerTerm)) : false;
        
        matchesSearch = inDesc || inAmount || inTags;
      }

      // 3. Category Filter
      const matchesCategory = filterCategoryId === 'ALL' || t.categoryId === filterCategoryId;

      // 4. Type Filter
      const matchesType = filterType === 'ALL' || t.type === filterType;

      // 5. Tag Filter
      const matchesTag = filterTag === 'ALL' || (t.tags && t.tags.includes(filterTag));

      // 6. Date Range Filter
      let matchesDate = true;
      if (dateFrom) {
         matchesDate = matchesDate && new Date(t.date) >= new Date(dateFrom);
      }
      if (dateTo) {
         matchesDate = matchesDate && new Date(t.date) <= new Date(dateTo + 'T23:59:59');
      }
      
      return matchesSearch && matchesCategory && matchesType && matchesTag && matchesDate;
    });
  }, [transactions, searchTerm, filterCategoryId, filterType, filterTag, dateFrom, dateTo]);

  const sortedTransactions = useMemo(() => {
      const sorted = [...filteredTransactions];
      sorted.sort((a, b) => {
        if (sortConfig.key === 'date') {
          const dateA = new Date(a.date).getTime() || 0;
          const dateB = new Date(b.date).getTime() || 0;
          return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        } else {
          return sortConfig.direction === 'asc' 
            ? a.amount - b.amount 
            : b.amount - a.amount;
        }
      });
      return sorted;
  }, [filteredTransactions, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} className="opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] dark:shadow-none border border-slate-100 dark:border-slate-700 flex flex-col xl:flex-row gap-4 justify-between items-center transition-colors">
        {/* Search Input - Left Aligned */}
        <div className="relative w-full xl:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Szukaj, np. #wakacje"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters and Actions - Right Aligned */}
        <div className="flex flex-wrap gap-2 w-full xl:flex-1 xl:justify-end items-center">
           {/* Date Range Filters */}
           <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-1 rounded-lg border border-slate-100 dark:border-slate-700">
              <input 
                type="date" 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)} 
                className="bg-transparent text-xs text-slate-600 dark:text-slate-300 focus:outline-none px-2 py-1 w-28 cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
                title="Data od"
              />
              <span className="text-slate-300 dark:text-slate-600">-</span>
              <input 
                type="date" 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)} 
                className="bg-transparent text-xs text-slate-600 dark:text-slate-300 focus:outline-none px-2 py-1 w-28 cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
                title="Data do"
              />
           </div>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-1 rounded-lg">
             <button onClick={() => setFilterType('ALL')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterType === 'ALL' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Wszystkie</button>
             <button onClick={() => setFilterType(TransactionType.INCOME)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterType === TransactionType.INCOME ? 'bg-white dark:bg-slate-700 text-green-600 dark:text-green-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Przychody</button>
             <button onClick={() => setFilterType(TransactionType.EXPENSE)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterType === TransactionType.EXPENSE ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Wydatki</button>
          </div>

          <select value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 transition-all cursor-pointer text-slate-900 dark:text-white">
            <option value="ALL">Wszystkie kategorie</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>

          {availableTags.length > 0 && (
             <div className="relative group">
                <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)} className="pl-8 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 transition-all cursor-pointer text-slate-900 dark:text-white min-w-[120px]">
                   <option value="ALL">Tagi (Wszystkie)</option>
                   {availableTags.map(tag => <option key={tag} value={tag}>#{tag}</option>)}
                </select>
             </div>
          )}

          {transactions.length > 0 && (
            <div className="flex items-center gap-2">
              {onOpenBulkTagAction && (
                <button onClick={onOpenBulkTagAction} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/30 hover:bg-pink-100 dark:hover:bg-pink-900/50 rounded-lg transition-colors border border-pink-200 dark:border-pink-800 shadow-sm" title="Grupowe Tagowanie">
                  <Hash size={16} /> <span className="hidden sm:inline">Tagi</span>
                </button>
              )}
              {onOpenBulkAction && (
                <button onClick={onOpenBulkAction} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-colors border border-indigo-200 dark:border-indigo-800 shadow-sm" title="Grupowa kategoryzacja">
                  <ListChecks size={16} /> <span className="hidden sm:inline">Kategorie</span>
                </button>
              )}
              <button onClick={onClearAll} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors border border-red-200 dark:border-red-800 shadow-sm" title="Wyczyść Historię">
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors select-none" onClick={() => handleSort('date')}>
                  <div className="flex items-center gap-1">Data {getSortIcon('date')}</div>
                </th>
                <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Opis</th>
                <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Typ</th>
                <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Kategoria</th>
                <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors select-none" onClick={() => handleSort('amount')}>
                  <div className="flex items-center justify-end gap-1">Kwota {getSortIcon('amount')}</div>
                </th>
                <th className="px-2 py-3 font-semibold text-slate-500 dark:text-slate-400 text-center w-28">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {sortedTransactions.length > 0 ? (
                sortedTransactions.map((t) => {
                  const catName = getCategoryName(t.categoryId, categories);
                  const color = getCategoryColor(t.categoryId, categories);
                  const subCat = categories.find(c => c.id === t.categoryId)?.subcategories.find(s => s.id === t.subcategoryId);

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group">
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(t.date).toLocaleDateString('pl-PL')}
                      </td>
                      <td className="px-6 py-4">
                         <div className="font-medium text-slate-800 dark:text-slate-200 max-w-xs truncate" title={t.description}>{t.description}</div>
                         {t.tags && t.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                               {t.tags.map(tag => (
                                  <span key={tag} className="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold border border-slate-200 dark:border-slate-600">#{tag}</span>
                               ))}
                            </div>
                         )}
                      </td>
                      <td className="px-6 py-4">
                         <div className={`inline-flex p-1.5 rounded-full ${t.type === TransactionType.INCOME ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400'}`}>
                            {t.type === TransactionType.INCOME ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                         </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-opacity-10 whitespace-nowrap" style={{ backgroundColor: `${color}20`, color: color }}>
                            {catName}
                          </span>
                          {subCat && <span className="text-[10px] text-slate-400 dark:text-slate-500 pl-1">› {subCat.name}</span>}
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-right font-semibold whitespace-nowrap ${t.type === TransactionType.INCOME ? 'text-green-600 dark:text-green-400' : 'text-slate-800 dark:text-slate-200'} ${isPrivateMode ? 'blur-[5px] select-none' : ''}`}>
                        {t.type === TransactionType.INCOME ? '+' : '-'}{CURRENCY_FORMATTER.format(t.amount)}
                      </td>
                      <td className="px-2 py-4 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onSplit && <button onClick={() => setSplittingTransaction(t)} className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-colors" title="Podziel"><Scissors size={16} /></button>}
                          <button onClick={() => onEdit(t)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" title="Edytuj"><Edit2 size={16} /></button>
                          <button onClick={() => onDelete(t.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Usuń"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">Brak transakcji spełniających kryteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SplitTransactionModal 
        isOpen={!!splittingTransaction}
        originalTransaction={splittingTransaction}
        onClose={() => setSplittingTransaction(null)}
        categories={categories}
        onConfirm={onSplit || (() => {})}
      />
    </div>
  );
};
