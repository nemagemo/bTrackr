
import React, { useEffect } from 'react';
import { select, scaleBand, scaleLinear, axisLeft, axisBottom, max, min } from 'd3';
import { useChartDimensions } from '../../hooks/useChartDimensions';
import { ChartProps, formatValue } from './types';

export const WaterfallChart: React.FC<ChartProps> = ({ data, height = 350, isPrivateMode }) => {
  const { ref, width } = useChartDimensions();

  useEffect(() => {
    if (!width || !data || !data.length) return;
    const svg = select(ref.current).select('svg');
    svg.selectAll("*").remove();

    const margin = { top: 30, right: 30, bottom: 70, left: 60 }; 
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // --- WATERFALL CALCULATION LOGIC ---
    // Waterfall chart requires calculating 'start' and 'end' positions for each bar relative to a cumulative total.
    // 1. Income starts at previous cumulative and adds to it.
    // 2. Expense/Savings starts at previous cumulative and subtracts from it (goes down).
    // 3. Balance resets the start to 0 to show the final result.
    let cumulative = 0;
    const processedData = data.map((d, i) => {
        const start = cumulative;
        let end = cumulative;
        let val = d.value;

        if (d.type === 'income') {
            end += val;
        } else if (d.type === 'expense' || d.type === 'savings') {
            end -= val;
            val = -val; // Visual negative value
        } else if (d.type === 'balance') {
            // Balance bar spans from 0 to final cumulative
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

    const maxVal = max(processedData, d => Math.max(d.start, d.end)) || 0;
    const minVal = min(processedData, d => Math.min(d.start, d.end)) || 0;
    
    const y = scaleLinear()
      .domain([Math.min(0, minVal), Math.max(0, maxVal)])
      .nice()
      .range([chartHeight, 0]);

    g.append("g").attr("class", "grid").call(axisLeft(y).ticks(5).tickSize(-chartWidth).tickFormat(() => "")).selectAll("line").attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3,3");

    const tooltip = select(ref.current).select(".tooltip");

    g.selectAll(".bar")
      .data(processedData)
      .enter().append("rect")
      .attr("x", d => x(String(d.name)) || 0)
      .attr("y", d => y(Math.max(d.start, d.end)))
      .attr("width", x.bandwidth())
      .attr("height", d => Math.max(1, Math.abs(y(d.start) - y(d.end))))
      .attr("fill", d => {
          if (d.type === 'income') return '#22c55e';
          if (d.type === 'savings') return '#3b82f6';
          if (d.type === 'balance') return d.value >= 0 ? '#10b981' : '#334155';
          return '#ef4444';
      })
      .attr("fill-opacity", 0.6)
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

    g.selectAll(".label")
       .data(processedData)
       .enter().append("text")
       .text(d => formatValue(d.value, isPrivateMode))
       .attr("x", d => (x(String(d.name)) || 0) + x.bandwidth() / 2)
       .attr("y", d => y(Math.max(d.start, d.end)) - 5)
       .attr("text-anchor", "middle")
       .attr("font-size", "10px")
       .attr("fill", "#64748b");

    g.append("g").attr("transform", `translate(0,${chartHeight})`)
        .call(axisBottom(x).tickSize(0))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em");
        
    g.selectAll(".domain").remove();
    g.append("g").call(axisLeft(y).ticks(5).tickFormat((d: any) => isPrivateMode ? '' : `${d}`)).select(".domain").remove();

  }, [data, width, height, isPrivateMode]);

  return (
    <div ref={ref} className="relative w-full">
      <svg width="100%" height={height} className="overflow-visible" />
      <div className="tooltip fixed opacity-0 bg-white p-2 border border-slate-200 shadow-lg rounded text-xs pointer-events-none transition-opacity z-50" />
    </div>
  );
};
