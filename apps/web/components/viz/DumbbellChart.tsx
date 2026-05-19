"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface DumbbellItem {
  /** Label for the data point (e.g. theory, indicator). */
  label: string;
  /** First value (e.g. before, model A). */
  start: number;
  /** Second value (e.g. after, model B). */
  end: number;
  /** Optional category for grouping. */
  category?: string;
}

export type DumbbellSortBy = "delta" | "start" | "end" | "label" | "none";

export interface DumbbellChartProps {
  items: DumbbellItem[];
  /** Chart width in pixels (default 600). */
  width?: number;
  /** Per-row height in pixels (default 36). */
  rowHeight?: number;
  /** Sort by (default "delta"). */
  sortBy?: DumbbellSortBy;
  /** Sort descending (default true). */
  sortDesc?: boolean;
  /** Label for the start point (default "Before"). */
  startLabel?: string;
  /** Label for the end point (default "After"). */
  endLabel?: string;
  /** Color for the start endpoint (default "#3b82f6"). */
  startColor?: string;
  /** Color for the end endpoint (default "#22c55e"). */
  endColor?: string;
  /** Color for the connector when improvement (default gradient). */
  improveColor?: string;
  /** Color for the connector when decline (default gradient). */
  declineColor?: string;
  /** Endpoint circle radius (default 6). */
  circleRadius?: number;
  className?: string;
}

