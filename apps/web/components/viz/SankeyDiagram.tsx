"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { cn } from "@/lib/utils";
import {
  getTheoryColor,
  THEORY_SHORT_LABELS,
  type PaletteType,
  type Theory,
} from "./ColorBlindPalette";

/* ------------------------------------------------------------------ */
/*  Public types                                                      */
/* ------------------------------------------------------------------ */

export interface ProbeScore {
  id: string;
  label: string;
  /** Which indicator does this probe feed? */
  indicatorId: string;
  score: number;
}

export interface IndicatorScore {
  id: string;
  label: string;
  /** Which theory does this indicator belong to? */
  theoryId: Theory;
  score: number;
}

export interface TheoryScore {
  id: Theory;
  label: string;
  score: number;
}

export interface SankeyDiagramProps {
  probeScores: ProbeScore[];
  indicatorScores: IndicatorScore[];
  theoryScores: TheoryScore[];
  overallScore: number;
  palette?: PaletteType;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Internal layout types (manual Sankey)                             */
/* ------------------------------------------------------------------ */

interface SankeyNode {
  id: string;
  label: string;
  column: number;
  color: string;
  x: number;
  y: number;
  height: number;
  score: number;
}

interface SankeyLink {
  source: SankeyNode;
  target: SankeyNode;
  value: number;
  color: string;
  sy: number;
  ty: number;
  thickness: number;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

const COL_X = [40, 240, 440, 620];
const NODE_PAD = 8;
const MIN_NODE_H = 14;
const MIN_LINK = 2;

export function SankeyDiagram({
  probeScores,
  indicatorScores,
  theoryScores,
  overallScore,
  palette = "wong",
  className,
}: SankeyDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  const height = 480;

  const { nodes, links } = useMemo(() => {
    // ---- Build nodes per column ---- //
    const buildColumn = (
      items: { id: string; label: string; score: number; color: string }[],
      col: number,
      availableH: number,
    ): SankeyNode[] => {
      const totalScore = items.reduce((s, i) => s + Math.max(i.score, 0.01), 0);
      let curY = NODE_PAD;
      return items.map((item) => {
        const frac = Math.max(item.score, 0.01) / totalScore;
        const h = Math.max(frac * (availableH - NODE_PAD * (items.length + 1)), MIN_NODE_H);
        const node: SankeyNode = {
          ...item,
          column: col,
          x: COL_X[col],
          y: curY,
          height: h,
          score: item.score,
        };
        curY += h + NODE_PAD;
        return node;
      });
    };

    const usableH = height - 20;

    const probeNodes = buildColumn(
      probeScores.map((p) => ({
        id: p.id,
        label: p.label,
        score: p.score,
        color: getTheoryColor(
          indicatorScores.find((i) => i.id === p.indicatorId)?.theoryId ?? "gwt",
          palette,
        ),
      })),
      0,
      usableH,
    );

    const indicatorNodes = buildColumn(
      indicatorScores.map((i) => ({
        id: i.id,
        label: i.label,
        score: i.score,
        color: getTheoryColor(i.theoryId, palette),
      })),
      1,
      usableH,
    );

    const theoryNodes = buildColumn(
      theoryScores.map((t) => ({
        id: t.id,
        label: t.label,
        score: t.score,
        color: getTheoryColor(t.id, palette),
      })),
      2,
      usableH,
    );

    const overallNodes = buildColumn(
      [
        {
          id: "overall",
          label: `Overall ${(overallScore * 100).toFixed(0)}%`,
          score: overallScore,
          color: "#a3a3a3",
        },
      ],
      3,
      usableH,
    );

    const allNodes = [...probeNodes, ...indicatorNodes, ...theoryNodes, ...overallNodes];
    const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

    // ---- Build links ---- //
    const allLinks: SankeyLink[] = [];

    // Track running offsets per node for stacking links.
    const srcOffset = new Map<string, number>();
    const tgtOffset = new Map<string, number>();
    allNodes.forEach((n) => {
      srcOffset.set(n.id, 0);
      tgtOffset.set(n.id, 0);
    });

    const addLink = (srcId: string, tgtId: string, value: number) => {
      const src = nodeMap.get(srcId);
      const tgt = nodeMap.get(tgtId);
      if (!src || !tgt) return;
      const thickness = Math.max(value * src.height, MIN_LINK);
      const sy = src.y + (srcOffset.get(srcId) ?? 0);
      const ty = tgt.y + (tgtOffset.get(tgtId) ?? 0);
      srcOffset.set(srcId, (srcOffset.get(srcId) ?? 0) + thickness);
      tgtOffset.set(tgtId, (tgtOffset.get(tgtId) ?? 0) + thickness);
      allLinks.push({
        source: src,
        target: tgt,
        value,
        color: src.color,
        sy,
        ty,
        thickness,
      });
    };

    // Probes -> Indicators
    for (const p of probeScores) {
      addLink(p.id, p.indicatorId, p.score);
    }

    // Indicators -> Theories
    for (const ind of indicatorScores) {
      addLink(ind.id, ind.theoryId, ind.score);
    }

    // Theories -> Overall
    for (const t of theoryScores) {
      addLink(t.id, "overall", t.score);
    }

    return { nodes: allNodes, links: allLinks };
  }, [probeScores, indicatorScores, theoryScores, overallScore, palette]);

  // Determine which links belong to a highlighted path.
  const highlightedLinks = useMemo(() => {
    if (!hoveredNode && !hoveredLink) return new Set<number>();
    const ids = new Set<number>();

    if (hoveredNode) {
      links.forEach((l, i) => {
        if (l.source.id === hoveredNode || l.target.id === hoveredNode) ids.add(i);
      });
      // Second-degree: if a link was already highlighted, highlight onward links too
      const connectedNodes = new Set<string>();
      ids.forEach((i) => {
        connectedNodes.add(links[i].source.id);
        connectedNodes.add(links[i].target.id);
      });
      links.forEach((l, i) => {
        if (connectedNodes.has(l.source.id) || connectedNodes.has(l.target.id)) ids.add(i);
      });
    }

    if (hoveredLink) {
      const idx = parseInt(hoveredLink, 10);
      if (!isNaN(idx)) ids.add(idx);
    }

    return ids;
  }, [hoveredNode, hoveredLink, links]);

  const anyHover = hoveredNode !== null || hoveredLink !== null;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <svg
        width="100%"
        viewBox={`0 0 700 ${height}`}
        className="w-full rounded-xl border border-white/8 bg-white/[0.02]"
      >
        {/* Column labels */}
        {["Probes", "Indicators", "Theories", "Overall"].map((lbl, i) => (
          <text
            key={lbl}
            x={COL_X[i] + 10}
            y={14}
            fill="rgba(255,255,255,0.35)"
            fontSize={10}
            fontWeight={600}
          >
            {lbl}
          </text>
        ))}

        {/* Links */}
        <g>
          {links.map((link, i) => {
            const x0 = link.source.x + 22;
            const x1 = link.target.x - 2;
            const midX = (x0 + x1) / 2;
            const d = `M${x0},${link.sy + link.thickness / 2}
              C${midX},${link.sy + link.thickness / 2}
               ${midX},${link.ty + link.thickness / 2}
               ${x1},${link.ty + link.thickness / 2}`;

            const dimmed = anyHover && !highlightedLinks.has(i);

            return (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={link.color}
                strokeWidth={link.thickness}
                strokeOpacity={dimmed ? 0.08 : 0.35}
                className="transition-opacity duration-150"
                onMouseEnter={(e) => {
                  setHoveredLink(String(i));
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    setTooltip({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top - 12,
                      text: `${link.source.label} -> ${link.target.label}: ${(link.value * 100).toFixed(0)}%`,
                    });
                  }
                }}
                onMouseLeave={() => {
                  setHoveredLink(null);
                  setTooltip(null);
                }}
              />
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {nodes.map((node) => {
            const dimmed = anyHover && hoveredNode !== null && hoveredNode !== node.id;
            return (
              <g
                key={node.id}
                onMouseEnter={(e) => {
                  setHoveredNode(node.id);
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    setTooltip({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top - 12,
                      text: `${node.label}: ${(node.score * 100).toFixed(0)}%`,
                    });
                  }
                }}
                onMouseLeave={() => {
                  setHoveredNode(null);
                  setTooltip(null);
                }}
                className="cursor-pointer"
              >
                <rect
                  x={node.x}
                  y={node.y}
                  width={20}
                  height={node.height}
                  rx={3}
                  fill={node.color}
                  fillOpacity={dimmed ? 0.1 : 0.3}
                  stroke={node.color}
                  strokeWidth={1.5}
                  strokeOpacity={dimmed ? 0.15 : 0.7}
                  className="transition-opacity duration-150"
                />
                <text
                  x={node.x + 24}
                  y={node.y + node.height / 2}
                  dominantBaseline="central"
                  fill={dimmed ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.7)"}
                  fontSize={9}
                  fontWeight={500}
                  className="pointer-events-none transition-opacity duration-150"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 rounded-lg border border-white/15 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-200 shadow-xl"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
