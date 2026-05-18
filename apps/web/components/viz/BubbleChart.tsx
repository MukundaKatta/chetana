"use client";

/**
 * Issue #427 - Bubble chart for model clustering
 *
 * X/Y for two theory scores, size for overall,
 * color by provider, cluster boundaries (convex hull),
 * zoom to cluster on click.
 */

import { useState, useMemo, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import type { ModelProvider, Theory } from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface BubbleDataPoint {
  id: string;
  label: string;
  x: number;
  y: number;
  size: number;
  provider: ModelProvider;
  cluster?: string;
  metadata?: Record<string, unknown>;
}

export interface BubbleChartProps {
  data: BubbleDataPoint[];
  /** Theory label for X axis. */
  xLabel?: string;
  /** Theory label for Y axis. */
  yLabel?: string;
  /** Chart width in px (default 600). */
  width?: number;
  /** Chart height in px (default 400). */
  height?: number;
  /** Show convex hull boundaries for clusters. */
  showClusters?: boolean;
  /** Called when a bubble is clicked. */
  onBubbleClick?: (point: BubbleDataPoint) => void;
  /** Called when a cluster is clicked (zooms to cluster). */
  onClusterClick?: (clusterId: string, points: BubbleDataPoint[]) => void;
  /** Min bubble radius (default 6). */
  minRadius?: number;
  /** Max bubble radius (default 30). */
  maxRadius?: number;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const PROVIDER_COLORS: Record<ModelProvider, string> = {
  anthropic: "#d4a574",
  openai: "#74d4a5",
  google: "#7494d4",
  ollama: "#d474a5",
  mistral: "#a5d474",
  deepseek: "#d4d474",
  openrouter: "#a574d4",
};

const PADDING = { top: 30, right: 30, bottom: 50, left: 60 };

/* ------------------------------------------------------------------ */
/*  Convex Hull (Graham scan)                                        */
/* ------------------------------------------------------------------ */

interface Point2D {
  x: number;
  y: number;
}

function cross(O: Point2D, A: Point2D, B: Point2D): number {
  return (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x);
}

function convexHull(points: Point2D[]): Point2D[] {
  if (points.length < 3) return [...points];

  const sorted = [...points].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const n = sorted.length;

  const lower: Point2D[] = [];
  for (let i = 0; i < n; i++) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], sorted[i]) <= 0) {
      lower.pop();
    }
    lower.push(sorted[i]);
  }

  const upper: Point2D[] = [];
  for (let i = n - 1; i >= 0; i--) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], sorted[i]) <= 0) {
      upper.pop();
    }
    upper.push(sorted[i]);
  }

  // Remove last point of each half because it's repeated
  lower.pop();
  upper.pop();

  return [...lower, ...upper];
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function BubbleChart({
  data,
  xLabel = "X Score",
  yLabel = "Y Score",
  width = 600,
  height = 400,
  showClusters = true,
  onBubbleClick,
  onClusterClick,
  minRadius = 6,
  maxRadius = 30,
  className,
}: BubbleChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [zoomedCluster, setZoomedCluster] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const innerWidth = width - PADDING.left - PADDING.right;
  const innerHeight = height - PADDING.top - PADDING.bottom;

  // Filter to zoomed cluster if active
  const visibleData = useMemo(() => {
    if (!zoomedCluster) return data;
    return data.filter((d) => d.cluster === zoomedCluster);
  }, [data, zoomedCluster]);

  // Scales
  const scales = useMemo(() => {
    const xValues = visibleData.map((d) => d.x);
    const yValues = visibleData.map((d) => d.y);
    const sizeValues = visibleData.map((d) => d.size);

    const xMin = Math.min(...xValues, 0);
    const xMax = Math.max(...xValues, 1);
    const yMin = Math.min(...yValues, 0);
    const yMax = Math.max(...yValues, 1);
    const sizeMin = Math.min(...sizeValues, 0);
    const sizeMax = Math.max(...sizeValues, 1);

    const xPad = (xMax - xMin) * 0.1 || 0.1;
    const yPad = (yMax - yMin) * 0.1 || 0.1;

    return {
      x: (v: number) => ((v - (xMin - xPad)) / (xMax - xMin + xPad * 2)) * innerWidth,
      y: (v: number) => innerHeight - ((v - (yMin - yPad)) / (yMax - yMin + yPad * 2)) * innerHeight,
      r: (v: number) => {
        const range = sizeMax - sizeMin || 1;
        const normalized = (v - sizeMin) / range;
        return minRadius + normalized * (maxRadius - minRadius);
      },
      xDomain: [xMin - xPad, xMax + xPad] as [number, number],
      yDomain: [yMin - yPad, yMax + yPad] as [number, number],
    };
  }, [visibleData, innerWidth, innerHeight, minRadius, maxRadius]);

  // Cluster groups
  const clusters = useMemo(() => {
    if (!showClusters) return new Map<string, BubbleDataPoint[]>();
    const map = new Map<string, BubbleDataPoint[]>();
    for (const point of visibleData) {
      if (!point.cluster) continue;
      const group = map.get(point.cluster) ?? [];
      group.push(point);
      map.set(point.cluster, group);
    }
    return map;
  }, [visibleData, showClusters]);

  // Compute hull paths
  const hullPaths = useMemo(() => {
    const paths: Array<{ clusterId: string; path: string; color: string }> = [];

    for (const [clusterId, points] of clusters) {
      if (points.length < 3) continue;

      const screenPoints = points.map((p) => ({
        x: scales.x(p.x),
        y: scales.y(p.y),
      }));

      const hull = convexHull(screenPoints);
      if (hull.length < 3) continue;

      // Offset hull outward for padding
      const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length;
      const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length;
      const expanded = hull.map((p) => ({
        x: p.x + (p.x - cx) * 0.15,
        y: p.y + (p.y - cy) * 0.15,
      }));

      const d = expanded.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
      const color = PROVIDER_COLORS[points[0].provider] ?? "#888";

      paths.push({ clusterId, path: d, color });
    }

    return paths;
  }, [clusters, scales]);

  const handleBubbleClick = useCallback(
    (point: BubbleDataPoint) => {
      onBubbleClick?.(point);
    },
    [onBubbleClick],
  );

  const handleClusterClick = useCallback(
    (clusterId: string) => {
      if (zoomedCluster === clusterId) {
        setZoomedCluster(null);
      } else {
        setZoomedCluster(clusterId);
        const points = clusters.get(clusterId) ?? [];
        onClusterClick?.(clusterId, points);
      }
    },
    [zoomedCluster, clusters, onClusterClick],
  );

  // Axis ticks
  const xTicks = useMemo(() => {
    const [lo, hi] = scales.xDomain;
    const step = (hi - lo) / 5;
    return Array.from({ length: 6 }, (_, i) => lo + step * i);
  }, [scales.xDomain]);

  const yTicks = useMemo(() => {
    const [lo, hi] = scales.yDomain;
    const step = (hi - lo) / 5;
    return Array.from({ length: 6 }, (_, i) => lo + step * i);
  }, [scales.yDomain]);

  // Provider legend
  const activeProviders = useMemo(() => {
    const set = new Set(visibleData.map((d) => d.provider));
    return Array.from(set);
  }, [visibleData]);

  if (data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center text-white/40 text-sm", className)} style={{ width, height }}>
        No data to display
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Zoom reset button */}
      {zoomedCluster && (
        <button
          type="button"
          onClick={() => setZoomedCluster(null)}
          className="absolute top-2 right-2 z-10 text-xs text-white/60 hover:text-white bg-white/10 rounded px-2 py-1"
        >
          Reset zoom
        </button>
      )}

      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="overflow-visible"
        role="img"
        aria-label="Bubble chart showing model score clustering"
      >
        <g transform={`translate(${PADDING.left}, ${PADDING.top})`}>
          {/* Grid lines */}
          {xTicks.map((tick) => (
            <line
              key={`xg-${tick}`}
              x1={scales.x(tick)}
              y1={0}
              x2={scales.x(tick)}
              y2={innerHeight}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={1}
            />
          ))}
          {yTicks.map((tick) => (
            <line
              key={`yg-${tick}`}
              x1={0}
              y1={scales.y(tick)}
              x2={innerWidth}
              y2={scales.y(tick)}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={1}
            />
          ))}

          {/* Cluster hulls */}
          {hullPaths.map(({ clusterId, path, color }) => (
            <path
              key={`hull-${clusterId}`}
              d={path}
              fill={color}
              fillOpacity={0.08}
              stroke={color}
              strokeOpacity={0.3}
              strokeWidth={1.5}
              strokeDasharray="4 2"
              className="cursor-pointer hover:fill-opacity-[0.15] transition-all"
              onClick={() => handleClusterClick(clusterId)}
            />
          ))}

          {/* Bubbles */}
          {visibleData.map((point) => {
            const cx = scales.x(point.x);
            const cy = scales.y(point.y);
            const r = scales.r(point.size);
            const color = PROVIDER_COLORS[point.provider] ?? "#888";
            const isHovered = hoveredId === point.id;

            return (
              <g key={point.id}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? r * 1.2 : r}
                  fill={color}
                  fillOpacity={isHovered ? 0.9 : 0.6}
                  stroke={color}
                  strokeWidth={isHovered ? 2 : 1}
                  strokeOpacity={0.8}
                  className="cursor-pointer transition-all duration-150"
                  onMouseEnter={() => setHoveredId(point.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => handleBubbleClick(point)}
                />

                {/* Tooltip */}
                {isHovered && (
                  <g>
                    <rect
                      x={cx + r + 8}
                      y={cy - 30}
                      width={Math.max(120, point.label.length * 7 + 20)}
                      height={52}
                      rx={4}
                      fill="rgba(17,17,17,0.95)"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth={1}
                    />
                    <text
                      x={cx + r + 16}
                      y={cy - 12}
                      fill="white"
                      fontSize={11}
                      fontWeight="bold"
                    >
                      {point.label}
                    </text>
                    <text
                      x={cx + r + 16}
                      y={cy + 4}
                      fill="rgba(255,255,255,0.6)"
                      fontSize={10}
                    >
                      X: {point.x.toFixed(3)} Y: {point.y.toFixed(3)}
                    </text>
                    <text
                      x={cx + r + 16}
                      y={cy + 18}
                      fill="rgba(255,255,255,0.6)"
                      fontSize={10}
                    >
                      Size: {point.size.toFixed(3)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* X axis */}
          <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke="rgba(255,255,255,0.2)" />
          {xTicks.map((tick) => (
            <text
              key={`xt-${tick}`}
              x={scales.x(tick)}
              y={innerHeight + 20}
              fill="rgba(255,255,255,0.4)"
              fontSize={10}
              textAnchor="middle"
            >
              {tick.toFixed(2)}
            </text>
          ))}
          <text
            x={innerWidth / 2}
            y={innerHeight + 40}
            fill="rgba(255,255,255,0.5)"
            fontSize={12}
            textAnchor="middle"
          >
            {xLabel}
          </text>

          {/* Y axis */}
          <line x1={0} y1={0} x2={0} y2={innerHeight} stroke="rgba(255,255,255,0.2)" />
          {yTicks.map((tick) => (
            <text
              key={`yt-${tick}`}
              x={-10}
              y={scales.y(tick)}
              fill="rgba(255,255,255,0.4)"
              fontSize={10}
              textAnchor="end"
              dominantBaseline="middle"
            >
              {tick.toFixed(2)}
            </text>
          ))}
          <text
            x={-40}
            y={innerHeight / 2}
            fill="rgba(255,255,255,0.5)"
            fontSize={12}
            textAnchor="middle"
            transform={`rotate(-90, -40, ${innerHeight / 2})`}
          >
            {yLabel}
          </text>
        </g>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2 px-2">
        {activeProviders.map((provider) => (
          <div key={provider} className="flex items-center gap-1.5 text-xs text-white/60">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: PROVIDER_COLORS[provider] ?? "#888" }}
            />
            {provider}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Create bubble data from model audit results. */
export function createBubbleData(
  models: Array<{
    id: string;
    name: string;
    provider: ModelProvider;
    theoryScores: Record<Theory, number>;
    overallScore: number;
    cluster?: string;
  }>,
  xTheory: Theory,
  yTheory: Theory,
): BubbleDataPoint[] {
  return models.map((m) => ({
    id: m.id,
    label: m.name,
    x: m.theoryScores[xTheory] ?? 0,
    y: m.theoryScores[yTheory] ?? 0,
    size: m.overallScore,
    provider: m.provider,
    cluster: m.cluster,
  }));
}
