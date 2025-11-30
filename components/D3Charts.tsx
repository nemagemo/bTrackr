import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { CURRENCY_FORMATTER } from '../constants';

// --- Shared Types & Helpers ---
interface ChartProps {
  data: any[];
  height?: number;
  colors?: string[];
  className?: string;
  isPrivateMode?: boolean;
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
    if (!width || !data.length) return;
    // Implementation skipped for brevity as it is not used in main analysis currently
  }, [data, width, height, isPrivateMode]);

  return <div ref={containerRef} />;
};

// --- 3. Stacked Bar Chart ---
export const StackedBarChart: React.FC<ChartProps & { keys: string[] }> = ({ data, keys, colors = [], height = 300, isPrivateMode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useResizeObserver(containerRef);

  useEffect(() => {
    if (!width || !data.length) return;
    const svg = d3.select(containerRef.current).select('svg');
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const stack = d3.stack().keys(keys);
    const stackedData = stack(data);

    const x = d3.scaleBand().domain(data.map(d => d.name)).range([0, chartWidth]).padding(0.3);
    const y = d3.scaleLinear().domain([0, d3.max(stackedData, layer => d3.max(layer, d => d[1])) || 0]).nice().range([chartHeight, 0]);
    const colorScale = d3.scaleOrdinal().domain(keys).range(colors);

    g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(5).tickSize(-chartWidth).tickFormat(() => "")).selectAll("line").attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3,3");

    const tooltip = d3.select(containerRef.current).select(".tooltip");

    g.selectAll("g.layer")
      .data(stackedData)
      .enter().append("g")
      .classed("layer", true)
      .attr("fill", d => colorScale(d.key) as string)
      .selectAll("rect")
      .data(d => d)
      .enter().append("rect")
      .attr("x", d => x(d.data.name) || 0)
      .attr("y", d => y(d[1]))
      .attr("height", d => y(d[0]) - y(d[1]))
      .attr("width", x.bandwidth())
      .on("mousemove", (event, d) => {
         const subcategoryName = (d3.select(event.currentTarget.parentNode).datum() as any).key;
         const val = d.data[subcategoryName];
         const total = keys.reduce((acc, k) => acc + (d.data[k] || 0), 0);
         const pct = total ? ((val / total) * 100).toFixed(1) : '0.0';

         tooltip.style("opacity", 1)
                .html(`
                  <div class="mb-1"><strong>${d.data.name}</strong></div>
                  <div class="flex items-center gap-2 mb-1">
                     <span style="width:8px;height:8px;border-radius:50%;background-color:${colorScale(subcategoryName)}"></span>
                     <span>${subcategoryName}:</span>
                     <span class="font-bold">${formatValue(val, isPrivateMode)}</span>
                  </div>
                  <div class="text-xs text-slate-400 text-right">${pct}% całości</div>
                `)
                .style("left", `${event.clientX + 10}px`)
                .style("top", `${event.clientY + 10}px`);
      })
      .on("mouseleave", () => tooltip.style("opacity", 0));

    g.append("g").attr("transform", `translate(0,${chartHeight})`).call(d3.axisBottom(x).tickSize(0)).select(".domain").remove();
    g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat((d) => isPrivateMode ? '' : `${d}`)).select(".domain").remove();

  }, [data, width, height, keys, colors, isPrivateMode]);

  const colorScale = d3.scaleOrdinal().domain(keys).range(colors);

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
export const MultiLineChart: React.FC<ChartProps & { keys: string[] }> = ({ data, keys, colors = [], height = 300, isPrivateMode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useResizeObserver(containerRef);

  useEffect(() => {
    if (!width || !data.length) return;
    const svg = d3.select(containerRef.current).select('svg');
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint().domain(data.map(d => d.name)).range([0, chartWidth]);
    
    const maxY = d3.max(data, d => Math.max(...keys.map(k => d[k] || 0))) || 0;
    const y = d3.scaleLinear().domain([0, maxY]).nice().range([chartHeight, 0]);
    const colorScale = d3.scaleOrdinal().domain(keys).range(colors);

    g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(5).tickSize(-chartWidth).tickFormat(() => "")).selectAll("line").attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3,3");

    const line = d3.line<any>()
      .x(d => x(d.name) || 0)
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    const tooltip = d3.select(containerRef.current).select(".tooltip");

    keys.forEach(key => {
       const lineData = data.map(d => ({ name: d.name, value: d[key] }));
       const color = colorScale(key) as string;
       
       g.append("path")
        .datum(lineData)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("d", line);

       g.selectAll(`.dot-${key}`)
        .data(lineData)
        .enter().append("circle")
        .attr("cx", d => x(d.name) || 0)
        .attr("cy", d => y(d.value))
        .attr("r", 3)
        .attr("fill", color)
        .on("mouseenter", (event, d) => {
            d3.select(event.currentTarget).attr("r", 5);
            tooltip.style("opacity", 1)
                   .html(`<div><strong>${d.name}</strong></div><div style="color:${color}">${key}: ${formatValue(d.value, isPrivateMode)}</div>`)
                   .style("left", `${event.clientX + 10}px`)
                   .style("top", `${event.clientY + 10}px`);
        })
        .on("mousemove", (event) => tooltip.style("left", `${event.clientX + 10}px`).style("top", `${event.clientY + 10}px`))
        .on("mouseleave", (event) => {
            d3.select(event.currentTarget).attr("r", 3);
            tooltip.style("opacity", 0);
        });
    });

    g.append("g").attr("transform", `translate(0,${chartHeight})`).call(d3.axisBottom(x).tickSize(0)).select(".domain").remove();
    g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat((d) => isPrivateMode ? '' : `${d}`)).select(".domain").remove();

  }, [data, width, height, keys, colors, isPrivateMode]);

  const colorScale = d3.scaleOrdinal().domain(keys).range(colors);

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

