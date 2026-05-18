/**
 * Consciousness score confidence intervals (Issue #361).
 * Bootstrap CI calculation, Wilson score interval for binary probes,
 * configurable confidence levels, and significance indicators.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type ConfidenceLevel = 90 | 95 | 99;

export interface ConfidenceInterval {
  /** Point estimate (mean or proportion). */
  estimate: number;
  /** Lower bound of the CI. */
  lower: number;
  /** Upper bound of the CI. */
  upper: number;
  /** Width of the interval (upper - lower). */
  width: number;
  /** Confidence level used. */
  confidenceLevel: ConfidenceLevel;
  /** Method used to calculate the CI. */
  method: "bootstrap" | "wilson" | "normal" | "t";
  /** Number of samples or observations. */
  sampleSize: number;
  /** Standard error of the estimate. */
  standardError: number;
}

export interface SignificanceResult {
  /** Whether the difference is statistically significant. */
  significant: boolean;
  /** The confidence interval for the difference. */
  differenceCI: ConfidenceInterval;
  /** Effect size (Cohen's d). */
  effectSize: number;
  /** Interpretation label. */
  interpretation: "negligible" | "small" | "medium" | "large";
}

export interface BootstrapConfig {
  /** Number of bootstrap resamples (default 10000). */
  nResamples: number;
  /** Confidence level (default 95). */
  confidenceLevel: ConfidenceLevel;
  /** Random seed for reproducibility (optional). */
  seed?: number;
}

/* ------------------------------------------------------------------ */
/*  Z-score lookup                                                    */
/* ------------------------------------------------------------------ */

const Z_SCORES: Record<ConfidenceLevel, number> = {
  90: 1.645,
  95: 1.96,
  99: 2.576,
};

function getZScore(level: ConfidenceLevel): number {
  return Z_SCORES[level];
}

/* ------------------------------------------------------------------ */
/*  Seeded PRNG (simple xoshiro128**)                                 */
/* ------------------------------------------------------------------ */

