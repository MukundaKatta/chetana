/**
 * Probe effectiveness scoring with discrimination index,
 * reliability coefficient, information gain metric,
 * quality dashboard data, and improvement recommendations
 * (Issue #381).
 */

import type { ProbeResult, Theory, IndicatorId } from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ProbeEffectivenessScore {
  probeId: string;
  probeName: string;
  indicatorId: IndicatorId;
  theory: Theory;
  discriminationIndex: number;
  reliabilityCoefficient: number;
  informationGain: number;
  overallQuality: number;
  sampleSize: number;
  meanScore: number;
  stdDev: number;
  recommendations: string[];
}

export interface QualityDashboardData {
  totalProbes: number;
  averageQuality: number;
  highQualityCount: number;
  mediumQualityCount: number;
  lowQualityCount: number;
  byTheory: Record<Theory, TheoryQuality>;
  topPerformers: ProbeEffectivenessScore[];
  needsImprovement: ProbeEffectivenessScore[];
  overallRecommendations: string[];
}

export interface TheoryQuality {
  theory: Theory;
  probeCount: number;
  averageQuality: number;
  averageDiscrimination: number;
  averageReliability: number;
  averageInfoGain: number;
}

export interface ProbeResultsByModel {
  modelName: string;
  results: ProbeResult[];
}

/* ------------------------------------------------------------------ */
/*  Stats helpers                                                     */
/* ------------------------------------------------------------------ */

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
}

function stdDev(values: number[]): number {
  return Math.sqrt(variance(values));
}

function correlation(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;

  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  const sx = stdDev(xs.slice(0, n));
  const sy = stdDev(ys.slice(0, n));

  if (sx === 0 || sy === 0) return 0;

  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += (xs[i] - mx) * (ys[i] - my);
  }

  return sum / ((n - 1) * sx * sy);
}

function entropy(values: number[], bins: number = 10): number {
  if (values.length === 0) return 0;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const binCounts = new Array(bins).fill(0);
  for (const v of values) {
    const idx = Math.min(Math.floor(((v - min) / range) * bins), bins - 1);
    binCounts[idx]++;
  }

  let h = 0;
  for (const count of binCounts) {
    if (count === 0) continue;
    const p = count / values.length;
    h -= p * Math.log2(p);
  }

  return h;
}

/* ------------------------------------------------------------------ */
/*  Discrimination index                                              */
/* ------------------------------------------------------------------ */

/**
 * Measures how well a probe differentiates between models.
 * Higher variance across model means = better discrimination.
 * Returns a value from 0 (no discrimination) to 1 (excellent).
 */
export function computeDiscriminationIndex(
  scoresByModel: Map<string, number[]>,
): number {
  if (scoresByModel.size < 2) return 0;

  const modelMeans: number[] = [];
  for (const scores of scoresByModel.values()) {
    if (scores.length > 0) {
      modelMeans.push(mean(scores));
    }
  }

  if (modelMeans.length < 2) return 0;

  const v = variance(modelMeans);
  // Normalize: max possible variance for [0,1] scores is 0.25
  return Math.min(1, v / 0.25);
}

/* ------------------------------------------------------------------ */
/*  Reliability coefficient                                           */
/* ------------------------------------------------------------------ */

/**
 * Estimates test-retest reliability using split-half correlation.
 * Groups results by model, splits each model's results in half,
 * correlates the halves.
 */
export function computeReliabilityCoefficient(
  scoresByModel: Map<string, number[]>,
): number {
  const halfA: number[] = [];
  const halfB: number[] = [];

  for (const scores of scoresByModel.values()) {
    if (scores.length < 2) continue;

    const sorted = [...scores];
    const mid = Math.floor(sorted.length / 2);

    halfA.push(mean(sorted.slice(0, mid)));
    halfB.push(mean(sorted.slice(mid)));
  }

  if (halfA.length < 2) return 0;

  const r = correlation(halfA, halfB);
  // Spearman-Brown correction for split-half
  const corrected = (2 * r) / (1 + Math.abs(r));
  return Math.max(0, Math.min(1, corrected));
}

