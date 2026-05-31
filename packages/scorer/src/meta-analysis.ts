/**
 * Meta-analysis across audits (issue #735).
 *
 * Random-effects (DerSimonian-Laird) pooling of repeated audit estimates with
 * a heterogeneity statistic (I-squared), for stable cross-audit estimates.
 */

export interface AuditEstimate {
  /** Point estimate (e.g., overall consciousness probability) in [0,1]. */
  estimate: number;
  /** Standard error of the estimate. */
  standardError: number;
}

export interface MetaAnalysisResult {
  pooledEstimate: number;
  pooledStandardError: number;
  ci95: { lower: number; upper: number };
  /** Between-study heterogeneity in [0,1]; higher = more heterogeneous. */
  iSquared: number;
  k: number;
}

function round(n: number, d = 4): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export function metaAnalyze(estimates: AuditEstimate[]): MetaAnalysisResult {
  const k = estimates.length;
  if (k === 0) {
    return { pooledEstimate: 0, pooledStandardError: 0, ci95: { lower: 0, upper: 0 }, iSquared: 0, k: 0 };
  }

  // Fixed-effect weights = 1 / variance.
  const weights = estimates.map((e) => 1 / Math.max(1e-9, e.standardError ** 2));
  const wSum = weights.reduce((a, b) => a + b, 0);
  const fixedMean = estimates.reduce((s, e, i) => s + weights[i] * e.estimate, 0) / wSum;

  // Cochran's Q and tau^2 (DerSimonian-Laird).
  const Q = estimates.reduce((s, e, i) => s + weights[i] * (e.estimate - fixedMean) ** 2, 0);
  const df = k - 1;
  const C = wSum - weights.reduce((a, b) => a + b * b, 0) / wSum;
  const tau2 = C > 0 ? Math.max(0, (Q - df) / C) : 0;

  // Random-effects weights.
  const reWeights = estimates.map((e) => 1 / (e.standardError ** 2 + tau2));
  const reSum = reWeights.reduce((a, b) => a + b, 0);
  const pooled = estimates.reduce((s, e, i) => s + reWeights[i] * e.estimate, 0) / reSum;
  const pooledSE = Math.sqrt(1 / reSum);

  const iSquared = Q > df && Q > 0 ? Math.max(0, (Q - df) / Q) : 0;

  return {
    pooledEstimate: round(pooled),
    pooledStandardError: round(pooledSE),
    ci95: { lower: round(Math.max(0, pooled - 1.96 * pooledSE)), upper: round(Math.min(1, pooled + 1.96 * pooledSE)) },
    iSquared: round(iSquared),
    k,
  };
}
