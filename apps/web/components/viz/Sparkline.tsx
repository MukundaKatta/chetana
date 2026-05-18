"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export interface SparklineProps {
  /** Data points to render. At least two values recommended. */
  data: number[];
  /** Width of the SVG in px (default 50). */
  width?: number;
  /** Height of the SVG in px (default 20). */
  height?: number;
  /** Stroke width (default 1.5). */
  strokeWidth?: number;
  /** Override color. When omitted the color is derived from trend direction. */
  color?: string;
  /** Color used when data trends upward (default emerald-400). */
  upColor?: string;
  /** Color used when data trends downward (default red-400). */
  downColor?: string;
  /** Color used when data is flat (default neutral-400). */
  flatColor?: string;
  /** Extra classes on the wrapper. */
  className?: string;
}

export function Sparkline({
  data,
  width = 50,
  height = 20,
  strokeWidth = 1.5,
  color,
  upColor = "#34d399",
  downColor = "#f87171",
  flatColor = "#a3a3a3",
  className,
}: SparklineProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const { path, trendColor, points } = useMemo(() => {
    if (data.length === 0) {
      return { path: "", trendColor: flatColor, points: [] as { x: number; y: number; value: number }[] };
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const padY = 2;
    const usableH = height - padY * 2;

    const pts = data.map((v, i) => ({
      x: data.length === 1 ? width / 2 : (i / (data.length - 1)) * width,
      y: padY + usableH - ((v - min) / range) * usableH,
      value: v,
    }));

    const d = pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(" ");

    const first = data[0];
    const last = data[data.length - 1];
    let tc = flatColor;
    if (last > first) tc = upColor;
    else if (last < first) tc = downColor;

    return { path: d, trendColor: color ?? tc, points: pts };
  }, [data, width, height, color, upColor, downColor, flatColor]);

  if (data.length === 0) return null;

  return (
    <span
      className={cn("relative inline-block", className)}
      onMouseLeave={() => setHovered(null)}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        <path
          d={path}
          fill="none"
          stroke={trendColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Invisible wider hit targets for hover */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="transparent"
            onMouseEnter={() => setHovered(i)}
          />
        ))}
        {/* Visible dot on hover */}
        {hovered !== null && points[hovered] && (
          <circle
            cx={points[hovered].x}
            cy={points[hovered].y}
            r={2.5}
            fill={trendColor}
          />
        )}
      </svg>

      {/* Tooltip */}
      {hovered !== null && points[hovered] && (
        <span
          className="pointer-events-none absolute z-30 rounded border border-white/15 bg-neutral-900 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-neutral-200 shadow-lg"
          style={{
            left: points[hovered].x,
            top: -4,
            transform: "translate(-50%, -100%)",
          }}
        >
          {points[hovered].value.toFixed(2)}
        </span>
      )}
    </span>
  );
}
