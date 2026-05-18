"use client";

/**
 * Probe dependency graph visualization (Issue #357).
 * Directed graph layout with D3-style force positioning,
 * hover to highlight dependency chains, probe status per node,
 * zoom/pan controls, export as SVG.
 */

import {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type ProbeNodeStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export interface ProbeNode {
  /** Unique node ID (probe ID). */
  id: string;
  /** Display label. */
  label: string;
  /** Theory this probe belongs to. */
  theory: string;
  /** Current status. */
  status: ProbeNodeStatus;
  /** Score (0-1) if completed. */
  score?: number;
  /** Indicator ID. */
  indicatorId?: string;
}

export interface ProbeEdge {
  /** Source node ID (dependency). */
  source: string;
  /** Target node ID (depends on source). */
  target: string;
}

export interface DependencyGraphProps {
  /** Nodes in the graph. */
  nodes: ProbeNode[];
  /** Edges (dependencies). */
  edges: ProbeEdge[];
  /** Width (default 800). */
  width?: number;
  /** Height (default 600). */
  height?: number;
  /** Callback when a node is clicked. */
  onNodeClick?: (node: ProbeNode) => void;
  /** Custom class name. */
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Force layout simulation                                           */
/* ------------------------------------------------------------------ */

interface SimNode extends ProbeNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number;
  fy?: number;
}

const STATUS_COLORS: Record<ProbeNodeStatus, string> = {
  pending: "#94a3b8",
  running: "#3b82f6",
  completed: "#22c55e",
  failed: "#ef4444",
  skipped: "#a855f7",
};

const THEORY_COLORS: Record<string, string> = {
  gwt: "#f59e0b",
  iit: "#8b5cf6",
  hot: "#ec4899",
  rpt: "#14b8a6",
  pp: "#3b82f6",
  ast: "#f97316",
};

function runForceSimulation(
  nodes: ProbeNode[],
  edges: ProbeEdge[],
  width: number,
  height: number,
  iterations: number = 100
): SimNode[] {
  const simNodes: SimNode[] = nodes.map((n, i) => ({
    ...n,
    x: width / 2 + (Math.random() - 0.5) * width * 0.6,
    y: height / 2 + (Math.random() - 0.5) * height * 0.6,
    vx: 0,
    vy: 0,
  }));

  const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations;
    const decay = 0.6 * alpha;

    // Repulsion (all pairs)
    for (let i = 0; i < simNodes.length; i++) {
      for (let j = i + 1; j < simNodes.length; j++) {
        const a = simNodes[i]!;
        const b = simNodes[j]!;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (-300 * decay) / (dist * dist);
        dx *= force / dist;
        dy *= force / dist;
        a.vx -= dx;
        a.vy -= dy;
        b.vx += dx;
        b.vy += dy;
      }
    }

    // Attraction (edges)
    for (const edge of edges) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) continue;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - 120) * 0.01 * decay;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    }

    // Center gravity
    for (const node of simNodes) {
      node.vx += (width / 2 - node.x) * 0.005 * decay;
      node.vy += (height / 2 - node.y) * 0.005 * decay;
    }

    // Apply velocities with damping
    for (const node of simNodes) {
      if (node.fx !== undefined) {
        node.x = node.fx;
        node.vx = 0;
      } else {
        node.vx *= 0.6;
        node.x += node.vx;
      }
      if (node.fy !== undefined) {
        node.y = node.fy;
        node.vy = 0;
      } else {
        node.vy *= 0.6;
        node.y += node.vy;
      }

      // Boundary constraints
      node.x = Math.max(40, Math.min(width - 40, node.x));
      node.y = Math.max(40, Math.min(height - 40, node.y));
    }
  }

  return simNodes;
}

/* ------------------------------------------------------------------ */
/*  Dependency chain highlighting                                     */
/* ------------------------------------------------------------------ */

