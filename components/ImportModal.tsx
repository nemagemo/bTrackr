
import React, { useState, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import { X, Upload, FileSpreadsheet, AlertCircle, Check, ArrowRight, Settings2, Layers, Trash2, FilePlus, AlertTriangle, Link, TrendingUp, TrendingDown, Sparkles, CalendarDays, RefreshCw, FileJson } from 'lucide-react';
import { Button } from './Button';
import { Transaction, TransactionType, CategoryItem, SubcategoryItem, BackupData } from '../types';
import { KEYWORD_TO_CATEGORY_NAME } from '../constants';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (transactions: Transaction[], clearHistory: boolean, newCategories?: CategoryItem[]) => void;
  onRestore?: (backup: BackupData) => void;
  hasExistingTransactions: boolean;
  categories: CategoryItem[];
}

// Definicje stanów maszyny importu
type ColumnMapping = 'date' | 'amount' | 'description' | 'category' | 'skip';
type ImportStep = 'UPLOAD' | 'MAP' | 'DATE_CORRECTION' | 'RECONCILE' | 'DECISION' | 'GROUP' | 'BACKUP_CONFIRM';
type DateFormat = 'DD-MM-YYYY' | 'MM-DD-YYYY' | 'YYYY-MM-DD';

interface GroupedTransaction {
  signature: string;
  example: string;
  count: number;
  ids: string[];
  currentCategoryName: string; // Used for UI
  currentSubcategoryName: string; // Used for UI
  enabled: boolean;
}

interface ConflictItem {
  fileCategory: string;
  fileSubcategory?: string;
  type: TransactionType; // Infer from one of the transactions
  count: number;
}

interface ReconciliationMapping {
  targetCategoryId: string;
  targetSubcategoryId?: string;
}

interface RawTransactionRow {
  dateStr: string;
  amount: number;
  description: string;
  categoryName: string;
  // Metadata for re-parsing
  originalRow: string[];
}

const IGNORED_PREFIXES = [
  'platnosc', 'płatność', 'transakcja', 'karta', 'kartą', 'zakup', 
  'przelew', 'terminal', 'pos', 'nr', 'rezerwacja', 'oplata', 'opłata',
  'wyplata', 'wypłata', 'obciazenie', 'obciążenie', 'blokada', 'sprzedaż', 
  'zlec', 'zlecenie', 'tytul', 'tytułem', 'numer', 'rachunek', 'faktura', 'vat'
];

/**
 * Komponent Importu.
 * Obsługuje import plików CSV (banki) oraz JSON (backupy bTrackr).
 * Posiada maszynę stanów (steps) do obsługi skomplikowanego procesu mapowania i czyszczenia danych.
 */
