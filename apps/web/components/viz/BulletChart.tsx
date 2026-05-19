/**
 * Bullet chart: qualitative ranges, comparative measure (target),
 * featured measure (actual), stacked vertically, convention colors
 * (Issue #504).
 */

"use client";

import { useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QualitativeRange {
  label: string;
  max: number;
  color: string;
}

export interface BulletChartDatum {
  /** Unique key. */
  id: string;
  /** Display label (e.g. theory name). */
  label: string;
  /** Featured measure (actual value). */
  actual: number;
  /** Comparative measure (target value). */
  target: number;
  /** Subtitle text, e.g. units. */
  subtitle?: string;
  /** Custom qualitative ranges. Falls back to chart-level defaults. */
  ranges?: QualitativeRange[];
}

export interface BulletChartProps {
  data: BulletChartDatum[];
  /** Scale maximum. Derived from data if omitted. */
  max?: number;
  /** Default qualitative ranges for all bullets. */
  ranges?: QualitativeRange[];
  /** Height of each bullet bar in px. */
  barHeight?: number;
  /** Gap between stacked bullets in px. */
  gap?: number;
  /** Width of the label area in px. */
  labelWidth?: number;
  /** Show numeric values on hover. */
  showTooltips?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Defaults – Stephen Few convention colors (dark mode adjusted)
// ---------------------------------------------------------------------------

function defaultRanges(scaleMax: number): QualitativeRange[] {
  return [
    { label: "Poor", max: scaleMax * 0.35, color: "#374151" },
    { label: "Satisfactory", max: scaleMax * 0.65, color: "#4b5563" },
    { label: "Good", max: scaleMax, color: "#6b7280" },
  ];
}

// ---------------------------------------------------------------------------
// Single bullet row
// ---------------------------------------------------------------------------

interface BulletRowProps {
  datum: BulletChartDatum;
  scaleMax: number;
  chartRanges: QualitativeRange[];
  barHeight: number;
  labelWidth: number;
  showTooltips: boolean;
}

function BulletRow({
  datum,
  scaleMax,
  chartRanges,
  barHeight,
  labelWidth,
  showTooltips,
}: BulletRowProps): ReactNode {
  const ranges = datum.ranges ?? chartRanges;

  const toPercent = (v: number) => Math.min((v / scaleMax) * 100, 100);
  const actualWidth = toPercent(datum.actual);
  const targetPos = toPercent(datum.target);

  const featuredHeight = barHeight * 0.4;
  const markerHeight = barHeight * 0.7;
  const markerWidth = 3;

  return (
    <div className="group flex items-center" role="row">
      {/* Label */}
      <div
        className="shrink-0 pr-3 text-right"
        style={{ width: labelWidth }}
      >
        <div className="text-sm font-medium text-gray-200 leading-tight">
          {datum.label}
        </div>
        {datum.subtitle && (
          <div className="text-[10px] text-gray-500">{datum.subtitle}</div>
        )}
      </div>

      {/* Chart area */}
      <div className="relative flex-1" style={{ height: barHeight }}>
        {/* Qualitative ranges (background) */}
        {ranges.map((range, idx) => {
          const prevMax = idx > 0 ? ranges[idx - 1].max : 0;
          const left = toPercent(prevMax);
          const width = toPercent(range.max) - left;
          return (
            <div
              key={range.label}
              className="absolute top-0 h-full"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: range.color,
              }}
              title={showTooltips ? range.label : undefined}
            />
          );
        })}

        {/* Featured measure (actual bar) */}
        <div
          className="absolute left-0 rounded-r-sm bg-blue-400 transition-[width] duration-500"
          style={{
            top: (barHeight - featuredHeight) / 2,
            height: featuredHeight,
            width: `${actualWidth}%`,
          }}
          title={showTooltips ? `Actual: ${datum.actual.toFixed(2)}` : undefined}
        />

        {/* Comparative measure (target marker) */}
        <div
          className="absolute bg-white transition-[left] duration-500"
          style={{
            left: `${targetPos}%`,
            top: (barHeight - markerHeight) / 2,
            height: markerHeight,
            width: markerWidth,
            transform: "translateX(-50%)",
          }}
          title={showTooltips ? `Target: ${datum.target.toFixed(2)}` : undefined}
        />

        {/* Tooltip on hover */}
        {showTooltips && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-end pr-2 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="rounded bg-gray-900/90 px-1.5 py-0.5 text-[10px] font-medium text-gray-100 shadow">
              {datum.actual.toFixed(2)} / {datum.target.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BulletChart({
  data,
  max: maxProp,
  ranges: rangesProp,
  barHeight = 32,
  gap = 12,
  labelWidth = 120,
  showTooltips = true,
  className,
}: BulletChartProps): ReactNode {
  const scaleMax = useMemo(() => {
    if (maxProp !== undefined) return maxProp;
    let m = 0;
    for (const d of data) {
      m = Math.max(m, d.actual, d.target);
      if (d.ranges) {
        for (const r of d.ranges) m = Math.max(m, r.max);
      }
    }
    // Round up to nice number
    return Math.ceil(m * 1.1 * 10) / 10 || 1;
  }, [data, maxProp]);

  const chartRanges = useMemo(
    () => rangesProp ?? defaultRanges(scaleMax),
    [rangesProp, scaleMax]
  );

  return (
    <div
      className={cn("w-full", className)}
      role="table"
      aria-label="Bullet chart"
    >
      {data.map((datum, idx) => (
        <div
          key={datum.id}
          style={{ marginBottom: idx < data.length - 1 ? gap : 0 }}
        >
          <BulletRow
            datum={datum}
            scaleMax={scaleMax}
            chartRanges={chartRanges}
            barHeight={barHeight}
            labelWidth={labelWidth}
            showTooltips={showTooltips}
          />
        </div>
      ))}

      {/* Legend */}
      <div
        className="mt-3 flex flex-wrap items-center gap-4 text-[10px] text-gray-400"
        style={{ paddingLeft: labelWidth }}
      >
        {chartRanges.map((range) => (
          <span key={range.label} className="flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-4 rounded-sm"
              style={{ backgroundColor: range.color }}
            />
            {range.label}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-4 rounded-sm bg-blue-400" />
          Actual
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-[3px] bg-white" />
          Target
        </span>
      </div>
    </div>
  );
}
