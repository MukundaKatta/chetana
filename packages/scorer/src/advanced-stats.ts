/**
 * Advanced statistics (issues #1011-#1017). Pure, dependency-free methods:
 * Bayesian model averaging, conformal prediction, jackknife, permutation tests,
 * multiple-comparison correction, propensity-score matching, and
 * regression-discontinuity estimation.
 */

function round(n: number, d = 4): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

// --- Bayesian model averaging (#1011) --------------------------------------

export interface ModelEvidence {
  /** Theory/model label. */
  label: string;
  /** Point estimate from this model. */
  estimate: number;
  /** Log marginal likelihood (evidence) for this model. */
  logEvidence: number;
}

export interface BmaResult {
  averaged: number;
  weights: Record<string, number>;
}

/** Combine model estimates weighted by posterior model probabilities. */
export function bayesianModelAverage(models: ModelEvidence[]): BmaResult {
  if (models.length === 0) return { averaged: 0, weights: {} };
  // Softmax over logEvidence (numerically stable).
  const maxLog = Math.max(...models.map((m) => m.logEvidence));
  const exps = models.map((m) => Math.exp(m.logEvidence - maxLog));
  const z = exps.reduce((a, b) => a + b, 0);
  const weights: Record<string, number> = {};
  let averaged = 0;
  models.forEach((m, i) => {
    const w = exps[i] / z;
    weights[m.label] = round(w);
    averaged += w * m.estimate;
  });
  return { averaged: round(averaged), weights };
}

// --- Conformal prediction (#1012) ------------------------------------------

export interface ConformalInterval {
  lower: number;
  upper: number;
  level: number;
}

/**
 * Split-conformal interval: from absolute calibration residuals, take the
 * (1-alpha) quantile as the half-width around a point prediction.
 */
export function conformalInterval(
  prediction: number,
  calibrationResiduals: number[],
  level = 0.9
): ConformalInterval {
  const alpha = 1 - level;
  const absResiduals = calibrationResiduals.map((r) => Math.abs(r)).sort((a, b) => a - b);
  const n = absResiduals.length;
  let q: number;
  if (n === 0) {
    q = 0;
  } else {
    // Conformal quantile uses the ceil((n+1)(1-alpha))-th smallest residual.
    const rank = Math.ceil((n + 1) * (1 - alpha));
    q = absResiduals[Math.min(n - 1, Math.max(0, rank - 1))];
  }
  return { lower: round(prediction - q), upper: round(prediction + q), level };
}

// --- Jackknife (#1013) -----------------------------------------------------

export interface JackknifeResult {
  estimate: number;
  bias: number;
  standardError: number;
}

/** Jackknife bias and standard error of a statistic over a sample. */
export function jackknife(data: number[], statistic: (xs: number[]) => number): JackknifeResult {
  const n = data.length;
  if (n < 2) return { estimate: n ? statistic(data) : 0, bias: 0, standardError: 0 };
  const full = statistic(data);
  const looEstimates = data.map((_, i) => statistic(data.filter((__, j) => j !== i)));
  const looMean = mean(looEstimates);
  const bias = (n - 1) * (looMean - full);
  const variance = ((n - 1) / n) * looEstimates.reduce((s, e) => s + (e - looMean) ** 2, 0);
  return { estimate: round(full - bias), bias: round(bias), standardError: round(Math.sqrt(variance)) };
}

// --- Permutation test (#1014) ----------------------------------------------

export interface PermutationResult {
  observedDiff: number;
  pValue: number;
  iterations: number;
}

/** Two-group permutation test of mean difference (seeded for reproducibility). */
export function permutationTest(
  groupA: number[],
  groupB: number[],
  iterations = 2000,
  seed = 42
): PermutationResult {
  const observed = mean(groupA) - mean(groupB);
  const pooled = [...groupA, ...groupB];
  const nA = groupA.length;
  if (nA === 0 || groupB.length === 0) return { observedDiff: round(observed), pValue: 1, iterations: 0 };

  let s = seed >>> 0 || 1;
  const rand = () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  let extreme = 0;
  for (let it = 0; it < iterations; it++) {
    // Fisher-Yates shuffle of a copy.
    const arr = [...pooled];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const diff = mean(arr.slice(0, nA)) - mean(arr.slice(nA));
    if (Math.abs(diff) >= Math.abs(observed)) extreme++;
  }
  return { observedDiff: round(observed), pValue: round((extreme + 1) / (iterations + 1)), iterations };
}

