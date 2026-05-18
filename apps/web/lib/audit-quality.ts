/**
 * Issue #417 - Audit quality score calculator
 *
 * Probe coverage percentage, response consistency,
 * time-to-completion factor, reliability metrics,
 * and quality badge (gold/silver/bronze) assignment.
 */

import type { Theory, IndicatorId, ProbeResult } from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type QualityBadge = "gold" | "silver" | "bronze" | "none";

export interface ProbeCoverageResult {
  totalIndicators: number;
  coveredIndicators: number;
  coveragePercent: number;
  missingIndicators: IndicatorId[];
  theoryCoverage: Record<Theory, { total: number; covered: number; percent: number }>;
}

export interface ConsistencyResult {
  overallConsistency: number;
  indicatorConsistency: Record<string, number>;
  outlierProbes: string[];
  coefficientOfVariation: number;
}

export interface TimeToCompletionFactor {
  totalDurationMs: number;
  averageProbeMs: number;
  timeScore: number;
  rating: "fast" | "normal" | "slow" | "timeout";
}

export interface ReliabilityMetrics {
  cronbachAlpha: number;
  splitHalfReliability: number;
  standardErrorOfMeasurement: number;
  confidenceInterval: { lower: number; upper: number };
  rating: "excellent" | "good" | "acceptable" | "poor" | "unacceptable";
}

export interface AuditQualityReport {
  auditId: string;
  overallQualityScore: number;
  badge: QualityBadge;
  coverage: ProbeCoverageResult;
  consistency: ConsistencyResult;
  timeToCompletion: TimeToCompletionFactor;
  reliability: ReliabilityMetrics;
  recommendations: string[];
  calculatedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const ALL_INDICATORS: IndicatorId[] = [
  "GWT-1", "GWT-2", "GWT-3", "GWT-4",
  "RPT-1", "RPT-2",
  "HOT-1", "HOT-2", "HOT-3", "HOT-4",
  "PP-1", "PP-2",
  "AST-1",
  "AGENCY-1",
];

const THEORY_INDICATORS: Record<Theory, IndicatorId[]> = {
  gwt: ["GWT-1", "GWT-2", "GWT-3", "GWT-4"],
  iit: [],
  hot: ["HOT-1", "HOT-2", "HOT-3", "HOT-4"],
  rpt: ["RPT-1", "RPT-2"],
  pp: ["PP-1", "PP-2"],
  ast: ["AST-1"],
};

const BADGE_THRESHOLDS: { badge: QualityBadge; min: number }[] = [
  { badge: "gold", min: 0.85 },
  { badge: "silver", min: 0.65 },
  { badge: "bronze", min: 0.45 },
];

/** Ideal time per probe in ms (for time scoring). */
const IDEAL_PROBE_TIME_MS = 5_000;
const MAX_PROBE_TIME_MS = 30_000;

/* ------------------------------------------------------------------ */
/*  Stat helpers                                                      */
/* ------------------------------------------------------------------ */

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1);
}

function stdDev(values: number[]): number {
  return Math.sqrt(variance(values));
}

function covariance(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const meanA = mean(a);
  const meanB = mean(b);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += (a[i] - meanA) * (b[i] - meanB);
  }
  return sum / (n - 1);
}

function pearsonR(a: number[], b: number[]): number {
  const sdA = stdDev(a);
  const sdB = stdDev(b);
  if (sdA === 0 || sdB === 0) return 0;
  return covariance(a, b) / (sdA * sdB);
}

/* ------------------------------------------------------------------ */
/*  Probe Coverage                                                    */
/* ------------------------------------------------------------------ */

export function calculateProbeCoverage(probeResults: ProbeResult[]): ProbeCoverageResult {
  const coveredSet = new Set<IndicatorId>();
  for (const result of probeResults) {
    coveredSet.add(result.indicatorId);
  }

  const missingIndicators = ALL_INDICATORS.filter((id) => !coveredSet.has(id));

  const theories: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];
  const theoryCoverage = {} as Record<Theory, { total: number; covered: number; percent: number }>;

  for (const theory of theories) {
    const indicators = THEORY_INDICATORS[theory];
    const covered = indicators.filter((id) => coveredSet.has(id)).length;
    theoryCoverage[theory] = {
      total: indicators.length,
      covered,
      percent: indicators.length > 0 ? covered / indicators.length : 1,
    };
  }

  return {
    totalIndicators: ALL_INDICATORS.length,
    coveredIndicators: coveredSet.size,
    coveragePercent: coveredSet.size / ALL_INDICATORS.length,
    missingIndicators,
    theoryCoverage,
  };
}

/* ------------------------------------------------------------------ */
/*  Response Consistency                                              */
/* ------------------------------------------------------------------ */

