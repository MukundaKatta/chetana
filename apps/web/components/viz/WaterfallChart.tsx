"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface WaterfallSegment {
  id: string;
  label: string;
  value: number;
  probeId?: string;
  theory?: string;
  details?: string;
}

export interface WaterfallChartProps {
  segments: WaterfallSegment[];
  startValue?: number;
  showTotal?: boolean;
  totalLabel?: string;
  height?: number;
  className?: string;
  onSegmentClick?: (segment: WaterfallSegment) => void;
  sortBy?: "value" | "absolute" | "original";
}

interface ComputedBar {
  segment: WaterfallSegment;
  start: number;
  end: number;
  isPositive: boolean;
  runningTotal: number;
  barY: number;
  barHeight: number;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function WaterfallChart({
  segments,
  startValue = 0,
  showTotal = true,
  totalLabel = "Total",
  height = 400,
  className,
  onSegmentClick,
  sortBy = "original",
}: WaterfallChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const sortedSegments = useMemo(() => {
    const copy = [...segments];
    switch (sortBy) {
      case "value":
        return copy.sort((a, b) => b.value - a.value);
      case "absolute":
        return copy.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
      case "original":
      default:
        return copy;
    }
  }, [segments, sortBy]);

  // Compute bar positions
  const bars = useMemo((): ComputedBar[] => {
    let running = startValue;
    return sortedSegments.map((seg) => {
      const start = running;
      const end = running + seg.value;
      running = end;
      return {
        segment: seg,
        start,
        end,
        isPositive: seg.value >= 0,
        runningTotal: running,
        barY: 0,
        barHeight: 0,
      };
    });
  }, [sortedSegments, startValue]);

  const totalValue = bars.length > 0 ? bars[bars.length - 1].runningTotal : startValue;

  // Compute Y-axis scale
  const { minVal, maxVal, scaleY } = useMemo(() => {
    const allValues = [
      startValue,
      ...bars.map((b) => b.start),
      ...bars.map((b) => b.end),
      totalValue,
    ];
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1 || 0.5;
    const chartMin = min - padding;
    const chartMax = max + padding;
    const chartHeight = height - 80; // Leave room for labels

    const scale = (v: number): number => {
      const range = chartMax - chartMin;
      if (range === 0) return chartHeight / 2;
      return chartHeight - ((v - chartMin) / range) * chartHeight;
    };

    return { minVal: chartMin, maxVal: chartMax, scaleY: scale };
  }, [bars, startValue, totalValue, height]);

  const barWidth = 50;
  const barGap = 20;
  const totalBars = bars.length + (showTotal ? 1 : 0);
  const chartWidth = totalBars * (barWidth + barGap) + 60;
  const leftPadding = 60;
  const topPadding = 20;

  return (
    <div className={cn("overflow-x-auto", className)}>
      <svg
        width={chartWidth + leftPadding}
        height={height}
        viewBox={`0 0 ${chartWidth + leftPadding} ${height}`}
        className="overflow-visible"
      >
        {/* Zero line */}
        <line
          x1={leftPadding}
          y1={topPadding + scaleY(0)}
          x2={chartWidth + leftPadding}
          y2={topPadding + scaleY(0)}
          stroke="rgba(255,255,255,0.15)"
          strokeDasharray="4 4"
        />

        {/* Bars */}
        {bars.map((bar, i) => {
          const x = leftPadding + i * (barWidth + barGap) + barGap / 2;
          const y0 = topPadding + scaleY(bar.start);
          const y1 = topPadding + scaleY(bar.end);
          const barY = Math.min(y0, y1);
          const barH = Math.max(2, Math.abs(y1 - y0));
          const isHovered = hoveredId === bar.segment.id;

          const fill = bar.isPositive
            ? "rgba(34, 197, 94, 0.7)"
            : "rgba(239, 68, 68, 0.7)";
          const hoverFill = bar.isPositive
            ? "rgba(34, 197, 94, 0.95)"
            : "rgba(239, 68, 68, 0.95)";

          // Connector line to next bar
          const nextX = leftPadding + (i + 1) * (barWidth + barGap) + barGap / 2;
          const connectorY = topPadding + scaleY(bar.end);

          return (
            <g key={bar.segment.id}>
              {/* Connector line */}
              {i < bars.length - 1 && (
                <line
                  x1={x + barWidth}
                  y1={connectorY}
                  x2={nextX}
                  y2={connectorY}
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              )}

              {/* Bar */}
              <rect
                x={x}
                y={barY}
                width={barWidth}
                height={barH}
                fill={isHovered ? hoverFill : fill}
                rx={3}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHoveredId(bar.segment.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSegmentClick?.(bar.segment)}
              />

              {/* Value label */}
              <text
                x={x + barWidth / 2}
                y={barY - 6}
                textAnchor="middle"
                fill={bar.isPositive ? "rgba(34,197,94,0.9)" : "rgba(239,68,68,0.9)"}
                fontSize={10}
                fontWeight={600}
              >
                {bar.isPositive ? "+" : ""}
                {bar.segment.value.toFixed(2)}
              </text>

              {/* Label */}
              <text
                x={x + barWidth / 2}
                y={height - 8}
                textAnchor="middle"
                fill="rgba(255,255,255,0.5)"
                fontSize={9}
                className="select-none"
              >
                {bar.segment.label.length > 8
                  ? bar.segment.label.slice(0, 7) + "..."
                  : bar.segment.label}
              </text>

              {/* Hover tooltip */}
              {isHovered && bar.segment.details && (
                <foreignObject
                  x={x - 40}
                  y={barY - 60}
                  width={130}
                  height={50}
                >
                  <div className="rounded-md border border-white/10 bg-neutral-900/95 px-2 py-1.5 text-[10px] text-neutral-300 shadow-lg backdrop-blur-sm">
                    <div className="font-semibold">{bar.segment.label}</div>
                    <div className="text-neutral-500">{bar.segment.details}</div>
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}

        {/* Total bar */}
        {showTotal && (
          <g>
            {(() => {
              const x =
                leftPadding + bars.length * (barWidth + barGap) + barGap / 2;
              const y0 = topPadding + scaleY(0);
              const y1 = topPadding + scaleY(totalValue);
              const barY = Math.min(y0, y1);
              const barH = Math.max(2, Math.abs(y1 - y0));
              const isPositive = totalValue >= 0;
              const fill = isPositive
                ? "rgba(59, 130, 246, 0.7)"
                : "rgba(239, 68, 68, 0.7)";

              return (
                <>
                  {/* Connector from last bar */}
                  {bars.length > 0 && (
                    <line
                      x1={
                        leftPadding +
                        (bars.length - 1) * (barWidth + barGap) +
                        barGap / 2 +
                        barWidth
                      }
                      y1={topPadding + scaleY(totalValue)}
                      x2={x}
                      y2={topPadding + scaleY(totalValue)}
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                  )}
                  <rect x={x} y={barY} width={barWidth} height={barH} fill={fill} rx={3} />
                  <text
                    x={x + barWidth / 2}
                    y={barY - 6}
                    textAnchor="middle"
                    fill="rgba(59,130,246,0.9)"
                    fontSize={10}
                    fontWeight={700}
                  >
                    {totalValue.toFixed(2)}
                  </text>
                  <text
                    x={x + barWidth / 2}
                    y={height - 8}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.6)"
                    fontSize={9}
                    fontWeight={600}
                  >
                    {totalLabel}
                  </text>
                </>
              );
            })()}
          </g>
        )}
      </svg>
    </div>
  );
}
