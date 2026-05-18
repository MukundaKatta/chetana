"use client";

import { useMemo, useState } from "react";
import * as d3 from "d3";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface DonutSegment {
  /** Segment label (e.g. theory name). */
  name: string;
  /** Numeric value (will be normalised to percentage). */
  value: number;
  /** Optional override colour. */
  color?: string;
}

export interface DonutChartProps {
  segments: DonutSegment[];
  /** Text shown in the centre hole (default: overall score). */
  centerLabel?: string;
  /** Numeric value in the centre (default: sum). */
  centerValue?: number;
  /** Diameter of the chart (default 280). */
  size?: number;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function DonutChart({
  segments,
  centerLabel,
  centerValue,
  size = 280,
  className,
}: DonutChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size / 2 - 16;
  const innerRadius = outerRadius * 0.58;
  const total = useMemo(() => segments.reduce((s, seg) => s + seg.value, 0), [segments]);

  const colorScale = useMemo(() => {
    const scale = d3.scaleOrdinal(d3.schemeTableau10);
    return (i: number) => segments[i]?.color ?? scale(String(i));
  }, [segments]);

  /** Compute arcs using d3.arc + d3.pie. */
  const arcs = useMemo(() => {
    const pie = d3
      .pie<DonutSegment>()
      .value((d) => d.value)
      .sort(null)
      .padAngle(0.02);

    const arcGen = d3
      .arc<d3.PieArcDatum<DonutSegment>>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .cornerRadius(3);

    return pie(segments).map((d, i) => ({
      path: arcGen(d) ?? "",
      data: d.data,
      index: i,
      startAngle: d.startAngle,
      endAngle: d.endAngle,
      percentage: total > 0 ? (d.data.value / total) * 100 : 0,
    }));
  }, [segments, innerRadius, outerRadius, total]);

  /** Circumference for animated stroke-dashoffset entry. */
  const circumference = 2 * Math.PI * ((outerRadius + innerRadius) / 2);

  const displayValue =
    centerValue !== undefined
      ? centerValue
      : total;

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        <g transform={`translate(${cx},${cy})`}>
          {/* Arcs */}
          {arcs.map((arc) => {
            const dimmed = hoveredIndex !== null && hoveredIndex !== arc.index;
            return (
              <path
                key={arc.index}
                d={arc.path}
                fill={colorScale(arc.index)}
                fillOpacity={dimmed ? 0.2 : 0.85}
                stroke="rgba(0,0,0,0.3)"
                strokeWidth={1}
                className="cursor-pointer transition-all duration-200"
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: 0,
                  animation: `donut-entry 0.8s ease-out`,
                }}
                onMouseEnter={() => setHoveredIndex(arc.index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}

          {/* Centre text */}
          <text
            x={0}
            y={-6}
            textAnchor="middle"
            dominantBaseline="central"
            fill="rgba(255,255,255,0.95)"
            fontSize={28}
            fontWeight={700}
            className="tabular-nums"
          >
            {typeof displayValue === "number"
              ? displayValue <= 1
                ? `${(displayValue * 100).toFixed(0)}%`
                : displayValue.toFixed(1)
              : displayValue}
          </text>
          <text
            x={0}
            y={18}
            textAnchor="middle"
            dominantBaseline="central"
            fill="rgba(255,255,255,0.4)"
            fontSize={11}
            fontWeight={500}
          >
            {centerLabel ?? "Overall"}
          </text>
        </g>

        {/* CSS keyframes for animated entry */}
        <defs>
          <style>{`
            @keyframes donut-entry {
              from { opacity: 0; transform: scale(0.85); }
              to   { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </defs>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3">
        {arcs.map((arc) => (
          <button
            key={arc.index}
            type="button"
            onMouseEnter={() => setHoveredIndex(arc.index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              hoveredIndex === arc.index
                ? "border-white/20 bg-white/[0.08] text-neutral-200"
                : "border-white/10 bg-white/[0.04] text-neutral-400 hover:bg-white/[0.06]",
            )}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: colorScale(arc.index) }}
            />
            {arc.data.name}
            <span className="text-neutral-500">{arc.percentage.toFixed(1)}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}
