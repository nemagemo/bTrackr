
import React, { useEffect } from 'react';
import { select, scaleBand, scaleLinear, axisLeft, axisBottom, axisRight, line as d3Line, curveMonotoneX, max, min } from 'd3';
import { useChartDimensions } from '../../hooks/useChartDimensions';
import { ChartProps, formatValue } from './types';

export const DifferenceChart: React.FC<ChartProps> = ({ 
    data, 
    height = 350, 
    isPrivateMode,
    showSavingsRateLine = true
}) => {
  const { ref, width } = useChartDimensions();

  useEffect(() => {
    if (!width || !data || !data.length) return;
    const svg = select(ref.current).select('svg');
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 40, bottom: 30, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = scaleBand().domain(data.map(d => String(d.name))).range([0, chartWidth]).padding(0.3);
    
    const processedData = data.map(d => ({
        ...d,
        balance: d.income - d.expense
    }));

    const minBalance = min(processedData, d => d.balance) || 0;
    const maxBalance = max(processedData, d => d.balance) || 0;

    const yDomain = [Math.min(0, minBalance), Math.max(0, maxBalance)];
    const yPadding = (yDomain[1] - yDomain[0]) * 0.1;
    if (yPadding === 0 && yDomain[0] === 0 && yDomain[1] === 0) {
        yDomain[0] = -100;
        yDomain[1] = 100;
    } else {
        yDomain[0] -= yPadding;
        yDomain[1] += yPadding;
    }

    const y = scaleLinear().domain(yDomain).nice().range([chartHeight, 0]);

    const yRight = scaleLinear().domain([-50, 100]).range([chartHeight, 0]);
    const maxRate = max(data, d => d.savingsRate) || 0;
    const minRate = min(data, d => d.savingsRate) || 0;
    yRight.domain([Math.min(0, minRate), Math.max(100, maxRate)]).nice();

    g.append("g").attr("class", "grid")
     .call(axisLeft(y).ticks(5).tickSize(-chartWidth).tickFormat(() => "")).selectAll("line").attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3,3");

    g.append("line")
        .attr("x1", 0)
        .attr("x2", chartWidth)
        .attr("y1", y(0))
        .attr("y2", y(0))
        .attr("stroke", "#000")
        .attr("stroke-width", 1);

    const tooltip = select(ref.current).select(".tooltip");

    g.selectAll(".bar")
      .data(processedData)
      .enter().append("rect")
      .attr("x", d => x(String(d.name)) || 0)
      .attr("y", d => d.balance >= 0 ? y(d.balance) : y(0))
      .attr("width", x.bandwidth())
      .attr("height", d => Math.abs(y(d.balance) - y(0)))
      .attr("fill", d => d.balance >= 0 ? "#10b981" : "#ef4444")
      .attr("rx", 3);

    if (showSavingsRateLine) {
        const lineRate = d3Line<any>()
            .x(d => (x(String(d.name)) || 0) + x.bandwidth() / 2)
            .y(d => yRight(d.savingsRate))
            .curve(curveMonotoneX);
            
        g.append("path").datum(data).attr("fill", "none").attr("stroke", "#6366f1").attr("stroke-width", 2).attr("d", lineRate);
        g.selectAll(".dot-rate").data(data).enter().append("circle").attr("cx", d => (x(String(d.name)) || 0) + x.bandwidth() / 2).attr("cy", d => yRight(d.savingsRate)).attr("r", 3).attr("fill", "#6366f1").attr("stroke", "#fff").attr("stroke-width", 1.5);
    }

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
    <div ref={ref} className="relative w-full">
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
