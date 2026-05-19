"use client";

/**
 * Issue #487 - Dot plot
 *
 * Vertical dot strips per probe, color by model,
 * jitter for overlap, mean/median overlay,
 * interactive model filtering.
 */

import { useMemo, useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface DotPlotDataPoint {
  probeId: string;
  probeName: string;
  modelId: string;
  modelName: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface DotPlotProps {
  data: DotPlotDataPoint[];
  /** Chart width in px (default 700). */
  width?: number;
  /** Chart height in px (default 400). */
  height?: number;
  /** Dot radius (default 4). */
  dotRadius?: number;
  /** Jitter width in px (default 8). */
  jitterWidth?: number;
  /** Show mean overlay (default true). */
  showMean?: boolean;
  /** Show median overlay (default true). */
  showMedian?: boolean;
  /** Color map for models. */
  modelColors?: Record<string, string>;
  /** Callback when a dot is clicked. */
  onDotClick?: (point: DotPlotDataPoint) => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Default colors                                                    */
/* ------------------------------------------------------------------ */

const DEFAULT_COLORS = [
  "#E69F00",
  "#56B4E9",
  "#009E73",
  "#F0E442",
  "#0072B2",
  "#D55E00",
  "#CC79A7",
  "#666666",
  "#882255",
  "#44AA99",
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mean(values: number[]): number {
  return values.length > 0
    ? values.reduce((a, b) => a + b, 0) / values.length
    : 0;
}

/** Deterministic jitter based on value + index. */
function jitter(seed: number, width: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  const frac = x - Math.floor(x);
  return (frac - 0.5) * width;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function DotPlot({
  data,
  width = 700,
  height = 400,
  dotRadius = 4,
  jitterWidth = 8,
  showMean = true,
  showMedian = true,
  modelColors,
  onDotClick,
  className,
}: DotPlotProps) {
  const [hiddenModels, setHiddenModels] = useState<Set<string>>(new Set());
  const [hoveredDot, setHoveredDot] = useState<DotPlotDataPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const svgRef = useRef<SVGSVGElement>(null);

  // Margins
  const ml = 50;
  const mr = 20;
  const mt = 20;
  const mb = 80;
  const plotW = width - ml - mr;
  const plotH = height - mt - mb;

  // Unique probes and models
  const probes = useMemo(() => {
    const seen = new Map<string, string>();
    for (const d of data) {
      if (!seen.has(d.probeId)) {
        seen.set(d.probeId, d.probeName);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [data]);

  const models = useMemo(() => {
    const seen = new Map<string, string>();
    for (const d of data) {
      if (!seen.has(d.modelId)) {
        seen.set(d.modelId, d.modelName);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [data]);

  // Color assignment
  const colorMap = useMemo(() => {
    const map: Record<string, string> = { ...modelColors };
    let idx = 0;
    for (const m of models) {
      if (!map[m.id]) {
        map[m.id] = DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
        idx++;
      }
    }
    return map;
  }, [models, modelColors]);

  // Filtered data
  const filteredData = useMemo(
    () => data.filter((d) => !hiddenModels.has(d.modelId)),
    [data, hiddenModels]
  );

  // Scales
  const bandWidth = probes.length > 0 ? plotW / probes.length : plotW;

  const xScale = useCallback(
    (probeIdx: number) => ml + probeIdx * bandWidth + bandWidth / 2,
    [ml, bandWidth]
  );

  const yScale = useCallback(
    (score: number) => mt + plotH - score * plotH,
    [mt, plotH]
  );

  // Group data by probe
  const probeGroups = useMemo(() => {
    const groups = new Map<string, DotPlotDataPoint[]>();
    for (const d of filteredData) {
      const list = groups.get(d.probeId) ?? [];
      list.push(d);
      groups.set(d.probeId, list);
    }
    return groups;
  }, [filteredData]);

  // Toggle model filter
  const toggleModel = useCallback((modelId: string) => {
    setHiddenModels((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) next.delete(modelId);
      else next.add(modelId);
      return next;
    });
  }, []);

  const handleDotHover = useCallback(
    (dot: DotPlotDataPoint | null, event?: React.MouseEvent) => {
      setHoveredDot(dot);
      if (event && svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setTooltipPos({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      }
    },
    []
  );

  // Y-axis ticks
  const yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <div className={cn("inline-block", className)}>
      {/* Model filter legend */}
      <div className="mb-3 flex flex-wrap gap-2">
        {models.map((m) => {
          const isHidden = hiddenModels.has(m.id);
          return (
            <button
              key={m.id}
              onClick={() => toggleModel(m.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity",
                isHidden
                  ? "border-neutral-200 text-neutral-400 opacity-50 dark:border-neutral-700 dark:text-neutral-500"
                  : "border-neutral-300 text-neutral-700 dark:border-neutral-600 dark:text-neutral-200"
              )}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: isHidden ? "#ccc" : colorMap[m.id],
                }}
              />
              {m.name}
            </button>
          );
        })}
      </div>

      <div className="relative">
        <svg ref={svgRef} width={width} height={height} className="select-none">
          {/* Y axis */}
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={ml}
                y1={yScale(tick)}
                x2={ml + plotW}
                y2={yScale(tick)}
                stroke="currentColor"
                strokeOpacity={0.1}
              />
              <text
                x={ml - 8}
                y={yScale(tick) + 3}
                textAnchor="end"
                className="fill-neutral-400 text-[10px]"
              >
                {tick.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Probe columns */}
          {probes.map((probe, probeIdx) => {
            const cx = xScale(probeIdx);
            const group = probeGroups.get(probe.id) ?? [];
            const scores = group.map((d) => d.score);

            return (
              <g key={probe.id}>
                {/* Vertical guide line */}
                <line
                  x1={cx}
                  y1={mt}
                  x2={cx}
                  y2={mt + plotH}
                  stroke="currentColor"
                  strokeOpacity={0.05}
                />

                {/* Mean line */}
                {showMean && scores.length > 0 && (
                  <line
                    x1={cx - bandWidth * 0.25}
                    y1={yScale(mean(scores))}
                    x2={cx + bandWidth * 0.25}
                    y2={yScale(mean(scores))}
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeOpacity={0.6}
                  />
                )}

                {/* Median line */}
                {showMedian && scores.length > 0 && (
                  <line
                    x1={cx - bandWidth * 0.25}
                    y1={yScale(median(scores))}
                    x2={cx + bandWidth * 0.25}
                    y2={yScale(median(scores))}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeDasharray="4,2"
                    strokeOpacity={0.6}
                  />
                )}

                {/* Dots */}
                {group.map((dot, dotIdx) => {
                  const dotJitter = jitter(
                    dotIdx * 31 + dot.score * 1000,
                    jitterWidth
                  );
                  const dx = cx + dotJitter;
                  const dy = yScale(dot.score);
                  const isHovered =
                    hoveredDot?.probeId === dot.probeId &&
                    hoveredDot?.modelId === dot.modelId;

                  return (
                    <circle
                      key={`${dot.probeId}-${dot.modelId}-${dotIdx}`}
                      cx={dx}
                      cy={dy}
                      r={isHovered ? dotRadius * 1.5 : dotRadius}
                      fill={colorMap[dot.modelId] ?? "#666"}
                      fillOpacity={isHovered ? 1 : 0.7}
                      stroke={isHovered ? "#000" : "none"}
                      strokeWidth={1}
                      className="cursor-pointer"
                      onMouseEnter={(e) => handleDotHover(dot, e)}
                      onMouseLeave={() => handleDotHover(null)}
                      onClick={() => onDotClick?.(dot)}
                    />
                  );
                })}

                {/* X-axis label */}
                <text
                  x={cx}
                  y={mt + plotH + 16}
                  textAnchor="end"
                  transform={`rotate(-45, ${cx}, ${mt + plotH + 16})`}
                  className="fill-neutral-500 text-[9px]"
                >
                  {probe.name.length > 18
                    ? probe.name.slice(0, 18) + "..."
                    : probe.name}
                </text>
              </g>
            );
          })}

          {/* Legend for mean/median */}
          {(showMean || showMedian) && (
            <g>
              {showMean && (
                <>
                  <line
                    x1={ml + plotW - 80}
                    y1={mt + 10}
                    x2={ml + plotW - 60}
                    y2={mt + 10}
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeOpacity={0.6}
                  />
                  <text
                    x={ml + plotW - 56}
                    y={mt + 13}
                    className="fill-neutral-500 text-[9px]"
                  >
                    Mean
                  </text>
                </>
              )}
              {showMedian && (
                <>
                  <line
                    x1={ml + plotW - 80}
                    y1={mt + 24}
                    x2={ml + plotW - 60}
                    y2={mt + 24}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeDasharray="4,2"
                    strokeOpacity={0.6}
                  />
                  <text
                    x={ml + plotW - 56}
                    y={mt + 27}
                    className="fill-neutral-500 text-[9px]"
                  >
                    Median
                  </text>
                </>
              )}
            </g>
          )}
        </svg>

        {/* Tooltip */}
        {hoveredDot && (
          <div
            className="pointer-events-none absolute z-10 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
            style={{
              left: tooltipPos.x + 12,
              top: tooltipPos.y - 10,
            }}
          >
            <div className="font-medium text-neutral-800 dark:text-neutral-100">
              {hoveredDot.modelName}
            </div>
            <div className="text-neutral-500 dark:text-neutral-400">
              {hoveredDot.probeName}
            </div>
            <div className="mt-0.5 font-semibold text-neutral-700 dark:text-neutral-200">
              Score: {hoveredDot.score.toFixed(3)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
