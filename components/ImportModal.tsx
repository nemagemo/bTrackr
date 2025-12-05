
import React, { useState } from 'react';
import Papa from 'papaparse';
import { X } from 'lucide-react';
import { Transaction, TransactionType, CategoryItem, BackupData } from '../types';
import { 
    ImportStep, ColumnMapping, DateFormat, GroupedTransaction, RawTransactionRow,
    guessMappings, flattenJsonToTable, parseRawData, parseDateStrict, analyzeGroups
} from '../utils/importHelpers';
import { 
    StepUpload, StepDecision, StepMap, StepCorrection, StepGroup, StepBackup 
} from './ImportSteps';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (transactions: Transaction[], clearHistory: boolean, newCategories?: CategoryItem[]) => void;
  onRestore?: (backup: BackupData) => void;
  hasExistingTransactions: boolean;
  categories: CategoryItem[];
}

/**
 * Komponent Importu (Refaktoryzowany).
 * Pełni rolę kontrolera stanu dla procesu importu.
 */
export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport, onRestore, hasExistingTransactions, categories }) => {
  const [step, setStep] = useState<ImportStep>('UPLOAD');
  const [importMode, setImportMode] = useState<'APPEND' | 'REPLACE'>('APPEND');
  
  // Data State
  const [rawFile, setRawFile] = useState<string[][]>([]);
  const [backupData, setBackupData] = useState<BackupData | null>(null);
  
  // Mapping State
  const [mappings, setMappings] = useState<Record<number, ColumnMapping>>({});
  const [hasHeader, setHasHeader] = useState(true);
  const [primaryDateFormat, setPrimaryDateFormat] = useState<DateFormat>('YYYY-MM-DD');
  
  // Parsing State
  const [validItems, setValidItems] = useState<any[]>([]);
  const [failedRows, setFailedRows] = useState<RawTransactionRow[]>([]);
  const [secondaryDateFormat, setSecondaryDateFormat] = useState<DateFormat>('DD-MM-YYYY');
  const [correctionPreview, setCorrectionPreview] = useState<{original: string, parsed: string}[]>([]);
  
  // Grouping State
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [detectedGroups, setDetectedGroups] = useState<GroupedTransaction[]>([]);
  
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  // --- Handlers ---

  const handleClose = () => {
    setStep('UPLOAD');
    setRawFile([]);
    setPendingItems([]);
    setDetectedGroups([]);
    setValidItems([]);
    setFailedRows([]);
    setCorrectionPreview([]);
    setBackupData(null);
    setError('');
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setBackupData(null);

    // JSON Handling
    if (file.name.toLowerCase().endsWith('.json')) {
       const reader = new FileReader();
       reader.onload = (event) => {
          try {
             const json = JSON.parse(event.target?.result as string);
             
             // Backup Check
             if (json.categories && json.transactions && Array.isArray(json.categories) && Array.isArray(json.transactions)) {
                setBackupData(json as BackupData);
                setStep('BACKUP_CONFIRM');
                return;
             } 
             
             // Simple List Check
             let dataArray: any[] = [];
             if (Array.isArray(json)) {
                 dataArray = json;
             } else if (typeof json === 'object' && json !== null) {
                 const possibleArray = Object.values(json).find(v => Array.isArray(v));
                 if (possibleArray) dataArray = possibleArray as any[];
             }

             if (dataArray.length > 0) {
                 const tableData = flattenJsonToTable(dataArray);
                 if (tableData.length > 0) {
                     setRawFile(tableData); 
                     setStep(hasExistingTransactions ? 'DECISION' : 'MAP');
                     if (!hasExistingTransactions) setMappings(guessMappings(tableData));
                     return;
                 }
             }
             setError("Plik JSON nie zawiera rozpoznawalnej struktury.");
          } catch (err) {
             setError("Błąd odczytu pliku JSON.");
          }
       };
       reader.readAsText(file);
       return;
    }

    // CSV Handling
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const rows = results.data as string[][];
          setRawFile(rows);
          setStep(hasExistingTransactions ? 'DECISION' : 'MAP');
          if (!hasExistingTransactions) setMappings(guessMappings(rows.slice(0, 6)));
        } else {
          setError('Plik pusty.');
        }
      },
      error: (err) => setError(err.message)
    });
  };

  const handleDecision = (mode: 'APPEND' | 'REPLACE') => {
    setImportMode(mode);
    setStep('MAP');
    if (rawFile.length > 0) {
        setMappings(guessMappings(rawFile.slice(0, 6)));
    }
  };

  const handleParseAndAnalyze = () => {
      const { validItems, failedRows } = parseRawData(rawFile, mappings, primaryDateFormat, hasHeader);
      
      setValidItems(validItems);
      setFailedRows(failedRows);

      if (failedRows.length > 0) {
          // Setup Correction Step
          const sample = failedRows[0].dateStr;
          // Simple guess logic for correction suggestion
          const suggestion = (primaryDateFormat === 'DD-MM-YYYY') ? 'MM-DD-YYYY' : 'DD-MM-YYYY';
          setSecondaryDateFormat(suggestion);
          
          const preview = failedRows.slice(0, 3).map(r => ({
              original: r.dateStr,
              parsed: parseDateStrict(r.dateStr, suggestion) || 'Błąd'
          }));
          setCorrectionPreview(preview);
          setStep('DATE_CORRECTION');
      } else {
          proceedToGrouping(validItems);
      }
  };

  const handleSecondaryFormatChange = (fmt: DateFormat) => {
      setSecondaryDateFormat(fmt);
      const preview = failedRows.slice(0, 3).map(r => ({
          original: r.dateStr,
          parsed: parseDateStrict(r.dateStr, fmt) || 'Nadal błąd'
      }));
      setCorrectionPreview(preview);
  };

  const handleApplyCorrection = () => {
      // Re-parse failed rows with new format
      // Note: We reuse parseRawData logic partially by mocking raw rows, 
      // but simpler to just map here since we have structured FailedRows
      const fixedItems: any[] = [];
      failedRows.forEach(r => {
          const validDateISO = parseDateStrict(r.dateStr, secondaryDateFormat);
          if (validDateISO) {
             let finalCatName = r.categoryName || 'Inne';
             if (!r.categoryName) {
                // Same logic as helper
                if (r.amount > 0) finalCatName = 'Wynagrodzenie';
                else finalCatName = 'Inne'; // Or re-run detection
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
      
      proceedToGrouping([...validItems, ...fixedItems]);
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

  const finalizeImport = (items: any[]) => {
    // Apply groups
    let processedItems = items.map(item => {
      const group = detectedGroups.find(g => g.ids.includes(item.id));
      if (group && group.enabled) {
         return { 
           ...item, 
           categoryName: group.currentCategoryName,
           subcategoryName: group.currentSubcategoryName || 'Inne'
         };
      }
      return item;
    });

    // Create Categories & Transactions
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

  const handleBackupRestore = () => {
     if (backupData && onRestore) {
        onRestore(backupData);
        handleClose();
     }
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
            {step === 'BACKUP_CONFIRM' && 'Przywracanie kopii zapasowej'}
          </h2>
          <button onClick={handleClose}><X size={24} className="text-slate-400"/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {step === 'UPLOAD' && (
             <StepUpload onFileUpload={handleFileUpload} error={error} />
          )}
          
          {step === 'BACKUP_CONFIRM' && backupData && (
              <StepBackup backupData={backupData} onRestore={handleBackupRestore} />
          )}

          {step === 'DECISION' && (
            <StepDecision onDecision={handleDecision} />
          )}

          {step === 'DATE_CORRECTION' && (
             <StepCorrection 
                validCount={validItems.length}
                failedRows={failedRows}
                dateFormat={secondaryDateFormat}
                setDateFormat={handleSecondaryFormatChange}
                preview={correctionPreview}
                onApply={handleApplyCorrection}
             />
          )}

          {step === 'GROUP' && detectedGroups.length > 0 && (
             <StepGroup 
                detectedGroups={detectedGroups}
                setDetectedGroups={setDetectedGroups}
                categories={categories}
                onConfirm={() => finalizeImport(pendingItems)}
             />
          )}

          {step === 'MAP' && (
            <StepMap 
               rawFile={rawFile}
               mappings={mappings}
               setMappings={setMappings}
               hasHeader={hasHeader}
               setHasHeader={setHasHeader}
               dateFormat={primaryDateFormat}
               setDateFormat={setPrimaryDateFormat}
               onNext={handleParseAndAnalyze}
            />
          )}
        </div>
      </div>
    </div>
  );
};
