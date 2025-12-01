
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
   * Jeśli true: Transakcje w tej kategorii są traktowane jako transfer majątku (Oszczędności/Inwestycje),
   * a nie jako konsumpcja. Wpływa to na obliczanie 'Wydatków' (są wyłączone) i 'Stopy Oszczędności'.
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
 * Główny obiekt transakcji.
 */
export interface Transaction {
  id: string;
  amount: number;
  description: string;
  type: TransactionType;
  categoryId: string; // Odnosi się do CategoryItem.id
  subcategoryId?: string; // Odnosi się do SubcategoryItem.id
  date: string; // Format ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
  tags?: string[]; // Niezależny system tagowania (np. #wakacje, #projektX)
}

/**
 * Obiekt podsumowania używany w Dashboardzie.
 */
export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number; // Tylko wydatki konsumpcyjne (bez oszczędności)
  balance: number;      // Income - Expense - Transfers
}

export interface ChartDataPoint {
  name: string;
  value: number;
  color: string;
}

/**
 * Struktura pliku eksportu/importu (JSON).
 */
export interface BackupData {
  version: number;
  timestamp: string;
  categories: CategoryItem[];
  transactions: Transaction[];
  settings: {
    isPrivateMode: boolean;
  };
}
