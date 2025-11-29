
import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, Sankey, Tooltip, Layer, Rectangle } from 'recharts';
import { ArrowLeft } from 'lucide-react';
import { Transaction, TransactionType, CategoryItem } from '../types';
import { CURRENCY_FORMATTER, SYSTEM_IDS } from '../constants';

interface SankeyDiagramProps {
  transactions: Transaction[];
  categories: CategoryItem[];
}

export const SankeyDiagram: React.FC<SankeyDiagramProps> = ({ transactions, categories }) => {
  const [drillDownCategoryId, setDrillDownCategoryId] = useState<string | null>(null);

  const { data, totalVolume, isDrillDown, activeCategoryColor } = useMemo(() => {
    // --- MODE 1: DRILL DOWN (Single Category -> Subcategories) ---
    if (drillDownCategoryId) {
      const activeCategory = categories.find(c => c.id === drillDownCategoryId);
      const catName = activeCategory ? activeCategory.name : 'Wybrana kategoria';
      const catColor = activeCategory ? activeCategory.color : '#64748b';

      const relevantTxs = transactions.filter(t => t.categoryId === drillDownCategoryId);
      const subMap: Record<string, number> = {};
      let total = 0;

      relevantTxs.forEach(t => {
        let subName = 'Inne';
        if (t.subcategoryId) {
          const sub = activeCategory?.subcategories.find(s => s.id === t.subcategoryId);
          if (sub) subName = sub.name;
        }
        subMap[subName] = (subMap[subName] || 0) + t.amount;
        total += t.amount;
      });

      if (total === 0) return { data: { nodes: [], links: [] }, totalVolume: 0, isDrillDown: true, activeCategoryColor: catColor };

      const sortedSubKeys = Object.keys(subMap).sort((a, b) => subMap[b] - subMap[a]);

      // Nodes: Source (Category) + Targets (Subcategories)
      const nodes = [
        { name: catName, fill: catColor, value: total, isInteractable: false },
        ...sortedSubKeys.map(name => ({ 
          name, 
          fill: '#94a3b8', // Subcategories default to slate
          value: subMap[name],
          isInteractable: false
        }))
      ];

      const links = sortedSubKeys.map((name, index) => ({
        source: 0,
        target: index + 1,
        value: subMap[name]
      }));

      return { data: { nodes, links }, totalVolume: total, isDrillDown: true, activeCategoryColor: catColor };
    }

    // --- MODE 2: OVERVIEW (Income -> Budget -> Expenses) ---
    const incomeMap: Record<string, number> = {};
    const expenseMap: Record<string, number> = {};
    // Store category IDs for interactivity
    const expenseIdMap: Record<string, string> = {}; 
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
         if (cat) expenseIdMap[catName] = cat.id;
      }
    });

    if (totalIncome === 0 && Object.keys(expenseMap).length === 0) {
        return { data: { nodes: [], links: [] }, totalVolume: 0, isDrillDown: false, activeCategoryColor: '' };
    }

    // Pass 2: Detect collisions
    const incomeKeys = Object.keys(incomeMap);
    const expenseKeys = Object.keys(expenseMap);
    const duplicates = new Set(incomeKeys.filter(k => expenseKeys.includes(k)));
    
    if (incomeMap['Nieznana']) duplicates.add('Nieznana');
    if (incomeMap['Inne']) duplicates.add('Inne');
    
    // Pass 3: Build Nodes
    const safeIncomeMap: Record<string, number> = {};
    const safeExpenseMap: Record<string, number> = {};
    const safeExpenseIdMap: Record<string, string> = {}; // Name -> ID

    incomeKeys.forEach(k => {
        const newKey = duplicates.has(k) ? `${k} (Wpływ)` : k;
        safeIncomeMap[newKey] = incomeMap[k];
    });

    expenseKeys.forEach(k => {
        const newKey = duplicates.has(k) ? `${k} (Wydatek)` : k;
        safeExpenseMap[newKey] = expenseMap[k];
        if (expenseIdMap[k]) safeExpenseIdMap[newKey] = expenseIdMap[k];
    });

    const totalAllocated = Object.values(expenseMap).reduce((sum, val) => sum + val, 0);
    const remaining = totalIncome - totalAllocated;
    const hasRemaining = remaining > 0;
    const volume = Math.max(totalIncome, totalAllocated);

    const sortedIncomeKeys = Object.keys(safeIncomeMap).sort((a, b) => safeIncomeMap[b] - safeIncomeMap[a]);
    
    const sortedExpenseKeys = Object.keys(safeExpenseMap).sort((a, b) => {
       return safeExpenseMap[b] - safeExpenseMap[a];
    });

    const nodes = [
      ...sortedIncomeKeys.map(name => ({ name, fill: '#22c55e', value: safeIncomeMap[name], isInteractable: false })), 
      { name: 'Budżet', fill: '#0f172a', value: volume, isInteractable: false }, 
      ...sortedExpenseKeys.map(name => {
         const rawName = name.replace(' (Wydatek)', '');
         const cat = categories.find(c => c.name === rawName);
         return { 
             name, 
             fill: cat ? cat.color : '#94a3b8', 
             value: safeExpenseMap[name],
             isInteractable: true, // Mark as clickable
             categoryId: safeExpenseIdMap[name]
         };
      }),
      ...(hasRemaining ? [{ name: 'Dostępne Środki', fill: '#6366f1', value: remaining, isInteractable: false }] : [])
    ];

    const getNodeIndex = (name: string) => nodes.findIndex(n => n.name === name);
    const walletIndex = getNodeIndex('Budżet');

    const links: any[] = [];
    sortedIncomeKeys.forEach(cat => links.push({ source: getNodeIndex(cat), target: walletIndex, value: safeIncomeMap[cat] }));
    sortedExpenseKeys.forEach(cat => links.push({ source: walletIndex, target: getNodeIndex(cat), value: safeExpenseMap[cat] }));
    if (hasRemaining) links.push({ source: walletIndex, target: getNodeIndex('Dostępne Środki'), value: remaining });

    return { data: { nodes, links }, totalVolume: volume, isDrillDown: false, activeCategoryColor: '' };
  }, [transactions, categories, drillDownCategoryId]);

  if (data.nodes.length === 0) return <div className="p-4 text-center text-slate-400">Brak danych.</div>;

  const renderNode = (props: any) => {
    const { x, y, width, height, index, payload, containerWidth } = props;
    const isOut = x > (containerWidth || 500) / 2;
    const percent = totalVolume > 0 ? ((payload.value / totalVolume) * 100).toFixed(1) : '0';
    
    const isInteractable = payload.isInteractable && !isDrillDown;
    const cursor = isInteractable ? 'pointer' : 'default';
    
    return (
      <Layer key={`node-${index}`}>
        <g 
          onClick={() => {
            if (isInteractable && payload.categoryId) {
              setDrillDownCategoryId(payload.categoryId);
            }
          }}
          style={{ cursor }}
          onMouseEnter={(e) => {
             if(isInteractable) (e.currentTarget as SVGElement).style.opacity = '0.8';
          }}
          onMouseLeave={(e) => {
             if(isInteractable) (e.currentTarget as SVGElement).style.opacity = '1';
          }}
        >
          <Rectangle
            x={x} y={y} width={width} height={height}
            fill={payload.fill} 
            fillOpacity={1}
            rx={6} ry={6}
            style={{ cursor, pointerEvents: 'auto' }}
          />
          
          {/* Label Group */}
          <text
            x={isOut ? x + width + 8 : x - 8}
            y={y + height / 2}
            dy={-5}
            textAnchor={isOut ? 'start' : 'end'}
            fontSize={13}
            fill="#0f172a" 
            fontWeight="600"
            style={{ cursor, pointerEvents: 'auto' }}
          >
            {payload.name}
          </text>

          {/* Value Label */}
          <text
            x={isOut ? x + width + 8 : x - 8}
            y={y + height / 2}
            dy={12}
            textAnchor={isOut ? 'start' : 'end'}
            fontSize={11}
            fill="#64748b"
            style={{ cursor, pointerEvents: 'auto' }}
          >
            {CURRENCY_FORMATTER.format(payload.value)} ({percent}%)
          </text>
        </g>
      </Layer>
    );
  };

  return (
    <div className="w-full flex flex-col h-[540px]">
        {/* Header / Navigation */}
        <div className="flex items-center justify-between mb-2 h-8">
            {isDrillDown ? (
                <button 
                    onClick={() => setDrillDownCategoryId(null)}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition-colors animate-fade-in"
                >
                    <ArrowLeft size={14} /> Wróć do pełnego obrazu
                </button>
            ) : (
                <div /> /* Spacer to keep height consistent if needed, or just empty */
            )}
        </div>

      <div className="flex-1 font-sans">
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={data}
            node={renderNode}
            nodePadding={isDrillDown ? 60 : 40}
            margin={{ top: 60, bottom: 20, left: 160, right: 160 }}
            link={{ stroke: '#cbd5e1', strokeOpacity: 0.25 }}
            iterations={0}
          >
            <Tooltip content={({ active, payload }: any) => {
               if (!active || !payload?.length) return null;
               const d = payload[0].payload;
               const val = d.value;
               const percent = totalVolume > 0 ? ((val/totalVolume)*100).toFixed(1) : '0';
               const label = d.name || (d.source?.name + ' → ' + d.target?.name);
               
               return (
                   <div className="bg-white p-2.5 border border-slate-100 shadow-xl rounded-lg text-xs z-50">
                       <div className="font-bold text-slate-800 mb-0.5">{label}</div>
                       <div className="text-slate-600">
                           {CURRENCY_FORMATTER.format(val)} <span className="text-slate-400">({percent}%)</span>
                       </div>
                   </div>
               );
            }} />
          </Sankey>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
