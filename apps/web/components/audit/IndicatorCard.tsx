"use client";

import { cn } from "@/lib/utils";
import { formatScore, getScoreColor, getScoreBgColor, getTheoryColor } from "@/lib/utils";

interface IndicatorCardProps {
  indicatorId: string;
  name: string;
  theory: string;
  score: number;
  description: string;
}

export function IndicatorCard({
  indicatorId,
  name,
  theory,
  score,
  description,
}: IndicatorCardProps) {
  const theoryColor = getTheoryColor(theory);
  const scorePercent = Math.round(score * 100);

  return (
    <div className="group rounded-xl border border-white/10 bg-white/5 p-5 transition-all hover:border-white/20 hover:bg-white/[0.07]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-mono text-neutral-500">
              {indicatorId}
            </span>
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{
                backgroundColor: `color-mix(in srgb, ${theoryColor} 15%, transparent)`,
                color: theoryColor,
                border: `1px solid color-mix(in srgb, ${theoryColor} 30%, transparent)`,
              }}
            >
              {theory.toUpperCase()}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-neutral-100">{name}</h3>
        </div>
        <div className="flex-shrink-0 text-right">
          <span
            className={cn(
              "text-xl font-bold tabular-nums",
              getScoreColor(score)
            )}
          >
            {formatScore(score)}
          </span>
        </div>
      </div>

      <p className="mb-4 text-xs leading-relaxed text-neutral-400">
        {description}
      </p>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            getScoreBgColor(score)
          )}
          style={{ width: `${scorePercent}%` }}
        />
      </div>
    </div>
  );
}
