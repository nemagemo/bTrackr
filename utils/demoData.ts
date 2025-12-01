
import { Transaction, TransactionType, CategoryItem } from '../types';
import { SYSTEM_IDS } from '../constants';

export const generateDemoTransactions = (categories: CategoryItem[]): Transaction[] => {
  const transactions: Transaction[] = [];
  
  // Helper to find cat ID by name (partially matching)
  const getCatId = (namePart: string, type: TransactionType): string => {
    const cat = categories.find(c => c.type === type && c.name.toLowerCase().includes(namePart.toLowerCase()));
    return cat ? cat.id : (categories.find(c => c.type === type)?.id || '');
  };

  const getSubId = (catId: string, subName: string): string => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return '';
    const sub = cat.subcategories.find(s => s.name.toLowerCase() === subName.toLowerCase()) || cat.subcategories.find(s => s.name === 'Inne');
    return sub ? sub.id : '';
  };

  // Config
  const START_DATE = new Date(2020, 11, 1); // Dec 1, 2020
  
  // Dynamically set end date to the last day of the current month
  const now = new Date();
  const END_DATE = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  let currentDate = new Date(START_DATE);
  
  // Salary base (increases over years)
  let baseSalary = 6500;

  while (currentDate <= END_DATE) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const day = currentDate.getDate();
    
    const formattedDate = currentDate.toISOString().split('T')[0];

    // --- 1. MONTHLY INCOME (1st of month) ---
    if (day === 1) {
       // Yearly raise
       if (month === 0) baseSalary += 500; // Raise in January

       // Salary
       const salaryCat = SYSTEM_IDS.SALARY;
       transactions.push({
          id: crypto.randomUUID(),
          date: formattedDate,
          amount: baseSalary + (Math.random() * 200), // Slight variation
          description: 'Wynagrodzenie',
          type: TransactionType.INCOME,
          categoryId: salaryCat,
          subcategoryId: getSubId(salaryCat, 'Wypłata')
       });

       // Random Bonus (quarterly)
       if (month % 3 === 0 && Math.random() > 0.5) {
          transactions.push({
             id: crypto.randomUUID(),
             date: formattedDate,
             amount: 1000 + Math.random() * 2000,
             description: 'Premia kwartalna',
             type: TransactionType.INCOME,
             categoryId: salaryCat,
             subcategoryId: getSubId(salaryCat, 'Premie')
          });
       }
    }

    // --- 2. FIXED EXPENSES (Bills) ---
    if (day === 10) {
        // Rent / Mortgage (inflation adjustment)
        const rentBase = 2000 + (year - 2020) * 100;
        const housingCat = getCatId('Dom', TransactionType.EXPENSE);
        transactions.push({
            id: crypto.randomUUID(),
            date: formattedDate,
            amount: rentBase,
            description: 'Czynsz / Kredyt',
            type: TransactionType.EXPENSE,
            categoryId: housingCat,
            subcategoryId: getSubId(housingCat, 'Czynsz')
        });

        // Internet
        transactions.push({
            id: crypto.randomUUID(),
            date: formattedDate,
            amount: 60 + (year - 2020) * 5,
            description: 'Internet UPC',
            type: TransactionType.EXPENSE,
            categoryId: housingCat,
            subcategoryId: getSubId(housingCat, 'Internet')
        });
        
        // Electricity
        transactions.push({
            id: crypto.randomUUID(),
            date: formattedDate,
            amount: 150 + Math.random() * 50,
            description: 'PGE Prąd',
            type: TransactionType.EXPENSE,
            categoryId: housingCat,
            subcategoryId: getSubId(housingCat, 'Prąd')
        });
    }

    // --- 3. VARIABLE EXPENSES (Random days) ---
    
    // Groceries (every ~3 days)
    if (Math.random() > 0.6) {
        const foodCat = getCatId('Jedzenie', TransactionType.EXPENSE);
        const shops = ['Biedronka', 'Lidl', 'Auchan', 'Żabka', 'Piekarnia'];
        const shop = shops[Math.floor(Math.random() * shops.length)];
        transactions.push({
            id: crypto.randomUUID(),
            date: formattedDate,
            amount: 50 + Math.random() * 200,
            description: `Zakupy ${shop}`,
            type: TransactionType.EXPENSE,
            categoryId: foodCat,
            subcategoryId: getSubId(foodCat, 'Zakupy spożywcze')
        });
    }

    // Transport (every ~5 days)
    if (Math.random() > 0.8) {
        const transCat = getCatId('Transport', TransactionType.EXPENSE);
        transactions.push({
            id: crypto.randomUUID(),
            date: formattedDate,
            amount: 150 + Math.random() * 100,
            description: 'Stacja Paliw Orlen',
            type: TransactionType.EXPENSE,
            categoryId: transCat,
            subcategoryId: getSubId(transCat, 'Paliwo'),
            tags: Math.random() > 0.5 ? ['auto'] : []
        });
    }

    // Eating Out (Weekend? Friday/Saturday)
    const weekDay = currentDate.getDay();
    if ((weekDay === 5 || weekDay === 6) && Math.random() > 0.5) {
        const foodCat = getCatId('Jedzenie', TransactionType.EXPENSE);
        transactions.push({
            id: crypto.randomUUID(),
            date: formattedDate,
            amount: 100 + Math.random() * 150,
            description: 'Restauracja włoska',
            type: TransactionType.EXPENSE,
            categoryId: foodCat,
            subcategoryId: getSubId(foodCat, 'Restauracje'),
            tags: ['weekend', 'randka']
        });
    }

    // --- 4. SEASONAL & TAGGED EVENTS ---

    // Summer Holidays (July/August)
    if ((month === 6 || month === 7) && day === 15) {
        const travelCat = getCatId('Podróże', TransactionType.EXPENSE);
        transactions.push({
            id: crypto.randomUUID(),
            date: formattedDate,
            amount: 2500 + Math.random() * 1000,
            description: 'Hotel Wakacje',
            type: TransactionType.EXPENSE,
            categoryId: travelCat,
            subcategoryId: getSubId(travelCat, 'Noclegi'),
            tags: ['wakacje', `lato${year}`]
        });
    }

    // Christmas (December)
    if (month === 11 && day > 15 && day < 24 && Math.random() > 0.7) {
        const shopCat = getCatId('Zakupy', TransactionType.EXPENSE);
        transactions.push({
            id: crypto.randomUUID(),
            date: formattedDate,
            amount: 200 + Math.random() * 400,
            description: 'Prezenty świąteczne',
            type: TransactionType.EXPENSE,
            categoryId: shopCat,
            subcategoryId: getSubId(shopCat, 'Prezenty'), // Assumes subcategory exists or maps to Inne
            tags: ['święta', 'prezenty']
        });
    }

    // Specific Project: Renovation (May 2023)
    if (year === 2023 && month === 4 && Math.random() > 0.7) {
        const housingCat = getCatId('Dom', TransactionType.EXPENSE);
        transactions.push({
            id: crypto.randomUUID(),
            date: formattedDate,
            amount: 500 + Math.random() * 2000,
            description: 'Materiały budowlane Castorama',
            type: TransactionType.EXPENSE,
            categoryId: housingCat,
            subcategoryId: getSubId(housingCat, 'Remonty'),
            tags: ['remont']
        });
    }

    // Car Maintenance (Once a year, March)
    if (month === 2 && day === 20) {
        const transCat = getCatId('Transport', TransactionType.EXPENSE);
        transactions.push({
            id: crypto.randomUUID(),
            date: formattedDate,
            amount: 800 + Math.random() * 400,
            description: 'Przegląd i Ubezpieczenie',
            type: TransactionType.EXPENSE,
            categoryId: transCat,
            subcategoryId: getSubId(transCat, 'Serwis'),
            tags: ['auto']
        });
    }

    // --- 5. SAVINGS ---
    if (day === 2) {
       const savingsCat = SYSTEM_IDS.SAVINGS;
       transactions.push({
          id: crypto.randomUUID(),
          date: formattedDate,
          amount: 1000 + (year - 2020)*200,
          description: 'Przelew na oszczędnościowe',
          type: TransactionType.EXPENSE,
          categoryId: savingsCat,
          subcategoryId: getSubId(savingsCat, 'Poduszka finansowa')
       });
    }

    // Advance to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
