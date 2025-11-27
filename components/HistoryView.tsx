import React, { useState, useMemo } from 'react';
import { Search, Filter, TrendingUp, TrendingDown, Edit2, Trash2, Ban } from 'lucide-react';
import { Transaction, TransactionType, Category } from '../types';
import { CATEGORY_COLORS, CURRENCY_FORMATTER } from '../constants';

interface HistoryViewProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ transactions, onEdit, onDelete, onClearAll }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'ALL' || t.category === filterCategory;
      const matchesType = filterType === 'ALL' || t.type === filterType;
      
      return matchesSearch && matchesCategory && matchesType;
    });
  }, [transactions, searchTerm, filterCategory, filterType]);

  const sortedTransactions = useMemo(() => {
      return [...filteredTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredTransactions]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] border border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Szukaj w opisie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
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
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all cursor-pointer"
          >
            <option value="ALL">Wszystkie kategorie</option>
            {Object.values(Category).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {transactions.length > 0 && (
            <>
              <div className="w-px h-8 bg-slate-200 mx-1 hidden md:block"></div>
              <button
                onClick={onClearAll}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                title="Wyczyść całą historię"
              >
                <Trash2 size={14} />
                <span className="hidden lg:inline">Wyczyść wszystko</span>
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
                <th className="px-6 py-3 font-semibold text-slate-500">Data</th>
                <th className="px-6 py-3 font-semibold text-slate-500">Opis</th>
                <th className="px-6 py-3 font-semibold text-slate-500">Kategoria</th>
                <th className="px-6 py-3 font-semibold text-slate-500 text-right">Kwota</th>
                <th className="px-6 py-3 font-semibold text-slate-500 text-center">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedTransactions.length > 0 ? (
                sortedTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                      {new Date(t.date).toLocaleDateString('pl-PL')}
                    </td>
                    <td className="px-6 py-4 text-slate-800 font-medium max-w-xs truncate">
                      {t.description}
                    </td>
                    <td className="px-6 py-4">
                      <span 
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-opacity-10 whitespace-nowrap"
                        style={{ 
                          backgroundColor: `${CATEGORY_COLORS[t.category] || '#94a3b8'}20`,
                          color: CATEGORY_COLORS[t.category] || '#64748b'
                        }}
                      >
                        {t.category}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-semibold whitespace-nowrap ${t.type === TransactionType.INCOME ? 'text-green-600' : 'text-slate-800'}`}>
                      {t.type === TransactionType.INCOME ? '+' : '-'}{CURRENCY_FORMATTER.format(t.amount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    {transactions.length === 0 
                      ? "Brak transakcji w historii." 
                      : "Brak transakcji spełniających kryteria wyszukiwania."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};