import React, { useMemo, useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { sankey as d3Sankey, sankeyLinkHorizontal, sankeyLeft } from 'd3-sankey';
import { ArrowLeft } from 'lucide-react';
import { Transaction, TransactionType, CategoryItem } from '../types';
import { CURRENCY_FORMATTER } from '../constants';

interface SankeyDiagramProps {
  transactions: Transaction[];
  categories: CategoryItem[];
  isPrivateMode?: boolean;
}

export const SankeyDiagram: React.FC<SankeyDiagramProps> = ({ transactions, categories, isPrivateMode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 500 });
  const [drillDownCategoryId, setDrillDownCategoryId] = useState<string | null>(null);

  // Measure container
  useEffect(() => {
    const measure = () => {
        if (containerRef.current) {
            const { width } = containerRef.current.getBoundingClientRect();
            if (width > 0) setDimensions(prev => ({ ...prev, width }));
        }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const formatValue = (val: number) => {
     if (isPrivateMode) return '****';
     return CURRENCY_FORMATTER.format(val);
  };

  const { nodes: rawNodes, links: rawLinks, isDrillDown } = useMemo(() => {
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

      if (total === 0) return { nodes: [], links: [], isDrillDown: true };

      const sortedSubKeys = Object.keys(subMap).sort((a, b) => subMap[b] - subMap[a]);

      // D3 nodes need unique IDs or indexes. We'll use objects.
      const nodeList = [
        { name: catName, color: catColor, value: total, isInteractable: false, type: 'ROOT' }, // Source
        ...sortedSubKeys.map(name => ({ 
          name, 
          color: '#cbd5e1', // Subcategories in gray
          value: subMap[name],
          isInteractable: false,
          type: 'SUB'
        }))
      ];

      const linkList = sortedSubKeys.map((name, index) => ({
        source: 0,
        target: index + 1,
        value: subMap[name]
      }));

      return { nodes: nodeList, links: linkList, isDrillDown: true };
    }

    // --- MODE 2: OVERVIEW (Income -> Budget -> Expenses) ---
    const incomeMap: Record<string, number> = {};
    const expenseMap: Record<string, number> = {};
    const expenseIdMap: Record<string, string> = {}; 
    let totalIncome = 0;
    
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

    const incomeKeys = Object.keys(incomeMap);
    const expenseKeys = Object.keys(expenseMap);
    
    const duplicates = new Set(incomeKeys.filter(k => expenseKeys.includes(k)));
    if (incomeMap['Nieznana']) duplicates.add('Nieznana');
    if (incomeMap['Inne']) duplicates.add('Inne');

    const safeIncomeMap: Record<string, number> = {};
    const safeExpenseMap: Record<string, number> = {};
    const safeExpenseIdMap: Record<string, string> = {};

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
    const hasRemaining = remaining > 0.01;

    // Sorting Logic
    const sortedIncomeKeys = Object.keys(safeIncomeMap).sort((a, b) => safeIncomeMap[b] - safeIncomeMap[a]);
    
    // Split expenses into Savings vs Regular
    const allExpenseKeys = Object.keys(safeExpenseMap);
    
    const savingsKeys = allExpenseKeys.filter(key => {
        const catId = safeExpenseIdMap[key];
        const cat = categories.find(c => c.id === catId);
        return cat?.isIncludedInSavings;
    }).sort((a, b) => safeExpenseMap[b] - safeExpenseMap[a]);

    const regularExpenseKeys = allExpenseKeys.filter(key => {
        const catId = safeExpenseIdMap[key];
        const cat = categories.find(c => c.id === catId);
        return !cat?.isIncludedInSavings;
    }).sort((a, b) => safeExpenseMap[b] - safeExpenseMap[a]);

    // Construct Node List: Incomes -> Budget -> [Surplus -> Savings -> Regular]
    const nodeList = [
      // 1. Incomes
      ...sortedIncomeKeys.map(name => ({ name, color: '#22c55e', isInteractable: false, type: 'INCOME' })), 
      
      // 2. Budget Center
      { name: 'Budżet', color: '#0f172a', isInteractable: false, type: 'BUDGET' }, 
      
      // 3. Targets (Order: Surplus -> Savings -> Regular)
      ...(hasRemaining ? [{ name: 'Dostępne Środki', color: '#6366f1', isInteractable: false, type: 'SURPLUS' }] : []),
      
      ...savingsKeys.map(name => {
         const rawName = name.replace(' (Wydatek)', '');
         const cat = categories.find(c => c.name === rawName);
         const catId = safeExpenseIdMap[name];
         return { 
             name, 
             color: cat ? cat.color : '#94a3b8', 
             isInteractable: true,
             categoryId: catId,
             type: 'SAVINGS'
         };
      }),

      ...regularExpenseKeys.map(name => {
         const rawName = name.replace(' (Wydatek)', '');
         const cat = categories.find(c => c.name === rawName);
         const catId = safeExpenseIdMap[name];
         return { 
             name, 
             color: cat ? cat.color : '#94a3b8', 
             isInteractable: true,
             categoryId: catId,
             type: 'EXPENSE'
         };
      }),
    ];

    const linkList: any[] = [];
    
    // Indices
    let currentIndex = 0;
    
    // Income Nodes indices: 0 to sortedIncomeKeys.length - 1
    const budgetIndex = sortedIncomeKeys.length;
    
    // Links: Income -> Budget
    sortedIncomeKeys.forEach((name, i) => {
       linkList.push({ source: i, target: budgetIndex, value: safeIncomeMap[name] });
    });

    let targetStartIndex = budgetIndex + 1;

    // Link: Budget -> Surplus
    if (hasRemaining) {
        linkList.push({ source: budgetIndex, target: targetStartIndex, value: remaining });
        targetStartIndex++;
    }

    // Links: Budget -> Savings
    savingsKeys.forEach((name) => {
        linkList.push({ source: budgetIndex, target: targetStartIndex, value: safeExpenseMap[name] });
        targetStartIndex++;
    });

    // Links: Budget -> Regular Expenses
    regularExpenseKeys.forEach((name) => {
        linkList.push({ source: budgetIndex, target: targetStartIndex, value: safeExpenseMap[name] });
        targetStartIndex++;
    });

    return { nodes: nodeList, links: linkList, isDrillDown: false };
  }, [transactions, categories, drillDownCategoryId]);

  const layoutData = useMemo(() => {
    if (dimensions.width === 0 || rawNodes.length === 0) return null;

    const margin = { top: 10, right: 1, bottom: 10, left: 1 };
    const width = Math.max(1, dimensions.width - margin.left - margin.right);
    const height = Math.max(1, dimensions.height - margin.top - margin.bottom);

    const sankeyGenerator = d3Sankey()
      .nodeWidth(16)
      .nodePadding(12)
      .extent([[0, 0], [width, height]])
      .nodeAlign(sankeyLeft)
      .nodeSort(null); // Respect our manual sort order

    const nodes = rawNodes.map(d => ({ ...d }));
    const links = rawLinks.map(d => ({ ...d }));

    const { nodes: computedNodes, links: computedLinks } = sankeyGenerator({ nodes, links });

    // --- MANUAL CENTERING (Only in Overview Mode) ---
    if (!isDrillDown) {
        // 1. Center 'Budżet'
        const budgetNode = computedNodes.find((n: any) => n.name === 'Budżet');
        if (budgetNode) {
           const nodeH = budgetNode.y1 - budgetNode.y0;
           const targetY = (height - nodeH) / 2;
           const dy = targetY - budgetNode.y0;
           budgetNode.y0 += dy;
           budgetNode.y1 += dy;
           computedLinks.filter((l: any) => l.source.index === budgetNode.index).forEach((l: any) => l.y0 += dy);
           computedLinks.filter((l: any) => l.target.index === budgetNode.index).forEach((l: any) => l.y1 += dy);
        }

        // 2. Center Income Group
        const incomeNodes = computedNodes.filter((n: any) => 
           computedLinks.some((l: any) => l.source.index === n.index && l.target.name === 'Budżet')
        );
        if (incomeNodes.length > 0) {
           const minY = Math.min(...incomeNodes.map((n: any) => n.y0));
           const maxY = Math.max(...incomeNodes.map((n: any) => n.y1));
           const grpHeight = maxY - minY;
           const targetY = (height - grpHeight) / 2;
           const dy = targetY - minY;
           incomeNodes.forEach((n: any) => {
              n.y0 += dy; n.y1 += dy;
              computedLinks.filter((l: any) => l.source.index === n.index).forEach((l: any) => l.y0 += dy);
           });
        }
    }
    
    computedNodes.forEach((n: any) => { n.x0 += margin.left; n.x1 += margin.left; n.y0 += margin.top; n.y1 += margin.top; });
    computedLinks.forEach((l: any) => { l.y0 += margin.top; l.y1 += margin.top; });

    return { nodes: computedNodes, links: computedLinks, width };
  }, [rawNodes, rawLinks, dimensions, isDrillDown]);

  // Helper to determine link color
  const getLinkColor = (link: any) => {
      // 1. Drill-down: Use source color (Category Color)
      if (isDrillDown) {
          return link.source.color || '#cbd5e1';
      }

      // 2. Links flowing INTO Budget (Incomes) -> Green
      if (link.target.name === 'Budżet') {
          return '#22c55e'; // Green-500
      }

      // 3. Links flowing OUT of Budget
      if (link.source.name === 'Budżet') {
          // A. Surplus -> Green
          if (link.target.name === 'Dostępne Środki') {
              return '#22c55e'; // Green-500
          }
          
          // B. Savings -> Blue
          // We can check the node type we added earlier or look up the category again
          if (link.target.type === 'SAVINGS') {
              return '#3b82f6'; // Blue-500
          }

          // C. Regular Expenses -> Red
          return '#ef4444'; // Red-500
      }

      return '#e2e8f0'; // Fallback
  };

  return (
    <div className="w-full flex flex-col h-[540px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 h-8">
            {isDrillDown ? (
                <button 
                    onClick={() => setDrillDownCategoryId(null)}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition-colors animate-fade-in"
                >
                    <ArrowLeft size={14} /> Wróć do pełnego obrazu
                </button>
            ) : <div />}
        </div>

        <div ref={containerRef} className="flex-1 w-full relative overflow-hidden">
           {!layoutData ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                 {rawNodes.length === 0 ? 'Brak danych' : 'Ładowanie...'}
              </div>
           ) : (
              <svg width="100%" height="100%" className="overflow-visible">
                  <g>
                     {layoutData.links.map((link: any, i: number) => {
                        const path = sankeyLinkHorizontal()(link);
                        const strokeColor = getLinkColor(link);
                        
                        return (
                           <path 
                              key={i}
                              d={path || ''} 
                              fill="none" 
                              stroke={strokeColor}
                              strokeOpacity={0.6}
                              strokeWidth={Math.max(1, link.width)} 
                              className="hover:stroke-opacity-80 transition-all duration-300"
                           >
                              <title>{`${link.source.name} → ${link.target.name}\n${formatValue(link.value)}`}</title>
                           </path>
                        );
                     })}

                     {layoutData.nodes.map((node: any, i: number) => {
                        const height = Math.max(node.y1 - node.y0, 2);
                        const width = node.x1 - node.x0;
                        const isInteractable = node.isInteractable && !isDrillDown;
                        const showLabel = height > 16; 
                        const isLeft = node.x0 < dimensions.width / 2;
                        const textX = isLeft ? node.x1 + 6 : node.x0 - 6;
                        const textAnchor = isLeft ? 'start' : 'end';

                        return (
                           <g 
                             key={i}
                             style={{ cursor: isInteractable ? 'pointer' : 'default' }}
                             onClick={() => {
                                if (isInteractable && node.categoryId) {
                                   setDrillDownCategoryId(node.categoryId);
                                }
                             }}
                             className={isInteractable ? "hover:opacity-80 transition-opacity" : ""}
                           >
                              <rect 
                                 x={node.x0} y={node.y0} height={height} width={width} 
                                 fill={node.color} rx={4}
                              >
                                 <title>{`${node.name}: ${formatValue(node.value)}`}</title>
                              </rect>
                              
                              {showLabel && (
                                <>
                                  <text
                                     x={textX}
                                     y={(node.y1 + node.y0) / 2}
                                     dy="0.35em"
                                     textAnchor={textAnchor}
                                     fontSize={12} fontWeight={600} fill="#1e293b"
                                     className="pointer-events-none"
                                  >
                                     {node.name}
                                  </text>
                                  <text
                                     x={textX}
                                     y={(node.y1 + node.y0) / 2 + 14}
                                     dy="0.35em"
                                     textAnchor={textAnchor}
                                     fontSize={10} fill="#64748b"
                                     className={`pointer-events-none ${isPrivateMode ? 'blur-[3px]' : ''}`}
                                  >
                                     {formatValue(node.value)}
                                  </text>
                                </>
                              )}
                           </g>
                        );
                     })}
                  </g>
              </svg>
           )}
        </div>
    </div>
  );
};