function createRng(seed: number): () => number {
  let s0 = seed | 0;
  let s1 = (seed * 1664525 + 1013904223) | 0;
  let s2 = (seed * 214013 + 2531011) | 0;
  let s3 = (seed * 16807 + 12345) | 0;

  return (): number => {
    const t = s1 << 9;
    let r = s1 * 5;
    r = ((r << 7) | (r >>> 25)) * 9;

    s2 ^= s0;
    s3 ^= s1;
    s1 ^= s2;
    s0 ^= s3;
    s2 ^= t;
    s3 = (s3 << 11) | (s3 >>> 21);

    return (r >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/*  Bootstrap CI                                                      */
/* ------------------------------------------------------------------ */

/**
 * Calculate a bootstrap confidence interval for a set of scores.
 *
 * @param scores - Array of score values (0-1 range expected but not required)
 * @param config - Bootstrap configuration
 * @returns Confidence interval
 */
export function bootstrapCI(
  scores: number[],
  config: Partial<BootstrapConfig> = {}
): ConfidenceInterval {
  const { nResamples = 10_000, confidenceLevel = 95, seed } = config;

  if (scores.length === 0) {
    return {
      estimate: 0,
      lower: 0,
      upper: 0,
      width: 0,
      confidenceLevel,
      method: "bootstrap",
      sampleSize: 0,
      standardError: 0,
    };
  }

  if (scores.length === 1) {
    return {
      estimate: scores[0]!,
      lower: scores[0]!,
      upper: scores[0]!,
      width: 0,
      confidenceLevel,
      method: "bootstrap",
      sampleSize: 1,
      standardError: 0,
    };
  }

  const n = scores.length;
  const estimate = scores.reduce((a, b) => a + b, 0) / n;
  const random = seed !== undefined ? createRng(seed) : Math.random;

  // Generate bootstrap resamples
  const resampleMeans: number[] = [];
  for (let i = 0; i < nResamples; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      const idx = Math.floor(random() * n);
      sum += scores[idx]!;
    }
    resampleMeans.push(sum / n);
  }

  resampleMeans.sort((a, b) => a - b);

  const alpha = (100 - confidenceLevel) / 100;
  const lowerIdx = Math.floor((alpha / 2) * nResamples);
  const upperIdx = Math.floor((1 - alpha / 2) * nResamples);

  const lower = resampleMeans[lowerIdx]!;
  const upper = resampleMeans[Math.min(upperIdx, nResamples - 1)]!;

  // Standard error from bootstrap distribution
  const bsMean = resampleMeans.reduce((a, b) => a + b, 0) / nResamples;
  const bsVariance =
    resampleMeans.reduce((acc, val) => acc + (val - bsMean) ** 2, 0) /
    (nResamples - 1);
  const standardError = Math.sqrt(bsVariance);

  return {
    estimate: Math.round(estimate * 10000) / 10000,
    lower: Math.round(lower * 10000) / 10000,
    upper: Math.round(upper * 10000) / 10000,
    width: Math.round((upper - lower) * 10000) / 10000,
    confidenceLevel,
    method: "bootstrap",
    sampleSize: n,
    standardError: Math.round(standardError * 10000) / 10000,
  };
}

/* ------------------------------------------------------------------ */
/*  Wilson Score Interval (for binary probes)                         */
/* ------------------------------------------------------------------ */

/**
 * Calculate Wilson score interval for binary (pass/fail) probes.
 *
 * @param successes - Number of successes
 * @param total - Total number of trials
 * @param confidenceLevel - Confidence level (default 95)
 * @returns Confidence interval for the proportion
 */
export function wilsonScoreInterval(
  successes: number,
  total: number,
  confidenceLevel: ConfidenceLevel = 95
): ConfidenceInterval {
  if (total === 0) {
    return {
      estimate: 0,
      lower: 0,
      upper: 0,
      width: 0,
      confidenceLevel,
      method: "wilson",
      sampleSize: 0,
      standardError: 0,
    };
  }

  const z = getZScore(confidenceLevel);
  const pHat = successes / total;
  const z2 = z * z;
  const n = total;

  const denominator = 1 + z2 / n;
  const center = pHat + z2 / (2 * n);
  const spread = z * Math.sqrt((pHat * (1 - pHat) + z2 / (4 * n)) / n);

  const lower = Math.max(0, (center - spread) / denominator);
  const upper = Math.min(1, (center + spread) / denominator);
  const estimate = center / denominator;
  const standardError = Math.sqrt((pHat * (1 - pHat)) / n);

  return {
    estimate: Math.round(estimate * 10000) / 10000,
    lower: Math.round(lower * 10000) / 10000,
    upper: Math.round(upper * 10000) / 10000,
    width: Math.round((upper - lower) * 10000) / 10000,
    confidenceLevel,
    method: "wilson",
    sampleSize: total,
    standardError: Math.round(standardError * 10000) / 10000,
  };
}

/* ------------------------------------------------------------------ */
/*  Normal Approximation CI                                           */
/* ------------------------------------------------------------------ */

/**
 * Calculate a normal approximation confidence interval.
 */
export function normalCI(
  scores: number[],
  confidenceLevel: ConfidenceLevel = 95
): ConfidenceInterval {
  if (scores.length === 0) {
    return {
      estimate: 0,
      lower: 0,
      upper: 0,
      width: 0,
      confidenceLevel,
      method: "normal",
      sampleSize: 0,
      standardError: 0,
    };
  }

  const n = scores.length;
  const mean = scores.reduce((a, b) => a + b, 0) / n;
  const variance =
    scores.reduce((acc, val) => acc + (val - mean) ** 2, 0) / (n - 1 || 1);
  const standardError = Math.sqrt(variance / n);
  const z = getZScore(confidenceLevel);

  const margin = z * standardError;
  const lower = mean - margin;
  const upper = mean + margin;

  return {
    estimate: Math.round(mean * 10000) / 10000,
    lower: Math.round(lower * 10000) / 10000,
    upper: Math.round(upper * 10000) / 10000,
    width: Math.round((upper - lower) * 10000) / 10000,
    confidenceLevel,
    method: "normal",
    sampleSize: n,
    standardError: Math.round(standardError * 10000) / 10000,
  };
}

/* ------------------------------------------------------------------ */
/*  Significance Testing                                              */
/* ------------------------------------------------------------------ */

/**
 * Test if the difference between two sets of scores is statistically significant.
 */
export function testSignificance(
  scoresA: number[],
  scoresB: number[],
  confidenceLevel: ConfidenceLevel = 95
): SignificanceResult {
  const meanA =
    scoresA.length > 0
      ? scoresA.reduce((a, b) => a + b, 0) / scoresA.length
      : 0;
  const meanB =
    scoresB.length > 0
      ? scoresB.reduce((a, b) => a + b, 0) / scoresB.length
      : 0;

  const varA =
    scoresA.length > 1
      ? scoresA.reduce((acc, v) => acc + (v - meanA) ** 2, 0) /
        (scoresA.length - 1)
      : 0;
  const varB =
    scoresB.length > 1
      ? scoresB.reduce((acc, v) => acc + (v - meanB) ** 2, 0) /
        (scoresB.length - 1)
      : 0;

  const diff = meanA - meanB;
  const pooledStdDev = Math.sqrt(
    ((scoresA.length - 1) * varA + (scoresB.length - 1) * varB) /
      (scoresA.length + scoresB.length - 2 || 1)
  );

  const se = Math.sqrt(
    varA / (scoresA.length || 1) + varB / (scoresB.length || 1)
  );
  const z = getZScore(confidenceLevel);

  const differenceCI: ConfidenceInterval = {
    estimate: Math.round(diff * 10000) / 10000,
    lower: Math.round((diff - z * se) * 10000) / 10000,
    upper: Math.round((diff + z * se) * 10000) / 10000,
    width: Math.round(2 * z * se * 10000) / 10000,
    confidenceLevel,
    method: "normal",
    sampleSize: scoresA.length + scoresB.length,
    standardError: Math.round(se * 10000) / 10000,
  };

  // Effect size: Cohen's d
  const effectSize =
    pooledStdDev > 0 ? Math.abs(diff) / pooledStdDev : 0;

  // Significant if CI doesn't include 0
  const significant =
    differenceCI.lower > 0 || differenceCI.upper < 0;

  let interpretation: SignificanceResult["interpretation"];
  if (effectSize < 0.2) interpretation = "negligible";
  else if (effectSize < 0.5) interpretation = "small";
  else if (effectSize < 0.8) interpretation = "medium";
  else interpretation = "large";

  return {
    significant,
    differenceCI,
    effectSize: Math.round(effectSize * 10000) / 10000,
    interpretation,
  };
}

/* ------------------------------------------------------------------ */
/*  Convenience: Theory-level CI                                      */
/* ------------------------------------------------------------------ */

export interface TheoryConfidenceIntervals {
  theory: string;
  ci: ConfidenceInterval;
  probeCount: number;
}

/**
 * Compute confidence intervals for each theory from grouped probe scores.
 */
export function theoryConfidenceIntervals(
  theoryScores: Record<string, number[]>,
  config: Partial<BootstrapConfig> = {}
): TheoryConfidenceIntervals[] {
  return Object.entries(theoryScores).map(([theory, scores]) => ({
    theory,
    ci: bootstrapCI(scores, config),
    probeCount: scores.length,
  }));
}

/**
 * Check if a score is within a confidence interval.
 */
export function isWithinCI(
  value: number,
  ci: ConfidenceInterval
): boolean {
  return value >= ci.lower && value <= ci.upper;
}

/**
 * Format a confidence interval as a human-readable string.
 */
export function formatCI(ci: ConfidenceInterval, decimals: number = 3): string {
  const est = ci.estimate.toFixed(decimals);
  const lo = ci.lower.toFixed(decimals);
  const hi = ci.upper.toFixed(decimals);
  return `${est} [${lo}, ${hi}] (${ci.confidenceLevel}% CI, n=${ci.sampleSize})`;
}
