
import React, { useState } from 'react';
import { Database, FileJson, Download, AlertTriangle } from 'lucide-react';
import { Button } from '../Button';
import { useFinance } from '../../context/FinanceContext';
import { BackupData, CategoryItem, Transaction } from '../../types';
import { ConfirmModal } from '../ConfirmModal';

interface DataManagementProps {
  onOpenImport?: () => void;
  categories: CategoryItem[];
  transactions: Transaction[];
}

export const DataManagement: React.FC<DataManagementProps> = ({ onOpenImport, categories, transactions }) => {
  const { factoryReset, isPrivateMode, recurringTransactions } = useFinance();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const generateBackupData = (): string => {
    const backup: BackupData = {
      version: 1,
      timestamp: new Date().toISOString(),
      categories: categories,
      transactions: transactions,
      recurringTransactions: recurringTransactions,
      settings: { isPrivateMode: isPrivateMode }
    };
    return JSON.stringify(backup, null, 2);
  };

  const handleExportBackup = () => {
    const dataStr = generateBackupData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bTrackr_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
        {/* Import/Export Section */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 p-5 rounded-2xl shadow-sm text-white">
            <div className="flex justify-between items-center gap-4 mb-4">
            <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                <Database size={20} className="text-indigo-400" /> Import/Eksport danych
                </h2>
            </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {onOpenImport && (
                <Button 
                    onClick={onOpenImport} 
                    variant="secondary"
                    className="bg-white/10 !text-white border-white/20 hover:bg-white/20 py-3 px-4 flex-row justify-start items-center gap-4 h-auto group"
                >
                    <div className="p-2 bg-indigo-500/20 rounded-lg shrink-0">
                        <FileJson size={20} className="text-indigo-300 group-hover:text-indigo-200" />
                    </div>
                    <div className="text-left">
                        <span className="block font-bold text-sm text-white">Importuj Plik</span>
                        <span className="block text-[10px] font-normal text-slate-300">CSV lub JSON</span>
                    </div>
                </Button>
            )}
            
            <Button 
                onClick={handleExportBackup} 
                variant="secondary"
                className="bg-white/10 !text-white border-white/20 hover:bg-white/20 py-3 px-4 flex-row justify-start items-center gap-4 h-auto group"
            >
                <div className="p-2 bg-emerald-500/20 rounded-lg shrink-0">
                    <Download size={20} className="text-emerald-300 group-hover:text-emerald-200" />
                </div>
                <div className="text-left">
                    <span className="block font-bold text-sm text-white">Pobierz Backup</span>
                    <span className="block text-[10px] font-normal text-slate-300">Zapisz na dysku (JSON)</span>
                </div>
            </Button>
            </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-5 rounded-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="font-bold text-red-800 dark:text-red-400 flex items-center gap-2">
                        <AlertTriangle size={18} /> Strefa Niebezpieczna
                    </h3>
                    <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                        Działania tutaj są nieodwracalne.
                    </p>
                </div>
                <Button 
                    variant="danger" 
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full sm:w-auto bg-white hover:bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/50"
                >
                    Resetuj aplikację
                </Button>
            </div>
        </div>

        <ConfirmModal 
            isOpen={showResetConfirm}
            title="Reset do ustawień fabrycznych"
            message="UWAGA: Ta operacja nieodwracalnie usunie WSZYSTKIE Twoje dane (transakcje, kategorie, ustawienia). Aplikacja zostanie przywrócona do stanu początkowego. Czy na pewno chcesz kontynuować?"
            onConfirm={() => { factoryReset(); setShowResetConfirm(false); }}
            onClose={() => setShowResetConfirm(false)}
        />
    </div>
  );
};
