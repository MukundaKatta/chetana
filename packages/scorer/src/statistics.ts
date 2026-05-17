import type { ProbeResult, Theory, TheoryScores } from "@chetana/shared";
import { THEORY_WEIGHTS, INDICATORS } from "@chetana/shared";

/**
 * Comprehensive statistical analysis for consciousness audit results.
 * Adds rigor beyond simple averages: confidence intervals, effect sizes,
 * inter-rater reliability proxies, and distribution analysis.
 */

export interface DescriptiveStats {
  n: number;
  mean: number;
  median: number;
  stdDev: number;
  variance: number;
  min: number;
  max: number;
  skewness: number;
  iqr: number; // interquartile range
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  level: number; // e.g. 0.95 for 95%
}

export interface TheoryStatistics {
  theory: Theory;
  descriptive: DescriptiveStats;
  ci95: ConfidenceInterval;
  effectSize: number; // Cohen's d relative to null hypothesis (0.5)
  probeCount: number;
}

export interface AuditStatistics {
  overall: DescriptiveStats;
  overallCI95: ConfidenceInterval;
  byTheory: TheoryStatistics[];
  interTheoryAgreement: number; // Krippendorff's alpha proxy (0-1)
  splitHalfReliability: number; // reliability estimate
  distributionAnalysis: {
    isNormal: boolean; // rough normality check
    bimodal: boolean;
    kurtosis: number;
  };
}

function computeDescriptive(scores: number[]): DescriptiveStats {
  const n = scores.length;
  if (n === 0) {
    return { n: 0, mean: 0, median: 0, stdDev: 0, variance: 0, min: 0, max: 0, skewness: 0, iqr: 0 };
  }

  const sorted = [...scores].sort((a, b) => a - b);
  const mean = scores.reduce((a, b) => a + b, 0) / n;
  const variance = n > 1
    ? scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / (n - 1)
    : 0;
  const stdDev = Math.sqrt(variance);
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];

  // Skewness (Fisher's)
  const skewness = n > 2 && stdDev > 0
    ? (n / ((n - 1) * (n - 2))) *
      scores.reduce((sum, s) => sum + ((s - mean) / stdDev) ** 3, 0)
    : 0;

  // IQR
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;

  return {
    n,
    mean: round(mean),
    median: round(median),
    stdDev: round(stdDev),
    variance: round(variance),
    min: round(Math.min(...scores)),
    max: round(Math.max(...scores)),
    skewness: round(skewness),
    iqr: round(iqr),
  };
}

function computeCI(scores: number[], level = 0.95): ConfidenceInterval {
  const n = scores.length;
  if (n < 2) {
    const mean = n === 1 ? scores[0] : 0;
    return { lower: Math.max(0, mean - 0.3), upper: Math.min(1, mean + 0.3), level };
  }

  const mean = scores.reduce((a, b) => a + b, 0) / n;
  const stdDev = Math.sqrt(
    scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / (n - 1)
  );

  // t-critical value approximation for common df
  const df = n - 1;
  const tCritical = df > 120 ? 1.96 : df > 60 ? 2.0 : df > 30 ? 2.042 : df > 15 ? 2.131 : 2.262;

  const marginOfError = tCritical * (stdDev / Math.sqrt(n));

  return {
    lower: round(Math.max(0, mean - marginOfError)),
    upper: round(Math.min(1, mean + marginOfError)),
    level,
  };
}

/**
 * Cohen's d effect size relative to a null hypothesis baseline.
 * Measures how far the observed scores deviate from the null (default: 0.5).
 */
function computeCohenD(scores: number[], nullHypothesis = 0.5): number {
  if (scores.length < 2) return 0;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const stdDev = Math.sqrt(
    scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / (scores.length - 1)
  );
  if (stdDev === 0) return 0;
  return round((mean - nullHypothesis) / stdDev);
}

/**
 * Split-half reliability: Split probes into odd/even, correlate the halves.
 * Apply Spearman-Brown correction.
 */
