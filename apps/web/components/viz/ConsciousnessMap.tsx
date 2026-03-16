"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface TheoryNode {
  id: string;
  name: string;
  fullName: string;
  color: string;
}

interface IndicatorLink {
  source: string;
  target: string;
  indicator: string;
}

const THEORY_NODES: TheoryNode[] = [
  { id: "gwt", name: "GWT", fullName: "Global Workspace Theory", color: "var(--color-theory-gwt)" },
  { id: "iit", name: "IIT", fullName: "Integrated Information Theory", color: "var(--color-theory-iit)" },
  { id: "hot", name: "HOT", fullName: "Higher-Order Theories", color: "var(--color-theory-hot)" },
  { id: "rpt", name: "RPT", fullName: "Recurrent Processing Theory", color: "var(--color-theory-rpt)" },
  { id: "pp", name: "PP", fullName: "Predictive Processing", color: "var(--color-theory-pp)" },
  { id: "ast", name: "AST", fullName: "Attention Schema Theory", color: "var(--color-theory-ast)" },
];

// Shared concepts between theories create edges
const SHARED_LINKS: IndicatorLink[] = [
  { source: "gwt", target: "iit", indicator: "Information Integration" },
  { source: "gwt", target: "hot", indicator: "Flexible Attention" },
  { source: "gwt", target: "rpt", indicator: "Recurrent Broadcasting" },
  { source: "hot", target: "ast", indicator: "Self-Model" },
  { source: "pp", target: "rpt", indicator: "Feedback Loops" },
  { source: "pp", target: "gwt", indicator: "Prediction Integration" },
  { source: "ast", target: "hot", indicator: "Attention Monitoring" },
  { source: "iit", target: "rpt", indicator: "Recurrent Integration" },
  { source: "pp", target: "hot", indicator: "Metacognitive Prediction" },
];

type SimNode = TheoryNode & d3.SimulationNodeDatum;
type SimLink = d3.SimulationLinkDatum<SimNode> & { indicator: string };

export function ConsciousnessMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({ visible: false, x: 0, y: 0, content: "" });

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = 480;

    svg.attr("width", width).attr("height", height);

    const nodes: SimNode[] = THEORY_NODES.map((d) => ({ ...d }));
    const links: SimLink[] = SHARED_LINKS.map((d) => ({
      source: d.source,
      target: d.target,
      indicator: d.indicator,
    }));

    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance(140)
      )
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(50));

    // Draw links
    const link = svg
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "rgba(255, 255, 255, 0.1)")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4 4");

    // Draw link labels
    const linkLabel = svg
      .append("g")
      .selectAll("text")
      .data(links)
      .join("text")
      .attr("fill", "rgba(255, 255, 255, 0.25)")
      .attr("font-size", "9px")
      .attr("text-anchor", "middle")
      .text((d) => d.indicator);

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

    // Node circles with glow
    node
      .append("circle")
      .attr("r", 32)
      .attr("fill", (d) => d.color)
      .attr("fill-opacity", 0.15)
      .attr("stroke", (d) => d.color)
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.6)
      .style("cursor", "grab")
      .style("filter", "drop-shadow(0 0 8px rgba(255,255,255,0.1))");

    // Node labels
    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", "#fff")
      .attr("font-size", "13px")
      .attr("font-weight", "700")
      .style("pointer-events", "none")
      .text((d) => d.name);

    // Hover events
    node
      .on("mouseenter", (event, d) => {
        const rect = container.getBoundingClientRect();
        setTooltip({
          visible: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top - 10,
          content: d.fullName,
        });
      })
      .on("mouseleave", () => {
        setTooltip((prev) => ({ ...prev, visible: false }));
      });

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimNode).x!)
        .attr("y1", (d) => (d.source as SimNode).y!)
        .attr("x2", (d) => (d.target as SimNode).x!)
        .attr("y2", (d) => (d.target as SimNode).y!);

      linkLabel
        .attr(
          "x",
          (d) => ((d.source as SimNode).x! + (d.target as SimNode).x!) / 2
        )
        .attr(
          "y",
          (d) => ((d.source as SimNode).y! + (d.target as SimNode).y!) / 2
        );

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        ref={svgRef}
        className="w-full rounded-xl border border-white/8 bg-white/[0.02]"
        style={{ minHeight: 480 }}
      />
      {tooltip.visible && (
        <div
          className="pointer-events-none absolute z-20 rounded-lg border border-white/15 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-200 shadow-xl"
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
