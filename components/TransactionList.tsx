import React from 'react';
import { Trash2, TrendingDown, TrendingUp, Scissors, Edit2 } from 'lucide-react';
import { Transaction, TransactionType, CategoryItem } from '../types';
import { getCategoryColor, getCategoryName, CURRENCY_FORMATTER } from '../constants';

interface TransactionListProps {
  transactions: Transaction[];
  categories: CategoryItem[];
  onDelete: (id: string) => void;
  isPrivateMode?: boolean;
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, categories, onDelete, isPrivateMode }) => {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
          <TrendingUp size={20} className="opacity-50" />
        </div>
        <p className="text-sm font-medium">Brak transakcji</p>
        <p className="text-xs">Dodaj swoją pierwszą transakcję</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 overflow-y-auto max-h-[500px] pr-2">
      {transactions.map((transaction) => {
        const categoryColor = getCategoryColor(transaction.categoryId, categories);
        const categoryName = getCategoryName(transaction.categoryId, categories);

        return (
          <div 
            key={transaction.id} 
            className="group flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center bg-opacity-10"
                style={{ 
                  backgroundColor: transaction.type === TransactionType.INCOME 
                    ? '#dcfce7' 
                    : `${categoryColor}20`,
                  color: transaction.type === TransactionType.INCOME 
                    ? '#16a34a' 
                    : categoryColor
                }}
              >
                {transaction.type === TransactionType.INCOME ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                   <p className="text-sm font-semibold text-slate-800">{transaction.description}</p>
                   {transaction.tags && transaction.tags.map(tag => (
                      <span key={tag} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">
                         #{tag}
                      </span>
                   ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-medium text-slate-400">
                    {categoryName}
                  </span>
                  <span className="text-[10px] text-slate-300">•</span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(transaction.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className={`font-semibold text-sm ${
                transaction.type === TransactionType.INCOME ? 'text-green-600' : 'text-slate-900'
              }`}>
                {isPrivateMode ? '***' : `${transaction.type === TransactionType.INCOME ? '+' : '-'}${CURRENCY_FORMATTER.format(transaction.amount)}`}
              </span>
              <button 
                onClick={() => onDelete(transaction.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};