"use client";

import { useMemo, useState } from "react";
import { computeMIQ } from "@chetana/scorer";

/**
 * MIQ composite calculator (issue #600). Normalizes capability benchmark scores
 * and combines them into a 0-100 Machine Intelligence Quotient using the pure
 * `computeMIQ` helper from @chetana/scorer. Mirrors POST /api/benchmarks/miq.
 */
const DEFAULT_BENCHMARKS = [
  { benchmark: "GPQA Diamond", score: 0.9 },
  { benchmark: "ARC-AGI-2", score: 0.6 },
  { benchmark: "HLE", score: 0.35 },
  { benchmark: "GAIA", score: 0.72 },
];

export function MIQCalculator() {
  const [scores, setScores] = useState<number[]>(DEFAULT_BENCHMARKS.map((b) => b.score));

  const benchmarks = useMemo(
    () => DEFAULT_BENCHMARKS.map((b, i) => ({ benchmark: b.benchmark, score: scores[i] })),
    [scores]
  );

  const miq = useMemo(() => computeMIQ(benchmarks), [benchmarks]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4 rounded-xl border border-white/8 bg-white/[0.02] p-5">
        <h3 className="text-sm font-medium text-gray-200">Benchmark scores (0–1)</h3>
        {DEFAULT_BENCHMARKS.map((b, i) => (
          <label key={b.benchmark} className="block">
            <div className="mb-1 flex justify-between text-xs text-gray-400">
              <span>{b.benchmark}</span>
              <span className="tabular-nums text-gray-300">{scores[i].toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={scores[i]}
              onChange={(e) => {
                const next = [...scores];
                next[i] = Number(e.target.value);
                setScores(next);
              }}
              className="w-full accent-chetana-500"
            />
          </label>
        ))}
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-white/8 bg-white/[0.02] p-5">
        <span className="text-xs uppercase tracking-wide text-gray-500">Composite MIQ</span>
        <span className="mt-2 text-5xl font-semibold tabular-nums text-chetana-300">{miq.toFixed(0)}</span>
        <span className="mt-1 text-xs text-gray-500">/ 100</span>
      </div>
    </div>
  );
}