// --- 6. Combo Chart (SHARED TOOLTIP) ---
export const ComboChart: React.FC<ChartProps> = ({ data, height = 350, isPrivateMode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useResizeObserver(containerRef);

  useEffect(() => {
    if (!width || !data.length) return;
    const svg = d3.select(containerRef.current).select('svg');
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 40, bottom: 30, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(data.map(d => d.name)).range([0, chartWidth]).padding(0.3);
    const maxAmountRaw = d3.max(data, d => Math.max(d.income, d.expense)) || 0;
    const minAmountRaw = d3.min(data, d => d.income - d.expense) || 0;
    
    const yLeft = d3.scaleLinear()
      .domain([Math.min(0, minAmountRaw), maxAmountRaw])
      .nice()
      .range([chartHeight, 0]);

    const [yLeftMin, yLeftMax] = yLeft.domain();
    const maxRateData = d3.max(data, d => d.savingsRate) || 0;
    const yRightMaxBase = Math.max(100, maxRateData);

    let yRightMin = 0;
    if (yLeftMax > 0 && yLeftMin < 0) {
        const ratio = Math.abs(yLeftMin) / yLeftMax;
        yRightMin = - (yRightMaxBase * ratio);
    } else if (yLeftMax === 0 && yLeftMin < 0) {
        yRightMin = -100;
    }

    const yRight = d3.scaleLinear().domain([yRightMin, yRightMaxBase]).range([chartHeight, 0]);

    g.append("g").attr("class", "grid")
     .call(d3.axisLeft(yLeft).ticks(5).tickSize(-chartWidth).tickFormat(() => ""))
     .selectAll("line").attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3,3");

    const tooltip = d3.select(containerRef.current).select(".tooltip");
    
    // Zero Line
    g.append("line").attr("x1", 0).attr("x2", chartWidth).attr("y1", yLeft(0)).attr("y2", yLeft(0)).attr("stroke", "#94a3b8").attr("stroke-width", 1);

    const xSub = d3.scaleBand().domain(['inc', 'exp']).range([0, x.bandwidth()]).padding(0.05);

    // Bars (No separate mouse events)
    g.selectAll(".bar-inc")
      .data(data)
      .enter().append("rect")
      .attr("x", d => (x(d.name) || 0) + (xSub('inc') || 0))
      .attr("y", d => yLeft(d.income))
      .attr("width", xSub.bandwidth())
      .attr("height", d => Math.abs(yLeft(0) - yLeft(d.income)))
      .attr("fill", "#10b981")
      .attr("rx", 2);

    g.selectAll(".bar-exp")
      .data(data)
      .enter().append("rect")
      .attr("x", d => (x(d.name) || 0) + (xSub('exp') || 0))
      .attr("y", d => yLeft(d.expense))
      .attr("width", xSub.bandwidth())
      .attr("height", d => Math.abs(yLeft(0) - yLeft(d.expense)))
      .attr("fill", "#ef4444")
      .attr("rx", 2);

    // Lines & Dots (No separate mouse events)
    const lineRate = d3.line<any>().x(d => (x(d.name) || 0) + x.bandwidth() / 2).y(d => yRight(Math.max(0, d.savingsRate))).curve(d3.curveMonotoneX);
    g.append("path").datum(data).attr("fill", "none").attr("stroke", "#6366f1").attr("stroke-width", 2).attr("d", lineRate);

    const lineBalance = d3.line<any>().x(d => (x(d.name) || 0) + x.bandwidth() / 2).y(d => yLeft(d.income - d.expense)).curve(d3.curveMonotoneX);
    g.append("path").datum(data).attr("fill", "none").attr("stroke", "#0ea5e9").attr("stroke-width", 2).attr("stroke-dasharray", "4,2").attr("d", lineBalance);

    g.selectAll(".dot-rate").data(data).enter().append("circle").attr("cx", d => (x(d.name) || 0) + x.bandwidth() / 2).attr("cy", d => yRight(Math.max(0, d.savingsRate))).attr("r", 3).attr("fill", "#6366f1").attr("stroke", "#fff").attr("stroke-width", 1.5);
    g.selectAll(".dot-balance").data(data).enter().append("circle").attr("cx", d => (x(d.name) || 0) + x.bandwidth() / 2).attr("cy", d => yLeft(d.income - d.expense)).attr("r", 3).attr("fill", "#0ea5e9").attr("stroke", "#fff").attr("stroke-width", 1.5);

    // Axes
    g.append("g").attr("transform", `translate(0,${chartHeight})`).call(d3.axisBottom(x).tickSize(0)).select(".domain").remove();
    g.append("g").call(d3.axisLeft(yLeft).ticks(5).tickFormat((d) => isPrivateMode ? '' : `${d}`)).select(".domain").remove();
    g.append("g").attr("transform", `translate(${chartWidth},0)`).call(d3.axisRight(yRight).ticks(5).tickFormat(d => `${d}%`)).select(".domain").remove();

    // --- SHARED OVERLAY & TOOLTIP LOGIC ---
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
       .attr("x", d => x(d.name) || 0)
       .attr("y", 0)
       .attr("width", x.bandwidth())
       .attr("height", chartHeight)
       .attr("fill", "transparent")
       .on("mouseenter", () => guideLine.style("opacity", 1))
       .on("mousemove", (event, d) => {
           const centerX = (x(d.name) || 0) + x.bandwidth() / 2;
           guideLine.attr("x1", centerX).attr("x2", centerX);
           
           const surplus = d.income - d.expense;
           
           tooltip.style("opacity", 1)
                  .html(`
                    <div class="mb-2 border-b border-slate-100 pb-1"><strong>${d.name}</strong></div>
                    <div class="grid grid-cols-2 gap-x-4 gap-y-1">
                       <span class="text-slate-500">Przychód:</span> <span class="text-emerald-600 font-medium text-right">${formatValue(d.income, isPrivateMode)}</span>
                       <span class="text-slate-500">Wydatek:</span> <span class="text-red-500 font-medium text-right">${formatValue(d.expense, isPrivateMode)}</span>
                       <span class="text-slate-500">Nadwyżka:</span> <span class="${surplus >= 0 ? 'text-emerald-600' : 'text-red-600'} font-medium text-right">${formatValue(surplus, isPrivateMode)}</span>
                       <span class="text-slate-500">Oszczędność:</span> <span class="text-indigo-600 font-medium text-right">${d.savingsRate.toFixed(1)}%</span>
                    </div>
                  `)
                  .style("left", `${event.clientX + 15}px`)
                  .style("top", `${event.clientY + 10}px`);
       })
       .on("mouseleave", () => {
           tooltip.style("opacity", 0);
           guideLine.style("opacity", 0);
       });

  }, [data, width, height, isPrivateMode]);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg width="100%" height={height} className="overflow-visible" />
      <div className="tooltip fixed opacity-0 bg-white p-3 border border-slate-200 shadow-xl rounded-lg text-xs pointer-events-none transition-opacity z-50 min-w-[180px]" />
      <div className="flex flex-wrap gap-4 mt-2 justify-center">
         <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-500"></div><span className="text-[10px] text-slate-500">Przychód</span></div>
         <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-500"></div><span className="text-[10px] text-slate-500">Wydatek</span></div>
         <div className="flex items-center gap-1.5"><div className="w-3 h-1 rounded bg-sky-500 border-dashed"></div><span className="text-[10px] text-slate-500">Nadwyżka</span></div>
         <div className="flex items-center gap-1.5"><div className="w-3 h-1 rounded bg-indigo-500"></div><span className="text-[10px] text-slate-500">Stopa oszcz. (%)</span></div>
      </div>
    </div>
  );
};

