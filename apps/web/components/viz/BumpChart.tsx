"use client";

/**
 * Issue #524 - Bump chart
 *
 * Lines connecting rank positions over time, color by model,
 * highlight rank changes, hover for details, animated transitions.
 */

import { useState, useMemo, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface BumpChartDataPoint {
  /** Time period label (e.g., "v1.0", "Jan 2025"). */
  period: string;
  /** Rank (1 = best). */
  rank: number;
}

export interface BumpChartSeries {
  /** Model / entity name. */
  name: string;
  /** Rank data over time. */
  data: BumpChartDataPoint[];
  /** Optional color override. */
  color?: string;
}

export interface BumpChartProps {
  series: BumpChartSeries[];
  /** Chart width (default 700). */
  width?: number;
  /** Chart height (default 400). */
  height?: number;
  /** Show rank labels at each point (default true). */
  showRankLabels?: boolean;
  /** Highlight color on hover (default rgba(255,255,255,0.2)). */
  highlightColor?: string;
  /** Stroke width (default 2.5). */
  strokeWidth?: number;
  /** Circle radius at each rank point (default 5). */
  circleRadius?: number;
  /** Animate transitions (default true). */
  animated?: boolean;
  /** Padding (default { top: 30, right: 120, bottom: 40, left: 60 }). */
  padding?: { top: number; right: number; bottom: number; left: number };
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Default palette                                                   */
/* ------------------------------------------------------------------ */

const DEFAULT_COLORS = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#3b82f6",
  "#84cc16",
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function BumpChart({
  series,
  width = 700,
  height = 400,
  showRankLabels = true,
  strokeWidth = 2.5,
  circleRadius = 5,
  animated = true,
  padding = { top: 30, right: 120, bottom: 40, left: 60 },
  className,
}: BumpChartProps) {
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    name: string;
    period: string;
    rank: number;
    prevRank: number | null;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Collect all periods in order
  const periods = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const s of series) {
      for (const d of s.data) {
        if (!seen.has(d.period)) {
          seen.add(d.period);
          ordered.push(d.period);
        }
      }
    }
    return ordered;
  }, [series]);

  // Max rank
  const maxRank = useMemo(() => {
    let max = 1;
    for (const s of series) {
      for (const d of s.data) {
        if (d.rank > max) max = d.rank;
      }
    }
    return max;
  }, [series]);

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Scale functions
  const xScale = useCallback(
    (periodIdx: number) => {
      if (periods.length <= 1) return plotWidth / 2;
      return (periodIdx / (periods.length - 1)) * plotWidth;
    },
    [periods.length, plotWidth]
  );

  const yScale = useCallback(
    (rank: number) => {
      if (maxRank <= 1) return plotHeight / 2;
      return ((rank - 1) / (maxRank - 1)) * plotHeight;
    },
    [maxRank, plotHeight]
  );

  // Build path data for each series
  const seriesPaths = useMemo(() => {
    return series.map((s, idx) => {
      const color = s.color ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
      const periodMap = new Map(s.data.map((d) => [d.period, d.rank]));

      const points: Array<{
        x: number;
        y: number;
        period: string;
        rank: number;
        periodIdx: number;
      }> = [];

      for (let i = 0; i < periods.length; i++) {
        const rank = periodMap.get(periods[i]);
        if (rank !== undefined) {
          points.push({
            x: xScale(i),
            y: yScale(rank),
            period: periods[i],
            rank,
            periodIdx: i,
          });
        }
      }

      // Build smooth path using monotone cubic interpolation
      let pathD = "";
      if (points.length > 0) {
        pathD = `M ${points[0].x},${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
          const prev = points[i - 1];
          const curr = points[i];
          const cpx = (prev.x + curr.x) / 2;
          pathD += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
        }
      }

      // Detect rank changes
      const changes: Array<{
        periodIdx: number;
        from: number;
        to: number;
        direction: "up" | "down" | "same";
      }> = [];
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1].rank;
        const curr = points[i].rank;
        if (prev !== curr) {
          changes.push({
            periodIdx: points[i].periodIdx,
            from: prev,
            to: curr,
            direction: curr < prev ? "up" : "down",
          });
        }
      }

      return { name: s.name, color, points, pathD, changes };
    });
  }, [series, periods, xScale, yScale]);

  const handlePointHover = useCallback(
    (
      name: string,
      period: string,
      rank: number,
      prevRank: number | null,
      x: number,
      y: number
    ) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltip({
        x: x + padding.left,
        y: y + padding.top,
        name,
        period,
        rank,
        prevRank,
      });
      setHoveredSeries(name);
    },
    [padding]
  );

  return (
    <div className={cn("relative inline-block", className)}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="select-none"
        onMouseLeave={() => {
          setTooltip(null);
          setHoveredSeries(null);
        }}
      >
        <g transform={`translate(${padding.left},${padding.top})`}>
          {/* Horizontal grid lines for each rank */}
          {Array.from({ length: maxRank }, (_, i) => (
            <line
              key={`grid-${i}`}
              x1={0}
              y1={yScale(i + 1)}
              x2={plotWidth}
              y2={yScale(i + 1)}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeDasharray="4,4"
            />
          ))}

          {/* Y-axis rank labels */}
          {Array.from({ length: maxRank }, (_, i) => (
            <text
              key={`rank-${i}`}
              x={-10}
              y={yScale(i + 1)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-current text-[11px] opacity-50"
            >
              #{i + 1}
            </text>
          ))}

          {/* X-axis period labels */}
          {periods.map((period, i) => (
            <text
              key={`period-${i}`}
              x={xScale(i)}
              y={plotHeight + 20}
              textAnchor="middle"
              className="fill-current text-[11px] opacity-50"
            >
              {period}
            </text>
          ))}

          {/* Series paths */}
          {seriesPaths.map((sp) => {
            const isHovered = hoveredSeries === sp.name;
            const dimmed =
              hoveredSeries !== null && hoveredSeries !== sp.name;

            return (
              <g key={sp.name}>
                {/* Path */}
                <path
                  d={sp.pathD}
                  fill="none"
                  stroke={sp.color}
                  strokeWidth={isHovered ? strokeWidth + 1 : strokeWidth}
                  strokeOpacity={dimmed ? 0.15 : 0.8}
                  className={animated ? "transition-all duration-300" : ""}
                />

                {/* Points */}
                {sp.points.map((pt, i) => {
                  const prevRank =
                    i > 0 ? sp.points[i - 1].rank : null;
                  const change = sp.changes.find(
                    (c) => c.periodIdx === pt.periodIdx
                  );

                  return (
                    <g key={`pt-${i}`}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? circleRadius + 1 : circleRadius}
                        fill={sp.color}
                        stroke="white"
                        strokeWidth={1.5}
                        opacity={dimmed ? 0.2 : 1}
                        className={cn(
                          "cursor-pointer",
                          animated && "transition-all duration-300"
                        )}
                        onMouseEnter={() =>
                          handlePointHover(
                            sp.name,
                            pt.period,
                            pt.rank,
                            prevRank,
                            pt.x,
                            pt.y
                          )
                        }
                      />

                      {/* Rank change indicator */}
                      {change && !dimmed && (
                        <text
                          x={pt.x}
                          y={pt.y - circleRadius - 6}
                          textAnchor="middle"
                          className={cn(
                            "text-[9px] font-bold",
                            change.direction === "up"
                              ? "fill-green-400"
                              : "fill-red-400"
                          )}
                        >
                          {change.direction === "up" ? "▲" : "▼"}
                        </text>
                      )}

                      {/* Rank label at point */}
                      {showRankLabels && !dimmed && (
                        <text
                          x={pt.x}
                          y={pt.y + circleRadius + 12}
                          textAnchor="middle"
                          className="fill-current text-[9px] opacity-40"
                        >
                          {pt.rank}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Series label at the end */}
                {sp.points.length > 0 && (
                  <text
                    x={sp.points[sp.points.length - 1].x + 12}
                    y={sp.points[sp.points.length - 1].y}
                    dominantBaseline="middle"
                    className={cn(
                      "text-[11px] font-medium",
                      dimmed ? "opacity-20" : "opacity-80"
                    )}
                    style={{ fill: sp.color }}
                    onMouseEnter={() => setHoveredSeries(sp.name)}
                    onMouseLeave={() => setHoveredSeries(null)}
                  >
                    {sp.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-50 rounded bg-gray-900 px-3 py-2 text-xs text-white shadow-lg pointer-events-none"
          style={{
            left: tooltip.x + 15,
            top: tooltip.y - 15,
            whiteSpace: "nowrap",
          }}
        >
          <div className="font-semibold">{tooltip.name}</div>
          <div className="text-gray-400">{tooltip.period}</div>
          <div>
            Rank: <span className="font-bold">#{tooltip.rank}</span>
            {tooltip.prevRank !== null && tooltip.prevRank !== tooltip.rank && (
              <span
                className={cn(
                  "ml-1",
                  tooltip.rank < tooltip.prevRank
                    ? "text-green-400"
                    : "text-red-400"
                )}
              >
                ({tooltip.rank < tooltip.prevRank ? "+" : ""}
                {tooltip.prevRank - tooltip.rank})
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default BumpChart;
