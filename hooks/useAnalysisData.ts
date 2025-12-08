
import { useState, useEffect, useRef, useCallback } from 'react';
import { Transaction, CategoryItem } from '../types';
import { calculateAnalysis, AnalysisPayload } from '../utils/analysisEngine';

export type PeriodType = 'ALL' | 'YEAR' | 'QUARTER' | 'MONTH';
export type AggregationMode = 'YEARLY' | 'QUARTERLY' | 'MONTHLY';

export const useAnalysisData = (transactions: Transaction[], categories: CategoryItem[]) => {
  // Filters
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [periodType, setPeriodType] = useState<PeriodType>('ALL');
  const [periodValue, setPeriodValue] = useState<number>(0); 
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [historyAggregation, setHistoryAggregation] = useState<AggregationMode>('MONTHLY');
  const [yearAggregation, setYearAggregation] = useState<'MONTHLY' | 'QUARTERLY'>('MONTHLY');

  // Outputs
  const [data, setData] = useState({
      filteredTransactions: [] as Transaction[],
      availableYears: [] as number[],
      availableTags: [] as string[],
      financialHealthData: [] as any[],
      waterfallData: [] as any[],
      stats: { totalIncome: 0, totalExpenses: 0, balance: 0, savingsRate: 0 }
  });

  const workerRef = useRef<Worker | null>(null);
  const [isWorkerAvailable, setIsWorkerAvailable] = useState<boolean>(true);

  // Initialize Worker
  useEffect(() => {
    try {
        // Use strict Vite syntax: new Worker(new URL(string_literal, import.meta.url))
        // This allows Vite to statically analyze and bundle the worker.
        // We do NOT use variables for the URL here to ensure compatibility.
        const worker = new Worker(new URL('../workers/analysis.worker.ts', import.meta.url), { type: 'module' });
        
        worker.onmessage = (e) => {
            setData(e.data);
        };
        
        worker.onerror = (e) => {
            console.warn('Analysis Worker Error:', e);
            // If worker runtime fails, we can't easily switch mid-flight without complex logic,
            // but usually init fails immediately if there's a path issue.
        };

        workerRef.current = worker;
        setIsWorkerAvailable(true);
    } catch (e) {
        console.warn('Failed to initialize Web Worker. Falling back to main thread calculation.', e);
        setIsWorkerAvailable(false);
    }

    return () => {
        workerRef.current?.terminate();
    };
  }, []);

  // Calculate Data (Worker or Main Thread Fallback)
  useEffect(() => {
    // 1. Determine auto aggregation for history
    let currentHistoryAggregation = historyAggregation;
    if (transactions.length > 0) {
        const dates = transactions.map(t => new Date(t.date).getTime());
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        const yearDiff = maxDate.getFullYear() - minDate.getFullYear();
        if (yearDiff > 3 && historyAggregation === 'MONTHLY') {
            currentHistoryAggregation = 'YEARLY';
            setHistoryAggregation('YEARLY');
        }
    }

    const payload: AnalysisPayload = {
        transactions,
        categories,
        selectedYear,
        periodType,
        periodValue,
        selectedTag,
        historyAggregation: currentHistoryAggregation,
        yearAggregation
    };

    if (isWorkerAvailable && workerRef.current) {
        // Send to Worker
        workerRef.current.postMessage({
            type: 'CALCULATE',
            payload
        });
    } else {
        // Fallback: Run on main thread
        // We wrap in timeout to avoid blocking the render cycle immediately
        const timer = setTimeout(() => {
            const result = calculateAnalysis(payload);
            setData(result);
        }, 0);
        return () => clearTimeout(timer);
    }
  }, [
      transactions, categories, 
      selectedYear, periodType, periodValue, selectedTag, 
      historyAggregation, yearAggregation, 
      isWorkerAvailable
  ]);

  return {
    // State setters
    setSelectedYear,
    setPeriodType,
    setPeriodValue,
    setSelectedTag,
    setHistoryAggregation,
    setYearAggregation,
    
    // State values
    selectedYear,
    periodType,
    periodValue,
    selectedTag,
    historyAggregation,
    yearAggregation,

    // Data
    ...data
  };
};