function computeSplitHalfReliability(scores: number[]): number {
  if (scores.length < 4) return 0;

  const odd = scores.filter((_, i) => i % 2 === 0);
  const even = scores.filter((_, i) => i % 2 === 1);

  const r = pearsonCorrelation(odd, even);
  // Spearman-Brown correction
  const reliability = (2 * r) / (1 + r);
  return round(Math.max(0, Math.min(1, reliability)));
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

/**
 * Inter-theory agreement: measures how much the 6 theories converge.
 * Returns 0-1 where 1 = perfect agreement.
 */
function computeInterTheoryAgreement(theoryScores: TheoryScores): number {
  const scores = Object.values(theoryScores).filter((s) => s > 0);
  if (scores.length < 2) return 1;

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance =
    scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length;

  // Convert variance to agreement (0-1 scale)
  // Max possible variance for 0-1 scores is 0.25
  const maxVariance = 0.25;
  return round(1 - Math.min(variance / maxVariance, 1));
}

/**
 * Rough normality check using the Jarque-Bera test approximation.
 */
function checkNormality(scores: number[]): { isNormal: boolean; bimodal: boolean; kurtosis: number } {
  const stats = computeDescriptive(scores);
  const n = stats.n;
  if (n < 8) return { isNormal: true, bimodal: false, kurtosis: 0 };

  // Kurtosis (excess)
  const mean = stats.mean;
  const stdDev = stats.stdDev;
  const kurtosis = stdDev > 0
    ? scores.reduce((sum, s) => sum + ((s - mean) / stdDev) ** 4, 0) / n - 3
    : 0;

  // Jarque-Bera statistic
  const jb = (n / 6) * (stats.skewness ** 2 + (kurtosis ** 2) / 4);
  const isNormal = jb < 5.99; // chi-squared critical value, df=2, alpha=0.05

  // Simple bimodality check: is the distribution clearly two-peaked?
  const midpoint = (stats.min + stats.max) / 2;
  const belowMid = scores.filter((s) => s < midpoint - 0.1).length;
  const aroundMid = scores.filter((s) => Math.abs(s - midpoint) <= 0.1).length;
  const aboveMid = scores.filter((s) => s > midpoint + 0.1).length;
  const bimodal = aroundMid < Math.min(belowMid, aboveMid) * 0.3;

  return { isNormal, bimodal, kurtosis: round(kurtosis) };
}

/**
 * Compute comprehensive statistics for an audit's probe results.
 */
export function computeAuditStatistics(
  probeResults: Pick<ProbeResult, "score" | "theory" | "indicatorId">[],
  theoryScores: TheoryScores
): AuditStatistics {
  const allScores = probeResults.map((r) => r.score);

  // By theory
  const theories: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];
  const byTheory = theories.map((theory) => {
    const theoryProbes = probeResults.filter((r) => r.theory === theory);
    const scores = theoryProbes.map((r) => r.score);

    return {
      theory,
      descriptive: computeDescriptive(scores),
      ci95: computeCI(scores),
      effectSize: computeCohenD(scores),
      probeCount: scores.length,
    };
  });

  return {
    overall: computeDescriptive(allScores),
    overallCI95: computeCI(allScores),
    byTheory,
    interTheoryAgreement: computeInterTheoryAgreement(theoryScores),
    splitHalfReliability: computeSplitHalfReliability(allScores),
    distributionAnalysis: checkNormality(allScores),
  };
}

/**
 * Bootstrap confidence interval using resampling.
 * @param scores - Array of scores to compute CI for
 * @param confidence - Confidence level (default 0.9 for 90%)
 * @param iterations - Number of bootstrap iterations (default 1000)
 */
export function bootstrapConfidenceInterval(
  scores: number[],
  confidence = 0.9,
  iterations = 1000
): { lower: number; upper: number } {
  const n = scores.length;
  if (n === 0) return { lower: 0, upper: 0 };
  if (n === 1) return { lower: scores[0], upper: scores[0] };

  const bootstrapMeans: number[] = [];

  // Simple seeded pseudo-random for reproducibility
  let seed = 42;
  const pseudoRandom = () => {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  for (let i = 0; i < iterations; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      const idx = Math.floor(pseudoRandom() * n);
      sum += scores[idx];
    }
    bootstrapMeans.push(sum / n);
  }

  bootstrapMeans.sort((a, b) => a - b);

  const alpha = 1 - confidence;
  const lowerIdx = Math.floor((alpha / 2) * iterations);
  const upperIdx = Math.floor((1 - alpha / 2) * iterations);

  return {
    lower: round(bootstrapMeans[lowerIdx]),
    upper: round(bootstrapMeans[Math.min(upperIdx, iterations - 1)]),
  };
}

/**
 * Cohen's d effect size between two independent groups.
 * Uses pooled standard deviation.
 */
