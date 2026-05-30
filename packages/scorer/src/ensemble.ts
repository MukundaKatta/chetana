/**
 * Judge-model ensemble scoring with inter-judge agreement (issue #602).
 *
 * Single-judge scoring is criticized in 2026 eval literature for judge bias.
 * This module aggregates per-judge scores for each probe and reports agreement,
 * flagging high-disagreement items for human review.
 */

export interface JudgeScore {
  judgeId: string;
  score: number; // 0-1
}

export interface EnsembleItem {
  probeId: string;
  judgeScores: JudgeScore[];
}

export interface EnsembleResult {
  probeId: string;
  aggregate: number;
  spread: number; // max - min across judges
  stdDev: number;
  judgeCount: number;
  flagged: boolean; // disagreement exceeds threshold
}

export type AggregationMethod = "mean" | "median" | "trimmed";

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 === 0 ? (s[n / 2 - 1] + s[n / 2]) / 2 : s[Math.floor(n / 2)];
}

/** Trimmed mean dropping the single highest and lowest judge when n >= 4. */
function trimmedMean(xs: number[]): number {
  if (xs.length < 4) return mean(xs);
  const s = [...xs].sort((a, b) => a - b);
  return mean(s.slice(1, -1));
}

function aggregate(xs: number[], method: AggregationMethod): number {
  switch (method) {
    case "median":
      return median(xs);
    case "trimmed":
      return trimmedMean(xs);
    default:
      return mean(xs);
  }
}

function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

function round(n: number, d = 4): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export interface EnsembleOptions {
  method?: AggregationMethod;
  /** Flag an item when the across-judge spread exceeds this (default 0.4). */
  disagreementThreshold?: number;
}

export function scoreEnsembleItem(
  item: EnsembleItem,
  options: EnsembleOptions = {}
): EnsembleResult {
  const method = options.method ?? "mean";
  const threshold = options.disagreementThreshold ?? 0.4;
  const scores = item.judgeScores.map((j) => j.score);

  if (scores.length === 0) {
    return { probeId: item.probeId, aggregate: 0, spread: 0, stdDev: 0, judgeCount: 0, flagged: false };
  }

  const spread = Math.max(...scores) - Math.min(...scores);
  return {
    probeId: item.probeId,
    aggregate: round(aggregate(scores, method)),
    spread: round(spread),
    stdDev: round(stdDev(scores)),
    judgeCount: scores.length,
    flagged: spread > threshold,
  };
}

export interface EnsembleSummary {
  items: EnsembleResult[];
  flaggedItems: string[];
  /** Mean pairwise agreement across all items in [0,1]; 1 = perfect agreement. */
  meanAgreement: number;
}

export function scoreEnsemble(
  items: EnsembleItem[],
  options: EnsembleOptions = {}
): EnsembleSummary {
  const results = items.map((i) => scoreEnsembleItem(i, options));
  // Agreement per item = 1 - normalized spread (max spread on [0,1] scale is 1).
  const agreements = results
    .filter((r) => r.judgeCount > 1)
    .map((r) => 1 - r.spread);
  return {
    items: results,
    flaggedItems: results.filter((r) => r.flagged).map((r) => r.probeId),
    meanAgreement: agreements.length ? round(mean(agreements)) : 1,
  };
}
