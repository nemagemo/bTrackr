
import React, { useRef } from 'react';
import { FileSpreadsheet, FileJson, FilePlus, Trash2, RefreshCw, Sparkles, CalendarDays, ArrowRight, Download, AlertTriangle, Upload } from 'lucide-react';
import { Button } from './Button';
import { BackupData, CategoryItem, TransactionType } from '../types';
import { ColumnMapping, DateFormat, GroupedTransaction, RawTransactionRow } from '../utils/importHelpers';

// --- STEP 1: UPLOAD ---
interface StepUploadProps {
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}
export const StepUpload: React.FC<StepUploadProps> = ({ onFileUpload, error }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
     <div className="h-64 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center relative bg-white dark:bg-slate-800 transition-colors hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-700/30">
       <input ref={fileInputRef} type="file" accept=".csv, .json" onChange={onFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
       <div className="flex gap-4 text-slate-300 dark:text-slate-600 mb-4">
          <FileSpreadsheet size={48} />
          <FileJson size={48} />
       </div>
       <p className="text-slate-600 dark:text-slate-300 font-medium">Upuść plik lub kliknij, aby wybrać</p>
       <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center max-w-md">
          Obsługiwane: <br/>
          <strong>.csv</strong> - wyciągi bankowe LUB listy transakcji<br/>
          <strong>.json</strong> - kopie zapasowe bTrackr LUB listy transakcji
       </p>
       {error && <p className="text-red-500 dark:text-red-400 mt-2 font-medium bg-red-50 dark:bg-red-900/30 px-3 py-1 rounded">{error}</p>}
     </div>
  );
};

// --- STEP 2: DECISION (Append vs Replace) ---
interface StepDecisionProps {
  onDecision: (mode: 'APPEND' | 'REPLACE') => void;
}
export const StepDecision: React.FC<StepDecisionProps> = ({ onDecision }) => {
  return (
    <div className="max-w-xl mx-auto space-y-4 pt-4">
      <h3 className="text-center font-bold text-slate-800 dark:text-white mb-6">W aplikacji istnieją już transakcje. Co chcesz zrobić?</h3>
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => onDecision('APPEND')} className="p-6 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 font-bold text-slate-700 dark:text-slate-200 flex flex-col items-center transition-all shadow-sm hover:shadow-md group">
            <FilePlus className="mb-3 text-slate-400 group-hover:text-indigo-500 dark:text-slate-500 dark:group-hover:text-indigo-400" size={32}/> 
            <span>Dołącz do obecnych</span>
            <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500 mt-1">Inteligentnie pominie duplikaty</span>
        </button>
        <button onClick={() => onDecision('REPLACE')} className="p-6 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl hover:border-red-500 dark:hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold text-slate-700 dark:text-slate-200 flex flex-col items-center transition-all shadow-sm hover:shadow-md group">
            <Trash2 className="mb-3 text-slate-400 group-hover:text-red-500 dark:text-slate-500 dark:group-hover:text-red-400" size={32}/> 
            <span>Wyczyść i Zastąp</span>
            <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500 mt-1">Usunie obecną historię</span>
        </button>
      </div>
    </div>
  );
};

