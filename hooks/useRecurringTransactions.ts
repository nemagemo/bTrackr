
import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { RecurringTransaction, Transaction, Frequency } from '../types';
import { ensureSubcategory } from '../utils/dbHelpers';

export const useRecurringTransactions = () => {
  const recurringTransactions = useLiveQuery(() => db.recurringTransactions.toArray()) || [];

  const calculateNextDate = (dateStr: string, freq: Frequency): string => {
    const date = new Date(dateStr);
    if (freq === 'WEEKLY') date.setDate(date.getDate() + 7);
    else if (freq === 'MONTHLY') date.setMonth(date.getMonth() + 1);
    else if (freq === 'YEARLY') date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  };

  // --- Engine: Catch-up Logic ---
  useEffect(() => {
    if (recurringTransactions.length === 0) return;

    const processRecurring = async () => {
        const today = new Date().toISOString().split('T')[0];
        
        for (const rule of recurringTransactions) {
            if (rule.autoPay && rule.nextDueDate <= today) {
                let currentDueDate = rule.nextDueDate;
                const newTxBatch: Transaction[] = [];

                // Catch-up Loop
                while (currentDueDate <= today) {
                    newTxBatch.push({
                        id: crypto.randomUUID(),
                        date: currentDueDate,
                        description: rule.description,
                        amount: rule.amount,
                        type: rule.type,
                        categoryId: rule.categoryId,
                        subcategoryId: rule.subcategoryId,
                        tags: rule.tags,
                        isRecurring: true
                    });
                    currentDueDate = calculateNextDate(currentDueDate, rule.frequency);
                }

                // Atomic updates
                await (db as any).transaction('rw', db.transactions, db.recurringTransactions, async () => {
                    await db.transactions.bulkAdd(newTxBatch);
                    await db.recurringTransactions.update(rule.id, { nextDueDate: currentDueDate });
                });
            }
        }
    };

    processRecurring();
  }, [recurringTransactions]); 

  // --- Actions ---

  const addRecurringTransaction = async (rule: Omit<RecurringTransaction, 'id'>) => {
    const subId = await ensureSubcategory(rule.categoryId, rule.subcategoryId);
    const newRule: RecurringTransaction = {
      ...rule,
      id: crypto.randomUUID(),
      subcategoryId: subId
    };
    await db.recurringTransactions.add(newRule);
  };

  const deleteRecurringTransaction = async (id: string) => {
    await db.recurringTransactions.delete(id);
  };

  const processRecurringTransaction = async (ruleId: string, amount?: number) => {
    const rule = recurringTransactions.find(r => r.id === ruleId);
    if (!rule) return;

    await (db as any).transaction('rw', db.transactions, db.recurringTransactions, async () => {
        // 1. Create transaction
        const newTx: Transaction = {
            id: crypto.randomUUID(),
            date: rule.nextDueDate,
            description: rule.description,
            amount: amount !== undefined ? amount : rule.amount,
            type: rule.type,
            categoryId: rule.categoryId,
            subcategoryId: rule.subcategoryId,
            tags: rule.tags,
            isRecurring: true
        };
        await db.transactions.add(newTx);

        // 2. Advance rule
        const nextDate = calculateNextDate(rule.nextDueDate, rule.frequency);
        await db.recurringTransactions.update(ruleId, { nextDueDate: nextDate });
    });
  };

  const skipRecurringTransaction = async (ruleId: string) => {
    const rule = recurringTransactions.find(r => r.id === ruleId);
    if (!rule) return;
    const nextDate = calculateNextDate(rule.nextDueDate, rule.frequency);
    await db.recurringTransactions.update(ruleId, { nextDueDate: nextDate });
  };

  return {
    recurringTransactions,
    addRecurringTransaction,
    deleteRecurringTransaction,
    processRecurringTransaction,
    skipRecurringTransaction
  };
};
