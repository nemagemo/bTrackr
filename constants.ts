import { Category, Transaction, TransactionType } from './types';

export const CATEGORY_COLORS: Record<string, string> = {
  [Category.FOOD]: '#ef4444', // Red-500
  [Category.SHOPPING]: '#3b82f6', // Blue-500
  [Category.TRANSPORT]: '#f97316', // Orange-500
  [Category.HOUSING]: '#eab308', // Yellow-500
  [Category.ENTERTAINMENT]: '#8b5cf6', // Violet-500
  [Category.HEALTH]: '#ec4899', // Pink-500
  [Category.SALARY]: '#22c55e', // Green-500
  [Category.INVESTMENTS]: '#06b6d4', // Cyan-500
  [Category.OTHER]: '#64748b', // Slate-500
};

export const KEYWORD_CATEGORY_MAP: Record<string, Category> = {
  // Jedzenie
  'biedronka': Category.FOOD,
  'lidl': Category.FOOD,
  'kaufland': Category.FOOD,
  'auchan': Category.FOOD,
  'carrefour': Category.FOOD,
  'zabka': Category.FOOD,
  'żabka': Category.FOOD,
  'dino': Category.FOOD,
  'piekarnia': Category.FOOD,
  'restauracja': Category.FOOD,
  'mcdonald': Category.FOOD,
  'kfc': Category.FOOD,
  'burger king': Category.FOOD,
  'pizzeria': Category.FOOD,
  'glovo': Category.FOOD,
  'pyszne': Category.FOOD,
  'uber eats': Category.FOOD,
  'stokrotka': Category.FOOD,

  // Zakupy (Nowa kategoria)
  'allegro': Category.SHOPPING,
  'amazon': Category.SHOPPING,
  'zalando': Category.SHOPPING,
  'zara': Category.SHOPPING,
  'h&m': Category.SHOPPING,
  'hm': Category.SHOPPING,
  'reserved': Category.SHOPPING,
  'ccc': Category.SHOPPING,
  'eobuwie': Category.SHOPPING,
  'decathlon': Category.SHOPPING,
  'media markt': Category.SHOPPING,
  'media expert': Category.SHOPPING,
  'rtv euro agd': Category.SHOPPING,
  'x-kom': Category.SHOPPING,
  'morele': Category.SHOPPING,
  'tk maxx': Category.SHOPPING,
  'pepco': Category.SHOPPING,
  'action': Category.SHOPPING,
  'dealz': Category.SHOPPING,
  'smyk': Category.SHOPPING,
  'empik': Category.SHOPPING, // Can be overlap with entertainment, but shopping is safe

  // Transport
  'orlen': Category.TRANSPORT,
  'bp ': Category.TRANSPORT, // space to avoid matching partial words sometimes
  'shell': Category.TRANSPORT,
  'circle k': Category.TRANSPORT,
  'moya': Category.TRANSPORT,
  'uber': Category.TRANSPORT,
  'bolt': Category.TRANSPORT,
  'freenow': Category.TRANSPORT,
  'jakdojade': Category.TRANSPORT,
  'pkp': Category.TRANSPORT,
  'intercity': Category.TRANSPORT,
  'koleje': Category.TRANSPORT,
  'mpk': Category.TRANSPORT,
  'ztm': Category.TRANSPORT,
  'mpay': Category.TRANSPORT,
  'skycash': Category.TRANSPORT,
  'parking': Category.TRANSPORT,
  'autostrada': Category.TRANSPORT,

  // Rozrywka
  'netflix': Category.ENTERTAINMENT,
  'spotify': Category.ENTERTAINMENT,
  'hbo': Category.ENTERTAINMENT,
  'disney': Category.ENTERTAINMENT,
  'youtube': Category.ENTERTAINMENT,
  'kino': Category.ENTERTAINMENT,
  'cinema': Category.ENTERTAINMENT,
  'steam': Category.ENTERTAINMENT,
  'playstation': Category.ENTERTAINMENT,
  'xbox': Category.ENTERTAINMENT,
  'bilet': Category.ENTERTAINMENT,
  'eventim': Category.ENTERTAINMENT,

  // Mieszkanie / Media
  'czynsz': Category.HOUSING,
  'wspólnota': Category.HOUSING,
  'spółdzielnia': Category.HOUSING,
  'tauron': Category.HOUSING,
  'pge': Category.HOUSING,
  'enea': Category.HOUSING,
  'innogy': Category.HOUSING,
  'pgnig': Category.HOUSING,
  'gaz': Category.HOUSING,
  'vectra': Category.HOUSING,
  'upc': Category.HOUSING,
  'netia': Category.HOUSING,
  'orange': Category.HOUSING,
  't-mobile': Category.HOUSING,
  'plus': Category.HOUSING,
  'play': Category.HOUSING,
  'ikea': Category.HOUSING,
  'castorama': Category.HOUSING,
  'leroy': Category.HOUSING,
  'obi': Category.HOUSING,

  // Zdrowie
  'apteka': Category.HEALTH,
  'doz': Category.HEALTH,
  'superpharm': Category.HEALTH,
  'luxmed': Category.HEALTH,
  'medicover': Category.HEALTH,
  'enel-med': Category.HEALTH,
  'stomatolog': Category.HEALTH,
  'dentysta': Category.HEALTH,
  'lekarz': Category.HEALTH,
  'przychodnia': Category.HEALTH,
  'badania': Category.HEALTH,
  'rossmann': Category.HEALTH, // Often cosmetics/hygiene fits here or 'Inne', user preference
  'hebe': Category.HEALTH,

  // Inwestycje
  'xtb': Category.INVESTMENTS,
  'degiro': Category.INVESTMENTS,
  'bossa': Category.INVESTMENTS,
  'obligacje': Category.INVESTMENTS,
  'gielda': Category.INVESTMENTS,
  'ppk': Category.INVESTMENTS,
  'ike': Category.INVESTMENTS,
  'ikze': Category.INVESTMENTS,
};

