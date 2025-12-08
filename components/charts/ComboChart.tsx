
import React, { useEffect } from 'react';
import * as d3 from 'd3';
import { useChartDimensions } from '../../hooks/useChartDimensions';
import { ChartProps, formatValue } from './types';

export const ComboChart: React.FC<ChartProps> = ({ 
    data, 
    height = 350, 
    isPrivateMode,
    showSurplusLine = true,
    showSavingsRateLine = true,
    isDarkMode
}) => {
  const { ref, width } = useChartDimensions();

  useEffect(() => {
    if (!width || !data || !data.length) return;
    const svg = d3.select(ref.current).select('svg');
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 50, bottom: 30, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Colors
    const gridColor = isDarkMode ? "#334155" : "#e2e8f0";
    const textColor = isDarkMode ? "#94a3b8" : "#64748b";
    const zeroLineColor = isDarkMode ? "#64748b" : "#94a3b8";
    const tooltipBg = isDarkMode ? "#1e293b" : "#fff";
    const tooltipBorder = isDarkMode ? "#334155" : "#e2e8f0";
    const tooltipText = isDarkMode ? "#f8fafc" : "#1e293b";

    const x = d3.scaleBand().domain(data.map(d => String(d.name))).range([0, chartWidth]).padding(0.3);
    
    // Calculate Left Axis Domain (Currency)
    const maxBarValue = d3.max(data, d => Math.max(d.income, d.expense)) || 0;
    
    let domainMin = 0;
    let domainMax = maxBarValue;

    if (showSurplusLine) {
        const minSurplus = d3.min(data, d => d.income - d.expense) || 0;
        const maxSurplus = d3.max(data, d => d.income - d.expense) || 0;
        // Extend domain to include surplus/deficit line
        domainMin = Math.min(0, minSurplus);
        domainMax = Math.max(domainMax, maxSurplus);
    }
    
    // Add 10% padding to top/bottom for visuals
    domainMax = domainMax * 1.1;
    if (domainMin < 0) domainMin = domainMin * 1.1;

    const yLeft = d3.scaleLinear().domain([domainMin, domainMax]).range([chartHeight, 0]);

    // Calculate Right Axis Domain (%) - MUST ALIGN ZERO WITH LEFT AXIS
    const maxRateData = d3.max(data, d => d.savingsRate) || 0;
    const yRightMaxBase = Math.max(100, maxRateData * 1.2); // At least 100%, or more if data higher

    let yRightMin = 0;
    let yRightMax = yRightMaxBase;

    // Logic to align Zeros:
    // Ratio of negative space to positive space must be identical for both axes.
    // LeftRatio = |Min| / Max
    // RightRatio must = LeftRatio
    // RightMin = - (RightMax * LeftRatio)
    
    if (domainMax > 0 && domainMin < 0) {
        const ratio = Math.abs(domainMin) / domainMax;
        yRightMin = - (yRightMaxBase * ratio);
    } else if (domainMax === 0 && domainMin < 0) {
        // Pure deficit scenario - align tops
        yRightMax = 0;
        yRightMin = -100;
    }

    const yRight = d3.scaleLinear().domain([yRightMin, yRightMax]).range([chartHeight, 0]);

    // Draw Grid (aligned to Left Axis)
    g.append("g").attr("class", "grid")
     .call(d3.axisLeft(yLeft).ticks(5).tickSize(-chartWidth).tickFormat(() => ""))
     .selectAll("line").attr("stroke", gridColor).attr("stroke-dasharray", "3,3");

    const tooltip = d3.select(ref.current).select(".tooltip");
    tooltip.style("background-color", tooltipBg).style("border-color", tooltipBorder).style("color", tooltipText);
    
    // Draw Zero Line
    const zeroY = yLeft(0);
    g.append("line")
        .attr("x1", 0).attr("x2", chartWidth)
        .attr("y1", zeroY).attr("y2", zeroY)
        .attr("stroke", zeroLineColor)
        .attr("stroke-width", 1);

    const xSub = d3.scaleBand().domain(['inc', 'exp']).range([0, x.bandwidth()]).padding(0.05);

    // Bars
    g.selectAll(".bar-inc")
      .data(data)
      .enter().append("rect")
      .attr("x", d => (x(String(d.name)) || 0) + (xSub('inc') || 0))
      .attr("y", d => yLeft(Math.max(0, d.income)))
      .attr("width", xSub.bandwidth())
      .attr("height", d => Math.abs(yLeft(0) - yLeft(d.income)))
      .attr("fill", "#10b981") // Emerald-500
      .attr("rx", 2);

    g.selectAll(".bar-exp")
      .data(data)
      .enter().append("rect")
      .attr("x", d => (x(String(d.name)) || 0) + (xSub('exp') || 0))
      .attr("y", d => yLeft(Math.max(0, d.expense)))
      .attr("width", xSub.bandwidth())
      .attr("height", d => Math.abs(yLeft(0) - yLeft(d.expense)))
      .attr("fill", "#ef4444") // Red-500
      .attr("rx", 2);

    // Lines
    if (showSavingsRateLine) {
        const lineRate = d3.line<any>()
            .x(d => (x(String(d.name)) || 0) + x.bandwidth() / 2)
            .y(d => yRight(d.savingsRate)) // Allow negative rates if math suggests, though usually >=0
            .curve(d3.curveMonotoneX);
            
        g.append("path").datum(data).attr("fill", "none").attr("stroke", "#6366f1").attr("stroke-width", 2).attr("d", lineRate);
        g.selectAll(".dot-rate").data(data).enter().append("circle")
            .attr("cx", d => (x(String(d.name)) || 0) + x.bandwidth() / 2)
            .attr("cy", d => yRight(d.savingsRate))
            .attr("r", 3).attr("fill", "#6366f1").attr("stroke", isDarkMode ? "#1e293b" : "#fff").attr("stroke-width", 1.5);
    }

    if (showSurplusLine) {
        const lineBalance = d3.line<any>()
            .x(d => (x(String(d.name)) || 0) + x.bandwidth() / 2)
            .y(d => yLeft(d.income - d.expense))
            .curve(d3.curveMonotoneX);
            
        g.append("path").datum(data).attr("fill", "none").attr("stroke", "#0ea5e9").attr("stroke-width", 2).attr("stroke-dasharray", "4,2").attr("d", lineBalance);
        g.selectAll(".dot-balance").data(data).enter().append("circle")
            .attr("cx", d => (x(String(d.name)) || 0) + x.bandwidth() / 2)
            .attr("cy", d => yLeft(d.income - d.expense))
            .attr("r", 3).attr("fill", "#0ea5e9").attr("stroke", isDarkMode ? "#1e293b" : "#fff").attr("stroke-width", 1.5);
    }

    // Axes
    const maxLabels = Math.floor(chartWidth / 50);
    const interval = Math.ceil(data.length / maxLabels);
    const tickValues = data.map(d => String(d.name)).filter((_, i) => i % interval === 0);

    const xAxis = g.append("g").attr("transform", `translate(0,${chartHeight})`)
        .call(d3.axisBottom(x).tickValues(tickValues).tickSize(0));
    xAxis.select(".domain").remove();
    xAxis.selectAll("text").attr("fill", textColor).attr("dy", "1em");
    
    const yLeftAxis = g.append("g").call(d3.axisLeft(yLeft).ticks(5).tickFormat((d: any) => isPrivateMode ? '' : `${d}`));
    yLeftAxis.select(".domain").remove();
    yLeftAxis.selectAll("text").attr("fill", textColor);
    yLeftAxis.selectAll("line").attr("stroke", gridColor);
    
    if (showSavingsRateLine) {
        const yRightAxis = g.append("g").attr("transform", `translate(${chartWidth},0)`).call(d3.axisRight(yRight).ticks(5).tickFormat(d => `${d}%`));
        yRightAxis.select(".domain").remove();
        yRightAxis.selectAll("text").attr("fill", textColor);
        yRightAxis.selectAll("line").attr("stroke", gridColor);
    }

    // Interactive Overlay
    const guideLine = g.append("line")
       .attr("stroke", gridColor)
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
             <div class="mb-2 border-b border-slate-100 dark:border-slate-700 pb-1"><strong>${d.name}</strong></div>
             <div class="grid grid-cols-2 gap-x-4 gap-y-1">
                <span class="text-slate-500 dark:text-slate-400">Przychód:</span> <span class="text-emerald-600 dark:text-emerald-400 font-medium text-right">${formatValue(d.income, isPrivateMode)}</span>
                <span class="text-slate-500 dark:text-slate-400">Wydatek:</span> <span class="text-red-500 dark:text-red-400 font-medium text-right">${formatValue(d.expense, isPrivateMode)}</span>`;
           
           if (showSurplusLine) {
               htmlContent += `
                <span class="text-slate-500 dark:text-slate-400">Nadwyżka:</span> <span class="${surplus >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'} font-medium text-right">${formatValue(surplus, isPrivateMode)}</span>`;
           }
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

  }, [data, width, height, isPrivateMode, showSurplusLine, showSavingsRateLine, isDarkMode]);

  return (
    <div ref={ref} className="relative w-full">
      <svg width="100%" height={height} className="overflow-visible" />
      <div className="tooltip fixed opacity-0 bg-white p-3 border border-slate-200 shadow-xl rounded-lg text-xs pointer-events-none transition-opacity z-50 min-w-[180px]" />
      <div className="flex flex-wrap gap-4 mt-2 justify-center">
         {showSurplusLine && <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#0ea5e9]"></div><span className="text-[10px] text-slate-500 dark:text-slate-400">Nadwyżka (Linia)</span></div>}
         <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-500"></div><span className="text-[10px] text-slate-500 dark:text-slate-400">Przychód</span></div>
         <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-500"></div><span className="text-[10px] text-slate-500 dark:text-slate-400">Wydatek</span></div>
         {showSavingsRateLine && <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-indigo-500"></div><span className="text-[10px] text-slate-500 dark:text-slate-400">Stopa oszcz. (%)</span></div>}
      </div>
    </div>
  );
};
