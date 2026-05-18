"use client";

import { useMemo, useState, useCallback, type CSSProperties } from "react";
import * as d3 from "d3";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface SunburstNode {
  name: string;
  id: string;
  weight?: number;
  score?: number;
  color?: string;
  children?: SunburstNode[];
}

export interface SunburstChartProps {
  data: SunburstNode;
  size?: number;
  className?: string;
  onNodeClick?: (node: SunburstNode, path: string[]) => void;
}

interface ArcData {
  id: string;
  name: string;
  score: number;
  depth: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  parent: string | null;
  color: string;
  children: string[];
}

/* ------------------------------------------------------------------ */
/*  Score-based colour palette                                        */
/* ------------------------------------------------------------------ */

function scoreToColor(score: number): string {
  if (score < 0.3) return "#ef4444";
  if (score < 0.5) return "#f97316";
  if (score < 0.7) return "#eab308";
  if (score < 0.85) return "#22c55e";
  return "#10b981";
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function SunburstChart({
  data,
  size = 500,
  className,
  onNodeClick,
}: SunburstChartProps) {
  const [zoomedId, setZoomedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);

  const radius = size / 2;
  const innerRadiusFraction = 0.15;

  // Build hierarchy & partition layout
  const arcs = useMemo(() => {
    const root = d3
      .hierarchy<SunburstNode>(data)
      .sum((d) => (d.children ? 0 : d.weight ?? 1))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    const partition = d3.partition<SunburstNode>().size([2 * Math.PI, radius]);
    partition(root);

    const result: ArcData[] = [];
    root.each((node) => {
      const d = node as d3.HierarchyRectangularNode<SunburstNode>;
      result.push({
        id: d.data.id,
        name: d.data.name,
        score: d.data.score ?? 0,
        depth: d.depth,
        x0: d.x0,
        x1: d.x1,
        y0: d.y0,
        y1: d.y1,
        parent: d.parent?.data.id ?? null,
        color: d.data.color ?? scoreToColor(d.data.score ?? 0),
        children: (d.children ?? []).map((c) => c.data.id),
      });
    });

    return result;
  }, [data, radius]);

  // Determine visible arcs based on zoom
  const visibleArcs = useMemo(() => {
    if (!zoomedId) return arcs.filter((a) => a.depth > 0);

    const zoomedArc = arcs.find((a) => a.id === zoomedId);
    if (!zoomedArc) return arcs.filter((a) => a.depth > 0);

    // Show the zoomed node and all its descendants
    const descendants = new Set<string>();
    const collect = (id: string) => {
      descendants.add(id);
      for (const arc of arcs) {
        if (arc.parent === id) collect(arc.id);
      }
    };
    collect(zoomedId);
    return arcs.filter((a) => descendants.has(a.id));
  }, [arcs, zoomedId]);

  // Arc generator
  const arcGenerator = useMemo(() => {
    return d3
      .arc<ArcData>()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .innerRadius((d) => Math.max(0, d.y0 * (1 - innerRadiusFraction) + radius * innerRadiusFraction))
      .outerRadius((d) => Math.max(0, d.y1 * (1 - innerRadiusFraction) + radius * innerRadiusFraction))
      .padAngle(0.005)
      .padRadius(radius / 2);
  }, [radius, innerRadiusFraction]);

  const handleClick = useCallback(
    (arc: ArcData) => {
      // Build breadcrumb path
      const path: { id: string; name: string }[] = [];
      let current: ArcData | undefined = arc;
      while (current) {
        path.unshift({ id: current.id, name: current.name });
        current = arcs.find((a) => a.id === current!.parent);
      }

      if (arc.children.length > 0) {
        setZoomedId(arc.id);
        setBreadcrumbs(path);
      } else {
        // Leaf node: call callback
        setBreadcrumbs(path);
      }

      onNodeClick?.(
        { id: arc.id, name: arc.name, score: arc.score },
        path.map((p) => p.name),
      );
    },
    [arcs, onNodeClick],
  );

  const handleBreadcrumbClick = useCallback(
    (id: string, index: number) => {
      if (index === 0) {
        setZoomedId(null);
        setBreadcrumbs([]);
      } else {
        setZoomedId(id);
        setBreadcrumbs((prev) => prev.slice(0, index + 1));
      }
    },
    [],
  );

  const hoveredArc = hoveredId ? arcs.find((a) => a.id === hoveredId) : null;

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {/* Breadcrumb trail */}
      {breadcrumbs.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 text-xs text-neutral-400">
          <button
            type="button"
            onClick={() => handleBreadcrumbClick("", 0)}
            className="rounded px-2 py-0.5 hover:bg-white/10 hover:text-neutral-200 transition-colors"
          >
            Root
          </button>
          {breadcrumbs.map((bc, i) => (
            <span key={bc.id} className="flex items-center gap-1">
              <span className="text-neutral-600">/</span>
              <button
                type="button"
                onClick={() => handleBreadcrumbClick(bc.id, i)}
                className={cn(
                  "rounded px-2 py-0.5 transition-colors",
                  i === breadcrumbs.length - 1
                    ? "bg-white/10 text-neutral-200"
                    : "hover:bg-white/10 hover:text-neutral-200",
                )}
              >
                {bc.name}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* SVG chart */}
      <svg
        width={size}
        height={size}
        viewBox={`${-radius} ${-radius} ${size} ${size}`}
        className="overflow-visible"
      >
        <defs>
          <style>{`
            @keyframes sunburst-enter {
              from { opacity: 0; transform: scale(0.8); }
              to   { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </defs>

        {visibleArcs.map((arc) => {
          const path = arcGenerator(arc);
          if (!path) return null;

          const isHovered = hoveredId === arc.id;
          const isDimmed = hoveredId !== null && hoveredId !== arc.id;

          return (
            <path
              key={arc.id}
              d={path}
              fill={arc.color}
              fillOpacity={isDimmed ? 0.2 : isHovered ? 1 : 0.8}
              stroke="rgba(0,0,0,0.4)"
              strokeWidth={isHovered ? 2 : 0.5}
              className="cursor-pointer transition-all duration-200"
              style={{ animation: "sunburst-enter 0.5s ease-out" }}
              onMouseEnter={() => setHoveredId(arc.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => handleClick(arc)}
            >
              <title>{`${arc.name}: ${(arc.score * 100).toFixed(1)}%`}</title>
            </path>
          );
        })}

        {/* Center label */}
        <text
          x={0}
          y={-4}
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgba(255,255,255,0.8)"
          fontSize={12}
          fontWeight={600}
        >
          {hoveredArc ? hoveredArc.name : data.name}
        </text>
        <text
          x={0}
          y={14}
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgba(255,255,255,0.4)"
          fontSize={11}
        >
          {hoveredArc
            ? `${(hoveredArc.score * 100).toFixed(1)}%`
            : ""}
        </text>
      </svg>
    </div>
  );
}
