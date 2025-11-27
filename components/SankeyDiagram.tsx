import React, { useMemo } from 'react';
import { ResponsiveContainer, Sankey, Tooltip, Layer, Rectangle } from 'recharts';
import { Transaction, TransactionType } from '../types';
import { CATEGORY_COLORS, CURRENCY_FORMATTER } from '../constants';

interface SankeyDiagramProps {
  transactions: Transaction[];
}

export const SankeyDiagram: React.FC<SankeyDiagramProps> = ({ transactions }) => {
  const { data, totalVolume } = useMemo(() => {
    // 1. Calculate Totals
    const incomeMap: Record<string, number> = {};
    const expenseMap: Record<string, number> = {};
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
      if (t.type === TransactionType.INCOME) {
        incomeMap[t.category] = (incomeMap[t.category] || 0) + t.amount;
        totalIncome += t.amount;
      } else {
        expenseMap[t.category] = (expenseMap[t.category] || 0) + t.amount;
        totalExpense += t.amount;
      }
    });

    if (totalIncome === 0 && totalExpense === 0) return { data: { nodes: [], links: [] }, totalVolume: 0 };

    const savings = totalIncome - totalExpense;
    const hasSavings = savings > 0;
    // We use totalIncome as the base for percentages unless it's 0 (unlikely in this logic), then we use expense sum
    const volume = totalIncome > 0 ? totalIncome : totalExpense;

    // 2. Build Nodes with Colors
    // Order matters for layout: Income -> Budget -> Expenses/Savings
    const incomeCategories = Object.keys(incomeMap).sort();
    const expenseCategories = Object.keys(expenseMap).sort((a, b) => expenseMap[b] - expenseMap[a]);

    const nodes = [
      ...incomeCategories.map(name => ({ name, fill: '#22c55e', value: incomeMap[name] })), // Green for Income
      { name: 'Budżet', fill: '#0f172a', value: volume }, // Dark Slate for Budget
      ...expenseCategories.map(name => ({ name, fill: CATEGORY_COLORS[name] || '#94a3b8', value: expenseMap[name] })),
      ...(hasSavings ? [{ name: 'Oszczędności', fill: '#6366f1', value: savings }] : []) // Indigo for Savings
    ];

    const getNodeIndex = (name: string) => nodes.findIndex(n => n.name === name);
    const walletIndex = getNodeIndex('Budżet');

    // 3. Build Links
    const links: { source: number; target: number; value: number }[] = [];

    // Income -> Wallet
    incomeCategories.forEach(cat => {
      links.push({
        source: getNodeIndex(cat),
        target: walletIndex,
        value: incomeMap[cat]
      });
    });

    // Wallet -> Expenses
    expenseCategories.forEach(cat => {
      links.push({
        source: walletIndex,
        target: getNodeIndex(cat),
        value: expenseMap[cat]
      });
    });

    // Wallet -> Savings
    if (hasSavings) {
      links.push({
        source: walletIndex,
        target: getNodeIndex('Oszczędności'),
        value: savings
      });
    }

    return { data: { nodes, links }, totalVolume: volume };
  }, [transactions]);

  if (data.nodes.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 p-4 text-center">
        <p>Brak danych dla wybranego okresu.</p>
        <p className="text-xs mt-2">Zmień filtry powyżej lub dodaj transakcje.</p>
      </div>
    );
  }

  // Custom Node Renderer
  const renderNode = (props: any) => {
    const { x, y, width, height, index, payload, containerWidth } = props;
    const isOut = x + width + 6 > containerWidth / 2;
    
    // Calculate percentage relative to total volume
    // Note: Recharts Sankey sometimes passes value directly, but we want to be sure relative to TOTAL budget
    const percent = totalVolume > 0 ? ((payload.value / totalVolume) * 100).toFixed(1) : '0';

    return (
      <Layer key={`node-${index}`}>
        <Rectangle
          x={x}
          y={y}
          width={width}
          height={height}
          fill={payload.fill}
          fillOpacity={1}
          radius={[4, 4, 4, 4]}
        />
        <text
          x={isOut ? x - 8 : x + width + 8}
          y={y + height / 2 - 2} // Slightly up
          textAnchor={isOut ? 'end' : 'start'}
          dy="0.35em"
          fontSize={12}
          fill="#334155"
          fontWeight={600}
        >
          {payload.name}
        </text>
        <text
          x={isOut ? x - 8 : x + width + 8}
          y={y + height / 2 + 14} // Slightly down
          textAnchor={isOut ? 'end' : 'start'}
          dy="0.35em"
          fontSize={11}
          fill="#64748b"
        >
          {/* Always show value + percent */}
          {`${CURRENCY_FORMATTER.format(payload.value)} (${percent}%)`}
        </text>
      </Layer>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      const isLink = d.source && d.target;
      const val = d.value;
      const percent = totalVolume > 0 ? ((val / totalVolume) * 100).toFixed(1) : '0';
      
      return (
        <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-lg text-xs z-50">
          {isLink ? (
            <>
              <p className="font-semibold text-slate-800 mb-1">
                {d.source.name} <span className="text-slate-300">→</span> {d.target.name}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-indigo-600 font-bold">{CURRENCY_FORMATTER.format(val)}</span>
                <span className="text-slate-400">({percent}%)</span>
              </div>
            </>
          ) : (
             <>
              <p className="font-semibold text-slate-800 mb-1">{d.name}</p>
              <div className="flex items-center gap-2">
                <span className="text-indigo-600 font-bold">{CURRENCY_FORMATTER.format(val)}</span>
                <span className="text-slate-400">({percent}%)</span>
              </div>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[500px] w-full font-sans">
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={data}
          node={renderNode}
          nodePadding={40}
          // Increase right margin to fit labels
          margin={{ top: 20, bottom: 20, left: 20, right: 160 }}
          link={{ stroke: '#cbd5e1', strokeOpacity: 0.25 }}
        >
          <Tooltip content={<CustomTooltip />} />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
};