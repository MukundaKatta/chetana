"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface SlopeItem {
  /** Label for the data point. */
  label: string;
  /** Value at the "before" point. */
  before: number;
  /** Value at the "after" point. */
  after: number;
  /** Optional category. */
  category?: string;
}

export interface SlopeChartProps {
  items: SlopeItem[];
  /** Chart width (default 500). */
  width?: number;
  /** Chart height (default 400). */
  height?: number;
  /** Label for the left axis (default "Before"). */
  beforeLabel?: string;
  /** Label for the right axis (default "After"). */
  afterLabel?: string;
  /** Color for improvement lines (default "#22c55e"). */
  improveColor?: string;
  /** Color for decline lines (default "#ef4444"). */
  declineColor?: string;
  /** Color for no-change lines (default "#94a3b8"). */
  neutralColor?: string;
  /** Number of largest movers to highlight (default 3). */
  highlightCount?: number;
  /** Whether to animate (default true). */
  animated?: boolean;
  className?: string;
}

interface TooltipData {
  x: number;
  y: number;
  item: SlopeItem;
  delta: number;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function SlopeChart({
  items,
  width = 500,
  height = 400,
  beforeLabel = "Before",
  afterLabel = "After",
  improveColor = "#22c55e",
  declineColor = "#ef4444",
  neutralColor = "#94a3b8",
  highlightCount = 3,
  animated = true,
  className,
}: SlopeChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  const margin = { top: 40, right: 120, bottom: 30, left: 120 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  // Compute range
  const allValues = useMemo(
    () => items.flatMap((i) => [i.before, i.after]),
    [items],
  );
  const minVal = useMemo(
    () => Math.min(...allValues, 0),
    [allValues],
  );
  const maxVal = useMemo(
    () => Math.max(...allValues, 1),
    [allValues],
  );

  const yScale = (value: number): number => {
    const range = maxVal - minVal || 1;
    return margin.top + innerH - ((value - minVal) / range) * innerH;
  };

  const leftX = margin.left;
  const rightX = margin.left + innerW;

  // Compute deltas and find largest movers
  const itemsWithDelta = useMemo(() => {
    return items.map((item) => ({
      ...item,
      delta: item.after - item.before,
      absDelta: Math.abs(item.after - item.before),
    }));
  }, [items]);

  const largestMovers = useMemo(() => {
    return [...itemsWithDelta]
      .sort((a, b) => b.absDelta - a.absDelta)
      .slice(0, highlightCount)
      .map((i) => i.label);
  }, [itemsWithDelta, highlightCount]);

  const getLineColor = (delta: number): string => {
    if (delta > 0.001) return improveColor;
    if (delta < -0.001) return declineColor;
    return neutralColor;
  };

  // Y-axis ticks
  const tickCount = 5;
  const ticks = useMemo(() => {
    const range = maxVal - minVal || 1;
    return Array.from({ length: tickCount + 1 }, (_, i) => {
      const value = minVal + (range * i) / tickCount;
      return { value, y: yScale(value) };
    });
  }, [minVal, maxVal, tickCount]);

  return (
    <div className={cn("relative inline-block", className)}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Slope chart comparing before and after values"
      >
        {/* Grid lines */}
        {ticks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={leftX}
              y1={tick.y}
              x2={rightX}
              y2={tick.y}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeWidth={1}
            />
            <text
              x={leftX - 8}
              y={tick.y}
              textAnchor="end"
              dominantBaseline="central"
              fontSize={10}
              fill="currentColor"
              fillOpacity={0.4}
            >
              {tick.value.toFixed(2)}
            </text>
          </g>
        ))}

        {/* Axis lines */}
        <line
          x1={leftX}
          y1={margin.top}
          x2={leftX}
          y2={margin.top + innerH}
          stroke="currentColor"
          strokeOpacity={0.3}
          strokeWidth={1.5}
        />
        <line
          x1={rightX}
          y1={margin.top}
          x2={rightX}
          y2={margin.top + innerH}
          stroke="currentColor"
          strokeOpacity={0.3}
          strokeWidth={1.5}
        />

        {/* Axis labels */}
        <text
          x={leftX}
          y={margin.top - 16}
          textAnchor="middle"
          fontSize={13}
          fontWeight={600}
          fill="currentColor"
        >
          {beforeLabel}
        </text>
        <text
          x={rightX}
          y={margin.top - 16}
          textAnchor="middle"
          fontSize={13}
          fontWeight={600}
          fill="currentColor"
        >
          {afterLabel}
        </text>

        {/* Slope lines */}
        {itemsWithDelta.map((item) => {
          const y1 = yScale(item.before);
          const y2 = yScale(item.after);
          const color = getLineColor(item.delta);
          const isHighlighted = largestMovers.includes(item.label);
          const isHovered = hoveredLabel === item.label;
          const isActive = isHighlighted || isHovered;

          return (
            <g
              key={item.label}
              style={{
                opacity: hoveredLabel
                  ? isHovered
                    ? 1
                    : 0.15
                  : isHighlighted
                    ? 1
                    : 0.5,
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => {
                setHoveredLabel(item.label);
                const rect = (e.target as SVGElement)
                  .closest("svg")
                  ?.getBoundingClientRect();
                if (rect) {
                  setTooltip({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                    item,
                    delta: item.delta,
                  });
                }
              }}
              onMouseLeave={() => {
                setHoveredLabel(null);
                setTooltip(null);
              }}
            >
              {/* Connecting line */}
              <line
                x1={leftX}
                y1={y1}
                x2={rightX}
                y2={y2}
                stroke={color}
                strokeWidth={isActive ? 2.5 : 1.5}
                style={{
                  cursor: "pointer",
                  transition: animated
                    ? "stroke-width 0.2s"
                    : undefined,
                }}
              />

              {/* Before point */}
              <circle
                cx={leftX}
                cy={y1}
                r={isActive ? 5 : 3.5}
                fill={color}
                stroke="white"
                strokeWidth={1.5}
                style={{ cursor: "pointer" }}
              />

              {/* After point */}
              <circle
                cx={rightX}
                cy={y2}
                r={isActive ? 5 : 3.5}
                fill={color}
                stroke="white"
                strokeWidth={1.5}
                style={{ cursor: "pointer" }}
              />

              {/* Labels */}
              <text
                x={leftX - 8}
                y={y1}
                textAnchor="end"
                dominantBaseline="central"
                fontSize={isActive ? 12 : 10}
                fontWeight={isActive ? 600 : 400}
                fill="currentColor"
              >
                {item.label}
              </text>
              <text
                x={rightX + 8}
                y={y2}
                textAnchor="start"
                dominantBaseline="central"
                fontSize={isActive ? 12 : 10}
                fontWeight={isActive ? 600 : 400}
                fill="currentColor"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-10 rounded-md border bg-popover px-3 py-2 text-sm shadow-md pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          <div className="font-semibold">{tooltip.item.label}</div>
          <div className="text-muted-foreground">
            {beforeLabel}: {tooltip.item.before.toFixed(3)}
          </div>
          <div className="text-muted-foreground">
            {afterLabel}: {tooltip.item.after.toFixed(3)}
          </div>
          <div
            className="font-medium"
            style={{
              color: getLineColor(tooltip.delta),
            }}
          >
            {tooltip.delta > 0 ? "+" : ""}
            {tooltip.delta.toFixed(3)} (
            {tooltip.item.before > 0
              ? `${((tooltip.delta / tooltip.item.before) * 100).toFixed(1)}%`
              : "N/A"}
            )
          </div>
        </div>
      )}
    </div>
  );
}
