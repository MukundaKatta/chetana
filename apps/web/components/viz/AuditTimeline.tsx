"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import * as d3 from "d3";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface AuditEntry {
  id: string;
  /** ISO date string. */
  date: string;
  model: string;
  /** Overall score 0-1. */
  score: number;
  /** Short title or version tag. */
  title: string;
  /** Longer description shown on expand. */
  details?: string;
  /** Optional per-theory breakdown. */
  theoryScores?: Record<string, number>;
}

export interface AuditTimelineProps {
  audits: AuditEntry[];
  /** Height in px for the score trend chart (default 180). */
  chartHeight?: number;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const MODEL_COLORS = [
  "#60a5fa", // blue
  "#f472b6", // pink
  "#34d399", // emerald
  "#fbbf24", // amber
  "#a78bfa", // violet
  "#fb923c", // orange
];

function getModelColor(model: string, allModels: string[]): string {
  const idx = allModels.indexOf(model);
  return MODEL_COLORS[idx % MODEL_COLORS.length];
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function AuditTimeline({
  audits,
  chartHeight = 180,
  className,
}: AuditTimelineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...audits].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [audits],
  );

  const allModels = useMemo(
    () => Array.from(new Set(sorted.map((a) => a.model))),
    [sorted],
  );

  /* ---------- Score trend SVG (d3) ---------- */
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = containerRef.current;
    if (!container || sorted.length === 0) return;

    const width = container.clientWidth;
    const margin = { top: 16, right: 16, bottom: 24, left: 36 };
    const innerW = width - margin.left - margin.right;
    const innerH = chartHeight - margin.top - margin.bottom;

    svg.attr("width", width).attr("height", chartHeight);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleTime()
      .domain(d3.extent(sorted, (d) => new Date(d.date)) as [Date, Date])
      .range([0, innerW]);

    const yScale = d3.scaleLinear().domain([0, 1]).range([innerH, 0]);

    // Grid lines
    g.append("g")
      .attr("class", "grid")
      .call(
        d3
          .axisLeft(yScale)
          .ticks(5)
          .tickSize(-innerW)
          .tickFormat(() => ""),
      )
      .call((gg) => gg.select(".domain").remove())
      .call((gg) => gg.selectAll("line").attr("stroke", "rgba(255,255,255,0.06)"));

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(6).tickSizeOuter(0))
      .call((gg) => gg.select(".domain").attr("stroke", "rgba(255,255,255,0.1)"))
      .call((gg) =>
        gg.selectAll("text").attr("fill", "rgba(255,255,255,0.35)").attr("font-size", "9px"),
      )
      .call((gg) => gg.selectAll("line").attr("stroke", "rgba(255,255,255,0.1)"));

    // Y axis
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5).tickSizeOuter(0))
      .call((gg) => gg.select(".domain").attr("stroke", "rgba(255,255,255,0.1)"))
      .call((gg) =>
        gg.selectAll("text").attr("fill", "rgba(255,255,255,0.35)").attr("font-size", "9px"),
      )
      .call((gg) => gg.selectAll("line").attr("stroke", "rgba(255,255,255,0.1)"));

    // One line per model
    const grouped = d3.group(sorted, (d) => d.model);

    const lineGen = d3
      .line<AuditEntry>()
      .x((d) => xScale(new Date(d.date)))
      .y((d) => yScale(d.score))
      .curve(d3.curveMonotoneX);

    for (const [model, entries] of grouped) {
      const color = getModelColor(model, allModels);

      g.append("path")
        .datum(entries)
        .attr("d", lineGen)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("stroke-opacity", 0.8);

      g.selectAll(`.dot-${model}`)
        .data(entries)
        .join("circle")
        .attr("cx", (d) => xScale(new Date(d.date)))
        .attr("cy", (d) => yScale(d.score))
        .attr("r", 3.5)
        .attr("fill", color)
        .attr("stroke", "#111")
        .attr("stroke-width", 1.5);
    }
  }, [sorted, allModels, chartHeight]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Score trend chart */}
      <div ref={containerRef} className="w-full">
        <svg
          ref={svgRef}
          className="w-full rounded-xl border border-white/8 bg-white/[0.02]"
          style={{ minHeight: chartHeight }}
        />
      </div>

      {/* Model legend */}
      <div className="flex flex-wrap gap-3 px-1">
        {allModels.map((model) => (
          <div key={model} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: getModelColor(model, allModels) }}
            />
            <span className="text-xs font-medium text-neutral-400">{model}</span>
          </div>
        ))}
      </div>

      {/* Chronological list */}
      <div className="relative space-y-0 pl-6">
        {/* Vertical line */}
        <div className="absolute bottom-0 left-[9px] top-0 w-px bg-white/8" />

        {sorted.map((audit) => {
          const color = getModelColor(audit.model, allModels);
          const expanded = expandedId === audit.id;
          const date = new Date(audit.date);

          return (
            <div key={audit.id} className="relative pb-4">
              {/* Dot on timeline */}
              <span
                className="absolute -left-6 top-1.5 h-3 w-3 rounded-full border-2 border-neutral-900"
                style={{ backgroundColor: color }}
              />

              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : audit.id)}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition-colors",
                  expanded
                    ? "border-white/15 bg-white/[0.05]"
                    : "border-white/8 bg-white/[0.02] hover:bg-white/[0.04]",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold tabular-nums text-neutral-500">
                      {date.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        backgroundColor: `${color}20`,
                        color,
                        border: `1px solid ${color}40`,
                      }}
                    >
                      {audit.model}
                    </span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-neutral-200">
                    {(audit.score * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-neutral-300">{audit.title}</p>
              </button>

              {/* Expanded details */}
              {expanded && (
                <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  {audit.details && (
                    <p className="mb-3 text-[11px] leading-relaxed text-neutral-400">
                      {audit.details}
                    </p>
                  )}
                  {audit.theoryScores && (
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(audit.theoryScores).map(([theory, score]) => (
                        <div
                          key={theory}
                          className="rounded-md border border-white/8 bg-white/[0.02] px-2 py-1.5 text-center"
                        >
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                            {theory}
                          </div>
                          <div className="text-sm font-bold tabular-nums text-neutral-200">
                            {(score * 100).toFixed(0)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
