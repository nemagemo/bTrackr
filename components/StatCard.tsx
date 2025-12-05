
import React from 'react';

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  colorClass?: string;
  isPrivateMode?: boolean;
  subValue?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, colorClass = "text-slate-900", isPrivateMode, subValue }) => {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] dark:shadow-none border border-slate-100 dark:border-slate-700 flex flex-col items-start justify-between h-32 transition-transform hover:scale-[1.02]">
      <div className="flex w-full justify-between items-start">
        <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">{label}</span>
        <div className={`p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 ${colorClass} dark:text-current`}>
          {icon}
        </div>
      </div>
      <div className="w-full">
        <div className={`text-2xl font-bold tracking-tight ${colorClass} dark:text-white`}>
          {isPrivateMode ? '***' : value}
        </div>
        {subValue && (
          <div className="text-xs font-medium mt-1 truncate text-slate-400 dark:text-slate-500">
             {subValue}
          </div>
        )}
      </div>
    </div>
  );
};
