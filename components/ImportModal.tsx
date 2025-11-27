import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { X, Upload, FileSpreadsheet, AlertCircle, Check, ArrowRight, Settings2, Layers } from 'lucide-react';
import { Button } from './Button';
import { Transaction, TransactionType, Category } from '../types';
import { KEYWORD_CATEGORY_MAP } from '../constants';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (transactions: Transaction[]) => void;
}

type ColumnMapping = 'date' | 'amount' | 'description' | 'category' | 'skip';
type ImportStep = 'UPLOAD' | 'MAP' | 'GROUP';

interface GroupedTransaction {
  signature: string; // The cleaned prefix used for grouping
  example: string; // One full description as example
  count: number;
  ids: string[]; // IDs of transactions in this group
  currentCategory: string;
  enabled: boolean; // Is this group enabled for bulk update?
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [step, setStep] = useState<ImportStep>('UPLOAD');
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [rawFile, setRawFile] = useState<string[][]>([]);
  const [fileName, setFileName] = useState('');
  const [mappings, setMappings] = useState<Record<number, ColumnMapping>>({});
  const [hasHeader, setHasHeader] = useState(true);
  const [decimalSeparator, setDecimalSeparator] = useState<',' | '.'>(',');
  const [error, setError] = useState<string>('');
  
