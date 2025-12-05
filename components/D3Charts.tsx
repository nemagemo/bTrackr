import React, { useRef, useEffect, useState } from 'react';
import { 
  select, 
  stack as d3Stack, 
  scaleBand, 
  scaleLinear, 
  scaleOrdinal, 
  axisLeft, 
  axisBottom, 
  axisRight, 
  line as d3Line, 
  curveMonotoneX, 
  area as d3Area, 
  scalePoint, 
  max, 
  min,
  NumberValue,
  format,
  BaseType
} from 'd3';
import { CURRENCY_FORMATTER } from '../constants';

// --- Shared Types & Helpers ---
interface ChartProps {
  data?: any[];
  height?: number;
  colors?: string[];
  className?: string;
  isPrivateMode?: boolean;
  showSurplusLine?: boolean;
  showSavingsRateLine?: boolean;
}

const useResizeObserver = (ref: React.RefObject<HTMLElement>) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, [ref]);
  return dimensions;
};

const formatValue = (val: number, isPrivate?: boolean) => {
   if (isPrivate) return '***';
   return CURRENCY_FORMATTER.format(val);
}

// --- 1. Simple Bar Chart (Keeping unused ones compatible) ---
export const SimpleBarChart: React.FC<ChartProps> = ({ data, height = 300, isPrivateMode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useResizeObserver(containerRef);

  useEffect(() => {
    if (!width || !data || !data.length) return;
    // Implementation skipped for brevity as it is not used in main analysis currently
  }, [data, width, height, isPrivateMode]);

  return <div ref={containerRef} />;
};

// --- 3. Stacked Bar Chart ---
export const StackedBarChart: React.FC<ChartProps & { keys: string[] }> = ({ data, keys, colors = [], height = 300, isPrivateMode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useResizeObserver(containerRef);

  useEffect(() => {
    if (!width || !data || !data.length) return;
    const svg = select(containerRef.current).select('svg');
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const stack = d3Stack().keys(keys);
    const stackedData = stack(data);

    const x = scaleBand().domain(data.map(d => String(d.name))).range([0, chartWidth]).padding(0.3);
    const y = scaleLinear().domain([0, max(stackedData, layer => max(layer, d => d[1])) || 0]).nice().range([chartHeight, 0]);
    const colorScale = scaleOrdinal().domain(keys).range(colors);

    g.append("g").attr("class", "grid").call(axisLeft(y).ticks(5).tickSize(-chartWidth).tickFormat(() => "")).selectAll("line").attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3,3");

    const tooltip = select(containerRef.current).select(".tooltip");

    // Use .each() to preserve the series context (key) for child rects
    g.selectAll("g.layer")
      .data(stackedData)
      .enter().append("g")
      .classed("layer", true)
      .attr("fill", d => colorScale(d.key) as string)
      .each(function(series) {
          const seriesKey = series.key;
          select(this).selectAll("rect")
            .data(series)
            .enter().append("rect")
            .attr("x", d => x(String(d.data.name)) || 0)
            .attr("y", d => y(d[1]))
            .attr("height", d => y(d[0]) - y(d[1]))
            .attr("width", x.bandwidth())
            .on("mousemove", (event, d) => {
               const val = d.data[seriesKey];
               const total = keys.reduce((acc, k) => acc + (d.data[k] || 0), 0);
               const pct = total ? ((val / total) * 100).toFixed(1) : '0.0';

               tooltip.style("opacity", 1)
                      .html(`
                        <div class="mb-1"><strong>${d.data.name}</strong></div>
                        <div class="flex items-center gap-2 mb-1">
                           <span style="width:8px;height:8px;border-radius:50%;background-color:${colorScale(seriesKey)}"></span>
                           <span>${seriesKey}:</span>
                           <span class="font-bold">${formatValue(val, isPrivateMode)}</span>
                        </div>
                        <div class="text-xs text-slate-400 text-right">${pct}% całości</div>
                      `)
                      .style("left", `${event.clientX + 10}px`)
                      .style("top", `${event.clientY + 10}px`);
            })
            .on("mouseleave", () => tooltip.style("opacity", 0));
      });

    // Calculate ticks to avoid overlap (heuristic: 50px per label)
    const maxLabels = Math.floor(chartWidth / 50);
    const interval = Math.ceil(data.length / maxLabels);
    const tickValues = data.map(d => String(d.name)).filter((_, i) => i % interval === 0);

    g.append("g").attr("transform", `translate(0,${chartHeight})`)
        .call(axisBottom(x).tickValues(tickValues).tickSize(0))
        .select(".domain").remove();
    
    g.append("g").call(axisLeft(y).ticks(5).tickFormat((d: any) => isPrivateMode ? '' : `${d}`)).select(".domain").remove();

  }, [data, width, height, keys, colors, isPrivateMode]);

  const colorScale = scaleOrdinal().domain(keys).range(colors);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg width="100%" height={height} className="overflow-visible" />
      <div className="tooltip fixed opacity-0 bg-white p-2 border border-slate-200 shadow-lg rounded text-xs pointer-events-none transition-opacity z-50" />
      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 px-2">
         {keys.map(k => (
            <div key={k} className="flex items-center gap-1.5">
               <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colorScale(k) as string }}></div>
               <span className="text-[10px] text-slate-500 font-medium">{k}</span>
            </div>
         ))}
      </div>
    </div>
  );
};

