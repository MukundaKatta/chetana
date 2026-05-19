"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import * as d3 from "d3";
import { cn } from "@/lib/utils";
import {
  getTheoryColor,
  THEORIES,
  THEORY_SHORT_LABELS,
  type PaletteType,
  type Theory,
} from "./ColorBlindPalette";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface TheoryCorrelation {
  source: Theory;
  target: Theory;
  /** Correlation value between -1 and 1. */
  value: number;
  /** Optional type label (e.g. "structural", "behavioral"). */
  type?: string;
}

export interface ChordDiagramProps {
  /** Pairwise correlations between theories. */
  correlations: TheoryCorrelation[];
  /** Size of the chart (default 500). */
  size?: number;
  /** Minimum correlation threshold to display a chord (default 0). */
  threshold?: number;
  /** Palette for theory colours. */
  palette?: PaletteType;
  /** Correlation type colour mapping. */
  typeColors?: Record<string, string>;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const OUTER_RADIUS_FRAC = 0.42;
const INNER_RADIUS_FRAC = 0.38;
const LABEL_RADIUS_FRAC = 0.48;

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function ChordDiagram({
  correlations,
  size = 500,
  threshold = 0,
  palette = "wong",
  typeColors = {},
  className,
}: ChordDiagramProps) {
  const [hoveredTheory, setHoveredTheory] = useState<Theory | null>(null);
  const [filterThreshold, setFilterThreshold] = useState(threshold);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size * OUTER_RADIUS_FRAC;
  const innerRadius = size * INNER_RADIUS_FRAC;
  const labelRadius = size * LABEL_RADIUS_FRAC;

  /* ---- Build correlation matrix ---- */
  const theories = THEORIES;
  const theoryIndex = useMemo(() => {
    const map = new Map<Theory, number>();
    theories.forEach((t, i) => map.set(t, i));
    return map;
  }, []);

  const { matrix, typeMap } = useMemo(() => {
    const n = theories.length;
    const mat: number[][] = Array.from({ length: n }, () =>
      Array(n).fill(0),
    );
    const tMap = new Map<string, string>(); // "i-j" -> type

    for (const c of correlations) {
      const absVal = Math.abs(c.value);
      if (absVal < filterThreshold) continue;
      const si = theoryIndex.get(c.source);
      const ti = theoryIndex.get(c.target);
      if (si === undefined || ti === undefined) continue;
      mat[si][ti] = absVal;
      mat[ti][si] = absVal;
      if (c.type) {
        const key = `${Math.min(si, ti)}-${Math.max(si, ti)}`;
        tMap.set(key, c.type);
      }
    }

    return { matrix: mat, typeMap: tMap };
  }, [correlations, filterThreshold, theoryIndex]);

  /* ---- d3 chord layout ---- */
  const chordLayout = useMemo(
    () =>
      d3
        .chord()
        .padAngle(0.05)
        .sortSubgroups(d3.descending)(matrix),
    [matrix],
  );

  const arcGen = useMemo(
    () =>
      d3
        .arc<d3.ChordGroup>()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius),
    [innerRadius, outerRadius],
  );

  const ribbonGen = useMemo(
    () => d3.ribbon<d3.Chord, d3.ChordSubgroup>().radius(innerRadius),
    [innerRadius],
  );

  /* ---- Helpers ---- */
  const ribbonColor = useCallback(
    (chord: d3.Chord): string => {
      const si = chord.source.index;
      const ti = chord.target.index;
      const key = `${Math.min(si, ti)}-${Math.max(si, ti)}`;
      const type = typeMap.get(key);
      if (type && typeColors[type]) return typeColors[type];
      // Default: blend source and target theory colours
      return getTheoryColor(theories[si], palette);
    },
    [typeMap, typeColors, palette],
  );

  const isHighlighted = useCallback(
    (chord: d3.Chord): boolean => {
      if (!hoveredTheory) return true;
      const hIdx = theoryIndex.get(hoveredTheory);
      return (
        chord.source.index === hIdx || chord.target.index === hIdx
      );
    },
    [hoveredTheory, theoryIndex],
  );

  const labelPos = useCallback(
    (group: d3.ChordGroup) => {
      const angle = (group.startAngle + group.endAngle) / 2;
      const x = labelRadius * Math.cos(angle - Math.PI / 2);
      const y = labelRadius * Math.sin(angle - Math.PI / 2);
      const rotate = ((angle * 180) / Math.PI - 90).toFixed(1);
      const flip = angle > Math.PI;
      return { x, y, rotate, flip };
    },
    [labelRadius],
  );

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {/* Threshold slider */}
      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
        <label htmlFor="chord-threshold">Threshold:</label>
        <input
          id="chord-threshold"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={filterThreshold}
          onChange={(e) => setFilterThreshold(parseFloat(e.target.value))}
          className="h-1.5 w-32 cursor-pointer"
        />
        <span className="w-8 tabular-nums">{filterThreshold.toFixed(2)}</span>
      </div>

      <svg
        width={size}
        height={size}
        role="img"
        aria-label="Theory correlation chord diagram"
      >
        <g transform={`translate(${cx},${cy})`}>
          {/* Arcs for each theory */}
          {chordLayout.groups.map((group) => {
            const theory = theories[group.index];
            const color = getTheoryColor(theory, palette);
            const isHovered = hoveredTheory === theory;
            return (
              <g
                key={theory}
                onMouseEnter={() => setHoveredTheory(theory)}
                onMouseLeave={() => setHoveredTheory(null)}
                className="cursor-pointer"
              >
                <path
                  d={arcGen(group) ?? ""}
                  fill={color}
                  stroke="#fff"
                  strokeWidth={1}
                  opacity={
                    hoveredTheory
                      ? isHovered
                        ? 1
                        : 0.3
                      : 0.85
                  }
                />
                {(() => {
                  const pos = labelPos(group);
                  return (
                    <text
                      x={pos.x}
                      y={pos.y}
                      textAnchor={pos.flip ? "end" : "start"}
                      dominantBaseline="middle"
                      transform={`rotate(${pos.rotate},${pos.x},${pos.y})`}
                      className="fill-gray-700 text-[11px] font-semibold dark:fill-gray-300"
                    >
                      {THEORY_SHORT_LABELS[theory]}
                    </text>
                  );
                })()}
              </g>
            );
          })}

          {/* Ribbons */}
          {chordLayout.map((chord, i) => {
            const highlighted = isHighlighted(chord);
            const color = ribbonColor(chord);
            const si = chord.source.index;
            const ti = chord.target.index;
            return (
              <path
                key={`${si}-${ti}`}
                d={ribbonGen(chord) ?? ""}
                fill={color}
                fillOpacity={highlighted ? 0.65 : 0.08}
                stroke={color}
                strokeWidth={highlighted ? 0.5 : 0}
                className="transition-opacity duration-150"
                onMouseEnter={(e) => {
                  setTooltip({
                    x: e.clientX,
                    y: e.clientY,
                    text: `${THEORY_SHORT_LABELS[theories[si]]} ↔ ${THEORY_SHORT_LABELS[theories[ti]]}: ${matrix[si][ti].toFixed(2)}`,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3">
        {theories.map((t) => (
          <span
            key={t}
            className="flex items-center gap-1 text-xs"
            style={{ color: getTheoryColor(t, palette) }}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: getTheoryColor(t, palette) }}
            />
            {THEORY_SHORT_LABELS[t]}
          </span>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs shadow-lg dark:border-gray-700 dark:bg-gray-900"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

export default ChordDiagram;
