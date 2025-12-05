
import { useState, useMemo, useEffect } from 'react';
import { Transaction, CategoryItem, TransactionType } from '../types';

export type PeriodType = 'ALL' | 'YEAR' | 'QUARTER' | 'MONTH';
export type AggregationMode = 'YEARLY' | 'QUARTERLY' | 'MONTHLY';

/**
 * Hook `useAnalysisData`
 * 
 * Odpowiada za całą logikę przetwarzania danych dla widoku Analizy (AnalysisView).
 * Oddziela warstwę obliczeniową od warstwy prezentacyjnej.
 * 
 * Funkcje:
 * 1. Filtrowanie transakcji (rok, okres, tagi).
 * 2. Agregacja danych do wykresów (dopasowanie do osi czasu).
 * 3. Obliczanie statystyk (przychody, wydatki, oszczędności).
 */
export const useAnalysisData = (transactions: Transaction[], categories: CategoryItem[]) => {
  // --- Local State for Filters ---
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [periodType, setPeriodType] = useState<PeriodType>('ALL');
  const [periodValue, setPeriodValue] = useState<number>(0); 
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  
  const [historyAggregation, setHistoryAggregation] = useState<AggregationMode>('MONTHLY');
  const [yearAggregation, setYearAggregation] = useState<'MONTHLY' | 'QUARTERLY'>('MONTHLY');

  // --- Effects ---
  
  // Automatyczne przełączanie agregacji w zależności od rozpiętości danych.
  // Jeśli historia obejmuje więcej niż 3 lata, domyślnie pokazujemy widok roczny dla czytelności.
  useEffect(() => {
    if (transactions.length === 0) return;
    const dates = transactions.map(t => new Date(t.date).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const yearDiff = maxDate.getFullYear() - minDate.getFullYear();
    if (yearDiff > 3) {
       setHistoryAggregation('YEARLY');
    } else {
       setHistoryAggregation('MONTHLY');
    }
  }, [transactions.length]);

  // --- Memoized Data Helpers ---

  const availableYears = useMemo(() => {
    const years = new Set(transactions.map(t => new Date(t.date).getFullYear()));
    return Array.from(years).sort((a: number, b: number) => b - a);
  }, [transactions]);

  const availableTags = useMemo(() => {
     const tags = new Set<string>();
     transactions.forEach(t => t.tags?.forEach(tag => tags.add(tag)));
     return Array.from(tags).sort();
  }, [transactions]);

  // --- Main Filtering Logic ---

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Tag Filter
    if (selectedTag !== 'ALL') {
       filtered = filtered.filter(t => t.tags && t.tags.includes(selectedTag));
    }

    if (periodType === 'ALL') return filtered;

    return filtered.filter(t => {
      const date = new Date(t.date);
      const yearMatches = date.getFullYear() === selectedYear;
      if (!yearMatches) return false;
      if (periodType === 'YEAR') return true;
      if (periodType === 'QUARTER') return (Math.floor(date.getMonth() / 3) + 1) === periodValue;
      if (periodType === 'MONTH') return date.getMonth() === periodValue;
      return true;
    });
  }, [transactions, selectedYear, periodType, periodValue, selectedTag]);

  // --- Data Aggregation for Charts ---

  /**
   * Agreguje dane do wykresów liniowych/słupkowych (ComboChart, DifferenceChart).
   * Tworzy "kubełki" (buckets) w zależności od wybranego okresu (np. miesiące, lata).
   * 
   * WAŻNE:
   * Rozróżnia "Wydatki" (Expense) od "Oszczędności" (Savings) na podstawie flagi `isIncludedInSavings` w kategorii.
   * Dzięki temu Oszczędności nie psują wykresu "Wydatków".
   */
  const financialHealthData = useMemo(() => {
     let buckets: any[] = [];
     let getBucketIndex = (d: Date) => 0;

     // 1. Inicjalizacja pustych kubełków w zależności od trybu
     if (periodType === 'ALL') {
        if (filteredTransactions.length === 0) return [];
        const dates = filteredTransactions.map(t => new Date(t.date).getTime());
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        const minYear = minDate.getFullYear();
        const maxYear = maxDate.getFullYear();

        if (historyAggregation === 'YEARLY') {
            const span = maxYear - minYear + 1;
            for(let i=0; i<span; i++) buckets.push({ name: `${minYear + i}`, income: 0, expense: 0, savings: 0, savingsRate: 0 });
            getBucketIndex = (d) => d.getFullYear() - minYear;
        } else if (historyAggregation === 'QUARTERLY') {
            const startYear = minDate.getFullYear();
            const startQ = Math.floor(minDate.getMonth() / 3);
            const endYear = maxDate.getFullYear();
            const endQ = Math.floor(maxDate.getMonth() / 3);
            const totalQuarters = (endYear - startYear) * 4 + (endQ - startQ) + 1;
            for(let i=0; i<totalQuarters; i++) {
                const totalQ = startQ + i;
                const y = startYear + Math.floor(totalQ / 4);
                const q = (totalQ % 4) + 1;
                buckets.push({ name: `Q${q} '${y.toString().slice(2)}`, income: 0, expense: 0, savings: 0, savingsRate: 0 });
            }
            getBucketIndex = (d) => {
                const q = Math.floor(d.getMonth() / 3);
                return (d.getFullYear() - startYear) * 4 + (q - startQ);
            };
        } else {
            const startYear = minDate.getFullYear();
            const startMonth = minDate.getMonth();
            const endYear = maxDate.getFullYear();
            const endMonth = maxDate.getMonth();
            const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
            for(let i=0; i<totalMonths; i++) {
                const currentMonthDate = new Date(startYear, startMonth + i, 1);
                buckets.push({ name: currentMonthDate.toLocaleDateString('pl-PL', { month: 'short', year: '2-digit' }), income: 0, expense: 0, savings: 0, savingsRate: 0 });
            }
            getBucketIndex = (d) => (d.getFullYear() - startYear) * 12 + (d.getMonth() - startMonth);
        }
     } else if (periodType === 'YEAR') {
        if (yearAggregation === 'QUARTERLY') {
            for(let i=1; i<=4; i++) buckets.push({ name: `Q${i}`, income: 0, expense: 0, savings: 0, savingsRate: 0 });
            getBucketIndex = (d) => Math.floor(d.getMonth() / 3);
        } else {
            for(let i=0; i<12; i++) buckets.push({ name: new Date(selectedYear, i, 1).toLocaleDateString('pl-PL', { month: 'short' }), income: 0, expense: 0, savings: 0, savingsRate: 0 });
            getBucketIndex = (d) => d.getMonth();
        }
     } else if (periodType === 'QUARTER') {
        const startMonth = (periodValue - 1) * 3;
        for(let i=0; i<3; i++) buckets.push({ name: new Date(selectedYear, startMonth + i, 1).toLocaleDateString('pl-PL', { month: 'long' }), income: 0, expense: 0, savings: 0, savingsRate: 0 });
        getBucketIndex = (d) => d.getMonth() - startMonth;
     } else {
        const daysInMonth = new Date(selectedYear, periodValue + 1, 0).getDate();
        for(let i=0; i<daysInMonth; i++) buckets.push({ name: `${i+1}`, income: 0, expense: 0, savings: 0, savingsRate: 0 });
        getBucketIndex = (d) => d.getDate() - 1;
     }

     // 2. Wypełnianie kubełków danymi
     filteredTransactions.forEach(t => {
        const date = new Date(t.date);
        const idx = getBucketIndex(date);
        const cat = categories.find(c => c.id === t.categoryId);
        if (buckets[idx]) {
            if (t.type === TransactionType.INCOME) {
                buckets[idx].income += t.amount;
            } else {
               if (cat?.isIncludedInSavings) {
                  buckets[idx].savings += t.amount;
               } else {
                  buckets[idx].expense += t.amount;
               }
            }
        }
     });
     
     // 3. Obliczanie stopy oszczędności
     buckets.forEach(b => { b.savingsRate = b.income > 0 ? (b.savings / b.income) * 100 : 0; });
     return buckets;
  }, [filteredTransactions, periodType, periodValue, selectedYear, categories, historyAggregation, yearAggregation]);

  const waterfallData = useMemo(() => {
     let totalIncome = 0;
     const expenseMap: Record<string, { amount: number, isSavings: boolean }> = {};
     
     filteredTransactions.forEach(t => {
         const cat = categories.find(c => c.id === t.categoryId);
         if (t.type === TransactionType.INCOME) {
             totalIncome += t.amount;
         } else if (t.type === TransactionType.EXPENSE) {
             const catName = cat ? cat.name : 'Inne';
             const isSavings = !!cat?.isIncludedInSavings;
             if (!expenseMap[catName]) expenseMap[catName] = { amount: 0, isSavings };
             expenseMap[catName].amount += t.amount;
         }
     });

     const result = [];
     result.push({ name: 'Przychody', value: totalIncome, type: 'income' });

     const sortedExpenses = Object.entries(expenseMap)
        .sort((a, b) => b[1].amount - a[1].amount);
     
     const topN = 7;
     let otherAmount = 0;
     let otherSavingsAmount = 0;

     sortedExpenses.slice(0, topN).forEach(([name, data]) => {
         result.push({ 
             name, 
             value: data.amount, 
             type: data.isSavings ? 'savings' : 'expense'
         });
     });

     sortedExpenses.slice(topN).forEach(([_, data]) => {
         if (data.isSavings) otherSavingsAmount += data.amount;
         else otherAmount += data.amount;
     });

     if (otherSavingsAmount > 0) result.push({ name: 'Inne Oszcz.', value: otherSavingsAmount, type: 'savings' });
     if (otherAmount > 0) result.push({ name: 'Pozostałe', value: otherAmount, type: 'expense' });

     result.push({ name: 'Saldo', value: 0, type: 'balance' });

     return result;
  }, [filteredTransactions, categories]);

  const stats = useMemo(() => {
    const totalIncome = filteredTransactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = filteredTransactions
        .filter(t => {
            if (t.type !== TransactionType.EXPENSE) return false;
            const cat = categories.find(c => c.id === t.categoryId);
            return !cat?.isIncludedInSavings;
        })
        .reduce((sum, t) => sum + t.amount, 0);

    const activeSavings = filteredTransactions.filter(t => {
        if (t.type !== TransactionType.EXPENSE) return false;
        const cat = categories.find(c => c.id === t.categoryId);
        return !!cat?.isIncludedInSavings;
    }).reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpenses; 
    const savingsRate = totalIncome > 0 ? (activeSavings / totalIncome) * 100 : 0;
    
    return { totalIncome, totalExpenses, balance, savingsRate };
  }, [filteredTransactions, categories]);

  return {
    // State
    selectedYear, setSelectedYear,
    periodType, setPeriodType,
    periodValue, setPeriodValue,
    selectedTag, setSelectedTag,
    historyAggregation, setHistoryAggregation,
    yearAggregation, setYearAggregation,
    
    // Data
    availableYears,
    availableTags,
    filteredTransactions,
    financialHealthData,
    waterfallData,
    stats
  };
};