// --- 5. Multi Line Chart ---
export const MultiLineChart: React.FC<ChartProps & { keys: string[], highlightKey?: string, highlightStrokeWidth?: number }> = ({ 
  data, 
  keys, 
  colors = [], 
  height = 300, 
  isPrivateMode, 
  highlightKey,
  highlightStrokeWidth = 4
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useResizeObserver(containerRef);

  useEffect(() => {
    if (!width || !data || !data.length) return;
    const svg = select(containerRef.current).select('svg');
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = scalePoint().domain(data.map(d => String(d.name))).range([0, chartWidth]);
    
    const maxY = max(data, d => Math.max(...keys.map(k => d[k] || 0))) || 0;
    const y = scaleLinear().domain([0, maxY]).nice().range([chartHeight, 0]);
    const colorScale = scaleOrdinal().domain(keys).range(colors);

    g.append("g").attr("class", "grid").call(axisLeft(y).ticks(5).tickSize(-chartWidth).tickFormat(() => "")).selectAll("line").attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3,3");

    const line = d3Line<any>()
      .x(d => x(String(d.name)) || 0)
      .y(d => y(d.value))
      .curve(curveMonotoneX);

    const tooltip = select(containerRef.current).select(".tooltip");

    // Sort keys to draw highlighting key LAST (on top)
    const sortedKeys = [...keys].sort((a, b) => {
        if (a === highlightKey) return 1;
        if (b === highlightKey) return -1;
        return 0;
    });

    sortedKeys.forEach(key => {
       const lineData = data.map(d => ({ name: String(d.name), value: d[key] }));
       const color = colorScale(key) as string;
       const isHighlighted = key === highlightKey;
       
       // Line path
       g.append("path")
        .datum(lineData)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", isHighlighted ? highlightStrokeWidth : 2)
        .attr("stroke-opacity", isHighlighted ? 1 : 0.7) // Slightly dim others
        .attr("d", line);

       // Dots
       g.selectAll(`.dot-${key}`)
        .data(lineData)
        .enter().append("circle")
        .attr("cx", d => x(d.name) || 0)
        .attr("cy", d => y(d.value))
        .attr("r", isHighlighted ? 4 : 3)
        .attr("fill", color)
        .attr("opacity", isHighlighted ? 1 : 0.7)
        .on("mouseenter", (event, d) => {
            select(event.currentTarget).attr("r", 6).attr("opacity", 1);
            tooltip.style("opacity", 1)
                   .html(`<div><strong>${d.name}</strong></div><div style="color:${color}; font-weight:${isHighlighted?'bold':'normal'}">${key}: ${formatValue(d.value, isPrivateMode)}</div>`)
                   .style("left", `${event.clientX + 10}px`)
                   .style("top", `${event.clientY + 10}px`);
        })
        .on("mousemove", (event) => tooltip.style("left", `${event.clientX + 10}px`).style("top", `${event.clientY + 10}px`))
        .on("mouseleave", (event) => {
            select(event.currentTarget).attr("r", isHighlighted ? 4 : 3).attr("opacity", isHighlighted ? 1 : 0.7);
            tooltip.style("opacity", 0);
        });
    });

    // Calculate ticks to avoid overlap (heuristic: 50px per label)
    const maxLabels = Math.floor(chartWidth / 50);
    const interval = Math.ceil(data.length / maxLabels);
    const tickValues = data.map(d => String(d.name)).filter((_, i) => i % interval === 0);

    g.append("g").attr("transform", `translate(0,${chartHeight})`)
        .call(axisBottom(x).tickValues(tickValues).tickSize(0))
        .select(".domain").remove();
    
    g.append("g").call(axisLeft(y).ticks(5).tickFormat((d: any) => isPrivateMode ? '' : `${d}`)).select(".domain").remove();

  }, [data, width, height, keys, colors, isPrivateMode, highlightKey, highlightStrokeWidth]);

  const colorScale = scaleOrdinal().domain(keys).range(colors);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg width="100%" height={height} className="overflow-visible" />
      <div className="tooltip fixed opacity-0 bg-white p-2 border border-slate-200 shadow-lg rounded text-xs pointer-events-none transition-opacity z-50" />
      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 px-2 justify-center">
         {keys.map(k => (
            <div key={k} className={`flex items-center gap-1.5 ${k === highlightKey ? 'font-bold text-slate-800' : 'text-slate-500 opacity-80'}`}>
               <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colorScale(k) as string }}></div>
               <span className="text-[10px]">{k}</span>
            </div>
         ))}
      </div>
    </div>
  );
};