// --- Multiple-comparison correction (#1015) --------------------------------

export interface CorrectedP {
  index: number;
  p: number;
  adjusted: number;
  significant: boolean;
}

export function bonferroni(pValues: number[], alpha = 0.05): CorrectedP[] {
  const m = pValues.length;
  return pValues.map((p, index) => {
    const adjusted = Math.min(1, p * m);
    return { index, p, adjusted: round(adjusted), significant: adjusted <= alpha };
  });
}

/** Benjamini-Hochberg FDR control. */
export function benjaminiHochberg(pValues: number[], alpha = 0.05): CorrectedP[] {
  const m = pValues.length;
  if (m === 0) return [];
  const order = pValues.map((p, index) => ({ p, index })).sort((a, b) => a.p - b.p);
  // Compute adjusted p-values with monotonicity enforcement.
  const adj = new Array(m).fill(0);
  let prev = 1;
  for (let k = m - 1; k >= 0; k--) {
    const val = Math.min(prev, (order[k].p * m) / (k + 1));
    adj[k] = val;
    prev = val;
  }
  return order.map((o, k) => ({
    index: o.index,
    p: o.p,
    adjusted: round(adj[k]),
    significant: adj[k] <= alpha,
  }));
}

// --- Propensity-score matching (#1016) -------------------------------------

export interface Unit {
  id: string;
  treated: boolean;
  propensity: number;
  outcome: number;
}

export interface MatchingResult {
  pairs: { treatedId: string; controlId: string; distance: number }[];
  att: number; // average treatment effect on the treated
}

/** Nearest-neighbor 1:1 matching on propensity (with replacement). */
export function propensityMatch(units: Unit[]): MatchingResult {
  const treated = units.filter((u) => u.treated);
  const controls = units.filter((u) => !u.treated);
  if (treated.length === 0 || controls.length === 0) return { pairs: [], att: 0 };

  const pairs: MatchingResult["pairs"] = [];
  let effectSum = 0;
  for (const t of treated) {
    let best = controls[0];
    let bestDist = Math.abs(t.propensity - best.propensity);
    for (const c of controls) {
      const d = Math.abs(t.propensity - c.propensity);
      if (d < bestDist) {
        best = c;
        bestDist = d;
      }
    }
    pairs.push({ treatedId: t.id, controlId: best.id, distance: round(bestDist) });
    effectSum += t.outcome - best.outcome;
  }
  return { pairs, att: round(effectSum / treated.length) };
}

// --- Regression discontinuity (#1017) --------------------------------------

export interface RdResult {
  estimate: number;
  leftIntercept: number;
  rightIntercept: number;
  n: number;
}

function ols(points: { x: number; y: number }[]): { slope: number; intercept: number } {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  const mx = mean(points.map((p) => p.x));
  const my = mean(points.map((p) => p.y));
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: my - slope * mx };
}

/**
 * Sharp RD: fit local linear regressions on each side of a cutoff within a
 * bandwidth and estimate the discontinuity (jump) at the cutoff.
 */
export function regressionDiscontinuity(
  points: { x: number; y: number }[],
  cutoff: number,
  bandwidth: number
): RdResult {
  const left = points.filter((p) => p.x < cutoff && p.x >= cutoff - bandwidth);
  const right = points.filter((p) => p.x >= cutoff && p.x <= cutoff + bandwidth);
  const lFit = ols(left.map((p) => ({ x: p.x - cutoff, y: p.y })));
  const rFit = ols(right.map((p) => ({ x: p.x - cutoff, y: p.y })));
  return {
    estimate: round(rFit.intercept - lFit.intercept),
    leftIntercept: round(lFit.intercept),
    rightIntercept: round(rFit.intercept),
    n: left.length + right.length,
  };
}
