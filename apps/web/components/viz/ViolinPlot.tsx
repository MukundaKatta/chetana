"use client";

import { useMemo, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  getTheoryColor,
  THEORY_SHORT_LABELS,
  type PaletteType,
  type Theory,
} from "./ColorBlindPalette";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ViolinCategory {
  /** Category key (used for coloring and labeling). */
  category: Theory;
  /** Raw score values (0-1) for the distribution. */
  values: number[];
}

export interface ViolinPlotProps {
  categories: ViolinCategory[];
  /** Chart width (default 600). */
  width?: number;
  /** Chart height (default 380). */
  height?: number;
  palette?: PaletteType;
  /** Number of bins for KDE (default 40). */
  resolution?: number;
  /** KDE bandwidth (default 0.05). */
  bandwidth?: number;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  KDE helpers                                                       */
/* ------------------------------------------------------------------ */

function gaussianKernel(u: number): number {
  return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * u * u);
}

function kde(
  values: number[],
  bandwidth: number,
  resolution: number,
): { x: number; density: number }[] {
  if (values.length === 0) return [];
  const step = 1 / resolution;
  const points: { x: number; density: number }[] = [];
  for (let i = 0; i <= resolution; i++) {
    const x = i * step;
    let sum = 0;
    for (const v of values) {
      sum += gaussianKernel((x - v) / bandwidth);
    }
    points.push({ x, density: sum / (values.length * bandwidth) });
  }
  return points;
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function ViolinPlot({
  categories,
  width = 600,
  height = 380,
  palette = "wong",
  resolution = 40,
  bandwidth = 0.05,
  className,
}: ViolinPlotProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    lines: string[];
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const margin = { top: 20, right: 20, bottom: 40, left: 44 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const violinWidth = Math.min(80, innerW / categories.length - 12);

  /** Pre-compute KDE and quartile stats for each category. */
  const computed = useMemo(
    () =>
      categories.map((cat) => {
        const densityPoints = kde(cat.values, bandwidth, resolution);
        const maxDensity = Math.max(...densityPoints.map((p) => p.density), 1e-9);
        const sorted = [...cat.values].sort((a, b) => a - b);
        const q1 = sorted.length > 0 ? quantile(sorted, 0.25) : 0;
        const median = sorted.length > 0 ? quantile(sorted, 0.5) : 0;
        const q3 = sorted.length > 0 ? quantile(sorted, 0.75) : 0;

        return {
          category: cat.category,
          values: cat.values,
          densityPoints,
          maxDensity,
          q1,
          median,
          q3,
        };
      }),
    [categories, bandwidth, resolution],
  );

  /** Y scale: value (0-1) -> pixel. */
  const yScale = (v: number) => innerH - v * innerH;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="w-full rounded-xl border border-white/8 bg-white/[0.02]"
      >
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Y-axis grid */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((tick) => {
            const y = yScale(tick);
            return (
              <g key={tick}>
                <line
                  x1={0}
                  x2={innerW}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth={1}
                />
                <text
                  x={-8}
                  y={y}
                  fill="rgba(255,255,255,0.35)"
                  fontSize={9}
                  textAnchor="end"
                  dominantBaseline="central"
                >
                  {tick.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Violins */}
          {computed.map((item, i) => {
            const cx = (i + 0.5) * (innerW / computed.length);
            const color = getTheoryColor(item.category, palette);
            const halfW = violinWidth / 2;

            // Build mirrored violin path
            const rightSide = item.densityPoints.map((p) => ({
              x: cx + (p.density / item.maxDensity) * halfW,
              y: yScale(p.x),
            }));
            const leftSide = [...item.densityPoints]
              .reverse()
              .map((p) => ({
                x: cx - (p.density / item.maxDensity) * halfW,
                y: yScale(p.x),
              }));

            const pathData =
              rightSide.length > 0
                ? `M ${rightSide[0].x} ${rightSide[0].y} ` +
                  rightSide.map((p) => `L ${p.x} ${p.y}`).join(" ") +
                  " " +
                  leftSide.map((p) => `L ${p.x} ${p.y}`).join(" ") +
                  " Z"
                : "";

            return (
              <g
                key={item.category}
                onMouseEnter={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    setTooltip({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top - 12,
                      lines: [
                        THEORY_SHORT_LABELS[item.category],
                        `Median: ${(item.median * 100).toFixed(1)}%`,
                        `Q1: ${(item.q1 * 100).toFixed(1)}%  Q3: ${(item.q3 * 100).toFixed(1)}%`,
                        `n = ${item.values.length}`,
                      ],
                    });
                  }
                }}
                onMouseMove={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    setTooltip((prev) =>
                      prev
                        ? {
                            ...prev,
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top - 12,
                          }
                        : prev,
                    );
                  }
                }}
                onMouseLeave={() => setTooltip(null)}
                className="cursor-pointer"
              >
                {/* Violin shape */}
                {pathData && (
                  <path
                    d={pathData}
                    fill={color}
                    fillOpacity={0.2}
                    stroke={color}
                    strokeWidth={1.5}
                    strokeOpacity={0.7}
                  />
                )}

                {/* Median line */}
                <line
                  x1={cx - halfW * 0.4}
                  x2={cx + halfW * 0.4}
                  y1={yScale(item.median)}
                  y2={yScale(item.median)}
                  stroke={color}
                  strokeWidth={2.5}
                />

                {/* Q1 line */}
                <line
                  x1={cx - halfW * 0.25}
                  x2={cx + halfW * 0.25}
                  y1={yScale(item.q1)}
                  y2={yScale(item.q1)}
                  stroke={color}
                  strokeWidth={1.5}
                  strokeOpacity={0.6}
                />

                {/* Q3 line */}
                <line
                  x1={cx - halfW * 0.25}
                  x2={cx + halfW * 0.25}
                  y1={yScale(item.q3)}
                  y2={yScale(item.q3)}
                  stroke={color}
                  strokeWidth={1.5}
                  strokeOpacity={0.6}
                />

                {/* Connecting line Q1-Q3 */}
                <line
                  x1={cx}
                  x2={cx}
                  y1={yScale(item.q1)}
                  y2={yScale(item.q3)}
                  stroke={color}
                  strokeWidth={1.5}
                  strokeOpacity={0.5}
                />

                {/* X-axis label */}
                <text
                  x={cx}
                  y={innerH + 22}
                  fill={color}
                  fontSize={11}
                  fontWeight={600}
                  textAnchor="middle"
                >
                  {THEORY_SHORT_LABELS[item.category]}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 shadow-xl"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          {tooltip.lines.map((line, i) => (
            <div
              key={i}
              className={cn(
                "text-[11px] tabular-nums",
                i === 0 ? "font-semibold text-neutral-200" : "text-neutral-400",
              )}
            >
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
