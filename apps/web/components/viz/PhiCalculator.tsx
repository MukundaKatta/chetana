"use client";

import { useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";

interface Node {
  id: number;
  x: number;
  y: number;
  active: boolean;
}

interface Connection {
  from: number;
  to: number;
}

const INITIAL_NODES: Node[] = [
  { id: 0, x: 150, y: 60, active: true },
  { id: 1, x: 260, y: 130, active: true },
  { id: 2, x: 230, y: 260, active: false },
  { id: 3, x: 100, y: 260, active: false },
  { id: 4, x: 60, y: 130, active: true },
];

export function PhiCalculator() {
  const [nodes, setNodes] = useState<Node[]>(INITIAL_NODES);
  const [connections, setConnections] = useState<Connection[]>([
    { from: 0, to: 1 },
    { from: 1, to: 2 },
    { from: 0, to: 4 },
  ]);
  const [connectMode, setConnectMode] = useState<number | null>(null);

  const toggleNode = useCallback((id: number) => {
    if (connectMode !== null) {
      if (connectMode !== id) {
        setConnections((prev) => {
          const exists = prev.some(
            (c) =>
              (c.from === connectMode && c.to === id) ||
              (c.from === id && c.to === connectMode)
          );
          if (exists) {
            return prev.filter(
              (c) =>
                !(
                  (c.from === connectMode && c.to === id) ||
                  (c.from === id && c.to === connectMode)
                )
            );
          }
          return [...prev, { from: connectMode, to: id }];
        });
      }
      setConnectMode(null);
      return;
    }
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, active: !n.active } : n))
    );
  }, [connectMode]);

  const startConnect = useCallback((id: number, e: React.MouseEvent) => {
    e.preventDefault();
    setConnectMode((prev) => (prev === id ? null : id));
  }, []);

  // Simplified Phi calculation:
  // Phi = (number of active bidirectional connections) * integration factor
  const phi = useMemo(() => {
    const activeNodeIds = new Set(nodes.filter((n) => n.active).map((n) => n.id));
    const activeConnections = connections.filter(
      (c) => activeNodeIds.has(c.from) && activeNodeIds.has(c.to)
    );

    if (activeNodeIds.size <= 1) return 0;

    // Integration: how connected are the active nodes
    const maxConnections = (activeNodeIds.size * (activeNodeIds.size - 1)) / 2;
    if (maxConnections === 0) return 0;

    const connectivity = activeConnections.length / maxConnections;

    // Phi approximation based on active nodes and connectivity
    const rawPhi = activeNodeIds.size * connectivity;
    return Math.round(rawPhi * 100) / 100;
  }, [nodes, connections]);

  const phiColor =
    phi < 1 ? "text-red-400" : phi < 2 ? "text-yellow-400" : "text-green-400";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-neutral-200">
            Interactive Phi Calculator
          </h3>
          <p className="text-xs text-neutral-500">
            Click nodes to toggle. Right-click to connect/disconnect.
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-neutral-500">
            Integrated Information
          </div>
          <div className={cn("text-3xl font-bold tabular-nums", phiColor)}>
            &Phi; = {phi.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
        <svg width="320" height="320" viewBox="0 0 320 320" className="w-full">
          {/* Connections */}
          {connections.map((conn, i) => {
            const fromNode = nodes.find((n) => n.id === conn.from)!;
            const toNode = nodes.find((n) => n.id === conn.to)!;
            const bothActive = fromNode.active && toNode.active;
            return (
              <line
                key={`${conn.from}-${conn.to}-${i}`}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke={bothActive ? "rgba(34, 197, 94, 0.5)" : "rgba(255, 255, 255, 0.1)"}
                strokeWidth={bothActive ? 2.5 : 1.5}
                strokeDasharray={bothActive ? "none" : "6 4"}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => (
            <g key={node.id}>
              {/* Glow for active nodes */}
              {node.active && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={28}
                  fill="rgba(34, 197, 94, 0.08)"
                />
              )}
              <circle
                cx={node.x}
                cy={node.y}
                r={22}
                fill={node.active ? "rgba(34, 197, 94, 0.2)" : "rgba(255, 255, 255, 0.05)"}
                stroke={
                  connectMode === node.id
                    ? "#60a5fa"
                    : node.active
                      ? "rgba(34, 197, 94, 0.6)"
                      : "rgba(255, 255, 255, 0.15)"
                }
                strokeWidth={connectMode === node.id ? 3 : 2}
                className="cursor-pointer transition-colors"
                onClick={() => toggleNode(node.id)}
                onContextMenu={(e) => startConnect(node.id, e)}
              />
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={node.active ? "#22c55e" : "rgba(255, 255, 255, 0.3)"}
                fontSize={12}
                fontWeight={700}
                className="pointer-events-none select-none"
              >
                N{node.id}
              </text>
            </g>
          ))}

          {/* Connect mode indicator */}
          {connectMode !== null && (
            <text
              x={160}
              y={310}
              textAnchor="middle"
              fill="#60a5fa"
              fontSize={11}
            >
              Click another node to connect/disconnect
            </text>
          )}
        </svg>
      </div>

      {/* Info */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-white/8 bg-white/[0.02] px-2 py-2">
          <div className="text-lg font-bold text-neutral-200">
            {nodes.filter((n) => n.active).length}
          </div>
          <div className="text-[10px] text-neutral-500">Active Nodes</div>
        </div>
        <div className="rounded-lg border border-white/8 bg-white/[0.02] px-2 py-2">
          <div className="text-lg font-bold text-neutral-200">
            {connections.length}
          </div>
          <div className="text-[10px] text-neutral-500">Connections</div>
        </div>
        <div className="rounded-lg border border-white/8 bg-white/[0.02] px-2 py-2">
          <div className={cn("text-lg font-bold", phiColor)}>
            {phi.toFixed(2)}
          </div>
          <div className="text-[10px] text-neutral-500">&Phi; Value</div>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-neutral-600">
        This is a simplified demonstration of Integrated Information Theory
        (IIT). In the full theory, Phi measures the irreducible integrated
        information of a system -- how much the whole is greater than the sum of
        its parts. Toggle nodes on/off and connect them to see how integration
        changes.
      </p>
    </div>
  );
}
