"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
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

export interface AuditMilestone {
  id: string;
  date: string;
  label: string;
  modelName: string;
  overallScore: number;
  theoryScores: Record<Theory, number>;
  /** Optional annotation text shown on hover / expanded. */
  annotation?: string;
}

export interface ModelEvolution {
  modelName: string;
  color?: string;
  milestones: AuditMilestone[];
}

export interface Annotation {
  id: string;
  date: string;
  text: string;
  /** If set, annotation is attached to a specific model. */
  modelName?: string;
}

export interface EvolutionTimelineProps {
  /** One or more model evolution tracks to display. */
  models: ModelEvolution[];
  /** Extra annotations that float above the timeline. */
  annotations?: Annotation[];
  /** Width of the SVG (default 900). */
  width?: number;
  /** Height of the SVG (default 420). */
  height?: number;
  /** Palette for theory colours. */
  palette?: PaletteType;
  /** Which theories to show sparklines for (default all). */
  visibleTheories?: Theory[];
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const MARGIN = { top: 40, right: 30, bottom: 60, left: 50 };
const SPARKLINE_HEIGHT = 24;
const DOT_RADIUS = 5;

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function parseDate(d: string): Date {
  return new Date(d);
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function EvolutionTimeline({
  models,
  annotations = [],
  width = 900,
  height = 420,
  palette = "wong",
  visibleTheories = [...THEORIES],
  className,
}: EvolutionTimelineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoomTransform, setZoomTransform] = useState<d3.ZoomTransform>(
    d3.zoomIdentity,
  );
  const [hoveredMilestone, setHoveredMilestone] =
    useState<AuditMilestone | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [selectedModels, setSelectedModels] = useState<Set<string>>(
    () => new Set(models.map((m) => m.modelName)),
  );

  /* ---- Scales ---- */
  const allDates = useMemo(() => {
    const dates: Date[] = [];
    for (const model of models) {
      for (const m of model.milestones) {
        dates.push(parseDate(m.date));
      }
    }
    for (const a of annotations) {
      dates.push(parseDate(a.date));
    }
    return dates;
  }, [models, annotations]);

  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;

  const xScale = useMemo(() => {
    const [minD, maxD] = d3.extent(allDates) as [Date, Date];
    const pad = (maxD.getTime() - minD.getTime()) * 0.05 || 86400000;
    return d3
      .scaleTime()
      .domain([new Date(minD.getTime() - pad), new Date(maxD.getTime() + pad)])
      .range([0, innerWidth]);
  }, [allDates, innerWidth]);

  const yScale = useMemo(
    () => d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]),
    [innerHeight],
  );

  const zoomedXScale = useMemo(
    () => zoomTransform.rescaleX(xScale),
    [zoomTransform, xScale],
  );

  /* ---- Zoom behaviour ---- */
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    const zoomBehaviour = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 20])
      .translateExtent([
        [0, 0],
        [width, height],
      ])
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        setZoomTransform(event.transform);
      });

    svg.call(zoomBehaviour);

    return () => {
      svg.on(".zoom", null);
    };
  }, [width, height]);

  /* ---- Model colour mapping ---- */
  const modelColors = useMemo(() => {
    const colours = d3.schemeTableau10;
    const map = new Map<string, string>();
    models.forEach((m, i) => {
      map.set(m.modelName, m.color ?? colours[i % colours.length]);
    });
    return map;
  }, [models]);

  /* ---- Line generator ---- */
  const lineGen = useMemo(
    () =>
      d3
        .line<AuditMilestone>()
        .x((d) => zoomedXScale(parseDate(d.date)))
        .y((d) => yScale(d.overallScore))
        .curve(d3.curveMonotoneX),
    [zoomedXScale, yScale],
  );

  /* ---- Sparkline generators (per theory) ---- */
  const sparklineGen = useCallback(
    (theory: Theory) =>
      d3
        .line<AuditMilestone>()
        .x((d) => zoomedXScale(parseDate(d.date)))
        .y((d) => {
          const score = d.theoryScores[theory] ?? 0;
          return SPARKLINE_HEIGHT - score * SPARKLINE_HEIGHT;
        })
        .curve(d3.curveMonotoneX),
    [zoomedXScale],
  );

  /* ---- Toggle model visibility ---- */
  const toggleModel = useCallback((name: string) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  /* ---- X axis ticks ---- */
  const xTicks = useMemo(() => {
    const ticks = zoomedXScale.ticks(8);
    return ticks.map((t) => ({
      x: zoomedXScale(t),
      label: formatDate(t),
    }));
  }, [zoomedXScale]);

  /* ---- Y axis ticks ---- */
  const yTicks = useMemo(() => {
    return [0, 0.2, 0.4, 0.6, 0.8, 1.0].map((v) => ({
      y: yScale(v),
      label: v.toFixed(1),
    }));
  }, [yScale]);

  return (
    <div className={cn("relative", className)}>
      {/* Legend / model selector */}
      <div className="mb-2 flex flex-wrap gap-3">
        {models.map((m) => (
          <button
            key={m.modelName}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition",
              selectedModels.has(m.modelName)
                ? "border-current opacity-100"
                : "border-gray-300 opacity-40",
            )}
            style={{ color: modelColors.get(m.modelName) }}
            onClick={() => toggleModel(m.modelName)}
            aria-pressed={selectedModels.has(m.modelName)}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: modelColors.get(m.modelName) }}
            />
            {m.modelName}
          </button>
        ))}
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="select-none"
        role="img"
        aria-label="Model evolution timeline"
      >
        <defs>
          <clipPath id="timeline-clip">
            <rect
              x={0}
              y={0}
              width={innerWidth}
              height={innerHeight}
            />
          </clipPath>
        </defs>

        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {/* Grid lines */}
          {yTicks.map((t) => (
            <line
              key={t.label}
              x1={0}
              y1={t.y}
              x2={innerWidth}
              y2={t.y}
              stroke="#e5e7eb"
              strokeDasharray="4,4"
            />
          ))}

          {/* X axis */}
          <g transform={`translate(0,${innerHeight})`}>
            {xTicks.map((t, i) => (
              <g key={i} transform={`translate(${t.x},0)`}>
                <line y2={6} stroke="#9ca3af" />
                <text
                  y={20}
                  textAnchor="middle"
                  className="fill-gray-500 text-[10px]"
                >
                  {t.label}
                </text>
              </g>
            ))}
          </g>

          {/* Y axis */}
          {yTicks.map((t) => (
            <text
              key={t.label}
              x={-8}
              y={t.y}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-gray-500 text-[10px]"
            >
              {t.label}
            </text>
          ))}

          <g clipPath="url(#timeline-clip)">
            {/* Lines & dots per model */}
            {models
              .filter((m) => selectedModels.has(m.modelName))
              .map((model) => {
                const sorted = [...model.milestones].sort(
                  (a, b) =>
                    parseDate(a.date).getTime() - parseDate(b.date).getTime(),
                );
                const color = modelColors.get(model.modelName)!;
                return (
                  <g key={model.modelName}>
                    {/* Overall score line */}
                    <path
                      d={lineGen(sorted) ?? ""}
                      fill="none"
                      stroke={color}
                      strokeWidth={2}
                      opacity={0.85}
                    />
                    {/* Dots */}
                    {sorted.map((ms) => {
                      const cx = zoomedXScale(parseDate(ms.date));
                      const cy = yScale(ms.overallScore);
                      return (
                        <circle
                          key={ms.id}
                          cx={cx}
                          cy={cy}
                          r={DOT_RADIUS}
                          fill={color}
                          stroke="#fff"
                          strokeWidth={1.5}
                          className="cursor-pointer"
                          onMouseEnter={(e) => {
                            setHoveredMilestone(ms);
                            setTooltipPos({
                              x: e.clientX,
                              y: e.clientY,
                            });
                          }}
                          onMouseLeave={() => setHoveredMilestone(null)}
                        />
                      );
                    })}
                  </g>
                );
              })}

            {/* Annotation markers */}
            {annotations.map((a) => {
              const x = zoomedXScale(parseDate(a.date));
              return (
                <g key={a.id}>
                  <line
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={innerHeight}
                    stroke="#f59e0b"
                    strokeDasharray="4,2"
                    strokeWidth={1}
                    opacity={0.6}
                  />
                  <text
                    x={x}
                    y={-6}
                    textAnchor="middle"
                    className="fill-amber-600 text-[9px] font-medium"
                  >
                    {a.text.length > 20
                      ? a.text.slice(0, 20) + "…"
                      : a.text}
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* Theory sparklines beneath the main chart */}
      <div className="mt-2 flex flex-wrap gap-4 pl-[50px]">
        {visibleTheories.map((theory) => (
          <div key={theory} className="flex flex-col items-start">
            <span
              className="mb-0.5 text-[10px] font-semibold uppercase"
              style={{ color: getTheoryColor(theory, palette) }}
            >
              {THEORY_SHORT_LABELS[theory]}
            </span>
            <svg
              width={innerWidth}
              height={SPARKLINE_HEIGHT}
              className="overflow-visible"
            >
              {models
                .filter((m) => selectedModels.has(m.modelName))
                .map((model) => {
                  const sorted = [...model.milestones].sort(
                    (a, b) =>
                      parseDate(a.date).getTime() -
                      parseDate(b.date).getTime(),
                  );
                  return (
                    <path
                      key={model.modelName}
                      d={sparklineGen(theory)(sorted) ?? ""}
                      fill="none"
                      stroke={modelColors.get(model.modelName)}
                      strokeWidth={1.5}
                      opacity={0.75}
                    />
                  );
                })}
            </svg>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {hoveredMilestone && (
        <div
          className="pointer-events-none fixed z-50 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-gray-700 dark:bg-gray-900"
          style={{
            left: tooltipPos.x + 12,
            top: tooltipPos.y - 10,
          }}
        >
          <p className="font-semibold">
            {hoveredMilestone.modelName} &mdash;{" "}
            {formatDate(parseDate(hoveredMilestone.date))}
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            Overall: {(hoveredMilestone.overallScore * 100).toFixed(1)}%
          </p>
          <div className="mt-1 grid grid-cols-3 gap-x-3 gap-y-0.5">
            {THEORIES.map((t) => (
              <span key={t}>
                <span
                  className="font-medium"
                  style={{ color: getTheoryColor(t, palette) }}
                >
                  {THEORY_SHORT_LABELS[t]}
                </span>
                :{" "}
                {(
                  (hoveredMilestone.theoryScores[t] ?? 0) * 100
                ).toFixed(0)}
                %
              </span>
            ))}
          </div>
          {hoveredMilestone.annotation && (
            <p className="mt-1 italic text-gray-500">
              {hoveredMilestone.annotation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default EvolutionTimeline;