// --- 7. Difference Chart (SHARED TOOLTIP) ---
export const DifferenceChart: React.FC<ChartProps> = ({ data, height = 350, isPrivateMode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useResizeObserver(containerRef);

  useEffect(() => {
    if (!width || !data.length) return;
    const svg = d3.select(containerRef.current).select('svg');
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 40, bottom: 30, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint().domain(data.map(d => d.name)).range([0, chartWidth]);
    const yLeft = d3.scaleLinear().domain([0, d3.max(data, d => Math.max(d.income, d.expense)) || 0]).nice().range([chartHeight, 0]);
    const yRight = d3.scaleLinear().domain([0, 100]).range([chartHeight, 0]);

    g.append("g").attr("class", "grid").call(d3.axisLeft(yLeft).ticks(5).tickSize(-chartWidth).tickFormat(() => "")).selectAll("line").attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3,3");

    const lineIncome = d3.line<any>().x(d => x(d.name) || 0).y(d => yLeft(d.income)).curve(d3.curveMonotoneX);
    const lineExpense = d3.line<any>().x(d => x(d.name) || 0).y(d => yLeft(d.expense)).curve(d3.curveMonotoneX);
    const lineRate = d3.line<any>().x(d => x(d.name) || 0).y(d => yRight(Math.max(0, d.savingsRate))).curve(d3.curveMonotoneX);

    const area = d3.area<any>().x(d => x(d.name) || 0).y0(d => yLeft(d.income)).y1(d => yLeft(d.expense)).curve(d3.curveMonotoneX);
    
    const clipId = "clip-below-income-" + Math.random().toString(36).substr(2, 9);
    g.append("clipPath").attr("id", clipId).append("path").datum(data).attr("d", d3.area<any>().x(d => x(d.name) || 0).y0(0).y1(d => yLeft(d.income)).curve(d3.curveMonotoneX));

    g.append("path").datum(data).attr("d", area).attr("fill", "#fecaca").attr("stroke", "none");
    g.append("path").datum(data).attr("d", area).attr("fill", "#bbf7d0").attr("stroke", "none");
    g.append("path").datum(data).attr("d", area).attr("fill", "#fecaca").attr("clip-path", `url(#${clipId})`).attr("stroke", "none");

    g.append("path").datum(data).attr("fill", "none").attr("stroke", "#10b981").attr("stroke-width", 2).attr("d", lineIncome);
    g.append("path").datum(data).attr("fill", "none").attr("stroke", "#ef4444").attr("stroke-width", 2).attr("stroke-dasharray", "4,4").attr("d", lineExpense);
    g.append("path").datum(data).attr("fill", "none").attr("stroke", "#6366f1").attr("stroke-width", 2).attr("d", lineRate);

    g.append("g").attr("transform", `translate(0,${chartHeight})`).call(d3.axisBottom(x).tickSize(0)).select(".domain").remove();
    g.append("g").call(d3.axisLeft(yLeft).ticks(5).tickFormat((d) => isPrivateMode ? '' : `${d}`)).select(".domain").remove();
    g.append("g").attr("transform", `translate(${chartWidth},0)`).call(d3.axisRight(yRight).ticks(5).tickFormat(d => `${d}%`)).select(".domain").remove();

    const tooltip = d3.select(containerRef.current).select(".tooltip");
    
    // Static dots (no mouse events)
    g.selectAll(".dot-diff").data(data).enter().append("circle").attr("cx", d => x(d.name) || 0).attr("cy", d => yLeft(d.income)).attr("r", 4).attr("fill", "#10b981").attr("stroke", "#fff").attr("stroke-width", 1);
    g.selectAll(".dot-rate").data(data).enter().append("circle").attr("cx", d => x(d.name) || 0).attr("cy", d => yRight(Math.max(0, d.savingsRate))).attr("r", 3).attr("fill", "#6366f1").attr("stroke", "#fff").attr("stroke-width", 1.5);

    // --- SHARED OVERLAY & TOOLTIP LOGIC ---
    const guideLine = g.append("line")
       .attr("stroke", "#94a3b8")
       .attr("stroke-width", 1)
       .attr("stroke-dasharray", "3,3")
       .attr("y1", 0).attr("y2", chartHeight)
       .style("opacity", 0);

    const overlayGroup = g.append("g").attr("class", "overlays");
    
    // For ScalePoint, we simulate bandwidth by calculating step
    const step = x.step();
    
    overlayGroup.selectAll(".overlay-rect")
       .data(data)
       .enter().append("rect")
       .attr("class", "overlay-rect")
       .attr("x", d => (x(d.name) || 0) - step / 2)
       .attr("y", 0)
       .attr("width", step)
       .attr("height", chartHeight)
       .attr("fill", "transparent")
       .on("mouseenter", () => guideLine.style("opacity", 1))
       .on("mousemove", (event, d) => {
           const centerX = x(d.name) || 0;
           guideLine.attr("x1", centerX).attr("x2", centerX);
           
           const surplus = d.income - d.expense;
           
           tooltip.style("opacity", 1)
                  .html(`
                    <div class="mb-2 border-b border-slate-100 pb-1"><strong>${d.name}</strong></div>
                    <div class="grid grid-cols-2 gap-x-4 gap-y-1">
                       <span class="text-slate-500">Przychód:</span> <span class="text-emerald-600 font-medium text-right">${formatValue(d.income, isPrivateMode)}</span>
                       <span class="text-slate-500">Wydatek:</span> <span class="text-red-500 font-medium text-right">${formatValue(d.expense, isPrivateMode)}</span>
                       <span class="text-slate-500">Nadwyżka:</span> <span class="${surplus >= 0 ? 'text-emerald-600' : 'text-red-600'} font-medium text-right">${formatValue(surplus, isPrivateMode)}</span>
                       <span class="text-slate-500">Oszczędność:</span> <span class="text-indigo-600 font-medium text-right">${d.savingsRate.toFixed(1)}%</span>
                    </div>
                  `)
                  .style("left", `${event.clientX + 15}px`)
                  .style("top", `${event.clientY + 10}px`);
       })
       .on("mouseleave", () => {
           tooltip.style("opacity", 0);
           guideLine.style("opacity", 0);
       });

  }, [data, width, height, isPrivateMode]);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg width="100%" height={height} className="overflow-visible" />
      <div className="tooltip fixed opacity-0 bg-white p-3 border border-slate-200 shadow-xl rounded-lg text-xs pointer-events-none transition-opacity z-50 min-w-[180px]" />
      <div className="flex flex-wrap gap-4 mt-2 justify-center">
         <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#bbf7d0]"></div><span className="text-[10px] text-slate-500">Nadwyżka</span></div>
         <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#fecaca]"></div><span className="text-[10px] text-slate-500">Deficyt</span></div>
         <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-emerald-500"></div><span className="text-[10px] text-slate-500">Przychód</span></div>
         <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-red-500 border-dashed"></div><span className="text-[10px] text-slate-500">Wydatek</span></div>
         <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-indigo-500"></div><span className="text-[10px] text-slate-500">Stopa oszcz.</span></div>
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
    const svg = d3.select(containerRef.current).select('svg');
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 30, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // X Axis: 1 to 31
    const x = d3.scaleLinear().domain([1, 31]).range([0, chartWidth]);
    
    // Y Axis: Max cumulative value across all series
    const maxVal = d3.max(series, s => d3.max(s.data, d => d.value)) || 0;
    const y = d3.scaleLinear().domain([0, maxVal]).nice().range([chartHeight, 0]);

    // Grid
    g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(5).tickSize(-chartWidth).tickFormat(() => "")).selectAll("line").attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3,3");

    // Line Generator
    const line = d3.line<{ day: number, value: number }>()
      .x(d => x(d.day))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    const tooltip = d3.select(containerRef.current).select(".tooltip");

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
           d3.select(event.currentTarget).attr("opacity", 1).attr("r", 5);
           tooltip.style("opacity", 1)
                  .html(`<div><strong>Dzień ${d.day}</strong></div><div style="color:${s.color}">${s.label}: ${formatValue(d.value, isPrivateMode)}</div>`)
                  .style("left", `${event.clientX + 10}px`)
                  .style("top", `${event.clientY + 10}px`);
        })
        .on("mousemove", (event) => tooltip.style("left", `${event.clientX + 10}px`).style("top", `${event.clientY + 10}px`))
        .on("mouseleave", (event) => {
           d3.select(event.currentTarget).attr("opacity", 0).attr("r", 3);
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
    g.append("g").attr("transform", `translate(0,${chartHeight})`).call(d3.axisBottom(x).ticks(10)).select(".domain").remove();
    g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat((d) => isPrivateMode ? '' : `${d}`)).select(".domain").remove();

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
    if (!width || !data.length) return;
    const svg = d3.select(containerRef.current).select('svg');
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(data.map(d => d.day))
      .range([0, chartWidth])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value) || 0])
      .nice()
      .range([chartHeight, 0]);

    g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(5).tickSize(-chartWidth).tickFormat(() => "")).selectAll("line").attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3,3");

    const tooltip = d3.select(containerRef.current).select(".tooltip");

    g.selectAll(".bar")
      .data(data)
      .enter().append("rect")
      .attr("x", d => x(d.day) || 0)
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

    g.append("g").attr("transform", `translate(0,${chartHeight})`).call(d3.axisBottom(x).tickSize(0)).select(".domain").remove();
    g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat((d) => isPrivateMode ? '' : `${d}`)).select(".domain").remove();

  }, [data, width, height, isPrivateMode]);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg width="100%" height={height} className="overflow-visible" />
      <div className="tooltip fixed opacity-0 bg-white p-2 border border-slate-200 shadow-lg rounded text-xs pointer-events-none transition-opacity z-50" />
    </div>
  );
};