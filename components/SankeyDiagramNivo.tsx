
import React, { useMemo } from 'react';
import { ResponsiveSankey } from '@nivo/sankey';
import { Transaction, TransactionType, CategoryItem } from '../types';
import { CURRENCY_FORMATTER } from '../constants';

interface SankeyDiagramNivoProps {
  transactions: Transaction[];
  categories: CategoryItem[];
}

export const SankeyDiagramNivo: React.FC<SankeyDiagramNivoProps> = ({ transactions, categories }) => {
  const data = useMemo(() => {
    const incomeMap: Record<string, number> = {};
    const expenseMap: Record<string, number> = {};
    let totalIncome = 0;
    
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

    const incomeKeys = Object.keys(incomeMap);
    const expenseKeys = Object.keys(expenseMap);
    
    // Disambiguate names
    const duplicates = new Set(incomeKeys.filter(k => expenseKeys.includes(k)));
    if (incomeMap['Nieznana']) duplicates.add('Nieznana');
    if (incomeMap['Inne']) duplicates.add('Inne');

    const nodes = [
       { id: 'Budżet', nodeColor: '#0f172a' },
       ...incomeKeys.map(k => {
          const id = duplicates.has(k) ? `${k} (Wpływ)` : k;
          return { id, nodeColor: '#22c55e' };
       }),
       ...expenseKeys.map(k => {
          const id = duplicates.has(k) ? `${k} (Wydatek)` : k;
          const rawName = k;
          const cat = categories.find(c => c.name === rawName);
          return { id, nodeColor: cat ? cat.color : '#94a3b8' };
       })
    ];

    const totalAllocated = Object.values(expenseMap).reduce((sum, val) => sum + val, 0);
    const remaining = totalIncome - totalAllocated;
    if (remaining > 0.01) {
       nodes.push({ id: 'Dostępne Środki', nodeColor: '#6366f1' });
    }

    const links: any[] = [];
    incomeKeys.forEach(k => {
       const source = duplicates.has(k) ? `${k} (Wpływ)` : k;
       links.push({ source, target: 'Budżet', value: incomeMap[k] });
    });

    expenseKeys.forEach(k => {
       const target = duplicates.has(k) ? `${k} (Wydatek)` : k;
       links.push({ source: 'Budżet', target, value: expenseMap[k] });
    });

    if (remaining > 0.01) {
       links.push({ source: 'Budżet', target: 'Dostępne Środki', value: remaining });
    }

    return { nodes, links };
  }, [transactions, categories]);

  if (data.nodes.length === 0) return null;

  return (
    <div className="w-full h-[500px]">
       <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider">Wariant Nivo (Automatyczne wyrównanie)</h4>
       <ResponsiveSankey
        data={data}
        margin={{ top: 40, right: 160, bottom: 40, left: 160 }}
        align="justify"
        colors={(node: any) => node.nodeColor}
        nodeOpacity={1}
        nodeHoverOthersOpacity={0.35}
        nodeThickness={18}
        nodeSpacing={12}
        nodeBorderRadius={3}
        linkOpacity={0.25}
        linkHoverOthersOpacity={0.1}
        enableLinkGradient={true}
        labelPosition="outside"
        labelOrientation="horizontal"
        labelPadding={16}
        labelTextColor={{ from: 'color', modifiers: [ [ 'darker', 1 ] ] }}
        tooltip={({ node }) => (
            <div className="bg-white p-2 border border-slate-100 shadow-xl rounded text-xs">
                <strong>{node.id}</strong>: {CURRENCY_FORMATTER.format(node.value)}
            </div>
        )}
    />
    </div>
  );
};
