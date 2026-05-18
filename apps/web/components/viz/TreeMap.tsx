"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  getTheoryColor,
  THEORY_SHORT_LABELS,
  type PaletteType,
  type Theory,
} from "./ColorBlindPalette";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ProbeNode {
  id: string;
  name: string;
  score: number;
}

export interface IndicatorNode {
  id: string;
  name: string;
  score: number;
  probes: ProbeNode[];
}

export interface TheoryNode {
  theory: Theory;
  name: string;
  score: number;
  indicators: IndicatorNode[];
}

export interface TreeMapProps {
  data: TheoryNode[];
  width?: number;
  height?: number;
  palette?: PaletteType;
  className?: string;
}

interface TreeRect {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  id: string;
  score: number;
  theory: Theory;
  depth: number;
  children?: TreeRect[];
}

type BreadcrumbLevel = {
  label: string;
  id: string | null;
};

/* ------------------------------------------------------------------ */
/*  Squarified treemap layout                                         */
/* ------------------------------------------------------------------ */

function squarify(
  items: Array<{ id: string; label: string; score: number; theory: Theory; children?: TreeRect[] }>,
  x: number,
  y: number,
  w: number,
  h: number,
  depth: number,
): TreeRect[] {
  const totalScore = items.reduce((s, i) => s + Math.max(i.score, 0.01), 0);
  if (totalScore === 0 || items.length === 0) return [];

  const rects: TreeRect[] = [];
  let cx = x;
  let cy = y;
  let remainingW = w;
  let remainingH = h;

  // Use slice-and-dice: alternate horizontal/vertical splits
  const horizontal = depth % 2 === 0;

  for (const item of items) {
    const ratio = Math.max(item.score, 0.01) / totalScore;

    let rw: number;
    let rh: number;

    if (horizontal) {
      rw = remainingW * ratio;
      rh = remainingH;
    } else {
      rw = remainingW;
      rh = remainingH * ratio;
    }

    rects.push({
      x: cx,
      y: cy,
      w: rw,
      h: rh,
      label: item.label,
      id: item.id,
      score: item.score,
      theory: item.theory,
      depth,
      children: item.children,
    });

    if (horizontal) {
      cx += rw;
    } else {
      cy += rh;
    }
  }

  return rects;
}

function layoutTheory(
  node: TheoryNode,
  x: number,
  y: number,
  w: number,
  h: number,
): TreeRect {
  const indicatorItems = node.indicators.map((ind) => ({
    id: ind.id,
    label: ind.name,
    score: ind.score,
    theory: node.theory,
    children: ind.probes.map((p) => ({
      x: 0,
      y: 0,
      w: 0,
      h: 0,
      label: p.name,
      id: p.id,
      score: p.score,
      theory: node.theory,
      depth: 2,
    })),
  }));

  const children = squarify(indicatorItems, x + 2, y + 20, w - 4, h - 22, 1);

  return {
    x,
    y,
    w,
    h,
    label: THEORY_SHORT_LABELS[node.theory] ?? node.name,
    id: node.theory,
    score: node.score,
    theory: node.theory,
    depth: 0,
    children,
  };
}

/* ------------------------------------------------------------------ */
/*  Color by score                                                    */
/* ------------------------------------------------------------------ */

