"use client";

import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface LollipopItem {
  /** Label for the data point. */
  label: string;
  /** Numeric value (0-1 for scores). */
  value: number;
  /** Optional category for grouping. */
  category?: string;
}

export type SortDirection = "ascending" | "descending" | "none";

export interface LollipopChartProps {
  items: LollipopItem[];
  /** Chart width in pixels (default 600). */
  width?: number;
  /** Per-row height in pixels (default 36). */
  rowHeight?: number;
  /** Sort direction (default "descending"). */
  sort?: SortDirection;
  /** Whether to animate stagger entry (default true). */
  animated?: boolean;
  /** Stagger delay per item in ms (default 50). */
  staggerDelay?: number;
  /** Color for low values (default "#ef4444"). */
  lowColor?: string;
  /** Color for high values (default "#22c55e"). */
  highColor?: string;
  /** Circle radius (default 6). */
  circleRadius?: number;
  className?: string;
}

interface TooltipData {
  x: number;
  y: number;
  item: LollipopItem;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function interpolateColor(
  low: string,
  high: string,
  t: number,
): string {
  const parseHex = (hex: string) => {
    const c = hex.replace("#", "");
    return {
      r: parseInt(c.slice(0, 2), 16),
      g: parseInt(c.slice(2, 4), 16),
      b: parseInt(c.slice(4, 6), 16),
    };
  };

  const a = parseHex(low);
  const b = parseHex(high);
  const lerp = (s: number, e: number, f: number) =>
    Math.round(s + (e - s) * f);

  const r = lerp(a.r, b.r, t);
  const g = lerp(a.g, b.g, t);
  const bl = lerp(a.b, b.b, t);

  return `rgb(${r}, ${g}, ${bl})`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function LollipopChart({
  items,
  width = 600,
  rowHeight = 36,
  sort = "descending",
  animated = true,
  staggerDelay = 50,
  lowColor = "#ef4444",
  highColor = "#22c55e",
  circleRadius = 6,
  className,
}: LollipopChartProps) {
  const [visibleCount, setVisibleCount] = useState(animated ? 0 : items.length);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // Animate stagger entry
  useEffect(() => {
    if (!animated) {
      setVisibleCount(items.length);
      return;
    }

    setVisibleCount(0);
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setVisibleCount(count);
      if (count >= items.length) clearInterval(interval);
    }, staggerDelay);

    return () => clearInterval(interval);
  }, [items.length, animated, staggerDelay]);

  const margin = { top: 20, right: 30, bottom: 20, left: 140 };
  const innerW = width - margin.left - margin.right;

  // Sort items
  const sortedItems = useMemo(() => {
    const list = [...items];
    switch (sort) {
      case "ascending":
        list.sort((a, b) => a.value - b.value);
        break;
      case "descending":
        list.sort((a, b) => b.value - a.value);
        break;
      default:
        break;
    }
    return list;
  }, [items, sort]);

  // Group by category
  const categories = useMemo(() => {
    const cats = new Set(sortedItems.map((i) => i.category).filter(Boolean));
    return [...cats] as string[];
  }, [sortedItems]);

  // Determine value range
  const maxValue = useMemo(
    () => Math.max(...sortedItems.map((i) => i.value), 0.01),
    [sortedItems],
  );

  const totalH =
    sortedItems.length * rowHeight +
    margin.top +
    margin.bottom +
    categories.length * 24;

  // Build row positions with category headers
  const rows = useMemo(() => {
    const result: Array<{
      item: LollipopItem;
      y: number;
      index: number;
    }> = [];
    let currentY = margin.top;
    let lastCategory: string | undefined;
    let idx = 0;

    for (const item of sortedItems) {
      if (
        categories.length > 0 &&
        item.category &&
        item.category !== lastCategory
      ) {
        currentY += 24; // Category header space
        lastCategory = item.category;
      }
      result.push({ item, y: currentY + rowHeight / 2, index: idx });
      currentY += rowHeight;
      idx++;
    }

    return result;
  }, [sortedItems, categories, margin.top, rowHeight]);

  return (
    <div className={cn("relative inline-block", className)}>
      <svg
        width={width}
        height={totalH}
        viewBox={`0 0 ${width} ${totalH}`}
        role="img"
        aria-label="Lollipop chart"
      >
        {/* Axis line */}
        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left}
          y2={totalH - margin.bottom}
          stroke="currentColor"
          strokeOpacity={0.2}
          strokeWidth={1}
        />

        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((tick) => {
          const x = margin.left + (tick / maxValue) * innerW;
          return (
            <g key={tick}>
              <line
                x1={x}
                y1={margin.top}
                x2={x}
                y2={totalH - margin.bottom}
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeWidth={1}
              />
              <text
                x={x}
                y={margin.top - 6}
                textAnchor="middle"
                fontSize={10}
                fill="currentColor"
                fillOpacity={0.4}
              >
                {(tick * maxValue).toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Category headers */}
        {(() => {
          let currentY = margin.top;
          let lastCategory: string | undefined;
          const headers: JSX.Element[] = [];

          for (const item of sortedItems) {
            if (
              categories.length > 0 &&
              item.category &&
              item.category !== lastCategory
            ) {
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

        {/* Lollipop items */}
        {rows.map(({ item, y, index }) => {
          const barWidth = (item.value / maxValue) * innerW;
          const color = interpolateColor(
            lowColor,
            highColor,
            item.value / maxValue,
          );
          const visible = index < visibleCount;

          return (
            <g
              key={`${item.label}-${index}`}
              style={{
                opacity: visible ? 1 : 0,
                transform: visible
                  ? "translateX(0)"
                  : "translateX(-20px)",
                transition: `opacity 0.3s ease ${index * staggerDelay}ms, transform 0.3s ease ${index * staggerDelay}ms`,
              }}
            >
              {/* Label */}
              <text
                x={margin.left - 8}
                y={y}
                textAnchor="end"
                dominantBaseline="central"
                fontSize={12}
                fill="currentColor"
              >
                {item.label}
              </text>

              {/* Stem */}
              <line
                x1={margin.left}
                y1={y}
                x2={margin.left + barWidth}
                y2={y}
                stroke={color}
                strokeWidth={2}
              />

              {/* Circle (lollipop head) */}
              <circle
                cx={margin.left + barWidth}
                cy={y}
                r={circleRadius}
                fill={color}
                stroke="white"
                strokeWidth={1.5}
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => {
                  const rect = (
                    e.target as SVGElement
                  )
                    .closest("svg")
                    ?.getBoundingClientRect();
                  if (rect) {
                    setTooltip({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      item,
                    });
                  }
                }}
                onMouseLeave={() => setTooltip(null)}
              />

              {/* Value label */}
              <text
                x={margin.left + barWidth + circleRadius + 6}
                y={y}
                dominantBaseline="central"
                fontSize={11}
                fill="currentColor"
                fillOpacity={0.6}
              >
                {item.value.toFixed(2)}
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
            Value: {tooltip.item.value.toFixed(4)}
          </div>
          {tooltip.item.category && (
            <div className="text-muted-foreground">
              Category: {tooltip.item.category}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
