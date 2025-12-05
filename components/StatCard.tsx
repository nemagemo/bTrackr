
import React from 'react';

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  colorClass?: string;
  bgClass?: string;
  isPrivateMode?: boolean;
  subValue?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  label, 
  value, 
  icon, 
  colorClass = "text-slate-900", 
  bgClass = "bg-slate-50 dark:bg-slate-700/30",
  isPrivateMode, 
  subValue 
}) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] dark:shadow-none border border-slate-100 dark:border-slate-700 flex overflow-hidden h-28 transition-transform hover:scale-[1.02]">
      {/* Left Side: Content */}
      <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
        <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">{label}</span>
        
        <div>
          <div className={`text-2xl font-bold tracking-tight truncate ${colorClass} dark:text-white`}>
            {isPrivateMode ? '***' : value}
          </div>
          {subValue && (
            <div className="text-xs font-medium mt-1 truncate text-slate-400 dark:text-slate-500">
               {subValue}
            </div>
          )}
        </div>
      </div>

      {/* Right Side: Icon Strip */}
      <div className={`w-14 flex items-center justify-center shrink-0 ${bgClass} ${colorClass} dark:text-current transition-colors`}>
        {icon}
      </div>
    </div>
  );
};
