
import React, { useRef, useEffect, useMemo, useState } from 'react';
import { select, timeMonday, scaleThreshold, timeDays, timeYear, timeMonths } from 'd3';
import { Layers, Combine, ChevronDown, ChevronUp } from 'lucide-react';
import { Transaction, TransactionType, CategoryItem } from '../types';
import { CURRENCY_FORMATTER } from '../constants';
import { PeriodType } from './AnalysisView';

interface YearlyHeatmapProps {
  year: number;
  data: Map<string, number>;
  width: number;
  customTitle?: string;
  isPrivateMode?: boolean;
}

const YearlyHeatmap: React.FC<YearlyHeatmapProps> = ({ year, data, width, customTitle, isPrivateMode }) => {
  const containerRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!width || !containerRef.current || !tooltipRef.current) return;

    const svg = select(containerRef.current);
    svg.selectAll("*").remove();

    // Layout Calculation
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    // Config Margins
    const margin = { top: 20, right: 10, bottom: 20, left: 30 };
    const monthLabelHeight = 20;
    const cellGap = 2; // Tighter gap for better responsiveness

    // Calculate number of weeks to fit
    const countWeeks = timeMonday.count(startDate, endDate) + 2;
    
    // Dynamic Cell Size Calculation
    const availableWidth = width - margin.left - margin.right;
    
    // Calculate optimal cell size to fit width
    // Formula: (cellSize + gap) * weeks = availableWidth
    let calculatedCellSize = Math.floor((availableWidth / countWeeks) - cellGap);
    
    // Clamping to maintain readability
    // Min 10px ensures it's readable on mobile (might scroll), Max 18px prevents huge blocks on desktop
    const cellSize = Math.max(10, Math.min(18, calculatedCellSize)); 
    
    const chartWidth = countWeeks * (cellSize + cellGap) + margin.left + margin.right;
    const chartHeight = 7 * (cellSize + cellGap) + monthLabelHeight + margin.top;

    // Apply calculated dimensions
    svg.attr("width", chartWidth).attr("height", chartHeight);
    
    const g = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);

    // --- SCALES ---
    const values = Array.from(data.values());
    const maxVal = Math.max(...(values as number[]), 1);
    
    const colorScale = scaleThreshold<number, string>()
      .domain([1, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75])
      .range(['#f1f5f9', '#c7d2fe', '#818cf8', '#6366f1', '#312e81']); // Slate-100 to Indigo-900

    // --- DRAW DAYS ---
    const days = timeDays(startDate, new Date(year + 1, 0, 1));
    const tooltip = select(tooltipRef.current);

    g.selectAll(".day")
      .data(days)
      .enter().append("rect")
      .attr("width", cellSize)
      .attr("height", cellSize)
      .attr("x", (d: any) => {
          const date = d as Date;
          const startOfYear = timeYear.floor(date);
          return timeMonday.count(startOfYear, date) * (cellSize + cellGap);
      })
      .attr("y", (d: any) => {
         // 0 = Sunday, but we want Monday = 0.
         const date = d as Date;
         let day = date.getDay(); 
         day = day === 0 ? 6 : day - 1; 
         return day * (cellSize + cellGap) + monthLabelHeight;
      })
      .attr("fill", (d: any) => {
        const date = d as Date;
        const dateStr = date.toISOString().split('T')[0];
        const val = data.get(dateStr);
        return (typeof val === 'number') ? colorScale(val) : '#f8fafc'; // empty day color
      })
      .attr("rx", Math.max(1, cellSize / 5)) // Dynamic radius
      .attr("stroke", "#e2e8f0") // border for empty days
      .attr("stroke-width", (d: any) => {
         const date = d as Date;
         const dateStr = date.toISOString().split('T')[0];
         return data.has(dateStr) ? 0 : 1;
      })
      .on("mouseenter", (event, d: any) => {
        const date = d as Date;
        // Construct lookup key
        const dateStr = date.toISOString().split('T')[0];
        const val = data.get(dateStr) || 0;
        
        // Don't show tooltip for empty days unless you want to
        if (val === 0) return;

        const valDisplay = isPrivateMode 
          ? '***' 
          : CURRENCY_FORMATTER.format(val);

        tooltip.style("opacity", 1)
               .style("display", "block")
               .html(`
                 <div class="font-bold text-slate-700">${date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })}</div>
                 <div class="text-indigo-600 font-semibold">${valDisplay}</div>
               `)
               .style("left", `${event.clientX + 10}px`)
               .style("top", `${event.clientY + 10}px`);
        
        select(event.currentTarget).attr("stroke", "#1e293b").attr("stroke-width", 2);
      })
      .on("mousemove", (event) => {
         tooltip.style("left", `${event.clientX + 10}px`)
                .style("top", `${event.clientY + 10}px`);
      })
      .on("mouseleave", (event) => {
         tooltip.style("opacity", 0).style("display", "none");
         select(event.currentTarget).attr("stroke", (d: any) => {
            const date = d as Date;
            const dateStr = date.toISOString().split('T')[0];
            return data.has(dateStr) ? null : "#e2e8f0";
         }).attr("stroke-width", (d: any) => {
            const date = d as Date;
            const dateStr = date.toISOString().split('T')[0];
            return data.has(dateStr) ? 0 : 1;
         });
      });

    // --- LABELS ---
    // Month labels
    const months = timeMonths(startDate, new Date(year + 1, 0, 1));
    g.selectAll(".month-label")
      .data(months)
      .enter().append("text")
      .text(d => d.toLocaleDateString('pl-PL', { month: 'short' }))
      .attr("x", d => {
          const startOfYear = timeYear.floor(d);
          return timeMonday.count(startOfYear, d) * (cellSize + cellGap);
      })
      .attr("y", 10)
      .attr("font-size", `${Math.max(9, cellSize)}px`) // Scale font slightly
      .attr("fill", "#64748b")
      .attr("font-weight", "500");

    // Day labels (Mon, Wed, Fri)
    const dayLabels = ['Pn', '', 'Śr', '', 'Pt', '', ''];
    g.selectAll(".day-label")
      .data(dayLabels)
      .enter().append("text")
      .text(d => d)
      .attr("x", -6)
      .attr("y", (d, i) => monthLabelHeight + i * (cellSize + cellGap) + cellSize/1.5)
      .attr("text-anchor", "end")
      .attr("font-size", `${Math.max(8, cellSize - 2)}px`)
      .attr("fill", "#94a3b8");

  }, [data, width, year, isPrivateMode]);

  return (
     <div className="mb-8">
        <h4 className="text-sm font-bold text-slate-700 mb-2 border-l-4 border-indigo-500 pl-2">
           {customTitle || year}
        </h4>
        <div className="w-full overflow-x-auto pb-2 custom-scrollbar">
            {/* SVG width is managed by D3 logic above, usually matching container unless min-size takes over */}
            <svg ref={containerRef} className="block mx-auto"></svg>
        </div>
        <div 
          ref={tooltipRef}
          className="fixed z-50 bg-white p-2 border border-slate-200 shadow-xl rounded-lg text-xs pointer-events-none opacity-0 transition-opacity hidden" 
        />
     </div>
  )
}