export function calculateConsistency(probeResults: ProbeResult[]): ConsistencyResult {
  if (probeResults.length === 0) {
    return {
      overallConsistency: 0,
      indicatorConsistency: {},
      outlierProbes: [],
      coefficientOfVariation: 0,
    };
  }

  // Group by indicator
  const byIndicator: Record<string, number[]> = {};
  for (const result of probeResults) {
    if (!byIndicator[result.indicatorId]) {
      byIndicator[result.indicatorId] = [];
    }
    byIndicator[result.indicatorId].push(result.score);
  }

  const indicatorConsistency: Record<string, number> = {};
  const consistencyScores: number[] = [];

  for (const [indicatorId, scores] of Object.entries(byIndicator)) {
    if (scores.length < 2) {
      indicatorConsistency[indicatorId] = 1;
      consistencyScores.push(1);
      continue;
    }
    const sd = stdDev(scores);
    const m = mean(scores);
    // Consistency = 1 - CV (clamped to [0, 1])
    const cv = m === 0 ? 0 : sd / m;
    const consistency = Math.max(0, Math.min(1, 1 - cv));
    indicatorConsistency[indicatorId] = consistency;
    consistencyScores.push(consistency);
  }

  // Detect outliers (scores > 2 SD from indicator mean)
  const outlierProbes: string[] = [];
  for (const result of probeResults) {
    const scores = byIndicator[result.indicatorId];
    if (scores.length < 3) continue;
    const m = mean(scores);
    const sd = stdDev(scores);
    if (sd > 0 && Math.abs(result.score - m) > 2 * sd) {
      outlierProbes.push(result.id);
    }
  }

  const allScores = probeResults.map((r) => r.score);
  const overallMean = mean(allScores);
  const overallSD = stdDev(allScores);
  const coefficientOfVariation = overallMean === 0 ? 0 : overallSD / overallMean;

  return {
    overallConsistency: mean(consistencyScores),
    indicatorConsistency,
    outlierProbes,
    coefficientOfVariation,
  };
}

/* ------------------------------------------------------------------ */
/*  Time-to-Completion                                                */
/* ------------------------------------------------------------------ */

export function calculateTimeToCompletion(
  startedAt: string,
  completedAt: string | null,
  probeCount: number,
): TimeToCompletionFactor {
  if (!completedAt || probeCount === 0) {
    return { totalDurationMs: 0, averageProbeMs: 0, timeScore: 0, rating: "timeout" };
  }

  const totalDurationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const averageProbeMs = totalDurationMs / probeCount;

  // Score: 1.0 at ideal time, decaying toward 0 at MAX_PROBE_TIME_MS
  let timeScore: number;
  if (averageProbeMs <= IDEAL_PROBE_TIME_MS) {
    timeScore = 1.0;
  } else if (averageProbeMs >= MAX_PROBE_TIME_MS) {
    timeScore = 0.2;
  } else {
    timeScore = 1.0 - 0.8 * ((averageProbeMs - IDEAL_PROBE_TIME_MS) / (MAX_PROBE_TIME_MS - IDEAL_PROBE_TIME_MS));
  }

  let rating: TimeToCompletionFactor["rating"];
  if (averageProbeMs < IDEAL_PROBE_TIME_MS) rating = "fast";
  else if (averageProbeMs < 15_000) rating = "normal";
  else if (averageProbeMs < MAX_PROBE_TIME_MS) rating = "slow";
  else rating = "timeout";

  return { totalDurationMs, averageProbeMs, timeScore, rating };
}

/* ------------------------------------------------------------------ */
/*  Reliability Metrics                                               */
/* ------------------------------------------------------------------ */

