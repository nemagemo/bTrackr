
import React, { useEffect } from 'react';
import * as d3 from 'd3';
import { useChartDimensions } from '../../hooks/useChartDimensions';
import { ChartProps, formatValue } from './types';

export const DifferenceChart: React.FC<ChartProps> = ({ 
    data, 
    height = 350, 
    isPrivateMode,
    showSavingsRateLine = true,
    isDarkMode
}) => {
  const { ref, width } = useChartDimensions();

  useEffect(() => {
    if (!width || !data || !data.length) return;
    const svg = d3.select(ref.current).select('svg');
    svg.selectAll("*").remove();

    const margin = { top: 30, right: 50, bottom: 30, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const gridColor = isDarkMode ? "#334155" : "#e2e8f0";
    const textColor = isDarkMode ? "#94a3b8" : "#64748b";
    const zeroLineColor = isDarkMode ? "#94a3b8" : "#64748b";
    const tooltipBg = isDarkMode ? "#1e293b" : "#fff";
    const tooltipBorder = isDarkMode ? "#334155" : "#e2e8f0";
    const tooltipText = isDarkMode ? "#f8fafc" : "#1e293b";

    // Prepare Data
    const processedData = data.map(d => ({
        ...d,
        balance: d.income - d.expense
    }));

    // X Scale
    const x = d3.scaleBand()
        .domain(data.map(d => String(d.name)))
        .range([0, chartWidth])
        .padding(0.8); // High padding for thin lollipop stems logic (though we draw lines manually)

    // Y Scale (Currency)
    const minBalance = d3.min(processedData, d => d.balance) || 0;
    const maxBalance = d3.max(processedData, d => d.balance) || 0;

    // Pad domain nicely so dots don't get cut off
    let yDomain = [Math.min(0, minBalance), Math.max(0, maxBalance)];
    const spread = yDomain[1] - yDomain[0];
    if (spread === 0) {
        yDomain = [-100, 100];
    } else {
        yDomain[0] = yDomain[0] < 0 ? yDomain[0] - spread * 0.15 : 0; // 15% padding
        yDomain[1] = yDomain[1] > 0 ? yDomain[1] + spread * 0.15 : 0;
    }

    const y = d3.scaleLinear().domain(yDomain).range([chartHeight, 0]);

    // Draw Grid
    g.append("g").attr("class", "grid")
     .call(d3.axisLeft(y).ticks(5).tickSize(-chartWidth).tickFormat(() => ""))
     .selectAll("line").attr("stroke", gridColor).attr("stroke-dasharray", "3,3");

    // Draw Zero Line (Solid axis)
    g.append("line")
        .attr("x1", 0).attr("x2", chartWidth)
        .attr("y1", y(0)).attr("y2", y(0))
        .attr("stroke", zeroLineColor)
        .attr("stroke-width", 1);

    const tooltip = d3.select(ref.current).select(".tooltip");
    tooltip.style("background-color", tooltipBg).style("border-color", tooltipBorder).style("color", tooltipText);

    // --- LOLLIPOP STEMS ---
    g.selectAll(".stem")
      .data(processedData)
      .enter().append("line")
      .attr("x1", d => (x(String(d.name)) || 0) + x.bandwidth() / 2)
      .attr("x2", d => (x(String(d.name)) || 0) + x.bandwidth() / 2)
      .attr("y1", y(0))
      .attr("y2", d => y(d.balance))
      .attr("stroke", d => d.balance >= 0 ? "#10b981" : "#ef4444")
      .attr("stroke-width", 2)
      .attr("opacity", 0.8);

    // --- LOLLIPOP HEADS (Dots) ---
    g.selectAll(".head")
      .data(processedData)
      .enter().append("circle")
      .attr("cx", d => (x(String(d.name)) || 0) + x.bandwidth() / 2)
      .attr("cy", d => y(d.balance))
      .attr("r", 5)
      .attr("fill", d => d.balance >= 0 ? "#10b981" : "#ef4444")
      .attr("stroke", isDarkMode ? "#0f172a" : "#fff") // Contrast border
      .attr("stroke-width", 2)
      .attr("class", "head")
      // Hover effects handled by overlay, but nice to have here too
      .on("mouseenter", function() { d3.select(this).attr("r", 7); })
      .on("mouseleave", function() { d3.select(this).attr("r", 5); });


    // --- RIGHT AXIS (Savings Rate) ---
    if (showSavingsRateLine) {
        const maxRate = d3.max(data, d => d.savingsRate) || 0;
        const yRightMaxBase = Math.max(100, maxRate * 1.2);
        
        let yRightMin = 0;
        let yRightMax = yRightMaxBase;

        if (yDomain[1] > 0 && yDomain[0] < 0) {
            const ratio = Math.abs(yDomain[0]) / yDomain[1];
            yRightMin = - (yRightMaxBase * ratio);
        } else if (yDomain[1] === 0 && yDomain[0] < 0) {
            yRightMax = 0;
            yRightMin = -100;
        }

        const yRight = d3.scaleLinear().domain([yRightMin, yRightMax]).range([chartHeight, 0]);

        const lineRate = d3.line<any>()
            .x(d => (x(String(d.name)) || 0) + x.bandwidth() / 2)
            .y(d => yRight(d.savingsRate))
            .curve(d3.curveMonotoneX);
            
        g.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "#6366f1") // Indigo
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "4,3") 
            .attr("d", lineRate)
            .attr("opacity", 0.6); // Slightly subtle

        // Rate Dots
        g.selectAll(".dot-rate")
            .data(data)
            .enter().append("circle")
            .attr("cx", d => (x(String(d.name)) || 0) + x.bandwidth() / 2)
            .attr("cy", d => yRight(d.savingsRate))
            .attr("r", 3)
            .attr("fill", "#6366f1")
            .attr("stroke", isDarkMode ? "#1e293b" : "#fff")
            .attr("stroke-width", 1);

        // Right Axis
        const yRightAxis = g.append("g").attr("transform", `translate(${chartWidth},0)`).call(d3.axisRight(yRight).ticks(5).tickFormat(d => `${d}%`));
        yRightAxis.select(".domain").remove();
        yRightAxis.selectAll("text").attr("fill", textColor);
        yRightAxis.selectAll("line").attr("stroke", gridColor);
    }

    // --- AXES ---
    const maxLabels = Math.floor(chartWidth / 50);
    const interval = Math.ceil(data.length / maxLabels);
    const tickValues = data.map(d => String(d.name)).filter((_, i) => i % interval === 0);

    const xAxis = g.append("g").attr("transform", `translate(0,${chartHeight})`)
        .call(d3.axisBottom(x).tickValues(tickValues).tickSize(0));
    xAxis.select(".domain").remove();
    xAxis.selectAll("text").attr("fill", textColor).attr("dy", "1em");
    
    const yAxis = g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat((d: any) => isPrivateMode ? '' : `${d}`));
    yAxis.select(".domain").remove();
    yAxis.selectAll("text").attr("fill", textColor);
    yAxis.selectAll("line").attr("stroke", gridColor);

    // --- INTERACTION ---
    const guideLine = g.append("line")
       .attr("stroke", gridColor)
       .attr("stroke-width", 1)
       .attr("stroke-dasharray", "3,3")
       .attr("y1", 0).attr("y2", chartHeight)
       .style("opacity", 0);

    const overlayGroup = g.append("g").attr("class", "overlays");
    overlayGroup.selectAll(".overlay-rect")
       .data(processedData)
       .enter().append("rect")
       .attr("class", "overlay-rect")
       .attr("x", d => {
           // We need to cover the space between bands for smooth hovering
           const step = x.step();
           const center = (x(String(d.name)) || 0) + x.bandwidth() / 2;
           return center - step / 2;
       })
       .attr("y", 0)
       .attr("width", x.step())
       .attr("height", chartHeight)
       .attr("fill", "transparent")
       .on("mouseenter", (event, d) => {
           guideLine.style("opacity", 1);
           // Scale up the specific dot
           // NOTE: This simple selection relies on index matching or precise structure, 
           // simpler to just scale ALL matching data in small charts, or refine selectors.
           // For now, hover effect on dot is handled by dot's own mouseenter, 
           // but overlay allows triggering tooltip easily from empty space.
       })
       .on("mousemove", (event, d) => {
           const centerX = (x(String(d.name)) || 0) + x.bandwidth() / 2;
           guideLine.attr("x1", centerX).attr("x2", centerX);
           
           let htmlContent = `
             <div class="mb-2 border-b border-slate-100 dark:border-slate-700 pb-1"><strong>${d.name}</strong></div>
             <div class="grid grid-cols-2 gap-x-4 gap-y-1">
                <span class="text-slate-500 dark:text-slate-400">Nadwyżka:</span> 
                <span class="${d.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'} font-bold text-right">
                    ${formatValue(d.balance, isPrivateMode)}
                </span>
           `;
           if (showSavingsRateLine) {
               htmlContent += `
                <span class="text-slate-500 dark:text-slate-400">Oszczędność:</span> <span class="text-indigo-600 dark:text-indigo-400 font-medium text-right">${d.savingsRate.toFixed(1)}%</span>`;
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

  }, [data, width, height, isPrivateMode, showSavingsRateLine, isDarkMode]);

  return (
    <div ref={ref} className="relative w-full">
      <svg width="100%" height={height} className="overflow-visible" />
      <div className="tooltip fixed opacity-0 bg-white p-3 border border-slate-200 shadow-xl rounded-lg text-xs pointer-events-none transition-opacity z-50 min-w-[150px]" />
      <div className="flex flex-wrap gap-4 mt-2 justify-center">
         <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#10b981]"></div><span className="text-[10px] text-slate-500 dark:text-slate-400">Nadwyżka (+)</span></div>
         <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#ef4444]"></div><span className="text-[10px] text-slate-500 dark:text-slate-400">Deficyt (-)</span></div>
         {showSavingsRateLine && <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 border-t-2 border-dashed border-indigo-500"></div><span className="text-[10px] text-slate-500 dark:text-slate-400">Stopa oszcz. (%)</span></div>}
      </div>
    </div>
  );
};
