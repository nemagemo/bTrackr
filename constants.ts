
import { CategoryItem, Transaction, TransactionType } from './types';

/**
 * SYSTEM_IDS
 * Te identyfikatory są używane w kodzie (`App.tsx`, wykresy) do specjalnego traktowania
 * niektórych kategorii.
 * 
 * WAŻNE: Nie zmieniaj tych wartości, ponieważ zepsuje to logikę migracji
 * i wykrywania oszczędności w istniejących instancjach aplikacji.
 */
export const SYSTEM_IDS = {
  SALARY: 'sys_salary',
  INVESTMENTS: 'sys_investments',      // Traktowane jako oszczędności
  INTERNAL_TRANSFER: 'sys_transfer',   // Neutralne (często ignorowane w statystykach)
  SAVINGS: 'sys_savings',              // Traktowane jako oszczędności
  CREDIT: 'sys_credit', 
  OTHER_EXPENSE: 'sys_other_expense',  // Fallback dla usuniętych kategorii
  OTHER_INCOME: 'sys_other_income',
};

const createSub = (name: string) => ({ id: crypto.randomUUID(), name });

/**
 * Domyślny zestaw kategorii ładowany przy pierwszym uruchomieniu aplikacji.
 * Zawiera flagi `isIncludedInSavings` dla odpowiednich kategorii.
 */
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
      createSub('Serwis'), createSub('Parking'), createSub('Autostrady'), createSub('Inne')
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
  // --- ASSETS & LIABILITIES ---
  {
    id: SYSTEM_IDS.SAVINGS,
    name: 'Oszczędności',
    type: TransactionType.EXPENSE,
    color: '#10b981',
    isSystem: false,
    isIncludedInSavings: true, // WAŻNE: Wpływa na Calculation Logic
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
    isIncludedInSavings: true, // WAŻNE: Wpływa na Calculation Logic
    subcategories: [
      createSub('Giełda'), createSub('Obligacje'), createSub('IKE / IKZE'),
      createSub('Waluty'), createSub('Kryptowaluty'), createSub('Złoto'), createSub('Inne')
    ]
  },
  {
    id: SYSTEM_IDS.INTERNAL_TRANSFER,
    name: 'Przelew własny',
    type: TransactionType.EXPENSE,
    color: '#0ea5e9', // Sky blue
    isSystem: false,
    subcategories: [
      createSub('Inne')
    ]
  },
  {
    id: 'cat_insurance',
    name: 'Ubezpieczenia',
    type: TransactionType.EXPENSE,
    color: '#db2777', // Pink-700
    isSystem: false,
    subcategories: [
      createSub('Ubezpieczenie na życie'), createSub('Ubezpieczenie podróżne'), 
      createSub('Ubezpieczenie auta'), createSub('Ubezpieczenie domu'), createSub('Inne')
    ]
  },
  {
    id: 'cat_loans',
    name: 'Zobowiązania',
    type: TransactionType.EXPENSE,
    color: '#7f1d1d', // Red-900 (darker)
    isSystem: false,
    subcategories: [
      createSub('Kredyt hipoteczny'), createSub('Kredyt konsumpcyjny'), 
      createSub('Pożyczka'), createSub('Inne')
    ]
  },
  {
    id: SYSTEM_IDS.OTHER_EXPENSE,
    name: 'Inne',
    type: TransactionType.EXPENSE,
    color: '#94a3b8',
    isSystem: false,
    subcategories: [
      createSub('Inne')
    ]
  }
];

export const getCategoryColor = (categoryId: string, categories: CategoryItem[]): string => {
  const cat = categories.find(c => c.id === categoryId);
  return cat ? cat.color : '#94a3b8';
};

export const getCategoryName = (categoryId: string, categories: CategoryItem[]): string => {
  const cat = categories.find(c => c.id === categoryId);
  return cat ? cat.name : 'Nieznana';
};

/**
 * Mapa słów kluczowych do automatycznej kategoryzacji podczas importu CSV.
 * Jeśli dodajesz nowe sklepy, dodaj je tutaj.
 * Klucz: fragment opisu (lowercase), Wartość: Nazwa kategorii (musi pasować do DEFAULT_CATEGORIES).
 */