// --- 6. Combo Chart (SHARED TOOLTIP) ---
export const ComboChart: React.FC<ChartProps> = ({ 
    data, 
    height = 350, 
    isPrivateMode,
    showSurplusLine = true,
    showSavingsRateLine = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useResizeObserver(containerRef);

  useEffect(() => {
    if (!width || !data || !data.length) return;
    const svg = select(containerRef.current).select('svg');
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 40, bottom: 30, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = scaleBand().domain(data.map(d => String(d.name))).range([0, chartWidth]).padding(0.3);
    
    const maxBarValue = max(data, d => Math.max(d.income, d.expense)) || 0;
    
    let domainMin = 0;
    let domainMax = maxBarValue;

    if (showSurplusLine) {
        const minSurplus = min(data, d => d.income - d.expense) || 0;
        const maxSurplus = max(data, d => d.income - d.expense) || 0;
        domainMin = Math.min(0, minSurplus);
        domainMax = Math.max(maxBarValue, maxSurplus);
    }
    
    const yLeft = scaleLinear()
      .domain([domainMin, domainMax])
      .nice()
      .range([chartHeight, 0]);

    const [yLeftMin, yLeftMax] = yLeft.domain();
    const maxRateData = max(data, d => d.savingsRate) || 0;
    const yRightMaxBase = Math.max(100, maxRateData);

    let yRightMin = 0;
    if (yLeftMax > 0 && yLeftMin < 0) {
        const ratio = Math.abs(yLeftMin) / yLeftMax;
        yRightMin = - (yRightMaxBase * ratio);
    } else if (yLeftMax === 0 && yLeftMin < 0) {
        yRightMin = -100;
    }

    const yRight = scaleLinear().domain([yRightMin, yRightMaxBase]).range([chartHeight, 0]);

    g.append("g").attr("class", "grid")
     .call(axisLeft(yLeft).ticks(5).tickSize(-chartWidth).tickFormat(() => "")).selectAll("line").attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3,3");

    const tooltip = select(containerRef.current).select(".tooltip");
    
    // Zero Line
    g.append("line").attr("x1", 0).attr("x2", chartWidth).attr("y1", yLeft(0)).attr("y2", yLeft(0)).attr("stroke", "#94a3b8").attr("stroke-width", 1);

    const xSub = scaleBand().domain(['inc', 'exp']).range([0, x.bandwidth()]).padding(0.05);

    g.selectAll(".bar-inc")
      .data(data)
      .enter().append("rect")
      .attr("x", d => (x(String(d.name)) || 0) + (xSub('inc') || 0))
      .attr("y", d => yLeft(d.income))
      .attr("width", xSub.bandwidth())
      .attr("height", d => Math.abs(yLeft(0) - yLeft(d.income)))
      .attr("fill", "#10b981")
      .attr("rx", 2);

    g.selectAll(".bar-exp")
      .data(data)
      .enter().append("rect")
      .attr("x", d => (x(String(d.name)) || 0) + (xSub('exp') || 0))
      .attr("y", d => yLeft(d.expense))
      .attr("width", xSub.bandwidth())
      .attr("height", d => Math.abs(yLeft(0) - yLeft(d.expense)))
      .attr("fill", "#ef4444")
      .attr("rx", 2);

    if (showSavingsRateLine) {
        const lineRate = d3Line<any>().x(d => (x(String(d.name)) || 0) + x.bandwidth() / 2).y(d => yRight(Math.max(0, d.savingsRate))).curve(curveMonotoneX);
        g.append("path").datum(data).attr("fill", "none").attr("stroke", "#6366f1").attr("stroke-width", 2).attr("d", lineRate);
        g.selectAll(".dot-rate").data(data).enter().append("circle").attr("cx", d => (x(String(d.name)) || 0) + x.bandwidth() / 2).attr("cy", d => yRight(Math.max(0, d.savingsRate))).attr("r", 3).attr("fill", "#6366f1").attr("stroke", "#fff").attr("stroke-width", 1.5);
    }

    if (showSurplusLine) {
        const lineBalance = d3Line<any>().x(d => (x(String(d.name)) || 0) + x.bandwidth() / 2).y(d => yLeft(d.income - d.expense)).curve(curveMonotoneX);
        g.append("path").datum(data).attr("fill", "none").attr("stroke", "#0ea5e9").attr("stroke-width", 2).attr("stroke-dasharray", "4,2").attr("d", lineBalance);
        g.selectAll(".dot-balance").data(data).enter().append("circle").attr("cx", d => (x(String(d.name)) || 0) + x.bandwidth() / 2).attr("cy", d => yLeft(d.income - d.expense)).attr("r", 3).attr("fill", "#0ea5e9").attr("stroke", "#fff").attr("stroke-width", 1.5);
    }

    const maxLabels = Math.floor(chartWidth / 50);
    const interval = Math.ceil(data.length / maxLabels);
    const tickValues = data.map(d => String(d.name)).filter((_, i) => i % interval === 0);

    g.append("g").attr("transform", `translate(0,${chartHeight})`)
        .call(axisBottom(x).tickValues(tickValues).tickSize(0))
        .select(".domain").remove();
    
    g.append("g").call(axisLeft(yLeft).ticks(5).tickFormat((d: any) => isPrivateMode ? '' : `${d}`)).select(".domain").remove();
    
    if (showSavingsRateLine) {
        g.append("g").attr("transform", `translate(${chartWidth},0)`).call(axisRight(yRight).ticks(5).tickFormat(d => `${d}%`)).select(".domain").remove();
    }

    const guideLine = g.append("line")
       .attr("stroke", "#94a3b8")
       .attr("stroke-width", 1)
       .attr("stroke-dasharray", "3,3")
       .attr("y1", 0).attr("y2", chartHeight)
       .style("opacity", 0);

    const overlayGroup = g.append("g").attr("class", "overlays");
    
    overlayGroup.selectAll(".overlay-rect")
       .data(data)
       .enter().append("rect")
       .attr("class", "overlay-rect")
       .attr("x", d => x(String(d.name)) || 0)
       .attr("y", 0)
       .attr("width", x.bandwidth())
       .attr("height", chartHeight)
       .attr("fill", "transparent")
       .on("mouseenter", () => guideLine.style("opacity", 1))
       .on("mousemove", (event, d) => {
           const centerX = (x(String(d.name)) || 0) + x.bandwidth() / 2;
           guideLine.attr("x1", centerX).attr("x2", centerX);
           
           const surplus = d.income - d.expense;
           
           let htmlContent = `
             <div class="mb-2 border-b border-slate-100 pb-1"><strong>${d.name}</strong></div>
             <div class="grid grid-cols-2 gap-x-4 gap-y-1">
                <span class="text-slate-500">Przychód:</span> <span class="text-emerald-600 font-medium text-right">${formatValue(d.income, isPrivateMode)}</span>
                <span class="text-slate-500">Wydatek:</span> <span class="text-red-500 font-medium text-right">${formatValue(d.expense, isPrivateMode)}</span>`;
           
           if (showSurplusLine) {
               htmlContent += `
                <span class="text-slate-500">Nadwyżka:</span> <span class="${surplus >= 0 ? 'text-emerald-600' : 'text-red-600'} font-medium text-right">${formatValue(surplus, isPrivateMode)}</span>`;
           }
           if (showSavingsRateLine) {
               htmlContent += `
                <span class="text-slate-500">Oszczędność:</span> <span class="text-indigo-600 font-medium text-right">${d.savingsRate.toFixed(1)}%</span>`;
           }
           htmlContent += `</div>`;

           tooltip.style("opacity", 1)
                  .html(htmlContent)
                  .style("left", `${event.clientX + 15}px`)
                  .style("top", `${event.clientY + 10}px`);
       })
       .on("mouseleave", () => {
           tooltip.style("opacity", 0);
           guideLine.style("opacity", 0);
       });

  }, [data, width, height, isPrivateMode, showSurplusLine, showSavingsRateLine]);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg width="100%" height={height} className="overflow-visible" />
      <div className="tooltip fixed opacity-0 bg-white p-3 border border-slate-200 shadow-xl rounded-lg text-xs pointer-events-none transition-opacity z-50 min-w-[180px]" />
      <div className="flex flex-wrap gap-4 mt-2 justify-center">
         {showSurplusLine && <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#bbf7d0]"></div><span className="text-[10px] text-slate-500">Nadwyżka</span></div>}
         {showSurplusLine && <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#fecaca]"></div><span className="text-[10px] text-slate-500">Deficyt</span></div>}
         <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-emerald-500"></div><span className="text-[10px] text-slate-500">Przychód</span></div>
         <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-red-500 border-dashed"></div><span className="text-[10px] text-slate-500">Wydatek</span></div>
         {showSavingsRateLine && <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-indigo-500"></div><span className="text-[10px] text-slate-500">Stopa oszcz. (%)</span></div>}
      </div>
    </div>
  );
};

// --- 7. Difference Chart (Diverging Bar Chart for Balance) ---
export const DifferenceChart: React.FC<ChartProps> = ({ 
    data, 
    height = 350, 
    isPrivateMode,
    showSavingsRateLine = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useResizeObserver(containerRef);

  useEffect(() => {
    if (!width || !data || !data.length) return;
    const svg = select(containerRef.current).select('svg');
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 40, bottom: 30, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = scaleBand().domain(data.map(d => String(d.name))).range([0, chartWidth]).padding(0.3);
    
    // Calculate Balance
    const processedData = data.map(d => ({
        ...d,
        balance: d.income - d.expense
    }));

    // Domain Calculation
    const minBalance = min(processedData, d => d.balance) || 0;
    const maxBalance = max(processedData, d => d.balance) || 0;

    // Ensure 0 is in view and add padding
    const yDomain = [Math.min(0, minBalance), Math.max(0, maxBalance)];
    const yPadding = (yDomain[1] - yDomain[0]) * 0.1;
    if (yPadding === 0 && yDomain[0] === 0 && yDomain[1] === 0) {
        yDomain[0] = -100;
        yDomain[1] = 100;
    } else {
        yDomain[0] -= yPadding;
        yDomain[1] += yPadding;
    }

    const y = scaleLinear()
      .domain(yDomain)
      .nice()
      .range([chartHeight, 0]);

    // Right Axis for Savings Rate
    const yRight = scaleLinear().domain([-50, 100]).range([chartHeight, 0]);
    const maxRate = max(data, d => d.savingsRate) || 0;
    const minRate = min(data, d => d.savingsRate) || 0;
    yRight.domain([Math.min(0, minRate), Math.max(100, maxRate)]).nice();

    g.append("g").attr("class", "grid")
     .call(axisLeft(y).ticks(5).tickSize(-chartWidth).tickFormat(() => "")).selectAll("line").attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3,3");

    // Zero Line
    g.append("line")
        .attr("x1", 0)
        .attr("x2", chartWidth)
        .attr("y1", y(0))
        .attr("y2", y(0))
        .attr("stroke", "#000")
        .attr("stroke-width", 1);

    const tooltip = select(containerRef.current).select(".tooltip");

    // Bars
    g.selectAll(".bar")
      .data(processedData)
      .enter().append("rect")
      .attr("x", d => x(String(d.name)) || 0)
      .attr("y", d => d.balance >= 0 ? y(d.balance) : y(0))
      .attr("width", x.bandwidth())
      .attr("height", d => Math.abs(y(d.balance) - y(0)))
      .attr("fill", d => d.balance >= 0 ? "#10b981" : "#ef4444")
      .attr("rx", 3);

    // Savings Rate Line
    if (showSavingsRateLine) {
        const lineRate = d3Line<any>()
            .x(d => (x(String(d.name)) || 0) + x.bandwidth() / 2)
            .y(d => yRight(d.savingsRate))
            .curve(curveMonotoneX);
            
        g.append("path").datum(data).attr("fill", "none").attr("stroke", "#6366f1").attr("stroke-width", 2).attr("d", lineRate);
        g.selectAll(".dot-rate").data(data).enter().append("circle").attr("cx", d => (x(String(d.name)) || 0) + x.bandwidth() / 2).attr("cy", d => yRight(d.savingsRate)).attr("r", 3).attr("fill", "#6366f1").attr("stroke", "#fff").attr("stroke-width", 1.5);
    }

    // Axes
    const maxLabels = Math.floor(chartWidth / 50);
    const interval = Math.ceil(data.length / maxLabels);
    const tickValues = data.map(d => String(d.name)).filter((_, i) => i % interval === 0);

    g.append("g").attr("transform", `translate(0,${chartHeight})`)
        .call(axisBottom(x).tickValues(tickValues).tickSize(0))
        .select(".domain").remove();
    
    g.append("g").call(axisLeft(y).ticks(5).tickFormat((d: any) => isPrivateMode ? '' : `${d}`)).select(".domain").remove();

    if (showSavingsRateLine) {
        g.append("g").attr("transform", `translate(${chartWidth},0)`).call(axisRight(yRight).ticks(5).tickFormat(d => `${d}%`)).select(".domain").remove();
    }

    // Overlay for Tooltip
    const guideLine = g.append("line")
       .attr("stroke", "#94a3b8")
       .attr("stroke-width", 1)
       .attr("stroke-dasharray", "3,3")
       .attr("y1", 0).attr("y2", chartHeight)
       .style("opacity", 0);

    const overlayGroup = g.append("g").attr("class", "overlays");
    overlayGroup.selectAll(".overlay-rect")
       .data(processedData)
       .enter().append("rect")
       .attr("class", "overlay-rect")
       .attr("x", d => x(String(d.name)) || 0)
       .attr("y", 0)
       .attr("width", x.bandwidth())
       .attr("height", chartHeight)
       .attr("fill", "transparent")
       .on("mouseenter", () => guideLine.style("opacity", 1))
       .on("mousemove", (event, d) => {
           const centerX = (x(String(d.name)) || 0) + x.bandwidth() / 2;
           guideLine.attr("x1", centerX).attr("x2", centerX);
           
           let htmlContent = `
             <div class="mb-2 border-b border-slate-100 pb-1"><strong>${d.name}</strong></div>
             <div class="grid grid-cols-2 gap-x-4 gap-y-1">
                <span class="text-slate-500">Nadwyżka:</span> <span class="${d.balance >= 0 ? 'text-emerald-600' : 'text-red-600'} font-medium text-right">${formatValue(d.balance, isPrivateMode)}</span>
           `;
           if (showSavingsRateLine) {
               htmlContent += `
                <span class="text-slate-500">Oszczędność:</span> <span class="text-indigo-600 font-medium text-right">${d.savingsRate.toFixed(1)}%</span>`;
           }
           htmlContent += `</div>`;

           tooltip.style("opacity", 1)
                  .html(htmlContent)
                  .style("left", `${event.clientX + 15}px`)
                  .style("top", `${event.clientY + 10}px`);
       })
       .on("mouseleave", () => {
           tooltip.style("opacity", 0);
           guideLine.style("opacity", 0);
       });

  }, [data, width, height, isPrivateMode, showSavingsRateLine]);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg width="100%" height={height} className="overflow-visible" />
      <div className="tooltip fixed opacity-0 bg-white p-3 border border-slate-200 shadow-xl rounded-lg text-xs pointer-events-none transition-opacity z-50 min-w-[150px]" />
      <div className="flex flex-wrap gap-4 mt-2 justify-center">
         <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#10b981]"></div><span className="text-[10px] text-slate-500">Nadwyżka (+)</span></div>
         <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#ef4444]"></div><span className="text-[10px] text-slate-500">Deficyt (-)</span></div>
         {showSavingsRateLine && <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-indigo-500"></div><span className="text-[10px] text-slate-500">Stopa oszcz. (%)</span></div>}
      </div>
    </div>
  );
};

// --- 8. Cumulative Line Chart (For Spending Velocity) ---
export const CumulativeChart: React.FC<ChartProps & { series: { label: string, data: { day: number, value: number }[], color: string, dashed?: boolean }[] }> = ({ series, height = 300, isPrivateMode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useResizeObserver(containerRef);

  useEffect(() => {
    if (!width || series.length === 0) return;
    const svg = select(containerRef.current).select('svg');
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 30, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // X Axis: 1 to 31
    const x = scaleLinear().domain([1, 31]).range([0, chartWidth]);
    
    // Y Axis: Max cumulative value across all series
    const maxVal = max(series, s => max(s.data, d => d.value)) || 0;
    const y = scaleLinear().domain([0, maxVal]).nice().range([chartHeight, 0]);

    // Grid
    g.append("g").attr("class", "grid").call(axisLeft(y).ticks(5).tickSize(-chartWidth).tickFormat(() => "")).selectAll("line").attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3,3");

    // Line Generator
    const line = d3Line<{ day: number, value: number }>()
      .x(d => x(d.day))
      .y(d => y(d.value))
      .curve(curveMonotoneX);

    const tooltip = select(containerRef.current).select(".tooltip");

    series.forEach(s => {
       g.append("path")
        .datum(s.data)
        .attr("fill", "none")
        .attr("stroke", s.color)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", s.dashed ? "4,4" : "0")
        .attr("d", line);

       // Dots (only visible on hover or sparse)
       g.selectAll(`.dot-${s.label.replace(/\s/g, '')}`)
        .data(s.data)
        .enter().append("circle")
        .attr("cx", d => x(d.day))
        .attr("cy", d => y(d.value))
        .attr("r", 3)
        .attr("fill", s.color)
        .attr("opacity", 0) // Hidden by default to avoid clutter
        .on("mouseenter", (event, d) => {
           select(event.currentTarget).attr("opacity", 1).attr("r", 5);
           tooltip.style("opacity", 1)
                  .html(`<div><strong>Dzień ${d.day}</strong></div><div style="color:${s.color}">${s.label}: ${formatValue(d.value, isPrivateMode)}</div>`)
                  .style("left", `${event.clientX + 10}px`)
                  .style("top", `${event.clientY + 10}px`);
        })
        .on("mousemove", (event) => tooltip.style("left", `${event.clientX + 10}px`).style("top", `${event.clientY + 10}px`))
        .on("mouseleave", (event) => {
           select(event.currentTarget).attr("opacity", 0).attr("r", 3);
           tooltip.style("opacity", 0);
        });
       
       // Invisible overlay for easier hovering? Alternatively, rely on invisible dots with larger radius.
       g.selectAll(`.dot-hover-${s.label.replace(/\s/g, '')}`)
        .data(s.data)
        .enter().append("circle")
        .attr("cx", d => x(d.day))
        .attr("cy", d => y(d.value))
        .attr("r", 8)
        .attr("fill", "transparent")
        .on("mouseenter", (event, d) => {
           tooltip.style("opacity", 1)
                  .html(`<div><strong>Dzień ${d.day}</strong></div><div style="color:${s.color}">${s.label}: ${formatValue(d.value, isPrivateMode)}</div>`)
                  .style("left", `${event.clientX + 10}px`)
                  .style("top", `${event.clientY + 10}px`);
        })
        .on("mousemove", (event) => tooltip.style("left", `${event.clientX + 10}px`).style("top", `${event.clientY + 10}px`))
        .on("mouseleave", () => tooltip.style("opacity", 0));
    });

    // Axes
    g.append("g").attr("transform", `translate(0,${chartHeight})`).call(axisBottom(x).ticks(10)).select(".domain").remove();
    g.append("g").call(axisLeft(y).ticks(5).tickFormat((d: any) => isPrivateMode ? '' : `${d}`)).select(".domain").remove();

  }, [series, width, height, isPrivateMode]);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg width="100%" height={height} className="overflow-visible" />
      <div className="tooltip fixed opacity-0 bg-white p-2 border border-slate-200 shadow-lg rounded text-xs pointer-events-none transition-opacity z-50" />
      <div className="flex flex-wrap gap-4 mt-2 justify-center">
         {series.map(s => (
            <div key={s.label} className="flex items-center gap-1.5">
               <div className="w-4 h-0.5" style={{ backgroundColor: s.color, borderStyle: s.dashed ? 'dashed' : 'solid' }}></div>
               <span className="text-[10px] text-slate-500 font-medium">{s.label}</span>
            </div>
         ))}
      </div>
    </div>
  );
};

// --- 9. Day of Week Chart ---
export const DayOfWeekChart: React.FC<ChartProps> = ({ data, height = 250, isPrivateMode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useResizeObserver(containerRef);

  useEffect(() => {
    if (!width || !data || !data.length) return;
    const svg = select(containerRef.current).select('svg');
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = scaleBand()
      .domain(data.map(d => String(d.day)))
      .range([0, chartWidth])
      .padding(0.2);

    const y = scaleLinear()
      .domain([0, max(data, d => d.value) || 0])
      .nice()
      .range([chartHeight, 0]);

    g.append("g").attr("class", "grid").call(axisLeft(y).ticks(5).tickSize(-chartWidth).tickFormat(() => "")).selectAll("line").attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3,3");

    const tooltip = select(containerRef.current).select(".tooltip");

    g.selectAll(".bar")
      .data(data)
      .enter().append("rect")
      .attr("x", d => x(String(d.day)) || 0)
      .attr("y", d => y(d.value))
      .attr("width", x.bandwidth())
      .attr("height", d => chartHeight - y(d.value))
      .attr("fill", d => (d.isWeekend ? '#818cf8' : '#cbd5e1')) // Highlight weekends
      .attr("rx", 4)
      .on("mouseenter", (event, d) => {
         tooltip.style("opacity", 1)
                .html(`<div><strong>${d.day}</strong></div><div>${formatValue(d.value, isPrivateMode)}</div>`)
                .style("left", `${event.clientX + 10}px`)
                .style("top", `${event.clientY + 10}px`);
      })
      .on("mousemove", (event) => tooltip.style("left", `${event.clientX + 10}px`).style("top", `${event.clientY + 10}px`))
      .on("mouseleave", () => tooltip.style("opacity", 0));

    g.append("g").attr("transform", `translate(0,${chartHeight})`).call(axisBottom(x).tickSize(0)).select(".domain").remove();
    g.append("g").call(axisLeft(y).ticks(5).tickFormat((d: any) => isPrivateMode ? '' : `${d}`)).select(".domain").remove();

  }, [data, width, height, isPrivateMode]);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg width="100%" height={height} className="overflow-visible" />
      <div className="tooltip fixed opacity-0 bg-white p-2 border border-slate-200 shadow-lg rounded text-xs pointer-events-none transition-opacity z-50" />
    </div>
  );
};

// --- 10. Waterfall Chart ---
export const WaterfallChart: React.FC<ChartProps> = ({ data, height = 350, isPrivateMode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useResizeObserver(containerRef);

  useEffect(() => {
    if (!width || !data || !data.length) return;
    const svg = select(containerRef.current).select('svg');
    svg.selectAll("*").remove();

    const margin = { top: 30, right: 30, bottom: 70, left: 60 }; // Increased top for labels, bottom for rotated text
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Prepare data for waterfall
    let cumulative = 0;
    const processedData = data.map((d, i) => {
        const start = cumulative;
        let end = cumulative;
        let val = d.value;

        if (d.type === 'income') {
            end += val;
        } else if (d.type === 'expense' || d.type === 'savings') {
            end -= val;
            val = -val; // Visual negative
        } else if (d.type === 'balance') {
            // Balance is the final result, starts from 0 to current cumulative
            end = cumulative;
            return { ...d, start: 0, end: cumulative, value: cumulative, isTotal: true };
        }
        
        cumulative = end;
        return { ...d, start, end, value: Math.abs(d.value), rawValue: d.value, isTotal: false };
    });

    const x = scaleBand()
      .domain(processedData.map(d => String(d.name)))
      .range([0, chartWidth])
      .padding(0.3);

    // Y Domain needs to cover 0 to Max Income
    const maxVal = max(processedData, d => Math.max(d.start, d.end)) || 0;
    const minVal = min(processedData, d => Math.min(d.start, d.end)) || 0;
    
    // Ensure we always show 0
    const y = scaleLinear()
      .domain([Math.min(0, minVal), Math.max(0, maxVal)])
      .nice()
      .range([chartHeight, 0]);

    g.append("g").attr("class", "grid").call(axisLeft(y).ticks(5).tickSize(-chartWidth).tickFormat(() => "")).selectAll("line").attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3,3");

    const tooltip = select(containerRef.current).select(".tooltip");

    // Bars
    g.selectAll(".bar")
      .data(processedData)
      .enter().append("rect")
      .attr("x", d => x(String(d.name)) || 0)
      .attr("y", d => y(Math.max(d.start, d.end)))
      .attr("width", x.bandwidth())
      .attr("height", d => Math.max(1, Math.abs(y(d.start) - y(d.end))))
      .attr("fill", d => {
          if (d.type === 'income') return '#22c55e'; // Green
          if (d.type === 'savings') return '#3b82f6'; // Blue (Sankey Match)
          if (d.type === 'balance') return d.value >= 0 ? '#10b981' : '#334155'; // Changed to Green (Emerald-500) for Surplus
          return '#ef4444'; // Red for expense
      })
      .attr("fill-opacity", 0.6) // Match Sankey Link Opacity
      .attr("rx", 3)
      .on("mouseenter", (event, d) => {
         tooltip.style("opacity", 1)
                .html(`
                    <div><strong>${d.name}</strong></div>
                    <div style="font-weight:bold; color:${d.type==='expense'?'#ef4444':d.type==='income'?'#22c55e':d.type==='savings'?'#3b82f6':d.value>=0?'#10b981':'#334155'}">
                        ${d.type === 'expense' || d.type === 'savings' ? '-' : ''}${formatValue(d.value, isPrivateMode)}
                    </div>
                `)
                .style("left", `${event.clientX + 10}px`)
                .style("top", `${event.clientY + 10}px`);
      })
      .on("mousemove", (event) => tooltip.style("left", `${event.clientX + 10}px`).style("top", `${event.clientY + 10}px`))
      .on("mouseleave", () => tooltip.style("opacity", 0));

    // Value Labels
    g.selectAll(".label")
       .data(processedData)
       .enter().append("text")
       .text(d => formatValue(d.value, isPrivateMode))
       .attr("x", d => (x(String(d.name)) || 0) + x.bandwidth() / 2)
       .attr("y", d => {
           const barTop = y(Math.max(d.start, d.end)); // This is visually the top edge of the rect
           const barBottom = y(Math.min(d.start, d.end)); // This is visually the bottom edge
           const height = Math.abs(barTop - barBottom);
           
           // If bar is tall enough, center text inside. 
           // Otherwise put OUTSIDE ABOVE the bar (barTop - 5) for both Income and Expense
           // to ensure it doesn't overlap the bar below or the connector.
           if (height > 20) return (barTop + barBottom) / 2;
           return barTop - 5; 
       })
       .attr("dy", "0.35em")
       .attr("text-anchor", "middle")
       .attr("font-size", "10px")
       .attr("font-weight", "bold")
       .attr("fill", "#1e293b") 
       .style("pointer-events", "none");

    // Connector Lines
    const lineData: any[] = [];
    for(let i=0; i<processedData.length-1; i++) {
        const curr = processedData[i];
        const next = processedData[i+1];
        const yPos = y(curr.end);
        
        lineData.push({
            x1: (x(String(curr.name)) || 0) + x.bandwidth(),
            x2: (x(String(next.name)) || 0),
            y: yPos
        });
    }

    g.selectAll(".connector")
        .data(lineData)
        .enter().append("line")
        .attr("x1", d => d.x1)
        .attr("x2", d => d.x2)
        .attr("y1", d => d.y)
        .attr("y2", d => d.y)
        .attr("stroke", "#94a3b8")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "2,2");

    // X Axis
    g.append("g").attr("transform", `translate(0,${chartHeight})`)
        .call(axisBottom(x).tickSize(0))
        .select(".domain").remove();
        
    // Rotate labels to show full names
    g.selectAll(".tick text")
        .attr("transform", "rotate(-25)")
        .attr("text-anchor", "end")
        .attr("dx", "-0.5em")
        .attr("dy", "0.5em");

    g.append("g").call(axisLeft(y).ticks(5).tickFormat((d: any) => isPrivateMode ? '' : `${d}`)).select(".domain").remove();

  }, [data, width, height, isPrivateMode]);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg width="100%" height={height} className="overflow-visible" />
      <div className="tooltip fixed opacity-0 bg-white p-2 border border-slate-200 shadow-lg rounded text-xs pointer-events-none transition-opacity z-50" />
    </div>
  );
};
