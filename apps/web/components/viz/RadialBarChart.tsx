"use client";

import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface RadialBarItem {
  /** Label for this bar. */
  label: string;
  /** Value (0-1 for scores). */
  value: number;
  /** Optional category for color grouping. */
  category?: string;
  /** Optional custom color. */
  color?: string;
}

export interface RadialBarChartProps {
  items: RadialBarItem[];
  /** Chart diameter in pixels (default 400). */
  size?: number;
  /** Inner radius as fraction of outer (default 0.3). */
  innerRadiusFraction?: number;
  /** Whether to show labels along arcs (default true). */
  showLabels?: boolean;
  /** Whether to animate on mount (default true). */
  animated?: boolean;
  /** Stagger delay per bar in ms (default 60). */
  staggerDelay?: number;
  /** Category color map. */
  categoryColors?: Record<string, string>;
  className?: string;
}

interface TooltipData {
  x: number;
  y: number;
  item: RadialBarItem;
}

/* ------------------------------------------------------------------ */
/*  Default category colors                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_COLORS = [
  "#E69F00",
  "#56B4E9",
  "#009E73",
  "#F0E442",
  "#0072B2",
  "#D55E00",
  "#CC79A7",
  "#8A2BE2",
  "#FF6B6B",
  "#4ECDC4",
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function RadialBarChart({
  items,
  size = 400,
  innerRadiusFraction = 0.3,
  showLabels = true,
  animated = true,
  staggerDelay = 60,
  categoryColors = {},
  className,
}: RadialBarChartProps) {
  const [animationProgress, setAnimationProgress] = useState(
    animated ? 0 : 1,
  );
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // Animate on mount
  useEffect(() => {
    if (!animated) {
      setAnimationProgress(1);
      return;
    }

    let frame: number;
    const startTime = performance.now();
    const duration = 800 + items.length * staggerDelay;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      setAnimationProgress(progress);
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [animated, items.length, staggerDelay]);

  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size / 2 - 40;
  const innerRadius = outerRadius * innerRadiusFraction;
  const barCount = items.length;

  // Assign colors by category
  const colorMap = useMemo(() => {
    const categories = [...new Set(items.map((i) => i.category ?? i.label))];
    const map = new Map<string, string>();
    categories.forEach((cat, idx) => {
      map.set(
        cat,
        categoryColors[cat] ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
      );
    });
    return map;
  }, [items, categoryColors]);

  const getColor = (item: RadialBarItem): string =>
    item.color ?? colorMap.get(item.category ?? item.label) ?? DEFAULT_COLORS[0];

  // Compute bar dimensions
  const barThickness = barCount > 0
    ? (outerRadius - innerRadius) / barCount
    : 0;
  const barGap = Math.min(2, barThickness * 0.1);

  const maxValue = useMemo(
    () => Math.max(...items.map((i) => i.value), 0.01),
    [items],
  );

  /**
   * Build an arc path for a radial bar.
   */
  const arcPath = (
    barIndex: number,
    valueFraction: number,
  ): string => {
    const r1 = innerRadius + barIndex * barThickness + barGap;
    const r2 = r1 + barThickness - barGap * 2;
    const angleExtent = valueFraction * 2 * Math.PI;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + angleExtent;

    if (angleExtent < 0.001) return "";

    const largeArc = angleExtent > Math.PI ? 1 : 0;

    const x1Start = cx + r1 * Math.cos(startAngle);
    const y1Start = cy + r1 * Math.sin(startAngle);
    const x2Start = cx + r2 * Math.cos(startAngle);
    const y2Start = cy + r2 * Math.sin(startAngle);

    const x1End = cx + r1 * Math.cos(endAngle);
    const y1End = cy + r1 * Math.sin(endAngle);
    const x2End = cx + r2 * Math.cos(endAngle);
    const y2End = cy + r2 * Math.sin(endAngle);

    return [
      `M ${x2Start} ${y2Start}`,
      `A ${r2} ${r2} 0 ${largeArc} 1 ${x2End} ${y2End}`,
      `L ${x1End} ${y1End}`,
      `A ${r1} ${r1} 0 ${largeArc} 0 ${x1Start} ${y1Start}`,
      "Z",
    ].join(" ");
  };

  /**
   * Compute label position along the arc.
   */
  const labelPosition = (
    barIndex: number,
    valueFraction: number,
  ): { x: number; y: number; angle: number } | null => {
    if (valueFraction < 0.05) return null;

    const r = innerRadius + barIndex * barThickness + barThickness / 2;
    const angle = -Math.PI / 2 + valueFraction * Math.PI;
    const clampedAngle = Math.min(
      angle,
      -Math.PI / 2 + valueFraction * 2 * Math.PI - 0.1,
    );

    return {
      x: cx + r * Math.cos(clampedAngle),
      y: cy + r * Math.sin(clampedAngle),
      angle: (clampedAngle * 180) / Math.PI + 90,
    };
  };

  // Background ring marks
  const ringMarks = [0.25, 0.5, 0.75, 1];

  return (
    <div className={cn("relative inline-block", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Radial bar chart"
      >
        {/* Background rings for scale */}
        {ringMarks.map((mark) => {
          const angle = -Math.PI / 2 + mark * 2 * Math.PI;
          const x = cx + outerRadius * Math.cos(angle);
          const y = cy + outerRadius * Math.sin(angle);
          return (
            <g key={mark}>
              <line
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeWidth={1}
              />
              <text
                x={x + (Math.cos(angle) > 0 ? 4 : -4)}
                y={y}
                textAnchor={Math.cos(angle) > 0 ? "start" : "end"}
                dominantBaseline="central"
                fontSize={9}
                fill="currentColor"
                fillOpacity={0.3}
              >
                {(mark * maxValue).toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Inner circle */}
        <circle
          cx={cx}
          cy={cy}
          r={innerRadius}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.1}
          strokeWidth={1}
        />

        {/* Radial bars */}
        {items.map((item, i) => {
          const valueFraction = item.value / maxValue;

          // Stagger animation: each bar starts after a delay
          const barStartProgress = (i * staggerDelay) / (800 + items.length * staggerDelay);
          const barProgress = Math.max(
            0,
            Math.min(
              1,
              (animationProgress - barStartProgress) /
                (1 - barStartProgress || 1),
            ),
          );

          const animatedFraction = valueFraction * barProgress;
          const color = getColor(item);
          const path = arcPath(i, animatedFraction);

          if (!path) return null;

          return (
            <g key={`bar-${i}`}>
              {/* Background track */}
              <path
                d={arcPath(i, 1)}
                fill="currentColor"
                fillOpacity={0.04}
              />

              {/* Value bar */}
              <path
                d={path}
                fill={color}
                fillOpacity={0.7}
                stroke={color}
                strokeWidth={0.5}
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => {
                  const rect = (e.target as SVGElement)
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
                onMouseMove={(e) => {
                  const rect = (e.target as SVGElement)
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

              {/* Label along arc */}
              {showLabels && (() => {
                const pos = labelPosition(i, animatedFraction);
                if (!pos) return null;
                return (
                  <text
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={Math.min(10, barThickness - 2)}
                    fill="currentColor"
                    fontWeight={500}
                    transform={`rotate(${pos.angle}, ${pos.x}, ${pos.y})`}
                    style={{ pointerEvents: "none" }}
                  >
                    {item.label}
                  </text>
                );
              })()}
            </g>
          );
        })}

        {/* Center label */}
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          fontSize={14}
          fontWeight={700}
          fill="currentColor"
        >
          {items.length}
        </text>
        <text
          x={cx}
          y={cy + 10}
          textAnchor="middle"
          fontSize={10}
          fill="currentColor"
          fillOpacity={0.5}
        >
          items
        </text>
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
          <div className="text-muted-foreground">
            {((tooltip.item.value / maxValue) * 100).toFixed(1)}% of max
          </div>
        </div>
      )}

      {/* Legend */}
      {items.some((i) => i.category) && (
        <div className="mt-2 flex flex-wrap gap-3 text-xs">
          {[...colorMap.entries()].map(([cat, color]) => (
            <div key={cat} className="flex items-center gap-1">
              <div
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: color }}
              />
              <span>{cat}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
