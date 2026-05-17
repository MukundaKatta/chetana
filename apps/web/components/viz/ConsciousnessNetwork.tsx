"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { getTheoryColor } from "@/lib/utils";

interface IndicatorNode {
  id: string;
  score: number;
  theory: string;
}

interface Correlation {
  source: string;
  target: string;
  weight: number;
}

interface ConsciousnessNetworkProps {
  indicators: IndicatorNode[];
  correlations?: Correlation[];
}

type SimNode = IndicatorNode & d3.SimulationNodeDatum;
type SimLink = d3.SimulationLinkDatum<SimNode> & { weight: number };

export function ConsciousnessNetwork({
  indicators,
  correlations = [],
}: ConsciousnessNetworkProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({ visible: false, x: 0, y: 0, content: "" });

  const hideTooltip = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = containerRef.current;
    if (!container || indicators.length === 0) return;

    const width = container.clientWidth;
    const height = 500;

    svg.attr("width", width).attr("height", height);

    const nodes: SimNode[] = indicators.map((d) => ({ ...d }));

    // Filter correlations to only those above threshold 0.5
    const filteredCorrelations = correlations.filter((c) => c.weight > 0.5);
    const links: SimLink[] = filteredCorrelations.map((d) => ({
      source: d.source,
      target: d.target,
      weight: d.weight,
    }));

    // Node radius scaled by score (min 12, max 36)
    const radiusScale = d3.scaleLinear().domain([0, 1]).range([12, 36]);

    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance(120)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide<SimNode>((d) => radiusScale(d.score) + 8));

    // Draw links
    const link = svg
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "rgba(255, 255, 255, 0.15)")
      .attr("stroke-width", (d) => Math.max(1, d.weight * 3))
      .attr("stroke-opacity", (d) => 0.2 + d.weight * 0.5)
      .attr("stroke-dasharray", "4 3");

    // Draw nodes
    const node = svg
      .append("g")
      .selectAll<SVGGElement, SimNode>("g")
      .data(nodes)
      .join("g")
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Node circles
    node
      .append("circle")
      .attr("r", (d) => radiusScale(d.score))
      .attr("fill", (d) => getTheoryColor(d.theory))
      .attr("fill-opacity", 0.2)
      .attr("stroke", (d) => getTheoryColor(d.theory))
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.7)
      .style("cursor", "grab")
      .style("filter", "drop-shadow(0 0 6px rgba(255,255,255,0.08))");

    // Node labels
    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", "#e5e7eb")
      .attr("font-size", (d) => (radiusScale(d.score) > 20 ? "10px" : "8px"))
      .attr("font-weight", "600")
      .style("pointer-events", "none")
      .text((d) => d.id);

    // Hover events
    node
      .on("mouseenter", (event, d) => {
        const rect = container.getBoundingClientRect();
        setTooltip({
          visible: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top - 10,
          content: `${d.id} (${d.theory.toUpperCase()}) — Score: ${(d.score * 100).toFixed(1)}%`,
        });
      })
      .on("mouseleave", hideTooltip);

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimNode).x!)
        .attr("y1", (d) => (d.source as SimNode).y!)
        .attr("x2", (d) => (d.target as SimNode).x!)
        .attr("y2", (d) => (d.target as SimNode).y!);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [indicators, correlations, hideTooltip]);

  if (indicators.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center text-sm text-gray-500">
        No indicator data available for network visualization.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        ref={svgRef}
        className="w-full rounded-xl border border-gray-800 bg-gray-950/50"
        style={{ minHeight: 500 }}
      />
      {tooltip.visible && (
        <div
          className="pointer-events-none absolute z-20 rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-200 shadow-xl"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}
