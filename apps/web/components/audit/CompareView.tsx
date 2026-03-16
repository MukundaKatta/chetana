"use client";

import { cn, formatScore, getScoreColor } from "@/lib/utils";
import { TheoryRadar } from "./TheoryRadar";

interface AuditSummary {
  modelName: string;
  scores: Record<string, number>;
}

interface CompareViewProps {
  leftAudit: AuditSummary;
  rightAudit: AuditSummary;
}

const THEORY_LABELS: Record<string, string> = {
  gwt: "Global Workspace Theory",
  iit: "Integrated Information Theory",
  hot: "Higher-Order Theories",
  rpt: "Recurrent Processing Theory",
  pp: "Predictive Processing",
  ast: "Attention Schema Theory",
};

export function CompareView({ leftAudit, rightAudit }: CompareViewProps) {
  const allKeys = Array.from(
    new Set([
      ...Object.keys(leftAudit.scores),
      ...Object.keys(rightAudit.scores),
    ])
  );

  const theories = Object.keys(THEORY_LABELS);
  const indicators = allKeys.filter((k) => !theories.includes(k));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-center">
          <h3 className="text-lg font-bold text-neutral-100">
            {leftAudit.modelName}
          </h3>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-center">
          <h3 className="text-lg font-bold text-neutral-100">
            {rightAudit.modelName}
          </h3>
        </div>
      </div>

      {/* Radar Charts */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <TheoryRadar scores={leftAudit.scores} />
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <TheoryRadar scores={rightAudit.scores} />
        </div>
      </div>

      {/* Theory Comparison Table */}
      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.04]">
              <th className="px-4 py-3 text-left font-semibold text-neutral-400">
                Theory
              </th>
              <th className="px-4 py-3 text-right font-semibold text-neutral-400">
                {leftAudit.modelName}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-neutral-500">
                Diff
              </th>
              <th className="px-4 py-3 text-right font-semibold text-neutral-400">
                {rightAudit.modelName}
              </th>
            </tr>
          </thead>
          <tbody>
            {theories.map((key) => {
              const leftScore = leftAudit.scores[key] ?? 0;
              const rightScore = rightAudit.scores[key] ?? 0;
              const diff = rightScore - leftScore;
              return (
                <tr
                  key={key}
                  className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-2.5 font-medium text-neutral-200">
                    {THEORY_LABELS[key] ?? key.toUpperCase()}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2.5 text-right tabular-nums font-semibold",
                      getScoreColor(leftScore)
                    )}
                  >
                    {formatScore(leftScore)}
                  </td>
                  <td className="px-4 py-2.5 text-center tabular-nums">
                    <span
                      className={cn(
                        "text-xs font-medium",
                        diff > 0
                          ? "text-green-400"
                          : diff < 0
                            ? "text-red-400"
                            : "text-neutral-600"
                      )}
                    >
                      {diff > 0 ? "+" : ""}
                      {(diff * 100).toFixed(1)}
                    </span>
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2.5 text-right tabular-nums font-semibold",
                      getScoreColor(rightScore)
                    )}
                  >
                    {formatScore(rightScore)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Indicator Comparison Table */}
      {indicators.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="border-b border-white/10 bg-white/[0.04] px-4 py-3">
            <h4 className="text-sm font-semibold text-neutral-300">
              Indicator Comparison
            </h4>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/[0.02]">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-500">
                  Indicator
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-neutral-500">
                  {leftAudit.modelName}
                </th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-neutral-600">
                  Diff
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-neutral-500">
                  {rightAudit.modelName}
                </th>
              </tr>
            </thead>
            <tbody>
              {indicators.map((key) => {
                const leftScore = leftAudit.scores[key] ?? 0;
                const rightScore = rightAudit.scores[key] ?? 0;
                const diff = rightScore - leftScore;
                return (
                  <tr
                    key={key}
                    className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-2 font-mono text-xs text-neutral-300">
                      {key}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2 text-right tabular-nums",
                        getScoreColor(leftScore)
                      )}
                    >
                      {formatScore(leftScore)}
                    </td>
                    <td className="px-4 py-2 text-center tabular-nums">
                      <span
                        className={cn(
                          "text-xs",
                          diff > 0
                            ? "text-green-400"
                            : diff < 0
                              ? "text-red-400"
                              : "text-neutral-600"
                        )}
                      >
                        {diff > 0 ? "+" : ""}
                        {(diff * 100).toFixed(1)}
                      </span>
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2 text-right tabular-nums",
                        getScoreColor(rightScore)
                      )}
                    >
                      {formatScore(rightScore)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
