import React from 'react';

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  colorClass?: string;
  isPrivateMode?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, colorClass = "text-slate-900", isPrivateMode }) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] border border-slate-100 flex flex-col items-start justify-between h-32 transition-transform hover:scale-[1.02]">
      <div className="flex w-full justify-between items-start">
        <span className="text-slate-500 text-sm font-medium">{label}</span>
        <div className={`p-2 rounded-lg bg-slate-50 ${colorClass}`}>
          {icon}
        </div>
      </div>
      <div className={`text-2xl font-bold tracking-tight ${colorClass} ${isPrivateMode ? 'blur-[8px] select-none' : ''}`}>
        {value}
      </div>
    </div>
  );
};