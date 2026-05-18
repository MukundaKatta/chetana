"use client";

/**
 * Issue #433 - Mini sparkline charts
 *
 * Compact SVG (120x30px), last 30 data points,
 * highlight min/max, color by trend direction,
 * tooltip with exact value.
 */

import { useState, useMemo, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface MiniSparklineDataPoint {
  value: number;
  label?: string;
  timestamp?: number;
}

export interface MiniSparklineProps {
  /** Data points to render. Shows the last `maxPoints` entries. */
  data: MiniSparklineDataPoint[];
  /** Width of the SVG in px (default 120). */
  width?: number;
  /** Height of the SVG in px (default 30). */
  height?: number;
  /** Maximum data points to show (default 30). */
  maxPoints?: number;
  /** Stroke width (default 1.5). */
  strokeWidth?: number;
  /** Fill area under the line (default false). */
  filled?: boolean;
  /** Highlight min/max points (default true). */
  highlightMinMax?: boolean;
  /** Override line color. When omitted, color is derived from trend. */
  color?: string;
  /** Color when trend is up (default #34d399). */
  upColor?: string;
  /** Color when trend is down (default #f87171). */
  downColor?: string;
  /** Color when trend is flat (default #a3a3a3). */
  flatColor?: string;
  /** Show a tooltip with exact value on hover (default true). */
  showTooltip?: boolean;
  /** Format function for tooltip values. */
  formatValue?: (value: number) => string;
  /** Threshold line value. */
  threshold?: number;
  /** Threshold line color (default rgba(255,255,255,0.2)). */
  thresholdColor?: string;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_WIDTH = 120;
const DEFAULT_HEIGHT = 30;
const DEFAULT_MAX_POINTS = 30;
const DEFAULT_UP_COLOR = "#34d399";
const DEFAULT_DOWN_COLOR = "#f87171";
const DEFAULT_FLAT_COLOR = "#a3a3a3";
const PADDING = 2;

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function MiniSparkline({
  data,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  maxPoints = DEFAULT_MAX_POINTS,
  strokeWidth = 1.5,
  filled = false,
  highlightMinMax = true,
  color,
  upColor = DEFAULT_UP_COLOR,
  downColor = DEFAULT_DOWN_COLOR,
  flatColor = DEFAULT_FLAT_COLOR,
  showTooltip = true,
  formatValue,
  threshold,
  thresholdColor = "rgba(255,255,255,0.2)",
  className,
}: MiniSparklineProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Limit data points
  const visibleData = useMemo(() => {
    return data.slice(-maxPoints);
  }, [data, maxPoints]);

  const values = useMemo(() => visibleData.map((d) => d.value), [visibleData]);

  // Trend detection
  const trendColor = useMemo(() => {
    if (color) return color;
    if (values.length < 2) return flatColor;

    const first = values[0];
    const last = values[values.length - 1];
    const diff = last - first;
    const threshold = (Math.max(...values) - Math.min(...values)) * 0.05;

    if (Math.abs(diff) < threshold) return flatColor;
    return diff > 0 ? upColor : downColor;
  }, [values, color, upColor, downColor, flatColor]);

  // Compute points
  const { points, minIdx, maxIdx, min, max, range } = useMemo(() => {
    if (values.length === 0) {
      return { points: [] as Array<{ x: number; y: number }>, minIdx: -1, maxIdx: -1, min: 0, max: 0, range: 0 };
    }

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const rangeVal = maxVal - minVal || 1;

    const usableW = width - PADDING * 2;
    const usableH = height - PADDING * 2;

    let minI = 0;
    let maxI = 0;

    const pts = values.map((v, i) => {
      if (v < values[minI]) minI = i;
      if (v > values[maxI]) maxI = i;

      return {
        x: PADDING + (values.length === 1 ? usableW / 2 : (i / (values.length - 1)) * usableW),
        y: PADDING + usableH - ((v - minVal) / rangeVal) * usableH,
      };
    });

    return { points: pts, minIdx: minI, maxIdx: maxI, min: minVal, max: maxVal, range: rangeVal };
  }, [values, width, height]);

  // Path
  const linePath = useMemo(() => {
    if (points.length === 0) return "";
    return points
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");
  }, [points]);

  // Fill path
  const fillPath = useMemo(() => {
    if (!filled || points.length === 0) return "";
    const bottomY = height - PADDING;
    return `${linePath} L${points[points.length - 1].x.toFixed(1)},${bottomY} L${points[0].x.toFixed(1)},${bottomY} Z`;
  }, [filled, linePath, points, height]);

  // Threshold line
  const thresholdY = useMemo(() => {
    if (threshold === undefined || range === 0) return null;
    const usableH = height - PADDING * 2;
    return PADDING + usableH - ((threshold - min) / range) * usableH;
  }, [threshold, min, range, height]);

  // Hover detection
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!showTooltip || points.length === 0) return;

      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      let closest = 0;
      let closestDist = Infinity;

      for (let i = 0; i < points.length; i++) {
        const dist = Math.abs(points[i].x - mouseX);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      }

      setHoveredIndex(closest);
    },
    [showTooltip, points],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  const format = formatValue ?? ((v: number) => v.toFixed(2));

  if (visibleData.length === 0) {
    return (
      <svg width={width} height={height} className={cn("opacity-40", className)}>
        <line
          x1={PADDING}
          y1={height / 2}
          x2={width - PADDING}
          y2={height / 2}
          stroke={flatColor}
          strokeWidth={1}
          strokeDasharray="4 2"
        />
      </svg>
    );
  }

  return (
    <span className={cn("relative inline-flex", className)}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        aria-label={`Sparkline: ${values.length} data points, min ${min.toFixed(2)}, max ${max.toFixed(2)}`}
        role="img"
      >
        {/* Threshold line */}
        {thresholdY !== null && (
          <line
            x1={PADDING}
            y1={thresholdY}
            x2={width - PADDING}
            y2={thresholdY}
            stroke={thresholdColor}
            strokeWidth={1}
            strokeDasharray="3 2"
          />
        )}

        {/* Fill area */}
        {filled && fillPath && (
          <path
            d={fillPath}
            fill={trendColor}
            fillOpacity={0.1}
          />
        )}

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={trendColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Min/Max highlights */}
        {highlightMinMax && points.length > 2 && (
          <>
            <circle
              cx={points[minIdx].x}
              cy={points[minIdx].y}
              r={2.5}
              fill={downColor}
              stroke="none"
            />
            <circle
              cx={points[maxIdx].x}
              cy={points[maxIdx].y}
              r={2.5}
              fill={upColor}
              stroke="none"
            />
          </>
        )}

        {/* Hover indicator */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <>
            <line
              x1={points[hoveredIndex].x}
              y1={PADDING}
              x2={points[hoveredIndex].x}
              y2={height - PADDING}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={1}
            />
            <circle
              cx={points[hoveredIndex].x}
              cy={points[hoveredIndex].y}
              r={3}
              fill={trendColor}
              stroke="white"
              strokeWidth={1}
            />
          </>
        )}
      </svg>

      {/* Tooltip */}
      {showTooltip && hoveredIndex !== null && visibleData[hoveredIndex] && (
        <span
          className="absolute z-50 bg-gray-900 border border-white/20 rounded px-1.5 py-0.5 text-[10px] text-white whitespace-nowrap shadow-lg pointer-events-none"
          style={{
            left: Math.min(points[hoveredIndex].x, width - 60),
            bottom: height + 4,
          }}
        >
          <span className="font-medium">{format(visibleData[hoveredIndex].value)}</span>
          {visibleData[hoveredIndex].label && (
            <span className="text-white/50 ml-1">{visibleData[hoveredIndex].label}</span>
          )}
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Convert a simple number array to MiniSparklineDataPoint array. */
export function toSparklineData(values: number[]): MiniSparklineDataPoint[] {
  return values.map((value) => ({ value }));
}

/** Convert timestamped data to MiniSparklineDataPoint array. */
export function toTimestampedSparklineData(
  entries: Array<{ value: number; timestamp: number }>,
): MiniSparklineDataPoint[] {
  return entries.map((e) => ({
    value: e.value,
    timestamp: e.timestamp,
    label: new Date(e.timestamp).toLocaleDateString(),
  }));
}

/** Get the trend direction from data. */
export function getTrend(values: number[]): "up" | "down" | "flat" {
  if (values.length < 2) return "flat";
  const first = values[0];
  const last = values[values.length - 1];
  const range = Math.max(...values) - Math.min(...values);
  const threshold = range * 0.05;
  if (last - first > threshold) return "up";
  if (first - last > threshold) return "down";
  return "flat";
}
