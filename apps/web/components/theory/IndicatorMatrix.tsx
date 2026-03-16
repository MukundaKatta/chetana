"use client";

import { cn, formatScore, getScoreColor } from "@/lib/utils";
import { INDICATORS } from "@chetana/shared";

interface IndicatorMatrixProps {
  scores: Record<string, number>;
}

function intensityBg(score: number): string {
  if (score < 0.15) return "bg-red-500/20";
  if (score < 0.3) return "bg-red-500/35";
  if (score < 0.45) return "bg-orange-500/30";
  if (score < 0.6) return "bg-yellow-500/25";
  if (score < 0.75) return "bg-lime-500/25";
  if (score < 0.85) return "bg-green-500/30";
  return "bg-green-500/45";
}

export function IndicatorMatrix({ scores }: IndicatorMatrixProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-300">
        Indicator Heatmap
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
        {INDICATORS.map((indicator) => {
          const score = scores[indicator.id] ?? 0;
          return (
            <div
              key={indicator.id}
              className={cn(
                "group relative flex flex-col items-center justify-center rounded-lg border border-white/8 px-2 py-3 transition-all hover:border-white/20 hover:scale-105",
                intensityBg(score)
              )}
              title={`${indicator.name}: ${formatScore(score)}`}
            >
              <span className="mb-1 font-mono text-[10px] text-neutral-500">
                {indicator.id}
              </span>
              <span
                className={cn(
                  "text-lg font-bold tabular-nums",
                  getScoreColor(score)
                )}
              >
                {Math.round(score * 100)}
              </span>
              <span className="mt-0.5 text-center text-[10px] leading-tight text-neutral-500 line-clamp-2">
                {indicator.name}
              </span>

              {/* Tooltip on hover */}
              <div className="pointer-events-none absolute -top-2 left-1/2 z-10 w-48 -translate-x-1/2 -translate-y-full rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                <p className="text-xs font-semibold text-neutral-200">
                  {indicator.name}
                </p>
                <p className="mt-0.5 text-[11px] text-neutral-400">
                  {indicator.description}
                </p>
                <p className={cn("mt-1 text-xs font-bold", getScoreColor(score))}>
                  {formatScore(score)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-[10px] text-neutral-500">Low</span>
        <div className="flex h-2 flex-1 overflow-hidden rounded-full">
          <div className="flex-1 bg-red-500/40" />
          <div className="flex-1 bg-orange-500/40" />
          <div className="flex-1 bg-yellow-500/40" />
          <div className="flex-1 bg-lime-500/40" />
          <div className="flex-1 bg-green-500/40" />
        </div>
        <span className="text-[10px] text-neutral-500">High</span>
      </div>
    </div>
  );
}
