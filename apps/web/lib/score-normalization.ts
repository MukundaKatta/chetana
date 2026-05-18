/**
 * Score normalization engine (Issue #368).
 * Z-score normalization, min-max scaling, percentile rank,
 * cross-theory normalization, and raw vs normalized toggle support.
 */

import type { Theory, TheoryScores } from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type NormalizationMethod =
  | "zscore"
  | "minmax"
  | "percentile"
  | "robust"
  | "decimal";

export interface NormalizationConfig {
  /** Normalization method to use. */
  method: NormalizationMethod;
  /** Target range for min-max scaling (default [0, 1]). */
  targetRange: [number, number];
  /** Clip values outside target range (default true). */
  clip: boolean;
  /** Decimal precision (default 4). */
  precision: number;
}

export interface NormalizedScore {
  /** Original raw score. */
  raw: number;
  /** Normalized score. */
  normalized: number;
  /** Method used. */
  method: NormalizationMethod;
  /** Percentile rank (0-100). */
  percentileRank: number;
  /** Z-score. */
  zScore: number;
}

export interface NormalizationStats {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  median: number;
  q1: number;
  q3: number;
  iqr: number;
  count: number;
}

export interface CrossTheoryNormalization {
  theory: Theory;
  rawScore: number;
  normalizedScore: number;
  theoryMean: number;
  theoryStdDev: number;
  percentileWithinTheory: number;
  percentileAcrossAll: number;
}

export interface ScoreDisplayMode {
  /** Show raw scores. */
  raw: boolean;
  /** Show normalized scores. */
  normalized: boolean;
  /** Active normalization method. */
  method: NormalizationMethod;
}

const DEFAULT_CONFIG: NormalizationConfig = {
  method: "minmax",
  targetRange: [0, 1],
  clip: true,
  precision: 4,
};

/* ------------------------------------------------------------------ */
/*  Statistical Helpers                                               */
/* ------------------------------------------------------------------ */

