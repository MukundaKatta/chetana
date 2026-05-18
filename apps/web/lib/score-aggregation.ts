/**
 * Issue #430 - Score aggregation strategies
 *
 * Weighted mean, geometric mean, trimmed mean, median,
 * strategy comparison showing impact on final scores.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type AggregationStrategy =
  | "weighted-mean"
  | "arithmetic-mean"
  | "geometric-mean"
  | "trimmed-mean"
  | "median"
  | "harmonic-mean"
  | "winsorized-mean";

export interface AggregationWeights {
  [key: string]: number;
}

export interface AggregationOptions {
  /** Strategy to use. */
  strategy: AggregationStrategy;
  /** Weights per key (for weighted mean). Keys should match score keys. */
  weights?: AggregationWeights;
  /** Trim percentage for trimmed/winsorized mean (0-0.5, default 0.1). */
  trimPercent?: number;
}

export interface AggregationResult {
  strategy: AggregationStrategy;
  value: number;
  inputCount: number;
  metadata: {
    trimmedCount?: number;
    effectiveWeights?: AggregationWeights;
    min: number;
    max: number;
    range: number;
    stdDev: number;
  };
}

export interface StrategyComparison {
  scores: Record<string, number>;
  results: Record<AggregationStrategy, AggregationResult>;
  maxDifference: number;
  bestStrategy: AggregationStrategy;
  worstStrategy: AggregationStrategy;
  impactAnalysis: ImpactAnalysis[];
}

export interface ImpactAnalysis {
  strategy: AggregationStrategy;
  aggregatedScore: number;
  differenceFromMean: number;
  percentDifference: number;
  favorsBias: "high-scores" | "low-scores" | "neutral";
}

/* ------------------------------------------------------------------ */
/*  Statistical Helpers                                               */
/* ------------------------------------------------------------------ */

function sortedCopy(values: number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/* ------------------------------------------------------------------ */
/*  Aggregation Functions                                             */
/* ------------------------------------------------------------------ */

/** Weighted arithmetic mean. */
export function weightedMean(
  scores: Record<string, number>,
  weights: AggregationWeights = {},
): AggregationResult {
  const entries = Object.entries(scores);
  if (entries.length === 0) {
    return createEmptyResult("weighted-mean");
  }

  let totalWeight = 0;
  let weightedSum = 0;
  const effectiveWeights: AggregationWeights = {};

  for (const [key, value] of entries) {
    const weight = weights[key] ?? 1;
    effectiveWeights[key] = weight;
    weightedSum += value * weight;
    totalWeight += weight;
  }

  const values = entries.map(([, v]) => v);
  const result = totalWeight > 0 ? weightedSum / totalWeight : 0;

  return {
    strategy: "weighted-mean",
    value: result,
    inputCount: entries.length,
    metadata: {
      effectiveWeights,
      min: Math.min(...values),
      max: Math.max(...values),
      range: Math.max(...values) - Math.min(...values),
      stdDev: stdDev(values),
    },
  };
}

/** Simple arithmetic mean. */
export function arithmeticMean(scores: Record<string, number>): AggregationResult {
  const values = Object.values(scores);
  if (values.length === 0) return createEmptyResult("arithmetic-mean");

  const result = mean(values);

  return {
    strategy: "arithmetic-mean",
    value: result,
    inputCount: values.length,
    metadata: {
      min: Math.min(...values),
      max: Math.max(...values),
      range: Math.max(...values) - Math.min(...values),
      stdDev: stdDev(values),
    },
  };
}

/** Geometric mean (suitable for ratios/percentages). */
export function geometricMean(scores: Record<string, number>): AggregationResult {
  const values = Object.values(scores);
  if (values.length === 0) return createEmptyResult("geometric-mean");

  // Geometric mean requires positive values
  const positiveValues = values.filter((v) => v > 0);
  if (positiveValues.length === 0) return createEmptyResult("geometric-mean");

  // Use log-sum to avoid overflow
  const logSum = positiveValues.reduce((acc, v) => acc + Math.log(v), 0);
  const result = Math.exp(logSum / positiveValues.length);

  return {
    strategy: "geometric-mean",
    value: result,
    inputCount: values.length,
    metadata: {
      min: Math.min(...values),
      max: Math.max(...values),
      range: Math.max(...values) - Math.min(...values),
      stdDev: stdDev(values),
    },
  };
}

/** Harmonic mean (sensitive to low values). */
export function harmonicMean(scores: Record<string, number>): AggregationResult {
  const values = Object.values(scores);
  if (values.length === 0) return createEmptyResult("harmonic-mean");

  const positiveValues = values.filter((v) => v > 0);
  if (positiveValues.length === 0) return createEmptyResult("harmonic-mean");

  const reciprocalSum = positiveValues.reduce((acc, v) => acc + 1 / v, 0);
  const result = positiveValues.length / reciprocalSum;

  return {
    strategy: "harmonic-mean",
    value: result,
    inputCount: values.length,
    metadata: {
      min: Math.min(...values),
      max: Math.max(...values),
      range: Math.max(...values) - Math.min(...values),
      stdDev: stdDev(values),
    },
  };
}

/** Trimmed mean (remove extreme values before averaging). */
export function trimmedMean(
  scores: Record<string, number>,
  trimPercent = 0.1,
): AggregationResult {
  const values = Object.values(scores);
  if (values.length === 0) return createEmptyResult("trimmed-mean");

  const sorted = sortedCopy(values);
  const trimCount = Math.floor(sorted.length * trimPercent);
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);

  if (trimmed.length === 0) {
    // If we trimmed everything, fall back to median
    return median(scores);
  }

  const result = mean(trimmed);

  return {
    strategy: "trimmed-mean",
    value: result,
    inputCount: values.length,
    metadata: {
      trimmedCount: trimCount * 2,
      min: Math.min(...values),
      max: Math.max(...values),
      range: Math.max(...values) - Math.min(...values),
      stdDev: stdDev(values),
    },
  };
}

