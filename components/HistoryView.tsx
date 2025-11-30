import React, { useState, useMemo } from 'react';
import { Search, TrendingUp, TrendingDown, Edit2, Trash2, ListChecks, ArrowUp, ArrowDown, ArrowUpDown, Download, Scissors } from 'lucide-react';
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
  onSplit?: (originalId: string, newTransactions: Omit<Transaction, 'id'>[]) => void;
  isPrivateMode?: boolean;
}

type SortKey = 'date' | 'amount';
type SortDirection = 'asc' | 'desc';

export const HistoryView: React.FC<HistoryViewProps> = ({ transactions, categories, onEdit, onDelete, onClearAll, onOpenBulkAction, onSplit, isPrivateMode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  
  const [splittingTransaction, setSplittingTransaction] = useState<Transaction | null>(null);

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'date',
    direction: 'desc'
  });

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.amount.toString().includes(searchTerm);
      const matchesCategory = filterCategoryId === 'ALL' || t.categoryId === filterCategoryId;
      const matchesType = filterType === 'ALL' || t.type === filterType;
      
      return matchesSearch && matchesCategory && matchesType;
    });
  }, [transactions, searchTerm, filterCategoryId, filterType]);

  const sortedTransactions = useMemo(() => {
      const sorted = [...filteredTransactions];
      sorted.sort((a, b) => {
        if (sortConfig.key === 'date') {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
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

  const handleExport = () => {
    // Export Category NAMES, not IDs, for readability and portable backup
    const headers = ['btrackr_id', 'date', 'amount', 'description', 'type', 'category', 'subcategory'];
    const rows = transactions.map(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const sub = cat?.subcategories.find(s => s.id === t.subcategoryId);
      
      return [
        t.id,
        t.date,
        t.amount.toString(),
        `"${t.description.replace(/"/g, '""')}"`,
        t.type,
        `"${cat?.name || 'Inne'}"`, // Export Name
        `"${sub?.name || ''}"` // Export Sub Name
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bTrackr_Backup_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] border border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Szukaj w opisie lub kwocie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-slate-900"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg">
             <button
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterType === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
             >
                Wszystkie
             </button>
             <button
                onClick={() => setFilterType(TransactionType.INCOME)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterType === TransactionType.INCOME ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500'}`}
             >
                Przychody
             </button>
             <button
                onClick={() => setFilterType(TransactionType.EXPENSE)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterType === TransactionType.EXPENSE ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}
             >
                Wydatki
             </button>
          </div>

          <select
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all cursor-pointer text-slate-900"
          >
            <option value="ALL">Wszystkie kategorie</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          {transactions.length > 0 && (
            <>
              <div className="w-px h-8 bg-slate-200 mx-1 hidden md:block"></div>
              
              {onOpenBulkAction && (
                <button
                  onClick={onOpenBulkAction}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100"
                  title="Grupowa kategoryzacja"
                >
                  <ListChecks size={14} />
                  <span className="hidden lg:inline">Kategoryzacja</span>
                </button>
              )}

              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                title="Eksportuj (Kopia Zapasowa)"
              >
                <Download size={14} />
                <span className="hidden lg:inline">Eksportuj</span>
              </button>

              <button
                onClick={onClearAll}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                title="Wyczyść całą historię"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Transaction List / Table */}
      <div className="bg-white rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th 
                  className="px-6 py-3 font-semibold text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    Data {getSortIcon('date')}
                  </div>
                </th>
                <th className="px-6 py-3 font-semibold text-slate-500">Opis</th>
                <th className="px-6 py-3 font-semibold text-slate-500">Typ</th>
                <th className="px-6 py-3 font-semibold text-slate-500">Kategoria</th>
                <th 
                  className="px-6 py-3 font-semibold text-slate-500 text-right cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Kwota {getSortIcon('amount')}
                  </div>
                </th>
                <th className="px-2 py-3 font-semibold text-slate-500 text-center w-28">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedTransactions.length > 0 ? (
                sortedTransactions.map((t) => {
                  const catName = getCategoryName(t.categoryId, categories);
                  const color = getCategoryColor(t.categoryId, categories);
                  const subCat = categories.find(c => c.id === t.categoryId)?.subcategories.find(s => s.id === t.subcategoryId);

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {new Date(t.date).toLocaleDateString('pl-PL')}
                      </td>
                      <td 
                        className="px-6 py-4 text-slate-800 font-medium max-w-xs truncate" 
                        title={t.description} 
                      >
                        {t.description}
                      </td>
                      <td className="px-6 py-4">
                         <div className={`inline-flex p-1.5 rounded-full ${t.type === TransactionType.INCOME ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-500'}`}>
                            {t.type === TransactionType.INCOME ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                         </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <span 
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-opacity-10 whitespace-nowrap"
                            style={{ 
                              backgroundColor: `${color}20`,
                              color: color
                            }}
                          >
                            {catName}
                          </span>
                          {subCat && (
                            <span className="text-[10px] text-slate-400 pl-1">
                              › {subCat.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-right font-semibold whitespace-nowrap ${t.type === TransactionType.INCOME ? 'text-green-600' : 'text-slate-800'} ${isPrivateMode ? 'blur-[5px] select-none' : ''}`}>
                        {t.type === TransactionType.INCOME ? '+' : '-'}{CURRENCY_FORMATTER.format(t.amount)}
                      </td>
                      <td className="px-2 py-4 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onSplit && (
                             <button
                               onClick={() => setSplittingTransaction(t)}
                               className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                               title="Podziel transakcję"
                             >
                                <Scissors size={16} />
                             </button>
                          )}
                          <button 
                            onClick={() => onEdit(t)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edytuj"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => onDelete(t.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Usuń"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Brak transakcji.
                  </td>
                </tr>
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