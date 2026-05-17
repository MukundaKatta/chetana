"use client";

import { useMemo } from "react";
import { cn, formatScore, getScoreColor } from "@/lib/utils";

interface AuditSnapshot {
  model: string;
  scores: Record<string, number>;
}

interface AuditDiffProps {
  auditA: AuditSnapshot;
  auditB: AuditSnapshot;
}

interface DiffEntry {
  indicator: string;
  scoreA: number;
  scoreB: number;
  delta: number;
}

export function AuditDiff({ auditA, auditB }: AuditDiffProps) {
  const allIndicators = useMemo(
    () =>
      Array.from(
        new Set([...Object.keys(auditA.scores), ...Object.keys(auditB.scores)])
      ).sort(),
    [auditA.scores, auditB.scores]
  );

  const diffs: DiffEntry[] = useMemo(
    () =>
      allIndicators.map((indicator) => {
        const scoreA = auditA.scores[indicator] ?? 0;
        const scoreB = auditB.scores[indicator] ?? 0;
        return { indicator, scoreA, scoreB, delta: scoreB - scoreA };
      }),
    [allIndicators, auditA.scores, auditB.scores]
  );

  const improved = diffs.filter((d) => d.delta > 0.005);
  const regressed = diffs.filter((d) => d.delta < -0.005);
  const unchanged = diffs.filter(
    (d) => d.delta >= -0.005 && d.delta <= 0.005
  );

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center">
          <div className="text-2xl font-bold text-green-400">
            {improved.length}
          </div>
          <div className="mt-1 text-xs font-medium text-green-400/70">
            Improved
          </div>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
          <div className="text-2xl font-bold text-red-400">
            {regressed.length}
          </div>
          <div className="mt-1 text-xs font-medium text-red-400/70">
            Regressed
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
          <div className="text-2xl font-bold text-neutral-400">
            {unchanged.length}
          </div>
          <div className="mt-1 text-xs font-medium text-neutral-500">
            Unchanged
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-4 text-xs font-semibold text-neutral-500">
        <span>Indicator</span>
        <span className="w-20 text-right">{auditA.model}</span>
        <span className="w-12 text-center">Delta</span>
        <span className="w-20 text-right">{auditB.model}</span>
        <span className="w-8" />
      </div>

      {/* Diff rows */}
      <div className="overflow-hidden rounded-xl border border-white/10">
        {diffs.map((entry, idx) => (
          <div
            key={entry.indicator}
            className={cn(
              "grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.02]",
              idx < diffs.length - 1 && "border-b border-white/5"
            )}
          >
            <span className="truncate text-sm font-medium text-neutral-200">
              {entry.indicator}
            </span>

            <span
              className={cn(
                "w-20 text-right text-sm tabular-nums font-semibold",
                getScoreColor(entry.scoreA)
              )}
            >
              {formatScore(entry.scoreA)}
            </span>

            <span className="flex w-12 items-center justify-center">
              {entry.delta > 0.005 ? (
                <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-green-400">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                  +{(entry.delta * 100).toFixed(1)}
                </span>
              ) : entry.delta < -0.005 ? (
                <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-red-400">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                  {(entry.delta * 100).toFixed(1)}
                </span>
              ) : (
                <span className="text-xs text-neutral-600">--</span>
              )}
            </span>

            <span
              className={cn(
                "w-20 text-right text-sm tabular-nums font-semibold",
                getScoreColor(entry.scoreB)
              )}
            >
              {formatScore(entry.scoreB)}
            </span>

            {/* Visual bar for delta magnitude */}
            <span className="relative h-2 w-8 overflow-hidden rounded-full bg-white/10">
              {entry.delta > 0.005 && (
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-green-500"
                  style={{
                    width: `${Math.min(Math.abs(entry.delta) * 100 * 2, 100)}%`,
                  }}
                />
              )}
              {entry.delta < -0.005 && (
                <span
                  className="absolute inset-y-0 right-0 rounded-full bg-red-500"
                  style={{
                    width: `${Math.min(Math.abs(entry.delta) * 100 * 2, 100)}%`,
                  }}
                />
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
