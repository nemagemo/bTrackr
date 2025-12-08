
/**
 * Definicje typów dla całej aplikacji bTrackr.
 * 
 * WAŻNE:
 * Zmiany w strukturze danych (CategoryItem, Transaction) mogą wymagać
 * aktualizacji logiki migracji w `hooks/useDataMigration.ts` oraz obsługi kopii zapasowych.
 */

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export type Frequency = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface SubcategoryItem {
  id: string;
  name: string;
}

/**
 * Reprezentuje kategorię wydatków lub przychodów.
 */
export interface CategoryItem {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  /**
   * Flaga systemowa (Legacy). 
   * Obecnie logika systemowa opiera się głównie na stałych `SYSTEM_IDS` w constants.ts.
   */
  isSystem: boolean; 
  /**
   * Flaga "Oszczędności / Inwestycje".
   * Jeśli true: 
   * 1. Transakcje są traktowane jako transfer majątku (nie pomniejszają salda operacyjnego).
   * 2. Są wyłączone z wykresów wydatków konsumpcyjnych.
   * 3. Służą do obliczania Stopy Oszczędności (Savings Rate).
   */
  isIncludedInSavings?: boolean; 
  /**
   * Opcjonalny miesięczny limit budżetowy dla tej kategorii.
   */
  budgetLimit?: number; 
  subcategories: SubcategoryItem[];
}

/**
 * Szablon transakcji cyklicznej.
 * Służy do automatycznego generowania transakcji (pole `autoPay`) lub przypominania o płatnościach.
 */
export interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  subcategoryId?: string;
  frequency: Frequency;
  nextDueDate: string; // ISO Date (YYYY-MM-DD)
  autoPay: boolean; // True = automat (tworzy wpis sam), False = wymaga zatwierdzenia
  tags?: string[];
}

/**
 * Główny obiekt transakcji.
 */
export interface Transaction {
  id: string;
  amount: number;
  description: string;
  type: TransactionType;
  categoryId: string; // Referencja do CategoryItem.id
  subcategoryId?: string; // Referencja do SubcategoryItem.id
  /**
   * Data w formacie ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ).
   * UWAGA: Aplikacja ustawia godzinę na 12:00 (noon), aby uniknąć przesunięć
   * daty wynikających ze stref czasowych przy konwersji UTC <-> Local.
   */
  date: string; 
  tags?: string[]; // System tagowania (np. #wakacje)
  isRecurring?: boolean; // Flaga oznaczająca, że transakcja pochodzi z automatu
}

/**
 * Obiekt podsumowania finansowego (agregat).
 */
export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number; // Wydatki konsumpcyjne (bez oszczędności)
  balance: number;      // Income - TotalExpense
  savingsAmount: number; // Suma przepływów na kategorie oszczędnościowe
}

export interface ChartDataPoint {
  name: string;
  value: number;
  color: string;
}

/**
 * Struktura pliku eksportu/importu (JSON).
 * Zawiera pełny zrzut bazy danych Dexie.
 */
export interface BackupData {
  version: number;
  timestamp: string;
  categories: CategoryItem[];
  transactions: Transaction[];
  recurringTransactions?: RecurringTransaction[];
  settings: {
    isPrivateMode: boolean;
  };
}
