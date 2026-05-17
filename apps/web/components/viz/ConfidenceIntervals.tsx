"use client";

import { useMemo, useState } from "react";
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

export interface CIDataPoint {
  label: string;
  /** Point estimate (0-1). */
  mean: number;
  /** Standard error (used to compute CI). */
  se: number;
  /** Optional theory for color coding. */
  theory?: Theory;
}

export type CILevel = 90 | 95 | 99;

export interface ConfidenceIntervalsProps {
  data: CIDataPoint[];
  /** Default CI level (default 95). */
  defaultLevel?: CILevel;
  /** Chart width (default 600). */
  width?: number;
  /** Chart height – auto-calculated if omitted. */
  height?: number;
  palette?: PaletteType;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Z-scores for CI levels                                            */
/* ------------------------------------------------------------------ */

const Z_SCORES: Record<CILevel, number> = {
  90: 1.645,
  95: 1.96,
  99: 2.576,
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function ConfidenceIntervals({
  data,
  defaultLevel = 95,
  width = 600,
  height: heightProp,
  palette = "wong",
  className,
}: ConfidenceIntervalsProps) {
  const [level, setLevel] = useState<CILevel>(defaultLevel);

  const barHeight = 32;
  const barGap = 10;
  const margin = { top: 32, right: 24, bottom: 28, left: 120 };
  const computedHeight = heightProp ?? margin.top + margin.bottom + data.length * (barHeight + barGap);
  const innerW = width - margin.left - margin.right;
  const innerH = computedHeight - margin.top - margin.bottom;

  const z = Z_SCORES[level];

  const intervals = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        lo: Math.max(0, d.mean - z * d.se),
        hi: Math.min(1, d.mean + z * d.se),
      })),
    [data, z],
  );

  // All three CI bands for the shaded overlay.
  const allBands = useMemo(
    () =>
      data.map((d) => ({
        lo90: Math.max(0, d.mean - Z_SCORES[90] * d.se),
        hi90: Math.min(1, d.mean + Z_SCORES[90] * d.se),
        lo95: Math.max(0, d.mean - Z_SCORES[95] * d.se),
        hi95: Math.min(1, d.mean + Z_SCORES[95] * d.se),
        lo99: Math.max(0, d.mean - Z_SCORES[99] * d.se),
        hi99: Math.min(1, d.mean + Z_SCORES[99] * d.se),
      })),
    [data],
  );

  const xScale = (v: number) => v * innerW;

  return (
    <div className={cn("space-y-3", className)}>
      {/* CI level toggle */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          Confidence
        </span>
        {([90, 95, 99] as CILevel[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLevel(l)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              l === level
                ? "border-white/20 bg-white/10 text-neutral-200"
                : "border-white/8 bg-white/[0.02] text-neutral-500 hover:bg-white/[0.06]",
            )}
          >
            {l}%
          </button>
        ))}
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${width} ${computedHeight}`}
        className="w-full rounded-xl border border-white/8 bg-white/[0.02]"
      >
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* X grid */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((tick) => (
            <g key={tick}>
              <line
                x1={xScale(tick)}
                x2={xScale(tick)}
                y1={0}
                y2={innerH}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={1}
              />
              <text
                x={xScale(tick)}
                y={innerH + 16}
                fill="rgba(255,255,255,0.3)"
                fontSize={9}
                textAnchor="middle"
              >
                {(tick * 100).toFixed(0)}%
              </text>
            </g>
          ))}

          {/* Bars + error bars */}
          {intervals.map((d, i) => {
            const y = i * (barHeight + barGap);
            const color = d.theory
              ? getTheoryColor(d.theory, palette)
              : "#a3a3a3";
            const band = allBands[i];

            return (
              <g key={d.label}>
                {/* Row label */}
                <text
                  x={-8}
                  y={y + barHeight / 2}
                  fill="rgba(255,255,255,0.6)"
                  fontSize={10}
                  fontWeight={500}
                  textAnchor="end"
                  dominantBaseline="central"
                >
                  {d.label}
                </text>

                {/* 99% band (lightest) */}
                <rect
                  x={xScale(band.lo99)}
                  y={y + barHeight * 0.15}
                  width={Math.max(xScale(band.hi99) - xScale(band.lo99), 1)}
                  height={barHeight * 0.7}
                  fill={color}
                  fillOpacity={0.06}
                  rx={3}
                />

                {/* 95% band */}
                <rect
                  x={xScale(band.lo95)}
                  y={y + barHeight * 0.2}
                  width={Math.max(xScale(band.hi95) - xScale(band.lo95), 1)}
                  height={barHeight * 0.6}
                  fill={color}
                  fillOpacity={0.12}
                  rx={3}
                />

                {/* 90% band */}
                <rect
                  x={xScale(band.lo90)}
                  y={y + barHeight * 0.25}
                  width={Math.max(xScale(band.hi90) - xScale(band.lo90), 1)}
                  height={barHeight * 0.5}
                  fill={color}
                  fillOpacity={0.2}
                  rx={2}
                />

                {/* Mean bar (solid) */}
                <rect
                  x={0}
                  y={y + barHeight * 0.3}
                  width={xScale(d.mean)}
                  height={barHeight * 0.4}
                  fill={color}
                  fillOpacity={0.5}
                  rx={2}
                />

                {/* Error bar whiskers (for selected CI level) */}
                <line
                  x1={xScale(d.lo)}
                  x2={xScale(d.hi)}
                  y1={y + barHeight / 2}
                  y2={y + barHeight / 2}
                  stroke={color}
                  strokeWidth={2}
                  strokeOpacity={0.9}
                />
                {/* Left cap */}
                <line
                  x1={xScale(d.lo)}
                  x2={xScale(d.lo)}
                  y1={y + barHeight * 0.3}
                  y2={y + barHeight * 0.7}
                  stroke={color}
                  strokeWidth={2}
                  strokeOpacity={0.9}
                />
                {/* Right cap */}
                <line
                  x1={xScale(d.hi)}
                  x2={xScale(d.hi)}
                  y1={y + barHeight * 0.3}
                  y2={y + barHeight * 0.7}
                  stroke={color}
                  strokeWidth={2}
                  strokeOpacity={0.9}
                />

                {/* Mean dot */}
                <circle
                  cx={xScale(d.mean)}
                  cy={y + barHeight / 2}
                  r={4}
                  fill={color}
                  stroke="#111"
                  strokeWidth={1.5}
                />

                {/* Value label */}
                <text
                  x={xScale(d.mean) + 10}
                  y={y + barHeight / 2}
                  fill="rgba(255,255,255,0.6)"
                  fontSize={9}
                  fontWeight={600}
                  dominantBaseline="central"
                >
                  {(d.mean * 100).toFixed(1)}%
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="flex justify-center gap-4">
        {[
          { label: "90% CI", opacity: 0.2 },
          { label: "95% CI", opacity: 0.12 },
          { label: "99% CI", opacity: 0.06 },
        ].map(({ label, opacity }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-5 rounded"
              style={{ backgroundColor: `rgba(163,163,163,${opacity + 0.15})` }}
            />
            <span className="text-[10px] text-neutral-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
