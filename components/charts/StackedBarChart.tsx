
import React, { useEffect } from 'react';
import * as d3 from 'd3';
import { useChartDimensions } from '../../hooks/useChartDimensions';
import { ChartProps, formatValue } from './types';

export const StackedBarChart: React.FC<ChartProps & { keys: string[] }> = ({ data, keys, colors = [], height = 300, isPrivateMode, isDarkMode }) => {
  const { ref, width } = useChartDimensions();

  useEffect(() => {
    if (!width || !data || !data.length) return;
    const svg = d3.select(ref.current).select('svg');
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const stack = d3.stack().keys(keys);
    const stackedData = stack(data);

    const x = d3.scaleBand().domain(data.map(d => String(d.name))).range([0, chartWidth]).padding(0.3);
    const y = d3.scaleLinear().domain([0, d3.max(stackedData, layer => d3.max(layer, d => d[1])) || 0]).nice().range([chartHeight, 0]);
    const colorScale = d3.scaleOrdinal().domain(keys).range(colors);

    // Dark Mode colors
    const gridColor = isDarkMode ? "#334155" : "#e2e8f0";
    const textColor = isDarkMode ? "#94a3b8" : "#64748b";
    const tooltipBg = isDarkMode ? "#1e293b" : "#fff";
    const tooltipBorder = isDarkMode ? "#334155" : "#e2e8f0";
    const tooltipText = isDarkMode ? "#f8fafc" : "#1e293b";

    g.append("g")
     .attr("class", "grid")
     .call(d3.axisLeft(y).ticks(5).tickSize(-chartWidth).tickFormat(() => ""))
     .selectAll("line")
     .attr("stroke", gridColor)
     .attr("stroke-dasharray", "3,3");

    const tooltip = d3.select(ref.current).select(".tooltip");
    
    // Apply dark mode styles to tooltip container dynamically
    tooltip.style("background-color", tooltipBg)
           .style("border-color", tooltipBorder)
           .style("color", tooltipText);

    g.selectAll("g.layer")
      .data(stackedData)
      .enter().append("g")
      .classed("layer", true)
      .attr("fill", d => colorScale(d.key) as string)
      .each(function(series) {
          const seriesKey = series.key;
          d3.select(this).selectAll("rect")
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
                        <div class="text-xs opacity-70 text-right">${pct}% całości</div>
                      `)
                      .style("left", `${event.clientX + 10}px`)
                      .style("top", `${event.clientY + 10}px`);
            })
            .on("mouseleave", () => tooltip.style("opacity", 0));
      });

    const maxLabels = Math.floor(chartWidth / 50);
    const interval = Math.ceil(data.length / maxLabels);
    const tickValues = data.map(d => String(d.name)).filter((_, i) => i % interval === 0);

    const xAxis = g.append("g").attr("transform", `translate(0,${chartHeight})`)
        .call(d3.axisBottom(x).tickValues(tickValues).tickSize(0));
    xAxis.select(".domain").remove();
    xAxis.selectAll("text").attr("fill", textColor);
    
    const yAxis = g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat((d: any) => isPrivateMode ? '' : `${d}`));
    yAxis.select(".domain").remove();
    yAxis.selectAll("text").attr("fill", textColor);
    yAxis.selectAll("line").attr("stroke", gridColor); // Ticks

  }, [data, width, height, keys, colors, isPrivateMode, isDarkMode]);

  const colorScale = d3.scaleOrdinal().domain(keys).range(colors);

  return (
    <div ref={ref} className="relative w-full">
      <svg width="100%" height={height} className="overflow-visible" />
      <div className="tooltip fixed opacity-0 bg-white p-2 border border-slate-200 shadow-lg rounded text-xs pointer-events-none transition-opacity z-50" />
      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 px-2">
         {keys.map(k => (
            <div key={k} className="flex items-center gap-1.5">
               <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colorScale(k) as string }}></div>
               <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{k}</span>
            </div>
         ))}
      </div>
    </div>
  );
};
