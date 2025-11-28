
import { CategoryItem, Transaction, TransactionType } from './types';

// System IDs are used to identify special categories in business logic (charts, savings rate)
export const SYSTEM_IDS = {
  SALARY: 'sys_salary',
  INVESTMENTS: 'sys_investments',
  INTERNAL_TRANSFER: 'sys_transfer',
  SAVINGS: 'sys_savings',
  CREDIT: 'sys_credit',
  OTHER_EXPENSE: 'sys_other_expense',
  OTHER_INCOME: 'sys_other_income',
};

export const DEFAULT_CATEGORIES: CategoryItem[] = [
  // --- INCOMES ---
  {
    id: SYSTEM_IDS.SALARY,
    name: 'Wynagrodzenie',
    type: TransactionType.INCOME,
    color: '#22c55e', // Green-500
    isSystem: true,
    subcategories: []
  },
  {
    id: SYSTEM_IDS.INVESTMENTS, // Can be income (profit) or expense (deposit) - handled by type check or duplicate? 
    // Usually Investment Income is separate. Let's keep Investment as Income category here.
    name: 'Inwestycje (Zysk)',
    type: TransactionType.INCOME,
    color: '#06b6d4', // Cyan-500
    isSystem: true,
    subcategories: []
  },
  {
    id: 'sys_income_transfer',
    name: 'Przelew własny',
    type: TransactionType.INCOME,
    color: '#0d9488', // Teal-600
    isSystem: true,
    subcategories: []
  },
  {
    id: SYSTEM_IDS.OTHER_INCOME,
    name: 'Inne Przychody',
    type: TransactionType.INCOME,
    color: '#64748b', // Slate-500
    isSystem: true,
    subcategories: []
  },

  // --- EXPENSES ---
  {
    id: 'cat_food',
    name: 'Jedzenie',
    type: TransactionType.EXPENSE,
    color: '#ef4444', // Red-500
    isSystem: false,
    subcategories: [
      { id: 'sub_groceries', name: 'Spożywcze' },
      { id: 'sub_dining', name: 'Restauracje' }
    ]
  },
  {
    id: 'cat_shopping',
    name: 'Zakupy',
    type: TransactionType.EXPENSE,
    color: '#3b82f6', // Blue-500
    isSystem: false,
    subcategories: [
      { id: 'sub_clothes', name: 'Ubrania' },
      { id: 'sub_electronics', name: 'Elektronika' },
      { id: 'sub_home', name: 'Dom' }
    ]
  },
  {
    id: 'cat_transport',
    name: 'Transport',
    type: TransactionType.EXPENSE,
    color: '#f97316', // Orange-500
    isSystem: false,
    subcategories: [
      { id: 'sub_fuel', name: 'Paliwo' },
      { id: 'sub_public', name: 'Komunikacja' },
      { id: 'sub_taxi', name: 'Taxi/Uber' }
    ]
  },
  {
    id: 'cat_housing',
    name: 'Mieszkanie',
    type: TransactionType.EXPENSE,
    color: '#eab308', // Yellow-500
    isSystem: false,
    subcategories: [
      { id: 'sub_rent', name: 'Czynsz' },
      { id: 'sub_renovation', name: 'Remont' }
    ]
  },
  {
    id: 'cat_bills',
    name: 'Opłaty',
    type: TransactionType.EXPENSE,
    color: '#0ea5e9', // Sky-500
    isSystem: false,
    subcategories: [
      { id: 'sub_energy', name: 'Prąd/Gaz' },
      { id: 'sub_internet', name: 'Internet/Telefon' }
    ]
  },
  {
    id: 'cat_entertainment',
    name: 'Rozrywka',
    type: TransactionType.EXPENSE,
    color: '#8b5cf6', // Violet-500
    isSystem: false,
    subcategories: [
      { id: 'sub_subs', name: 'Subskrypcje' },
      { id: 'sub_cinema', name: 'Kino/Kultura' },
      { id: 'sub_travel', name: 'Wyjazdy' }
    ]
  },
  {
    id: 'cat_health',
    name: 'Zdrowie',
    type: TransactionType.EXPENSE,
    color: '#ec4899', // Pink-500
    isSystem: false,
    subcategories: [
      { id: 'sub_doctor', name: 'Lekarz' },
      { id: 'sub_pharmacy', name: 'Apteka' }
    ]
  },
  {
    id: SYSTEM_IDS.CREDIT,
    name: 'Kredyt',
    type: TransactionType.EXPENSE,
    color: '#9f1239', // Rose-800
    isSystem: true,
    subcategories: []
  },
  {
    id: 'sys_exp_invest',
    name: 'Inwestycje (Wpłata)',
    type: TransactionType.EXPENSE,
    color: '#06b6d4', // Cyan-500
    isSystem: true,
    subcategories: []
  },
  {
    id: SYSTEM_IDS.SAVINGS,
    name: 'Oszczędności',
    type: TransactionType.EXPENSE,
    color: '#10b981', // Emerald-500
    isSystem: true,
    subcategories: []
  },
  {
    id: SYSTEM_IDS.INTERNAL_TRANSFER,
    name: 'Przelew własny',
    type: TransactionType.EXPENSE,
    color: '#0d9488', // Teal-600
    isSystem: true,
    subcategories: []
  },
  {
    id: SYSTEM_IDS.OTHER_EXPENSE,
    name: 'Inne',
    type: TransactionType.EXPENSE,
    color: '#64748b', // Slate-500
    isSystem: true,
    subcategories: []
  }
];

