
/**
 * Definicje typów dla całej aplikacji bTrackr.
 * 
 * WAŻNE DLA AI:
 * Przy dodawaniu nowych funkcjonalności, upewnij się, że zmiany w tych interfejsach
 * są odzwierciedlone w `constants.ts` (DEFAULT_CATEGORIES) oraz w logice migracji w `App.tsx`.
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
   * @deprecated Używane w starszych wersjach do blokowania edycji. Obecnie false dla wszystkich.
   * Logika systemowa opiera się teraz na `SYSTEM_IDS` w constants.ts.
   */
  isSystem: boolean; 
  /**
   * Kluczowa flaga dla logiki finansowej.
   * Jeśli true: 
   * 1. Transakcje NIE są wliczane do ogólnej sumy 'Wydatków' (totalExpense).
   * 2. Transakcje NIE pomniejszają 'Dostępnych środków' (są traktowane jako transfer majątku).
   * 3. Służą do obliczania licznika 'Stopy Oszczędności'.
   */
  isIncludedInSavings?: boolean; 
  /**
   * Użytkownik może zdefiniować miesięczny limit dla tej kategorii.
   * Używane w komponencie `BudgetPulse`.
   */
  budgetLimit?: number; 
  subcategories: SubcategoryItem[];
}

/**
 * Szablon transakcji cyklicznej.
 * Nie wpływa na saldo, służy do generowania realnych transakcji.
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
  autoPay: boolean; // True = automat (Netflix), False = przypomnienie (Prąd)
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
  categoryId: string; // Odnosi się do CategoryItem.id
  subcategoryId?: string; // Odnosi się do SubcategoryItem.id
  date: string; // Format ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ). UWAGA: Zalecane ustawianie godziny na 12:00, aby uniknąć przesunięć stref czasowych.
  tags?: string[]; // Niezależny system tagowania (np. #wakacje, #projektX)
  isRecurring?: boolean; // Czy transakcja powstała z szablonu cyklicznego
}

/**
 * Obiekt podsumowania używany w Dashboardzie.
 */
export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number; // Suma wydatków KONSUMPCYJNYCH (bez oszczędności/inwestycji)
  balance: number;      // Income - TotalExpense (Consumption).
  savingsAmount: number; // Kwota wydana na kategorie oznaczone jako isIncludedInSavings
}

export interface ChartDataPoint {
  name: string;
  value: number;
  color: string;
}

/**
 * Struktura pliku eksportu/importu (JSON).
 * Służy do pełnego backupu stanu aplikacji.
 */
export interface BackupData {
  version: number;
  timestamp: string;
  categories: CategoryItem[];
  transactions: Transaction[];
  recurringTransactions?: RecurringTransaction[]; // New field
  settings: {
    isPrivateMode: boolean;
  };
}