function computeStats(values: number[]): NormalizationStats {
  if (values.length === 0) {
    return {
      mean: 0, stdDev: 0, min: 0, max: 0,
      median: 0, q1: 0, q3: 0, iqr: 0, count: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const variance = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1 || 1);
  const stdDev = Math.sqrt(variance);

  const quantile = (p: number): number => {
    const idx = p * (n - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo]!;
    return sorted[lo]! * (1 - (idx - lo)) + sorted[hi]! * (idx - lo);
  };

  const q1 = quantile(0.25);
  const median = quantile(0.5);
  const q3 = quantile(0.75);

  return {
    mean: round(mean, 6),
    stdDev: round(stdDev, 6),
    min: sorted[0]!,
    max: sorted[n - 1]!,
    median: round(median, 6),
    q1: round(q1, 6),
    q3: round(q3, 6),
    iqr: round(q3 - q1, 6),
    count: n,
  };
}

function round(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/* ------------------------------------------------------------------ */
/*  Normalization Functions                                           */
/* ------------------------------------------------------------------ */

/**
 * Z-score normalization: (x - mean) / stdDev.
 */
export function zScoreNormalize(
  value: number,
  stats: NormalizationStats
): number {
  if (stats.stdDev === 0) return 0;
  return (value - stats.mean) / stats.stdDev;
}

/**
 * Min-max scaling to [targetMin, targetMax] range.
 */
export function minMaxNormalize(
  value: number,
  stats: NormalizationStats,
  targetRange: [number, number] = [0, 1]
): number {
  const range = stats.max - stats.min;
  if (range === 0) return (targetRange[0] + targetRange[1]) / 2;

  const [targetMin, targetMax] = targetRange;
  return targetMin + ((value - stats.min) / range) * (targetMax - targetMin);
}

/**
 * Percentile rank: what percentage of values fall below this value.
 */
export function percentileRank(value: number, sortedValues: number[]): number {
  if (sortedValues.length === 0) return 0;

  let count = 0;
  for (const v of sortedValues) {
    if (v < value) count++;
    else if (v === value) count += 0.5;
  }

  return (count / sortedValues.length) * 100;
}

/**
 * Robust normalization using IQR: (x - median) / IQR.
 * Less sensitive to outliers than z-score.
 */
export function robustNormalize(
  value: number,
  stats: NormalizationStats
): number {
  if (stats.iqr === 0) return 0;
  return (value - stats.median) / stats.iqr;
}

/**
 * Decimal scaling normalization: x / 10^j where j is the number of digits in max(|x|).
 */
export function decimalNormalize(
  value: number,
  stats: NormalizationStats
): number {
  const maxAbs = Math.max(Math.abs(stats.max), Math.abs(stats.min));
  if (maxAbs === 0) return 0;
  const j = Math.ceil(Math.log10(maxAbs + 1));
  return value / 10 ** j;
}

/* ------------------------------------------------------------------ */
/*  Main Normalization Engine                                         */
/* ------------------------------------------------------------------ */

/**
 * Normalize a single score using the specified method.
 */
export function normalizeScore(
  value: number,
  allValues: number[],
  config: Partial<NormalizationConfig> = {}
): NormalizedScore {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const stats = computeStats(allValues);
  const sorted = [...allValues].sort((a, b) => a - b);

  let normalized: number;

  switch (cfg.method) {
    case "zscore":
      normalized = zScoreNormalize(value, stats);
      break;
    case "minmax":
      normalized = minMaxNormalize(value, stats, cfg.targetRange);
      break;
    case "percentile":
      normalized = percentileRank(value, sorted) / 100;
      break;
    case "robust":
      normalized = robustNormalize(value, stats);
      break;
    case "decimal":
      normalized = decimalNormalize(value, stats);
      break;
  }

  if (cfg.clip) {
    normalized = clamp(normalized, cfg.targetRange[0], cfg.targetRange[1]);
  }

  return {
    raw: value,
    normalized: round(normalized, cfg.precision),
    method: cfg.method,
    percentileRank: round(percentileRank(value, sorted), 2),
    zScore: round(zScoreNormalize(value, stats), cfg.precision),
  };
}

/**
 * Normalize an array of scores.
 */
export function normalizeScores(
  values: number[],
  config: Partial<NormalizationConfig> = {}
): NormalizedScore[] {
  return values.map((v) => normalizeScore(v, values, config));
}

/* ------------------------------------------------------------------ */
/*  Cross-Theory Normalization                                        */
/* ------------------------------------------------------------------ */

/**
 * Normalize theory scores so they are comparable across theories.
 * Each theory may have different score distributions.
 */
export function crossTheoryNormalize(
  theoryScores: TheoryScores,
  historicalScores: Record<Theory, number[]>,
  method: NormalizationMethod = "zscore"
): CrossTheoryNormalization[] {
  const theories: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];
  const allScores = theories.flatMap(
    (t) => historicalScores[t] ?? []
  );
  const allSorted = [...allScores].sort((a, b) => a - b);

  return theories.map((theory) => {
    const rawScore = theoryScores[theory];
    const theoryHistory = historicalScores[theory] ?? [rawScore];
    const theoryStats = computeStats(theoryHistory);
    const theorySorted = [...theoryHistory].sort((a, b) => a - b);

    let normalizedScore: number;
    switch (method) {
      case "zscore":
        normalizedScore = zScoreNormalize(rawScore, theoryStats);
        break;
      case "minmax":
        normalizedScore = minMaxNormalize(rawScore, theoryStats);
        break;
      case "percentile":
        normalizedScore = percentileRank(rawScore, theorySorted) / 100;
        break;
      case "robust":
        normalizedScore = robustNormalize(rawScore, theoryStats);
        break;
      case "decimal":
        normalizedScore = decimalNormalize(rawScore, theoryStats);
        break;
    }

    return {
      theory,
      rawScore,
      normalizedScore: round(normalizedScore, 4),
      theoryMean: theoryStats.mean,
      theoryStdDev: theoryStats.stdDev,
      percentileWithinTheory: round(percentileRank(rawScore, theorySorted), 2),
      percentileAcrossAll: round(percentileRank(rawScore, allSorted), 2),
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Display Mode Utilities                                            */
/* ------------------------------------------------------------------ */

/**
 * Get the display value based on the current mode.
 */
export function getDisplayScore(
  normalized: NormalizedScore,
  mode: ScoreDisplayMode
): number {
  if (mode.normalized && !mode.raw) return normalized.normalized;
  if (mode.raw && !mode.normalized) return normalized.raw;
  return normalized.normalized; // default to normalized
}

/**
 * Format a score for display.
 */
export function formatScore(
  value: number,
  method: NormalizationMethod,
  precision: number = 3
): string {
  switch (method) {
    case "percentile":
      return `${(value * 100).toFixed(1)}th`;
    case "zscore":
      return `z=${value.toFixed(precision)}`;
    default:
      return value.toFixed(precision);
  }
}

/**
 * Compute stats for an array of values.
 */
export { computeStats as computeNormalizationStats };
