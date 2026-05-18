"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface GaugeChartProps {
  /** Current value to display on the gauge. */
  value: number;
  /** Minimum value (default 0). */
  min?: number;
  /** Maximum value (default 1). */
  max?: number;
  /** Label shown below the score (default "Score"). */
  label?: string;
  /** Width/height of the SVG (default 260). */
  size?: number;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Convert a polar angle (radians) + radius to SVG cartesian point. */
function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleRad: number,
): { x: number; y: number } {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

/** Build an SVG arc path from startAngle to endAngle (radians). */
function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function GaugeChart({
  value,
  min = 0,
  max = 1,
  label = "Score",
  size = 260,
  className,
}: GaugeChartProps) {
  const cx = size / 2;
  const cy = size / 2 + 10;
  const radius = size / 2 - 30;
  const strokeWidth = 18;

  // Arc spans from PI (left) to 0 (right) — a semicircle
  const startAngle = Math.PI;
  const endAngle = 0;

  const clamped = Math.max(min, Math.min(max, value));
  const normalized = (clamped - min) / (max - min);

  // Needle angle: PI (left, 0%) to 0 (right, 100%)
  const needleAngle = Math.PI - normalized * Math.PI;
  const needleLength = radius - 8;
  const needleTip = polarToCartesian(cx, cy, needleLength, needleAngle);

  const arcPath = useMemo(
    () => describeArc(cx, cy, radius, endAngle, startAngle),
    [cx, cy, radius],
  );

  const gradientId = `gauge-gradient-${size}`;

  // Color zone stops: 0% = left (red), 50% = middle (yellow), 100% = right (green)
  // Since the arc goes right-to-left in SVG, we reverse the gradient direction.

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg
        width={size}
        height={size / 2 + 40}
        viewBox={`0 0 ${size} ${size / 2 + 40}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="33%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="66%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>

        {/* Background arc track */}
        <path
          d={arcPath}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
        />

        {/* Colored arc */}
        <path
          d={arcPath}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Zone tick marks */}
        {[0, 0.33, 0.66, 1].map((t) => {
          const angle = Math.PI - t * Math.PI;
          const outer = polarToCartesian(cx, cy, radius + strokeWidth / 2 + 4, angle);
          const inner = polarToCartesian(cx, cy, radius - strokeWidth / 2 - 4, angle);
          return (
            <line
              key={t}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={1.5}
            />
          );
        })}

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleTip.x}
          y2={needleTip.y}
          stroke="rgba(255,255,255,0.9)"
          strokeWidth={2.5}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
          style={{
            transformOrigin: `${cx}px ${cy}px`,
          }}
        />

        {/* Needle pivot */}
        <circle cx={cx} cy={cy} r={5} fill="rgba(255,255,255,0.85)" />
        <circle cx={cx} cy={cy} r={2.5} fill="rgba(0,0,0,0.5)" />

        {/* Score text */}
        <text
          x={cx}
          y={cy - 20}
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgba(255,255,255,0.95)"
          fontSize={32}
          fontWeight={700}
          className="tabular-nums"
        >
          {(normalized * 100).toFixed(0)}%
        </text>

        {/* Label */}
        <text
          x={cx}
          y={cy + 24}
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgba(255,255,255,0.4)"
          fontSize={12}
          fontWeight={500}
        >
          {label}
        </text>

        {/* Min / Max labels */}
        <text
          x={cx - radius - 4}
          y={cy + 16}
          textAnchor="middle"
          fill="rgba(255,255,255,0.25)"
          fontSize={9}
        >
          {min}
        </text>
        <text
          x={cx + radius + 4}
          y={cy + 16}
          textAnchor="middle"
          fill="rgba(255,255,255,0.25)"
          fontSize={9}
        >
          {max}
        </text>
      </svg>
    </div>
  );
}
