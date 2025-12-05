
import React from 'react';
import { Trash2, TrendingDown, TrendingUp, Sparkles, Database } from 'lucide-react';
import { Transaction, TransactionType, CategoryItem } from '../types';
import { getCategoryColor, getCategoryName, CURRENCY_FORMATTER } from '../constants';
import { Button } from './Button';

interface TransactionListProps {
  transactions: Transaction[];
  categories: CategoryItem[];
  onDelete: (id: string) => void;
  isPrivateMode?: boolean;
  onLoadDemo?: () => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, categories, onDelete, isPrivateMode, onLoadDemo }) => {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[320px] p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
        <div className="mb-4 p-4 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-100 dark:border-slate-700 group-hover:scale-110 transition-transform duration-300">
          <Database size={32} className="text-indigo-400" />
        </div>
        
        <h4 className="text-slate-800 dark:text-slate-200 font-bold text-lg mb-2">Twoja historia jest pusta</h4>
        
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 max-w-[280px] leading-relaxed">
          Dodaj swoje pierwsze wydatki lub wgraj przykładowe dane, aby od razu przetestować możliwości analityczne aplikacji.
        </p>

        {onLoadDemo && (
           <Button 
             onClick={onLoadDemo} 
             className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 dark:shadow-none px-6 py-2.5 rounded-full"
           >
              <Sparkles size={18} /> Załaduj dane Demo
           </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
      {transactions.map((transaction) => {
        const categoryColor = getCategoryColor(transaction.categoryId, categories);
        const categoryName = getCategoryName(transaction.categoryId, categories);

        return (
          <div 
            key={transaction.id} 
            className="group flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center bg-opacity-10 shrink-0"
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
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                   <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{transaction.description}</p>
                   {transaction.tags && transaction.tags.map(tag => (
                      <span key={tag} className="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold hidden sm:inline-block">
                         #{tag}
                      </span>
                   ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-medium text-slate-400 dark:text-slate-500 truncate max-w-[100px]">
                    {categoryName}
                  </span>
                  <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {new Date(transaction.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4 pl-2 shrink-0">
              <span className={`font-semibold text-sm ${
                transaction.type === TransactionType.INCOME ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-white'
              }`}>
                {isPrivateMode ? '***' : `${transaction.type === TransactionType.INCOME ? '+' : '-'}${CURRENCY_FORMATTER.format(transaction.amount)}`}
              </span>
              <button 
                onClick={() => onDelete(transaction.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                title="Usuń"
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