export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport, onRestore, hasExistingTransactions, categories }) => {
  const [step, setStep] = useState<ImportStep>('UPLOAD');
  const [importMode, setImportMode] = useState<'APPEND' | 'REPLACE'>('APPEND');
  const [importedFile, setImportedFile] = useState<File | null>(null);
  
  // Przechowuje surowe dane jako tablicę 2D stringów.
  // Używane jako "źródło prawdy" dla obu typów plików (po spłaszczeniu JSON).
  const [rawFile, setRawFile] = useState<string[][]>([]);
  
  const [mappings, setMappings] = useState<Record<number, ColumnMapping>>({});
  const [hasHeader, setHasHeader] = useState(true);
  const [decimalSeparator, setDecimalSeparator] = useState<',' | '.'>(',');
  const [primaryDateFormat, setPrimaryDateFormat] = useState<DateFormat>('YYYY-MM-DD');
  const [error, setError] = useState<string>('');
  
  // Backup State
  const [backupData, setBackupData] = useState<BackupData | null>(null);

  // Staging area for Parsed Items
  const [validItems, setValidItems] = useState<any[]>([]);
  const [failedRows, setFailedRows] = useState<RawTransactionRow[]>([]);
  const [secondaryDateFormat, setSecondaryDateFormat] = useState<DateFormat>('DD-MM-YYYY');
  const [correctionPreview, setCorrectionPreview] = useState<{original: string, parsed: string}[]>([]);
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [detectedGroups, setDetectedGroups] = useState<GroupedTransaction[]>([]);
  
  // Reconciliation State (Legacy logic preserved but hidden in simplified flow)
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [reconciliationMap, setReconciliationMap] = useState<Record<string, ReconciliationMapping>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Helper to convert array of objects to 2D string array for "CSV-like" processing
  const flattenJsonToTable = (json: any[]): string[][] => {
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

  /**
   * Główny handler uploadu.
   * Rozróżnia CSV (PapaParse) i JSON.
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportedFile(file);
    setError('');
    setConflicts([]);
    setReconciliationMap({});
    setValidItems([]);
    setFailedRows([]);
    setCorrectionPreview([]);
    setBackupData(null);

    // --- JSON HANDLING ---
    if (file.name.toLowerCase().endsWith('.json')) {
       const reader = new FileReader();
       reader.onload = (event) => {
          try {
             const json = JSON.parse(event.target?.result as string);
             
             // SCENARIO 1: It's a bTrackr Backup (pełna struktura z settings i categories)
             if (json.categories && json.transactions && Array.isArray(json.categories) && Array.isArray(json.transactions)) {
                setBackupData(json as BackupData);
                setStep('BACKUP_CONFIRM');
                return;
             } 
             
             // SCENARIO 2: It's a List of Data (e.g. export from other bank API or simple JSON list)
             let dataArray: any[] = [];
             if (Array.isArray(json)) {
                 dataArray = json;
             } else if (typeof json === 'object' && json !== null) {
                 const possibleArray = Object.values(json).find(v => Array.isArray(v));
                 if (possibleArray) dataArray = possibleArray as any[];
             }

             if (dataArray.length > 0) {
                 // Spłaszczamy JSON do tabeli, by użyć tej samej logiki mapowania co dla CSV
                 const tableData = flattenJsonToTable(dataArray);
                 if (tableData.length > 0) {
                     setRawFile(tableData); 
                     
                     if (hasExistingTransactions) {
                        setStep('DECISION');
                     } else {
                        setStep('MAP');
                        guessMappings(tableData);
                     }
                     return;
                 }
             }

             setError("Plik JSON nie zawiera rozpoznawalnej struktury (ani Backup, ani lista transakcji).");

          } catch (err) {
             setError("Błąd odczytu pliku JSON. Sprawdź składnię.");
          }
       };
       reader.readAsText(file);
       return;
    }

    // --- CSV HANDLING ---
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const rows = results.data as string[][];
          setRawFile(rows); // Store all rows
          
          if (hasExistingTransactions) {
              setStep('DECISION');
          } else {
              setStep('MAP');
              guessMappings(rows.slice(0, 6));
          }
        } else {
          setError('Plik pusty.');
        }
      },
      error: (err) => setError(err.message)
    });
  };

  const handleBackupRestore = () => {
     if (backupData && onRestore) {
        onRestore(backupData);
        handleClose();
     }
  };

  const handleDecision = (mode: 'APPEND' | 'REPLACE') => {
    setImportMode(mode);
    setStep('MAP');
    if (rawFile.length > 0) {
        guessMappings(rawFile.slice(0, 6));
    }
  };
  
  // Algorytm zgadywania kolumn na podstawie zawartości (Data, Kwota, etc.)
  const guessMappings = (rows: string[][]) => {
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
    setMappings(newMappings);
  };
  
  const parseAmount = (val: string): number => {
    let clean = val.replace(/[^\d.,-]/g, '');
    if (decimalSeparator === ',') clean = clean.replace(',', '.');
    return parseFloat(clean);
  };

  const guessDateFormatFromValue = (val: string): DateFormat | null => {
    const isValid = (dStr: string, fmt: DateFormat) => parseDateStrict(dStr, fmt) !== null;
    if (isValid(val, 'YYYY-MM-DD')) return 'YYYY-MM-DD';
    if (isValid(val, 'DD-MM-YYYY')) return 'DD-MM-YYYY';
    if (isValid(val, 'MM-DD-YYYY')) return 'MM-DD-YYYY';
    return null;
  };

  const parseDateStrict = (val: string, format: DateFormat): string | null => {
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

    // Use noon (12:00) to avoid timezone issues shifting the day backwards
    return new Date(y, m - 1, d, 12, 0, 0).toISOString();
  };

  const detectCategoryNameFromDesc = (desc: string): string | null => {
    const lower = desc.toLowerCase();
    for (const [key, catName] of Object.entries(KEYWORD_TO_CATEGORY_NAME)) {
      if (lower.includes(key.toLowerCase())) return catName;
    }
    return null;
  };

  // Główna logika przetwarzania: Mapa -> Obiekty Transakcji
  const handleParseAndAnalyze = () => {
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

      const validDateISO = parseDateStrict(dateStr, primaryDateFormat);

      const rawRowObj: RawTransactionRow = {
          dateStr, amount, description, categoryName: foundInCsv ? categoryName : '', originalRow: row
      };

      if (validDateISO) {
         let finalCatName = categoryName;
         if (!foundInCsv) {
            // Automatyczna kategoryzacja na podstawie słów kluczowych
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

    setValidItems(_validItems);
    setFailedRows(_failedRows);

    // Jeśli są błędy (np. zły format daty), pokaż ekran korekty
    if (_failedRows.length > 0) {
       const sample = _failedRows[0].dateStr;
       const guess = guessDateFormatFromValue(sample);
       const suggestion = guess && guess !== primaryDateFormat ? guess : (primaryDateFormat === 'DD-MM-YYYY' ? 'MM-DD-YYYY' : 'DD-MM-YYYY');
       
       setSecondaryDateFormat(suggestion);
       const preview = _failedRows.slice(0, 3).map(r => ({
           original: r.dateStr,
           parsed: parseDateStrict(r.dateStr, suggestion) || 'Błąd'
       }));
       setCorrectionPreview(preview);
       setStep('DATE_CORRECTION');
    } else {
       proceedToGrouping(_validItems);
    }
  };

  const handleApplyCorrection = () => {
      const fixedItems: any[] = [];
      failedRows.forEach(r => {
          const validDateISO = parseDateStrict(r.dateStr, secondaryDateFormat);
          if (validDateISO) {
             let finalCatName = r.categoryName || 'Inne';
             if (!r.categoryName) {
                if (r.amount > 0) finalCatName = 'Wynagrodzenie';
                else {
                    const detected = detectCategoryNameFromDesc(r.description);
                    if (detected) finalCatName = detected;
                }
             }
             fixedItems.push({
                id: crypto.randomUUID(),
                date: validDateISO,
                amount: Math.abs(r.amount),
                description: r.description,
                type: r.amount > 0 ? TransactionType.INCOME : TransactionType.EXPENSE,
                categoryName: finalCatName
             });
          }
      });
      const merged = [...validItems, ...fixedItems];
      proceedToGrouping(merged);
  };

  const handleSecondaryFormatChange = (fmt: DateFormat) => {
      setSecondaryDateFormat(fmt);
      const preview = failedRows.slice(0, 3).map(r => ({
          original: r.dateStr,
          parsed: parseDateStrict(r.dateStr, fmt) || 'Nadal błąd'
      }));
      setCorrectionPreview(preview);
  };

  const proceedToGrouping = (items: any[]) => {
      setPendingItems(items);
      const groups = analyzeGroups(items);
      if (groups.length > 0) {
        setDetectedGroups(groups);
        setStep('GROUP');
      } else {
        finalizeImport(items);
      }
  };

  /**
   * Algorytm wykrywania powtarzalnych wzorców transakcji (np. "UBER *TRIP").
   * Pozwala użytkownikowi przypisać kategorię do całej grupy naraz.
   */
  const analyzeGroups = (items: any[]): GroupedTransaction[] => {
    const groups: Record<string, { ids: string[], example: string, count: number }> = {};
    items.forEach(t => {
      // Analizujemy tylko wydatki, które są nieskategoryzowane ("Inne")
      if (t.type === TransactionType.EXPENSE && (t.categoryName === 'Inne' || !t.categoryName) && t.description !== 'Bez opisu') {
        let clean = t.description.toLowerCase().replace(/[^\w\s\u00C0-\u017F]/g, ' ');
        const tokens = clean.split(/\s+/).filter(Boolean);
        let start = 0;
        // Pomiń ignorowane prefixy ("płatność kartą...")
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

  const handleUpdateGroupCategory = (sig: string, catName: string) => {
    // Find the category to see if we can auto-select 'Inne' or the single subcategory
    const cat = categories.find(c => c.name === catName);
    let defaultSub = '';
    if (cat && cat.subcategories.length === 1) {
        defaultSub = cat.subcategories[0].name;
    } else if (cat && cat.subcategories.find(s => s.name === 'Inne')) {
        defaultSub = 'Inne'; // Auto-select Inne
    }

    setDetectedGroups(prev => prev.map(g => g.signature === sig ? { ...g, currentCategoryName: catName, currentSubcategoryName: defaultSub } : g));
  };
  
  const handleUpdateGroupSubcategory = (sig: string, subName: string) => {
    setDetectedGroups(prev => prev.map(g => g.signature === sig ? { ...g, currentSubcategoryName: subName } : g));
  };
  
  const toggleGroup = (sig: string) => {
    setDetectedGroups(prev => prev.map(g => g.signature === sig ? { ...g, enabled: !g.enabled } : g));
  };

  /**
   * Finalizacja importu.
   * Tworzy brakujące kategorie i przekazuje transakcje do App.tsx.
   */
  const finalizeImport = (items: any[]) => {
    let processedItems = items.map(item => {
      const group = detectedGroups.find(g => g.ids.includes(item.id));
      if (group && group.enabled) {
         return { 
           ...item, 
           categoryName: group.currentCategoryName,
           subcategoryName: group.currentSubcategoryName || 'Inne' // Default to Inne if empty
         };
      }
      return item;
    });

    const finalTransactions: Transaction[] = [];
    const categoriesToSave = new Map<string, CategoryItem>();
    const currentCategoriesMap = new Map<string, CategoryItem>(categories.map(c => [c.name.toLowerCase(), c]));

    const getMutableCategory = (name: string, type: TransactionType): CategoryItem => {
        const lower = name.toLowerCase();
        let cat = categoriesToSave.get(lower);
        if (cat) return cat;

        const existing = currentCategoriesMap.get(lower);
        if (existing) {
           cat = { ...existing, subcategories: [...existing.subcategories] };
        } else {
           cat = {
            id: crypto.randomUUID(),
            name: name,
            type: type,
            color: '#64748b',
            isSystem: false,
            subcategories: [{ id: crypto.randomUUID(), name: 'Inne' }]
           };
        }
        categoriesToSave.set(lower, cat);
        return cat;
    };

    processedItems.forEach(item => {
      let categoryId = '';
      let subcategoryId: string | undefined = undefined;

      const catName = item.categoryName || 'Inne';
      let matchedCat = getMutableCategory(catName, item.type);
      categoryId = matchedCat.id;

      const subName = item.subcategoryName || 'Inne';
      const existingSub = matchedCat.subcategories.find(s => s.name.toLowerCase() === subName.toLowerCase());
      
      if (existingSub) {
        subcategoryId = existingSub.id;
      } else {
        const newSub = { id: crypto.randomUUID(), name: subName };
        matchedCat.subcategories.push(newSub);
        subcategoryId = newSub.id;
      }

      finalTransactions.push({
        id: item.id,
        date: item.date,
        amount: item.amount,
        description: item.description,
        type: item.type,
        categoryId,
        subcategoryId
      });
    });

    onImport(finalTransactions, importMode === 'REPLACE', Array.from(categoriesToSave.values()));
    handleClose();
  };

  const handleClose = () => {
    setStep('UPLOAD');
    setImportedFile(null);
    setRawFile([]);
    setPendingItems([]);
    setDetectedGroups([]);
    setConflicts([]);
    setReconciliationMap({});
    setValidItems([]);
    setFailedRows([]);
    setCorrectionPreview([]);
    setBackupData(null);
    onClose();
  };

  const renderConflictList = (items: ConflictItem[]) => {
      return (
        <div className="border rounded-xl overflow-hidden text-sm">
             <div className="p-4 bg-slate-50 text-slate-500 text-center">Widok dopasowania kategorii (uproszczony)</div>
        </div>
      );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <h2 className="text-lg font-bold text-slate-800">
            {step === 'UPLOAD' && 'Importuj dane'}
            {step === 'MAP' && 'Dopasuj kolumny i format'}
            {step === 'DATE_CORRECTION' && 'Korekta błędnych dat'}
            {step === 'GROUP' && 'Wykryte grupy'}
            {step === 'DECISION' && 'Wykryto dane'}
            {step === 'RECONCILE' && 'Dopasuj kategorie'}
            {step === 'BACKUP_CONFIRM' && 'Przywracanie kopii zapasowej'}
          </h2>
          <button onClick={handleClose}><X size={24} className="text-slate-400"/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {step === 'UPLOAD' && (
             <div className="h-64 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center relative bg-white transition-colors hover:border-indigo-400">
               <input ref={fileInputRef} type="file" accept=".csv, .json" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
               <div className="flex gap-4 text-slate-300 mb-4">
                  <FileSpreadsheet size={48} />
                  <FileJson size={48} />
               </div>
               <p className="text-slate-600 font-medium">Upuść plik lub kliknij, aby wybrać</p>
               <p className="text-xs text-slate-400 mt-2 text-center max-w-md">
                  Obsługiwane: <br/>
                  <strong>.csv</strong> - wyciągi bankowe<br/>
                  <strong>.json</strong> - kopie zapasowe LUB listy transakcji
               </p>
               {error && <p className="text-red-500 mt-2 font-medium bg-red-50 px-3 py-1 rounded">{error}</p>}
             </div>
          )}
          
          {step === 'BACKUP_CONFIRM' && backupData && (
              <div className="max-w-md mx-auto text-center space-y-6 pt-6">
                 <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                    <FileJson size={32} />
                 </div>
                 
                 <div>
                    <h3 className="text-xl font-bold text-slate-900">Przywrócić kopię zapasowej?</h3>
                    <p className="text-sm text-slate-500 mt-2">
                       Wykryto pełną kopię zapasową bTrackr.<br/>
                       Data: <span className="font-mono font-medium">{new Date(backupData.timestamp).toLocaleString()}</span>
                    </p>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white border rounded-xl p-4">
                       <div className="text-2xl font-bold text-slate-800">{backupData.transactions.length}</div>
                       <div className="text-xs text-slate-400 uppercase font-bold">Transakcji</div>
                    </div>
                    <div className="bg-white border rounded-xl p-4">
                       <div className="text-2xl font-bold text-slate-800">{backupData.categories.length}</div>
                       <div className="text-xs text-slate-400 uppercase font-bold">Kategorii</div>
                    </div>
                 </div>

                 <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left flex gap-3">
                    <AlertTriangle className="text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-800">
                       <strong>Uwaga:</strong> Przywrócenie kopii zastąpi WSZYSTKIE obecne dane.
                    </p>
                 </div>

                 <Button onClick={handleBackupRestore} className="w-full justify-center py-3">
                    Przywróć pełną kopię
                 </Button>
              </div>
          )}

          {step === 'DECISION' && (
            <div className="max-w-xl mx-auto space-y-4 pt-4">
              <h3 className="text-center font-bold text-slate-800 mb-6">W aplikacji istnieją już transakcje. Co chcesz zrobić?</h3>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => handleDecision('APPEND')} className="p-6 bg-white border-2 border-slate-100 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 font-bold text-slate-700 flex flex-col items-center transition-all shadow-sm hover:shadow-md group">
                    <FilePlus className="mb-3 text-slate-400 group-hover:text-indigo-500" size={32}/> 
                    <span>Dołącz do obecnych</span>
                    <span className="text-[10px] font-normal text-slate-400 mt-1">Inteligentnie pominie duplikaty</span>
                </button>
                <button onClick={() => handleDecision('REPLACE')} className="p-6 bg-white border-2 border-slate-100 rounded-xl hover:border-red-500 hover:bg-red-50 font-bold text-slate-700 flex flex-col items-center transition-all shadow-sm hover:shadow-md group">
                    <Trash2 className="mb-3 text-slate-400 group-hover:text-red-500" size={32}/> 
                    <span>Wyczyść i Zastąp</span>
                    <span className="text-[10px] font-normal text-slate-400 mt-1">Usunie obecną historię</span>
                </button>
              </div>
            </div>
          )}

          {step === 'DATE_CORRECTION' && (
             <div className="max-w-xl mx-auto space-y-6">
                 <div className="flex gap-4 mb-6">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 flex-1 text-center">
                        <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Poprawne</div>
                        <div className="text-2xl font-bold text-emerald-600">{validItems.length}</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex-1 text-center">
                        <div className="text-xs text-red-500 uppercase font-bold tracking-wider mb-1">Błędne</div>
                        <div className="text-2xl font-bold text-red-600">{failedRows.length}</div>
                    </div>
                 </div>

                 <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                     <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                        <RefreshCw size={18} className="text-indigo-600"/>
                        Napraw błędne wiersze
                     </h3>
                     
                     <div className="grid grid-cols-2 gap-4 mb-4 mt-4">
                        <div>
                           <label className="block text-xs font-medium text-slate-500 mb-1">Przykład (Błąd)</label>
                           <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-mono text-slate-700">
                              {correctionPreview[0]?.original || '---'}
                           </div>
                        </div>
                        <div className="flex flex-col justify-end">
                           <label className="block text-xs font-medium text-slate-500 mb-1">Próba naprawy</label>
                           <div className={`border rounded-lg p-2 text-sm font-mono ${correctionPreview[0]?.parsed.includes('Nadal') || correctionPreview[0]?.parsed.includes('Błąd') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                              {correctionPreview[0]?.parsed || '---'}
                           </div>
                        </div>
                     </div>

                     <label className="block text-sm font-medium text-slate-700 mb-2">Wybierz właściwy format daty:</label>
                     <select 
                         value={secondaryDateFormat}
                         onChange={(e) => handleSecondaryFormatChange(e.target.value as DateFormat)}
                         className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900"
                     >
                         <option value="DD-MM-YYYY">DD-MM-YYYY (np. 31-01-2024)</option>
                         <option value="MM-DD-YYYY">MM-DD-YYYY (np. 01-31-2024)</option>
                         <option value="YYYY-MM-DD">YYYY-MM-DD (np. 2024-01-31)</option>
                     </select>
                 </div>
                 
                 <Button onClick={handleApplyCorrection} className="w-full justify-center">Zastosuj i Importuj</Button>
             </div>
          )}

          {step === 'GROUP' && detectedGroups.length > 0 && (
             <div className="space-y-4">
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6">
                   <h3 className="font-bold text-indigo-900 flex items-center gap-2"><Sparkles size={16}/> Wykryto powtarzalne transakcje</h3>
                   <p className="text-sm text-indigo-700 mt-1">Możesz przypisać kategorię do całych grup transakcji jednocześnie.</p>
                </div>
                
                <div className="space-y-3">
                   {detectedGroups.map((group) => (
                      <div key={group.signature} className={`bg-white border rounded-xl p-4 transition-all ${group.enabled ? 'border-indigo-200 shadow-sm' : 'border-slate-100 opacity-60'}`}>
                         <div className="flex items-start gap-3">
                            <input type="checkbox" checked={group.enabled} onChange={() => toggleGroup(group.signature)} className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                            <div className="flex-1">
                               <div className="flex justify-between mb-1">
                                  <span className="font-mono text-xs font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">x{group.count}</span>
                                  <span className="text-xs text-slate-400 italic truncate max-w-[200px]">"{group.example}"</span>
                               </div>
                               <h4 className="font-bold text-slate-800 text-sm mb-3">"{group.signature.toUpperCase()}"...</h4>
                               
                               {group.enabled && (
                                  <div className="flex gap-2">
                                     <select 
                                        value={group.currentCategoryName}
                                        onChange={(e) => handleUpdateGroupCategory(group.signature, e.target.value)}
                                        className="flex-1 text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 focus:ring-1 focus:ring-indigo-500"
                                     >
                                        <option value="Inne">Kategoria...</option>
                                        {categories.filter(c => c.type === TransactionType.EXPENSE).map(c => (
                                           <option key={c.id} value={c.name}>{c.name}</option>
                                        ))}
                                     </select>
                                     <select 
                                        value={group.currentSubcategoryName}
                                        onChange={(e) => handleUpdateGroupSubcategory(group.signature, e.target.value)}
                                        className="flex-1 text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 focus:ring-1 focus:ring-indigo-500"
                                     >
                                        {/* Use empty string for placeholder to ensure proper value matching */}
                                        <option value="">Podkategoria...</option>
                                        {categories.find(c => c.name === group.currentCategoryName)?.subcategories.map(s => (
                                           <option key={s.id} value={s.name}>{s.name}</option>
                                        ))}
                                     </select>
                                  </div>
                               )}
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
                <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
                   <Button onClick={() => finalizeImport(pendingItems)} className="w-full sm:w-auto">
                      Zatwierdź grupy i importuj
                   </Button>
                </div>
             </div>
          )}

          {step === 'MAP' && (
            <div className="space-y-4">
               <div className="bg-slate-100 p-3 rounded-xl flex flex-wrap items-center gap-4 border border-slate-200">
                  <div className="flex items-center gap-2 px-1">
                    <input 
                      type="checkbox" 
                      id="hasHeader" 
                      checked={hasHeader} 
                      onChange={(e) => setHasHeader(e.target.checked)} 
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer bg-white accent-indigo-600"
                      style={{ colorScheme: 'light' }}
                    />
                    <label htmlFor="hasHeader" className="text-sm text-slate-700 font-medium select-none cursor-pointer">
                      Pierwszy wiersz to nagłówki
                    </label>
                  </div>

                  <div className="w-px h-6 bg-slate-300 hidden sm:block"></div>

                  <div className="flex items-center gap-2 animate-fade-in">
                      <CalendarDays size={16} className="text-slate-500" />
                      <label className="text-sm text-slate-700 font-medium">Format daty:</label>
                      <select 
                          value={primaryDateFormat}
                          onChange={(e) => setPrimaryDateFormat(e.target.value as DateFormat)}
                          className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900"
                      >
                          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                          <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                          <option value="MM-DD-YYYY">MM-DD-YYYY</option>
                      </select>
                  </div>
               </div>
              
              <div className="bg-white border rounded-xl overflow-x-auto mb-2">
                <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-sm relative">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr>
                      {rawFile[0]?.map((_, i) => (
                        <th key={i} className="p-2 min-w-[130px] bg-white border-b border-slate-200">
                          <select 
                            value={mappings[i] || 'skip'} 
                            onChange={(e) => setMappings(prev => ({ ...prev, [i]: e.target.value as ColumnMapping }))} 
                            className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                          >
                            <option value="skip">Pomiń</option>
                            <option value="date">Data</option>
                            <option value="description">Opis</option>
                            <option value="amount">Kwota</option>
                            <option value="category">Kategoria</option>
                          </select>
                        </th>
                      ))}
                    </tr>
                    {hasHeader && (
                      <tr className="bg-slate-50 border-b border-slate-100">
                        {rawFile[0].map((c, i) => (
                          <th key={i} className="p-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap bg-slate-50">
                            {c}
                          </th>
                        ))}
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rawFile.slice(hasHeader ? 1 : 0, (hasHeader ? 1 : 0) + 5).map((r, i) => (
                      <tr key={i}>
                        {r.map((c, j) => (
                          <td key={j} className="p-3 text-slate-600 border-t border-slate-50 whitespace-nowrap max-w-[200px] truncate" title={c}>
                            {c}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
              {rawFile.length > 5 && (
                  <p className="text-xs text-slate-400 text-center">
                     Pokazuję podgląd pierwszych 5 wierszy z {rawFile.length}.
                  </p>
              )}
              
              <div className="flex justify-end pt-4">
                 <Button onClick={handleParseAndAnalyze}>Dalej <ArrowRight size={16}/></Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
