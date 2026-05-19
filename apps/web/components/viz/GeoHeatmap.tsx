"use client";

import { useMemo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface RegionData {
  /** ISO 3166-1 alpha-2 or region name. */
  regionId: string;
  /** Display name. */
  name: string;
  /** Number of audits (or any intensity metric). */
  value: number;
  /** Optional metadata. */
  metadata?: Record<string, unknown>;
}

export interface TimeSlice {
  label: string;
  regions: RegionData[];
}

export interface GeoHeatmapProps {
  /** Region data (current snapshot). */
  regions: RegionData[];
  /** Optional time-series slices for animation. */
  timeSlices?: TimeSlice[];
  /** Map width (default 800). */
  width?: number;
  /** Map height (default 450). */
  height?: number;
  /** Colour for minimum intensity. */
  colorMin?: string;
  /** Colour for maximum intensity. */
  colorMax?: string;
  /** Number of top regions to show in leaderboard (default 10). */
  topN?: number;
  /** Called when a region is clicked. */
  onRegionClick?: (region: RegionData) => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Simplified world region bounding boxes (for an SVG-based heatmap) */
/* ------------------------------------------------------------------ */

interface RegionRect {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Simplified rectangular regions representing major world areas.
 * Coordinates are in a 800x450 viewport, roughly matching a
 * Robinson-like projection. This avoids heavy GeoJSON dependencies.
 */
const WORLD_REGIONS: RegionRect[] = [
  { id: "NA", name: "North America", x: 60, y: 60, w: 180, h: 140 },
  { id: "SA", name: "South America", x: 150, y: 220, w: 100, h: 170 },
  { id: "EU", name: "Europe", x: 350, y: 50, w: 120, h: 100 },
  { id: "AF", name: "Africa", x: 350, y: 160, w: 120, h: 170 },
  { id: "AS", name: "Asia", x: 480, y: 50, w: 200, h: 150 },
  { id: "OC", name: "Oceania", x: 600, y: 250, w: 120, h: 100 },
  { id: "ME", name: "Middle East", x: 430, y: 130, w: 70, h: 60 },
  { id: "CA", name: "Central America", x: 100, y: 170, w: 80, h: 50 },
  { id: "US", name: "United States", x: 70, y: 80, w: 150, h: 80 },
  { id: "CA-country", name: "Canada", x: 70, y: 40, w: 160, h: 50 },
  { id: "BR", name: "Brazil", x: 160, y: 240, w: 80, h: 80 },
  { id: "CN", name: "China", x: 560, y: 80, w: 80, h: 70 },
  { id: "IN", name: "India", x: 530, y: 140, w: 50, h: 60 },
  { id: "JP", name: "Japan", x: 660, y: 90, w: 30, h: 50 },
  { id: "AU", name: "Australia", x: 620, y: 270, w: 80, h: 60 },
  { id: "RU", name: "Russia", x: 440, y: 30, w: 240, h: 60 },
  { id: "GB", name: "United Kingdom", x: 340, y: 55, w: 30, h: 30 },
  { id: "DE", name: "Germany", x: 380, y: 65, w: 30, h: 30 },
  { id: "FR", name: "France", x: 355, y: 80, w: 30, h: 35 },
  { id: "KR", name: "South Korea", x: 640, y: 100, w: 20, h: 20 },
];

/* ------------------------------------------------------------------ */
/*  Colour interpolation                                              */
/* ------------------------------------------------------------------ */

function hexToRGB(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function interpolateColor(
  min: string,
  max: string,
  t: number,
): string {
  const [r1, g1, b1] = hexToRGB(min);
  const [r2, g2, b2] = hexToRGB(max);
  return rgbToHex(
    r1 + (r2 - r1) * t,
    g1 + (g2 - g1) * t,
    b1 + (b2 - b1) * t,
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function GeoHeatmap({
  regions,
  timeSlices,
  width = 800,
  height = 450,
  colorMin = "#e0f2fe",
  colorMax = "#1d4ed8",
  topN = 10,
  onRegionClick,
  className,
}: GeoHeatmapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [currentSliceIndex, setCurrentSliceIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Active region data (either static or from time slice)
  const activeRegions = useMemo(() => {
    if (timeSlices && timeSlices.length > 0) {
      return timeSlices[currentSliceIndex]?.regions ?? regions;
    }
    return regions;
  }, [regions, timeSlices, currentSliceIndex]);

  // Build lookup
  const regionMap = useMemo(() => {
    const map = new Map<string, RegionData>();
    for (const r of activeRegions) {
      map.set(r.regionId, r);
    }
    return map;
  }, [activeRegions]);

  // Max value for scaling
  const maxValue = useMemo(
    () => Math.max(1, ...activeRegions.map((r) => r.value)),
    [activeRegions],
  );

  // Top regions leaderboard
  const topRegions = useMemo(
    () =>
      [...activeRegions]
        .sort((a, b) => b.value - a.value)
        .slice(0, topN),
    [activeRegions, topN],
  );

  // Hovered region data
  const hoveredData = useMemo(
    () => (hoveredRegion ? regionMap.get(hoveredRegion) : null),
    [hoveredRegion, regionMap],
  );

  // Time animation
  const startAnimation = useCallback(() => {
    if (!timeSlices || timeSlices.length <= 1) return;
    setIsAnimating(true);
    setCurrentSliceIndex(0);
    let idx = 0;
    const timer = setInterval(() => {
      idx++;
      if (idx >= timeSlices.length) {
        clearInterval(timer);
        setIsAnimating(false);
        return;
      }
      setCurrentSliceIndex(idx);
    }, 1500);
  }, [timeSlices]);

  return (
    <div className={cn("flex flex-col gap-4 lg:flex-row", className)}>
      <div className="flex-1">
        {/* Time controls */}
        {timeSlices && timeSlices.length > 1 && (
          <div className="mb-2 flex items-center gap-2">
            <button
              onClick={startAnimation}
              disabled={isAnimating}
              className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isAnimating ? "Playing..." : "Animate"}
            </button>
            <input
              type="range"
              min={0}
              max={timeSlices.length - 1}
              value={currentSliceIndex}
              onChange={(e) =>
                setCurrentSliceIndex(parseInt(e.target.value, 10))
              }
              className="h-1.5 flex-1 cursor-pointer"
            />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {timeSlices[currentSliceIndex]?.label ?? ""}
            </span>
          </div>
        )}

        {/* Map SVG */}
        <svg
          width={width}
          height={height}
          viewBox={`0 0 800 450`}
          role="img"
          aria-label="Geographic heatmap"
          className="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
        >
          {/* Background ocean */}
          <rect width={800} height={450} fill="transparent" />

          {/* Regions */}
          {WORLD_REGIONS.map((rect) => {
            const data = regionMap.get(rect.id);
            const value = data?.value ?? 0;
            const intensity = maxValue > 0 ? value / maxValue : 0;
            const fill =
              value > 0
                ? interpolateColor(colorMin, colorMax, intensity)
                : "#e5e7eb";
            const isHovered = hoveredRegion === rect.id;

            return (
              <g key={rect.id}>
                <rect
                  x={rect.x}
                  y={rect.y}
                  width={rect.w}
                  height={rect.h}
                  rx={4}
                  fill={fill}
                  stroke={isHovered ? "#1e3a5f" : "#d1d5db"}
                  strokeWidth={isHovered ? 2 : 0.5}
                  opacity={isHovered ? 1 : 0.85}
                  className="cursor-pointer transition-all duration-150"
                  onMouseEnter={(e) => {
                    setHoveredRegion(rect.id);
                    setTooltipPos({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseMove={(e) =>
                    setTooltipPos({ x: e.clientX, y: e.clientY })
                  }
                  onMouseLeave={() => setHoveredRegion(null)}
                  onClick={() => data && onRegionClick?.(data)}
                />
                {rect.w > 40 && (
                  <text
                    x={rect.x + rect.w / 2}
                    y={rect.y + rect.h / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="pointer-events-none select-none fill-gray-700 text-[9px] font-medium dark:fill-gray-200"
                  >
                    {rect.id}
                  </text>
                )}
              </g>
            );
          })}

          {/* Legend gradient */}
          <defs>
            <linearGradient id="geo-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={colorMin} />
              <stop offset="100%" stopColor={colorMax} />
            </linearGradient>
          </defs>
          <g transform="translate(300, 420)">
            <rect
              width={200}
              height={10}
              rx={2}
              fill="url(#geo-gradient)"
            />
            <text
              x={0}
              y={-3}
              className="fill-gray-500 text-[9px]"
            >
              0
            </text>
            <text
              x={200}
              y={-3}
              textAnchor="end"
              className="fill-gray-500 text-[9px]"
            >
              {maxValue}
            </text>
          </g>
        </svg>
      </div>

      {/* Leaderboard */}
      <div className="w-full lg:w-56">
        <h4 className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
          Top Regions
        </h4>
        <div className="space-y-1">
          {topRegions.map((region, i) => {
            const pct = maxValue > 0 ? (region.value / maxValue) * 100 : 0;
            return (
              <div
                key={region.regionId}
                className={cn(
                  "flex items-center gap-2 rounded px-2 py-1 text-xs transition",
                  hoveredRegion === region.regionId
                    ? "bg-blue-50 dark:bg-blue-900/20"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800",
                )}
                onMouseEnter={() => setHoveredRegion(region.regionId)}
                onMouseLeave={() => setHoveredRegion(null)}
              >
                <span className="w-4 text-right font-bold text-gray-400">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-medium">{region.name}</span>
                    <span className="tabular-nums text-gray-500">
                      {region.value.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: interpolateColor(
                          colorMin,
                          colorMax,
                          region.value / maxValue,
                        ),
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredData && (
        <div
          className="pointer-events-none fixed z-50 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-gray-700 dark:bg-gray-900"
          style={{ left: tooltipPos.x + 14, top: tooltipPos.y - 10 }}
        >
          <p className="font-semibold">{hoveredData.name}</p>
          <p className="text-gray-600 dark:text-gray-400">
            Audits: <strong>{hoveredData.value.toLocaleString()}</strong>
          </p>
          {hoveredData.metadata && (
            <div className="mt-1 text-gray-500">
              {Object.entries(hoveredData.metadata).map(([k, v]) => (
                <p key={k}>
                  {k}: {String(v)}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GeoHeatmap;
