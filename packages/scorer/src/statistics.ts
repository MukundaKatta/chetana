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

function round(n: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}
