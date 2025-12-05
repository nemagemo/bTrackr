
import React, { useEffect } from 'react';
import { select, scaleBand, scaleLinear, axisLeft, axisBottom, axisRight, line as d3Line, curveMonotoneX, max, min } from 'd3';
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
    const svg = select(ref.current).select('svg');
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 40, bottom: 30, left: 50 };
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
    
    const yLeft = scaleLinear().domain([domainMin, domainMax]).nice().range([chartHeight, 0]);

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
     .call(axisLeft(yLeft).ticks(5).tickSize(-chartWidth).tickFormat(() => ""))
     .selectAll("line").attr("stroke", gridColor).attr("stroke-dasharray", "3,3");

    const tooltip = select(ref.current).select(".tooltip");
    tooltip.style("background-color", tooltipBg).style("border-color", tooltipBorder).style("color", tooltipText);
    
    g.append("line").attr("x1", 0).attr("x2", chartWidth).attr("y1", yLeft(0)).attr("y2", yLeft(0)).attr("stroke", zeroLineColor).attr("stroke-width", 1);

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
        g.selectAll(".dot-rate").data(data).enter().append("circle").attr("cx", d => (x(String(d.name)) || 0) + x.bandwidth() / 2).attr("cy", d => yRight(Math.max(0, d.savingsRate))).attr("r", 3).attr("fill", "#6366f1").attr("stroke", isDarkMode ? "#1e293b" : "#fff").attr("stroke-width", 1.5);
    }

    if (showSurplusLine) {
        const lineBalance = d3Line<any>().x(d => (x(String(d.name)) || 0) + x.bandwidth() / 2).y(d => yLeft(d.income - d.expense)).curve(curveMonotoneX);
        g.append("path").datum(data).attr("fill", "none").attr("stroke", "#0ea5e9").attr("stroke-width", 2).attr("stroke-dasharray", "4,2").attr("d", lineBalance);
        g.selectAll(".dot-balance").data(data).enter().append("circle").attr("cx", d => (x(String(d.name)) || 0) + x.bandwidth() / 2).attr("cy", d => yLeft(d.income - d.expense)).attr("r", 3).attr("fill", "#0ea5e9").attr("stroke", isDarkMode ? "#1e293b" : "#fff").attr("stroke-width", 1.5);
    }

    const maxLabels = Math.floor(chartWidth / 50);
    const interval = Math.ceil(data.length / maxLabels);
    const tickValues = data.map(d => String(d.name)).filter((_, i) => i % interval === 0);

    const xAxis = g.append("g").attr("transform", `translate(0,${chartHeight})`)
        .call(axisBottom(x).tickValues(tickValues).tickSize(0));
    xAxis.select(".domain").remove();
    xAxis.selectAll("text").attr("fill", textColor);
    
    const yLeftAxis = g.append("g").call(axisLeft(yLeft).ticks(5).tickFormat((d: any) => isPrivateMode ? '' : `${d}`));
    yLeftAxis.select(".domain").remove();
    yLeftAxis.selectAll("text").attr("fill", textColor);
    yLeftAxis.selectAll("line").attr("stroke", gridColor);
    
    if (showSavingsRateLine) {
        const yRightAxis = g.append("g").attr("transform", `translate(${chartWidth},0)`).call(axisRight(yRight).ticks(5).tickFormat(d => `${d}%`));
        yRightAxis.select(".domain").remove();
        yRightAxis.selectAll("text").attr("fill", textColor);
        yRightAxis.selectAll("line").attr("stroke", gridColor);
    }

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
         {showSurplusLine && <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#bbf7d0] dark:bg-emerald-900/50"></div><span className="text-[10px] text-slate-500 dark:text-slate-400">Nadwyżka</span></div>}
         {showSurplusLine && <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#fecaca] dark:bg-red-900/50"></div><span className="text-[10px] text-slate-500 dark:text-slate-400">Deficyt</span></div>}
         <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-emerald-500"></div><span className="text-[10px] text-slate-500 dark:text-slate-400">Przychód</span></div>
         <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-red-500 border-dashed"></div><span className="text-[10px] text-slate-500 dark:text-slate-400">Wydatek</span></div>
         {showSavingsRateLine && <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-indigo-500"></div><span className="text-[10px] text-slate-500 dark:text-slate-400">Stopa oszcz. (%)</span></div>}
      </div>
    </div>
  );
};
