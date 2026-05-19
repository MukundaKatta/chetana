"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type LinkageMethod = "single" | "complete" | "average" | "ward";

export interface DendrogramLeaf {
  id: string;
  label: string;
  /** Optional numeric value for coloring. */
  value?: number;
}

export interface DendrogramMerge {
  /** Height / distance at which this merge occurs. */
  height: number;
  /** Left child: either a leaf id or another merge index. */
  left: string | number;
  /** Right child: either a leaf id or another merge index. */
  right: string | number;
}

export interface DendrogramData {
  leaves: DendrogramLeaf[];
  /** Agglomerative merge steps, in order. Each merge is assigned index = leaves.length + stepIndex. */
  merges: DendrogramMerge[];
}

export interface DendrogramProps {
  data: DendrogramData;
  /** Height at which to cut to form clusters (draws a horizontal line). */
  cutHeight?: number;
  /** Called when cutHeight changes via UI slider. */
  onCutHeightChange?: (height: number) => void;
  /** Linkage method displayed in header (informational). */
  linkage?: LinkageMethod;
  /** Called when linkage method changes. */
  onLinkageChange?: (method: LinkageMethod) => void;
  /** Width in px (default 600). */
  width?: number;
  /** Height in px (default 400). */
  height?: number;
  /** Extra class. */
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Cluster colors                                                    */
/* ------------------------------------------------------------------ */

const CLUSTER_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
];

/* ------------------------------------------------------------------ */
/*  Tree building helpers                                             */
/* ------------------------------------------------------------------ */

interface TreeNode {
  id: string | number;
  height: number;
  label?: string;
  left?: TreeNode;
  right?: TreeNode;
  /** All leaf IDs below this node. */
  leafIds: string[];
  /** X position (computed during layout). */
  x: number;
}

function buildTree(data: DendrogramData): TreeNode {
  const leafCount = data.leaves.length;
  const nodeMap = new Map<string | number, TreeNode>();

  // Create leaf nodes
  for (let i = 0; i < leafCount; i++) {
    const leaf = data.leaves[i];
    nodeMap.set(leaf.id, {
      id: leaf.id,
      height: 0,
      label: leaf.label,
      leafIds: [leaf.id],
      x: 0,
    });
  }

  // Create internal nodes from merges
  for (let i = 0; i < data.merges.length; i++) {
    const merge = data.merges[i];
    const internalId = leafCount + i;
    const leftNode = nodeMap.get(merge.left);
    const rightNode = nodeMap.get(merge.right);

    if (!leftNode || !rightNode) continue;

    nodeMap.set(internalId, {
      id: internalId,
      height: merge.height,
      left: leftNode,
      right: rightNode,
      leafIds: [...leftNode.leafIds, ...rightNode.leafIds],
      x: 0,
    });
  }

  // Root is the last merge
  const rootId = leafCount + data.merges.length - 1;
  return nodeMap.get(rootId) ?? nodeMap.values().next().value!;
}

function layoutTree(node: TreeNode, leafPositions: Map<string, number>): void {
  if (!node.left && !node.right) {
    // Leaf — use pre-assigned position
    node.x = leafPositions.get(node.id as string) ?? 0;
    return;
  }
  if (node.left) layoutTree(node.left, leafPositions);
  if (node.right) layoutTree(node.right, leafPositions);
  node.x = ((node.left?.x ?? 0) + (node.right?.x ?? 0)) / 2;
}

function getLeafOrder(node: TreeNode): string[] {
  if (!node.left && !node.right) return [node.id as string];
  const left = node.left ? getLeafOrder(node.left) : [];
  const right = node.right ? getLeafOrder(node.right) : [];
  return [...left, ...right];
}

function assignClusters(
  node: TreeNode,
  cutHeight: number,
  clusterId: { current: number },
  assignments: Map<string, number>
): void {
  if (node.height <= cutHeight || (!node.left && !node.right)) {
    const id = clusterId.current++;
    for (const leafId of node.leafIds) {
      assignments.set(leafId, id);
    }
    return;
  }
  if (node.left) assignClusters(node.left, cutHeight, clusterId, assignments);
  if (node.right) assignClusters(node.right, cutHeight, clusterId, assignments);
}

/* ------------------------------------------------------------------ */
/*  SVG line helpers                                                  */
/* ------------------------------------------------------------------ */

interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

