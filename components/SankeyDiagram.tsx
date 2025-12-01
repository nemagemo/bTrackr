
import React, { useMemo, useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { sankey as d3Sankey, sankeyLinkHorizontal, sankeyLeft } from 'd3-sankey';
import { ArrowLeft, Layers, Grid } from 'lucide-react';
import { Transaction, TransactionType, CategoryItem } from '../types';
import { CURRENCY_FORMATTER } from '../constants';

interface SankeyDiagramProps {
  transactions: Transaction[];
  categories: CategoryItem[];
  isPrivateMode?: boolean;
}

export const SankeyDiagram: React.FC<SankeyDiagramProps> = ({ transactions, categories, isPrivateMode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 600 });
  const [drillDownCategoryId, setDrillDownCategoryId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'CATEGORY' | 'SUBCATEGORY'>('CATEGORY');

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
     if (isPrivateMode) return '***';
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

      const nodeList = [
        { name: catName, displayName: catName, color: catColor, value: total, isInteractable: false, type: 'ROOT' }, 
        ...sortedSubKeys.map(name => ({ 
          name, 
          displayName: name,
          color: '#cbd5e1', 
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

    // --- MODE 2: OVERVIEW (Income -> Budget -> Expenses/Subcategories) ---
    const incomeMap: Record<string, number> = {};
    const expenseMap: Record<string, number> = {}; // Key is either CatName or "CatName: SubName"
    const expenseIdMap: Record<string, string> = {}; // Maps Key to Category ID (for coloring)
    let totalIncome = 0;
    
    transactions.forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const catName = cat ? cat.name : 'Nieznana';

      if (t.type === TransactionType.INCOME) {
        incomeMap[catName] = (incomeMap[catName] || 0) + t.amount;
        totalIncome += t.amount;
      } else {
         // EXPENSE LOGIC
         let key = catName;
         
         if (viewMode === 'SUBCATEGORY') {
             let subName = 'Inne';
             if (t.subcategoryId) {
                 const sub = cat?.subcategories.find(s => s.id === t.subcategoryId);
                 if (sub) subName = sub.name;
             }
             // Create unique key for subcategory to avoid collisions between categories
             key = `${catName}: ${subName}`;
         }

         expenseMap[key] = (expenseMap[key] || 0) + t.amount;
         if (cat) expenseIdMap[key] = cat.id;
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
    const balance = totalIncome - totalAllocated;
    const hasSurplus = balance > 0.01;
    const hasDeficit = balance < -0.01;
    const deficitAmount = Math.abs(balance);

    // Sorting Logic
    const sortedIncomeKeys = Object.keys(safeIncomeMap).sort((a, b) => safeIncomeMap[b] - safeIncomeMap[a]);
    
    const allExpenseKeys = Object.keys(safeExpenseMap);
    
    // Helper to sort expenses: By Category Name first (to group subcats), then by Value
    const sortExpenseKeys = (keys: string[]) => {
        return keys.sort((a, b) => {
            const catIdA = safeExpenseIdMap[a];
            const catIdB = safeExpenseIdMap[b];
            
            // In Category mode, catId is enough. In Subcategory mode, grouping by catId keeps them together.
            if (viewMode === 'SUBCATEGORY' && catIdA !== catIdB) {
                // Find category names to sort alphabetically
                const catA = categories.find(c => c.id === catIdA);
                const catB = categories.find(c => c.id === catIdB);
                return (catA?.name || '').localeCompare(catB?.name || '');
            }
            
            // If same category (or Category Mode), sort by value descending
            return safeExpenseMap[b] - safeExpenseMap[a];
        });
    };

    const savingsKeys = sortExpenseKeys(allExpenseKeys.filter(key => {
        const catId = safeExpenseIdMap[key];
        const cat = categories.find(c => c.id === catId);
        return cat?.isIncludedInSavings;
    }));

    const regularExpenseKeys = sortExpenseKeys(allExpenseKeys.filter(key => {
        const catId = safeExpenseIdMap[key];
        const cat = categories.find(c => c.id === catId);
        return !cat?.isIncludedInSavings;
    }));

    // Construct Node List
    const nodeList = [
      // 1. Incomes
      ...sortedIncomeKeys.map(name => ({ name, displayName: name, color: '#22c55e', isInteractable: false, type: 'INCOME' })), 
      
      // 2. Deficit
      ...(hasDeficit ? [{ name: 'Deficyt (Z oszczędności)', displayName: 'Deficyt (Z oszczędności)', color: '#f87171', isInteractable: false, type: 'DEFICIT' }] : []),

      // 3. Budget Center
      { name: 'Budżet', displayName: 'Budżet', color: '#0f172a', isInteractable: false, type: 'BUDGET' }, 
      
      // 4. Targets
      ...(hasSurplus ? [{ name: 'Dostępne Środki', displayName: 'Dostępne Środki', color: '#6366f1', isInteractable: false, type: 'SURPLUS' }] : []),
      
      ...savingsKeys.map(name => {
         const rawName = name.replace(' (Wydatek)', '');
         const catId = safeExpenseIdMap[name];
         const cat = categories.find(c => c.id === catId);
         
         // In SUBCATEGORY mode, name is "Cat: Sub". We want to display "Sub".
         let displayName = rawName;
         if (viewMode === 'SUBCATEGORY' && rawName.includes(': ')) {
             displayName = rawName.split(': ')[1];
         }

         return { 
             name, 
             displayName,
             color: cat ? cat.color : '#94a3b8', 
             isInteractable: viewMode === 'CATEGORY', // Only interactable in Category mode
             categoryId: catId,
             type: 'SAVINGS'
         };
      }),

      ...regularExpenseKeys.map(name => {
         const rawName = name.replace(' (Wydatek)', '');
         const catId = safeExpenseIdMap[name];
         const cat = categories.find(c => c.id === catId);

         let displayName = rawName;
         if (viewMode === 'SUBCATEGORY' && rawName.includes(': ')) {
             displayName = rawName.split(': ')[1];
         }

         return { 
             name, 
             displayName,
             color: cat ? cat.color : '#94a3b8', 
             isInteractable: viewMode === 'CATEGORY',
             categoryId: catId,
             type: 'EXPENSE'
         };
      }),
    ];

    const linkList: any[] = [];
    
    // Indices
    const deficitIndex = hasDeficit ? sortedIncomeKeys.length : -1;
    const budgetIndex = sortedIncomeKeys.length + (hasDeficit ? 1 : 0);
    
    // Links: Income -> Budget
    sortedIncomeKeys.forEach((name, i) => {
       linkList.push({ source: i, target: budgetIndex, value: safeIncomeMap[name] });
    });

    if (hasDeficit) {
        linkList.push({ source: deficitIndex, target: budgetIndex, value: deficitAmount });
    }

    let targetStartIndex = budgetIndex + 1;

    // Link: Budget -> Surplus
    if (hasSurplus) {
        linkList.push({ source: budgetIndex, target: targetStartIndex, value: balance });
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
  }, [transactions, categories, drillDownCategoryId, viewMode]);

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
      .nodeSort(null);

    const nodes = rawNodes.map(d => ({ ...d }));
    const links = rawLinks.map(d => ({ ...d }));

    const { nodes: computedNodes, links: computedLinks } = sankeyGenerator({ nodes, links });

    // --- MANUAL CENTERING (Only in Overview Mode) ---
    if (!isDrillDown) {
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

        const leftSideNodes = computedNodes.filter((n: any) => 
           computedLinks.some((l: any) => l.source.index === n.index && l.target.name === 'Budżet')
        );
        if (leftSideNodes.length > 0) {
           const minY = Math.min(...leftSideNodes.map((n: any) => n.y0));
           const maxY = Math.max(...leftSideNodes.map((n: any) => n.y1));
           const grpHeight = maxY - minY;
           const targetY = (height - grpHeight) / 2;
           const dy = targetY - minY;
           leftSideNodes.forEach((n: any) => {
              n.y0 += dy; n.y1 += dy;
              computedLinks.filter((l: any) => l.source.index === n.index).forEach((l: any) => l.y0 += dy);
           });
        }
    }
    
    computedNodes.forEach((n: any) => { n.x0 += margin.left; n.x1 += margin.left; n.y0 += margin.top; n.y1 += margin.top; });
    computedLinks.forEach((l: any) => { l.y0 += margin.top; l.y1 += margin.top; });

    return { nodes: computedNodes, links: computedLinks, width };
  }, [rawNodes, rawLinks, dimensions, isDrillDown]);

  const getLinkColor = (link: any) => {
      if (isDrillDown) return link.source.color || '#cbd5e1';
      if (link.target.name === 'Budżet') {
          if (link.source.type === 'DEFICIT') return '#f87171';
          return '#22c55e';
      }
      if (link.source.name === 'Budżet') {
          if (link.target.name === 'Dostępne Środki') return '#22c55e';
          if (link.target.type === 'SAVINGS') return '#3b82f6';
          return '#ef4444';
      }
      return '#e2e8f0';
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
            ) : (
                <div className="flex bg-slate-50 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('CATEGORY')}
                        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'CATEGORY' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Layers size={14} /> Główne
                    </button>
                    <button
                        onClick={() => setViewMode('SUBCATEGORY')}
                        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'SUBCATEGORY' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Grid size={14} /> Szczegółowe
                    </button>
                </div>
            )}
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
                              <title>{`${link.source.displayName || link.source.name} → ${link.target.displayName || link.target.name}\n${formatValue(link.value)}`}</title>
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
                                 <title>{`${node.displayName || node.name}: ${formatValue(node.value)}`}</title>
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
                                     {node.displayName || node.name}
                                  </text>
                                  <text
                                     x={textX}
                                     y={(node.y1 + node.y0) / 2 + 14}
                                     dy="0.35em"
                                     textAnchor={textAnchor}
                                     fontSize={10} fill="#64748b"
                                     className={`pointer-events-none`}
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
