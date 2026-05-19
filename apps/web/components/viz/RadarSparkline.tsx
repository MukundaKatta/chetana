"use client";

/**
 * Issue #517 - Radar sparkline
 *
 * Miniature radar chart (60x60px default), 3-8 axes, fill with
 * transparency, hover to expand, array of data sets for comparison.
 */

import { useState, useMemo, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface RadarDataSet {
  label: string;
  values: number[];
  color?: string;
  fillOpacity?: number;
}

export interface RadarSparklineProps {
  /** Axis labels (3-8). */
  axes: string[];
  /** One or more data sets for comparison. Each set's values must match axes length. */
  dataSets: RadarDataSet[];
  /** Size in px when collapsed (default 60). */
  size?: number;
  /** Size in px when expanded on hover (default 200). */
  expandedSize?: number;
  /** Whether to expand on hover (default true). */
  expandOnHover?: boolean;
  /** Default fill opacity (default 0.25). */
  defaultFillOpacity?: number;
  /** Default colors for data sets. */
  colors?: string[];
  /** Show axis labels when expanded (default true). */
  showLabels?: boolean;
  /** Show grid rings (default true). */
  showGrid?: boolean;
  /** Number of grid rings (default 3). */
  gridRings?: number;
  /** Max value for normalization (default 1). */
  maxValue?: number;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_COLORS = [
  "#6366f1", // indigo
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#8b5cf6", // violet
];

/* ------------------------------------------------------------------ */
/*  Geometry helpers                                                  */
/* ------------------------------------------------------------------ */

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleRad: number
): { x: number; y: number } {
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function buildPolygonPoints(
  cx: number,
  cy: number,
  values: number[],
  maxValue: number,
  maxRadius: number
): string {
  const n = values.length;
  const angleStep = (2 * Math.PI) / n;
  const offset = -Math.PI / 2; // start from top

  return values
    .map((v, i) => {
      const r = (Math.min(v, maxValue) / maxValue) * maxRadius;
      const angle = offset + i * angleStep;
      const { x, y } = polarToCartesian(cx, cy, r, angle);
      return `${x},${y}`;
    })
    .join(" ");
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function RadarSparkline({
  axes,
  dataSets,
  size = 60,
  expandedSize = 200,
  expandOnHover = true,
  defaultFillOpacity = 0.25,
  colors = DEFAULT_COLORS,
  showLabels = true,
  showGrid = true,
  gridRings = 3,
  maxValue = 1,
  className,
}: RadarSparklineProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [tooltip, setTooltip] = useState<{
    label: string;
    values: { dataset: string; value: number }[];
    x: number;
    y: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentSize = expandOnHover && isExpanded ? expandedSize : size;
  const cx = currentSize / 2;
  const cy = currentSize / 2;
  const maxRadius = currentSize * 0.38;
  const n = axes.length;
  const angleStep = (2 * Math.PI) / n;
  const offset = -Math.PI / 2;

  // Grid rings
  const gridLines = useMemo(() => {
    if (!showGrid) return [];
    return Array.from({ length: gridRings }, (_, i) => {
      const r = ((i + 1) / gridRings) * maxRadius;
      const points = Array.from({ length: n }, (_, j) => {
        const angle = offset + j * angleStep;
        const { x, y } = polarToCartesian(cx, cy, r, angle);
        return `${x},${y}`;
      }).join(" ");
      return { radius: r, points };
    });
  }, [showGrid, gridRings, maxRadius, n, cx, cy, angleStep, offset]);

  // Axis lines
  const axisLines = useMemo(() => {
    return Array.from({ length: n }, (_, i) => {
      const angle = offset + i * angleStep;
      const end = polarToCartesian(cx, cy, maxRadius, angle);
      return { x1: cx, y1: cy, x2: end.x, y2: end.y, angle, index: i };
    });
  }, [n, cx, cy, maxRadius, angleStep, offset]);

  // Axis label positions
  const labelPositions = useMemo(() => {
    if (!showLabels || !isExpanded) return [];
    const labelRadius = maxRadius + 14;
    return axes.map((label, i) => {
      const angle = offset + i * angleStep;
      const { x, y } = polarToCartesian(cx, cy, labelRadius, angle);
      let anchor: "start" | "middle" | "end" = "middle";
      if (Math.cos(angle) > 0.1) anchor = "start";
      else if (Math.cos(angle) < -0.1) anchor = "end";
      return { label, x, y, anchor };
    });
  }, [showLabels, isExpanded, axes, maxRadius, cx, cy, angleStep, offset]);

  const handleAxisHover = useCallback(
    (index: number, event: React.MouseEvent) => {
      if (!isExpanded) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const values = dataSets.map((ds) => ({
        dataset: ds.label,
        value: ds.values[index] ?? 0,
      }));

      setTooltip({
        label: axes[index],
        values,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    },
    [isExpanded, dataSets, axes]
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative inline-block transition-all duration-300 ease-in-out",
        className
      )}
      style={{ width: currentSize, height: currentSize }}
      onMouseEnter={() => expandOnHover && setIsExpanded(true)}
      onMouseLeave={() => {
        expandOnHover && setIsExpanded(false);
        setTooltip(null);
      }}
    >
      <svg
        width={currentSize}
        height={currentSize}
        viewBox={`0 0 ${currentSize} ${currentSize}`}
        className="transition-all duration-300"
      >
        {/* Grid rings */}
        {gridLines.map((ring, i) => (
          <polygon
            key={`grid-${i}`}
            points={ring.points}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.1}
            strokeWidth={0.5}
          />
        ))}

        {/* Axis lines */}
        {axisLines.map((axis, i) => (
          <line
            key={`axis-${i}`}
            x1={axis.x1}
            y1={axis.y1}
            x2={axis.x2}
            y2={axis.y2}
            stroke="currentColor"
            strokeOpacity={0.15}
            strokeWidth={0.5}
          />
        ))}

        {/* Data polygons */}
        {dataSets.map((ds, dsIdx) => {
          const color = ds.color ?? colors[dsIdx % colors.length];
          const fillOpacity = ds.fillOpacity ?? defaultFillOpacity;
          const points = buildPolygonPoints(
            cx,
            cy,
            ds.values,
            maxValue,
            maxRadius
          );

          return (
            <g key={`ds-${dsIdx}`}>
              <polygon
                points={points}
                fill={color}
                fillOpacity={fillOpacity}
                stroke={color}
                strokeWidth={isExpanded ? 1.5 : 1}
                strokeOpacity={0.8}
              />
              {/* Data points (only when expanded) */}
              {isExpanded &&
                ds.values.map((v, i) => {
                  const angle = offset + i * angleStep;
                  const r =
                    (Math.min(v, maxValue) / maxValue) * maxRadius;
                  const { x, y } = polarToCartesian(cx, cy, r, angle);
                  return (
                    <circle
                      key={`pt-${dsIdx}-${i}`}
                      cx={x}
                      cy={y}
                      r={2.5}
                      fill={color}
                      stroke="white"
                      strokeWidth={1}
                      className="cursor-pointer"
                      onMouseEnter={(e) => handleAxisHover(i, e)}
                      onMouseLeave={handleMouseLeave}
                    />
                  );
                })}
            </g>
          );
        })}

        {/* Axis labels (expanded only) */}
        {labelPositions.map((lbl, i) => (
          <text
            key={`lbl-${i}`}
            x={lbl.x}
            y={lbl.y}
            textAnchor={lbl.anchor}
            dominantBaseline="middle"
            className="fill-current text-[8px] opacity-60"
          >
            {lbl.label}
          </text>
        ))}
      </svg>

      {/* Tooltip */}
      {tooltip && isExpanded && (
        <div
          className="absolute z-50 rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-lg pointer-events-none"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            whiteSpace: "nowrap",
          }}
        >
          <div className="font-medium">{tooltip.label}</div>
          {tooltip.values.map((v, i) => (
            <div key={i} className="opacity-80">
              {v.dataset}: {v.value.toFixed(2)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RadarSparkline;