function collectLines(
  node: TreeNode,
  maxHeight: number,
  xScale: (x: number) => number,
  yScale: (h: number) => number,
  clusterColors: Map<string, string>,
  lines: LineSegment[]
): void {
  if (!node.left && !node.right) return;

  const parentX = xScale(node.x);
  const parentY = yScale(node.height);

  for (const child of [node.left, node.right]) {
    if (!child) continue;
    const childX = xScale(child.x);
    const childY = yScale(child.height);

    // Determine color from the first leaf in the child subtree
    const firstLeaf = child.leafIds[0];
    const color = clusterColors.get(firstLeaf) ?? "#666";

    // Vertical line from child to parent height
    lines.push({ x1: childX, y1: childY, x2: childX, y2: parentY, color });
    // Horizontal line at parent height
    lines.push({ x1: childX, y1: parentY, x2: parentX, y2: parentY, color });

    collectLines(child, maxHeight, xScale, yScale, clusterColors, lines);
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function Dendrogram({
  data,
  cutHeight: cutHeightProp,
  onCutHeightChange,
  linkage = "average",
  onLinkageChange,
  width = 600,
  height: svgHeight = 400,
  className,
}: DendrogramProps) {
  const [collapsed, setCollapsed] = useState<Set<string | number>>(new Set());
  const [internalCutHeight, setInternalCutHeight] = useState<number | undefined>(undefined);

  const cutHeight = cutHeightProp ?? internalCutHeight;

  const tree = useMemo(() => buildTree(data), [data]);
  const maxHeight = useMemo(() => tree.height, [tree]);

  const leafOrder = useMemo(() => getLeafOrder(tree), [tree]);

  const leafPositions = useMemo(() => {
    const map = new Map<string, number>();
    leafOrder.forEach((id, i) => map.set(id, i));
    return map;
  }, [leafOrder]);

  useMemo(() => layoutTree(tree, leafPositions), [tree, leafPositions]);

  const clusterAssignments = useMemo(() => {
    const map = new Map<string, number>();
    if (cutHeight !== undefined) {
      assignClusters(tree, cutHeight, { current: 0 }, map);
    } else {
      // Single cluster
      for (const leaf of data.leaves) {
        map.set(leaf.id, 0);
      }
    }
    return map;
  }, [tree, cutHeight, data.leaves]);

  const clusterCount = useMemo(() => {
    return new Set(clusterAssignments.values()).size;
  }, [clusterAssignments]);

  const clusterColors = useMemo(() => {
    const map = new Map<string, string>();
    for (const [leafId, clusterId] of clusterAssignments) {
      map.set(leafId, CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length]);
    }
    return map;
  }, [clusterAssignments]);

  // Layout constants
  const margin = { top: 20, right: 20, bottom: 60, left: 50 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = svgHeight - margin.top - margin.bottom;

  const xScale = useCallback(
    (x: number) => margin.left + (x / Math.max(leafOrder.length - 1, 1)) * innerWidth,
    [leafOrder.length, innerWidth, margin.left]
  );

  const yScale = useCallback(
    (h: number) => margin.top + innerHeight - (h / Math.max(maxHeight, 1)) * innerHeight,
    [innerHeight, maxHeight, margin.top]
  );

  const lines = useMemo(() => {
    const result: LineSegment[] = [];
    collectLines(tree, maxHeight, xScale, yScale, clusterColors, result);
    return result;
  }, [tree, maxHeight, xScale, yScale, clusterColors]);

  const handleCutHeightSlider = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setInternalCutHeight(val);
      onCutHeightChange?.(val);
    },
    [onCutHeightChange]
  );

  const handleNodeClick = useCallback(
    (id: string | number) => {
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    []
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-white/70">
        <label className="flex items-center gap-2">
          Linkage:
          <select
            value={linkage}
            onChange={(e) => onLinkageChange?.(e.target.value as LinkageMethod)}
            className="rounded border border-white/20 bg-white/5 px-2 py-1 text-white"
          >
            <option value="single">Single</option>
            <option value="complete">Complete</option>
            <option value="average">Average</option>
            <option value="ward">Ward</option>
          </select>
        </label>

        <label className="flex items-center gap-2">
          Cut height:
          <input
            type="range"
            min={0}
            max={maxHeight}
            step={maxHeight / 100}
            value={cutHeight ?? maxHeight}
            onChange={handleCutHeightSlider}
            className="w-32 accent-blue-500"
          />
          <span className="tabular-nums">{(cutHeight ?? maxHeight).toFixed(2)}</span>
        </label>

        <span>Clusters: {clusterCount}</span>
      </div>

      {/* SVG */}
      <svg
        width={width}
        height={svgHeight}
        className="rounded border border-white/10 bg-black/20"
      >
        {/* Lines */}
        {lines.map((line, i) => (
          <line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={line.color}
            strokeWidth={1.5}
          />
        ))}

        {/* Cut height line */}
        {cutHeight !== undefined && (
          <line
            x1={margin.left}
            y1={yScale(cutHeight)}
            x2={width - margin.right}
            y2={yScale(cutHeight)}
            stroke="#ef4444"
            strokeWidth={1}
            strokeDasharray="4 2"
          />
        )}

        {/* Leaf labels */}
        {leafOrder.map((id, i) => {
          const leaf = data.leaves.find((l) => l.id === id);
          if (!leaf) return null;
          const x = xScale(i);
          const color = clusterColors.get(id) ?? "#666";
          return (
            <g key={id}>
              <circle
                cx={x}
                cy={yScale(0)}
                r={3}
                fill={color}
                className="cursor-pointer"
                onClick={() => handleNodeClick(id)}
              />
              <text
                x={x}
                y={yScale(0) + 14}
                textAnchor="end"
                transform={`rotate(-45, ${x}, ${yScale(0) + 14})`}
                className="fill-white/60 text-[9px]"
              >
                {leaf.label}
              </text>
            </g>
          );
        })}

        {/* Y-axis label */}
        <text
          x={margin.left - 35}
          y={margin.top + innerHeight / 2}
          textAnchor="middle"
          transform={`rotate(-90, ${margin.left - 35}, ${margin.top + innerHeight / 2})`}
          className="fill-white/40 text-[10px]"
        >
          Distance
        </text>
      </svg>
    </div>
  );
}
