import React, { useMemo } from 'react';
import { ResponsiveContainer, Sankey, Tooltip, Layer, Rectangle } from 'recharts';
import { Transaction, TransactionType, CategoryItem } from '../types';
import { CURRENCY_FORMATTER, SYSTEM_IDS } from '../constants';

interface SankeyDiagramProps {
  transactions: Transaction[];
  categories: CategoryItem[];
}

export const SankeyDiagram: React.FC<SankeyDiagramProps> = ({ transactions, categories }) => {
  const { data, totalVolume } = useMemo(() => {
    const incomeMap: Record<string, number> = {};
    const expenseMap: Record<string, number> = {};
    let totalIncome = 0;
    
    // Pass 1: Collect raw sums
    transactions.forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const catName = cat ? cat.name : 'Nieznana';

      if (t.type === TransactionType.INCOME) {
        incomeMap[catName] = (incomeMap[catName] || 0) + t.amount;
        totalIncome += t.amount;
      } else {
         expenseMap[catName] = (expenseMap[catName] || 0) + t.amount;
      }
    });

    if (totalIncome === 0 && Object.keys(expenseMap).length === 0) return { data: { nodes: [], links: [] }, totalVolume: 0 };

    // Pass 2: Detect collisions (names that exist in both income and expense)
    const incomeKeys = Object.keys(incomeMap);
    const expenseKeys = Object.keys(expenseMap);
    const duplicates = new Set(incomeKeys.filter(k => expenseKeys.includes(k)));
    
    // Add special cases that should always be distinct if encountered
    if (incomeMap['Nieznana']) duplicates.add('Nieznana');
    if (incomeMap['Inne']) duplicates.add('Inne');
    
    // Pass 3: Build Nodes and Links with safe names
    const safeIncomeMap: Record<string, number> = {};
    const safeExpenseMap: Record<string, number> = {};

    incomeKeys.forEach(k => {
        const newKey = duplicates.has(k) ? `${k} (Wpływ)` : k;
        safeIncomeMap[newKey] = incomeMap[k];
    });

    expenseKeys.forEach(k => {
        const newKey = duplicates.has(k) ? `${k} (Wydatek)` : k;
        safeExpenseMap[newKey] = expenseMap[k];
    });

    const totalAllocated = Object.values(expenseMap).reduce((sum, val) => sum + val, 0);
    const remaining = totalIncome - totalAllocated;
    const hasRemaining = remaining > 0;
    const volume = Math.max(totalIncome, totalAllocated);

    const sortedIncomeKeys = Object.keys(safeIncomeMap).sort();
    
    // Sort expenses: put Consumption first, then Savings/Investments
    const sortedExpenseKeys = Object.keys(safeExpenseMap).sort((a, b) => {
       const rawA = a.replace(' (Wydatek)', '');
       const rawB = b.replace(' (Wydatek)', '');
       
       const catA = categories.find(c => c.name === rawA);
       const catB = categories.find(c => c.name === rawB);
       
       const isSavingA = catA?.id === SYSTEM_IDS.SAVINGS || catA?.id === SYSTEM_IDS.INVESTMENTS;
       const isSavingB = catB?.id === SYSTEM_IDS.SAVINGS || catB?.id === SYSTEM_IDS.INVESTMENTS;
       
       if (isSavingA && !isSavingB) return 1;
       if (!isSavingA && isSavingB) return -1;
       return safeExpenseMap[b] - safeExpenseMap[a];
    });

    const nodes = [
      ...sortedIncomeKeys.map(name => ({ name, fill: '#22c55e', value: safeIncomeMap[name] })), 
      { name: 'Budżet', fill: '#0f172a', value: volume }, 
      ...sortedExpenseKeys.map(name => {
         const rawName = name.replace(' (Wydatek)', '');
         const cat = categories.find(c => c.name === rawName);
         return { name, fill: cat ? cat.color : '#94a3b8', value: safeExpenseMap[name] };
      }),
      ...(hasRemaining ? [{ name: 'Dostępne Środki', fill: '#6366f1', value: remaining }] : [])
    ];

    const getNodeIndex = (name: string) => nodes.findIndex(n => n.name === name);
    const walletIndex = getNodeIndex('Budżet');

    const links: any[] = [];
    sortedIncomeKeys.forEach(cat => links.push({ source: getNodeIndex(cat), target: walletIndex, value: safeIncomeMap[cat] }));
    sortedExpenseKeys.forEach(cat => links.push({ source: walletIndex, target: getNodeIndex(cat), value: safeExpenseMap[cat] }));
    if (hasRemaining) links.push({ source: walletIndex, target: getNodeIndex('Dostępne Środki'), value: remaining });

    return { data: { nodes, links }, totalVolume: volume };
  }, [transactions, categories]);

  if (data.nodes.length === 0) return <div className="p-4 text-center text-slate-400">Brak danych.</div>;

  const renderNode = (props: any) => {
    const { x, y, width, height, index, payload, containerWidth } = props;
    // Simple heuristic: if x is past half the width, it's an output node (right side)
    const isOut = x > (containerWidth || 500) / 2;
    const percent = totalVolume > 0 ? ((payload.value / totalVolume) * 100).toFixed(1) : '0';

    return (
      <Layer key={`node-${index}`}>
        <Rectangle
          x={x} y={y} width={width} height={height}
          fill={payload.fill} fillOpacity={1}
        />
        {/* Main Label */}
        <text
          x={isOut ? x + width + 6 : x - 6}
          y={y + height / 2}
          dy={-4}
          textAnchor={isOut ? 'start' : 'end'}
          fontSize={12}
          fill="#0f172a" // slate-900
          fontWeight="600"
        >
          {payload.name}
        </text>
        {/* Value Label */}
        <text
          x={isOut ? x + width + 6 : x - 6}
          y={y + height / 2}
          dy={10}
          textAnchor={isOut ? 'start' : 'end'}
          fontSize={10}
          fill="#64748b" // slate-500
        >
          {CURRENCY_FORMATTER.format(payload.value)} ({percent}%)
        </text>
      </Layer>
    );
  };

  return (
    <div className="h-[500px] w-full font-sans">
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={data}
          node={renderNode}
          nodePadding={40}
          margin={{ top: 20, bottom: 20, left: 160, right: 160 }}
          link={{ stroke: '#cbd5e1', strokeOpacity: 0.3 }}
        >
          <Tooltip content={({ active, payload }: any) => {
             if (!active || !payload?.length) return null;
             const d = payload[0].payload;
             const val = d.value;
             const percent = totalVolume > 0 ? ((val/totalVolume)*100).toFixed(1) : '0';
             return <div className="bg-white p-2 border shadow text-xs rounded"><b>{d.name || (d.source?.name + ' → ' + d.target?.name)}</b>: {CURRENCY_FORMATTER.format(val)} ({percent}%)</div>
          }} />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
};