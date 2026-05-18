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

export interface TheoryDistribution {
  theory: Theory;
  /** Raw score values (0-1) for the distribution. */
  values: number[];
}

export interface BoxPlotProps {
  distributions: TheoryDistribution[];
  /** Chart width (default 600). */
  width?: number;
  /** Chart height (default 340). */
  height?: number;
  palette?: PaletteType;
  /** Show individual data points as dots (default true). */
  showOutliers?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Stats helpers                                                     */
/* ------------------------------------------------------------------ */

interface BoxStats {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  iqr: number;
  lowerWhisker: number;
  upperWhisker: number;
  outliers: number[];
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function computeStats(values: number[]): BoxStats {
  if (values.length === 0) {
    return { min: 0, q1: 0, median: 0, q3: 0, max: 0, iqr: 0, lowerWhisker: 0, upperWhisker: 0, outliers: [] };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const median = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;

  const lowerWhisker = sorted.find((v) => v >= lowerFence) ?? sorted[0];
  const upperWhisker = [...sorted].reverse().find((v) => v <= upperFence) ?? sorted[sorted.length - 1];

  const outliers = sorted.filter((v) => v < lowerFence || v > upperFence);

  return {
    min: sorted[0],
    q1,
    median,
    q3,
    max: sorted[sorted.length - 1],
    iqr,
    lowerWhisker,
    upperWhisker,
    outliers,
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function BoxPlot({
  distributions,
  width = 600,
  height = 340,
  palette = "wong",
  showOutliers = true,
  className,
}: BoxPlotProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    lines: string[];
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const margin = { top: 20, right: 20, bottom: 40, left: 44 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const stats = useMemo(
    () => distributions.map((d) => ({ theory: d.theory, ...computeStats(d.values), values: d.values })),
    [distributions],
  );

  const boxWidth = Math.min(60, innerW / distributions.length - 16);

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
            const y = innerH - tick * innerH;
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

          {/* Box plots */}
          {stats.map((s, i) => {
            const cx = (i + 0.5) * (innerW / stats.length);
            const color = getTheoryColor(s.theory, palette);
            const yScale = (v: number) => innerH - v * innerH;

            return (
              <g
                key={s.theory}
                onMouseEnter={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    setTooltip({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top - 12,
                      lines: [
                        `${THEORY_SHORT_LABELS[s.theory]}`,
                        `Median: ${(s.median * 100).toFixed(1)}%`,
                        `Q1: ${(s.q1 * 100).toFixed(1)}%  Q3: ${(s.q3 * 100).toFixed(1)}%`,
                        `Range: ${(s.lowerWhisker * 100).toFixed(1)}% - ${(s.upperWhisker * 100).toFixed(1)}%`,
                        `n = ${s.values.length}`,
                      ],
                    });
                  }
                }}
                onMouseMove={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    setTooltip((prev) =>
                      prev
                        ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top - 12 }
                        : prev,
                    );
                  }
                }}
                onMouseLeave={() => setTooltip(null)}
                className="cursor-pointer"
              >
                {/* Whisker line */}
                <line
                  x1={cx}
                  x2={cx}
                  y1={yScale(s.upperWhisker)}
                  y2={yScale(s.lowerWhisker)}
                  stroke={color}
                  strokeWidth={1.5}
                  strokeOpacity={0.6}
                />

                {/* Upper whisker cap */}
                <line
                  x1={cx - boxWidth * 0.25}
                  x2={cx + boxWidth * 0.25}
                  y1={yScale(s.upperWhisker)}
                  y2={yScale(s.upperWhisker)}
                  stroke={color}
                  strokeWidth={1.5}
                  strokeOpacity={0.6}
                />

                {/* Lower whisker cap */}
                <line
                  x1={cx - boxWidth * 0.25}
                  x2={cx + boxWidth * 0.25}
                  y1={yScale(s.lowerWhisker)}
                  y2={yScale(s.lowerWhisker)}
                  stroke={color}
                  strokeWidth={1.5}
                  strokeOpacity={0.6}
                />

                {/* IQR box */}
                <rect
                  x={cx - boxWidth / 2}
                  y={yScale(s.q3)}
                  width={boxWidth}
                  height={Math.max(yScale(s.q1) - yScale(s.q3), 1)}
                  fill={color}
                  fillOpacity={0.2}
                  stroke={color}
                  strokeWidth={1.5}
                  strokeOpacity={0.7}
                  rx={2}
                />

                {/* Median line */}
                <line
                  x1={cx - boxWidth / 2}
                  x2={cx + boxWidth / 2}
                  y1={yScale(s.median)}
                  y2={yScale(s.median)}
                  stroke={color}
                  strokeWidth={2.5}
                  strokeOpacity={1}
                />

                {/* Outliers */}
                {showOutliers &&
                  s.outliers.map((o, oi) => (
                    <circle
                      key={oi}
                      cx={cx}
                      cy={yScale(o)}
                      r={3}
                      fill="none"
                      stroke={color}
                      strokeWidth={1.5}
                      strokeOpacity={0.7}
                    />
                  ))}

                {/* X-axis label */}
                <text
                  x={cx}
                  y={innerH + 22}
                  fill={color}
                  fontSize={11}
                  fontWeight={600}
                  textAnchor="middle"
                >
                  {THEORY_SHORT_LABELS[s.theory]}
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
