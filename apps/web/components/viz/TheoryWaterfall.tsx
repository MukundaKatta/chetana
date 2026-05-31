"use client";

import { useMemo } from "react";
import { buildTheoryWaterfall, type WaterfallStep } from "@chetana/scorer";
import { cn } from "@/lib/utils";

/**
 * Theory contribution waterfall chart (issue #617).
 *
 * Visualizes how each theory's weighted score contributes to the overall
 * consciousness probability, using the framework-agnostic `buildTheoryWaterfall`
 * transform from @chetana/scorer.
 */
export interface TheoryWaterfallProps {
  theoryScores: Record<string, number>;
  weights: Record<string, number>;
  width?: number;
  height?: number;
  className?: string;
}

const THEORY_COLORS: Record<string, string> = {
  gwt: "#56B4E9",
  iit: "#E69F00",
  hot: "#009E73",
  rpt: "#CC79A7",
  pp: "#0072B2",
  ast: "#D55E00",
};

export function TheoryWaterfall({
  theoryScores,
  weights,
  width = 520,
  height = 300,
  className,
}: TheoryWaterfallProps) {
  const steps: WaterfallStep[] = useMemo(
    () => buildTheoryWaterfall(theoryScores, weights),
    [theoryScores, weights]
  );

  const margin = { top: 20, right: 20, bottom: 40, left: 44 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const maxTotal = useMemo(
    () => Math.max(0.0001, ...steps.map((s) => s.runningTotal)),
    [steps]
  );

  const barWidth = steps.length > 0 ? (innerW / steps.length) * 0.7 : 0;
  const gap = steps.length > 0 ? (innerW / steps.length) * 0.3 : 0;
  const yScale = (v: number) => innerH - (v / maxTotal) * innerH;

  return (
    <div className={cn("relative w-full", className)}>
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="w-full rounded-xl border border-white/8 bg-white/[0.02]"
        role="img"
        aria-label="Theory contribution waterfall"
      >
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Baseline */}
          <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke="rgba(255,255,255,0.15)" />

          {steps.map((step, i) => {
            const prev = i === 0 ? 0 : steps[i - 1].runningTotal;
            const top = yScale(step.runningTotal);
            const bottom = yScale(prev);
            const x = i * (barWidth + gap);
            return (
              <g key={step.theory}>
                <rect
                  x={x}
                  y={top}
                  width={barWidth}
                  height={Math.max(1, bottom - top)}
                  fill={THEORY_COLORS[step.theory] ?? "#888"}
                  fillOpacity={0.85}
                  rx={2}
                >
                  <title>
                    {`${step.theory.toUpperCase()}: +${step.contribution.toFixed(3)} → ${step.runningTotal.toFixed(3)}`}
                  </title>
                </rect>
                <text
                  x={x + barWidth / 2}
                  y={innerH + 16}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.5)"
                  fontSize={10}
                >
                  {step.theory.toUpperCase()}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={top - 4}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.6)"
                  fontSize={9}
                >
                  {step.contribution.toFixed(2)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
