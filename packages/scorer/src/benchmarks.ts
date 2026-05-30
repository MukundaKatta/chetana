/**
 * Capability benchmark composites and correlation (issues #600, #601).
 *
 * - MIQ-style composite over capability benchmarks (GPQA Diamond, ARC-AGI-2,
 *   HLE, GAIA, ...), normalized and weighted.
 * - Capability-vs-consciousness correlation across audited models.
 */

export interface BenchmarkScore {
  benchmark: string;
  score: number; // raw, on each benchmark's own scale
  /** Max possible on this benchmark's scale (for normalization); default 1. */
  max?: number;
}

function round(n: number, d = 4): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

/**
 * Machine Intelligence Quotient composite (#600): normalize each benchmark to
 * [0,1] then take a (optionally weighted) average, scaled to a 0-100 index.
 */
export function computeMIQ(
  benchmarks: BenchmarkScore[],
  weights: Record<string, number> = {}
): number {
  if (benchmarks.length === 0) return 0;
  let weightedSum = 0;
  let weightTotal = 0;
  for (const b of benchmarks) {
    const max = b.max ?? 1;
    const normalized = max === 0 ? 0 : Math.max(0, Math.min(1, b.score / max));
    const w = weights[b.benchmark] ?? 1;
    weightedSum += normalized * w;
    weightTotal += w;
  }
  return round((weightTotal === 0 ? 0 : weightedSum / weightTotal) * 100);
}

export interface ModelPoint {
  capability: number; // e.g. MIQ or a single benchmark
  consciousness: number; // overall consciousness probability
}

export interface CorrelationResult {
  pearson: number;
  spearman: number;
  n: number;
  /** Slope and intercept of the OLS regression consciousness ~ capability. */
  regression: { slope: number; intercept: number };
}

function pearson(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - mx) * (y[i] - my);
    dx += (x[i] - mx) ** 2;
    dy += (y[i] - my) ** 2;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}

function rank(values: number[]): number[] {
  const indexed = values.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);
  const ranks = new Array(values.length).fill(0);
  for (let i = 0; i < indexed.length; ) {
    let j = i;
    while (j < indexed.length - 1 && indexed[j + 1].v === indexed[i].v) j++;
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[indexed[k].i] = avgRank;
    i = j + 1;
  }
  return ranks;
}

/** Capability-vs-consciousness correlation analysis (#601). */
export function capabilityConsciousnessCorrelation(points: ModelPoint[]): CorrelationResult {
  const n = points.length;
  const cap = points.map((p) => p.capability);
  const con = points.map((p) => p.consciousness);

  const pr = pearson(cap, con);
  const sr = pearson(rank(cap), rank(con));

  // OLS regression consciousness ~ capability.
  let slope = 0;
  let intercept = 0;
  if (n >= 2) {
    const mx = cap.reduce((a, b) => a + b, 0) / n;
    const my = con.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (cap[i] - mx) * (con[i] - my);
      den += (cap[i] - mx) ** 2;
    }
    slope = den === 0 ? 0 : num / den;
    intercept = my - slope * mx;
  }

  return {
    pearson: round(pr),
    spearman: round(sr),
    n,
    regression: { slope: round(slope), intercept: round(intercept) },
  };
}
