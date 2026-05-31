"use client";

import { useMemo, useState } from "react";
import { scoreEnsemble, krippendorffAlpha, interpretAlpha } from "@chetana/scorer";
import { cn } from "@/lib/utils";

/**
 * Interactive judge-reliability panel (issues #602, #606).
 *
 * Lets you edit three judges' scores across three probes and shows the
 * ensemble aggregate + disagreement flagging (scoreEnsemble) and the
 * inter-rater reliability (Krippendorff's alpha). Pure @chetana/scorer functions.
 */
const PROBES = ["probe.a", "probe.b", "probe.c"];
const JUDGES = ["judge-1", "judge-2", "judge-3"];

export function ReliabilityPanel() {
  const [grid, setGrid] = useState<number[][]>([
    [0.8, 0.75, 0.82],
    [0.4, 0.6, 0.35],
    [0.5, 0.55, 0.52],
  ]);

  const ensemble = useMemo(
    () =>
      scoreEnsemble(
        PROBES.map((probeId, i) => ({
          probeId,
          judgeScores: JUDGES.map((judgeId, j) => ({ judgeId, score: grid[i][j] })),
        }))
      ),
    [grid]
  );

  const reliability = useMemo(() => {
    const r = krippendorffAlpha(grid);
    return { ...r, interpretation: interpretAlpha(r.alpha) };
  }, [grid]);

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-xl border border-white/8">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] text-gray-400">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Probe</th>
              {JUDGES.map((j) => (
                <th key={j} className="px-3 py-2 font-medium">{j}</th>
              ))}
              <th className="px-3 py-2 font-medium">Aggregate</th>
            </tr>
          </thead>
          <tbody>
            {PROBES.map((p, i) => (
              <tr key={p} className="border-t border-white/5">
                <td className="px-3 py-2 font-mono text-xs text-gray-400">{p}</td>
                {JUDGES.map((_, j) => (
                  <td key={j} className="px-3 py-2 text-center">
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      value={grid[i][j]}
                      onChange={(e) => {
                        const next = grid.map((row) => [...row]);
                        next[i][j] = Math.max(0, Math.min(1, Number(e.target.value)));
                        setGrid(next);
                      }}
                      className="w-16 rounded border border-white/10 bg-white/5 px-2 py-1 text-center text-xs tabular-nums text-gray-200"
                    />
                  </td>
                ))}
                <td className="px-3 py-2 text-center tabular-nums text-gray-300">
                  {ensemble.items[i]?.aggregate.toFixed(2)}
                  {ensemble.items[i]?.flagged && (
                    <span className="ml-1 text-[10px] font-medium text-amber-400">⚠</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
          <span className="text-xs uppercase tracking-wide text-gray-500">Mean judge agreement</span>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-chetana-300">
            {(ensemble.meanAgreement * 100).toFixed(0)}%
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {ensemble.flaggedItems.length} probe(s) flagged for disagreement
          </p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
          <span className="text-xs uppercase tracking-wide text-gray-500">Krippendorff&apos;s α</span>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-chetana-300">
            {reliability.alpha.toFixed(3)}
          </p>
          <p className={cn("mt-1 text-xs", reliability.interpretation === "reliable" ? "text-emerald-400" : reliability.interpretation === "tentative" ? "text-amber-400" : "text-red-400")}>
            {reliability.interpretation}
          </p>
        </div>
      </div>
    </div>
  );
}
