"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface ConsciousnessGaugeProps {
  score: number;
  uncertaintyLower?: number;
  uncertaintyUpper?: number;
}

function scoreToColor(score: number): string {
  if (score < 0.25) return "#ef4444";
  if (score < 0.45) return "#f97316";
  if (score < 0.65) return "#eab308";
  if (score < 0.8) return "#84cc16";
  return "#22c55e";
}

export function ConsciousnessGauge({
  score,
  uncertaintyLower,
  uncertaintyUpper,
}: ConsciousnessGaugeProps) {
  const percent = Math.round(score * 100);
  const size = 240;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  const startAngle = 135;
  const endAngle = 405;
  const totalAngle = endAngle - startAngle;

  const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const describeArc = (cx: number, cy: number, r: number, start: number, end: number) => {
    const s = polarToCartesian(cx, cy, r, start);
    const e = polarToCartesian(cx, cy, r, end);
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  const filledAngle = startAngle + totalAngle * score;
  const primaryColor = scoreToColor(score);

  const gradientId = useMemo(() => `gauge-grad-${Math.random().toString(36).slice(2, 9)}`, []);

  const uncertaintyArc = useMemo(() => {
    if (uncertaintyLower === undefined || uncertaintyUpper === undefined) return null;
    const lowerAngle = startAngle + totalAngle * uncertaintyLower;
    const upperAngle = startAngle + totalAngle * uncertaintyUpper;
    return describeArc(center, center, radius, lowerAngle, upperAngle);
  }, [uncertaintyLower, uncertaintyUpper, center, radius]);

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="drop-shadow-[0_0_30px_rgba(0,0,0,0.3)]"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="40%" stopColor="#eab308" />
            <stop offset="70%" stopColor="#84cc16" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <path
          d={describeArc(center, center, radius, startAngle, endAngle)}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Uncertainty band */}
        {uncertaintyArc && (
          <path
            d={uncertaintyArc}
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={strokeWidth + 8}
            strokeLinecap="round"
          />
        )}

        {/* Filled arc */}
        {score > 0 && (
          <path
            d={describeArc(center, center, radius, startAngle, filledAngle)}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            filter="url(#glow)"
          />
        )}

        {/* Tick marks */}
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const tickAngle = startAngle + totalAngle * tick;
          const inner = polarToCartesian(center, center, radius - strokeWidth / 2 - 4, tickAngle);
          const outer = polarToCartesian(center, center, radius - strokeWidth / 2 - 10, tickAngle);
          return (
            <line
              key={tick}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          );
        })}

        {/* Center text */}
        <text
          x={center}
          y={center - 8}
          textAnchor="middle"
          dominantBaseline="central"
          className="font-bold"
          fill={primaryColor}
          fontSize={48}
        >
          {percent}
        </text>
        <text
          x={center}
          y={center + 28}
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgba(255, 255, 255, 0.5)"
          fontSize={14}
        >
          percent
        </text>

        {/* Min/Max labels */}
        <text
          x={polarToCartesian(center, center, radius + 16, startAngle).x}
          y={polarToCartesian(center, center, radius + 16, startAngle).y}
          textAnchor="middle"
          fill="rgba(255, 255, 255, 0.3)"
          fontSize={11}
        >
          0
        </text>
        <text
          x={polarToCartesian(center, center, radius + 16, endAngle).x}
          y={polarToCartesian(center, center, radius + 16, endAngle).y}
          textAnchor="middle"
          fill="rgba(255, 255, 255, 0.3)"
          fontSize={11}
        >
          100
        </text>
      </svg>

      {uncertaintyLower !== undefined && uncertaintyUpper !== undefined && (
        <p className="text-xs text-neutral-500">
          Uncertainty range:{" "}
          <span className="text-neutral-400">
            {Math.round(uncertaintyLower * 100)}% &ndash;{" "}
            {Math.round(uncertaintyUpper * 100)}%
          </span>
        </p>
      )}
    </div>
  );
}