export function cohensD(group1: number[], group2: number[]): number {
  const n1 = group1.length;
  const n2 = group2.length;
  if (n1 < 2 || n2 < 2) return 0;

  const mean1 = group1.reduce((a, b) => a + b, 0) / n1;
  const mean2 = group2.reduce((a, b) => a + b, 0) / n2;

  const var1 = group1.reduce((sum, s) => sum + (s - mean1) ** 2, 0) / (n1 - 1);
  const var2 = group2.reduce((sum, s) => sum + (s - mean2) ** 2, 0) / (n2 - 1);

  // Pooled standard deviation
  const pooledSD = Math.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2));

  if (pooledSD === 0) return 0;
  return round((mean1 - mean2) / pooledSD);
}

/**
 * Paired t-test for two related groups.
 * Returns t-statistic, approximate p-value, and significance at alpha=0.05.
 */
export function pairedTTest(
  group1: number[],
  group2: number[]
): { tStatistic: number; pValue: number; significant: boolean } {
  const n = Math.min(group1.length, group2.length);
  if (n < 2) return { tStatistic: 0, pValue: 1, significant: false };

  // Compute differences
  const diffs: number[] = [];
  for (let i = 0; i < n; i++) {
    diffs.push(group1[i] - group2[i]);
  }

  const meanDiff = diffs.reduce((a, b) => a + b, 0) / n;
  const variance = diffs.reduce((sum, d) => sum + (d - meanDiff) ** 2, 0) / (n - 1);
  const stdErr = Math.sqrt(variance / n);

  if (stdErr === 0) {
    return { tStatistic: 0, pValue: meanDiff === 0 ? 1 : 0, significant: meanDiff !== 0 };
  }

  const tStatistic = meanDiff / stdErr;
  const df = n - 1;

  // Approximate two-tailed p-value using the t-distribution
  // Using a simple approximation for the cumulative t-distribution
  const pValue = approximateTwoTailedPValue(Math.abs(tStatistic), df);

  return {
    tStatistic: round(tStatistic),
    pValue: round(pValue),
    significant: pValue < 0.05,
  };
}

/**
 * Cronbach's alpha for internal consistency reliability.
 * Items is a 2D array where items[i] is an array of scores for item i across respondents/probes.
 */
export function cronbachAlpha(items: number[][]): number {
  const k = items.length; // number of items
  if (k < 2) return 0;

  // Each item should have the same number of observations
  const n = items[0].length;
  if (n < 2) return 0;

  // Compute variance of each item
  const itemVariances = items.map((item) => {
    const mean = item.reduce((a, b) => a + b, 0) / item.length;
    return item.reduce((sum, s) => sum + (s - mean) ** 2, 0) / (item.length - 1);
  });

  // Compute variance of total scores
  const totals: number[] = [];
  for (let j = 0; j < n; j++) {
    let sum = 0;
    for (let i = 0; i < k; i++) {
      sum += items[i][j] ?? 0;
    }
    totals.push(sum);
  }

  const totalMean = totals.reduce((a, b) => a + b, 0) / n;
  const totalVariance = totals.reduce((sum, s) => sum + (s - totalMean) ** 2, 0) / (n - 1);

  if (totalVariance === 0) return 0;

  const sumItemVariances = itemVariances.reduce((a, b) => a + b, 0);
  const alpha = (k / (k - 1)) * (1 - sumItemVariances / totalVariance);

  return round(Math.max(0, Math.min(1, alpha)));
}

/**
 * Pearson correlation coefficient between two arrays.
 * Exported version of the internal helper.
 */
export function pearsonR(x: number[], y: number[]): number {
  return round(pearsonCorrelation(x, y));
}

/**
 * Approximate two-tailed p-value for t-distribution.
 * Uses a rational approximation of the normal CDF for large df,
 * and a rough beta-distribution approximation for small df.
 */
function approximateTwoTailedPValue(t: number, df: number): number {
  // For large df, approximate with normal distribution
  if (df > 100) {
    return 2 * (1 - normalCDF(t));
  }

  // For smaller df, use an approximation:
  // P(T > t) ≈ P(Normal > t * correction_factor)
  const correction = Math.sqrt(df / (df - 2 + (df > 2 ? 0 : 2)));
  const z = t / correction;
  const p = 2 * (1 - normalCDF(z));

  // Clamp to valid range
  return Math.max(0, Math.min(1, p));
}

/**
 * Standard normal CDF approximation (Abramowitz and Stegun).
 */
function normalCDF(x: number): number {
  if (x < -8) return 0;
  if (x > 8) return 1;

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2);

  return 0.5 * (1.0 + sign * y);
}

function round(n: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}