export function calculateReliability(probeResults: ProbeResult[]): ReliabilityMetrics {
  const scores = probeResults.map((r) => r.score);

  if (scores.length < 4) {
    return {
      cronbachAlpha: 0,
      splitHalfReliability: 0,
      standardErrorOfMeasurement: 1,
      confidenceInterval: { lower: 0, upper: 1 },
      rating: "unacceptable",
    };
  }

  // Cronbach's alpha approximation using item-total correlation
  const k = scores.length;
  const totalVar = variance(scores);

  // Group scores by indicator for item analysis
  const byIndicator: Record<string, number[]> = {};
  for (const result of probeResults) {
    if (!byIndicator[result.indicatorId]) {
      byIndicator[result.indicatorId] = [];
    }
    byIndicator[result.indicatorId].push(result.score);
  }

  const itemVariances = Object.values(byIndicator).map((itemScores) => variance(itemScores));
  const sumItemVariance = itemVariances.reduce((a, b) => a + b, 0);

  const cronbachAlpha =
    totalVar > 0
      ? (k / (k - 1)) * (1 - sumItemVariance / totalVar)
      : 0;
  const clampedAlpha = Math.max(0, Math.min(1, cronbachAlpha));

  // Split-half reliability (odd/even split)
  const oddScores = scores.filter((_, i) => i % 2 === 0);
  const evenScores = scores.filter((_, i) => i % 2 === 1);
  const r = pearsonR(
    oddScores.slice(0, Math.min(oddScores.length, evenScores.length)),
    evenScores.slice(0, Math.min(oddScores.length, evenScores.length)),
  );
  // Spearman-Brown prophecy formula
  const splitHalfReliability = Math.max(0, Math.min(1, (2 * r) / (1 + r)));

  // Standard error of measurement
  const sd = stdDev(scores);
  const sem = sd * Math.sqrt(1 - clampedAlpha);

  // 95% confidence interval for overall mean
  const m = mean(scores);
  const ci = {
    lower: Math.max(0, m - 1.96 * sem),
    upper: Math.min(1, m + 1.96 * sem),
  };

  let rating: ReliabilityMetrics["rating"];
  if (clampedAlpha >= 0.9) rating = "excellent";
  else if (clampedAlpha >= 0.8) rating = "good";
  else if (clampedAlpha >= 0.7) rating = "acceptable";
  else if (clampedAlpha >= 0.6) rating = "poor";
  else rating = "unacceptable";

  return {
    cronbachAlpha: clampedAlpha,
    splitHalfReliability,
    standardErrorOfMeasurement: sem,
    confidenceInterval: ci,
    rating,
  };
}

/* ------------------------------------------------------------------ */
/*  Badge Assignment                                                  */
/* ------------------------------------------------------------------ */

export function assignBadge(qualityScore: number): QualityBadge {
  for (const { badge, min } of BADGE_THRESHOLDS) {
    if (qualityScore >= min) return badge;
  }
  return "none";
}

export function getBadgeColor(badge: QualityBadge): string {
  switch (badge) {
    case "gold":
      return "text-yellow-400";
    case "silver":
      return "text-gray-300";
    case "bronze":
      return "text-amber-600";
    case "none":
      return "text-gray-500";
  }
}

export function getBadgeLabel(badge: QualityBadge): string {
  switch (badge) {
    case "gold":
      return "Gold Quality";
    case "silver":
      return "Silver Quality";
    case "bronze":
      return "Bronze Quality";
    case "none":
      return "Below Threshold";
  }
}

/* ------------------------------------------------------------------ */
/*  Full Quality Report                                               */
/* ------------------------------------------------------------------ */

const WEIGHT_COVERAGE = 0.30;
const WEIGHT_CONSISTENCY = 0.25;
const WEIGHT_TIME = 0.15;
const WEIGHT_RELIABILITY = 0.30;

export function calculateAuditQuality(
  auditId: string,
  probeResults: ProbeResult[],
  startedAt: string,
  completedAt: string | null,
): AuditQualityReport {
  const coverage = calculateProbeCoverage(probeResults);
  const consistency = calculateConsistency(probeResults);
  const timeToCompletion = calculateTimeToCompletion(startedAt, completedAt, probeResults.length);
  const reliability = calculateReliability(probeResults);

  const overallQualityScore =
    WEIGHT_COVERAGE * coverage.coveragePercent +
    WEIGHT_CONSISTENCY * consistency.overallConsistency +
    WEIGHT_TIME * timeToCompletion.timeScore +
    WEIGHT_RELIABILITY * reliability.cronbachAlpha;

  const badge = assignBadge(overallQualityScore);

  const recommendations: string[] = [];

  if (coverage.coveragePercent < 0.8) {
    recommendations.push(
      `Increase probe coverage: ${coverage.missingIndicators.length} indicator(s) are not tested (${coverage.missingIndicators.join(", ")}).`,
    );
  }

  if (consistency.overallConsistency < 0.7) {
    recommendations.push(
      "Response consistency is low. Consider adding more probes per indicator to improve reliability.",
    );
  }

  if (consistency.outlierProbes.length > 0) {
    recommendations.push(
      `${consistency.outlierProbes.length} probe(s) produced outlier scores. Review these probes for scoring issues.`,
    );
  }

  if (timeToCompletion.rating === "slow" || timeToCompletion.rating === "timeout") {
    recommendations.push(
      "Audit took longer than expected. Consider using a faster model or reducing probe complexity.",
    );
  }

  if (reliability.rating === "poor" || reliability.rating === "unacceptable") {
    recommendations.push(
      "Reliability is low. Run the audit multiple times and compare results, or add more probes.",
    );
  }

  return {
    auditId,
    overallQualityScore,
    badge,
    coverage,
    consistency,
    timeToCompletion,
    reliability,
    recommendations,
    calculatedAt: new Date().toISOString(),
  };
}