interface TooltipData {
  x: number;
  y: number;
  item: DumbbellItem;
  delta: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function interpolateColor(
  startColor: string,
  endColor: string,
  fraction: number,
): string {
  // Simple hex-to-rgb interpolation
  const parse = (hex: string) => {
    const c = hex.replace("#", "");
    return [
      parseInt(c.slice(0, 2), 16),
      parseInt(c.slice(2, 4), 16),
      parseInt(c.slice(4, 6), 16),
    ];
  };
  const a = parse(startColor);
  const b = parse(endColor);
  const lerp = (s: number, e: number) => Math.round(s + (e - s) * fraction);
  return `rgb(${lerp(a[0], b[0])}, ${lerp(a[1], b[1])}, ${lerp(a[2], b[2])})`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function DumbbellChart({
  items,
  width = 600,
  rowHeight = 36,
  sortBy = "delta",
  sortDesc = true,
  startLabel = "Before",
  endLabel = "After",
  startColor = "#3b82f6",
  endColor = "#22c55e",
  improveColor = "#22c55e",
  declineColor = "#ef4444",
  circleRadius = 6,
  className,
}: DumbbellChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  const margin = { top: 30, right: 60, bottom: 20, left: 140 };
  const innerW = width - margin.left - margin.right;

  // Sort items
  const sortedItems = useMemo(() => {
    const list = items.map((item) => ({
      ...item,
      delta: item.end - item.start,
    }));

    const dir = sortDesc ? -1 : 1;

    switch (sortBy) {
      case "delta":
        list.sort((a, b) => (Math.abs(a.delta) - Math.abs(b.delta)) * dir);
        break;
      case "start":
        list.sort((a, b) => (a.start - b.start) * dir);
        break;
      case "end":
        list.sort((a, b) => (a.end - b.end) * dir);
        break;
      case "label":
        list.sort((a, b) => a.label.localeCompare(b.label) * dir);
        break;
      default:
        break;
    }

    return list;
  }, [items, sortBy, sortDesc]);

  // Compute value range
  const allValues = useMemo(
    () => sortedItems.flatMap((i) => [i.start, i.end]),
    [sortedItems],
  );
  const minVal = useMemo(
    () => Math.min(...allValues, 0),
    [allValues],
  );
  const maxVal = useMemo(
    () => Math.max(...allValues, 1),
    [allValues],
  );
  const range = maxVal - minVal || 1;

  const xScale = (value: number): number =>
    margin.left + ((value - minVal) / range) * innerW;

  // Detect categories
  const categories = useMemo(
    () => [...new Set(sortedItems.map((i) => i.category).filter(Boolean))] as string[],
    [sortedItems],
  );

  // Build row positions with category headers
  const rows = useMemo(() => {
    const result: Array<{
      item: (typeof sortedItems)[0];
      y: number;
    }> = [];
    let currentY = margin.top;
    let lastCategory: string | undefined;

    for (const item of sortedItems) {
      if (categories.length > 0 && item.category && item.category !== lastCategory) {
        currentY += 24; // Category header space
        lastCategory = item.category;
      }
      result.push({ item, y: currentY + rowHeight / 2 });
      currentY += rowHeight;
    }
    return result;
  }, [sortedItems, categories, margin.top, rowHeight]);

  const totalH =
    margin.top +
    margin.bottom +
    sortedItems.length * rowHeight +
    categories.length * 24;

  // Tick marks
  const ticks = useMemo(() => {
    const count = 5;
    return Array.from({ length: count + 1 }, (_, i) => {
      const value = minVal + (range * i) / count;
      return { value, x: xScale(value) };
    });
  }, [minVal, range]);

  // Gradient IDs
  const improveGradientId = "dumbbell-improve-gradient";
  const declineGradientId = "dumbbell-decline-gradient";

  return (
    <div className={cn("relative inline-block", className)}>
      <svg
        width={width}
        height={totalH}
        viewBox={`0 0 ${width} ${totalH}`}
        role="img"
        aria-label="Dumbbell chart comparing two values"
      >
        <defs>
          <linearGradient id={improveGradientId}>
            <stop offset="0%" stopColor={startColor} />
            <stop offset="100%" stopColor={improveColor} />
          </linearGradient>
          <linearGradient id={declineGradientId}>
            <stop offset="0%" stopColor={startColor} />
            <stop offset="100%" stopColor={declineColor} />
          </linearGradient>
        </defs>

        {/* Grid lines and tick labels */}
        {ticks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={tick.x}
              y1={margin.top}
              x2={tick.x}
              y2={totalH - margin.bottom}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeWidth={1}
            />
            <text
              x={tick.x}
              y={margin.top - 10}
              textAnchor="middle"
              fontSize={10}
              fill="currentColor"
              fillOpacity={0.4}
            >
              {tick.value.toFixed(2)}
            </text>
          </g>
        ))}

        {/* Column labels */}
        <text
          x={margin.left - 8}
          y={margin.top - 10}
          textAnchor="end"
          fontSize={11}
          fontWeight={600}
          fill="currentColor"
          fillOpacity={0.5}
        >
          {startLabel} / {endLabel}
        </text>

        {/* Category headers */}
        {(() => {
          let currentY = margin.top;
          let lastCategory: string | undefined;
          const headers: JSX.Element[] = [];

          for (const item of sortedItems) {
            if (categories.length > 0 && item.category && item.category !== lastCategory) {
              headers.push(
                <text
                  key={`cat-${item.category}`}
                  x={margin.left}
                  y={currentY + 16}
                  fontSize={11}
                  fontWeight={600}
                  fill="currentColor"
                  fillOpacity={0.7}
                >
                  {item.category}
                </text>,
              );
              currentY += 24;
              lastCategory = item.category;
            }
            currentY += rowHeight;
          }
          return headers;
        })()}

        {/* Dumbbell items */}
        {rows.map(({ item, y }, index) => {
          const x1 = xScale(item.start);
          const x2 = xScale(item.end);
          const isImprovement = item.delta >= 0;
          const isHovered = hoveredLabel === item.label;

          return (
            <g
              key={`${item.label}-${index}`}
              style={{
                opacity: hoveredLabel
                  ? isHovered
                    ? 1
                    : 0.25
                  : 1,
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
              onMouseMove={(e) => {
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
              {/* Row label */}
              <text
                x={margin.left - 8}
                y={y}
                textAnchor="end"
                dominantBaseline="central"
                fontSize={12}
                fontWeight={isHovered ? 600 : 400}
                fill="currentColor"
              >
                {item.label}
              </text>

              {/* Connector line with gradient */}
              <line
                x1={x1}
                y1={y}
                x2={x2}
                y2={y}
                stroke={`url(#${isImprovement ? improveGradientId : declineGradientId})`}
                strokeWidth={isHovered ? 3 : 2}
                style={{ cursor: "pointer" }}
              />

              {/* Start endpoint */}
              <circle
                cx={x1}
                cy={y}
                r={isHovered ? circleRadius + 1 : circleRadius}
                fill={startColor}
                stroke="white"
                strokeWidth={1.5}
                style={{ cursor: "pointer" }}
              />

              {/* End endpoint */}
              <circle
                cx={x2}
                cy={y}
                r={isHovered ? circleRadius + 1 : circleRadius}
                fill={isImprovement ? improveColor : declineColor}
                stroke="white"
                strokeWidth={1.5}
                style={{ cursor: "pointer" }}
              />

              {/* Delta label */}
              <text
                x={Math.max(x1, x2) + circleRadius + 6}
                y={y}
                dominantBaseline="central"
                fontSize={10}
                fontWeight={500}
                fill={isImprovement ? improveColor : declineColor}
              >
                {item.delta > 0 ? "+" : ""}
                {item.delta.toFixed(3)}
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
            {startLabel}: {tooltip.item.start.toFixed(4)}
          </div>
          <div className="text-muted-foreground">
            {endLabel}: {tooltip.item.end.toFixed(4)}
          </div>
          <div
            className="font-medium"
            style={{
              color: tooltip.delta >= 0 ? improveColor : declineColor,
            }}
          >
            Delta: {tooltip.delta > 0 ? "+" : ""}
            {tooltip.delta.toFixed(4)}
          </div>
          {tooltip.item.category && (
            <div className="text-muted-foreground text-xs">
              {tooltip.item.category}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: startColor }}
          />
          <span>{startLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: endColor }}
          />
          <span>{endLabel} (improvement)</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: declineColor }}
          />
          <span>{endLabel} (decline)</span>
        </div>
      </div>
    </div>
  );
}
