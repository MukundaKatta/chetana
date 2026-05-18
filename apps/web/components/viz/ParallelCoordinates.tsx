"use client";

import { useMemo, useState, useCallback } from "react";
import * as d3 from "d3";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ParallelCoordinatesDataPoint {
  /** Display name of the model. */
  model: string;
  /** Indicator name -> value (0-1 expected). */
  values: Record<string, number>;
}

export interface ParallelCoordinatesProps {
  data: ParallelCoordinatesDataPoint[];
  /** Chart width (default 700). */
  width?: number;
  /** Chart height (default 400). */
  height?: number;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function ParallelCoordinates({
  data,
  width = 700,
  height = 400,
  className,
}: ParallelCoordinatesProps) {
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);

  const margin = { top: 30, right: 30, bottom: 20, left: 30 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  /** Derive indicator names from the first data point. */
  const indicators = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0].values);
  }, [data]);

  /** Color scale for models. */
  const colorScale = useMemo(() => {
    const scale = d3.scaleOrdinal(d3.schemeTableau10);
    return (model: string) => scale(model);
  }, []);

  /** X position for each indicator axis. */
  const xForAxis = useCallback(
    (i: number) => (indicators.length <= 1 ? innerW / 2 : (i / (indicators.length - 1)) * innerW),
    [indicators, innerW],
  );

  /** Y scales per indicator (auto domain from data). */
  const yScales = useMemo(() => {
    const scales: Record<string, d3.ScaleLinear<number, number>> = {};
    for (const ind of indicators) {
      const allValues = data.map((d) => d.values[ind] ?? 0);
      const lo = Math.min(0, ...allValues);
      const hi = Math.max(1, ...allValues);
      scales[ind] = d3.scaleLinear().domain([lo, hi]).range([innerH, 0]);
    }
    return scales;
  }, [data, indicators, innerH]);

  /** Build a polyline path for a given data point. */
  const pathFor = useCallback(
    (dp: ParallelCoordinatesDataPoint) => {
      return indicators
        .map((ind, i) => {
          const x = xForAxis(i);
          const y = yScales[ind](dp.values[ind] ?? 0);
          return `${i === 0 ? "M" : "L"} ${x} ${y}`;
        })
        .join(" ");
    },
    [indicators, xForAxis, yScales],
  );

  /** Y-axis tick values. */
  const ticks = [0, 0.25, 0.5, 0.75, 1.0];

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="w-full overflow-visible rounded-xl border border-white/8 bg-white/[0.02]"
      >
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Axes */}
          {indicators.map((ind, i) => {
            const x = xForAxis(i);
            const scale = yScales[ind];
            return (
              <g key={ind}>
                {/* Vertical axis line */}
                <line
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={innerH}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth={1}
                />

                {/* Axis label */}
                <text
                  x={x}
                  y={-12}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.6)"
                  fontSize={10}
                  fontWeight={600}
                >
                  {ind}
                </text>

                {/* Tick marks */}
                {ticks.map((t) => {
                  const y = scale(t);
                  return (
                    <g key={t}>
                      <line
                        x1={x - 3}
                        y1={y}
                        x2={x + 3}
                        y2={y}
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth={1}
                      />
                      {i === 0 && (
                        <text
                          x={x - 8}
                          y={y}
                          textAnchor="end"
                          dominantBaseline="central"
                          fill="rgba(255,255,255,0.3)"
                          fontSize={8}
                        >
                          {t.toFixed(2)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Polylines */}
          {data.map((dp) => {
            const dimmed = hoveredModel !== null && hoveredModel !== dp.model;
            return (
              <path
                key={dp.model}
                d={pathFor(dp)}
                fill="none"
                stroke={colorScale(dp.model)}
                strokeWidth={dimmed ? 1 : 2.5}
                strokeOpacity={dimmed ? 0.1 : 0.8}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHoveredModel(dp.model)}
                onMouseLeave={() => setHoveredModel(null)}
              />
            );
          })}

          {/* Data point dots on hover */}
          {hoveredModel &&
            data
              .filter((dp) => dp.model === hoveredModel)
              .map((dp) =>
                indicators.map((ind, i) => (
                  <circle
                    key={`${dp.model}-${ind}`}
                    cx={xForAxis(i)}
                    cy={yScales[ind](dp.values[ind] ?? 0)}
                    r={4}
                    fill={colorScale(dp.model)}
                    stroke="rgba(0,0,0,0.4)"
                    strokeWidth={1}
                  />
                )),
              )}
        </g>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3">
        {data.map((dp) => (
          <button
            key={dp.model}
            type="button"
            onMouseEnter={() => setHoveredModel(dp.model)}
            onMouseLeave={() => setHoveredModel(null)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              hoveredModel === dp.model
                ? "border-white/20 bg-white/[0.08] text-neutral-200"
                : "border-white/10 bg-white/[0.04] text-neutral-400 hover:bg-white/[0.06]",
            )}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: colorScale(dp.model) }}
            />
            {dp.model}
          </button>
        ))}
      </div>
    </div>
  );
}
