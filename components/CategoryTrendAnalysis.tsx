
import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { BarChart3, TrendingUp, Activity, Filter } from 'lucide-react';
import { Transaction, TransactionType, CategoryItem } from '../types';
import { CURRENCY_FORMATTER } from '../constants';

interface CategoryTrendAnalysisProps {
  transactions: Transaction[];
  categories: CategoryItem[];
}

type ChartType = 'BAR' | 'AREA' | 'LINE';

const COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f43f5e', // Rose
  '#14b8a6', // Teal
];

export const CategoryTrendAnalysis: React.FC<CategoryTrendAnalysisProps> = ({ transactions, categories }) => {
  const expenseCategories = useMemo(() => categories.filter(c => c.type === TransactionType.EXPENSE), [categories]);
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(expenseCategories[0]?.id || '');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [chartType, setChartType] = useState<ChartType>('BAR');

  const availableYears = useMemo(() => {
    const years = new Set(transactions.map(t => new Date(t.date).getFullYear()));
    return Array.from(years).sort((a: number, b: number) => b - a);
  }, [transactions]);

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  const chartData = useMemo(() => {
    if (!selectedCategoryId) return [];

    // 1. Filter transactions
    const filteredTxs = transactions.filter(t => {
      const d = new Date(t.date);
      return t.categoryId === selectedCategoryId && d.getFullYear() === selectedYear;
    });

    // 2. Initialize months
    const dataByMonth: Record<number, any> = {};
    for (let i = 0; i < 12; i++) {
      dataByMonth[i] = { 
        name: new Date(2000, i, 1).toLocaleDateString('pl-PL', { month: 'short' }),
        monthIndex: i 
        // subcategories will be added dynamically
      };
      // Initialize all subcategories to 0 for consistent stacking
      selectedCategory?.subcategories.forEach(sub => {
        dataByMonth[i][sub.name] = 0;
      });
      // Also init "Inne" if not present in subcategories list (safety)
      dataByMonth[i]['Inne'] = 0;
    }

    // 3. Aggregate
    filteredTxs.forEach(t => {
      const month = new Date(t.date).getMonth();
      let subName = 'Inne';
      if (t.subcategoryId) {
        const sub = selectedCategory?.subcategories.find(s => s.id === t.subcategoryId);
        if (sub) subName = sub.name;
      }
      
      if (!dataByMonth[month][subName]) dataByMonth[month][subName] = 0;
      dataByMonth[month][subName] += t.amount;
    });

    return Object.values(dataByMonth);
  }, [transactions, selectedCategoryId, selectedYear, selectedCategory]);

  if (!selectedCategoryId) return null;

  const subcategoryKeys = selectedCategory?.subcategories.map(s => s.name) || ['Inne'];

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 30, left: 0, bottom: 0 }
    };

    switch (chartType) {
      case 'AREA':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}`} />
            <Tooltip formatter={(value: number) => CURRENCY_FORMATTER.format(value)} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            {subcategoryKeys.map((key, index) => (
              <Area 
                key={key} 
                type="monotone" 
                dataKey={key} 
                stackId="1" 
                stroke={COLORS[index % COLORS.length]} 
                fill={COLORS[index % COLORS.length]} 
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        );
      case 'LINE':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}`} />
            <Tooltip formatter={(value: number) => CURRENCY_FORMATTER.format(value)} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            {subcategoryKeys.map((key, index) => (
              <Line 
                key={key} 
                type="monotone" 
                dataKey={key} 
                stroke={COLORS[index % COLORS.length]} 
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        );
      case 'BAR':
      default:
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}`} />
            <Tooltip formatter={(value: number) => CURRENCY_FORMATTER.format(value)} cursor={{fill: 'transparent'}} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            {subcategoryKeys.map((key, index) => (
              <Bar 
                key={key} 
                dataKey={key} 
                stackId="a" 
                fill={COLORS[index % COLORS.length]} 
                radius={[0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        );
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-semibold text-slate-800">Szczegółowa analiza kategorii</h3>
          <p className="text-xs text-slate-400 mt-1">Sprawdź strukturę wydatków w czasie</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={selectedCategoryId} 
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 min-w-[180px]"
          >
            {expenseCategories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
          >
            {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
          </select>

          <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100">
            <button 
              onClick={() => setChartType('BAR')}
              className={`p-1.5 rounded-md transition-all ${chartType === 'BAR' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="Wykres słupkowy"
            >
              <BarChart3 size={16} />
            </button>
            <button 
              onClick={() => setChartType('AREA')}
              className={`p-1.5 rounded-md transition-all ${chartType === 'AREA' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="Wykres obszarowy"
            >
              <TrendingUp size={16} />
            </button>
            <button 
              onClick={() => setChartType('LINE')}
              className={`p-1.5 rounded-md transition-all ${chartType === 'LINE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="Wykres liniowy"
            >
              <Activity size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
