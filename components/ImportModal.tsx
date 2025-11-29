
import React, { useState, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import { X, Upload, FileSpreadsheet, AlertCircle, Check, ArrowRight, Settings2, Layers, Trash2, FilePlus, AlertTriangle, Link, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { Button } from './Button';
import { Transaction, TransactionType, CategoryItem, SubcategoryItem } from '../types';
import { KEYWORD_TO_CATEGORY_NAME } from '../constants';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (transactions: Transaction[], clearHistory: boolean, newCategories?: CategoryItem[]) => void;
  hasExistingTransactions: boolean;
  categories: CategoryItem[];
}

type ColumnMapping = 'date' | 'amount' | 'description' | 'category' | 'skip';
type ImportStep = 'UPLOAD' | 'RECONCILE' | 'DECISION' | 'MAP' | 'GROUP';

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

const IGNORED_PREFIXES = [
  'platnosc', 'płatność', 'transakcja', 'karta', 'kartą', 'zakup', 
  'przelew', 'terminal', 'pos', 'nr', 'rezerwacja', 'oplata', 'opłata',
  'wyplata', 'wypłata', 'obciazenie', 'obciążenie', 'blokada', 'sprzedaż', 
  'zlec', 'zlecenie', 'tytul', 'tytułem', 'numer', 'rachunek', 'faktura', 'vat'
];

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport, hasExistingTransactions, categories }) => {
  const [step, setStep] = useState<ImportStep>('UPLOAD');
  const [importMode, setImportMode] = useState<'APPEND' | 'REPLACE'>('APPEND');
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [rawFile, setRawFile] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<Record<number, ColumnMapping>>({});
  const [hasHeader, setHasHeader] = useState(true);
  const [decimalSeparator, setDecimalSeparator] = useState<',' | '.'>(',');
  const [error, setError] = useState<string>('');
  
  // Pending parsed transactions. Note: We store Category NAME temporarily here, not ID, until finalize.
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [detectedGroups, setDetectedGroups] = useState<GroupedTransaction[]>([]);
  const [isBackupFile, setIsBackupFile] = useState(false);

  // Reconciliation State
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [reconciliationMap, setReconciliationMap] = useState<Record<string, ReconciliationMapping>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportedFile(file);
    setError('');
    setIsBackupFile(false);
    setConflicts([]);
    setReconciliationMap({});

    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const rows = results.data as string[][];
          const header = rows[0].map(h => h.toLowerCase());
          
          const isBackup = header.includes('btrackr_id') && header.includes('category');
          setIsBackupFile(isBackup);

          if (isBackup) {
            const parsedBackup = parseBackupFile(rows);
            setPendingItems(parsedBackup);
            
            // Check for category mismatches
            const detectedConflicts = analyzeConflicts(parsedBackup);
            if (detectedConflicts.length > 0) {
              setConflicts(detectedConflicts);
              setStep('RECONCILE');
            } else {
              if (hasExistingTransactions) {
                setStep('DECISION');
              } else {
                finalizeImport(parsedBackup, false);
              }
            }
          } else {
            const previewRows = rows.slice(0, 6);
            setRawFile(previewRows); 
            
            if (hasExistingTransactions) {
               setStep('DECISION');
            } else {
               setStep('MAP');
               guessMappings(previewRows);
            }
          }
        } else {
          setError('Plik pusty.');
        }
      },
      error: (err) => setError(err.message)
    });
  };

  const parseBackupFile = (rows: string[][]): any[] => {
    const header = rows[0];
    const idIdx = header.indexOf('btrackr_id');
    const dateIdx = header.indexOf('date');
    const amountIdx = header.indexOf('amount');
    const descIdx = header.indexOf('description');
    const typeIdx = header.indexOf('type');
    const catIdx = header.indexOf('category');
    const subIdx = header.indexOf('subcategory');

    const items = [];
    for(let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 5) continue;
      
      let rawType = row[typeIdx] as TransactionType;
      // Safety check for type
      if (rawType !== TransactionType.INCOME && rawType !== TransactionType.EXPENSE) {
         // Try to infer from category logic or default to Expense
         rawType = TransactionType.EXPENSE;
      }

      items.push({
        id: row[idIdx] || crypto.randomUUID(),
        date: row[dateIdx],
        amount: parseFloat(row[amountIdx]),
        description: row[descIdx],
        type: rawType,
        categoryName: row[catIdx], // Store Name
        subcategoryName: subIdx > -1 ? row[subIdx] : undefined
      });
    }
    return items;
  };

  const analyzeConflicts = (items: any[]): ConflictItem[] => {
    const conflictMap = new Map<string, ConflictItem>();

    items.forEach(item => {
      const fileCatName = item.categoryName;
      const fileSubName = item.subcategoryName;
      
      // Try to find exact match
      const matchingCat = categories.find(c => c.name.toLowerCase() === fileCatName.toLowerCase());
      let hasConflict = false;

      if (!matchingCat) {
        hasConflict = true;
      } else if (fileSubName) {
        const matchingSub = matchingCat.subcategories.find(s => s.name.toLowerCase() === fileSubName.toLowerCase());
        if (!matchingSub) {
          hasConflict = true;
        }
      }

      if (hasConflict) {
        const key = `${fileCatName}:::${fileSubName || ''}`;
        if (!conflictMap.has(key)) {
          conflictMap.set(key, {
            fileCategory: fileCatName,
            fileSubcategory: fileSubName,
            type: item.type,
            count: 0
          });
        }
        const conflict = conflictMap.get(key)!;
        conflict.count++;
      }
    });

    return Array.from(conflictMap.values());
  };

  const findSuggestion = (conflict: ConflictItem) => {
    const fileCat = conflict.fileCategory.toLowerCase();
    const fileSub = conflict.fileSubcategory?.toLowerCase();
    const relevantCats = categories.filter(c => c.type === conflict.type);

    // Strategy 1: Match Category Name (Exact or Fuzzy)
    // Sort by name length desc to prefer longer matches (e.g. "Dom i Rachunki" over "Dom")
    const sortedCats = [...relevantCats].sort((a, b) => b.name.length - a.name.length);
    
    let bestCat = sortedCats.find(c => c.name.toLowerCase() === fileCat); // Exact
    if (!bestCat) bestCat = sortedCats.find(c => fileCat.includes(c.name.toLowerCase())); // Contains
    if (!bestCat) bestCat = sortedCats.find(c => c.name.toLowerCase().includes(fileCat)); // Is Contained

    let bestSub: SubcategoryItem | undefined;

    if (bestCat) {
        // Try to find subcategory match
        if (fileSub) {
             bestSub = bestCat.subcategories.find(s => s.name.toLowerCase() === fileSub); // Exact
             if (!bestSub) bestSub = bestCat.subcategories.find(s => fileSub.includes(s.name.toLowerCase())); // Fuzzy
        }
        return { category: bestCat, subcategory: bestSub };
    }

    // Strategy 2: If Category didn't match, maybe the File Category Name matches a Subcategory in App?
    // e.g. CSV Category: "Kino/Kultura" -> App Subcategory: "Kino" (under "Rozrywka")
    for (const cat of relevantCats) {
        const matchSub = cat.subcategories.find(s => 
            s.name.toLowerCase() === fileCat || 
            fileCat.includes(s.name.toLowerCase())
        );
        if (matchSub) {
            return { category: cat, subcategory: matchSub };
        }
    }

    return null;
  };

  const handleReconciliationUpdate = (key: string, catId: string, subId?: string) => {
    setReconciliationMap(prev => ({
      ...prev,
      [key]: { targetCategoryId: catId, targetSubcategoryId: subId }
    }));
  };

  const handleReconciliationComplete = () => {
    // Ensure all conflicts are resolved
    const conflictKeys = conflicts.map(c => `${c.fileCategory}:::${c.fileSubcategory || ''}`);
    const resolvedKeys = Object.keys(reconciliationMap);
    
    const allResolved = conflictKeys.every(k => resolvedKeys.includes(k) && reconciliationMap[k].targetCategoryId);

    if (!allResolved) {
      alert("Proszę dopasować wszystkie kategorie przed kontynuacją.");
      return;
    }

    if (hasExistingTransactions) {
      setStep('DECISION');
    } else {
      finalizeImport(pendingItems, false);
    }
  };

  const handleDecision = (mode: 'APPEND' | 'REPLACE') => {
    setImportMode(mode);
    if (isBackupFile) {
      finalizeImport(pendingItems, mode === 'REPLACE');
    } else {
      setStep('MAP');
      guessMappings(rawFile);
    }
  };

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
      const val = cell.trim();
      const len = val.length;
      
      // 1. Date check
      if (isDate(val)) { 
        newMappings[index] = 'date'; 
        return; 
      }
      
      // 2. Natural number check (Skip IDs, serials, etc.)
      if (isNaturalNumber(val)) {
        newMappings[index] = 'skip';
        return;
      }

      // 3. Amount check
      if (isAmount(val) && len < 20) { 
        newMappings[index] = 'amount'; 
        return; 
      }
      
      // 4. Header heuristic for Category
      if (['kategoria', 'category', 'typ'].some(k => headerRow[index]?.toLowerCase().includes(k))) { 
        newMappings[index] = 'category'; 
        return; 
      }

      // Track max length for Description heuristic
      if (len > maxLen) { 
        maxLen = len; 
        descIndex = index; 
      }
    });

    // 5. Assign longest column as Description if not already mapped
    if (descIndex !== -1 && !newMappings[descIndex]) newMappings[descIndex] = 'description';
    
    // 6. Default others to Skip
    dataRow.forEach((_, index) => { if (!newMappings[index]) newMappings[index] = 'skip'; });
    setMappings(newMappings);
  };

  const parseAmount = (val: string): number => {
    let clean = val.replace(/[^\d.,-]/g, '');
    if (decimalSeparator === ',') clean = clean.replace(',', '.');
    return parseFloat(clean);
  };

  const parseDate = (val: string): string => {
    let date = new Date(val);
    if (isNaN(date.getTime())) {
      const parts = val.split(/[.-]/);
      if (parts.length === 3) date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  };

  const detectCategoryNameFromDesc = (desc: string): string | null => {
    const lower = desc.toLowerCase();
    for (const [key, catName] of Object.entries(KEYWORD_TO_CATEGORY_NAME)) {
      if (lower.includes(key.toLowerCase())) return catName;
    }
    return null;
  };

  const handleParseAndAnalyze = () => {
    if (!importedFile) return;
    Papa.parse(importedFile, {
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as string[][];
        const newItems: any[] = [];
        const startIndex = hasHeader ? 1 : 0;

        for (let i = startIndex; i < rows.length; i++) {
          const row = rows[i];
          let date = new Date().toISOString();
          let amount = 0;
          let description = 'Bez opisu';
          let categoryName = 'Inne';
          let foundInCsv = false;

          Object.entries(mappings).forEach(([colIndex, type]) => {
            const val = row[parseInt(colIndex)];
            if (!val) return;
            switch (type) {
              case 'date': date = parseDate(val); break;
              case 'amount': amount = parseAmount(val); break;
              case 'description': description = val; break;
              case 'category': categoryName = val; foundInCsv = true; break;
            }
          });

          if (amount !== 0) {
            if (amount > 0) categoryName = 'Wynagrodzenie';
            else if (!foundInCsv) {
              const detected = detectCategoryNameFromDesc(description);
              if (detected) categoryName = detected;
            }
            
            newItems.push({
              id: crypto.randomUUID(),
              date, amount: Math.abs(amount), description,
              type: amount > 0 ? TransactionType.INCOME : TransactionType.EXPENSE,
              categoryName
            });
          }
        }
        setPendingItems(newItems);
        const groups = analyzeGroups(newItems);
        if (groups.length > 0) {
          setDetectedGroups(groups);
          setStep('GROUP');
        } else {
          finalizeImport(newItems, importMode === 'REPLACE');
        }
      }
    });
  };

  const analyzeGroups = (items: any[]): GroupedTransaction[] => {
    const groups: Record<string, { ids: string[], example: string, count: number }> = {};
    items.forEach(t => {
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

  const handleUpdateGroupCategory = (sig: string, catName: string) => {
    setDetectedGroups(prev => prev.map(g => g.signature === sig ? { ...g, currentCategoryName: catName, currentSubcategoryName: 'Inne' } : g));
  };
  
  const handleUpdateGroupSubcategory = (sig: string, subName: string) => {
    setDetectedGroups(prev => prev.map(g => g.signature === sig ? { ...g, currentSubcategoryName: subName } : g));
  };
  
  const toggleGroup = (sig: string) => {
    setDetectedGroups(prev => prev.map(g => g.signature === sig ? { ...g, enabled: !g.enabled } : g));
  };

  const finalizeImport = (items: any[], clearHistory: boolean) => {
    // Phase 1: Group Updates (for raw CSV import)
    let processedItems = items.map(item => {
      const group = detectedGroups.find(g => g.ids.includes(item.id));
      if (group && group.enabled) {
         return { 
           ...item, 
           categoryName: group.currentCategoryName,
           subcategoryName: group.currentSubcategoryName 
         };
      }
      return item;
    });

    const finalTransactions: Transaction[] = [];
    const createdCategories: CategoryItem[] = [];
    const currentCategoriesMap = new Map<string, CategoryItem>(categories.map(c => [c.name.toLowerCase(), c]));
    // Map to track modified existing categories or new batch categories
    const categoriesToSave = new Map<string, CategoryItem>();

    const getMutableCategory = (name: string, type: TransactionType): CategoryItem => {
        const lower = name.toLowerCase();
        let cat = categoriesToSave.get(lower);
        if (cat) return cat;

        const existing = currentCategoriesMap.get(lower);
        if (existing) {
           // Clone if not already in save map
           cat = { ...existing, subcategories: [...existing.subcategories] };
        } else {
           // Create new
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
        categoriesToSave.set(cat.id, cat); // Index by ID as well for safety
        return cat;
    };

    processedItems.forEach(item => {
      let categoryId = '';
      let subcategoryId: string | undefined = undefined;

      // Logic for BACKUP reconciliation vs RAW CSV creation
      if (isBackupFile) {
        // Use reconciliation map first, then direct match
        const conflictKey = `${item.categoryName}:::${item.subcategoryName || ''}`;
        const mapping = reconciliationMap[conflictKey];

        if (mapping) {
          categoryId = mapping.targetCategoryId;
          subcategoryId = mapping.targetSubcategoryId;
          
          // Ensure subcategory exists (if user mapped to a category but missed subcategory)
          if (!subcategoryId) {
             const catObj = categories.find(c => c.id === categoryId);
             if (catObj) {
                // We might need to modify this existing category to add 'Inne'
                // Check if we already modified it
                let mutable = categoriesToSave.get(catObj.name.toLowerCase());
                if (!mutable) mutable = { ...catObj, subcategories: [...catObj.subcategories] };
                
                const inne = mutable.subcategories.find(s => s.name.toLowerCase() === 'inne');
                if (inne) {
                   subcategoryId = inne.id;
                } else {
                   const newSub = { id: crypto.randomUUID(), name: 'Inne' };
                   mutable.subcategories.push(newSub);
                   subcategoryId = newSub.id;
                   categoriesToSave.set(mutable.name.toLowerCase(), mutable);
                }
             }
          }
        } else {
          // Direct match expected
          let matchedCat = getMutableCategory(item.categoryName, item.type);
          categoryId = matchedCat.id;

          if (item.subcategoryName) {
             const subName = item.subcategoryName;
             const existingSub = matchedCat.subcategories.find(s => s.name.toLowerCase() === subName.toLowerCase());
             if (existingSub) {
                subcategoryId = existingSub.id;
             } else {
                const newSub = { id: crypto.randomUUID(), name: subName };
                matchedCat.subcategories.push(newSub);
                subcategoryId = newSub.id;
             }
          } else {
             // Default to Inne
             const existingSub = matchedCat.subcategories.find(s => s.name.toLowerCase() === 'inne');
             if (existingSub) {
                subcategoryId = existingSub.id;
             } else {
                const newSub = { id: crypto.randomUUID(), name: 'Inne' };
                matchedCat.subcategories.push(newSub);
                subcategoryId = newSub.id;
             }
          }
        }
      } else {
        // Raw CSV: Auto-create Logic
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

    onImport(finalTransactions, clearHistory, Array.from(categoriesToSave.values()));
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
    onClose();
  };

  const renderConflictList = (items: ConflictItem[]) => {
    return items.map((conflict, i) => {
        const key = `${conflict.fileCategory}:::${conflict.fileSubcategory || ''}`;
        const currentMap = reconciliationMap[key] || {};
        const relevantCategories = categories.filter(c => c.type === conflict.type);
        const selectedCat = categories.find(c => c.id === currentMap.targetCategoryId);

        // Smart Suggestion Logic
        const suggestion = findSuggestion(conflict);

        return (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-3">
             <div className="flex items-center justify-between mb-3">
                <div className="flex flex-col gap-1 text-slate-700">
                   <div className="flex items-center gap-2">
                     <div className="font-bold">{conflict.fileCategory}</div>
                     {suggestion && (
                       <button
                         onClick={() => handleReconciliationUpdate(key, suggestion.category.id, suggestion.subcategory?.id)}
                         className="text-[11px] font-semibold bg-indigo-600 text-white px-3 py-1 rounded-full flex items-center gap-1.5 hover:bg-indigo-700 transition-colors shadow-sm ml-2"
                         title="Kliknij, aby przypisać automatycznie"
                       >
                         <Sparkles size={12} fill="currentColor" /> 
                         Przypisz: {suggestion.category.name} {suggestion.subcategory ? `> ${suggestion.subcategory.name}` : ''}
                       </button>
                     )}
                   </div>
                   
                   {conflict.fileSubcategory && (
                     <div className="flex items-center gap-2 text-sm">
                       <ArrowRight size={14} className="text-slate-400" />
                       <div className="font-medium">{conflict.fileSubcategory}</div>
                     </div>
                   )}
                   <div className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500 w-fit mt-1">
                      {conflict.count} transakcji
                   </div>
                </div>
                <Link size={16} className="text-slate-300" />
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={currentMap.targetCategoryId || ''}
                  onChange={(e) => handleReconciliationUpdate(key, e.target.value, '')}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900"
                >
                   <option value="">-- Wybierz kategorię --</option>
                   {relevantCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                {selectedCat && selectedCat.subcategories.length > 0 && (
                   <select
                    value={currentMap.targetSubcategoryId || ''}
                    onChange={(e) => handleReconciliationUpdate(key, currentMap.targetCategoryId, e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900"
                   >
                     <option value="">-- Podkategoria (Opcjonalnie) --</option>
                     {selectedCat.subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                )}
             </div>
          </div>
        );
     });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <h2 className="text-lg font-bold text-slate-800">
            {step === 'UPLOAD' && 'Importuj transakcje'}
            {step === 'GROUP' && 'Wykryte grupy'}
            {step === 'MAP' && 'Dopasuj kolumny'}
            {step === 'DECISION' && 'Wykryto dane'}
            {step === 'RECONCILE' && 'Dopasuj kategorie'}
          </h2>
          <button onClick={handleClose}><X size={24} className="text-slate-400"/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {step === 'UPLOAD' && (
             <div className="h-64 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center relative bg-white">
               <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
               <Upload size={48} className="text-slate-400 mb-4"/>
               <p className="text-slate-600 font-medium">Wybierz plik CSV</p>
               {error && <p className="text-red-500 mt-2">{error}</p>}
             </div>
          )}
          
          {step === 'DECISION' && (
            <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto mt-10">
              <button onClick={() => handleDecision('APPEND')} className="p-6 bg-white border rounded-xl hover:bg-indigo-50 hover:border-indigo-500 font-bold text-slate-700 flex flex-col items-center"><FilePlus className="mb-2 text-indigo-500"/> Dołącz</button>
              <button onClick={() => handleDecision('REPLACE')} className="p-6 bg-white border rounded-xl hover:bg-red-50 hover:border-red-500 font-bold text-slate-700 flex flex-col items-center"><Trash2 className="mb-2 text-red-500"/> Zastąp</button>
            </div>
          )}

          {step === 'RECONCILE' && (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                 <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
                 <div>
                   <h3 className="font-bold text-amber-800 text-sm">Wykryto nieznane kategorie</h3>
                   <p className="text-sm text-amber-700 mt-1">
                     Plik zawiera kategorie, których nie masz w aplikacji. Proszę wskazać, do których obecnych kategorii mają trafić te transakcje.
                   </p>
                 </div>
              </div>

              <div className="space-y-6">
                {/* Income Section */}
                {conflicts.some(c => c.type === TransactionType.INCOME) && (
                  <div>
                    <h3 className="text-sm font-bold text-green-700 bg-green-50 p-2 rounded mb-3 flex items-center gap-2">
                       <TrendingUp size={16} /> Przychody
                    </h3>
                    <div className="space-y-3">
                      {renderConflictList(conflicts.filter(c => c.type === TransactionType.INCOME))}
                    </div>
                  </div>
                )}

                {/* Expense Section */}
                {conflicts.some(c => c.type === TransactionType.EXPENSE) && (
                  <div>
                    <h3 className="text-sm font-bold text-red-700 bg-red-50 p-2 rounded mb-3 flex items-center gap-2">
                       <TrendingDown size={16} /> Wydatki
                    </h3>
                    <div className="space-y-3">
                      {renderConflictList(conflicts.filter(c => c.type === TransactionType.EXPENSE))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'MAP' && (
            <div className="space-y-4">
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
                  Pierwszy wiersz zawiera nagłówki
                </label>
              </div>
              
              <div className="bg-white border rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      {rawFile[0]?.map((_, i) => (
                        <th key={i} className="p-2 min-w-[130px]">
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
                          <th key={i} className="p-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                            {c}
                          </th>
                        ))}
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rawFile.slice(hasHeader ? 1 : 0).map((r, i) => (
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
          )}
          {step === 'GROUP' && (
            <div className="space-y-2">
              {detectedGroups.map((g, i) => {
                 const selectedCatObject = categories.find(c => c.name === g.currentCategoryName && c.type === TransactionType.EXPENSE);
                 return (
                 <div key={i} className="flex items-center gap-4 bg-white p-3 rounded border">
                    <input 
                      type="checkbox" 
                      checked={g.enabled} 
                      onChange={() => toggleGroup(g.signature)} 
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer bg-white accent-indigo-600"
                      style={{ colorScheme: 'light' }}
                    />
                    <div className="flex-1">
                      <div className="font-bold">{g.example}</div>
                      <div className="text-xs text-slate-400">({g.count} items)</div>
                    </div>
                    <div className="flex gap-2">
                      <select 
                        value={g.currentCategoryName} 
                        onChange={(e)=>handleUpdateGroupCategory(g.signature, e.target.value)} 
                        disabled={!g.enabled} 
                        className="border p-2 rounded bg-white text-slate-900 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none w-48"
                      >
                         {categories.filter(c => c.type === TransactionType.EXPENSE).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                      
                      <select 
                        value={g.currentSubcategoryName} 
                        onChange={(e)=>handleUpdateGroupSubcategory(g.signature, e.target.value)} 
                        disabled={!g.enabled || !selectedCatObject} 
                        className="border p-2 rounded bg-white text-slate-900 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none w-40"
                      >
                         {selectedCatObject?.subcategories.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                 </div>
              )})}
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t flex justify-end gap-2">
           {step === 'MAP' && <Button onClick={handleParseAndAnalyze}>Dalej</Button>}
           {step === 'RECONCILE' && <Button onClick={handleReconciliationComplete}>Potwierdź dopasowania</Button>}
           {step === 'GROUP' && <Button onClick={() => finalizeImport(pendingItems, importMode === 'REPLACE')}>Importuj</Button>}
        </div>
      </div>
    </div>
  );
};
