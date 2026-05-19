"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface GaugeThreshold {
  /** Value at which this zone starts. */
  from: number;
  /** Color for this zone. */
  color: string;
  /** Optional label (e.g. "Low", "Medium", "High"). */
  label?: string;
}

export interface GaugeConfig {
  /** Unique identifier. */
  id: string;
  /** Display label. */
  label: string;
  /** Current value. */
  value: number;
  /** Minimum value (default 0). */
  min?: number;
  /** Maximum value (default 100). */
  max?: number;
  /** Unit suffix (e.g. "%", "ms"). */
  unit?: string;
  /** Color zones / thresholds (sorted ascending by `from`). */
  thresholds?: GaugeThreshold[];
  /** Number of decimal places (default 0). */
  precision?: number;
}

export interface GaugeClusterProps {
  /** Array of 4-8 gauge configs. */
  gauges: GaugeConfig[];
  /** Called when a gauge is clicked (for expansion). */
  onGaugeClick?: (gauge: GaugeConfig) => void;
  /** Size of each mini gauge in px (default 100). */
  gaugeSize?: number;
  /** Extra class. */
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Default thresholds                                                */
/* ------------------------------------------------------------------ */

const DEFAULT_THRESHOLDS: GaugeThreshold[] = [
  { from: 0, color: "#ef4444", label: "Low" },
  { from: 33, color: "#f59e0b", label: "Medium" },
  { from: 66, color: "#22c55e", label: "High" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function getColor(value: number, min: number, max: number, thresholds: GaugeThreshold[]): string {
  const normalized = ((value - min) / (max - min)) * 100;
  let color = thresholds[0]?.color ?? "#666";
  for (const t of thresholds) {
    if (normalized >= t.from) color = t.color;
  }
  return color;
}

function getZoneLabel(value: number, min: number, max: number, thresholds: GaugeThreshold[]): string | undefined {
  const normalized = ((value - min) / (max - min)) * 100;
  let label: string | undefined;
  for (const t of thresholds) {
    if (normalized >= t.from && t.label) label = t.label;
  }
  return label;
}

/* ------------------------------------------------------------------ */
/*  Mini Gauge SVG                                                    */
/* ------------------------------------------------------------------ */

function MiniGauge({
  config,
  size,
  onClick,
  expanded,
}: {
  config: GaugeConfig;
  size: number;
  onClick?: () => void;
  expanded: boolean;
}) {
  const min = config.min ?? 0;
  const max = config.max ?? 100;
  const thresholds = config.thresholds ?? DEFAULT_THRESHOLDS;
  const precision = config.precision ?? 0;

  const value = Math.max(min, Math.min(max, config.value));
  const ratio = (value - min) / (max - min);

  // Arc geometry (180-degree arc)
  const cx = size / 2;
  const cy = size * 0.55;
  const radius = size * 0.38;
  const strokeWidth = size * 0.08;

  const startAngle = Math.PI;
  const endAngle = 0;
  const valueAngle = startAngle - ratio * Math.PI;

  const arcX = (angle: number) => cx + radius * Math.cos(angle);
  const arcY = (angle: number) => cy - radius * Math.sin(angle);

  const bgArc = `M ${arcX(startAngle)} ${arcY(startAngle)} A ${radius} ${radius} 0 1 1 ${arcX(endAngle)} ${arcY(endAngle)}`;
  const valueArc = ratio > 0
    ? `M ${arcX(startAngle)} ${arcY(startAngle)} A ${radius} ${radius} 0 ${ratio > 0.5 ? 1 : 0} 1 ${arcX(valueAngle)} ${arcY(valueAngle)}`
    : "";

  const color = getColor(value, min, max, thresholds);
  const zoneLabel = getZoneLabel(value, min, max, thresholds);

  // Threshold zone arcs
  const thresholdArcs = useMemo(() => {
    const arcs: Array<{ path: string; color: string }> = [];
    for (let i = 0; i < thresholds.length; i++) {
      const from = thresholds[i].from / 100;
      const to = i < thresholds.length - 1 ? thresholds[i + 1].from / 100 : 1;

      const fromAngle = startAngle - from * Math.PI;
      const toAngle = startAngle - to * Math.PI;
      const largeArc = Math.abs(to - from) > 0.5 ? 1 : 0;

      arcs.push({
        path: `M ${arcX(fromAngle)} ${arcY(fromAngle)} A ${radius} ${radius} 0 ${largeArc} 1 ${arcX(toAngle)} ${arcY(toAngle)}`,
        color: thresholds[i].color,
      });
    }
    return arcs;
  }, [thresholds, radius, cx, cy]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter") onClick?.(); }}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-lg border p-2 transition-all cursor-pointer",
        expanded
          ? "border-white/30 bg-white/10 scale-110 shadow-lg z-10"
          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/5"
      )}
      style={{ width: expanded ? size * 1.5 : size + 16 }}
    >
      <svg
        width={expanded ? size * 1.3 : size}
        height={expanded ? size * 0.85 : size * 0.65}
        viewBox={`0 0 ${size} ${size * 0.65}`}
      >
        {/* Background zone arcs */}
        {expanded &&
          thresholdArcs.map((arc, i) => (
            <path
              key={i}
              d={arc.path}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth * 0.4}
              strokeLinecap="round"
              opacity={0.2}
            />
          ))}

        {/* Track */}
        <path
          d={bgArc}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Value arc */}
        {valueArc && (
          <path
            d={valueArc}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}

        {/* Value text */}
        <text
          x={cx}
          y={cy + 2}
          textAnchor="middle"
          className="font-bold"
          style={{ fontSize: expanded ? size * 0.18 : size * 0.16, fill: color }}
        >
          {value.toFixed(precision)}
          {config.unit && (
            <tspan style={{ fontSize: "0.65em", fill: "rgba(255,255,255,0.4)" }}>
              {config.unit}
            </tspan>
          )}
        </text>
      </svg>

      {/* Label */}
      <div
        className={cn(
          "text-center leading-tight text-white/70 font-medium",
          expanded ? "text-xs" : "text-[10px]"
        )}
      >
        {config.label}
      </div>

      {/* Zone label (expanded only) */}
      {expanded && zoneLabel && (
        <div
          className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase"
          style={{ color, backgroundColor: `${color}22` }}
        >
          {zoneLabel}
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="mt-1 flex w-full justify-between px-1 text-[9px] text-white/40">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Gauge Cluster                                                     */
/* ------------------------------------------------------------------ */

export function GaugeCluster({
  gauges,
  onGaugeClick,
  gaugeSize = 100,
  className,
}: GaugeClusterProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleClick = useCallback(
    (gauge: GaugeConfig) => {
      setExpandedId((prev) => (prev === gauge.id ? null : gauge.id));
      onGaugeClick?.(gauge);
    },
    [onGaugeClick]
  );

  return (
    <div className={cn("flex flex-wrap items-end justify-center gap-2", className)}>
      {gauges.map((gauge) => (
        <MiniGauge
          key={gauge.id}
          config={gauge}
          size={gaugeSize}
          onClick={() => handleClick(gauge)}
          expanded={expandedId === gauge.id}
        />
      ))}
    </div>
  );
}
