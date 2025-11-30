import React, { useRef, useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { Layers, Combine } from 'lucide-react';
import { Transaction, TransactionType } from '../types';
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

    const svg = d3.select(containerRef.current);
    svg.selectAll("*").remove();

    // Config
    const cellSize = 12;
    const cellGap = 3;
    const monthLabelHeight = 20;
    const margin = { top: 20, right: 20, bottom: 20, left: 40 };
    
    // Layout Calculation
    // We display standard calendar: Rows = Days (Mon-Sun), Cols = Weeks
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    // Helper to get week number relative to start of year
    const countWeeks = d3.timeMonday.count(startDate, endDate) + 2;
    
    const chartWidth = Math.max(width, countWeeks * (cellSize + cellGap) + margin.left + margin.right);
    const chartHeight = 7 * (cellSize + cellGap) + monthLabelHeight + margin.top;

    svg.attr("width", chartWidth).attr("height", chartHeight);
    
    const g = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);

    // --- SCALES ---
    const values = Array.from(data.values());
    const maxVal = Math.max(...(values as number[]), 1);
    
    const colorScale = d3.scaleThreshold<number, string>()
      .domain([1, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75])
      .range(['#f1f5f9', '#c7d2fe', '#818cf8', '#6366f1', '#312e81']); // Slate-100 to Indigo-900

    // --- DRAW DAYS ---
    const days = d3.timeDays(startDate, new Date(year + 1, 0, 1));
    const tooltip = d3.select(tooltipRef.current);

    g.selectAll(".day")
      .data(days)
      .enter().append("rect")
      .attr("width", cellSize)
      .attr("height", cellSize)
      .attr("x", (d: any) => {
          const date = d as Date;
          const startOfYear = d3.timeYear.floor(date);
          return d3.timeMonday.count(startOfYear, date) * (cellSize + cellGap);
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
      .attr("rx", 2)
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
        
        d3.select(event.currentTarget).attr("stroke", "#1e293b").attr("stroke-width", 2);
      })
      .on("mousemove", (event) => {
         tooltip.style("left", `${event.clientX + 10}px`)
                .style("top", `${event.clientY + 10}px`);
      })
      .on("mouseleave", (event) => {
         tooltip.style("opacity", 0).style("display", "none");
         d3.select(event.currentTarget).attr("stroke", (d: any) => {
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
    const months = d3.timeMonths(startDate, new Date(year + 1, 0, 1));
    g.selectAll(".month-label")
      .data(months)
      .enter().append("text")
      .text(d => d.toLocaleDateString('pl-PL', { month: 'short' }))
      .attr("x", d => {
          const startOfYear = d3.timeYear.floor(d);
          return d3.timeMonday.count(startOfYear, d) * (cellSize + cellGap);
      })
      .attr("y", 10)
      .attr("font-size", "10px")
      .attr("fill", "#64748b")
      .attr("font-weight", "500");

    // Day labels (Mon, Wed, Fri)
    const dayLabels = ['Pn', '', 'Śr', '', 'Pt', '', ''];
    g.selectAll(".day-label")
      .data(dayLabels)
      .enter().append("text")
      .text(d => d)
      .attr("x", -10)
      .attr("y", (d, i) => monthLabelHeight + i * (cellSize + cellGap) + 10)
      .attr("text-anchor", "end")
      .attr("font-size", "9px")
      .attr("fill", "#94a3b8");

  }, [data, width, year, isPrivateMode]);

  return (
     <div className="mb-8">
        <h4 className="text-sm font-bold text-slate-700 mb-2 border-l-4 border-indigo-500 pl-2">
           {customTitle || year}
        </h4>
        <div className="w-full overflow-x-auto pb-2">
            <svg ref={containerRef} className="block" style={{ minWidth: '100%' }}></svg>
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
  year: number;
  periodType: PeriodType;
  isPrivateMode?: boolean;
}

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({ transactions, year, periodType, isPrivateMode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [isSplitYears, setIsSplitYears] = useState(true);

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

  // Determine which years to show
  const yearsToShow = useMemo(() => {
     if (periodType === 'ALL') {
        const years = new Set(transactions.map(t => new Date(t.date).getFullYear()));
        return Array.from(years).sort((a: number, b: number) => b - a); // Descending
     }
     return [year];
  }, [periodType, year, transactions]);

  // Pre-calculate data for each year (SPLIT MODE)
  const dataByYear = useMemo(() => {
     const map = new Map<number, Map<string, number>>();
     
     yearsToShow.forEach(y => {
        const expenses = transactions.filter(t => 
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
  }, [transactions, yearsToShow]);

  // Pre-calculate merged data (MERGED MODE)
  const mergedData = useMemo(() => {
      const dailyTotals = new Map<string, number>();
      // Use a leap year as proxy to handle Feb 29th (2024 is a leap year)
      const proxyYear = 2024; 

      transactions.forEach(t => {
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
  }, [transactions, periodType, year]);

  if (yearsToShow.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-slate-800">Kalendarz Wydatków</h3>
          <p className="text-xs text-slate-400">Intensywność wydatków w poszczególnych dniach</p>
        </div>

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
                   yearsToShow.map(y => (
                      <YearlyHeatmap 
                         key={y} 
                         year={y} 
                         data={dataByYear.get(y) || new Map<string, number>()} 
                         width={width} 
                         isPrivateMode={isPrivateMode}
                      />
                   ))
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