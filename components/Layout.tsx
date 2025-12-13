
import React, { useState } from 'react';
import { LayoutDashboard, LineChart, History, Settings, Eye, EyeOff, Sun, Moon, Monitor, Smartphone, ArrowRight } from 'lucide-react';
import { Logo } from './Logo';
import { Footer } from './Footer';

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
  const [showMobileWarning, setShowMobileWarning] = useState(true);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 pb-20 md:pb-0 transition-colors duration-300 flex flex-col">
      
      {/* Mobile Optimization Warning Overlay */}
      {showMobileWarning && (
        <div className="fixed inset-0 z-[100] bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center lg:hidden animate-fade-in">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-full shadow-lg mb-6 ring-4 ring-slate-100 dark:ring-slate-700">
            <Monitor size={48} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
            Wersja Desktopowa
          </h2>
          
          <p className="text-slate-500 dark:text-slate-400 max-w-xs mb-8 leading-relaxed">
            bTrackr został zaprojektowany z myślą o dużych ekranach, aby zapewnić najlepszą czytelność wykresów i analiz.
          </p>

          <button 
            onClick={() => setShowMobileWarning(false)}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all shadow-md shadow-indigo-200 dark:shadow-none active:scale-95"
          >
            <Smartphone size={18} />
            <span>Używaj na telefonie</span>
            <ArrowRight size={16} className="opacity-60" />
          </button>
          
          <p className="text-[10px] text-slate-400 mt-6 uppercase tracking-wider">
            Zalecamy rozdzielczość 1024px+
          </p>
        </div>
      )}

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
               onClick={togglePrivateMode}
               className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
               title={isPrivateMode ? "Pokaż kwoty" : "Ukryj kwoty"}
            >
               {isPrivateMode ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            <button 
               onClick={toggleTheme}
               className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
               title={theme === 'dark' ? "Tryb jasny" : "Tryb ciemny"}
            >
               {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex-1">
        {children}
      </main>

      {/* Footer */}
      <Footer />

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
