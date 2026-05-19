/**
 * Cross-theory correlation: Pearson/Spearman, partial correlation,
 * significance testing, correlation matrix data, cluster detection
 * (Issue #499).
 */

import type { Theory } from "@chetana/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CorrelationResult {
  r: number;
  pValue: number;
  n: number;
  significant: boolean;
  confidenceInterval: [number, number];
}

export interface PartialCorrelationResult extends CorrelationResult {
  controlVariables: string[];
}

export interface CorrelationMatrixEntry {
  theoryA: Theory;
  theoryB: Theory;
  pearson: CorrelationResult;
  spearman: CorrelationResult;
}

export interface CorrelationMatrix {
  theories: Theory[];
  entries: CorrelationMatrixEntry[];
  n: number;
}

export interface TheoryCluster {
  theories: Theory[];
  avgCorrelation: number;
  label: string;
}

export interface ClusterDetectionResult {
  clusters: TheoryCluster[];
  silhouetteScore: number;
}

export type CorrelationMethod = "pearson" | "spearman";

// ---------------------------------------------------------------------------
// Basic statistics helpers
// ---------------------------------------------------------------------------

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stddev(xs: number[]): number {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((sum, x) => sum + (x - m) ** 2, 0) / (xs.length - 1));
}

function ranks(xs: number[]): number[] {
  const indexed = xs.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);
  const result = new Array<number>(xs.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j < indexed.length && indexed[j].v === indexed[i].v) j++;
    const avgRank = (i + j + 1) / 2; // 1-based average rank for ties
    for (let k = i; k < j; k++) {
      result[indexed[k].i] = avgRank;
    }
    i = j;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Pearson correlation
// ---------------------------------------------------------------------------

export function pearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 3) {
    throw new Error("Arrays must have equal length >= 3");
  }
  const n = x.length;
  const mx = mean(x);
  const my = mean(y);
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : num / denom;
}

// ---------------------------------------------------------------------------
// Spearman rank correlation
// ---------------------------------------------------------------------------

export function spearmanCorrelation(x: number[], y: number[]): number {
  return pearsonCorrelation(ranks(x), ranks(y));
}

// ---------------------------------------------------------------------------
// Significance testing (t-test for correlation)
// ---------------------------------------------------------------------------

/**
 * Approximate two-tailed p-value for a Pearson r using the t-distribution.
 * Uses the Beta regularized function approximation for small df.
 */
function tDistributionPValue(t: number, df: number): number {
  // Approximation using the incomplete beta function relation
  const x = df / (df + t * t);
  return betaIncomplete(df / 2, 0.5, x);
}

/** Rough incomplete beta via continued-fraction (Lentz) for p-value use. */
function betaIncomplete(a: number, b: number, x: number): number {
  if (x === 0 || x === 1) return x === 0 ? 1 : 0;
  const lnBeta = lgamma(a) + lgamma(b) - lgamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a;

  // Lentz continued-fraction
  let f = 1;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  f = d;
  for (let m = 1; m <= 200; m++) {
    let numerator = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 + numerator * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + numerator / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    f *= d * c;

    numerator =
      -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + numerator * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + numerator / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const delta = d * c;
    f *= delta;
    if (Math.abs(delta - 1) < 1e-10) break;
  }
  const result = 1 - front * f;
  return Math.max(0, Math.min(1, result));
}

