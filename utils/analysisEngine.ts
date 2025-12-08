
import { Transaction, TransactionType, CategoryItem } from '../types';

export interface AnalysisPayload {
    transactions: Transaction[];
    categories: CategoryItem[];
    selectedYear: number;
    periodType: 'ALL' | 'YEAR' | 'QUARTER' | 'MONTH';
    periodValue: number;
    selectedTag: string;
    historyAggregation: 'YEARLY' | 'QUARTERLY' | 'MONTHLY';
    yearAggregation: 'MONTHLY' | 'QUARTERLY';
}

/**
 * Silnik obliczeniowy dla widoku analizy.
 * 
 * Funkcja jest przystosowana do działania w Web Workerze, aby nie blokować
 * głównego wątku aplikacji podczas przetwarzania tysięcy transakcji.
 * Generuje dane dla wszystkich wykresów (buckets, waterfall, stats) w jednym przebiegu.
 */
export const calculateAnalysis = (payload: AnalysisPayload) => {
    const { 
        transactions, categories, selectedYear, periodType, 
        periodValue, selectedTag, historyAggregation, yearAggregation 
    } = payload;

    // --- 1. Filtering ---
    let filtered = transactions;

    if (selectedTag !== 'ALL') {
       filtered = filtered.filter(t => t.tags && t.tags.includes(selectedTag));
    }

    if (periodType !== 'ALL') {
        filtered = filtered.filter(t => {
            const date = new Date(t.date);
            const yearMatches = date.getFullYear() === selectedYear;
            if (!yearMatches) return false;
            if (periodType === 'YEAR') return true;
            if (periodType === 'QUARTER') return (Math.floor(date.getMonth() / 3) + 1) === periodValue;
            if (periodType === 'MONTH') return date.getMonth() === periodValue;
            return true;
        });
    }

    const filteredTransactions = filtered;

    // --- 2. Helpers ---
    const availableYears = Array.from(new Set(transactions.map(t => new Date(t.date).getFullYear())))
        .sort((a, b) => b - a);

    const availableTags = Array.from(new Set(transactions.flatMap(t => t.tags || []))).sort();

    // --- 3. Financial Health Data ---
    let buckets: any[] = [];
    let getBucketIndex = (d: Date) => 0;

    if (periodType === 'ALL') {
       if (filteredTransactions.length > 0) {
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

    filteredTransactions.forEach(t => {
       const date = new Date(t.date);
       const idx = getBucketIndex(date);
       if (buckets[idx]) {
           const cat = categories.find(c => c.id === t.categoryId);
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
    
    // Calculate Rates safely
    buckets.forEach(b => { 
        if (b.income > 0) {
            b.savingsRate = (b.savings / b.income) * 100;
        } else if (b.savings > 0) {
            b.savingsRate = 100; // All savings, no income recorded (edge case)
        } else {
            b.savingsRate = 0;
        }
    });

    // --- 4. Waterfall Data ---
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

    const waterfallData = [];
    waterfallData.push({ name: 'Przychody', value: totalIncome, type: 'income' });

    const sortedExpenses = Object.entries(expenseMap)
       .sort((a, b) => b[1].amount - a[1].amount);
    
    const topN = 7;
    let otherAmount = 0;
    let otherSavingsAmount = 0;

    sortedExpenses.slice(0, topN).forEach(([name, data]) => {
        waterfallData.push({ 
            name, 
            value: data.amount, 
            type: data.isSavings ? 'savings' : 'expense'
        });
    });

    sortedExpenses.slice(topN).forEach(([_, data]) => {
        if (data.isSavings) otherSavingsAmount += data.amount;
        else otherAmount += data.amount;
    });

    if (otherSavingsAmount > 0) waterfallData.push({ name: 'Inne Oszcz.', value: otherSavingsAmount, type: 'savings' });
    if (otherAmount > 0) waterfallData.push({ name: 'Pozostałe', value: otherAmount, type: 'expense' });

    waterfallData.push({ name: 'Saldo', value: 0, type: 'balance' }); // Placeholder

    // --- 5. Stats ---
    const statsTotalIncome = filteredTransactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + t.amount, 0);

    const statsTotalExpenses = filteredTransactions
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

    const balance = statsTotalIncome - statsTotalExpenses; 
    const savingsRate = statsTotalIncome > 0 ? (activeSavings / statsTotalIncome) * 100 : 0;

    return {
        filteredTransactions,
        availableYears,
        availableTags,
        financialHealthData: buckets,
        waterfallData,
        stats: { totalIncome: statsTotalIncome, totalExpenses: statsTotalExpenses, balance, savingsRate }
    };
};
