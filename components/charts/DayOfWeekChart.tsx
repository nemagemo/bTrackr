
import React, { useEffect } from 'react';
import * as d3 from 'd3';
import { useChartDimensions } from '../../hooks/useChartDimensions';
import { ChartProps, formatValue } from './types';

export const DayOfWeekChart: React.FC<ChartProps> = ({ data, height = 250, isPrivateMode, isDarkMode }) => {
  const { ref, width } = useChartDimensions();

  useEffect(() => {
    if (!width || !data || !data.length) return;
    const svg = d3.select(ref.current).select('svg');
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const gridColor = isDarkMode ? "#334155" : "#e2e8f0";
    const textColor = isDarkMode ? "#94a3b8" : "#64748b";
    const tooltipBg = isDarkMode ? "#1e293b" : "#fff";
    const tooltipBorder = isDarkMode ? "#334155" : "#e2e8f0";
    const tooltipText = isDarkMode ? "#f8fafc" : "#1e293b";

    const x = d3.scaleBand()
      .domain(data.map(d => String(d.day)))
      .range([0, chartWidth])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value) || 0])
      .nice()
      .range([chartHeight, 0]);

    g.append("g").attr("class", "grid")
     .call(d3.axisLeft(y).ticks(5).tickSize(-chartWidth).tickFormat(() => ""))
     .selectAll("line").attr("stroke", gridColor).attr("stroke-dasharray", "3,3");

    const tooltip = d3.select(ref.current).select(".tooltip");
    tooltip.style("background-color", tooltipBg).style("border-color", tooltipBorder).style("color", tooltipText);

    g.selectAll(".bar")
      .data(data)
      .enter().append("rect")
      .attr("x", d => x(String(d.day)) || 0)
      .attr("y", d => y(d.value))
      .attr("width", x.bandwidth())
      .attr("height", d => chartHeight - y(d.value))
      .attr("fill", d => (d.isWeekend ? '#818cf8' : isDarkMode ? '#475569' : '#cbd5e1'))
      .attr("rx", 4)
      .on("mouseenter", (event, d) => {
         tooltip.style("opacity", 1)
                .html(`<div><strong>${d.day}</strong></div><div>${formatValue(d.value, isPrivateMode)}</div>`)
                .style("left", `${event.clientX + 10}px`)
                .style("top", `${event.clientY + 10}px`);
      })
      .on("mousemove", (event) => tooltip.style("left", `${event.clientX + 10}px`).style("top", `${event.clientY + 10}px`))
      .on("mouseleave", () => tooltip.style("opacity", 0));

    const xAxis = g.append("g").attr("transform", `translate(0,${chartHeight})`).call(d3.axisBottom(x).tickSize(0));
    xAxis.select(".domain").remove();
    xAxis.selectAll("text").attr("fill", textColor);
    
    const yAxis = g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat((d: any) => isPrivateMode ? '' : `${d}`));
    yAxis.select(".domain").remove();
    yAxis.selectAll("text").attr("fill", textColor);
    yAxis.selectAll("line").attr("stroke", gridColor);

  }, [data, width, height, isPrivateMode, isDarkMode]);

  return (
    <div ref={ref} className="relative w-full">
      <svg width="100%" height={height} className="overflow-visible" />
      <div className="tooltip fixed opacity-0 bg-white p-2 border border-slate-200 shadow-lg rounded text-xs pointer-events-none transition-opacity z-50" />
    </div>
  );
};
