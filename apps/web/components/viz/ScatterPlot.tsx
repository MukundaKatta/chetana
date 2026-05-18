"use client";

import { useMemo, useState, useRef } from "react";
import * as d3 from "d3";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ScatterDataPoint {
  /** Label for hover tooltip. */
  label: string;
  /** X-axis value. */
  x: number;
  /** Y-axis value. */
  y: number;
  /** Optional colour override. */
  color?: string;
}

export interface ScatterPlotProps {
  data: ScatterDataPoint[];
  /** X-axis label. */
  xLabel?: string;
  /** Y-axis label. */
  yLabel?: string;
  /** Show linear regression line (default true). */
  showRegression?: boolean;
  /** Chart width (default 500). */
  width?: number;
  /** Chart height (default 400). */
  height?: number;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Regression helpers                                                */
/* ------------------------------------------------------------------ */

interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
}

function linearRegression(points: { x: number; y: number }[]): RegressionResult {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;
  let sumYY = 0;

  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXX += p.x * p.x;
    sumXY += p.x * p.y;
    sumYY += p.y * p.y;
  }

  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return { slope: 0, intercept: sumY / n, rSquared: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const meanY = sumY / n;
  let ssRes = 0;
  let ssTot = 0;
  for (const p of points) {
    const predicted = slope * p.x + intercept;
    ssRes += (p.y - predicted) ** 2;
    ssTot += (p.y - meanY) ** 2;
  }
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, rSquared };
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function ScatterPlot({
  data,
  xLabel = "X",
  yLabel = "Y",
  showRegression = true,
  width = 500,
  height = 400,
  className,
}: ScatterPlotProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const margin = { top: 20, right: 20, bottom: 50, left: 54 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const defaultColor = "#56B4E9";

  /** Axis domains with a small padding. */
  const xDomain = useMemo(() => {
    const xs = data.map((d) => d.x);
    const lo = Math.min(...xs);
    const hi = Math.max(...xs);
    const pad = (hi - lo) * 0.08 || 0.1;
    return [lo - pad, hi + pad] as const;
  }, [data]);

  const yDomain = useMemo(() => {
    const ys = data.map((d) => d.y);
    const lo = Math.min(...ys);
    const hi = Math.max(...ys);
    const pad = (hi - lo) * 0.08 || 0.1;
    return [lo - pad, hi + pad] as const;
  }, [data]);

  const xScale = useMemo(
    () => d3.scaleLinear().domain(xDomain).range([0, innerW]),
    [xDomain, innerW],
  );

  const yScale = useMemo(
    () => d3.scaleLinear().domain(yDomain).range([innerH, 0]),
    [yDomain, innerH],
  );

  const regression = useMemo(
    () => (showRegression ? linearRegression(data) : null),
    [data, showRegression],
  );

  /** X ticks. */
  const xTicks = useMemo(() => xScale.ticks(6), [xScale]);
  const yTicks = useMemo(() => yScale.ticks(6), [yScale]);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="w-full rounded-xl border border-white/8 bg-white/[0.02]"
      >
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Grid */}
          {xTicks.map((t) => (
            <line
              key={`xg-${t}`}
              x1={xScale(t)}
              y1={0}
              x2={xScale(t)}
              y2={innerH}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={1}
            />
          ))}
          {yTicks.map((t) => (
            <line
              key={`yg-${t}`}
              x1={0}
              y1={yScale(t)}
              x2={innerW}
              y2={yScale(t)}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={1}
            />
          ))}

          {/* X-axis labels */}
          {xTicks.map((t) => (
            <text
              key={`xl-${t}`}
              x={xScale(t)}
              y={innerH + 18}
              textAnchor="middle"
              fill="rgba(255,255,255,0.35)"
              fontSize={9}
            >
              {t.toFixed(2)}
            </text>
          ))}

          {/* Y-axis labels */}
          {yTicks.map((t) => (
            <text
              key={`yl-${t}`}
              x={-8}
              y={yScale(t)}
              textAnchor="end"
              dominantBaseline="central"
              fill="rgba(255,255,255,0.35)"
              fontSize={9}
            >
              {t.toFixed(2)}
            </text>
          ))}

          {/* Axis titles */}
          <text
            x={innerW / 2}
            y={innerH + 38}
            textAnchor="middle"
            fill="rgba(255,255,255,0.5)"
            fontSize={11}
            fontWeight={600}
          >
            {xLabel}
          </text>
          <text
            x={0}
            y={0}
            textAnchor="middle"
            fill="rgba(255,255,255,0.5)"
            fontSize={11}
            fontWeight={600}
            transform={`translate(${-40},${innerH / 2}) rotate(-90)`}
          >
            {yLabel}
          </text>

          {/* Regression line */}
          {regression && showRegression && (
            <>
              <line
                x1={xScale(xDomain[0])}
                y1={yScale(regression.slope * xDomain[0] + regression.intercept)}
                x2={xScale(xDomain[1])}
                y2={yScale(regression.slope * xDomain[1] + regression.intercept)}
                stroke="rgba(255,255,255,0.35)"
                strokeWidth={1.5}
                strokeDasharray="6 4"
              />
              {/* R-squared label */}
              <text
                x={innerW - 4}
                y={12}
                textAnchor="end"
                fill="rgba(255,255,255,0.5)"
                fontSize={11}
                fontWeight={600}
              >
                R&sup2; = {regression.rSquared.toFixed(3)}
              </text>
            </>
          )}

          {/* Data points */}
          {data.map((dp, i) => {
            const dimmed = hoveredIndex !== null && hoveredIndex !== i;
            return (
              <circle
                key={i}
                cx={xScale(dp.x)}
                cy={yScale(dp.y)}
                r={hoveredIndex === i ? 6 : 4.5}
                fill={dp.color ?? defaultColor}
                fillOpacity={dimmed ? 0.15 : 0.85}
                stroke={hoveredIndex === i ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.3)"}
                strokeWidth={hoveredIndex === i ? 2 : 1}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={(e) => {
                  setHoveredIndex(i);
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    setTooltip({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top - 12,
                      text: `${dp.label}: (${dp.x.toFixed(3)}, ${dp.y.toFixed(3)})`,
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
                onMouseLeave={() => {
                  setHoveredIndex(null);
                  setTooltip(null);
                }}
              />
            );
          })}
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 rounded-lg border border-white/15 bg-neutral-900 px-3 py-1.5 shadow-xl"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <span className="text-[11px] font-medium tabular-nums text-neutral-200">
            {tooltip.text}
          </span>
        </div>
      )}
    </div>
  );
}
