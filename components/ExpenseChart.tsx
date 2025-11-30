import React, { useMemo, useRef, useLayoutEffect, useState } from 'react';
import * as d3 from 'd3';
import { PieChart as PieIcon, LayoutGrid } from 'lucide-react';
import { Transaction, TransactionType, CategoryItem } from '../types';
import { SYSTEM_IDS, getCategoryColor, getCategoryName, CURRENCY_FORMATTER } from '../constants';

interface ExpenseChartProps {
  transactions: Transaction[];
  categories: CategoryItem[];
}

type ViewMode = 'PIE' | 'TREEMAP';

export const ExpenseChart: React.FC<ExpenseChartProps> = ({ transactions, categories }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('PIE');

  // Robust width measurement
  useLayoutEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth;
        if (w > 0) setWidth(w);
      }
    };

    measure(); // Measure immediately
    
    // Create observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length > 0 && entries[0].contentRect.width > 0) {
        setWidth(entries[0].contentRect.width);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Safety fallback: sometimes initial render in grids is tricky
    const timer = setTimeout(measure, 100);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timer);
    };
  }, []);

  const data = useMemo(() => {
    const expenses = transactions.filter(t => 
       t.type === TransactionType.EXPENSE && 
       t.categoryId !== SYSTEM_IDS.SAVINGS &&
       t.categoryId !== SYSTEM_IDS.INVESTMENTS
    );
    const categoryTotals: Record<string, { value: number, color: string, name: string }> = {};

    expenses.forEach(t => {
      if (!categoryTotals[t.categoryId]) {
         categoryTotals[t.categoryId] = { 
            value: 0, 
            color: getCategoryColor(t.categoryId, categories),
            name: getCategoryName(t.categoryId, categories)
         };
      }
      categoryTotals[t.categoryId].value += t.amount;
    });

    return Object.values(categoryTotals).sort((a, b) => b.value - a.value);
  }, [transactions, categories]);

  useLayoutEffect(() => {
    if (!width || !data.length || !svgRef.current || !tooltipRef.current) return;
    
    const height = 250;
    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);
    
    svg.selectAll("*").remove();

    // --- RENDER PIE CHART ---
    if (viewMode === 'PIE') {
      const radius = Math.min(width, height) / 2 - 20;
      // Prevent negative radius crashes
      if (radius <= 0) return;

      const g = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);

      const pie = d3.pie<any>().value(d => d.value).sort(null);
      const arc = d3.arc<any>().innerRadius(radius * 0.6).outerRadius(radius);
      const hoverArc = d3.arc<any>().innerRadius(radius * 0.6).outerRadius(radius + 5);

      g.selectAll("path")
        .data(pie(data))
        .enter().append("path")
        .attr("d", arc)
        .attr("fill", d => d.data.color)
        .attr("stroke", "white")
        .style("stroke-width", "2px")
        .style("cursor", "pointer")
        .on("mouseenter", function(event, d) {
          d3.select(this).transition().duration(200).attr("d", hoverArc);
          tooltip
            .style("opacity", 1)
            .style("display", "block")
            .html(`<strong>${d.data.name}</strong><br/>${CURRENCY_FORMATTER.format(d.data.value)}`)
            .style("left", `${event.clientX + 10}px`)
            .style("top", `${event.clientY + 10}px`);
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", `${event.clientX + 10}px`)
                .style("top", `${event.clientY + 10}px`);
        })
        .on("mouseleave", function() {
          d3.select(this).transition().duration(200).attr("d", arc);
          tooltip.style("opacity", 0).style("display", "none");
        });
    } 
    
    // --- RENDER TREEMAP ---
    else if (viewMode === 'TREEMAP') {
      const root = d3.hierarchy({ children: data })
        .sum((d: any) => d.value)
        .sort((a, b) => (b.value || 0) - (a.value || 0));

      d3.treemap()
        .size([width, height])
        .padding(2)
        (root);

      const leaves = root.leaves();

      const leaf = svg.selectAll("g")
        .data(leaves)
        .enter().append("g")
        .attr("transform", d => `translate(${d.x0},${d.y0})`);

      leaf.append("rect")
        .attr("width", d => Math.max(0, d.x1 - d.x0))
        .attr("height", d => Math.max(0, d.y1 - d.y0))
        .attr("fill", (d: any) => d.data.color)
        .attr("rx", 4)
        .style("cursor", "pointer")
        .on("mouseenter", (event, d: any) => {
           tooltip
            .style("opacity", 1)
            .style("display", "block")
            .html(`<strong>${d.data.name}</strong><br/>${CURRENCY_FORMATTER.format(d.data.value)}`)
            .style("left", `${event.clientX + 10}px`)
            .style("top", `${event.clientY + 10}px`);
        })
        .on("mousemove", (event) => {
            tooltip
               .style("left", `${event.clientX + 10}px`)
               .style("top", `${event.clientY + 10}px`);
        })
        .on("mouseleave", () => tooltip.style("opacity", 0).style("display", "none"));

      // Add text labels if space permits
      leaf.append("text")
        .selectAll("tspan")
        .data((d: any) => {
             const w = d.x1 - d.x0;
             const h = d.y1 - d.y0;
             // Only show text if rectangle is big enough
             if (w < 40 || h < 30) return [];
             // Truncate name if too long
             let name = d.data.name;
             if (name.length > w / 7) name = name.substring(0, Math.floor(w / 7)) + '..';
             
             return [name, CURRENCY_FORMATTER.format(d.data.value)]; 
        })
        .enter().append("tspan")
        .attr("x", 4)
        .attr("y", (d, i) => 13 + i * 12)
        .text(d => d)
        .attr("font-size", "10px")
        .attr("font-weight", (d, i) => i === 0 ? "bold" : "normal")
        .attr("fill", "white")
        .style("pointer-events", "none")
        .style("text-shadow", "0px 1px 2px rgba(0,0,0,0.3)");
    }

  }, [data, width, viewMode]);

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <span className="text-slate-400 text-sm">Brak danych</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full relative min-h-[300px]">
       {/* Toggle Switch */}
       <div className="absolute top-0 right-0 z-10 flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button 
            onClick={() => setViewMode('PIE')}
            className={`p-1.5 rounded-md transition-all ${viewMode === 'PIE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            title="Wykres kołowy"
          >
             <PieIcon size={14} />
          </button>
          <button 
            onClick={() => setViewMode('TREEMAP')}
            className={`p-1.5 rounded-md transition-all ${viewMode === 'TREEMAP' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            title="Mapa drzewa (Treemap)"
          >
             <LayoutGrid size={14} />
          </button>
       </div>

      <div className="relative mt-8">
         <svg ref={svgRef} width="100%" height={250} className="overflow-visible block" />
         {/* Tooltip outside SVG, fixed positioning to prevent overflow */}
         <div 
            ref={tooltipRef}
            className="fixed z-50 bg-white p-2 border border-slate-200 shadow-xl rounded-lg text-xs pointer-events-none opacity-0 transition-opacity hidden" 
         />
      </div>

      {viewMode === 'PIE' && (
        <div className="mt-4 grid grid-cols-2 gap-2 animate-fade-in">
          {data.slice(0, 4).map((entry) => (
              <div key={entry.name} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{background: entry.color}}></div>
                    <span className="text-slate-600 truncate max-w-[80px]">{entry.name}</span>
                </div>
                <span className="font-medium text-slate-900">{Math.round(entry.value)} zł</span>
              </div>
          ))}
        </div>
      )}
    </div>
  );
};