"use client";

import { useMemo } from "react";
import { buildQuadrant } from "@chetana/scorer";
import { cn } from "@/lib/utils";

/**
 * Capability vs consciousness quadrant chart (issue #618).
 *
 * Plots models on capability (x) vs consciousness probability (y) with labeled
 * quadrants, using the `buildQuadrant` transform from @chetana/scorer.
 */
export interface CapabilityQuadrantProps {
  points: { label: string; capability: number; consciousness: number }[];
  thresholds?: { capability: number; consciousness: number };
  width?: number;
  height?: number;
  className?: string;
}

export function CapabilityQuadrant({
  points,
  thresholds = { capability: 50, consciousness: 0.5 },
  width = 480,
  height = 420,
  className,
}: CapabilityQuadrantProps) {
  const classified = useMemo(
    () => buildQuadrant(points, thresholds),
    [points, thresholds]
  );

  const margin = { top: 24, right: 24, bottom: 40, left: 48 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  // Capability axis assumed 0-100; consciousness 0-1.
  const xScale = (v: number) => (v / 100) * innerW;
  const yScale = (v: number) => innerH - v * innerH;

  const tx = xScale(thresholds.capability);
  const ty = yScale(thresholds.consciousness);

  return (
    <div className={cn("relative w-full", className)}>
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="w-full rounded-xl border border-white/8 bg-white/[0.02]"
        role="img"
        aria-label="Capability versus consciousness quadrant"
      >
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Quadrant dividers */}
          <line x1={tx} y1={0} x2={tx} y2={innerH} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
          <line x1={0} y1={ty} x2={innerW} y2={ty} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />

          {/* Quadrant labels */}
          <text x={innerW - 4} y={12} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize={9}>
            high cap · high con
          </text>
          <text x={4} y={innerH - 4} fill="rgba(255,255,255,0.3)" fontSize={9}>
            low cap · low con
          </text>

          {/* Axes */}
          <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke="rgba(255,255,255,0.2)" />
          <line x1={0} y1={0} x2={0} y2={innerH} stroke="rgba(255,255,255,0.2)" />
          <text x={innerW / 2} y={innerH + 30} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={11}>
            Capability (MIQ)
          </text>
          <text transform={`translate(${-36},${innerH / 2}) rotate(-90)`} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={11}>
            Consciousness probability
          </text>

          {/* Points */}
          {classified.map((p) => (
            <g key={p.label}>
              <circle
                cx={xScale(p.capability)}
                cy={yScale(p.consciousness)}
                r={5}
                fill="#56B4E9"
                fillOpacity={0.85}
                stroke="rgba(0,0,0,0.3)"
              >
                <title>{`${p.label} — cap ${p.capability}, con ${p.consciousness} (${p.quadrant})`}</title>
              </circle>
              <text
                x={xScale(p.capability) + 8}
                y={yScale(p.consciousness) + 3}
                fill="rgba(255,255,255,0.6)"
                fontSize={9}
              >
                {p.label}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
