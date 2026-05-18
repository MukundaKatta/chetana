"use client";

import { useMemo, useState, useCallback } from "react";
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

export interface ModelOverlayData {
  /** Display name of the model. */
  name: string;
  /** A score (0-1) for each of the six theories. */
  scores: Record<Theory, number>;
  /** Optional override color. */
  color?: string;
}

export interface SignificantDifference {
  theory: Theory;
  models: [string, string];
  delta: number;
}

export interface RadarOverlayProps {
  /** Up to 5 models to overlay on the radar. */
  models: ModelOverlayData[];
  /** Size of the chart (default 420). */
  size?: number;
  /** Number of concentric grid rings (default 5). */
  levels?: number;
  /** Palette for theory axis colors (default "wong"). */
  palette?: PaletteType;
  /** Threshold for "significant" difference highlighting (default 0.15). */
  significanceThreshold?: number;
  /** Whether to highlight significant differences (default true). */
  showDifferences?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const MAX_MODELS = 5;

const MODEL_COLORS = [
  "#E69F00",
  "#56B4E9",
  "#009E73",
  "#D55E00",
  "#CC79A7",
] as const;

function computeOverallScore(scores: Record<Theory, number>): number {
  const theories = THEORIES;
  const total = theories.reduce((s, t) => s + (scores[t] ?? 0), 0);
  return total / theories.length;
}

function findSignificantDifferences(
  models: ModelOverlayData[],
  threshold: number,
): SignificantDifference[] {
  const diffs: SignificantDifference[] = [];
  for (let i = 0; i < models.length; i++) {
    for (let j = i + 1; j < models.length; j++) {
      for (const theory of THEORIES) {
        const delta = Math.abs(
          (models[i].scores[theory] ?? 0) - (models[j].scores[theory] ?? 0),
        );
        if (delta >= threshold) {
          diffs.push({
            theory,
            models: [models[i].name, models[j].name],
            delta: Math.round(delta * 10000) / 10000,
          });
        }
      }
    }
  }
  return diffs.sort((a, b) => b.delta - a.delta);
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function RadarOverlay({
  models: rawModels,
  size = 420,
  levels = 5,
  palette = "wong",
  significanceThreshold = 0.15,
  showDifferences = true,
  className,
}: RadarOverlayProps) {
  const models = rawModels.slice(0, MAX_MODELS);

  const [hiddenModels, setHiddenModels] = useState<Set<string>>(new Set());
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);
  const [hoveredTheory, setHoveredTheory] = useState<Theory | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    lines: string[];
  } | null>(null);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 55;

  const axes = THEORIES;
  const angleSlice = (Math.PI * 2) / axes.length;

  const pointFor = useCallback(
    (i: number, value: number) => ({
      x: cx + radius * value * Math.cos(angleSlice * i - Math.PI / 2),
      y: cy + radius * value * Math.sin(angleSlice * i - Math.PI / 2),
    }),
    [cx, cy, radius, angleSlice],
  );

  const gridRings = useMemo(
    () =>
      Array.from({ length: levels }, (_, i) => {
        const r = ((i + 1) / levels) * radius;
        const pts = axes
          .map((_, j) => {
            const x = cx + r * Math.cos(angleSlice * j - Math.PI / 2);
            const y = cy + r * Math.sin(angleSlice * j - Math.PI / 2);
            return `${x},${y}`;
          })
          .join(" ");
        return { r, pts, value: (i + 1) / levels };
      }),
    [levels, radius, cx, cy, angleSlice, axes],
  );

  const modelColors = useMemo(() => {
    return models.map(
      (m, i) => m.color ?? MODEL_COLORS[i % MODEL_COLORS.length],
    );
  }, [models]);

  const significantDiffs = useMemo(() => {
    if (!showDifferences) return [];
    const visible = models.filter((m) => !hiddenModels.has(m.name));
    return findSignificantDifferences(visible, significanceThreshold);
  }, [models, hiddenModels, significanceThreshold, showDifferences]);

  /** Theories with significant differences for glow highlighting. */
  const highlightedTheories = useMemo(() => {
    return new Set(significantDiffs.map((d) => d.theory));
  }, [significantDiffs]);

