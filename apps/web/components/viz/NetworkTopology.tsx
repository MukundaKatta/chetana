"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type NodeType = "model" | "probe" | "theory" | "indicator";

export interface TopologyNode {
  id: string;
  label: string;
  type: NodeType;
  group?: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface TopologyEdge {
  source: string;
  target: string;
  weight: number;
  label?: string;
}

export interface NetworkTopologyProps {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  width?: number;
  height?: number;
  /** Show community detection coloring (default true). */
  showCommunities?: boolean;
  /** Minimum edge weight to display (default 0). */
  minEdgeWeight?: number;
  className?: string;
}

interface SimNode extends TopologyNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
  community: number;
}

/* ------------------------------------------------------------------ */
/*  Colors and styling                                                */
/* ------------------------------------------------------------------ */

const NODE_COLORS: Record<NodeType, string> = {
  model: "#56B4E9",
  probe: "#E69F00",
  theory: "#009E73",
  indicator: "#D55E00",
};

const NODE_RADII: Record<NodeType, number> = {
  model: 12,
  probe: 8,
  theory: 14,
  indicator: 10,
};

const COMMUNITY_COLORS = [
  "#E69F00",
  "#56B4E9",
  "#009E73",
  "#D55E00",
  "#CC79A7",
  "#F0E442",
  "#0072B2",
  "#8B5CF6",
];

/* ------------------------------------------------------------------ */
/*  Force-directed layout                                             */
/* ------------------------------------------------------------------ */

function initializePositions(
  nodes: TopologyNode[],
  width: number,
  height: number,
): SimNode[] {
  return nodes.map((node, i) => ({
    ...node,
    x: width / 2 + (Math.random() - 0.5) * width * 0.5,
    y: height / 2 + (Math.random() - 0.5) * height * 0.5,
    vx: 0,
    vy: 0,
    fx: null,
    fy: null,
    community: 0,
  }));
}

