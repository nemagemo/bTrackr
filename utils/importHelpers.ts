
import { TransactionType, CategoryItem, Transaction } from '../types';
import { KEYWORD_TO_CATEGORY_NAME } from '../constants';

// --- Types ---

export type ColumnMapping = 'date' | 'amount' | 'description' | 'category' | 'skip';
export type ImportStep = 'UPLOAD' | 'MAP' | 'DATE_CORRECTION' | 'RECONCILE' | 'DECISION' | 'GROUP' | 'BACKUP_CONFIRM';
export type DateFormat = 'DD-MM-YYYY' | 'MM-DD-YYYY' | 'YYYY-MM-DD';

export interface GroupedTransaction {
  signature: string;
  example: string;
  count: number;
  ids: string[];
  currentCategoryName: string;
  currentSubcategoryName: string;
  enabled: boolean;
}

export interface RawTransactionRow {
  dateStr: string;
  amount: number;
  description: string;
  categoryName: string;
  originalRow: string[];
}

export const IGNORED_PREFIXES = [
  'platnosc', 'płatność', 'transakcja', 'karta', 'kartą', 'zakup', 
  'przelew', 'terminal', 'pos', 'nr', 'rezerwacja', 'oplata', 'opłata',
  'wyplata', 'wypłata', 'obciazenie', 'obciążenie', 'blokada', 'sprzedaż', 
  'zlec', 'zlecenie', 'tytul', 'tytułem', 'numer', 'rachunek', 'faktura', 'vat'
];

// --- Helpers ---

export const flattenJsonToTable = (json: any[]): string[][] => {
  if (json.length === 0) return [];
  
  const keys = Array.from(new Set(json.flatMap(obj => Object.keys(obj))));
  const header = keys;
  const rows = json.map(obj => {
      return keys.map(key => {
          const val = obj[key];
          if (val === null || val === undefined) return '';
          return String(val);
      });
  });

  return [header, ...rows];
};

export const parseAmount = (val: string, decimalSeparator: ',' | '.' = ','): number => {
  let clean = val.replace(/[^\d.,-]/g, '');
  if (decimalSeparator === ',') clean = clean.replace(',', '.');
  return parseFloat(clean);
};

export const parseDateStrict = (val: string, format: DateFormat): string | null => {
  const parts = val.split(/[\.\-\/]/);
  if (parts.length !== 3) return null;

  let d = 0, m = 0, y = 0;

  if (format === 'DD-MM-YYYY') {
      d = parseInt(parts[0]); m = parseInt(parts[1]); y = parseInt(parts[2]);
  } else if (format === 'MM-DD-YYYY') {
      m = parseInt(parts[0]); d = parseInt(parts[1]); y = parseInt(parts[2]);
  } else if (format === 'YYYY-MM-DD') {
      y = parseInt(parts[0]); m = parseInt(parts[1]); d = parseInt(parts[2]);
  }

  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;
  if (y < 100) y += 2000;
  if (y < 2000 || y > 2100) return null;

  // Use noon (12:00) to avoid timezone issues
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
};

export const guessDateFormatFromValue = (val: string): DateFormat | null => {
  const isValid = (dStr: string, fmt: DateFormat) => parseDateStrict(dStr, fmt) !== null;
  if (isValid(val, 'YYYY-MM-DD')) return 'YYYY-MM-DD';
  if (isValid(val, 'DD-MM-YYYY')) return 'DD-MM-YYYY';
  if (isValid(val, 'MM-DD-YYYY')) return 'MM-DD-YYYY';
  return null;
};

export const guessMappings = (rows: string[][]): Record<number, ColumnMapping> => {
  const headerRow = rows[0];
  const dataRow = rows.length > 1 ? rows[1] : rows[0];
  const newMappings: Record<number, ColumnMapping> = {};
  const isDate = (val: string) => /^\d{4}-\d{2}-\d{2}/.test(val) || /^\d{2}[.-]\d{2}[.-]\d{4}/.test(val);
  const isNaturalNumber = (val: string) => /^\d+$/.test(val);
  const isAmount = (val: string) => /^-?\d+[.,\s]?\d*[.,]?\d*$/.test(val) || val.includes('PLN') || val.includes('zł');

  let maxLen = 0;
  let descIndex = -1;

  dataRow.forEach((cell, index) => {
    const val = cell ? cell.trim() : '';
    const len = val.length;
    
    if (isDate(val)) { 
      newMappings[index] = 'date'; 
      return; 
    }
    
    if (isNaturalNumber(val)) {
      newMappings[index] = 'skip';
      return;
    }

    if (isAmount(val) && len < 20) { 
      newMappings[index] = 'amount'; 
      return; 
    }
    
    if (headerRow && ['kategoria', 'category', 'typ'].some(k => headerRow[index]?.toLowerCase().includes(k))) { 
      newMappings[index] = 'category'; 
      return; 
    }

    if (len > maxLen) { 
      maxLen = len; 
      descIndex = index; 
    }
  });

  if (descIndex !== -1 && !newMappings[descIndex]) newMappings[descIndex] = 'description';
  dataRow.forEach((_, index) => { if (!newMappings[index]) newMappings[index] = 'skip'; });
  return newMappings;
};

