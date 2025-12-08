
import React, { useState } from 'react';
import { Repeat, Trash2 } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { CURRENCY_FORMATTER } from '../../constants';
import { ConfirmModal } from '../ConfirmModal';

export const RecurringManager: React.FC = () => {
  const { recurringTransactions, deleteRecurringTransaction } = useFinance();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] dark:shadow-none border border-slate-100 dark:border-slate-700 w-full transition-colors">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            Zarządzanie Stałymi Przelewami<span className="text-sm font-normal text-slate-400">({recurringTransactions.length})</span>
        </h2>

        {recurringTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[120px] text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-xl">
                <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-full mb-2">
                    <Repeat size={20} className="opacity-40" />
                </div>
                <p className="text-sm">Brak zdefiniowanych płatności cyklicznych.</p>
            </div>
        ) : (
            <div className="space-y-2">
                {recurringTransactions.map(rule => (
                    <div key={rule.id} className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group bg-white dark:bg-slate-800">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${rule.autoPay ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                <Repeat size={16} />
                            </div>
                            <div>
                                <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">{rule.description}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                    <span>{CURRENCY_FORMATTER.format(rule.amount)}</span>
                                    <span>•</span>
                                    <span>{rule.frequency === 'MONTHLY' ? 'Co miesiąc' : rule.frequency === 'WEEKLY' ? 'Co tydzień' : 'Co rok'}</span>
                                    <span>•</span>
                                    <span className={`font-medium ${rule.autoPay ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                        {rule.autoPay ? 'Automat' : 'Manual'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <div className="text-[10px] text-slate-400 uppercase font-bold">Następna</div>
                                <div className="text-xs font-medium text-slate-700 dark:text-slate-300">{rule.nextDueDate}</div>
                            </div>
                            <button 
                                onClick={() => setConfirmId(rule.id)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        <ConfirmModal 
            isOpen={!!confirmId}
            onClose={() => setConfirmId(null)}
            onConfirm={() => { if(confirmId) deleteRecurringTransaction(confirmId); setConfirmId(null); }}
            title="Usuń transakcję cykliczną"
            message="Czy na pewno chcesz usunąć ten cykl? Historia utworzonych transakcji pozostanie bez zmian."
        />
    </div>
  );
};
