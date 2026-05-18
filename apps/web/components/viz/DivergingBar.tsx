"use client";

import { useMemo, useState, useRef } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface DivergingBarItem {
  /** Label for the bar (e.g. model or indicator name). */
  label: string;
  /** Numeric value. */
  value: number;
}

export interface DivergingBarProps {
  items: DivergingBarItem[];
  /** Centre baseline value (default 0.5). */
  threshold?: number;
  /** Chart width (default 600). */
  width?: number;
  /** Per-bar height (default 32). */
  barHeight?: number;
  /** Colour for bars above the threshold (default "#22c55e"). */
  positiveColor?: string;
  /** Colour for bars below the threshold (default "#ef4444"). */
  negativeColor?: string;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function DivergingBar({
  items,
  threshold = 0.5,
  width = 600,
  barHeight = 32,
  positiveColor = "#22c55e",
  negativeColor = "#ef4444",
  className,
}: DivergingBarProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const margin = { top: 20, right: 60, bottom: 20, left: 120 };
  const innerW = width - margin.left - margin.right;
  const innerH = items.length * barHeight;
  const totalH = innerH + margin.top + margin.bottom;

  /** Sort items by magnitude of divergence from threshold. */
  const sorted = useMemo(
    () =>
      [...items]
        .map((item, originalIdx) => ({ ...item, originalIdx }))
        .sort((a, b) => Math.abs(b.value - threshold) - Math.abs(a.value - threshold)),
    [items, threshold],
  );

  /** Compute the data domain. */
  const domain = useMemo(() => {
    const allValues = items.map((d) => d.value);
    const lo = Math.min(0, ...allValues);
    const hi = Math.max(1, ...allValues);
    return [lo, hi] as const;
  }, [items]);

  /** X-scale: maps value -> pixel offset from left. */
  const xScale = (v: number) =>
    ((v - domain[0]) / (domain[1] - domain[0])) * innerW;

  const baselineX = xScale(threshold);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${totalH}`}
        className="w-full rounded-xl border border-white/8 bg-white/[0.02]"
      >
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Grid lines */}
          {[domain[0], threshold, domain[1]].map((tick) => (
            <line
              key={tick}
              x1={xScale(tick)}
              y1={0}
              x2={xScale(tick)}
              y2={innerH}
              stroke={
                tick === threshold
                  ? "rgba(255,255,255,0.25)"
                  : "rgba(255,255,255,0.06)"
              }
              strokeWidth={tick === threshold ? 1.5 : 1}
              strokeDasharray={tick === threshold ? "none" : "3 3"}
            />
          ))}

          {/* Threshold label */}
          <text
            x={baselineX}
            y={-8}
            textAnchor="middle"
            fill="rgba(255,255,255,0.4)"
            fontSize={9}
          >
            {threshold}
          </text>

          {/* Bars */}
          {sorted.map((item, i) => {
            const y = i * barHeight + barHeight * 0.15;
            const h = barHeight * 0.7;
            const isPositive = item.value >= threshold;
            const barX = isPositive ? baselineX : xScale(item.value);
            const barW = isPositive
              ? xScale(item.value) - baselineX
              : baselineX - xScale(item.value);
            const color = isPositive ? positiveColor : negativeColor;
            const dimmed = hoveredIndex !== null && hoveredIndex !== i;

            return (
              <g
                key={item.label}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                {/* Row label */}
                <text
                  x={-8}
                  y={y + h / 2}
                  textAnchor="end"
                  dominantBaseline="central"
                  fill={dimmed ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.65)"}
                  fontSize={11}
                  fontWeight={500}
                  className="transition-all duration-150"
                >
                  {item.label}
                </text>

                {/* Bar */}
                <rect
                  x={barX}
                  y={y}
                  width={Math.max(barW, 0)}
                  height={h}
                  fill={color}
                  fillOpacity={dimmed ? 0.15 : 0.7}
                  rx={3}
                  className="transition-all duration-150"
                />

                {/* Value label */}
                <text
                  x={xScale(item.value) + (isPositive ? 6 : -6)}
                  y={y + h / 2}
                  textAnchor={isPositive ? "start" : "end"}
                  dominantBaseline="central"
                  fill={dimmed ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.6)"}
                  fontSize={10}
                  fontWeight={500}
                  className="tabular-nums transition-all duration-150"
                >
                  {item.value.toFixed(2)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
