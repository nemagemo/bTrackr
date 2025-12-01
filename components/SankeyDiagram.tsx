
import React, { useMemo, useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { sankey as d3Sankey, sankeyLinkHorizontal, sankeyLeft, sankeyJustify } from 'd3-sankey';
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
  const [dimensions, setDimensions] = useState({ width: 0, height: 650 }); // Fixed height enforced
  const [drillDownCategoryId, setDrillDownCategoryId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'CATEGORY' | 'SUBCATEGORY'>('CATEGORY');

  // Measure container
  useEffect(() => {
    const measure = () => {
        if (containerRef.current) {
            const { width, height } = containerRef.current.getBoundingClientRect();
            // Ensure we have a valid height passed to D3, defaulting to 650 if measured is 0/small
            if (width > 0) setDimensions({ width, height: height > 100 ? height : 650 });
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

    // --- MODE 2: OVERVIEW (Hierarchical or Simple) ---
    // Prepare Data Maps
    const incomeMap: Record<string, number> = {};
    const expenseTree: Record<string, { total: number, subs: Record<string, number>, color: string, isSavings: boolean, catId: string }> = {};
    
    let totalIncome = 0;
    
    transactions.forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const catName = cat ? cat.name : 'Nieznana';

      if (t.type === TransactionType.INCOME) {
        incomeMap[catName] = (incomeMap[catName] || 0) + t.amount;
        totalIncome += t.amount;
      } else {
         // Initialize Category Bucket
         if (!expenseTree[catName]) {
             expenseTree[catName] = { 
                 total: 0, 
                 subs: {}, 
                 color: cat ? cat.color : '#94a3b8',
                 isSavings: !!cat?.isIncludedInSavings,
                 catId: cat?.id || ''
             };
         }
         
         // Add to Category Total
         expenseTree[catName].total += t.amount;

         // Add to Subcategory Bucket (if detailed view)
         let subName = 'Inne';
         if (t.subcategoryId) {
             const sub = cat?.subcategories.find(s => s.id === t.subcategoryId);
             if (sub) subName = sub.name;
         }
         expenseTree[catName].subs[subName] = (expenseTree[catName].subs[subName] || 0) + t.amount;
      }
    });

    // --- Calculate Balances ---
    const totalAllocated = Object.values(expenseTree).reduce((sum, item) => sum + item.total, 0);
    const balance = totalIncome - totalAllocated;
    const hasSurplus = balance > 0.01;
    const hasDeficit = balance < -0.01;
    const deficitAmount = Math.abs(balance);

    // --- Build Node List ---
    const nodes: any[] = [];
    const links: any[] = [];

    // Helper to get index
    const addNode = (node: any) => {
        const existing = nodes.findIndex(n => n.name === node.name);
        if (existing !== -1) return existing;
        nodes.push(node);
        return nodes.length - 1;
    };

    // 1. Incomes
    Object.keys(incomeMap).sort((a,b) => incomeMap[b] - incomeMap[a]).forEach(name => {
        addNode({ name: `${name} (Inc)`, displayName: name, color: '#22c55e', type: 'INCOME', value: incomeMap[name] });
    });

    // 2. Deficit
    if (hasDeficit) {
        addNode({ name: 'Deficyt', displayName: 'Deficyt', color: '#f87171', type: 'DEFICIT', value: deficitAmount });
    }

    // 3. Budget
    // 'value' is used by D3 to size the node (must match flows). 
    // 'realValue' is used for display (user logic).
    const budgetD3Value = hasDeficit ? totalAllocated : totalIncome;
    
    const budgetIndex = addNode({ 
        name: 'Budżet', 
        displayName: 'Budżet', 
        color: '#0f172a', 
        type: 'BUDGET', 
        value: budgetD3Value, 
        realValue: totalIncome 
    });

    // 4. Surplus
    if (hasSurplus) {
        const surplusIndex = addNode({ name: 'Nadwyżka', displayName: 'Dostępne Środki', color: '#6366f1', type: 'SURPLUS', value: balance });
        links.push({ source: budgetIndex, target: surplusIndex, value: balance });
    }

    // --- Process Expenses ---
    // Sort categories: Savings first, then largest expenses
    const sortedCatKeys = Object.keys(expenseTree).sort((a, b) => {
        // Savings priority
        if (expenseTree[a].isSavings && !expenseTree[b].isSavings) return -1;
        if (!expenseTree[a].isSavings && expenseTree[b].isSavings) return 1;
        // Then by amount
        return expenseTree[b].total - expenseTree[a].total;
    });

    sortedCatKeys.forEach(catName => {
        const catData = expenseTree[catName];
        
        // Add Category Node
        const catNodeName = `CAT:${catName}`; // Unique internal name
        const catIndex = addNode({ 
            name: catNodeName, 
            displayName: catName, 
            color: catData.color, 
            type: catData.isSavings ? 'SAVINGS' : 'EXPENSE',
            categoryId: catData.catId,
            isInteractable: viewMode === 'CATEGORY', // Only clickable in Main view
            value: catData.total
        });

        // Link Budget -> Category
        links.push({ source: budgetIndex, target: catIndex, value: catData.total });

        // If Detailed View -> Add Subcategories flowing FROM Category
        if (viewMode === 'SUBCATEGORY') {
            const sortedSubKeys = Object.keys(catData.subs).sort((a, b) => catData.subs[b] - catData.subs[a]);
            
            sortedSubKeys.forEach(subName => {
                const subValue = catData.subs[subName];
                const subNodeName = `SUB:${catName}:${subName}`; // Unique internal name
                
                const subIndex = addNode({ 
                    name: subNodeName, 
                    displayName: subName, 
                    color: catData.color, // Inherit category color
                    type: 'SUB',
                    isInteractable: false,
                    value: subValue
                });

                // Link Category -> Subcategory
                links.push({ source: catIndex, target: subIndex, value: subValue });
            });
        }
    });

    // Links: Income -> Budget
    Object.keys(incomeMap).forEach(name => {
        const sourceIdx = nodes.findIndex(n => n.name === `${name} (Inc)`);
        if (sourceIdx !== -1) {
            links.push({ source: sourceIdx, target: budgetIndex, value: incomeMap[name] });
        }
    });

    // Link: Deficit -> Budget
    if (hasDeficit) {
        const defIdx = nodes.findIndex(n => n.type === 'DEFICIT');
        if (defIdx !== -1) {
            links.push({ source: defIdx, target: budgetIndex, value: deficitAmount });
        }
    }

    return { nodes, links, isDrillDown: false };
  }, [transactions, categories, drillDownCategoryId, viewMode]);

  const layoutData = useMemo(() => {
    if (dimensions.width === 0 || rawNodes.length === 0) return null;

    const margin = { top: 10, right: 1, bottom: 10, left: 1 };
    const width = Math.max(1, dimensions.width - margin.left - margin.right);
    const height = Math.max(1, dimensions.height - margin.top - margin.bottom);

    // If detailed view, reduce padding to fit more nodes
    const nodePadding = viewMode === 'SUBCATEGORY' ? 8 : 12;

    const sankeyGenerator = d3Sankey()
      .nodeWidth(16)
      .nodePadding(nodePadding)
      .extent([[0, 0], [width, height]])
      .nodeAlign(sankeyLeft) // Left align ensures hierarchical flow (Level 1 -> 2 -> 3)
      .nodeSort(null); // Keep our sorting

    const nodes = rawNodes.map(d => ({ ...d }));
    const links = rawLinks.map(d => ({ ...d }));

    const { nodes: computedNodes, links: computedLinks } = sankeyGenerator({ nodes, links });

    // --- MANUAL ADJUSTMENTS ---
    // In CATEGORY mode, we center the Budget node to make it look like a funnel
    if (!isDrillDown && viewMode === 'CATEGORY') {
        const budgetNode = computedNodes.find((n: any) => n.type === 'BUDGET');
        if (budgetNode) {
           const nodeH = budgetNode.y1 - budgetNode.y0;
           const targetY = (height - nodeH) / 2;
           const dy = targetY - budgetNode.y0;
           
           // Shift Budget
           budgetNode.y0 += dy;
           budgetNode.y1 += dy;
           
           // Shift its inputs (Income/Deficit)
           const inputs = computedLinks.filter((l: any) => l.target.index === budgetNode.index).map((l: any) => l.source);
           const uniqueInputs = Array.from(new Set(inputs));
           
           if (uniqueInputs.length > 0) {
               // Calculate input group bounds
               const minInY = Math.min(...uniqueInputs.map((n: any) => n.y0));
               const maxInY = Math.max(...uniqueInputs.map((n: any) => n.y1));
               const inH = maxInY - minInY;
               const targetInY = (height - inH) / 2;
               const dyIn = targetInY - minInY;
               
               uniqueInputs.forEach((n: any) => {
                   n.y0 += dyIn; n.y1 += dyIn;
                   // Adjust outgoing links from inputs
                   computedLinks.filter((l: any) => l.source.index === n.index).forEach((l: any) => l.y0 += dyIn);
               });
           }

           // Adjust links connected to budget
           computedLinks.filter((l: any) => l.target.index === budgetNode.index).forEach((l: any) => l.y1 += dy); // Income -> Budget
           computedLinks.filter((l: any) => l.source.index === budgetNode.index).forEach((l: any) => l.y0 += dy); // Budget -> Exp
        }
    }
    
    // Apply margins
    computedNodes.forEach((n: any) => { n.x0 += margin.left; n.x1 += margin.left; n.y0 += margin.top; n.y1 += margin.top; });
    computedLinks.forEach((l: any) => { l.y0 += margin.top; l.y1 += margin.top; });

    return { nodes: computedNodes, links: computedLinks, width };
  }, [rawNodes, rawLinks, dimensions, isDrillDown, viewMode]);

  const getLinkColor = (link: any) => {
      if (isDrillDown) return link.source.color || '#cbd5e1';
      
      // Standard Flow: Income -> Budget
      if (link.target.type === 'BUDGET') {
          if (link.source.type === 'DEFICIT') return '#f87171'; // Red
          return '#22c55e'; // Green
      }

      // Budget -> Category
      if (link.source.type === 'BUDGET') {
          if (link.target.type === 'SURPLUS') return '#6366f1';
          return link.target.color; // Use Category Color
      }

      // Category -> Subcategory
      if (link.source.type === 'EXPENSE' || link.source.type === 'SAVINGS') {
          return link.source.color; // Inherit Category Color
      }

      return '#e2e8f0';
  };

  return (
    // Fixed height container
    <div className="w-full flex flex-col" style={{ height: '650px' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2 h-8 shrink-0">
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
                              strokeOpacity={viewMode === 'SUBCATEGORY' && link.source.type !== 'BUDGET' ? 0.4 : 0.6}
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
                        // Lower threshold to 8px to show more labels
                        const showLabel = height > 8; 
                        
                        // Use realValue if present (e.g. for Budget node with deficit), otherwise standard value
                        const displayValue = node.realValue !== undefined ? node.realValue : node.value;

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
                                 <title>{`${node.displayName || node.name}: ${formatValue(displayValue)}`}</title>
                              </rect>
                              
                              {showLabel && (
                                <>
                                  <text
                                     x={textX}
                                     y={(node.y1 + node.y0) / 2 - 6}
                                     dy="0.35em"
                                     textAnchor={textAnchor}
                                     fontSize={11} fontWeight={600} fill="#1e293b"
                                     className="pointer-events-none"
                                  >
                                     {node.displayName || node.name}
                                  </text>
                                  <text
                                     x={textX}
                                     y={(node.y1 + node.y0) / 2 + 6}
                                     dy="0.35em"
                                     textAnchor={textAnchor}
                                     fontSize={10} fill="#64748b"
                                     className={`pointer-events-none`}
                                  >
                                     {formatValue(displayValue)}
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
