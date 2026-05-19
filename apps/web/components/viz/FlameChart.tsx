"use client";

import { useState, useRef, useMemo, useCallback, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface FlameNode {
  /** Unique identifier for this node. */
  id: string;
  /** Display label. */
  name: string;
  /** Start offset in ms relative to the root. */
  startMs: number;
  /** Duration in ms. */
  durationMs: number;
  /** Nested children (sub-tasks). */
  children?: FlameNode[];
  /** Optional metadata rendered in tooltip. */
  meta?: Record<string, string | number>;
}

export interface FlameChartProps {
  /** Root-level execution spans. */
  data: FlameNode[];
  /** Optional second dataset for comparison mode. */
  comparisonData?: FlameNode[];
  /** Height per row in px (default 24). */
  rowHeight?: number;
  /** Minimum visible duration in ms — nodes shorter than this are hidden (default 0). */
  minDurationMs?: number;
  /** Called when a node is clicked. */
  onNodeClick?: (node: FlameNode) => void;
  /** Additional class names. */
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function flattenNodes(
  nodes: FlameNode[],
  depth: number = 0
): Array<{ node: FlameNode; depth: number }> {
  const result: Array<{ node: FlameNode; depth: number }> = [];
  for (const node of nodes) {
    result.push({ node, depth });
    if (node.children) {
      result.push(...flattenNodes(node.children, depth + 1));
    }
  }
  return result;
}

function totalSpan(nodes: FlameNode[]): { minStart: number; maxEnd: number } {
  let minStart = Infinity;
  let maxEnd = -Infinity;
  for (const n of nodes) {
    if (n.startMs < minStart) minStart = n.startMs;
    const end = n.startMs + n.durationMs;
    if (end > maxEnd) maxEnd = end;
    if (n.children) {
      const child = totalSpan(n.children);
      if (child.minStart < minStart) minStart = child.minStart;
      if (child.maxEnd > maxEnd) maxEnd = child.maxEnd;
    }
  }
  return { minStart, maxEnd };
}

/** Map a duration to a hot/cold hue. Hot = long, Cold = short. */
function heatColor(durationMs: number, maxDuration: number): string {
  const ratio = Math.min(durationMs / Math.max(maxDuration, 1), 1);
  // 240 = blue (cold), 0 = red (hot)
  const hue = Math.round(240 * (1 - ratio));
  return `hsl(${hue}, 85%, 55%)`;
}

function findMaxDuration(nodes: FlameNode[]): number {
  let max = 0;
  for (const n of nodes) {
    if (n.durationMs > max) max = n.durationMs;
    if (n.children) {
      const childMax = findMaxDuration(n.children);
      if (childMax > max) max = childMax;
    }
  }
  return max;
}

function matchesSearch(node: FlameNode, query: string): boolean {
  const lower = query.toLowerCase();
  return (
    node.name.toLowerCase().includes(lower) ||
    node.id.toLowerCase().includes(lower)
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function FlameChart({
  data,
  comparisonData,
  rowHeight = 24,
  minDurationMs = 0,
  onNodeClick,
  className,
}: FlameChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [zoomRange, setZoomRange] = useState<{ start: number; end: number } | null>(null);
  const [tooltip, setTooltip] = useState<{
    node: FlameNode;
    x: number;
    y: number;
  } | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  const activeData = showComparison && comparisonData ? comparisonData : data;

  const { minStart, maxEnd } = useMemo(() => totalSpan(activeData), [activeData]);
  const maxDuration = useMemo(() => findMaxDuration(activeData), [activeData]);

  const viewStart = zoomRange?.start ?? minStart;
  const viewEnd = zoomRange?.end ?? maxEnd;
  const viewDuration = viewEnd - viewStart;

  const flatList = useMemo(() => {
    const all = flattenNodes(activeData);
    return all.filter((item) => item.node.durationMs >= minDurationMs);
  }, [activeData, minDurationMs]);

  const maxDepth = useMemo(
    () => flatList.reduce((m, f) => Math.max(m, f.depth), 0),
    [flatList]
  );

  const chartHeight = (maxDepth + 1) * rowHeight + 4;

  const handleBarClick = useCallback(
    (node: FlameNode) => {
      onNodeClick?.(node);
    },
    [onNodeClick]
  );

  const handleZoomIn = useCallback(
    (node: FlameNode) => {
      setZoomRange({ start: node.startMs, end: node.startMs + node.durationMs });
    },
    []
  );

  const handleZoomReset = useCallback(() => {
    setZoomRange(null);
  }, []);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent, node: FlameNode) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltip({
        node,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 text-sm">
        <input
          type="text"
          placeholder="Search operations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded border border-white/20 bg-white/5 px-2 py-1 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {zoomRange && (
          <button
            onClick={handleZoomReset}
            className="rounded bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
          >
            Reset Zoom
          </button>
        )}
        {comparisonData && (
          <label className="flex items-center gap-1 text-white/70">
            <input
              type="checkbox"
              checked={showComparison}
              onChange={(e) => setShowComparison(e.target.checked)}
              className="accent-blue-500"
            />
            Compare
          </label>
        )}
        <span className="ml-auto text-xs text-white/50">
          {viewDuration.toFixed(1)} ms visible
        </span>
      </div>

      {/* Chart */}
      <div
        ref={containerRef}
        className="relative overflow-x-auto rounded border border-white/10 bg-black/30"
        style={{ height: chartHeight }}
      >
        {flatList.map(({ node, depth }) => {
          const left = ((node.startMs - viewStart) / viewDuration) * 100;
          const width = (node.durationMs / viewDuration) * 100;

          if (left + width < 0 || left > 100) return null;

          const isMatch = search ? matchesSearch(node, search) : false;
          const dimmed = search && !isMatch;

          return (
            <div
              key={node.id}
              role="button"
              tabIndex={0}
              className={cn(
                "absolute flex cursor-pointer items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-sm border border-black/30 px-1 text-[10px] font-medium text-white transition-opacity",
                dimmed && "opacity-20"
              )}
              style={{
                top: depth * rowHeight + 2,
                left: `${Math.max(left, 0)}%`,
                width: `${Math.min(width, 100)}%`,
                height: rowHeight - 2,
                backgroundColor: heatColor(node.durationMs, maxDuration),
              }}
              onClick={() => handleBarClick(node)}
              onDoubleClick={() => handleZoomIn(node)}
              onMouseEnter={(e) => handleMouseEnter(e, node)}
              onMouseLeave={handleMouseLeave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleBarClick(node);
              }}
            >
              {width > 3 && node.name}
            </div>
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-50 rounded border border-white/20 bg-gray-900 px-3 py-2 text-xs text-white shadow-lg"
            style={{
              left: Math.min(tooltip.x + 12, (containerRef.current?.clientWidth ?? 300) - 200),
              top: tooltip.y + 12,
            }}
          >
            <div className="font-semibold">{tooltip.node.name}</div>
            <div className="text-white/60">
              Start: {tooltip.node.startMs.toFixed(1)} ms
            </div>
            <div className="text-white/60">
              Duration: {tooltip.node.durationMs.toFixed(1)} ms
            </div>
            {tooltip.node.meta &&
              Object.entries(tooltip.node.meta).map(([k, v]) => (
                <div key={k} className="text-white/50">
                  {k}: {v}
                </div>
              ))}
            <div className="mt-1 text-white/40 italic">
              Double-click to zoom
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-white/50">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm" style={{ background: "hsl(240, 85%, 55%)" }} />
          Cold (fast)
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm" style={{ background: "hsl(120, 85%, 55%)" }} />
          Warm
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm" style={{ background: "hsl(0, 85%, 55%)" }} />
          Hot (slow)
        </div>
      </div>
    </div>
  );
}