  // Staging area for parsed transactions before they are finalized
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [detectedGroups, setDetectedGroups] = useState<GroupedTransaction[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportedFile(file);
    setFileName(file.name);
    setError('');

    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const rows = results.data as string[][];
          setRawFile(rows.slice(0, 6)); // Keep first few rows for preview
          setStep('MAP');
          guessMappings(rows[0], rows[1]);
        } else {
          setError('Plik wydaje się pusty lub uszkodzony.');
        }
      },
      error: (err) => {
        setError(`Błąd parsowania: ${err.message}`);
      }
    });
  };

  const guessMappings = (headerRow: string[], firstDataRow: string[]) => {
    const newMappings: Record<number, ColumnMapping> = {};
    const rowToAnalyze = firstDataRow || headerRow;

    rowToAnalyze.forEach((cell, index) => {
      const val = cell.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(val) || /^\d{2}[.-]\d{2}[.-]\d{4}$/.test(val)) {
        newMappings[index] = 'date';
      }
      else if (/^-?\d+[.,\s]?\d*[.,]?\d*$/.test(val) || val.includes('PLN') || val.includes('zł')) {
        newMappings[index] = 'amount';
      }
      else if (val.length > 5) {
        newMappings[index] = 'description';
      } else {
        newMappings[index] = 'skip';
      }
    });
    setMappings(newMappings);
  };

  const parseAmount = (val: string): number => {
    let clean = val.replace(/[^\d.,-]/g, '');
    if (decimalSeparator === ',') {
      clean = clean.replace(',', '.');
    } 
    return parseFloat(clean);
  };

  const parseDate = (val: string): string => {
    let date = new Date(val);
    if (isNaN(date.getTime())) {
      const parts = val.split(/[.-]/);
      if (parts.length === 3) {
        date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    }
    if (isNaN(date.getTime())) return new Date().toISOString();
    return date.toISOString();
  };

  const detectCategoryFromDescription = (description: string): Category | null => {
    const lowerDesc = description.toLowerCase();
    
    // Iterate through known keywords
    for (const [keyword, category] of Object.entries(KEYWORD_CATEGORY_MAP)) {
      if (lowerDesc.includes(keyword.toLowerCase())) {
        return category;
      }
    }
    return null;
  };

  // --- Logic to parse and move to GROUP step ---
  const handleParseAndAnalyze = () => {
    // Use the file stored in state
    if (!importedFile) return;

    Papa.parse(importedFile, {
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as string[][];
        const newTransactions: Transaction[] = [];
        const startIndex = hasHeader ? 1 : 0;

        for (let i = startIndex; i < rows.length; i++) {
          const row = rows[i];
          let date = new Date().toISOString();
          let amount = 0;
          let description = 'Importowana transakcja';
          let category = Category.OTHER;
          let categoryFoundInCsv = false;

          Object.entries(mappings).forEach(([colIndex, type]) => {
            const val = row[parseInt(colIndex)];
            if (!val) return;

            switch (type) {
              case 'date': date = parseDate(val); break;
              case 'amount': amount = parseAmount(val); break;
              case 'description': description = val; break;
              case 'category':
                const foundCat = Object.values(Category).find(c => c.toLowerCase() === val.toLowerCase());
                if (foundCat) {
                  category = foundCat;
                  categoryFoundInCsv = true;
                }
                break;
            }
          });

          if (amount !== 0) {
            let finalCategory: string | Category = category;
            
            if (amount > 0) {
              finalCategory = Category.SALARY;
            } else if (!categoryFoundInCsv) {
               const detected = detectCategoryFromDescription(description);
               if (detected) {
                 finalCategory = detected;
               }
            }

            newTransactions.push({
              id: crypto.randomUUID(),
              date,
              amount: Math.abs(amount),
              description: description || 'Bez opisu',
              type: amount > 0 ? TransactionType.INCOME : TransactionType.EXPENSE,
              category: finalCategory
            });
          }
        }

        setPendingTransactions(newTransactions);
        
        const groups = analyzeGroups(newTransactions);
        
        if (groups.length > 0) {
          setDetectedGroups(groups);
          setStep('GROUP');
        } else {
          onImport(newTransactions);
          handleClose();
        }
      }
    });
  };

  // --- Grouping Algorithm ---
  const analyzeGroups = (transactions: Transaction[]): GroupedTransaction[] => {
    const groups: Record<string, { ids: string[], example: string, count: number }> = {};

    transactions.forEach(t => {
      // Only group expenses that are currently uncategorized (OTHER)
      if (t.type === TransactionType.EXPENSE && t.category === Category.OTHER) {
        const cleanDesc = t.description
          .toLowerCase()
          .replace(/[0-9]/g, '') // remove numbers
          .replace(/[^\w\s\u00C0-\u017F]/g, '') // remove special chars but keep polish letters
          .trim();
        
        const signature = cleanDesc.split(/\s+/).slice(0, 3).join(' ');
        
        if (signature.length < 3) return; 

        if (!groups[signature]) {
          groups[signature] = { ids: [], example: t.description, count: 0 };
        }
        groups[signature].ids.push(t.id);
        groups[signature].count++;
      }
    });

    return Object.entries(groups)
      .map(([signature, data]) => ({
        signature,
        example: data.example,
        count: data.count,
        ids: data.ids,
        currentCategory: Category.OTHER,
        enabled: true
      }))
      .filter(g => g.count > 1) 
      .sort((a, b) => b.count - a.count);
  };

  const handleUpdateGroupCategory = (signature: string, newCategory: string) => {
    // Only update the group definition, do not touch pendingTransactions yet
    setDetectedGroups(prev => prev.map(g => 
      g.signature === signature ? { ...g, currentCategory: newCategory } : g
    ));
  };

  const toggleGroup = (signature: string) => {
    setDetectedGroups(prev => prev.map(g => 
      g.signature === signature ? { ...g, enabled: !g.enabled } : g
    ));
  };

  const handleFinalImport = () => {
    // Apply group categories to transactions
    const finalTransactions = pendingTransactions.map(t => {
      const group = detectedGroups.find(g => g.ids.includes(t.id));
      if (group && group.enabled) {
        return { ...t, category: group.currentCategory };
      }
      return t;
    });

    onImport(finalTransactions);
    handleClose();
  };

  const handleClose = () => {
    setStep('UPLOAD');
    setImportedFile(null);
    setRawFile([]);
    setFileName('');
    setMappings({});
    setError('');
    setPendingTransactions([]);
    setDetectedGroups([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${step === 'GROUP' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-900'}`}>
              {step === 'GROUP' ? <Layers size={20} /> : <FileSpreadsheet size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {step === 'UPLOAD' && 'Importuj transakcje'}
                {step === 'MAP' && 'Dopasuj kolumny'}
                {step === 'GROUP' && 'Grupowa kategoryzacja'}
              </h2>
              {step === 'GROUP' && (
                <p className="text-xs text-slate-400 font-normal">Zaznacz grupy, którym chcesz nadać wspólną kategorię.</p>
              )}
            </div>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {step === 'UPLOAD' && (
            <div className="h-64 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center bg-white hover:bg-slate-50 transition-colors cursor-pointer relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload size={48} className="text-slate-400 mb-4" />
              <p className="text-slate-600 font-medium">Kliknij lub upuść plik CSV tutaj</p>
              <p className="text-xs text-slate-400 mt-2">Obsługiwane formaty: .csv (większość polskich banków)</p>
              {error && (
                <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-1 rounded-full">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}
            </div>
          )}

          {step === 'MAP' && (
            <div className="space-y-6">
              {/* Settings Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center shadow-sm">
                <div className="flex items-center gap-4 text-sm text-slate-600">
                   <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={hasHeader} 
                      onChange={(e) => setHasHeader(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                    />
                    Pierwszy wiersz to nagłówki
                  </label>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Settings2 size={14} /> Separator dziesiętny:
                  </span>
                  <div className="flex bg-slate-100 rounded-lg p-0.5">
                    <button 
                      onClick={() => setDecimalSeparator(',')}
                      className={`px-2 py-0.5 rounded ${decimalSeparator === ',' ? 'bg-white text-indigo-700 font-medium shadow-sm' : 'text-slate-500'}`}
                    >
                      1,00
                    </button>
                    <button 
                      onClick={() => setDecimalSeparator('.')}
                      className={`px-2 py-0.5 rounded ${decimalSeparator === '.' ? 'bg-white text-indigo-700 font-medium shadow-sm' : 'text-slate-500'}`}
                    >
                      1.00
                    </button>
                  </div>
                </div>
              </div>

              {/* Preview Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        {rawFile[0]?.map((_, colIndex) => (
                          <th key={colIndex} className="p-2 min-w-[160px]">
                            <select
                              value={mappings[colIndex] || 'skip'}
                              onChange={(e) => setMappings(prev => ({ ...prev, [colIndex]: e.target.value as ColumnMapping }))}
                              className={`w-full p-2 rounded-lg border text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-colors ${
                                mappings[colIndex] && mappings[colIndex] !== 'skip' 
                                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700' 
                                  : 'border-slate-200 bg-white'
                              }`}
                            >
                              <option value="skip">Ignoruj kolumnę</option>
                              <option value="date">Data transakcji</option>
                              <option value="description">Opis operacji</option>
                              <option value="amount">Kwota</option>
                              <option value="category">Kategoria (opcjonalne)</option>
                            </select>
                          </th>
                        ))}
                      </tr>
                      {hasHeader && (
                        <tr>
                          {rawFile[0].map((cell, i) => (
                            <th key={i} className="px-4 py-2 font-semibold text-slate-700 border-t border-slate-100 bg-slate-50/50">
                              {cell}
                            </th>
                          ))}
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rawFile.slice(hasHeader ? 1 : 0).map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-slate-50">
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className={`px-4 py-2 truncate max-w-[200px] ${
                              mappings[cellIndex] === 'amount' ? 'text-right font-mono text-slate-600' : 'text-slate-600'
                            }`}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {step === 'GROUP' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-center w-12">
                        {/* Checkbox Column */}
                      </th>
                      <th className="px-4 py-3">Wykryta grupa (Wspólny opis)</th>
                      <th className="px-4 py-3 text-center">Liczba transakcji</th>
                      <th className="px-4 py-3">Przypisz kategorię</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detectedGroups.map((group, idx) => (
                      <tr key={idx} className={`transition-colors ${group.enabled ? 'hover:bg-slate-50' : 'bg-slate-50 opacity-60'}`}>
                        <td className="px-4 py-4 text-center">
                          <input 
                            type="checkbox"
                            checked={group.enabled}
                            onChange={() => toggleGroup(group.signature)}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className={`font-medium capitalize ${group.enabled ? 'text-slate-800' : 'text-slate-500'}`}>
                            {group.signature}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">
                            np. {group.example}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs font-bold">
                            {group.count}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <select
                            value={group.currentCategory}
                            onChange={(e) => handleUpdateGroupCategory(group.signature, e.target.value)}
                            disabled={!group.enabled}
                            className={`w-full max-w-[200px] bg-white border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                                group.currentCategory !== Category.OTHER && group.enabled
                                ? 'border-indigo-300 text-indigo-700 font-medium bg-indigo-50'
                                : 'border-slate-200 text-slate-600'
                            }`}
                          >
                            {Object.values(Category).filter(c => c !== Category.SALARY).map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-400 text-center">
                Zaznaczone grupy zostaną zaktualizowane. Odznaczone pozostaną w kategorii "Inne".
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3 z-10">
          <Button variant="secondary" onClick={handleClose}>Anuluj</Button>
          
          {step === 'UPLOAD' && (
             <Button disabled className="opacity-0">Dalej</Button>
          )}

          {step === 'MAP' && (
            <Button onClick={handleParseAndAnalyze} disabled={!Object.values(mappings).some(v => v !== 'skip')}>
              Dalej <ArrowRight size={16} />
            </Button>
          )}

          {step === 'GROUP' && (
            <Button onClick={handleFinalImport}>
              <Check size={16} /> Zatwierdź i importuj ({pendingTransactions.length})
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}