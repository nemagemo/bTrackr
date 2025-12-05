
import React, { useEffect } from 'react';
import { select, scaleLinear, axisLeft, axisBottom, line as d3Line, curveMonotoneX, max } from 'd3';
import { useChartDimensions } from '../../hooks/useChartDimensions';
import { ChartProps, formatValue } from './types';

export const CumulativeChart: React.FC<ChartProps & { series: { label: string, data: { day: number, value: number }[], color: string, dashed?: boolean }[] }> = ({ series, height = 300, isPrivateMode }) => {
  const { ref, width } = useChartDimensions();

  useEffect(() => {
    if (!width || series.length === 0) return;
    const svg = select(ref.current).select('svg');
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 30, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = scaleLinear().domain([1, 31]).range([0, chartWidth]);
    const maxVal = max(series, s => max(s.data, d => d.value)) || 0;
    const y = scaleLinear().domain([0, maxVal]).nice().range([chartHeight, 0]);

    g.append("g").attr("class", "grid").call(axisLeft(y).ticks(5).tickSize(-chartWidth).tickFormat(() => "")).selectAll("line").attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3,3");

    const line = d3Line<{ day: number, value: number }>()
      .x(d => x(d.day))
      .y(d => y(d.value))
      .curve(curveMonotoneX);

    const tooltip = select(ref.current).select(".tooltip");

    series.forEach(s => {
       g.append("path")
        .datum(s.data)
        .attr("fill", "none")
        .attr("stroke", s.color)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", s.dashed ? "4,4" : "0")
        .attr("d", line);

       g.selectAll(`.dot-${s.label.replace(/\s/g, '')}`)
        .data(s.data)
        .enter().append("circle")
        .attr("cx", d => x(d.day))
        .attr("cy", d => y(d.value))
        .attr("r", 3)
        .attr("fill", s.color)
        .attr("opacity", 0) 
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

    g.append("g").attr("transform", `translate(0,${chartHeight})`).call(axisBottom(x).ticks(10)).select(".domain").remove();
    g.append("g").call(axisLeft(y).ticks(5).tickFormat((d: any) => isPrivateMode ? '' : `${d}`)).select(".domain").remove();

  }, [series, width, height, isPrivateMode]);

  return (
    <div ref={ref} className="relative w-full">
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