function lgamma(x: number): number {
  // Stirling-like approximation (Lanczos)
  const coefs = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.001208650973866179, -0.000005395239384953,
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const c of coefs) {
    y += 1;
    ser += c / y;
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function computeSignificance(
  r: number,
  n: number,
  alpha: number = 0.05
): { pValue: number; significant: boolean; ci: [number, number] } {
  if (n < 4) return { pValue: 1, significant: false, ci: [-1, 1] };

  const df = n - 2;
  const t = (r * Math.sqrt(df)) / Math.sqrt(1 - r * r + 1e-15);
  const pValue = tDistributionPValue(Math.abs(t), df);

  // Fisher z-transform for confidence interval
  const z = 0.5 * Math.log((1 + r) / (1 - r + 1e-15));
  const se = 1 / Math.sqrt(n - 3);
  const zCrit = 1.96; // ~95%
  const zLo = z - zCrit * se;
  const zHi = z + zCrit * se;
  const ci: [number, number] = [
    Math.max(-1, (Math.exp(2 * zLo) - 1) / (Math.exp(2 * zLo) + 1)),
    Math.min(1, (Math.exp(2 * zHi) - 1) / (Math.exp(2 * zHi) + 1)),
  ];

  return { pValue, significant: pValue < alpha, ci };
}

// ---------------------------------------------------------------------------
// Public correlation functions
// ---------------------------------------------------------------------------

export function computeCorrelation(
  x: number[],
  y: number[],
  method: CorrelationMethod = "pearson",
  alpha: number = 0.05
): CorrelationResult {
  const n = x.length;
  const r = method === "pearson" ? pearsonCorrelation(x, y) : spearmanCorrelation(x, y);
  const { pValue, significant, ci } = computeSignificance(r, n, alpha);
  return { r, pValue, n, significant, confidenceInterval: ci };
}

// ---------------------------------------------------------------------------
// Partial correlation
// ---------------------------------------------------------------------------

export function partialCorrelation(
  x: number[],
  y: number[],
  controls: number[][],
  method: CorrelationMethod = "pearson"
): PartialCorrelationResult {
  if (controls.length === 0) {
    const base = computeCorrelation(x, y, method);
    return { ...base, controlVariables: [] };
  }

  // Residualize x and y against controls via OLS
  const residualize = (target: number[], predictors: number[][]): number[] => {
    const n = target.length;
    const k = predictors.length;
    // Simple multi-regression via normal equations approximation
    // For each predictor, compute its contribution sequentially (Frisch-Waugh)
    let residual = [...target];
    for (let p = 0; p < k; p++) {
      const pred = predictors[p];
      const predMean = mean(pred);
      const resMean = mean(residual);
      let num = 0;
      let denom = 0;
      for (let i = 0; i < n; i++) {
        const dp = pred[i] - predMean;
        num += dp * (residual[i] - resMean);
        denom += dp * dp;
      }
      const beta = denom === 0 ? 0 : num / denom;
      const intercept = resMean - beta * predMean;
      residual = residual.map((v, i) => v - (intercept + beta * pred[i]));
    }
    return residual;
  };

  const xResid = residualize(x, controls);
  const yResid = residualize(y, controls);

  const r = method === "pearson" ? pearsonCorrelation(xResid, yResid) : spearmanCorrelation(xResid, yResid);
  const effectiveN = x.length - controls.length;
  const { pValue, significant, ci } = computeSignificance(r, effectiveN);

  return {
    r,
    pValue,
    n: x.length,
    significant,
    confidenceInterval: ci,
    controlVariables: controls.map((_, i) => `control_${i}`),
  };
}

// ---------------------------------------------------------------------------
// Correlation matrix
// ---------------------------------------------------------------------------

export function buildCorrelationMatrix(
  theoryScores: Record<Theory, number[]>
): CorrelationMatrix {
  const theories = Object.keys(theoryScores) as Theory[];
  const n = theoryScores[theories[0]]?.length ?? 0;
  const entries: CorrelationMatrixEntry[] = [];

  for (let i = 0; i < theories.length; i++) {
    for (let j = i + 1; j < theories.length; j++) {
      const a = theories[i];
      const b = theories[j];
      entries.push({
        theoryA: a,
        theoryB: b,
        pearson: computeCorrelation(theoryScores[a], theoryScores[b], "pearson"),
        spearman: computeCorrelation(theoryScores[a], theoryScores[b], "spearman"),
      });
    }
  }

  return { theories, entries, n };
}

export function getCorrelationPair(
  matrix: CorrelationMatrix,
  a: Theory,
  b: Theory,
  method: CorrelationMethod = "pearson"
): CorrelationResult | null {
  const entry = matrix.entries.find(
    (e) =>
      (e.theoryA === a && e.theoryB === b) ||
      (e.theoryA === b && e.theoryB === a)
  );
  if (!entry) return null;
  return method === "pearson" ? entry.pearson : entry.spearman;
}

// ---------------------------------------------------------------------------
// Cluster detection (simple agglomerative by correlation threshold)
// ---------------------------------------------------------------------------

export function detectClusters(
  matrix: CorrelationMatrix,
  threshold: number = 0.5
): ClusterDetectionResult {
  const { theories, entries } = matrix;

  // Build adjacency based on strong positive correlation
  const adjacency = new Map<Theory, Set<Theory>>();
  for (const t of theories) adjacency.set(t, new Set());
  for (const e of entries) {
    if (e.pearson.r >= threshold && e.pearson.significant) {
      adjacency.get(e.theoryA)!.add(e.theoryB);
      adjacency.get(e.theoryB)!.add(e.theoryA);
    }
  }

  // Connected-components via BFS
  const visited = new Set<Theory>();
  const clusters: TheoryCluster[] = [];

  for (const t of theories) {
    if (visited.has(t)) continue;
    const component: Theory[] = [];
    const queue: Theory[] = [t];
    while (queue.length > 0) {
      const current = queue.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      component.push(current);
      for (const neighbor of adjacency.get(current)!) {
        if (!visited.has(neighbor)) queue.push(neighbor);
      }
    }

    // Average pairwise correlation within cluster
    let sum = 0;
    let count = 0;
    for (let i = 0; i < component.length; i++) {
      for (let j = i + 1; j < component.length; j++) {
        const pair = getCorrelationPair(matrix, component[i], component[j]);
        if (pair) {
          sum += pair.r;
          count++;
        }
      }
    }

    clusters.push({
      theories: component,
      avgCorrelation: count > 0 ? sum / count : 0,
      label: component.length === 1 ? `Isolated: ${component[0]}` : component.join("+"),
    });
  }

  // Simple silhouette approximation
  const silhouetteScore = clusters.length <= 1 ? 0 : computeSilhouette(clusters, matrix);

  return { clusters, silhouetteScore };
}

function computeSilhouette(
  clusters: TheoryCluster[],
  matrix: CorrelationMatrix
): number {
  let totalSilhouette = 0;
  let n = 0;

  for (const cluster of clusters) {
    for (const theory of cluster.theories) {
      // a(i) = avg distance to same-cluster members
      let aSum = 0;
      let aCount = 0;
      for (const other of cluster.theories) {
        if (other === theory) continue;
        const pair = getCorrelationPair(matrix, theory, other);
        aSum += 1 - (pair?.r ?? 0);
        aCount++;
      }
      const a = aCount > 0 ? aSum / aCount : 0;

      // b(i) = min avg distance to other clusters
      let b = Infinity;
      for (const otherCluster of clusters) {
        if (otherCluster === cluster) continue;
        let bSum = 0;
        for (const other of otherCluster.theories) {
          const pair = getCorrelationPair(matrix, theory, other);
          bSum += 1 - (pair?.r ?? 0);
        }
        const avgDist = bSum / otherCluster.theories.length;
        if (avgDist < b) b = avgDist;
      }
      if (!isFinite(b)) b = 0;

      const s = Math.max(a, b) === 0 ? 0 : (b - a) / Math.max(a, b);
      totalSilhouette += s;
      n++;
    }
  }

  return n > 0 ? totalSilhouette / n : 0;
}
