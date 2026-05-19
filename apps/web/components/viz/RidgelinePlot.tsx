"use client";

/**
 * Issue #480 - Ridgeline plot
 *
 * Stacked density curves per period, overlap with transparency,
 * vertical offset for 3D effect, color gradient by time,
 * click for details.
 */

import { useMemo, useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface RidgelineDataset {
  /** Period label (e.g. "Week 1", "Jan 2025"). */
  label: string;
  /** Raw values for density estimation. */
  values: number[];
  /** Optional metadata surfaced on click. */
  metadata?: Record<string, unknown>;
}

export interface RidgelinePlotProps {
  datasets: RidgelineDataset[];
  /** Chart width in px (default 600). */
  width?: number;
  /** Chart height in px (default 400). */
  height?: number;
  /** Vertical overlap ratio between ridges (0-1, default 0.5). */
  overlap?: number;
  /** Base opacity for fills (default 0.6). */
  fillOpacity?: number;
  /** Number of points for density estimation (default 100). */
  densityPoints?: number;
  /** Bandwidth for KDE (default auto). */
  bandwidth?: number;
  /** Start color of the time gradient (default "#818cf8"). */
  colorStart?: string;
  /** End color of the time gradient (default "#f472b6"). */
  colorEnd?: string;
  /** Callback when a ridge is clicked. */
  onRidgeClick?: (dataset: RidgelineDataset, index: number) => void;
  /** X-axis label (default "Score"). */
  xLabel?: string;
  className?: string;
}

interface DensityCurve {
  label: string;
  points: { x: number; y: number }[];
  maxDensity: number;
  dataset: RidgelineDataset;
}

/* ------------------------------------------------------------------ */
/*  KDE (Kernel Density Estimation)                                   */
/* ------------------------------------------------------------------ */

function gaussianKernel(u: number): number {
  return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * u * u);
}

function silvermanBandwidth(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0.1;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)
  );
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  const spread = Math.min(std, iqr / 1.34);
  return 0.9 * spread * Math.pow(n, -0.2);
}

function kde(
  values: number[],
  nPoints: number,
  bandwidth: number,
  domain: [number, number]
): { x: number; y: number }[] {
  const [xMin, xMax] = domain;
  const step = (xMax - xMin) / (nPoints - 1);
  const n = values.length;
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i < nPoints; i++) {
    const x = xMin + i * step;
    let density = 0;
    for (const v of values) {
      density += gaussianKernel((x - v) / bandwidth);
    }
    density /= n * bandwidth;
    points.push({ x, y: density });
  }

  return points;
}