// --- STEP 3: MAPPING ---
interface StepMapProps {
  rawFile: string[][];
  mappings: Record<number, ColumnMapping>;
  setMappings: React.Dispatch<React.SetStateAction<Record<number, ColumnMapping>>>;
  hasHeader: boolean;
  setHasHeader: (val: boolean) => void;
  dateFormat: DateFormat;
  setDateFormat: (val: DateFormat) => void;
  onNext: () => void;
}
export const StepMap: React.FC<StepMapProps> = ({ 
    rawFile, mappings, setMappings, hasHeader, setHasHeader, dateFormat, setDateFormat, onNext 
}) => {
  return (
    <div className="space-y-4">
       <div className="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-xl flex flex-wrap items-center gap-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 px-1">
            <input 
              type="checkbox" 
              id="hasHeader" 
              checked={hasHeader} 
              onChange={(e) => setHasHeader(e.target.checked)} 
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer bg-white dark:bg-slate-800 accent-indigo-600"
              style={{ colorScheme: 'light' }}
            />
            <label htmlFor="hasHeader" className="text-sm text-slate-700 dark:text-slate-300 font-medium select-none cursor-pointer">
              Pierwszy wiersz to nagłówki
            </label>
          </div>

          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 hidden sm:block"></div>

          <div className="flex items-center gap-2 animate-fade-in">
              <CalendarDays size={16} className="text-slate-500 dark:text-slate-400" />
              <label className="text-sm text-slate-700 dark:text-slate-300 font-medium">Format daty:</label>
              <select 
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value as DateFormat)}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              >
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                  <option value="MM-DD-YYYY">MM-DD-YYYY</option>
              </select>
          </div>
       </div>
      
      <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl overflow-x-auto mb-2">
        <div className="overflow-x-auto max-h-[400px]">
        <table className="w-full text-sm relative">
          <thead className="sticky top-0 z-10 bg-white dark:bg-slate-800">
            <tr>
              {rawFile[0]?.map((_, i) => (
                <th key={i} className="p-2 min-w-[130px] bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <select 
                    value={mappings[i] || 'skip'} 
                    onChange={(e) => setMappings(prev => ({ ...prev, [i]: e.target.value as ColumnMapping }))} 
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 focus:outline-none shadow-sm"
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
              <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                {rawFile[0].map((c, i) => (
                  <th key={i} className="p-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {rawFile.slice(hasHeader ? 1 : 0, (hasHeader ? 1 : 0) + 5).map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} className="p-3 text-slate-600 dark:text-slate-300 border-t border-slate-50 dark:border-slate-700 whitespace-nowrap max-w-[200px] truncate" title={c}>
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
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
             Pokazuję podgląd pierwszych 5 wierszy z {rawFile.length}.
          </p>
      )}
      
      <div className="flex justify-end pt-4">
         <Button onClick={onNext}>Dalej <ArrowRight size={16}/></Button>
      </div>
    </div>
  );
};

// --- STEP 4: CORRECTION ---
interface StepCorrectionProps {
  validCount: number;
  failedRows: RawTransactionRow[];
  dateFormat: DateFormat;
  setDateFormat: (val: DateFormat) => void;
  preview: {original: string, parsed: string}[];
  onApply: () => void;
}
export const StepCorrection: React.FC<StepCorrectionProps> = ({ 
    validCount, failedRows, dateFormat, setDateFormat, preview, onApply 
}) => {
  return (
     <div className="max-w-xl mx-auto space-y-6">
         <div className="flex gap-4 mb-6">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex-1 text-center">
                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">Poprawne</div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{validCount}</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/30 flex-1 text-center">
                <div className="text-xs text-red-500 dark:text-red-400 uppercase font-bold tracking-wider mb-1">Błędne</div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{failedRows.length}</div>
            </div>
         </div>

         <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
             <h3 className="font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                <RefreshCw size={18} className="text-indigo-600 dark:text-indigo-400"/>
                Napraw błędne wiersze
             </h3>
             
             <div className="grid grid-cols-2 gap-4 mb-4 mt-4">
                <div>
                   <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Przykład (Błąd)</label>
                   <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm font-mono text-slate-700 dark:text-slate-300">
                      {preview[0]?.original || '---'}
                   </div>
                </div>
                <div className="flex flex-col justify-end">
                   <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Próba naprawy</label>
                   <div className={`border rounded-lg p-2 text-sm font-mono ${preview[0]?.parsed.includes('Nadal') || preview[0]?.parsed.includes('Błąd') ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300' : 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300'}`}>
                      {preview[0]?.parsed || '---'}
                   </div>
                </div>
             </div>

             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Wybierz właściwy format daty:</label>
             <select 
                 value={dateFormat}
                 onChange={(e) => setDateFormat(e.target.value as DateFormat)}
                 className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
             >
                 <option value="DD-MM-YYYY">DD-MM-YYYY (np. 31-01-2024)</option>
                 <option value="MM-DD-YYYY">MM-DD-YYYY (np. 01-31-2024)</option>
                 <option value="YYYY-MM-DD">YYYY-MM-DD (np. 2024-01-31)</option>
             </select>
         </div>
         
         <Button onClick={onApply} className="w-full justify-center">Zastosuj i Importuj</Button>
     </div>
  );
};

// --- STEP 5: GROUPING ---
interface StepGroupProps {
  detectedGroups: GroupedTransaction[];
  setDetectedGroups: React.Dispatch<React.SetStateAction<GroupedTransaction[]>>;
  categories: CategoryItem[];
  onConfirm: () => void;
}
export const StepGroup: React.FC<StepGroupProps> = ({ 
    detectedGroups, setDetectedGroups, categories, onConfirm 
}) => {
  const toggleGroup = (sig: string) => {
    setDetectedGroups(prev => prev.map(g => g.signature === sig ? { ...g, enabled: !g.enabled } : g));
  };

  const handleUpdateGroupCategory = (sig: string, catName: string) => {
    const cat = categories.find(c => c.name === catName);
    let defaultSub = '';
    if (cat && cat.subcategories.length === 1) {
        defaultSub = cat.subcategories[0].name;
    } else if (cat && cat.subcategories.find(s => s.name === 'Inne')) {
        defaultSub = 'Inne';
    }
    setDetectedGroups(prev => prev.map(g => g.signature === sig ? { ...g, currentCategoryName: catName, currentSubcategoryName: defaultSub } : g));
  };
  
  const handleUpdateGroupSubcategory = (sig: string, subName: string) => {
    setDetectedGroups(prev => prev.map(g => g.signature === sig ? { ...g, currentSubcategoryName: subName } : g));
  };

  return (
     <div className="space-y-4">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl p-4 mb-6">
           <h3 className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2"><Sparkles size={16}/> Wykryto powtarzalne transakcje</h3>
           <p className="text-sm text-indigo-700 dark:text-indigo-400 mt-1">Możesz przypisać kategorię do całych grup transakcji jednocześnie.</p>
        </div>
        
        <div className="space-y-3">
           {detectedGroups.map((group) => (
              <div key={group.signature} className={`bg-white dark:bg-slate-800 border rounded-xl p-4 transition-all ${group.enabled ? 'border-indigo-200 dark:border-indigo-800 shadow-sm' : 'border-slate-100 dark:border-slate-700 opacity-60'}`}>
                 <div className="flex items-start gap-3">
                    <input type="checkbox" checked={group.enabled} onChange={() => toggleGroup(group.signature)} className="mt-1 w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-700" />
                    <div className="flex-1">
                       <div className="flex justify-between mb-1">
                          <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">x{group.count}</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500 italic truncate max-w-[200px]">"{group.example}"</span>
                       </div>
                       <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-3">"{group.signature.toUpperCase()}"...</h4>
                       
                       {group.enabled && (
                          <div className="flex gap-2">
                             <select 
                                value={group.currentCategoryName}
                                onChange={(e) => handleUpdateGroupCategory(group.signature, e.target.value)}
                                className="flex-1 text-xs border border-slate-200 dark:border-slate-600 rounded-lg p-2 bg-slate-50 dark:bg-slate-900 focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                             >
                                <option value="Inne">Kategoria...</option>
                                {categories.filter(c => c.type === TransactionType.EXPENSE).map(c => (
                                   <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                             </select>
                             <select 
                                value={group.currentSubcategoryName}
                                onChange={(e) => handleUpdateGroupSubcategory(group.signature, e.target.value)}
                                className="flex-1 text-xs border border-slate-200 dark:border-slate-600 rounded-lg p-2 bg-slate-50 dark:bg-slate-900 focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                             >
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
        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700 mt-4">
           <Button onClick={onConfirm} className="w-full sm:w-auto">
              Zatwierdź grupy i importuj
           </Button>
        </div>
     </div>
  );
};

// --- STEP 6: BACKUP CONFIRM ---
interface StepBackupProps {
  backupData: BackupData;
  onRestore: () => void;
}
export const StepBackup: React.FC<StepBackupProps> = ({ backupData, onRestore }) => {
  return (
      <div className="max-w-md mx-auto text-center space-y-6 pt-6">
         <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto">
            <FileJson size={32} />
         </div>
         
         <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Przywrócić kopię zapasowej?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
               Wykryto pełną kopię zapasową bTrackr.<br/>
               Data: <span className="font-mono font-medium">{new Date(backupData.timestamp).toLocaleString()}</span>
            </p>
         </div>

         <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-4">
               <div className="text-2xl font-bold text-slate-800 dark:text-white">{backupData.transactions.length}</div>
               <div className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold">Transakcji</div>
            </div>
            <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-4">
               <div className="text-2xl font-bold text-slate-800 dark:text-white">{backupData.categories.length}</div>
               <div className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold">Kategorii</div>
            </div>
         </div>

         <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-lg p-4 text-left flex gap-3">
            <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
               <strong>Uwaga:</strong> Przywrócenie kopii zastąpi WSZYSTKIE obecne dane.
            </p>
         </div>

         <Button onClick={onRestore} className="w-full justify-center py-3">
            Przywróć pełną kopię
         </Button>
      </div>
  );
};