export const KEYWORD_TO_CATEGORY_NAME: Record<string, string> = {
  // Jedzenie
  'biedronka': 'Jedzenie', 'lidl': 'Jedzenie', 'kaufland': 'Jedzenie', 'auchan': 'Jedzenie',
  'zabka': 'Jedzenie', 'żabka': 'Jedzenie', 'restauracja': 'Jedzenie', 'mcdonald': 'Jedzenie',
  'uber eats': 'Jedzenie', 'glovo': 'Jedzenie', 'kfc': 'Jedzenie', 'pyszne': 'Jedzenie',
  'piekarnia': 'Jedzenie', 'cukiernia': 'Jedzenie', 'stokrotka': 'Jedzenie', 'dino': 'Jedzenie',
  
  // Zakupy
  'allegro': 'Zakupy', 'amazon': 'Zakupy', 'zara': 'Zakupy', 'h&m': 'Zakupy', 'zalando': 'Zakupy',
  'decathlon': 'Zakupy', 'media markt': 'Zakupy', 'rtv euro agd': 'Zakupy', 'empik': 'Zakupy',
  'rossmann': 'Zakupy', 'hebe': 'Zakupy', 'castorama': 'Dom i Rachunki', 'obi': 'Dom i Rachunki',
  'leroy merlin': 'Dom i Rachunki', 'ikea': 'Dom i Rachunki', 'jysk': 'Dom i Rachunki',
  
  // Transport
  'orlen': 'Transport', 'bp ': 'Transport', 'shell': 'Transport', 'circle k': 'Transport', 'moya': 'Transport',
  'uber': 'Transport', 'bolt': 'Transport', 'freenow': 'Transport',
  'pkp': 'Transport', 'intercity': 'Transport', 'koleje': 'Transport', 'jakdojade': 'Transport',
  'bilet': 'Transport', 'mpk': 'Transport', 'ztm': 'Transport', 
  'autostrada': 'Transport', 'parking': 'Transport', 'myjnia': 'Transport',

  // Dom i Rachunki
  'tauron': 'Dom i Rachunki', 'pge': 'Dom i Rachunki', 'energa': 'Dom i Rachunki', 'innogy': 'Dom i Rachunki', 'enea': 'Dom i Rachunki',
  'pgnig': 'Dom i Rachunki', 'gazownia': 'Dom i Rachunki',
  'upc': 'Dom i Rachunki', 'orange': 'Dom i Rachunki', 't-mobile': 'Dom i Rachunki', 'plus': 'Dom i Rachunki', 'play': 'Dom i Rachunki', 
  'vectra': 'Dom i Rachunki', 'netia': 'Dom i Rachunki',
  'czynsz': 'Dom i Rachunki', 'wspólnota': 'Dom i Rachunki', 'spółdzielnia': 'Dom i Rachunki',

  // Rozrywka
  'netflix': 'Rozrywka i Edukacja', 'spotify': 'Rozrywka i Edukacja', 'youtube': 'Rozrywka i Edukacja', 'hbo': 'Rozrywka i Edukacja',
  'disney': 'Rozrywka i Edukacja', 'apple': 'Rozrywka i Edukacja', 
  'kino': 'Rozrywka i Edukacja', 'cinema': 'Rozrywka i Edukacja', 'multikino': 'Rozrywka i Edukacja', 'helios': 'Rozrywka i Edukacja',
  'steam': 'Rozrywka i Edukacja', 'playstation': 'Rozrywka i Edukacja', 'xbox': 'Rozrywka i Edukacja',
  
  // Zdrowie
  'apteka': 'Zdrowie i Uroda', 'doz': 'Zdrowie i Uroda', 'gemini': 'Zdrowie i Uroda', 
  'luxmed': 'Zdrowie i Uroda', 'medicover': 'Zdrowie i Uroda', 'enel-med': 'Zdrowie i Uroda',
  'stomatolog': 'Zdrowie i Uroda', 'dentysta': 'Zdrowie i Uroda', 'lekarz': 'Zdrowie i Uroda',
  'siłownia': 'Zdrowie i Uroda', 'cityfit': 'Zdrowie i Uroda', 'zdrofit': 'Zdrowie i Uroda', 'fryzjer': 'Zdrowie i Uroda',

  // Zobowiązania
  'rata': 'Zobowiązania', 'kredyt': 'Zobowiązania', 'hipoteka': 'Zobowiązania', 'pożyczka': 'Zobowiązania',
  'alior bank raty': 'Zobowiązania', 'santander consumer': 'Zobowiązania', 'spłata': 'Zobowiązania',

  // Ubezpieczenia
  'pzu': 'Ubezpieczenia', 'warta': 'Ubezpieczenia', 'allianz': 'Ubezpieczenia', 'uniqa': 'Ubezpieczenia', 'generali': 'Ubezpieczenia',
  'ergo hestia': 'Ubezpieczenia', 'link4': 'Ubezpieczenia', 'axa': 'Ubezpieczenia', 'polisa': 'Ubezpieczenia', 'ubezpieczenie': 'Ubezpieczenia',

  // Przelew własny
  'przelew własny': 'Przelew własny', 'przelew wewnętrzny': 'Przelew własny', 'na konto': 'Przelew własny',

  // Oszczędności / Inwestycje
  'lokata': 'Oszczędności', 'konto oszczędnościowe': 'Oszczędności', 'cele': 'Oszczędności',
  'xtb': 'Inwestycje', 'degiro': 'Inwestycje', 'trading 212': 'Inwestycje', 'bossa': 'Inwestycje', 'obligacje': 'Inwestycje'
};

export const CURRENCY_FORMATTER = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
});