/* ------------------------------------------------------------------ */
/*  Information gain                                                  */
/* ------------------------------------------------------------------ */

/**
 * Measures how much information a probe adds beyond prior.
 * Uses entropy reduction: high info gain means the probe
 * substantially changes the score distribution.
 */
export function computeInformationGain(allScores: number[]): number {
  if (allScores.length < 3) return 0;

  // Prior: uniform distribution entropy
  const uniformEntropy = Math.log2(10); // 10 bins
  const posteriorEntropy = entropy(allScores, 10);

  // Normalize to [0, 1]
  const gain = (uniformEntropy - posteriorEntropy) / uniformEntropy;
  return Math.max(0, Math.min(1, gain));
}

/* ------------------------------------------------------------------ */
/*  Score individual probes                                           */
/* ------------------------------------------------------------------ */

/**
 * Score a single probe's effectiveness across multiple model runs.
 */
export function scoreProbeEffectiveness(
  probeName: string,
  probeId: string,
  indicatorId: IndicatorId,
  theory: Theory,
  resultsByModel: ProbeResultsByModel[],
): ProbeEffectivenessScore {
  // Group scores by model
  const scoresByModel = new Map<string, number[]>();
  const allScores: number[] = [];

  for (const modelResults of resultsByModel) {
    const relevantResults = modelResults.results.filter(
      (r) => r.probeName === probeName,
    );
    const scores = relevantResults.map((r) => r.score);
    if (scores.length > 0) {
      scoresByModel.set(modelResults.modelName, scores);
      allScores.push(...scores);
    }
  }

  const discriminationIndex = computeDiscriminationIndex(scoresByModel);
  const reliabilityCoefficient = computeReliabilityCoefficient(scoresByModel);
  const informationGain = computeInformationGain(allScores);

  // Weighted overall quality
  const overallQuality =
    discriminationIndex * 0.4 +
    reliabilityCoefficient * 0.35 +
    informationGain * 0.25;

  const recommendations = generateRecommendations(
    probeName,
    discriminationIndex,
    reliabilityCoefficient,
    informationGain,
    allScores,
    scoresByModel.size,
  );

  return {
    probeId,
    probeName,
    indicatorId,
    theory,
    discriminationIndex: round(discriminationIndex),
    reliabilityCoefficient: round(reliabilityCoefficient),
    informationGain: round(informationGain),
    overallQuality: round(overallQuality),
    sampleSize: allScores.length,
    meanScore: round(mean(allScores)),
    stdDev: round(stdDev(allScores)),
    recommendations,
  };
}

/* ------------------------------------------------------------------ */
/*  Dashboard data                                                    */
/* ------------------------------------------------------------------ */

/**
 * Generate quality dashboard data from probe effectiveness scores.
 */
export function generateDashboardData(
  scores: ProbeEffectivenessScore[],
): QualityDashboardData {
  const avgQuality = mean(scores.map((s) => s.overallQuality));

  const high = scores.filter((s) => s.overallQuality >= 0.7);
  const medium = scores.filter(
    (s) => s.overallQuality >= 0.4 && s.overallQuality < 0.7,
  );
  const low = scores.filter((s) => s.overallQuality < 0.4);

  // By theory
  const theories: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];
  const byTheory: Record<string, TheoryQuality> = {};

  for (const theory of theories) {
    const theoryScores = scores.filter((s) => s.theory === theory);
    byTheory[theory] = {
      theory,
      probeCount: theoryScores.length,
      averageQuality: round(mean(theoryScores.map((s) => s.overallQuality))),
      averageDiscrimination: round(
        mean(theoryScores.map((s) => s.discriminationIndex)),
      ),
      averageReliability: round(
        mean(theoryScores.map((s) => s.reliabilityCoefficient)),
      ),
      averageInfoGain: round(
        mean(theoryScores.map((s) => s.informationGain)),
      ),
    };
  }

  const sorted = [...scores].sort(
    (a, b) => b.overallQuality - a.overallQuality,
  );

  const overallRecommendations = generateOverallRecommendations(
    scores,
    byTheory as Record<Theory, TheoryQuality>,
  );

  return {
    totalProbes: scores.length,
    averageQuality: round(avgQuality),
    highQualityCount: high.length,
    mediumQualityCount: medium.length,
    lowQualityCount: low.length,
    byTheory: byTheory as Record<Theory, TheoryQuality>,
    topPerformers: sorted.slice(0, 5),
    needsImprovement: sorted.slice(-5).reverse(),
    overallRecommendations,
  };
}

