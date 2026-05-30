/**
 * Drift detection for judge-model scoring over time (issue #609).
 *
 * Providers update models silently, shifting scores and breaking longitudinal
 * comparability. This re-scores a fixed anchor set periodically and flags
 * statistically meaningful drift.
 */

export interface AnchorScores {
  timestamp: string;
  scores: number[]; // anchor-set scores at this checkpoint
}

export interface DriftResult {
  baselineMean: number;
  currentMean: number;
  delta: number;
  /** Standardized drift (delta / pooled SE); |z| > zThreshold flags drift. */
  z: number;
  drifted: boolean;
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function variance(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
}

function round(n: number, d = 4): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export function detectDrift(
  baseline: AnchorScores,
  current: AnchorScores,
  zThreshold = 2.0
): DriftResult {
  const bMean = mean(baseline.scores);
  const cMean = mean(current.scores);
  const delta = cMean - bMean;

  const nB = baseline.scores.length;
  const nC = current.scores.length;
  const se = Math.sqrt(
    (nB > 1 ? variance(baseline.scores) / nB : 0) +
      (nC > 1 ? variance(current.scores) / nC : 0)
  );
  const z = se === 0 ? (delta === 0 ? 0 : Infinity) : delta / se;

  return {
    baselineMean: round(bMean),
    currentMean: round(cMean),
    delta: round(delta),
    z: Number.isFinite(z) ? round(z) : z,
    drifted: Math.abs(z) > zThreshold,
  };
}

/** Scan a time-ordered series of anchor checkpoints against the first as baseline. */
export function scanDriftSeries(
  series: AnchorScores[],
  zThreshold = 2.0
): { timestamp: string; result: DriftResult }[] {
  if (series.length < 2) return [];
  const baseline = series[0];
  return series.slice(1).map((c) => ({
    timestamp: c.timestamp,
    result: detectDrift(baseline, c, zThreshold),
  }));
}
