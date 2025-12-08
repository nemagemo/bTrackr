
import React from 'react';
import { LayoutDashboard, LineChart, History, Settings, Eye, EyeOff, Upload, Sun, Moon } from 'lucide-react';
import { Logo } from './Logo';

export type Tab = 'dashboard' | 'analysis' | 'history' | 'settings';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isPrivateMode: boolean;
  togglePrivateMode: () => void;
  onOpenImport: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  theme,
  toggleTheme,
  isPrivateMode,
  togglePrivateMode,
  onOpenImport
}) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 pb-20 md:pb-0 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between relative">
          <div className="flex items-center">
            <Logo className="h-10 w-auto text-slate-900 dark:text-white" />
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-1 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>Pulpit</button>
            <button onClick={() => setActiveTab('analysis')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'analysis' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>Analiza</button>
            <button onClick={() => setActiveTab('history')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'history' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>Historia</button>
            <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'settings' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>Ustawienia</button>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button 
               onClick={toggleTheme}
               className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
               title={theme === 'dark' ? "Tryb jasny" : "Tryb ciemny"}
            >
               {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
               onClick={onOpenImport}
               className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
               title="Importuj dane"
            >
               <Upload size={20} />
            </button>
            <button 
               onClick={togglePrivateMode}
               className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
               title={isPrivateMode ? "Pokaż kwoty" : "Ukryj kwoty"}
            >
               {isPrivateMode ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-2 flex justify-around z-50 pb-safe">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'dashboard' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
          <LayoutDashboard size={20} />
          <span className="text-[10px] font-medium mt-1">Pulpit</span>
        </button>
        <button onClick={() => setActiveTab('analysis')} className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'analysis' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
          <LineChart size={20} />
          <span className="text-[10px] font-medium mt-1">Analiza</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'history' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
          <History size={20} />
          <span className="text-[10px] font-medium mt-1">Historia</span>
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'settings' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
          <Settings size={20} />
          <span className="text-[10px] font-medium mt-1">Opcje</span>
        </button>
      </div>
    </div>
  );
};