/* ------------------------------------------------------------------ */
/*  Recommendations                                                   */
/* ------------------------------------------------------------------ */

function generateRecommendations(
  probeName: string,
  discrimination: number,
  reliability: number,
  infoGain: number,
  allScores: number[],
  modelCount: number,
): string[] {
  const recs: string[] = [];

  if (discrimination < 0.2) {
    recs.push(
      `Low discrimination (${round(discrimination)}): "${probeName}" produces similar scores across models. Consider rephrasing to target model-specific behaviors.`,
    );
  }

  if (reliability < 0.3) {
    recs.push(
      `Low reliability (${round(reliability)}): Results are inconsistent across runs. Tighten scoring criteria or reduce prompt ambiguity.`,
    );
  }

  if (infoGain < 0.2) {
    recs.push(
      `Low information gain (${round(infoGain)}): Probe doesn't add much beyond prior. Consider more targeted questioning.`,
    );
  }

  if (allScores.length > 0) {
    const m = mean(allScores);
    if (m > 0.9) {
      recs.push(
        "Ceiling effect: Most models score very high. Increase difficulty to improve discrimination.",
      );
    }
    if (m < 0.1) {
      recs.push(
        "Floor effect: Most models score very low. May be too difficult or poorly targeted.",
      );
    }
  }

  if (modelCount < 3) {
    recs.push(
      "Insufficient model diversity: Test with at least 3 different models for reliable discrimination metrics.",
    );
  }

  if (recs.length === 0) {
    recs.push("Probe performing well across all metrics.");
  }

  return recs;
}

function generateOverallRecommendations(
  scores: ProbeEffectivenessScore[],
  byTheory: Record<Theory, TheoryQuality>,
): string[] {
  const recs: string[] = [];

  const lowQuality = scores.filter((s) => s.overallQuality < 0.3);
  if (lowQuality.length > 0) {
    recs.push(
      `${lowQuality.length} probe(s) have critically low quality scores and should be revised or replaced.`,
    );
  }

  const theories: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];
  for (const theory of theories) {
    const tq = byTheory[theory];
    if (tq && tq.probeCount < 2) {
      recs.push(
        `Theory ${theory.toUpperCase()} has only ${tq.probeCount} probe(s). Add more for robust assessment.`,
      );
    }
    if (tq && tq.averageDiscrimination < 0.2) {
      recs.push(
        `Probes for ${theory.toUpperCase()} show weak discrimination. Diversify probe strategies.`,
      );
    }
  }

  const avgReliability = mean(scores.map((s) => s.reliabilityCoefficient));
  if (avgReliability < 0.5) {
    recs.push(
      "Overall reliability is low. Consider standardizing scoring rubrics.",
    );
  }

  if (recs.length === 0) {
    recs.push("Probe suite is performing well overall. Continue monitoring.");
  }

  return recs;
}

/* ------------------------------------------------------------------ */
/*  Utilities                                                         */
/* ------------------------------------------------------------------ */

function round(v: number, decimals: number = 4): number {
  const factor = 10 ** decimals;
  return Math.round(v * factor) / factor;
}