/* ------------------------------------------------------------------ */
/*  Color interpolation                                               */
/* ------------------------------------------------------------------ */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((c) => Math.round(c).toString(16).padStart(2, "0"))
    .join("")}`;
}

function interpolateColor(
  start: string,
  end: string,
  t: number
): string {
  const [r1, g1, b1] = hexToRgb(start);
  const [r2, g2, b2] = hexToRgb(end);
  return rgbToHex(
    r1 + (r2 - r1) * t,
    g1 + (g2 - g1) * t,
    b1 + (b2 - b1) * t
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function RidgelinePlot({
  datasets,
  width = 600,
  height = 400,
  overlap = 0.5,
  fillOpacity = 0.6,
  densityPoints = 100,
  bandwidth: userBandwidth,
  colorStart = "#818cf8",
  colorEnd = "#f472b6",
  onRidgeClick,
  xLabel = "Score",
  className,
}: RidgelinePlotProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Margins
  const ml = 80;
  const mr = 20;
  const mt = 20;
  const mb = 40;
  const plotW = width - ml - mr;
  const plotH = height - mt - mb;

  // Compute global domain
  const allValues = useMemo(
    () => datasets.flatMap((d) => d.values),
    [datasets]
  );
  const domain = useMemo<[number, number]>(() => {
    if (allValues.length === 0) return [0, 1];
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const pad = (max - min) * 0.1 || 0.1;
    return [min - pad, max + pad];
  }, [allValues]);

  // Compute density curves
  const curves = useMemo<DensityCurve[]>(() => {
    return datasets.map((ds) => {
      const bw = userBandwidth ?? silvermanBandwidth(ds.values);
      const pts =
        ds.values.length > 0
          ? kde(ds.values, densityPoints, Math.max(bw, 0.01), domain)
          : [];
      const maxDensity = pts.reduce(
        (max, p) => Math.max(max, p.y),
        0
      );
      return {
        label: ds.label,
        points: pts,
        maxDensity,
        dataset: ds,
      };
    });
  }, [datasets, densityPoints, domain, userBandwidth]);

  // Global max density for normalization
  const globalMaxDensity = useMemo(
    () => Math.max(...curves.map((c) => c.maxDensity), 0.001),
    [curves]
  );

  // Ridge layout: each ridge gets a vertical slot
  const n = curves.length;
  const ridgeHeight = n > 0 ? plotH / (n * (1 - overlap) + overlap) : plotH;
  const ridgeStep = ridgeHeight * (1 - overlap);

  // Scales
  const xScale = useCallback(
    (val: number) => {
      return ml + ((val - domain[0]) / (domain[1] - domain[0])) * plotW;
    },
    [ml, plotW, domain]
  );

  const handleClick = useCallback(
    (idx: number) => {
      setSelectedIndex((prev) => (prev === idx ? null : idx));
      if (onRidgeClick) {
        onRidgeClick(datasets[idx], idx);
      }
    },
    [datasets, onRidgeClick]
  );

  // Generate X-axis ticks
  const xTicks = useMemo(() => {
    const count = 5;
    const ticks: number[] = [];
    for (let i = 0; i <= count; i++) {
      ticks.push(domain[0] + (i / count) * (domain[1] - domain[0]));
    }
    return ticks;
  }, [domain]);

  return (
    <div className={cn("inline-block", className)}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="select-none"
      >
        {/* X axis */}
        <line
          x1={ml}
          y1={height - mb}
          x2={width - mr}
          y2={height - mb}
          stroke="currentColor"
          strokeOpacity={0.2}
        />
        {xTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={xScale(tick)}
              y1={height - mb}
              x2={xScale(tick)}
              y2={height - mb + 4}
              stroke="currentColor"
              strokeOpacity={0.3}
            />
            <text
              x={xScale(tick)}
              y={height - mb + 16}
              textAnchor="middle"
              className="fill-neutral-500 text-[10px]"
            >
              {tick.toFixed(2)}
            </text>
          </g>
        ))}
        <text
          x={ml + plotW / 2}
          y={height - 4}
          textAnchor="middle"
          className="fill-neutral-500 text-[11px]"
        >
          {xLabel}
        </text>

        {/* Ridges (drawn bottom to top for proper overlap) */}
        {curves.map((curve, idx) => {
          const reversedIdx = n - 1 - idx;
          const baseY = mt + reversedIdx * ridgeStep + ridgeHeight;
          const color = interpolateColor(
            colorStart,
            colorEnd,
            n > 1 ? idx / (n - 1) : 0
          );
          const isHovered = hoveredIndex === idx;
          const isSelected = selectedIndex === idx;

          // Build path
          if (curve.points.length === 0) return null;

          const pathPoints = curve.points.map((p) => {
            const x = xScale(p.x);
            const y =
              baseY -
              (p.y / globalMaxDensity) * ridgeHeight * 0.85;
            return { x, y };
          });

          const pathD =
            `M ${xScale(domain[0])},${baseY} ` +
            pathPoints.map((p) => `L ${p.x},${p.y}`).join(" ") +
            ` L ${xScale(domain[1])},${baseY} Z`;

          const strokeD =
            `M ${pathPoints[0].x},${pathPoints[0].y} ` +
            pathPoints
              .slice(1)
              .map((p) => `L ${p.x},${p.y}`)
              .join(" ");

          return (
            <g
              key={curve.label}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => handleClick(idx)}
            >
              {/* Fill */}
              <path
                d={pathD}
                fill={color}
                fillOpacity={
                  isHovered || isSelected
                    ? Math.min(fillOpacity + 0.2, 1)
                    : fillOpacity
                }
              />
              {/* Stroke */}
              <path
                d={strokeD}
                fill="none"
                stroke={color}
                strokeWidth={isHovered || isSelected ? 2 : 1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Label */}
              <text
                x={ml - 8}
                y={baseY - ridgeHeight * 0.3}
                textAnchor="end"
                className={cn(
                  "text-[10px]",
                  isHovered || isSelected
                    ? "fill-neutral-800 font-medium dark:fill-neutral-100"
                    : "fill-neutral-500"
                )}
              >
                {curve.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Detail panel */}
      {selectedIndex !== null && datasets[selectedIndex] && (
        <div className="mt-2 rounded-md border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-700 dark:bg-neutral-800">
          <div className="mb-1 font-medium text-neutral-800 dark:text-neutral-100">
            {datasets[selectedIndex].label}
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-neutral-600 dark:text-neutral-400">
            <div>
              <span className="font-medium">N:</span>{" "}
              {datasets[selectedIndex].values.length}
            </div>
            <div>
              <span className="font-medium">Mean:</span>{" "}
              {datasets[selectedIndex].values.length > 0
                ? (
                    datasets[selectedIndex].values.reduce(
                      (a, b) => a + b,
                      0
                    ) / datasets[selectedIndex].values.length
                  ).toFixed(3)
                : "-"}
            </div>
            <div>
              <span className="font-medium">Std:</span>{" "}
              {datasets[selectedIndex].values.length > 1
                ? (() => {
                    const vals = datasets[selectedIndex].values;
                    const m =
                      vals.reduce((a, b) => a + b, 0) / vals.length;
                    return Math.sqrt(
                      vals.reduce((s, v) => s + (v - m) ** 2, 0) /
                        (vals.length - 1)
                    ).toFixed(3);
                  })()
                : "-"}
            </div>
          </div>
          {datasets[selectedIndex].metadata && (
            <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              {Object.entries(
                datasets[selectedIndex].metadata!
              ).map(([k, v]) => (
                <span key={k} className="mr-3">
                  <span className="font-medium">{k}:</span>{" "}
                  {String(v)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