// Helper to get color safely
export const getCategoryColor = (categoryId: string, categories: CategoryItem[]): string => {
  const cat = categories.find(c => c.id === categoryId);
  return cat ? cat.color : '#94a3b8';
};

// Helper to get name safely
export const getCategoryName = (categoryId: string, categories: CategoryItem[]): string => {
  const cat = categories.find(c => c.id === categoryId);
  return cat ? cat.name : 'Nieznana';
};

// Keyword map now maps to Names (or we map to IDs on runtime). 
// Since IDs are dynamic, we must map keywords to IDs *during* runtime or initial load.
// We will keep a simple Keyword -> Name map for now, and the Import logic will try to find ID by Name.
export const KEYWORD_TO_CATEGORY_NAME: Record<string, string> = {
  // Jedzenie
  'biedronka': 'Jedzenie', 'lidl': 'Jedzenie', 'kaufland': 'Jedzenie', 'auchan': 'Jedzenie',
  'zabka': 'Jedzenie', 'żabka': 'Jedzenie', 'restauracja': 'Jedzenie', 'mcdonald': 'Jedzenie',
  'uber eats': 'Jedzenie', 'glovo': 'Jedzenie',
  
  // Zakupy
  'allegro': 'Zakupy', 'amazon': 'Zakupy', 'zara': 'Zakupy', 'h&m': 'Zakupy', 
  'decathlon': 'Zakupy', 'media markt': 'Zakupy', 'ikea': 'Mieszkanie',
  
  // Transport
  'orlen': 'Transport', 'bp ': 'Transport', 'shell': 'Transport', 'uber': 'Transport',
  'bolt': 'Transport', 'pkp': 'Transport', 'bilet': 'Transport', 'parking': 'Transport',

  // Opłaty
  'tauron': 'Opłaty', 'pge': 'Opłaty', 'upc': 'Opłaty', 'orange': 'Opłaty', 'czynsz': 'Mieszkanie',
  
  // Rozrywka
  'netflix': 'Rozrywka', 'spotify': 'Rozrywka', 'kino': 'Rozrywka', 'steam': 'Rozrywka',
  
  // Zdrowie
  'apteka': 'Zdrowie', 'luxmed': 'Zdrowie', 'medicover': 'Zdrowie',

  // Kredyt
  'rata': 'Kredyt', 'kredyt': 'Kredyt', 'hipoteka': 'Kredyt',

  // Tech
  'przelew własny': 'Przelew własny', 'lokata': 'Oszczędności', 'xtb': 'Inwestycje (Wpłata)'
};

export const CURRENCY_FORMATTER = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
});
