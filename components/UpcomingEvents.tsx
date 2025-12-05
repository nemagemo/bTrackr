
import React, { useMemo } from 'react';
import { CalendarClock, Check, X, RefreshCw, AlertCircle } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { CURRENCY_FORMATTER } from '../constants';

export const UpcomingEvents: React.FC = () => {
  const { recurringTransactions, processRecurringTransaction, skipRecurringTransaction } = useFinance();

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // 1. Manual Approvals (Due or Overdue)
  const manualApprovals = useMemo(() => {
    return recurringTransactions
      .filter(r => !r.autoPay && r.nextDueDate <= todayStr)
      .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
  }, [recurringTransactions, todayStr]);

  // 2. Upcoming Auto (Next 7 days)
  const upcomingAuto = useMemo(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    return recurringTransactions
      .filter(r => r.autoPay && r.nextDueDate > todayStr && r.nextDueDate <= nextWeekStr)
      .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
  }, [recurringTransactions, todayStr]);

  if (manualApprovals.length === 0 && upcomingAuto.length === 0) return null;

  return (
    <div className="space-y-4 mb-6 animate-fade-in">
        
        {/* Manual Approvals Section */}
        {manualApprovals.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <AlertCircle size={18} className="text-amber-600 dark:text-amber-400" />
                    <h4 className="font-bold text-amber-800 dark:text-amber-300 text-sm">Do zatwierdzenia ({manualApprovals.length})</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {manualApprovals.map(item => (
                        <div key={item.id} className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm flex flex-col gap-2 border border-amber-100 dark:border-slate-700">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-xs text-amber-600 dark:text-amber-400 font-bold mb-0.5">
                                        {item.nextDueDate === todayStr ? 'Dzisiaj' : `Zaległe: ${item.nextDueDate}`}
                                    </div>
                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.description}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        Oczekiwana: {CURRENCY_FORMATTER.format(item.amount)}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-1">
                                <button 
                                    onClick={() => processRecurringTransaction(item.id)}
                                    className="flex-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-bold py-1.5 rounded flex items-center justify-center gap-1 transition-colors"
                                >
                                    <Check size={14} /> Zatwierdź
                                </button>
                                <button 
                                    onClick={() => skipRecurringTransaction(item.id)}
                                    className="px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 rounded flex items-center justify-center transition-colors"
                                    title="Pomiń w tym miesiącu"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Upcoming Auto Section */}
        {upcomingAuto.length > 0 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap px-2">
                    <CalendarClock size={14} /> Nadchodzące automaty:
                </div>
                {upcomingAuto.map(item => (
                    <div key={item.id} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1.5 shadow-sm whitespace-nowrap min-w-fit">
                        <RefreshCw size={12} className="text-slate-400" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{item.description}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 border-l border-slate-200 dark:border-slate-600 pl-2 ml-1">
                            {new Date(item.nextDueDate).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                        </span>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};
