
import React, { useState } from 'react';
import { ShieldCheck, ChevronDown, ChevronUp, Database, GlobeLock, Cookie } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [isPrivacyOpen, setPrivacyOpen] = useState(false);

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 mt-auto transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Main Footer Row */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
          
          {/* Left: Brand & Copyright */}
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="font-semibold text-slate-600 dark:text-slate-300">bTrackr</span>
            <span>&copy; {currentYear} Wszystkie prawa zastrzeżone.</span>
          </div>

          {/* Center: Interactive Privacy Badge */}
          <button 
            onClick={() => setPrivacyOpen(!isPrivacyOpen)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200 group ${isPrivacyOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'}`}
          >
            <ShieldCheck size={14} className={isPrivacyOpen ? "text-indigo-600 dark:text-indigo-400" : "text-emerald-500"} />
            <span className="font-medium">Prywatność: Dane tylko na Twoim urządzeniu</span>
            {isPrivacyOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} className="opacity-50 group-hover:opacity-100" />}
          </button>

          {/* Right: Version Only */}
          <div className="flex flex-col items-center md:items-end gap-1 font-mono opacity-60">
            <span>v1.0.3 (Beta)</span>
          </div>
        </div>

        {/* Expanded Privacy Notice */}
        {isPrivacyOpen && (
          <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 animate-fade-in text-left shadow-inner">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-4 text-sm flex items-center gap-2">
              <ShieldCheck size={16} className="text-indigo-500" /> Nota o Prywatności i Plikach Cookies
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <div className="space-y-2">
                <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Database size={14} className="text-emerald-500" /> Brak serwerów
                </div>
                <p>
                  bTrackr działa w 100% lokalnie (Local-First). Twoje dane finansowe są zapisywane wyłącznie w bazie danych Twojej przeglądarki (IndexedDB). Nie wysyłamy, nie gromadzimy ani nie analizujemy Twoich transakcji na zewnętrznych serwerach.
                </p>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <GlobeLock size={14} className="text-amber-500" /> Bezpieczeństwo i Backup
                </div>
                <p>
                  Ponieważ dane znajdują się tylko na Twoim urządzeniu, wyczyszczenie pamięci podręcznej przeglądarki spowoduje ich utratę. Zalecamy regularne wykonywanie kopii zapasowej (plik JSON) w zakładce Ustawienia.
                </p>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Cookie size={14} className="text-pink-500" /> Cookies i LocalStorage
                </div>
                <p>
                  Aplikacja nie używa śledzących plików cookie ani trackerów reklamowych. Mechanizm LocalStorage wykorzystywany jest wyłącznie technicznie do zapamiętania Twoich preferencji (motyw jasny/ciemny, stan trybu prywatnego).
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </footer>
  );
};