  const toggleModel = useCallback((name: string) => {
    setHiddenModels((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const handleVertexHover = useCallback(
    (model: ModelOverlayData, theoryIdx: number, px: number, py: number) => {
      const theory = axes[theoryIdx];
      const lines = [
        `${model.name} - ${THEORY_SHORT_LABELS[theory]}`,
        `Score: ${((model.scores[theory] ?? 0) * 100).toFixed(1)}%`,
      ];

      // Show comparison with other visible models
      const visible = models.filter(
        (m) => m.name !== model.name && !hiddenModels.has(m.name),
      );
      for (const other of visible) {
        const delta =
          (model.scores[theory] ?? 0) - (other.scores[theory] ?? 0);
        const sign = delta >= 0 ? "+" : "";
        lines.push(
          `vs ${other.name}: ${sign}${(delta * 100).toFixed(1)}%`,
        );
      }

      setTooltip({ x: px, y: py - 14, lines });
    },
    [models, hiddenModels, axes],
  );

  const overallScores = useMemo(() => {
    return models.map((m) => ({
      name: m.name,
      overall: computeOverallScore(m.scores),
    }));
  }, [models]);

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        {/* Grid rings */}
        {gridRings.map((ring, i) => (
          <g key={i}>
            <polygon
              points={ring.pts}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
            />
            <text
              x={cx + 4}
              y={cy - ring.r + 2}
              fill="rgba(255,255,255,0.2)"
              fontSize={8}
              dominantBaseline="auto"
            >
              {ring.value.toFixed(1)}
            </text>
          </g>
        ))}

        {/* Axis lines + labels */}
        {axes.map((theory, i) => {
          const end = pointFor(i, 1);
          const labelPt = pointFor(i, 1.18);
          const isHighlighted = highlightedTheories.has(theory);
          const isHovered = hoveredTheory === theory;

          return (
            <g key={theory}>
              <line
                x1={cx}
                y1={cy}
                x2={end.x}
                y2={end.y}
                stroke={
                  isHighlighted
                    ? "rgba(255,200,0,0.35)"
                    : "rgba(255,255,255,0.12)"
                }
                strokeWidth={isHighlighted ? 2 : 1}
              />
              {/* Highlight glow for significant differences */}
              {isHighlighted && (
                <line
                  x1={cx}
                  y1={cy}
                  x2={end.x}
                  y2={end.y}
                  stroke="rgba(255,200,0,0.15)"
                  strokeWidth={6}
                  className="pointer-events-none"
                />
              )}
              <text
                x={labelPt.x}
                y={labelPt.y}
                fill={getTheoryColor(theory, palette)}
                fontSize={11}
                fontWeight={isHovered ? 700 : 600}
                textAnchor="middle"
                dominantBaseline="central"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredTheory(theory)}
                onMouseLeave={() => setHoveredTheory(null)}
              >
                {THEORY_SHORT_LABELS[theory]}
              </text>
            </g>
          );
        })}

        {/* Model polygons */}
        {models.map((model, mi) => {
          if (hiddenModels.has(model.name)) return null;

          const pts = axes.map((t, i) => pointFor(i, model.scores[t] ?? 0));
          const polygon = pts.map((p) => `${p.x},${p.y}`).join(" ");
          const color = modelColors[mi];
          const dimmed =
            hoveredModel !== null && hoveredModel !== model.name;

          return (
            <g key={model.name}>
              <polygon
                points={polygon}
                fill={color}
                fillOpacity={dimmed ? 0.02 : 0.1}
                stroke={color}
                strokeWidth={dimmed ? 1 : 2}
                strokeOpacity={dimmed ? 0.12 : 0.75}
                strokeDasharray={mi > 0 ? `${4 + mi * 2},${2 + mi}` : "none"}
                className="transition-opacity duration-150"
              />
              {/* Vertex dots */}
              {pts.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={dimmed ? 2 : 4}
                  fill={color}
                  fillOpacity={dimmed ? 0.15 : 1}
                  stroke={
                    hoveredTheory === axes[i]
                      ? "rgba(255,255,255,0.6)"
                      : "none"
                  }
                  strokeWidth={2}
                  className="cursor-pointer transition-all duration-150"
                  onMouseEnter={() =>
                    handleVertexHover(model, i, p.x, p.y)
                  }
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </g>
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <foreignObject
            x={tooltip.x - 100}
            y={tooltip.y - 16 * tooltip.lines.length - 8}
            width={200}
            height={16 * tooltip.lines.length + 16}
            className="pointer-events-none overflow-visible"
          >
            <div className="flex w-full justify-center">
              <div className="rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 shadow-xl">
                {tooltip.lines.map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      "whitespace-nowrap text-[10px] tabular-nums",
                      i === 0
                        ? "font-semibold text-neutral-200"
                        : "text-neutral-400",
                    )}
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </foreignObject>
        )}
      </svg>

      {/* Legend with names and overall scores */}
      <div className="flex flex-wrap justify-center gap-3">
        {models.map((model, mi) => {
          const hidden = hiddenModels.has(model.name);
          const overall = overallScores[mi]?.overall ?? 0;
          return (
            <button
              key={model.name}
              type="button"
              onClick={() => toggleModel(model.name)}
              onMouseEnter={() => setHoveredModel(model.name)}
              onMouseLeave={() => setHoveredModel(null)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                hidden
                  ? "border-white/5 bg-transparent text-neutral-600 line-through"
                  : "border-white/10 bg-white/[0.04] text-neutral-300 hover:bg-white/[0.08]",
              )}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: hidden
                    ? "transparent"
                    : modelColors[mi],
                  border: hidden
                    ? `1px solid ${modelColors[mi]}`
                    : "none",
                }}
              />
              <span>{model.name}</span>
              <span className="ml-1 text-[10px] text-neutral-500">
                {(overall * 100).toFixed(0)}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Significant differences callout */}
      {showDifferences && significantDiffs.length > 0 && (
        <div className="w-full max-w-md rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <h4 className="mb-1.5 text-xs font-semibold text-amber-400">
            Significant Differences ({significantDiffs.length})
          </h4>
          <ul className="space-y-0.5">
            {significantDiffs.slice(0, 6).map((diff, i) => (
              <li
                key={i}
                className="text-[11px] text-neutral-400"
              >
                <span className="font-medium text-neutral-300">
                  {THEORY_SHORT_LABELS[diff.theory]}
                </span>
                {": "}
                {diff.models[0]} vs {diff.models[1]}{" "}
                <span className="text-amber-400">
                  ({(diff.delta * 100).toFixed(1)}%)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