interface CalendarHeatmapProps {
  transactions: Transaction[];
  categories: CategoryItem[];
  year: number;
  periodType: PeriodType;
  isPrivateMode?: boolean;
}

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({ transactions, categories, year, periodType, isPrivateMode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [isSplitYears, setIsSplitYears] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState('ALL');
  const [showAllYears, setShowAllYears] = useState(false);

  const savingsCategoryIds = useMemo(() => {
      return new Set(categories.filter(c => c.isIncludedInSavings).map(c => c.id));
  }, [categories]);

  // Identify categories used in transactions to filter the dropdown
  const usedCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    transactions.forEach(t => {
      if (t.type === TransactionType.EXPENSE && !savingsCategoryIds.has(t.categoryId)) {
        ids.add(t.categoryId);
      }
    });
    return ids;
  }, [transactions, savingsCategoryIds]);

  const activeCategories = useMemo(() => 
    categories
        .filter(c => c.type === TransactionType.EXPENSE && usedCategoryIds.has(c.id))
        .sort((a, b) => a.name.localeCompare(b.name, 'pl')),
  [categories, usedCategoryIds]);

  // Measure width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Filter transactions by selected category AND exclude savings
  const filteredTxs = useMemo(() => {
      let txs = transactions;
      if (selectedCategoryId !== 'ALL') {
          txs = txs.filter(t => t.categoryId === selectedCategoryId);
      }
      // Exclude savings from heatmap
      return txs.filter(t => !savingsCategoryIds.has(t.categoryId));
  }, [transactions, selectedCategoryId, savingsCategoryIds]);

  // Determine which years to show
  const availableYears = useMemo(() => {
     if (periodType === 'ALL') {
        const years = new Set(filteredTxs.map(t => new Date(t.date).getFullYear()));
        return Array.from(years).sort((a: number, b: number) => b - a); // Descending
     }
     return [year];
  }, [periodType, year, filteredTxs]);

  const visibleYears = useMemo(() => {
      if (periodType !== 'ALL') return availableYears;
      if (showAllYears) return availableYears;
      return availableYears.slice(0, 2);
  }, [availableYears, showAllYears, periodType]);

  // Pre-calculate data for each year (SPLIT MODE)
  const dataByYear = useMemo(() => {
     const map = new Map<number, Map<string, number>>();
     
     visibleYears.forEach(y => {
        const expenses = filteredTxs.filter(t => 
           t.type === TransactionType.EXPENSE && 
           new Date(t.date).getFullYear() === y
        );

        const dailyTotals = new Map<string, number>();
        expenses.forEach(t => {
           const dateStr = new Date(t.date).toISOString().split('T')[0];
           dailyTotals.set(dateStr, (dailyTotals.get(dateStr) || 0) + t.amount);
        });
        map.set(y, dailyTotals);
     });

     return map;
  }, [filteredTxs, visibleYears]);

  // Pre-calculate merged data (MERGED MODE)
  const mergedData = useMemo(() => {
      const dailyTotals = new Map<string, number>();
      // Use a leap year as proxy to handle Feb 29th (2024 is a leap year)
      const proxyYear = 2024; 

      filteredTxs.forEach(t => {
          if (t.type !== TransactionType.EXPENSE) return;
          
          const d = new Date(t.date);
          // Only filter by year if we are NOT in ALL mode (which is handled by yearsToShow, but strict check here)
          if (periodType !== 'ALL' && d.getFullYear() !== year) return;

          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const proxyDateStr = `${proxyYear}-${month}-${day}`;
          
          dailyTotals.set(proxyDateStr, (dailyTotals.get(proxyDateStr) || 0) + t.amount);
      });
      return dailyTotals;
  }, [filteredTxs, periodType, year]);

  if (availableYears.length === 0 && selectedCategoryId === 'ALL') return null;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div>
          <h3 className="font-semibold text-slate-800">Kalendarz Wydatków</h3>
          <p className="text-xs text-slate-400">Intensywność wydatków w poszczególnych dniach (bez oszczędności)</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
            <select
               value={selectedCategoryId}
               onChange={(e) => setSelectedCategoryId(e.target.value)}
               className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 min-w-[160px]"
            >
               <option value="ALL">Wszystkie kategorie</option>
               {activeCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
               ))}
            </select>

            {/* Toggle Button - Only visible for ALL history */}
            {periodType === 'ALL' && (
            <div className="flex bg-slate-50 p-1 rounded-lg">
                <button
                    onClick={() => setIsSplitYears(true)}
                    className={`p-2 rounded-md transition-all flex items-center gap-2 text-xs font-medium ${isSplitYears ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Rozdziel lata"
                >
                    <Layers size={16} /> <span className="hidden sm:inline">Rozdziel</span>
                </button>
                <button
                    onClick={() => setIsSplitYears(false)}
                    className={`p-2 rounded-md transition-all flex items-center gap-2 text-xs font-medium ${!isSplitYears ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Sumuj lata"
                >
                    <Combine size={16} /> <span className="hidden sm:inline">Sumuj</span>
                </button>
            </div>
            )}
        </div>
      </div>
      
      <div ref={containerRef} className="w-full">
         {width > 0 && (
            <>
               {periodType === 'ALL' && !isSplitYears ? (
                   // MERGED VIEW
                   <YearlyHeatmap 
                      year={2024} // Proxy leap year for rendering 
                      data={mergedData}
                      width={width}
                      customTitle="Wszystkie lata (Suma)"
                      isPrivateMode={isPrivateMode}
                   />
               ) : (
                   // SPLIT VIEW
                   visibleYears.length > 0 ? (
                       <>
                           {visibleYears.map(y => (
                              <YearlyHeatmap 
                                 key={y} 
                                 year={y} 
                                 data={dataByYear.get(y) || new Map<string, number>()} 
                                 width={width} 
                                 isPrivateMode={isPrivateMode}
                              />
                           ))}
                           
                           {periodType === 'ALL' && availableYears.length > 2 && (
                              <div className="flex justify-center mt-4 mb-4">
                                  <button 
                                      onClick={() => setShowAllYears(!showAllYears)}
                                      className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 text-xs font-medium rounded-full hover:bg-slate-100 transition-colors border border-slate-200"
                                  >
                                      {showAllYears ? (
                                          <>
                                              <ChevronUp size={14} /> Pokaż mniej lat
                                          </>
                                      ) : (
                                          <>
                                              <ChevronDown size={14} /> Pokaż starsze lata ({availableYears.length - 2})
                                          </>
                                      )}
                                  </button>
                              </div>
                           )}
                       </>
                   ) : (
                       <div className="text-center py-8 text-slate-400 text-sm">Brak wydatków dla wybranej kategorii.</div>
                   )
               )}
            </>
         )}
      </div>
      
      {/* Shared Legend */}
      <div className="flex justify-end items-center gap-2 mt-2 text-xs text-slate-400">
        <span>Mniej</span>
        <div className="flex gap-1">
           <div className="w-3 h-3 rounded bg-[#f1f5f9] border border-slate-200"></div>
           <div className="w-3 h-3 rounded bg-[#c7d2fe]"></div>
           <div className="w-3 h-3 rounded bg-[#818cf8]"></div>
           <div className="w-3 h-3 rounded bg-[#6366f1]"></div>
           <div className="w-3 h-3 rounded bg-[#312e81]"></div>
        </div>
        <span>Więcej</span>
      </div>
    </div>
  );
};