/** Winsorized mean (clamp extreme values instead of removing). */
export function winsorizedMean(
  scores: Record<string, number>,
  trimPercent = 0.1,
): AggregationResult {
  const values = Object.values(scores);
  if (values.length === 0) return createEmptyResult("winsorized-mean");

  const sorted = sortedCopy(values);
  const trimCount = Math.floor(sorted.length * trimPercent);

  const lowerBound = sorted[trimCount] ?? sorted[0];
  const upperBound = sorted[sorted.length - 1 - trimCount] ?? sorted[sorted.length - 1];

  const winsorized = values.map((v) => Math.max(lowerBound, Math.min(upperBound, v)));
  const result = mean(winsorized);

  return {
    strategy: "winsorized-mean",
    value: result,
    inputCount: values.length,
    metadata: {
      trimmedCount: trimCount * 2,
      min: Math.min(...values),
      max: Math.max(...values),
      range: Math.max(...values) - Math.min(...values),
      stdDev: stdDev(values),
    },
  };
}

/** Median (middle value). */
export function median(scores: Record<string, number>): AggregationResult {
  const values = Object.values(scores);
  if (values.length === 0) return createEmptyResult("median");

  const sorted = sortedCopy(values);
  const mid = Math.floor(sorted.length / 2);
  const result = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];

  return {
    strategy: "median",
    value: result,
    inputCount: values.length,
    metadata: {
      min: Math.min(...values),
      max: Math.max(...values),
      range: Math.max(...values) - Math.min(...values),
      stdDev: stdDev(values),
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Unified Aggregation                                               */
/* ------------------------------------------------------------------ */

/** Aggregate scores using the specified strategy. */
export function aggregate(
  scores: Record<string, number>,
  options: AggregationOptions,
): AggregationResult {
  switch (options.strategy) {
    case "weighted-mean":
      return weightedMean(scores, options.weights);
    case "arithmetic-mean":
      return arithmeticMean(scores);
    case "geometric-mean":
      return geometricMean(scores);
    case "harmonic-mean":
      return harmonicMean(scores);
    case "trimmed-mean":
      return trimmedMean(scores, options.trimPercent);
    case "winsorized-mean":
      return winsorizedMean(scores, options.trimPercent);
    case "median":
      return median(scores);
  }
}

/* ------------------------------------------------------------------ */
/*  Strategy Comparison                                               */
/* ------------------------------------------------------------------ */

const ALL_STRATEGIES: AggregationStrategy[] = [
  "weighted-mean",
  "arithmetic-mean",
  "geometric-mean",
  "harmonic-mean",
  "trimmed-mean",
  "winsorized-mean",
  "median",
];

/** Compare all aggregation strategies on the same data. */
export function compareStrategies(
  scores: Record<string, number>,
  weights?: AggregationWeights,
  trimPercent?: number,
): StrategyComparison {
  const results = {} as Record<AggregationStrategy, AggregationResult>;

  for (const strategy of ALL_STRATEGIES) {
    results[strategy] = aggregate(scores, { strategy, weights, trimPercent });
  }

  const values = ALL_STRATEGIES.map((s) => results[s].value);
  const baselineMean = mean(values);

  const impactAnalysis: ImpactAnalysis[] = ALL_STRATEGIES.map((strategy) => {
    const value = results[strategy].value;
    const diff = value - baselineMean;
    const percentDiff = baselineMean > 0 ? (diff / baselineMean) * 100 : 0;

    let favorsBias: ImpactAnalysis["favorsBias"];
    if (Math.abs(percentDiff) < 1) favorsBias = "neutral";
    else if (diff > 0) favorsBias = "high-scores";
    else favorsBias = "low-scores";

    return {
      strategy,
      aggregatedScore: value,
      differenceFromMean: diff,
      percentDifference: percentDiff,
      favorsBias,
    };
  });

  const maxScore = Math.max(...values);
  const minScore = Math.min(...values);
  const maxDifference = maxScore - minScore;

  const bestStrategy = ALL_STRATEGIES[values.indexOf(maxScore)];
  const worstStrategy = ALL_STRATEGIES[values.indexOf(minScore)];

  return {
    scores,
    results,
    maxDifference,
    bestStrategy,
    worstStrategy,
    impactAnalysis,
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function createEmptyResult(strategy: AggregationStrategy): AggregationResult {
  return {
    strategy,
    value: 0,
    inputCount: 0,
    metadata: { min: 0, max: 0, range: 0, stdDev: 0 },
  };
}

/** Get a human-friendly label for an aggregation strategy. */
export function getStrategyLabel(strategy: AggregationStrategy): string {
  const labels: Record<AggregationStrategy, string> = {
    "weighted-mean": "Weighted Mean",
    "arithmetic-mean": "Arithmetic Mean",
    "geometric-mean": "Geometric Mean",
    "harmonic-mean": "Harmonic Mean",
    "trimmed-mean": "Trimmed Mean",
    "winsorized-mean": "Winsorized Mean",
    median: "Median",
  };
  return labels[strategy];
}

/** Get a description of when to use each strategy. */
export function getStrategyDescription(strategy: AggregationStrategy): string {
  const descriptions: Record<AggregationStrategy, string> = {
    "weighted-mean": "Best when some theories are more relevant than others. Assign higher weights to prioritized theories.",
    "arithmetic-mean": "Simple average. Works well when all scores are equally important and roughly normally distributed.",
    "geometric-mean": "Good for multiplicative relationships. Penalizes zero or very low scores more heavily.",
    "harmonic-mean": "Strongly influenced by low values. Use when you want to ensure no single theory has a very low score.",
    "trimmed-mean": "Removes extreme outliers before averaging. Good when occasional probe errors may skew results.",
    "winsorized-mean": "Limits extreme values instead of removing them. Similar to trimmed mean but retains all data points.",
    median: "The middle value. Robust to outliers and useful when score distributions are heavily skewed.",
  };
  return descriptions[strategy];
}

export { ALL_STRATEGIES };
