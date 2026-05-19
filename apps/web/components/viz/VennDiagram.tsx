"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface VennSet {
  id: string;
  label: string;
  /** Theory key for color mapping. */
  theory?: string;
  /** All item IDs in this set. */
  items: string[];
}

export interface VennDiagramProps {
  /** 2 or 3 sets. */
  sets: VennSet[];
  /** Called when a region is clicked. Returns the items in that region. */
  onRegionClick?: (items: string[], regionLabel: string) => void;
  /** Width in px (default 500). */
  width?: number;
  /** Height in px (default 400). */
  height?: number;
  /** Extra class. */
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Color palette by theory                                           */
/* ------------------------------------------------------------------ */

const THEORY_COLORS: Record<string, string> = {
  gwt: "59, 130, 246",   // blue
  iit: "168, 85, 247",   // purple
  hot: "239, 68, 68",    // red
  rpt: "34, 197, 94",    // green
  pp: "245, 158, 11",    // amber
  ast: "6, 182, 212",    // cyan
};

const DEFAULT_COLORS = [
  "59, 130, 246",
  "239, 68, 68",
  "34, 197, 94",
];

function getColor(set: VennSet, index: number): string {
  if (set.theory && THEORY_COLORS[set.theory]) {
    return THEORY_COLORS[set.theory];
  }
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

/* ------------------------------------------------------------------ */
/*  Set operations                                                    */
/* ------------------------------------------------------------------ */

function intersection(a: string[], b: string[]): string[] {
  const setB = new Set(b);
  return a.filter((item) => setB.has(item));
}

function difference(a: string[], b: string[]): string[] {
  const setB = new Set(b);
  return a.filter((item) => !setB.has(item));
}

interface VennRegion {
  label: string;
  items: string[];
  count: number;
  /** SVG path or position info. */
  cx: number;
  cy: number;
}

function computeRegions2(sets: VennSet[]): VennRegion[] {
  const [a, b] = sets;
  const ab = intersection(a.items, b.items);
  const aOnly = difference(a.items, b.items);
  const bOnly = difference(b.items, a.items);

  return [
    { label: `${a.label} only`, items: aOnly, count: aOnly.length, cx: -30, cy: 0 },
    { label: `${a.label} & ${b.label}`, items: ab, count: ab.length, cx: 0, cy: 0 },
    { label: `${b.label} only`, items: bOnly, count: bOnly.length, cx: 30, cy: 0 },
  ];
}

function computeRegions3(sets: VennSet[]): VennRegion[] {
  const [a, b, c] = sets;
  const ab = intersection(a.items, b.items);
  const ac = intersection(a.items, c.items);
  const bc = intersection(b.items, c.items);
  const abc = intersection(ab, c.items);

  const abOnly = difference(ab, c.items);
  const acOnly = difference(ac, b.items);
  const bcOnly = difference(bc, a.items);

  const aOnly = difference(difference(a.items, b.items), c.items);
  const bOnly = difference(difference(b.items, a.items), c.items);
  const cOnly = difference(difference(c.items, a.items), b.items);

  return [
    { label: `${a.label} only`, items: aOnly, count: aOnly.length, cx: -35, cy: -20 },
    { label: `${b.label} only`, items: bOnly, count: bOnly.length, cx: 35, cy: -20 },
    { label: `${c.label} only`, items: cOnly, count: cOnly.length, cx: 0, cy: 35 },
    { label: `${a.label} & ${b.label}`, items: abOnly, count: abOnly.length, cx: 0, cy: -30 },
    { label: `${a.label} & ${c.label}`, items: acOnly, count: acOnly.length, cx: -25, cy: 15 },
    { label: `${b.label} & ${c.label}`, items: bcOnly, count: bcOnly.length, cx: 25, cy: 15 },
    { label: `${a.label} & ${b.label} & ${c.label}`, items: abc, count: abc.length, cx: 0, cy: 0 },
  ];
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function VennDiagram({
  sets,
  onRegionClick,
  width = 500,
  height = 400,
  className,
}: VennDiagramProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  if (sets.length < 2 || sets.length > 3) {
    return (
      <div className="text-sm text-red-400">
        VennDiagram requires exactly 2 or 3 sets.
      </div>
    );
  }

  const isThreeSet = sets.length === 3;
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.25;

  // Circle positions
  const circles = useMemo(() => {
    if (isThreeSet) {
      const offset = r * 0.55;
      return [
        { cx: cx - offset * 0.5, cy: cy - offset * 0.4, r },
        { cx: cx + offset * 0.5, cy: cy - offset * 0.4, r },
        { cx: cx, cy: cy + offset * 0.5, r },
      ];
    }
    const offset = r * 0.55;
    return [
      { cx: cx - offset, cy, r },
      { cx: cx + offset, cy, r },
    ];
  }, [cx, cy, r, isThreeSet]);

  const colors = useMemo(
    () => sets.map((s, i) => getColor(s, i)),
    [sets]
  );

  const regions = useMemo(
    () => (isThreeSet ? computeRegions3(sets) : computeRegions2(sets)),
    [sets, isThreeSet]
  );

  const handleRegionClick = useCallback(
    (region: VennRegion) => {
      setSelectedRegion(region.label);
      onRegionClick?.(region.items, region.label);
    },
    [onRegionClick]
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <svg
        width={width}
        height={height}
        className="rounded border border-white/10 bg-black/20"
      >
        {/* Circles with transparency */}
        {circles.map((circle, i) => (
          <circle
            key={sets[i].id}
            cx={circle.cx}
            cy={circle.cy}
            r={circle.r}
            fill={`rgba(${colors[i]}, 0.2)`}
            stroke={`rgba(${colors[i]}, 0.7)`}
            strokeWidth={2}
          />
        ))}

        {/* Set labels */}
        {circles.map((circle, i) => {
          const labelOffset = isThreeSet
            ? i === 0
              ? { dx: -r * 0.8, dy: -r * 0.3 }
              : i === 1
                ? { dx: r * 0.8, dy: -r * 0.3 }
                : { dx: 0, dy: r * 0.9 }
            : i === 0
              ? { dx: -r * 0.7, dy: -r * 0.6 }
              : { dx: r * 0.7, dy: -r * 0.6 };

          return (
            <text
              key={`label-${sets[i].id}`}
              x={circle.cx + labelOffset.dx}
              y={circle.cy + labelOffset.dy}
              textAnchor="middle"
              className="fill-white/70 text-xs font-semibold"
            >
              {sets[i].label}
            </text>
          );
        })}

        {/* Region counts (clickable) */}
        {regions.map((region) => {
          if (region.count === 0) return null;
          const isHovered = hoveredRegion === region.label;
          const isSelected = selectedRegion === region.label;

          return (
            <g
              key={region.label}
              className="cursor-pointer"
              onClick={() => handleRegionClick(region)}
              onMouseEnter={() => setHoveredRegion(region.label)}
              onMouseLeave={() => setHoveredRegion(null)}
            >
              <circle
                cx={cx + region.cx}
                cy={cy + region.cy}
                r={16}
                fill={isHovered || isSelected ? "rgba(255,255,255,0.15)" : "transparent"}
                className="transition-colors"
              />
              <text
                x={cx + region.cx}
                y={cy + region.cy + 4}
                textAnchor="middle"
                className={cn(
                  "text-sm font-bold transition-colors",
                  isHovered || isSelected ? "fill-white" : "fill-white/80"
                )}
              >
                {region.count}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip / detail area */}
      {(hoveredRegion || selectedRegion) && (
        <div className="rounded border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
          <span className="font-semibold text-white">
            {hoveredRegion ?? selectedRegion}:
          </span>{" "}
          {regions.find((r) => r.label === (hoveredRegion ?? selectedRegion))?.count ?? 0}{" "}
          probes
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-white/60">
        {sets.map((set, i) => (
          <div key={set.id} className="flex items-center gap-1.5">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: `rgba(${colors[i]}, 0.6)` }}
            />
            <span>
              {set.label} ({set.items.length})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