function getDependencyChain(
  nodeId: string,
  edges: ProbeEdge[],
  direction: "upstream" | "downstream" | "both"
): Set<string> {
  const chain = new Set<string>();
  chain.add(nodeId);

  const visited = new Set<string>();
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    chain.add(current);

    for (const edge of edges) {
      if (
        (direction === "upstream" || direction === "both") &&
        edge.target === current &&
        !visited.has(edge.source)
      ) {
        queue.push(edge.source);
      }
      if (
        (direction === "downstream" || direction === "both") &&
        edge.source === current &&
        !visited.has(edge.target)
      ) {
        queue.push(edge.target);
      }
    }
  }

  return chain;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function DependencyGraph({
  nodes,
  edges,
  width = 800,
  height = 600,
  onNodeClick,
  className,
}: DependencyGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    node: ProbeNode;
  } | null>(null);

  // Run force simulation
  const simNodes = useMemo(
    () => runForceSimulation(nodes, edges, width, height),
    [nodes, edges, width, height]
  );

  const nodePositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const n of simNodes) {
      map.set(n.id, { x: n.x, y: n.y });
    }
    return map;
  }, [simNodes]);

  // Highlighted chain
  const highlightedNodes = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    return getDependencyChain(hoveredNode, edges, "both");
  }, [hoveredNode, edges]);

  const highlightedEdges = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    const edgeSet = new Set<string>();
    for (const edge of edges) {
      if (highlightedNodes.has(edge.source) && highlightedNodes.has(edge.target)) {
        edgeSet.add(`${edge.source}->${edge.target}`);
      }
    }
    return edgeSet;
  }, [hoveredNode, edges, highlightedNodes]);

  // Arrow marker
  const arrowId = "dep-arrow";

  // Zoom controls
  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(3, z + 0.2)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(0.3, z - 0.2)), []);
  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Pan handling
  const handleMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      if (e.target === svgRef.current || (e.target as Element).tagName === "rect") {
        setIsPanning(true);
        panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      }
    },
    [pan]
  );

  const handleMouseMove = useCallback(
    (e: ReactMouseEvent) => {
      if (isPanning) {
        setPan({
          x: e.clientX - panStart.current.x,
          y: e.clientY - panStart.current.y,
        });
      }
    },
    [isPanning]
  );

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  // Export SVG
  const exportSVG = useCallback(() => {
    if (!svgRef.current) return;
    const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgClone);
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dependency-graph.svg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Wheel zoom
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((z) => Math.max(0.3, Math.min(3, z + delta)));
    };
    svg.addEventListener("wheel", handler, { passive: false });
    return () => svg.removeEventListener("wheel", handler);
  }, []);

  const nodeRadius = 24;

  return (
    <div className={cn("relative select-none", className)}>
      {/* Controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <button
          onClick={handleZoomIn}
          className="rounded bg-white/90 px-2 py-1 text-sm shadow hover:bg-white"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="rounded bg-white/90 px-2 py-1 text-sm shadow hover:bg-white"
          aria-label="Zoom out"
        >
          -
        </button>
        <button
          onClick={handleZoomReset}
          className="rounded bg-white/90 px-2 py-1 text-xs shadow hover:bg-white"
          aria-label="Reset zoom"
        >
          Reset
        </button>
        <button
          onClick={exportSVG}
          className="rounded bg-white/90 px-2 py-1 text-xs shadow hover:bg-white"
          aria-label="Export SVG"
        >
          SVG
        </button>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 rounded bg-gray-900 px-3 py-2 text-xs text-white shadow-lg"
          style={{ left: tooltip.x + 16, top: tooltip.y - 8 }}
        >
          <div className="font-semibold">{tooltip.node.label}</div>
          <div>Theory: {tooltip.node.theory.toUpperCase()}</div>
          <div>Status: {tooltip.node.status}</div>
          {tooltip.node.score !== undefined && (
            <div>Score: {(tooltip.node.score * 100).toFixed(1)}%</div>
          )}
          {tooltip.node.indicatorId && (
            <div>Indicator: {tooltip.node.indicatorId}</div>
          )}
        </div>
      )}

      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <marker
            id={arrowId}
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 Z" fill="#94a3b8" />
          </marker>
          <marker
            id={`${arrowId}-highlight`}
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 Z" fill="#3b82f6" />
          </marker>
        </defs>

        {/* Background for pan target */}
        <rect width={width} height={height} fill="transparent" />

        <g
          transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
        >
          {/* Edges */}
          {edges.map((edge) => {
            const source = nodePositions.get(edge.source);
            const target = nodePositions.get(edge.target);
            if (!source || !target) return null;

            const edgeKey = `${edge.source}->${edge.target}`;
            const isHighlighted = highlightedEdges.has(edgeKey);
            const dimmed = hoveredNode && !isHighlighted;

            // Shorten line to not overlap node circles
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const offsetX = (dx / dist) * (nodeRadius + 8);
            const offsetY = (dy / dist) * (nodeRadius + 8);

            return (
              <line
                key={edgeKey}
                x1={source.x + offsetX}
                y1={source.y + offsetY}
                x2={target.x - offsetX}
                y2={target.y - offsetY}
                stroke={isHighlighted ? "#3b82f6" : "#cbd5e1"}
                strokeWidth={isHighlighted ? 2.5 : 1.5}
                markerEnd={`url(#${isHighlighted ? `${arrowId}-highlight` : arrowId})`}
                opacity={dimmed ? 0.15 : 1}
                style={{ transition: "opacity 0.2s, stroke 0.2s" }}
              />
            );
          })}

          {/* Nodes */}
          {simNodes.map((node) => {
            const isHighlighted = highlightedNodes.has(node.id);
            const dimmed = hoveredNode && !isHighlighted;
            const isHovered = hoveredNode === node.id;
            const borderColor =
              THEORY_COLORS[node.theory] ?? "#6b7280";
            const fillColor = STATUS_COLORS[node.status];

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                style={{
                  cursor: "pointer",
                  transition: "opacity 0.2s",
                  opacity: dimmed ? 0.25 : 1,
                }}
                onMouseEnter={(e) => {
                  setHoveredNode(node.id);
                  setTooltip({
                    x: e.clientX,
                    y: e.clientY,
                    node,
                  });
                }}
                onMouseLeave={() => {
                  setHoveredNode(null);
                  setTooltip(null);
                }}
                onClick={() => onNodeClick?.(node)}
              >
                {/* Outer ring (theory color) */}
                <circle
                  r={nodeRadius + 3}
                  fill="none"
                  stroke={borderColor}
                  strokeWidth={isHovered ? 3 : 2}
                />
                {/* Inner circle (status color) */}
                <circle r={nodeRadius} fill={fillColor} />
                {/* Score indicator */}
                {node.score !== undefined && node.status === "completed" && (
                  <circle
                    r={nodeRadius}
                    fill="none"
                    stroke="white"
                    strokeWidth={3}
                    strokeDasharray={`${node.score * 2 * Math.PI * nodeRadius} ${2 * Math.PI * nodeRadius}`}
                    strokeDashoffset={0}
                    transform="rotate(-90)"
                    opacity={0.8}
                  />
                )}
                {/* Label */}
                <text
                  textAnchor="middle"
                  dy="0.35em"
                  fontSize={10}
                  fontWeight={isHovered ? "bold" : "normal"}
                  fill="white"
                  style={{ pointerEvents: "none" }}
                >
                  {node.label.length > 8
                    ? node.label.slice(0, 7) + "…"
                    : node.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
        <span className="font-semibold">Status:</span>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            {status}
          </span>
        ))}
      </div>
    </div>
  );
}
