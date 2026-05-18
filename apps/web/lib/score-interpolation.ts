import type { Theory, IndicatorId } from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type InterpolationMethod = "linear" | "nearest" | "spline";

export interface DataPoint {
  x: number;
  y: number;
  isInterpolated: boolean;
  confidence: number;
  probeId?: string;
  theory?: Theory;
  indicatorId?: IndicatorId;
}

export interface InterpolationConfig {
  method: InterpolationMethod;
  confidenceThreshold: number;
  maxGapSize: number;
}

export interface InterpolationResult {
  points: DataPoint[];
  interpolatedCount: number;
  originalCount: number;
  averageConfidence: number;
  impactAnalysis: ImpactAnalysis;
}

export interface ImpactAnalysis {
  meanWithInterpolation: number;
  meanWithoutInterpolation: number;
  meanDelta: number;
  maxInterpolatedValue: number;
  minInterpolatedValue: number;
  interpolatedRange: number;
}

/* ------------------------------------------------------------------ */
/*  Default config                                                    */
/* ------------------------------------------------------------------ */

export function createDefaultConfig(overrides?: Partial<InterpolationConfig>): InterpolationConfig {
  return {
    method: "linear",
    confidenceThreshold: 0.5,
    maxGapSize: 5,
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  Interpolation methods                                             */
/* ------------------------------------------------------------------ */

export function linearInterpolate(x: number, x0: number, y0: number, x1: number, y1: number): number {
  if (x1 === x0) return y0;
  return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
}

export function nearestInterpolate(x: number, x0: number, y0: number, x1: number, y1: number): number {
  return Math.abs(x - x0) <= Math.abs(x - x1) ? y0 : y1;
}

/**
 * Natural cubic spline interpolation.
 * Returns a function that evaluates the spline at any x.
 */
export function buildCubicSpline(xs: number[], ys: number[]): (x: number) => number {
  const n = xs.length;
  if (n < 2) return () => ys[0] ?? 0;
  if (n === 2) return (x: number) => linearInterpolate(x, xs[0], ys[0], xs[1], ys[1]);

  const h: number[] = [];
  const alpha: number[] = [0];
  for (let i = 0; i < n - 1; i++) {
    h.push(xs[i + 1] - xs[i]);
  }
  for (let i = 1; i < n - 1; i++) {
    alpha.push(
      (3 / h[i]) * (ys[i + 1] - ys[i]) - (3 / h[i - 1]) * (ys[i] - ys[i - 1]),
    );
  }

  const l: number[] = Array(n).fill(0);
  const mu: number[] = Array(n).fill(0);
  const z: number[] = Array(n).fill(0);
  const c: number[] = Array(n).fill(0);
  const b: number[] = Array(n - 1).fill(0);
  const d: number[] = Array(n - 1).fill(0);

  l[0] = 1;
  for (let i = 1; i < n - 1; i++) {
    l[i] = 2 * (xs[i + 1] - xs[i - 1]) - h[i - 1] * mu[i - 1];
    mu[i] = h[i] / l[i];
    z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
  }
  l[n - 1] = 1;

  for (let j = n - 2; j >= 0; j--) {
    c[j] = z[j] - mu[j] * c[j + 1];
    b[j] = (ys[j + 1] - ys[j]) / h[j] - h[j] * (c[j + 1] + 2 * c[j]) / 3;
    d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
  }

  return (x: number): number => {
    // Clamp to range
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];

    // Find interval
    let i = 0;
    for (let k = 0; k < n - 1; k++) {
      if (x >= xs[k] && x <= xs[k + 1]) {
        i = k;
        break;
      }
    }

    const dx = x - xs[i];
    return ys[i] + b[i] * dx + c[i] * dx * dx + d[i] * dx * dx * dx;
  };
}

/* ------------------------------------------------------------------ */
/*  Confidence calculation                                            */
/* ------------------------------------------------------------------ */

function computeConfidence(
  gapSize: number,
  maxGap: number,
  leftY: number,
  rightY: number,
): number {
  const gapPenalty = 1 - gapSize / (maxGap + 1);
  const stabilityBonus = 1 - Math.abs(rightY - leftY);
  return Math.max(0, Math.min(1, gapPenalty * 0.7 + stabilityBonus * 0.3));
}

/* ------------------------------------------------------------------ */
/*  Core interpolation                                                */
/* ------------------------------------------------------------------ */

export function interpolate(
  known: DataPoint[],
  targetXs: number[],
  config: InterpolationConfig,
): InterpolationResult {
  const sorted = [...known]
    .filter((p) => !p.isInterpolated)
    .sort((a, b) => a.x - b.x);

  if (sorted.length === 0) {
    return {
      points: [],
      interpolatedCount: 0,
      originalCount: 0,
      averageConfidence: 0,
      impactAnalysis: {
        meanWithInterpolation: 0,
        meanWithoutInterpolation: 0,
        meanDelta: 0,
        maxInterpolatedValue: 0,
        minInterpolatedValue: 0,
        interpolatedRange: 0,
      },
    };
  }

  const knownXSet = new Set(sorted.map((p) => p.x));
  const splineFn =
    config.method === "spline"
      ? buildCubicSpline(
          sorted.map((p) => p.x),
          sorted.map((p) => p.y),
        )
      : null;

  const result: DataPoint[] = [];
  const interpolatedValues: number[] = [];

  for (const tx of targetXs) {
    if (knownXSet.has(tx)) {
      const existing = sorted.find((p) => p.x === tx)!;
      result.push({ ...existing, isInterpolated: false, confidence: 1 });
      continue;
    }

    // Find bracketing points
    let leftIdx = -1;
    let rightIdx = -1;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].x <= tx) leftIdx = i;
      if (sorted[i].x >= tx && rightIdx === -1) rightIdx = i;
    }

    if (leftIdx === -1 || rightIdx === -1) {
      // Extrapolation: use nearest
      const nearest = leftIdx === -1 ? sorted[0] : sorted[sorted.length - 1];
      const confidence = 0.3;
      if (confidence >= config.confidenceThreshold) {
        result.push({ x: tx, y: nearest.y, isInterpolated: true, confidence });
        interpolatedValues.push(nearest.y);
      }
      continue;
    }

    const gap = rightIdx - leftIdx;
    if (gap > config.maxGapSize) continue;

    const leftP = sorted[leftIdx];
    const rightP = sorted[rightIdx];
    const confidence = computeConfidence(gap, config.maxGapSize, leftP.y, rightP.y);

    if (confidence < config.confidenceThreshold) continue;

    let y: number;
    switch (config.method) {
      case "linear":
        y = linearInterpolate(tx, leftP.x, leftP.y, rightP.x, rightP.y);
        break;
      case "nearest":
        y = nearestInterpolate(tx, leftP.x, leftP.y, rightP.x, rightP.y);
        break;
      case "spline":
        y = splineFn!(tx);
        break;
    }

    // Clamp score to [0, 1]
    y = Math.max(0, Math.min(1, y));
    result.push({ x: tx, y, isInterpolated: true, confidence });
    interpolatedValues.push(y);
  }

  // Impact analysis
  const originalValues = sorted.map((p) => p.y);
  const allValues = [...originalValues, ...interpolatedValues];
  const meanOrig =
    originalValues.length > 0
      ? originalValues.reduce((s, v) => s + v, 0) / originalValues.length
      : 0;
  const meanAll =
    allValues.length > 0
      ? allValues.reduce((s, v) => s + v, 0) / allValues.length
      : 0;

  const avgConfidence =
    interpolatedValues.length > 0
      ? result.filter((p) => p.isInterpolated).reduce((s, p) => s + p.confidence, 0) /
        interpolatedValues.length
      : 0;

  return {
    points: result.sort((a, b) => a.x - b.x),
    interpolatedCount: interpolatedValues.length,
    originalCount: sorted.length,
    averageConfidence: avgConfidence,
    impactAnalysis: {
      meanWithInterpolation: meanAll,
      meanWithoutInterpolation: meanOrig,
      meanDelta: meanAll - meanOrig,
      maxInterpolatedValue: interpolatedValues.length > 0 ? Math.max(...interpolatedValues) : 0,
      minInterpolatedValue: interpolatedValues.length > 0 ? Math.min(...interpolatedValues) : 0,
      interpolatedRange:
        interpolatedValues.length > 0
          ? Math.max(...interpolatedValues) - Math.min(...interpolatedValues)
          : 0,
    },
  };
}