function scoreColor(score: number, theory: Theory, palette: PaletteType): string {
  const base = getTheoryColor(theory, palette);
  // Adjust opacity based on score
  const opacity = 0.2 + score * 0.6;
  return `${base}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
}

function scoreBorderColor(score: number): string {
  if (score >= 0.7) return "rgba(34,197,94,0.5)";
  if (score >= 0.4) return "rgba(234,179,8,0.5)";
  return "rgba(239,68,68,0.5)";
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function TreeMap({
  data,
  width = 800,
  height = 500,
  palette = "wong",
  className,
}: TreeMapProps) {
  const [zoomPath, setZoomPath] = useState<string[]>([]);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    lines: string[];
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /** Breadcrumbs from the current zoom path. */
  const breadcrumbs: BreadcrumbLevel[] = useMemo(() => {
    const crumbs: BreadcrumbLevel[] = [{ label: "All Theories", id: null }];

    if (zoomPath.length >= 1) {
      const theory = data.find((t) => t.theory === zoomPath[0]);
      if (theory) {
        crumbs.push({
          label: THEORY_SHORT_LABELS[theory.theory] ?? theory.name,
          id: theory.theory,
        });
      }
    }

    if (zoomPath.length >= 2) {
      const theory = data.find((t) => t.theory === zoomPath[0]);
      const indicator = theory?.indicators.find((i) => i.id === zoomPath[1]);
      if (indicator) {
        crumbs.push({ label: indicator.name, id: indicator.id });
      }
    }

    return crumbs;
  }, [zoomPath, data]);

  /** Build layout based on zoom level. */
  const rects = useMemo(() => {
    const padding = 4;
    const innerW = width - padding * 2;
    const innerH = height - padding * 2 - 36; // leave room for breadcrumbs

    if (zoomPath.length === 0) {
      // Top level: theory rects
      const theoryItems = data.map((t) => ({
        id: t.theory,
        label: THEORY_SHORT_LABELS[t.theory] ?? t.name,
        score: t.score,
        theory: t.theory,
      }));
      const topRects = squarify(theoryItems, padding, padding + 36, innerW, innerH, 0);

      // For each theory rect, lay out indicators inside
      return topRects.map((tr) => {
        const theoryData = data.find((t) => t.theory === tr.id);
        if (!theoryData) return tr;
        return layoutTheory(theoryData, tr.x, tr.y, tr.w, tr.h);
      });
    }

    if (zoomPath.length === 1) {
      // Zoomed into a theory: show indicators
      const theory = data.find((t) => t.theory === zoomPath[0]);
      if (!theory) return [];

      const indicatorItems = theory.indicators.map((ind) => ({
        id: ind.id,
        label: ind.name,
        score: ind.score,
        theory: theory.theory,
        children: ind.probes.map((p) => ({
          x: 0, y: 0, w: 0, h: 0,
          label: p.name,
          id: p.id,
          score: p.score,
          theory: theory.theory,
          depth: 2,
        })),
      }));

      return squarify(indicatorItems, padding, padding + 36, innerW, innerH, 1);
    }

    if (zoomPath.length === 2) {
      // Zoomed into an indicator: show probes
      const theory = data.find((t) => t.theory === zoomPath[0]);
      const indicator = theory?.indicators.find((i) => i.id === zoomPath[1]);
      if (!indicator || !theory) return [];

      const probeItems = indicator.probes.map((p) => ({
        id: p.id,
        label: p.name,
        score: p.score,
        theory: theory.theory,
      }));

      return squarify(probeItems, padding, padding + 36, innerW, innerH, 2);
    }

    return [];
  }, [data, zoomPath, width, height]);

  const handleClick = useCallback(
    (rect: TreeRect) => {
      if (zoomPath.length < 2 && rect.children && rect.children.length > 0) {
        setZoomPath((prev) => [...prev, rect.id]);
      } else if (zoomPath.length < 2 && rect.depth < 2) {
        setZoomPath((prev) => [...prev, rect.id]);
      }
    },
    [zoomPath],
  );

  const handleBreadcrumbClick = useCallback((index: number) => {
    setZoomPath((prev) => prev.slice(0, index));
  }, []);

  const handleMouseEnter = useCallback(
    (rect: TreeRect, e: React.MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const cr = container.getBoundingClientRect();

      setTooltip({
        x: e.clientX - cr.left,
        y: e.clientY - cr.top - 10,
        lines: [
          rect.label,
          `Score: ${(rect.score * 100).toFixed(1)}%`,
          rect.children
            ? `${rect.children.length} children`
            : "",
        ].filter(Boolean),
      });
    },
    [],
  );

  const renderRect = useCallback(
    (rect: TreeRect): React.ReactNode => {
      if (rect.w < 2 || rect.h < 2) return null;

      const showLabel = rect.w > 40 && rect.h > 20;
      const showScore = rect.w > 60 && rect.h > 35;

      return (
        <g key={rect.id}>
          <rect
            x={rect.x}
            y={rect.y}
            width={rect.w}
            height={rect.h}
            fill={scoreColor(rect.score, rect.theory, palette)}
            stroke={scoreBorderColor(rect.score)}
            strokeWidth={rect.depth === 0 ? 2 : 1}
            rx={3}
            className="cursor-pointer transition-opacity hover:opacity-80"
            onClick={() => handleClick(rect)}
            onMouseEnter={(e) => handleMouseEnter(rect, e)}
            onMouseMove={(e) => {
              const container = containerRef.current;
              if (!container) return;
              const cr = container.getBoundingClientRect();
              setTooltip((prev) =>
                prev
                  ? {
                      ...prev,
                      x: e.clientX - cr.left,
                      y: e.clientY - cr.top - 10,
                    }
                  : prev,
              );
            }}
            onMouseLeave={() => setTooltip(null)}
          />
          {showLabel && (
            <text
              x={rect.x + 6}
              y={rect.y + 16}
              fill="rgba(255,255,255,0.85)"
              fontSize={rect.depth === 0 ? 12 : 10}
              fontWeight={rect.depth === 0 ? 700 : 500}
              className="pointer-events-none select-none"
            >
              {rect.label.length > rect.w / 7
                ? rect.label.slice(0, Math.floor(rect.w / 7)) + "..."
                : rect.label}
            </text>
          )}
          {showScore && (
            <text
              x={rect.x + 6}
              y={rect.y + 30}
              fill="rgba(255,255,255,0.5)"
              fontSize={9}
              className="pointer-events-none select-none"
            >
              {(rect.score * 100).toFixed(0)}%
            </text>
          )}
          {/* Render children inside if at top level */}
          {zoomPath.length === 0 &&
            rect.children?.map((child) => renderRect(child))}
        </g>
      );
    },
    [palette, handleClick, handleMouseEnter, zoomPath.length],
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
    >
      {/* Breadcrumb navigation */}
      <div className="mb-1 flex items-center gap-1 px-1">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <span className="text-[10px] text-neutral-600">/</span>
            )}
            <button
              type="button"
              onClick={() => handleBreadcrumbClick(i)}
              className={cn(
                "rounded px-1.5 py-0.5 text-[11px] transition-colors",
                i === breadcrumbs.length - 1
                  ? "font-semibold text-neutral-200"
                  : "text-neutral-500 hover:text-neutral-300",
              )}
            >
              {crumb.label}
            </button>
          </span>
        ))}
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="w-full rounded-xl border border-white/8 bg-white/[0.02]"
      >
        {rects.map((rect) => renderRect(rect))}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 shadow-xl"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          {tooltip.lines.map((line, i) => (
            <div
              key={i}
              className={cn(
                "text-[11px] tabular-nums",
                i === 0
                  ? "font-semibold text-neutral-200"
                  : "text-neutral-400",
              )}
            >
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
