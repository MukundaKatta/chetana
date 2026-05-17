"use client";

import { useMemo, useState, useRef } from "react";
import * as d3 from "d3";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface CorrelationMatrixProps {
  /** NxN correlation matrix (-1 to 1). Row-major. */
  matrix: number[][];
  /** Labels for each row/column. */
  labels: string[];
  /** Cell size in px (default 48). */
  cellSize?: number;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function CorrelationMatrix({
  matrix,
  labels,
  cellSize = 48,
  className,
}: CorrelationMatrixProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<{ row: number; col: number } | null>(null);

  const n = labels.length;
  const labelPad = 80;
  const totalSize = labelPad + n * cellSize;

  const colorScale = useMemo(
    () =>
      d3
        .scaleLinear<string>()
        .domain([-1, 0, 1])
        .range(["#3b82f6", "#171717", "#ef4444"])
        .clamp(true),
    [],
  );

  return (
    <div ref={containerRef} className={cn("relative w-full overflow-x-auto", className)}>
      <svg
        width={totalSize}
        height={totalSize}
        viewBox={`0 0 ${totalSize} ${totalSize}`}
        className="rounded-xl border border-white/8 bg-white/[0.02]"
      >
        {/* Column labels (top) */}
        {labels.map((label, i) => (
          <text
            key={`col-${i}`}
            x={labelPad + i * cellSize + cellSize / 2}
            y={labelPad - 8}
            fill={
              hovered && hovered.col === i
                ? "rgba(255,255,255,0.9)"
                : "rgba(255,255,255,0.45)"
            }
            fontSize={10}
            fontWeight={500}
            textAnchor="end"
            transform={`rotate(-45, ${labelPad + i * cellSize + cellSize / 2}, ${labelPad - 8})`}
            className="transition-colors"
          >
            {label}
          </text>
        ))}

        {/* Row labels (left) */}
        {labels.map((label, i) => (
          <text
            key={`row-${i}`}
            x={labelPad - 8}
            y={labelPad + i * cellSize + cellSize / 2}
            fill={
              hovered && hovered.row === i
                ? "rgba(255,255,255,0.9)"
                : "rgba(255,255,255,0.45)"
            }
            fontSize={10}
            fontWeight={500}
            textAnchor="end"
            dominantBaseline="central"
            className="transition-colors"
          >
            {label}
          </text>
        ))}

        {/* Cells */}
        {matrix.map((row, ri) =>
          row.map((value, ci) => {
            const x = labelPad + ci * cellSize;
            const y = labelPad + ri * cellSize;
            const isHovered = hovered?.row === ri && hovered?.col === ci;

            return (
              <g
                key={`${ri}-${ci}`}
                onMouseEnter={() => setHovered({ row: ri, col: ci })}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer"
              >
                <rect
                  x={x + 1}
                  y={y + 1}
                  width={cellSize - 2}
                  height={cellSize - 2}
                  rx={4}
                  fill={colorScale(value)}
                  fillOpacity={Math.abs(value) * 0.85 + 0.15}
                  stroke={isHovered ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.04)"}
                  strokeWidth={isHovered ? 2 : 1}
                  className="transition-all duration-100"
                />
                {/* Value text inside cell */}
                <text
                  x={x + cellSize / 2}
                  y={y + cellSize / 2}
                  fill={
                    Math.abs(value) > 0.5
                      ? "rgba(255,255,255,0.9)"
                      : "rgba(255,255,255,0.4)"
                  }
                  fontSize={10}
                  fontWeight={600}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="pointer-events-none"
                >
                  {value.toFixed(2)}
                </text>
              </g>
            );
          }),
        )}
      </svg>

      {/* Hover detail tooltip */}
      {hovered && (
        <div
          className="pointer-events-none absolute z-20 rounded-lg border border-white/15 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-200 shadow-xl"
          style={{
            left: labelPad + hovered.col * cellSize + cellSize / 2,
            top: labelPad + hovered.row * cellSize - 8,
            transform: "translate(-50%, -100%)",
          }}
        >
          <span className="text-neutral-400">{labels[hovered.row]}</span>
          {" / "}
          <span className="text-neutral-400">{labels[hovered.col]}</span>
          {": "}
          <span className="font-bold tabular-nums">
            {matrix[hovered.row][hovered.col].toFixed(3)}
          </span>
        </div>
      )}

      {/* Color legend */}
      <div className="mt-3 flex items-center justify-center gap-2">
        <span className="text-[10px] font-medium text-blue-400">-1</span>
        <div className="flex h-3 w-40 overflow-hidden rounded">
          {Array.from({ length: 40 }, (_, i) => {
            const v = -1 + (i / 39) * 2;
            return (
              <div
                key={i}
                className="h-full flex-1"
                style={{ backgroundColor: colorScale(v) }}
              />
            );
          })}
        </div>
        <span className="text-[10px] font-medium text-red-400">+1</span>
      </div>
    </div>
  );
}