function runSimulation(
  simNodes: SimNode[],
  edges: TopologyEdge[],
  width: number,
  height: number,
  iterations: number = 100,
): void {
  const nodeMap = new Map<string, SimNode>();
  for (const node of simNodes) {
    nodeMap.set(node.id, node);
  }

  const repulsionStrength = 800;
  const attractionStrength = 0.05;
  const centerStrength = 0.01;
  const damping = 0.85;

  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations;

    // Repulsion between all pairs
    for (let i = 0; i < simNodes.length; i++) {
      for (let j = i + 1; j < simNodes.length; j++) {
        const a = simNodes[i];
        const b = simNodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (repulsionStrength * alpha) / (dist * dist);

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) continue;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = attractionStrength * dist * edge.weight * alpha;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    }

    // Center gravity
    for (const node of simNodes) {
      node.vx += (width / 2 - node.x) * centerStrength * alpha;
      node.vy += (height / 2 - node.y) * centerStrength * alpha;
    }

    // Apply velocities
    for (const node of simNodes) {
      if (node.fx !== null) {
        node.x = node.fx;
        node.vx = 0;
      } else {
        node.vx *= damping;
        node.x += node.vx;
        node.x = Math.max(20, Math.min(width - 20, node.x));
      }

      if (node.fy !== null) {
        node.y = node.fy;
        node.vy = 0;
      } else {
        node.vy *= damping;
        node.y += node.vy;
        node.y = Math.max(20, Math.min(height - 20, node.y));
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Community detection (Label Propagation)                           */
/* ------------------------------------------------------------------ */

function detectCommunities(
  nodes: SimNode[],
  edges: TopologyEdge[],
): void {
  const nodeMap = new Map<string, SimNode>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  // Initialize: each node in its own community
  nodes.forEach((node, i) => {
    node.community = i;
  });

  // Build adjacency
  const adjacency = new Map<string, Array<{ neighbor: string; weight: number }>>();
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    adjacency.get(edge.source)?.push({ neighbor: edge.target, weight: edge.weight });
    adjacency.get(edge.target)?.push({ neighbor: edge.source, weight: edge.weight });
  }

  // Label propagation iterations
  const maxIter = 20;
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    // Shuffle node order
    const shuffled = [...nodes].sort(() => Math.random() - 0.5);

    for (const node of shuffled) {
      const neighbors = adjacency.get(node.id) ?? [];
      if (neighbors.length === 0) continue;

      // Count weighted community votes
      const votes = new Map<number, number>();
      for (const { neighbor, weight } of neighbors) {
        const n = nodeMap.get(neighbor);
        if (!n) continue;
        votes.set(n.community, (votes.get(n.community) ?? 0) + weight);
      }

      // Pick community with highest weight
      let bestCommunity = node.community;
      let bestWeight = 0;
      for (const [comm, w] of votes) {
        if (w > bestWeight) {
          bestWeight = w;
          bestCommunity = comm;
        }
      }

      if (bestCommunity !== node.community) {
        node.community = bestCommunity;
        changed = true;
      }
    }

    if (!changed) break;
  }

  // Normalize community IDs to sequential
  const communitySet = new Set(nodes.map((n) => n.community));
  const communityMap = new Map<number, number>();
  let idx = 0;
  for (const c of communitySet) {
    communityMap.set(c, idx++);
  }
  for (const node of nodes) {
    node.community = communityMap.get(node.community) ?? 0;
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function NetworkTopology({
  nodes,
  edges,
  width = 700,
  height = 500,
  showCommunities = true,
  minEdgeWeight = 0,
  className,
}: NetworkTopologyProps) {
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    lines: string[];
  } | null>(null);
  const [filterType, setFilterType] = useState<NodeType | "all">("all");
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredEdges = useMemo(
    () => edges.filter((e) => e.weight >= minEdgeWeight),
    [edges, minEdgeWeight],
  );

  // Run simulation on mount or data change
  useEffect(() => {
    const initial = initializePositions(nodes, width, height);
    runSimulation(initial, filteredEdges, width, height, 120);
    if (showCommunities) {
      detectCommunities(initial, filteredEdges);
    }
    setSimNodes([...initial]);
  }, [nodes, filteredEdges, width, height, showCommunities]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, SimNode>();
    for (const node of simNodes) {
      map.set(node.id, node);
    }
    return map;
  }, [simNodes]);

  const filteredNodes = useMemo(() => {
    if (filterType === "all") return simNodes;
    return simNodes.filter((n) => n.type === filterType);
  }, [simNodes, filterType]);

  const filteredNodeIds = useMemo(
    () => new Set(filteredNodes.map((n) => n.id)),
    [filteredNodes],
  );

  const visibleEdges = useMemo(
    () =>
      filteredEdges.filter(
        (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target),
      ),
    [filteredEdges, filteredNodeIds],
  );

  const maxEdgeWeight = useMemo(
    () => Math.max(...visibleEdges.map((e) => e.weight), 1),
    [visibleEdges],
  );

  const handleNodeMouseDown = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      e.preventDefault();
      setDraggedNode(nodeId);

      const handleMove = (me: MouseEvent) => {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const x = me.clientX - rect.left;
        const y = me.clientY - rect.top;

        setSimNodes((prev) =>
          prev.map((n) =>
            n.id === nodeId ? { ...n, x, y, fx: x, fy: y } : n,
          ),
        );
      };

      const handleUp = () => {
        setDraggedNode(null);
        setSimNodes((prev) =>
          prev.map((n) =>
            n.id === nodeId ? { ...n, fx: null, fy: null } : n,
          ),
        );
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
      };

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    },
    [],
  );

  const getNodeColor = useCallback(
    (node: SimNode): string => {
      if (showCommunities) {
        return COMMUNITY_COLORS[node.community % COMMUNITY_COLORS.length];
      }
      return NODE_COLORS[node.type];
    },
    [showCommunities],
  );

  const connectedTo = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    const connected = new Set<string>();
    for (const edge of visibleEdges) {
      if (edge.source === hoveredNode) connected.add(edge.target);
      if (edge.target === hoveredNode) connected.add(edge.source);
    }
    return connected;
  }, [hoveredNode, visibleEdges]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Filter controls */}
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="text-[10px] text-neutral-500">Filter:</span>
        {(["all", "model", "probe", "theory", "indicator"] as const).map(
          (type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-medium transition-colors",
                filterType === type
                  ? "bg-white/10 text-neutral-200"
                  : "text-neutral-500 hover:text-neutral-300",
              )}
            >
              {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ),
        )}
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="w-full rounded-xl border border-white/8 bg-white/[0.02]"
      >
        {/* Edges */}
        {visibleEdges.map((edge, i) => {
          const source = nodeMap.get(edge.source);
          const target = nodeMap.get(edge.target);
          if (!source || !target) return null;

          const isHighlighted =
            hoveredNode === edge.source || hoveredNode === edge.target;
          const isDimmed =
            hoveredNode !== null && !isHighlighted;
          const strokeWidth = 0.5 + (edge.weight / maxEdgeWeight) * 3;

          return (
            <line
              key={`${edge.source}-${edge.target}-${i}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={isHighlighted ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.08)"}
              strokeWidth={isDimmed ? 0.5 : strokeWidth}
              strokeOpacity={isDimmed ? 0.2 : 1}
              className="transition-opacity duration-150"
            />
          );
        })}

        {/* Nodes */}
        {filteredNodes.map((node) => {
          const r = NODE_RADII[node.type];
          const color = getNodeColor(node);
          const isHovered = hoveredNode === node.id;
          const isConnected = connectedTo.has(node.id);
          const isDimmed =
            hoveredNode !== null && !isHovered && !isConnected;

          return (
            <g
              key={node.id}
              className="cursor-pointer"
              onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
              onMouseEnter={(e) => {
                setHoveredNode(node.id);
                const container = containerRef.current;
                if (container) {
                  const rect = container.getBoundingClientRect();
                  setTooltip({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top - 10,
                    lines: [
                      node.label,
                      `Type: ${node.type}`,
                      ...(node.score != null
                        ? [`Score: ${(node.score * 100).toFixed(1)}%`]
                        : []),
                      ...(node.group ? [`Group: ${node.group}`] : []),
                      `Connections: ${connectedTo.size}`,
                    ],
                  });
                }
              }}
              onMouseLeave={() => {
                setHoveredNode(null);
                setTooltip(null);
              }}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={isHovered ? r + 2 : r}
                fill={color}
                fillOpacity={isDimmed ? 0.15 : 0.8}
                stroke={isHovered ? "rgba(255,255,255,0.6)" : color}
                strokeWidth={isHovered ? 2 : 1}
                strokeOpacity={isDimmed ? 0.1 : 0.5}
                className="transition-all duration-150"
              />
              {/* Label for larger nodes or when hovered */}
              {(r >= 10 || isHovered) && (
                <text
                  x={node.x}
                  y={node.y + r + 12}
                  fill={isDimmed ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.6)"}
                  fontSize={isHovered ? 10 : 8}
                  fontWeight={isHovered ? 600 : 400}
                  textAnchor="middle"
                  className="pointer-events-none select-none"
                >
                  {node.label.length > 15
                    ? node.label.slice(0, 15) + "..."
                    : node.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center gap-3 px-1">
        {(Object.entries(NODE_COLORS) as [NodeType, string][]).map(
          ([type, color]) => (
            <span
              key={type}
              className="flex items-center gap-1 text-[10px] text-neutral-500"
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              {type}
            </span>
          ),
        )}
      </div>

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
                "whitespace-nowrap text-[11px]",
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
