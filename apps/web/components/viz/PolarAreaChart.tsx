"use client";

import { useMemo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  getTheoryColor,
  THEORIES,
  THEORY_LABELS,
  THEORY_SHORT_LABELS,
  type PaletteType,
  type Theory,
} from "./ColorBlindPalette";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface TheoryScore {
  theory: Theory;
  score: number;
  /** Optional indicator-level breakdown. */
  indicators?: Array<{ name: string; score: number }>;
}

export interface PolarAreaChartProps {
  /** Scores for the primary audit. */
  scores: TheoryScore[];
  /** Optional second audit scores for comparison overlay. */
  compareScores?: TheoryScore[];
  /** Chart diameter in pixels (default 400). */
  size?: number;
  /** Palette for theory colors (default "wong"). */
  palette?: PaletteType;
  /** Label for the primary audit. */
  label?: string;
  /** Label for the comparison audit. */
  compareLabel?: string;
  /** Whether to animate on mount (default true). */
  animated?: boolean;
  className?: string;
}

interface TooltipData {
  x: number;
  y: number;
  theory: Theory;
  score: number;
  indicators?: Array<{ name: string; score: number }>;
  isCompare: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function PolarAreaChart({
  scores,
  compareScores,
  size = 400,
  palette = "wong",
  label = "Audit",
  compareLabel = "Comparison",
  animated = true,
  className,
}: PolarAreaChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [selectedTheory, setSelectedTheory] = useState<Theory | null>(null);
  const [animationPhase, setAnimationPhase] = useState(animated ? 0 : 1);

  // Trigger animation on mount
  useState(() => {
    if (animated) {
      requestAnimationFrame(() => setAnimationPhase(1));
    }
  });

  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size / 2 - 40;
  const theories = THEORIES;
  const segmentAngle = (2 * Math.PI) / theories.length;

  // Map scores by theory
  const scoreMap = useMemo(() => {
    const map = new Map<Theory, TheoryScore>();
    for (const s of scores) map.set(s.theory, s);
    return map;
  }, [scores]);

  const compareMap = useMemo(() => {
    if (!compareScores) return null;
    const map = new Map<Theory, TheoryScore>();
    for (const s of compareScores) map.set(s.theory, s);
    return map;
  }, [compareScores]);

  /** Build an SVG arc path for a polar-area segment. */
  const arcPath = useCallback(
    (index: number, radius: number): string => {
      const startAngle = index * segmentAngle - Math.PI / 2;
      const endAngle = startAngle + segmentAngle;

      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);

      const largeArc = segmentAngle > Math.PI ? 1 : 0;

      return [
        `M ${cx} ${cy}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        "Z",
      ].join(" ");
    },
    [cx, cy, segmentAngle],
  );

  /** Compute label position at the midpoint of a segment. */
  const labelPosition = useCallback(
    (index: number, radius: number) => {
      const midAngle = index * segmentAngle - Math.PI / 2 + segmentAngle / 2;
      return {
        x: cx + radius * Math.cos(midAngle),
        y: cy + radius * Math.sin(midAngle),
      };
    },
    [cx, cy, segmentAngle],
  );

  const handleSegmentHover = useCallback(
    (
      e: React.MouseEvent,
      theory: Theory,
      score: number,
      indicators: Array<{ name: string; score: number }> | undefined,
      isCompare: boolean,
    ) => {
      const rect = (e.target as SVGElement)
        .closest("svg")
        ?.getBoundingClientRect();
      if (!rect) return;
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        theory,
        score,
        indicators,
        isCompare,
      });
    },
    [],
  );

  const handleSegmentClick = useCallback((theory: Theory) => {
    setSelectedTheory((prev) => (prev === theory ? null : theory));
  }, []);

  // Grid rings
  const ringCount = 5;
  const rings = Array.from({ length: ringCount }, (_, i) =>
    ((i + 1) / ringCount) * maxRadius,
  );

  return (
    <div className={cn("relative inline-block", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Polar area chart of theory scores"
      >
        {/* Grid rings */}
        {rings.map((r, i) => (
          <circle
            key={`ring-${i}`}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.1}
            strokeWidth={1}
          />
        ))}

        {/* Grid ring labels */}
        {rings.map((r, i) => (
          <text
            key={`ring-label-${i}`}
            x={cx + 4}
            y={cy - r + 4}
            fontSize={10}
            fill="currentColor"
            fillOpacity={0.4}
          >
            {((i + 1) / ringCount).toFixed(1)}
          </text>
        ))}

        {/* Segment dividers */}
        {theories.map((_, i) => {
          const angle = i * segmentAngle - Math.PI / 2;
          const x2 = cx + maxRadius * Math.cos(angle);
          const y2 = cy + maxRadius * Math.sin(angle);
          return (
            <line
              key={`divider-${i}`}
              x1={cx}
              y1={cy}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeOpacity={0.15}
              strokeWidth={1}
            />
          );
        })}

        {/* Compare overlay segments (drawn first, behind primary) */}
        {compareMap &&
          theories.map((theory, i) => {
            const data = compareMap.get(theory);
            const score = data?.score ?? 0;
            const r = score * maxRadius * animationPhase;
            return (
              <path
                key={`compare-${theory}`}
                d={arcPath(i, r)}
                fill={getTheoryColor(theory, palette)}
                fillOpacity={0.2}
                stroke={getTheoryColor(theory, palette)}
                strokeWidth={2}
                strokeDasharray="4 2"
                style={{
                  transition: animated
                    ? "d 0.8s ease-out"
                    : undefined,
                }}
                onMouseMove={(e) =>
                  handleSegmentHover(
                    e,
                    theory,
                    score,
                    data?.indicators,
                    true,
                  )
                }
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}

        {/* Primary segments */}
        {theories.map((theory, i) => {
          const data = scoreMap.get(theory);
          const score = data?.score ?? 0;
          const r = score * maxRadius * animationPhase;
          const isSelected = selectedTheory === theory;

          return (
            <path
              key={`primary-${theory}`}
              d={arcPath(i, r)}
              fill={getTheoryColor(theory, palette)}
              fillOpacity={isSelected ? 0.8 : 0.55}
              stroke={getTheoryColor(theory, palette)}
              strokeWidth={isSelected ? 2.5 : 1.5}
              style={{
                transition: animated
                  ? "d 0.8s ease-out, fill-opacity 0.2s"
                  : undefined,
                cursor: "pointer",
              }}
              onMouseMove={(e) =>
                handleSegmentHover(
                  e,
                  theory,
                  score,
                  data?.indicators,
                  false,
                )
              }
              onMouseLeave={() => setTooltip(null)}
              onClick={() => handleSegmentClick(theory)}
            />
          );
        })}

        {/* Theory labels */}
        {theories.map((theory, i) => {
          const pos = labelPosition(i, maxRadius + 20);
          return (
            <text
              key={`label-${theory}`}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={11}
              fontWeight={selectedTheory === theory ? 700 : 500}
              fill="currentColor"
              style={{ cursor: "pointer" }}
              onClick={() => handleSegmentClick(theory)}
            >
              {THEORY_SHORT_LABELS[theory]}
            </text>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-10 rounded-md border bg-popover px-3 py-2 text-sm shadow-md pointer-events-none"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 8,
          }}
        >
          <div className="font-semibold">
            {THEORY_LABELS[tooltip.theory]}
            {tooltip.isCompare && (
              <span className="ml-1 text-muted-foreground">
                ({compareLabel})
              </span>
            )}
          </div>
          <div className="text-muted-foreground">
            Score: {(tooltip.score * 100).toFixed(1)}%
          </div>
          {tooltip.indicators && tooltip.indicators.length > 0 && (
            <div className="mt-1 border-t pt-1">
              {tooltip.indicators.map((ind) => (
                <div key={ind.name} className="flex justify-between gap-3">
                  <span>{ind.name}</span>
                  <span className="font-mono">
                    {(ind.score * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      {compareScores && (
        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-sm bg-current opacity-55" />
            <span>{label}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-sm border-2 border-dashed border-current opacity-30" />
            <span>{compareLabel}</span>
          </div>
        </div>
      )}

      {/* Indicator breakdown panel */}
      {selectedTheory && (
        <div className="mt-3 rounded-md border p-3">
          <h4 className="mb-2 text-sm font-semibold">
            {THEORY_LABELS[selectedTheory]} — Indicator Breakdown
          </h4>
          {(() => {
            const data = scoreMap.get(selectedTheory);
            if (!data?.indicators || data.indicators.length === 0) {
              return (
                <p className="text-xs text-muted-foreground">
                  No indicator data available.
                </p>
              );
            }
            return (
              <div className="space-y-1">
                {data.indicators.map((ind) => (
                  <div
                    key={ind.name}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="w-32 truncate">{ind.name}</span>
                    <div className="h-2 flex-1 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${ind.score * 100}%`,
                          backgroundColor: getTheoryColor(
                            selectedTheory,
                            palette,
                          ),
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                    <span className="w-10 text-right font-mono">
                      {(ind.score * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
