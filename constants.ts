
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

const createSub = (name: string) => ({ id: crypto.randomUUID(), name });

export const DEFAULT_CATEGORIES: CategoryItem[] = [
  // --- INCOMES ---
  {
    id: SYSTEM_IDS.SALARY,
    name: 'Wynagrodzenie',
    type: TransactionType.INCOME,
    color: '#22c55e',
    isSystem: false,
    subcategories: [
      createSub('Wypłata'), createSub('Premie'), createSub('Nadgodziny'), createSub('Inne')
    ]
  },
  {
    id: 'inc_additional',
    name: 'Przychody Dodatkowe',
    type: TransactionType.INCOME,
    color: '#84cc16',
    isSystem: false,
    subcategories: [
      createSub('Freelance'), createSub('Sprzedaż rzeczy'), createSub('Działalność gospodarcza'), createSub('Inne')
    ]
  },
  {
    id: 'inc_capital',
    name: 'Kapitał i Inwestycje',
    type: TransactionType.INCOME,
    color: '#06b6d4',
    isSystem: false,
    subcategories: [
      createSub('Dywidendy'), createSub('Odsetki'), createSub('Wynajem'), createSub('Zwrot z inwestycji'), createSub('Inne')
    ]
  },
  {
    id: SYSTEM_IDS.OTHER_INCOME,
    name: 'Inne Wpływy',
    type: TransactionType.INCOME,
    color: '#64748b',
    isSystem: false,
    subcategories: [
      createSub('Prezenty'), createSub('Zwrot podatku'), createSub('Świadczenia socjalne'), createSub('Inne')
    ]
  },

  // --- EXPENSES ---
  {
    id: 'cat_housing',
    name: 'Dom i Rachunki',
    type: TransactionType.EXPENSE,
    color: '#eab308',
    isSystem: false,
    subcategories: [
      createSub('Czynsz'), createSub('Prąd'), createSub('Gaz'), createSub('Woda'),
      createSub('Internet'), createSub('Telefon'), createSub('Chemia gospodarcza'),
      createSub('Wyposażenie domu'), createSub('Remonty'), createSub('Naprawy'), createSub('Inne')
    ]
  },
  {
    id: 'cat_food',
    name: 'Jedzenie',
    type: TransactionType.EXPENSE,
    color: '#ef4444',
    isSystem: false,
    subcategories: [
      createSub('Zakupy spożywcze'), createSub('Restauracje'), createSub('Zamawianie jedzenia'),
      createSub('Kawa i Przekąski'), createSub('Alkohol'), createSub('Inne')
    ]
  },
  {
    id: 'cat_transport',
    name: 'Transport',
    type: TransactionType.EXPENSE,
    color: '#f97316',
    isSystem: false,
    subcategories: [
      createSub('Paliwo'), createSub('Komunikacja miejska'), createSub('Taxi'), createSub('Uber'),
      createSub('Serwis'), createSub('Ubezpieczenie auta'), createSub('Parking'), createSub('Autostrady'), createSub('Inne')
    ]
  },
  {
    id: 'cat_shopping',
    name: 'Zakupy',
    type: TransactionType.EXPENSE,
    color: '#3b82f6',
    isSystem: false,
    subcategories: [
      createSub('Ubrania'), createSub('Obuwie'), createSub('Elektronika'), createSub('Gadżety'),
      createSub('Kosmetyki'), createSub('Higiena'), createSub('Hobby'), createSub('Inne')
    ]
  },
  {
    id: 'cat_health',
    name: 'Zdrowie i Uroda',
    type: TransactionType.EXPENSE,
    color: '#ec4899',
    isSystem: false,
    subcategories: [
      createSub('Lekarz'), createSub('Badania'), createSub('Apteka'), createSub('Suplementy'),
      createSub('Fryzjer'), createSub('Kosmetyczka'), createSub('Sport'), createSub('Siłownia'), createSub('Inne')
    ]
  },
  {
    id: 'cat_entertainment',
    name: 'Rozrywka i Edukacja',
    type: TransactionType.EXPENSE,
    color: '#8b5cf6',
    isSystem: false,
    subcategories: [
      createSub('Subskrypcje'), createSub('Kino'), createSub('Teatr'), createSub('Koncerty'),
      createSub('Książki'), createSub('Kursy'), createSub('Szkolenia'), createSub('Gry'), createSub('Inne')
    ]
  },
  {
    id: 'cat_travel',
    name: 'Podróże',
    type: TransactionType.EXPENSE,
    color: '#14b8a6',
    isSystem: false,
    subcategories: [
      createSub('Bilety'), createSub('Noclegi'), createSub('Kieszonkowe'), createSub('Inne')
    ]
  },
  {
    id: 'cat_kids',
    name: 'Dzieci',
    type: TransactionType.EXPENSE,
    color: '#f43f5e',
    isSystem: false,
    subcategories: [
      createSub('Szkoła'), createSub('Przedszkole'), createSub('Zabawki'), createSub('Ubranka'),
      createSub('Zajęcia dodatkowe'), createSub('Inne')
    ]
  },
  {
    id: 'cat_pets',
    name: 'Zwierzęta',
    type: TransactionType.EXPENSE,
    color: '#a8a29e',
    isSystem: false,
    subcategories: [
      createSub('Karma'), createSub('Weterynarz'), createSub('Akcesoria'), createSub('Inne')
    ]
  },
  {
    id: SYSTEM_IDS.SAVINGS,
    name: 'Oszczędności',
    type: TransactionType.EXPENSE,
    color: '#10b981',
    isSystem: false,
    isIncludedInSavings: true, // Default true
    subcategories: [
      createSub('Fundusz awaryjny'), createSub('Poduszka finansowa'), createSub('Konto oszczędnościowe'),
      createSub('Cele krótkoterminowe'), createSub('Nadpłata kredytu'), createSub('Lokaty'), createSub('Inne')
    ]
  },
  {
    id: SYSTEM_IDS.INVESTMENTS,
    name: 'Inwestycje',
    type: TransactionType.EXPENSE,
    color: '#06b6d4',
    isSystem: false,
    isIncludedInSavings: true, // Default true
    subcategories: [
      createSub('Giełda'), createSub('Obligacje'), createSub('IKE / IKZE'),
      createSub('Waluty'), createSub('Kryptowaluty'), createSub('Złoto'), createSub('Inne')
    ]
  },
  {
    id: SYSTEM_IDS.OTHER_EXPENSE,
    name: 'Zobowiązania i Inne',
    type: TransactionType.EXPENSE,
    color: '#64748b',
    isSystem: false,
    subcategories: [
      createSub('Raty kredytów'), createSub('Ubezpieczenia na życie'), createSub('Prezenty'),
      createSub('Charytatywność'), createSub('Inne')
    ]
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

export const KEYWORD_TO_CATEGORY_NAME: Record<string, string> = {
  // Jedzenie
  'biedronka': 'Jedzenie', 'lidl': 'Jedzenie', 'kaufland': 'Jedzenie', 'auchan': 'Jedzenie',
  'zabka': 'Jedzenie', 'żabka': 'Jedzenie', 'restauracja': 'Jedzenie', 'mcdonald': 'Jedzenie',
  'uber eats': 'Jedzenie', 'glovo': 'Jedzenie',
  
  // Zakupy
  'allegro': 'Zakupy', 'amazon': 'Zakupy', 'zara': 'Zakupy', 'h&m': 'Zakupy', 
  'decathlon': 'Zakupy', 'media markt': 'Zakupy', 'ikea': 'Dom i Rachunki',
  
  // Transport
  'orlen': 'Transport', 'bp ': 'Transport', 'shell': 'Transport', 'uber': 'Transport',
  'bolt': 'Transport', 'pkp': 'Transport', 'bilet': 'Transport', 'parking': 'Transport',

  // Opłaty
  'tauron': 'Dom i Rachunki', 'pge': 'Dom i Rachunki', 'upc': 'Dom i Rachunki', 'orange': 'Dom i Rachunki', 'czynsz': 'Dom i Rachunki',
  
  // Rozrywka
  'netflix': 'Rozrywka i Edukacja', 'spotify': 'Rozrywka i Edukacja', 'kino': 'Rozrywka i Edukacja', 'steam': 'Rozrywka i Edukacja',
  
  // Zdrowie
  'apteka': 'Zdrowie i Uroda', 'luxmed': 'Zdrowie i Uroda', 'medicover': 'Zdrowie i Uroda',

  // Kredyt
  'rata': 'Zobowiązania i Inne', 'kredyt': 'Zobowiązania i Inne', 'hipoteka': 'Zobowiązania i Inne',

  // Tech
  'lokata': 'Oszczędności', 'xtb': 'Inwestycje'
};

export const CURRENCY_FORMATTER = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
});
