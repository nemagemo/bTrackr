
import React, { useEffect } from 'react';
import { select, scaleLinear, scaleOrdinal, axisLeft, axisBottom, line as d3Line, curveMonotoneX, scalePoint, max } from 'd3';
import { useChartDimensions } from '../../hooks/useChartDimensions';
import { ChartProps, formatValue } from './types';

export const MultiLineChart: React.FC<ChartProps & { keys: string[], highlightKey?: string, highlightStrokeWidth?: number }> = ({ 
  data, 
  keys, 
  colors = [], 
  height = 300, 
  isPrivateMode, 
  highlightKey,
  highlightStrokeWidth = 4,
  isDarkMode
}) => {
  const { ref, width } = useChartDimensions();

  useEffect(() => {
    if (!width || !data || !data.length) return;
    const svg = select(ref.current).select('svg');
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const gridColor = isDarkMode ? "#334155" : "#e2e8f0";
    const textColor = isDarkMode ? "#94a3b8" : "#64748b";
    const tooltipBg = isDarkMode ? "#1e293b" : "#fff";
    const tooltipBorder = isDarkMode ? "#334155" : "#e2e8f0";
    const tooltipText = isDarkMode ? "#f8fafc" : "#1e293b";

    const x = scalePoint().domain(data.map(d => String(d.name))).range([0, chartWidth]);
    
    const maxY = max(data, d => Math.max(...keys.map(k => d[k] || 0))) || 0;
    const y = scaleLinear().domain([0, maxY]).nice().range([chartHeight, 0]);
    const colorScale = scaleOrdinal().domain(keys).range(colors);

    g.append("g").attr("class", "grid")
     .call(axisLeft(y).ticks(5).tickSize(-chartWidth).tickFormat(() => ""))
     .selectAll("line").attr("stroke", gridColor).attr("stroke-dasharray", "3,3");

    const line = d3Line<any>()
      .x(d => x(String(d.name)) || 0)
      .y(d => y(d.value))
      .curve(curveMonotoneX);

    const tooltip = select(ref.current).select(".tooltip");
    tooltip.style("background-color", tooltipBg).style("border-color", tooltipBorder).style("color", tooltipText);

    const sortedKeys = [...keys].sort((a, b) => {
        if (a === highlightKey) return 1;
        if (b === highlightKey) return -1;
        return 0;
    });

    sortedKeys.forEach(key => {
       const lineData = data.map(d => ({ name: String(d.name), value: d[key] }));
       const color = colorScale(key) as string;
       const isHighlighted = key === highlightKey;
       
       // Adjust current year color for dark mode if it's the default dark blue
       const finalColor = (isDarkMode && color === '#0f172a') ? '#f8fafc' : color;

       g.append("path")
        .datum(lineData)
        .attr("fill", "none")
        .attr("stroke", finalColor)
        .attr("stroke-width", isHighlighted ? highlightStrokeWidth : 2)
        .attr("stroke-opacity", isHighlighted ? 1 : 0.7) 
        .attr("d", line);

       g.selectAll(`.dot-${key}`)
        .data(lineData)
        .enter().append("circle")
        .attr("cx", d => x(d.name) || 0)
        .attr("cy", d => y(d.value))
        .attr("r", isHighlighted ? 4 : 3)
        .attr("fill", finalColor)
        .attr("opacity", isHighlighted ? 1 : 0.7)
        .on("mouseenter", (event, d) => {
            select(event.currentTarget).attr("r", 6).attr("opacity", 1);
            tooltip.style("opacity", 1)
                   .html(`<div><strong>${d.name}</strong></div><div style="color:${finalColor}; font-weight:${isHighlighted?'bold':'normal'}">${key}: ${formatValue(d.value, isPrivateMode)}</div>`)
                   .style("left", `${event.clientX + 10}px`)
                   .style("top", `${event.clientY + 10}px`);
        })
        .on("mousemove", (event) => tooltip.style("left", `${event.clientX + 10}px`).style("top", `${event.clientY + 10}px`))
        .on("mouseleave", (event) => {
            select(event.currentTarget).attr("r", isHighlighted ? 4 : 3).attr("opacity", isHighlighted ? 1 : 0.7);
            tooltip.style("opacity", 0);
        });
    });

    const maxLabels = Math.floor(chartWidth / 50);
    const interval = Math.ceil(data.length / maxLabels);
    const tickValues = data.map(d => String(d.name)).filter((_, i) => i % interval === 0);

    const xAxis = g.append("g").attr("transform", `translate(0,${chartHeight})`)
        .call(axisBottom(x).tickValues(tickValues).tickSize(0));
    xAxis.select(".domain").remove();
    xAxis.selectAll("text").attr("fill", textColor);
    
    const yAxis = g.append("g").call(axisLeft(y).ticks(5).tickFormat((d: any) => isPrivateMode ? '' : `${d}`));
    yAxis.select(".domain").remove();
    yAxis.selectAll("text").attr("fill", textColor);
    yAxis.selectAll("line").attr("stroke", gridColor);

  }, [data, width, height, keys, colors, isPrivateMode, highlightKey, highlightStrokeWidth, isDarkMode]);

  const colorScale = scaleOrdinal().domain(keys).range(colors);

  return (
    <div ref={ref} className="relative w-full">
      <svg width="100%" height={height} className="overflow-visible" />
      <div className="tooltip fixed opacity-0 bg-white p-2 border border-slate-200 shadow-lg rounded text-xs pointer-events-none transition-opacity z-50" />
      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 px-2 justify-center">
         {keys.map(k => {
            const baseColor = colorScale(k) as string;
            const finalColor = (isDarkMode && baseColor === '#0f172a') ? '#f8fafc' : baseColor;
            return (
                <div key={k} className={`flex items-center gap-1.5 ${k === highlightKey ? 'font-bold text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 opacity-80'}`}>
                   <div className="w-3 h-3 rounded-full" style={{ backgroundColor: finalColor }}></div>
                   <span className="text-[10px]">{k}</span>
                </div>
            );
         })}
      </div>
    </div>
  );
};