export const detectCategoryNameFromDesc = (desc: string): string | null => {
  const lower = desc.toLowerCase();
  for (const [key, catName] of Object.entries(KEYWORD_TO_CATEGORY_NAME)) {
    if (lower.includes(key.toLowerCase())) return catName;
  }
  return null;
};

export const analyzeGroups = (items: any[]): GroupedTransaction[] => {
  const groups: Record<string, { ids: string[], example: string, count: number }> = {};
  items.forEach(t => {
    // Analizujemy tylko wydatki, które są nieskategoryzowane ("Inne")
    if (t.type === TransactionType.EXPENSE && (t.categoryName === 'Inne' || !t.categoryName) && t.description !== 'Bez opisu') {
      let clean = t.description.toLowerCase().replace(/[^\w\s\u00C0-\u017F]/g, ' ');
      const tokens = clean.split(/\s+/).filter(Boolean);
      let start = 0;
      while(start < tokens.length && (IGNORED_PREFIXES.includes(tokens[start]) || /^\d+$/.test(tokens[start]))) start++;
      const sig = tokens.slice(start, start + 2).join(' ');
      if (sig.length < 3) return;

      if (!groups[sig]) groups[sig] = { ids: [], example: t.description, count: 0 };
      groups[sig].ids.push(t.id);
      groups[sig].count++;
    }
  });
  return Object.entries(groups).map(([s, d]) => ({
    signature: s, example: d.example, count: d.count, ids: d.ids, currentCategoryName: 'Inne', currentSubcategoryName: 'Inne', enabled: true
  })).filter(g => g.count > 1).sort((a, b) => b.count - a.count);
};

export const parseRawData = (
    rawFile: string[][], 
    mappings: Record<number, ColumnMapping>, 
    dateFormat: DateFormat,
    hasHeader: boolean
): { validItems: any[], failedRows: RawTransactionRow[] } => {
    const _validItems: any[] = [];
    const _failedRows: RawTransactionRow[] = [];
    const startIndex = hasHeader ? 1 : 0;

    for (let i = startIndex; i < rawFile.length; i++) {
      const row = rawFile[i];
      let dateStr = '';
      let amount = 0;
      let description = 'Bez opisu';
      let categoryName = 'Inne';
      let foundInCsv = false;

      Object.entries(mappings).forEach(([colIndex, type]) => {
        const val = row[parseInt(colIndex)];
        if (!val) return;
        switch (type) {
          case 'date': dateStr = val.trim(); break;
          case 'amount': amount = parseAmount(val); break;
          case 'description': description = val; break;
          case 'category': categoryName = val; foundInCsv = true; break;
        }
      });

      if (amount === 0 && !dateStr) continue;

      const validDateISO = parseDateStrict(dateStr, dateFormat);

      const rawRowObj: RawTransactionRow = {
          dateStr, amount, description, categoryName: foundInCsv ? categoryName : '', originalRow: row
      };

      if (validDateISO) {
         let finalCatName = categoryName;
         if (!foundInCsv) {
            // Automatyczna kategoryzacja
            if (amount > 0) finalCatName = 'Wynagrodzenie';
            else {
                const detected = detectCategoryNameFromDesc(description);
                if (detected) finalCatName = detected;
            }
         }
         
         _validItems.push({
            id: crypto.randomUUID(),
            date: validDateISO,
            amount: Math.abs(amount),
            description,
            type: amount > 0 ? TransactionType.INCOME : TransactionType.EXPENSE,
            categoryName: finalCatName
         });
      } else {
         _failedRows.push(rawRowObj);
      }
    }
    
    return { validItems: _validItems, failedRows: _failedRows };
};