export const INITIAL_TRANSACTIONS: Transaction[] = [
  // Listopad 2025
  { id: 't1', amount: 156.50, description: 'Zakupy spożywcze Lidl', type: TransactionType.EXPENSE, category: Category.FOOD, date: '2025-11-26T14:30:00.000Z' },
  { id: 't2', amount: 45.00, description: 'Uber z centrum', type: TransactionType.EXPENSE, category: Category.TRANSPORT, date: '2025-11-24T22:15:00.000Z' },
  { id: 't3', amount: 120.00, description: 'Kino - Diuna 3', type: TransactionType.EXPENSE, category: Category.ENTERTAINMENT, date: '2025-11-20T19:00:00.000Z' },
  { id: 't4', amount: 350.00, description: 'Paliwo Orlen', type: TransactionType.EXPENSE, category: Category.TRANSPORT, date: '2025-11-15T08:45:00.000Z' },
  { id: 't5', amount: 9200.00, description: 'Wynagrodzenie Listopad', type: TransactionType.INCOME, category: Category.SALARY, date: '2025-11-10T09:00:00.000Z' },
  { id: 't6', amount: 2800.00, description: 'Czynsz i opłaty', type: TransactionType.EXPENSE, category: Category.HOUSING, date: '2025-11-05T10:00:00.000Z' },
  { id: 't_shop1', amount: 249.99, description: 'Nowe buty Zalando', type: TransactionType.EXPENSE, category: Category.SHOPPING, date: '2025-11-02T16:20:00.000Z' },

  // Październik 2025
  { id: 't7', amount: 320.00, description: 'Wizyta u stomatologa', type: TransactionType.EXPENSE, category: Category.HEALTH, date: '2025-10-28T11:30:00.000Z' },
  { id: 't8', amount: 215.80, description: 'Kolacja rocznicowa', type: TransactionType.EXPENSE, category: Category.FOOD, date: '2025-10-20T20:00:00.000Z' },
  { id: 't9', amount: 9200.00, description: 'Wynagrodzenie Październik', type: TransactionType.INCOME, category: Category.SALARY, date: '2025-10-10T09:00:00.000Z' },
  { id: 't10', amount: 120.00, description: 'Karnet na siłownię', type: TransactionType.EXPENSE, category: Category.HEALTH, date: '2025-10-02T16:00:00.000Z' },

  // Wrzesień 2025
  { id: 't11', amount: 500.00, description: 'Naprawa samochodu', type: TransactionType.EXPENSE, category: Category.TRANSPORT, date: '2025-09-25T14:00:00.000Z' },
  { id: 't12', amount: 9200.00, description: 'Wynagrodzenie Wrzesień', type: TransactionType.INCOME, category: Category.SALARY, date: '2025-09-10T09:00:00.000Z' },
  { id: 't13', amount: 1500.00, description: 'Zakup obligacji skarbowych', type: TransactionType.EXPENSE, category: Category.INVESTMENTS, date: '2025-09-05T12:00:00.000Z' },

  // Sierpień 2025
  { id: 't14', amount: 2400.00, description: 'Wyjazd wakacyjny (hotel)', type: TransactionType.EXPENSE, category: Category.ENTERTAINMENT, date: '2025-08-15T14:00:00.000Z' },
  { id: 't15', amount: 9200.00, description: 'Wynagrodzenie Sierpień', type: TransactionType.INCOME, category: Category.SALARY, date: '2025-08-10T09:00:00.000Z' },
  { id: 't16', amount: 450.00, description: 'Bilety PKP (wakacje)', type: TransactionType.EXPENSE, category: Category.TRANSPORT, date: '2025-08-01T08:00:00.000Z' },

  // Lipiec 2025
  { id: 't17', amount: 200.00, description: 'Prezent urodzinowy mamy', type: TransactionType.EXPENSE, category: Category.OTHER, date: '2025-07-20T18:00:00.000Z' },
  { id: 't18', amount: 9000.00, description: 'Wynagrodzenie Lipiec', type: TransactionType.INCOME, category: Category.SALARY, date: '2025-07-10T09:00:00.000Z' },
  { id: 't19', amount: 350.00, description: 'Zakupy odzieżowe H&M', type: TransactionType.EXPENSE, category: Category.SHOPPING, date: '2025-07-05T17:30:00.000Z' },

  // Czerwiec 2025
  { id: 't20', amount: 180.00, description: 'Subskrypcje roczne (Spotify)', type: TransactionType.EXPENSE, category: Category.ENTERTAINMENT, date: '2025-06-15T10:00:00.000Z' },
  { id: 't21', amount: 9000.00, description: 'Wynagrodzenie Czerwiec', type: TransactionType.INCOME, category: Category.SALARY, date: '2025-06-10T09:00:00.000Z' },
  { id: 't22', amount: 2800.00, description: 'Czynsz i opłaty', type: TransactionType.EXPENSE, category: Category.HOUSING, date: '2025-06-05T10:00:00.000Z' },

  // Maj 2025
  { id: 't23', amount: 145.00, description: 'Pizza ze znajomymi', type: TransactionType.EXPENSE, category: Category.FOOD, date: '2025-05-28T20:30:00.000Z' },
  { id: 't24', amount: 9000.00, description: 'Wynagrodzenie Maj', type: TransactionType.INCOME, category: Category.SALARY, date: '2025-05-27T09:00:00.000Z' }
];

export const CURRENCY_FORMATTER = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
});