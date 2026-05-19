"use client";

/**
 * Issue #493 - Marimekko chart
 *
 * Variable-width columns (theory weight), variable-height segments
 * (indicator score), color by level, tooltip, drill-down, responsive.
 */

import { useMemo, useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface MarimekkoColumn {
  id: string;
  label: string;
  /** Weight determines column width (will be normalized). */
  weight: number;
  segments: MarimekkoSegment[];
}

export interface MarimekkoSegment {
  id: string;
  label: string;
  /** Score determines segment height (0-1). */
  score: number;
  /** Level for coloring. */
  level: "high" | "medium" | "low" | "none";
  metadata?: Record<string, unknown>;
}

export interface MarimekkoChartProps {
  columns: MarimekkoColumn[];
  /** Chart width in px (default 700). */
  width?: number;
  /** Chart height in px (default 400). */
  height?: number;
  /** Gap between columns in px (default 2). */
  columnGap?: number;
  /** Called when a segment is clicked (drill-down). */
  onSegmentClick?: (
    column: MarimekkoColumn,
    segment: MarimekkoSegment
  ) => void;
  /** Show column weight labels (default true). */
  showWeights?: boolean;
  /** Show segment score labels (default true). */
  showScores?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Colors                                                            */
/* ------------------------------------------------------------------ */

const LEVEL_COLORS: Record<MarimekkoSegment["level"], { fill: string; text: string }> = {
  high: {
    fill: "#34d399",
    text: "text-green-800 dark:text-green-200",
  },
  medium: {
    fill: "#fbbf24",
    text: "text-yellow-800 dark:text-yellow-200",
  },
  low: {
    fill: "#f87171",
    text: "text-red-800 dark:text-red-200",
  },
  none: {
    fill: "#d4d4d4",
    text: "text-neutral-600 dark:text-neutral-400",
  },
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function MarimekkoChart({
  columns,
  width = 700,
  height = 400,
  columnGap = 2,
  onSegmentClick,
  showWeights = true,
  showScores = true,
  className,
}: MarimekkoChartProps) {
  const [hoveredSegment, setHoveredSegment] = useState<{
    column: MarimekkoColumn;
    segment: MarimekkoSegment;
    x: number;
    y: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Margins
  const ml = 40;
  const mr = 20;
  const mt = 20;
  const mb = 60;
  const plotW = width - ml - mr;
  const plotH = height - mt - mb;

  // Normalize weights
  const totalWeight = useMemo(
    () => columns.reduce((s, c) => s + c.weight, 0),
    [columns]
  );

  // Layout computation
  const layout = useMemo(() => {
    const totalGap = (columns.length - 1) * columnGap;
    const availableW = plotW - totalGap;

    let xOffset = ml;
    return columns.map((col) => {
      const colWidth = totalWeight > 0 ? (col.weight / totalWeight) * availableW : 0;

      // Normalize segments so they fill the column height
      const totalScore = col.segments.reduce((s, seg) => s + seg.score, 0);

      let yOffset = mt;
      const segments = col.segments.map((seg) => {
        const segHeight =
          totalScore > 0 ? (seg.score / totalScore) * plotH : 0;
        const rect = {
          x: xOffset,
          y: yOffset,
          width: colWidth,
          height: segHeight,
        };
        yOffset += segHeight;
        return { segment: seg, rect };
      });

      const colLayout = {
        column: col,
        x: xOffset,
        width: colWidth,
        segments,
      };

      xOffset += colWidth + columnGap;
      return colLayout;
    });
  }, [columns, plotW, plotH, ml, mt, columnGap, totalWeight]);

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0];

  const handleMouseMove = useCallback(
    (
      e: React.MouseEvent,
      column: MarimekkoColumn,
      segment: MarimekkoSegment
    ) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setHoveredSegment({
          column,
          segment,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    },
    []
  );

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      <svg width={width} height={height} className="select-none">
        {/* Y axis labels */}
        {yTicks.map((tick) => {
          const y = mt + plotH * (1 - tick);
          return (
            <g key={tick}>
              <line
                x1={ml}
                y1={y}
                x2={ml + plotW}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.08}
              />
              <text
                x={ml - 6}
                y={y + 3}
                textAnchor="end"
                className="fill-neutral-400 text-[9px]"
              >
                {(tick * 100).toFixed(0)}%
              </text>
            </g>
          );
        })}

        {/* Columns and segments */}
        {layout.map((colLayout) => (
          <g key={colLayout.column.id}>
            {colLayout.segments.map(({ segment, rect }) => (
              <g key={segment.id}>
                <rect
                  x={rect.x}
                  y={rect.y}
                  width={Math.max(rect.width, 0)}
                  height={Math.max(rect.height, 0)}
                  fill={LEVEL_COLORS[segment.level].fill}
                  fillOpacity={
                    hoveredSegment?.segment.id === segment.id ? 1 : 0.8
                  }
                  stroke="white"
                  strokeWidth={1}
                  className="cursor-pointer transition-opacity"
                  onMouseMove={(e) =>
                    handleMouseMove(e, colLayout.column, segment)
                  }
                  onMouseLeave={() => setHoveredSegment(null)}
                  onClick={() =>
                    onSegmentClick?.(colLayout.column, segment)
                  }
                />

                {/* Segment label (shown if large enough) */}
                {showScores && rect.height > 16 && rect.width > 30 && (
                  <text
                    x={rect.x + rect.width / 2}
                    y={rect.y + rect.height / 2 + 3}
                    textAnchor="middle"
                    className="pointer-events-none fill-white text-[9px] font-medium"
                    style={{
                      textShadow: "0 0 2px rgba(0,0,0,0.3)",
                    }}
                  >
                    {segment.label.length > 8
                      ? segment.label.slice(0, 8) + ".."
                      : segment.label}
                  </text>
                )}
              </g>
            ))}

            {/* Column label */}
            <text
              x={colLayout.x + colLayout.width / 2}
              y={mt + plotH + 16}
              textAnchor="middle"
              className="fill-neutral-600 text-[10px] font-medium dark:fill-neutral-300"
            >
              {colLayout.column.label}
            </text>

            {/* Weight label */}
            {showWeights && (
              <text
                x={colLayout.x + colLayout.width / 2}
                y={mt + plotH + 30}
                textAnchor="middle"
                className="fill-neutral-400 text-[9px]"
              >
                {((colLayout.column.weight / totalWeight) * 100).toFixed(
                  1
                )}
                %
              </text>
            )}
          </g>
        ))}

        {/* Legend */}
        {(["high", "medium", "low", "none"] as const).map(
          (level, i) => (
            <g key={level}>
              <rect
                x={ml + i * 70}
                y={height - 14}
                width={10}
                height={10}
                fill={LEVEL_COLORS[level].fill}
                rx={2}
              />
              <text
                x={ml + i * 70 + 14}
                y={height - 5}
                className="fill-neutral-500 text-[9px] capitalize"
              >
                {level}
              </text>
            </g>
          )
        )}
      </svg>

      {/* Tooltip */}
      {hoveredSegment && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
          style={{
            left: Math.min(hoveredSegment.x + 12, width - 180),
            top: hoveredSegment.y - 10,
          }}
        >
          <div className="mb-1 font-medium text-neutral-800 dark:text-neutral-100">
            {hoveredSegment.column.label}
          </div>
          <div className="text-neutral-600 dark:text-neutral-300">
            {hoveredSegment.segment.label}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{
                backgroundColor:
                  LEVEL_COLORS[hoveredSegment.segment.level].fill,
              }}
            />
            <span className="capitalize">
              {hoveredSegment.segment.level}
            </span>
            <span className="font-medium">
              {(hoveredSegment.segment.score * 100).toFixed(1)}%
            </span>
          </div>
          {hoveredSegment.segment.metadata &&
            Object.entries(hoveredSegment.segment.metadata).map(
              ([k, v]) => (
                <div
                  key={k}
                  className="mt-0.5 text-neutral-400 dark:text-neutral-500"
                >
                  {k}: {String(v)}
                </div>
              )
            )}
        </div>
      )}
    </div>
  );
}
