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

export interface ModelScores {
  /** Display name of the model. */
  name: string;
  /** A score (0-1) for each of the six theories. */
  scores: Record<Theory, number>;
  /** Optional override color. */
  color?: string;
}

export interface RadarChartProps {
  /** One or more models to overlay on the radar. */
  models: ModelScores[];
  /** Size of the chart (default 380). */
  size?: number;
  /** Number of concentric grid rings (default 5). */
  levels?: number;
  /** Palette for theory axis colors (default "wong"). */
  palette?: PaletteType;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function RadarChart({
  models,
  size = 380,
  levels = 5,
  palette = "wong",
  className,
}: RadarChartProps) {
  const [hiddenModels, setHiddenModels] = useState<Set<string>>(new Set());
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 50;

  const axes = THEORIES;
  const angleSlice = (Math.PI * 2) / axes.length;

  /** Convert (theory index, value 0-1) to SVG coordinates. */
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

  /** Default model colors. */
  const modelColors = useMemo(() => {
    const scale = d3.scaleOrdinal(d3.schemeTableau10);
    return models.map((m, i) => m.color ?? scale(String(i)));
  }, [models]);

  const toggleModel = useCallback((name: string) => {
    setHiddenModels((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

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
          const labelPt = pointFor(i, 1.15);
          return (
            <g key={theory}>
              <line
                x1={cx}
                y1={cy}
                x2={end.x}
                y2={end.y}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth={1}
              />
              <text
                x={labelPt.x}
                y={labelPt.y}
                fill={getTheoryColor(theory, palette)}
                fontSize={11}
                fontWeight={600}
                textAnchor="middle"
                dominantBaseline="central"
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
          const dimmed = hoveredModel !== null && hoveredModel !== model.name;

          return (
            <g key={model.name}>
              <polygon
                points={polygon}
                fill={color}
                fillOpacity={dimmed ? 0.03 : 0.12}
                stroke={color}
                strokeWidth={dimmed ? 1 : 2}
                strokeOpacity={dimmed ? 0.15 : 0.8}
                className="transition-opacity duration-150"
              />
              {/* Vertex dots */}
              {pts.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={dimmed ? 2 : 3.5}
                  fill={color}
                  fillOpacity={dimmed ? 0.2 : 1}
                  className="cursor-pointer transition-all duration-150"
                  onMouseEnter={() =>
                    setTooltip({
                      x: p.x,
                      y: p.y - 10,
                      text: `${model.name} / ${THEORY_SHORT_LABELS[axes[i]]}: ${((model.scores[axes[i]] ?? 0) * 100).toFixed(0)}%`,
                    })
                  }
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </g>
          );
        })}

        {/* SVG tooltip (rendered as foreignObject for Tailwind styling) */}
        {tooltip && (
          <foreignObject
            x={tooltip.x - 80}
            y={tooltip.y - 30}
            width={160}
            height={28}
            className="pointer-events-none overflow-visible"
          >
            <div className="flex w-full justify-center">
              <span className="rounded border border-white/15 bg-neutral-900 px-2 py-0.5 text-[10px] font-medium text-neutral-200 shadow-lg">
                {tooltip.text}
              </span>
            </div>
          </foreignObject>
        )}
      </svg>

      {/* Interactive legend */}
      <div className="flex flex-wrap justify-center gap-3">
        {models.map((model, mi) => {
          const hidden = hiddenModels.has(model.name);
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
                  backgroundColor: hidden ? "transparent" : modelColors[mi],
                  border: hidden ? `1px solid ${modelColors[mi]}` : "none",
                }}
              />
              {model.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
