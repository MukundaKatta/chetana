import type { ProbeDefinition, Theory } from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ProbeResponseData {
  probeId: string;
  modelId: string;
  score: number;
  responseTime: number;
}

export interface IRTParameters {
  difficulty: number; // b: difficulty (-3 to +3 logit scale)
  discrimination: number; // a: how sharply the probe discriminates (0 to 3)
  guessing: number; // c: lower asymptote / guess rate (0 to 0.5)
}

export interface CalibrationResult {
  probeId: string;
  probeName: string;
  theory: Theory;
  parameters: IRTParameters;
  standardError: number;
  fitIndex: number; // 0-1 goodness of fit
  characteristicCurve: CharacteristicPoint[];
  recommendedDifficulty: DifficultyLevel;
}

export interface CharacteristicPoint {
  ability: number;
  probability: number;
}

export type DifficultyLevel = "trivial" | "easy" | "medium" | "hard" | "expert";

export interface AdaptiveDifficultyRecommendation {
  modelId: string;
  estimatedAbility: number;
  recommendedProbes: { probeId: string; expectedInformation: number }[];
  nextDifficultyTarget: number;
}

/* ------------------------------------------------------------------ */
/*  IRT 3-Parameter Logistic Model                                    */
/* ------------------------------------------------------------------ */

/**
 * 3PL item response function: P(score = 1 | ability, params)
 */
export function irt3PL(ability: number, params: IRTParameters): number {
  const { difficulty, discrimination, guessing } = params;
  const exponent = -discrimination * (ability - difficulty);
  return guessing + (1 - guessing) / (1 + Math.exp(exponent));
}

/**
 * Information function for a probe at a given ability level.
 */
export function itemInformation(ability: number, params: IRTParameters): number {
  const p = irt3PL(ability, params);
  const q = 1 - p;
  const { discrimination, guessing } = params;

  if (p <= guessing || q <= 0) return 0;

  const pStar = (p - guessing) / (1 - guessing);
  return discrimination ** 2 * (pStar ** 2 / p) * (q / p) * ((1 - guessing) ** 2);
}

/**
 * Generate the item characteristic curve across ability range.
 */
export function generateCharacteristicCurve(
  params: IRTParameters,
  abilityRange: [number, number] = [-3, 3],
  steps: number = 61,
): CharacteristicPoint[] {
  const points: CharacteristicPoint[] = [];
  const [min, max] = abilityRange;

  for (let i = 0; i <= steps; i++) {
    const ability = min + (max - min) * (i / steps);
    points.push({
      ability,
      probability: irt3PL(ability, params),
    });
  }

  return points;
}

/* ------------------------------------------------------------------ */
/*  Difficulty parameter estimation (MLE)                             */
/* ------------------------------------------------------------------ */

/**
 * Estimate IRT parameters from response data using iterative MLE.
 * Simplified approach: estimate difficulty from proportion correct,
 * discrimination from point-biserial correlation.
 */
export function estimateParameters(
  responses: ProbeResponseData[],
  initialParams?: Partial<IRTParameters>,
): IRTParameters {
  if (responses.length === 0) {
    return { difficulty: 0, discrimination: 1, guessing: 0.1 };
  }

  const scores = responses.map((r) => r.score);
  const n = scores.length;
  const meanScore = scores.reduce((s, v) => s + v, 0) / n;

  // Difficulty: inverse logit of mean score
  const clampedMean = Math.max(0.01, Math.min(0.99, meanScore));
  let difficulty = -Math.log(clampedMean / (1 - clampedMean));

  // Discrimination: based on score variance
  const variance = scores.reduce((s, v) => s + (v - meanScore) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  let discrimination = Math.max(0.3, Math.min(3, stdDev * 4));

  // Guessing: use floor of lowest quartile
  const sorted = [...scores].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(n * 0.25)] ?? 0;
  let guessing = Math.max(0, Math.min(0.4, q1 * 0.8));

  // Apply initial params as overrides
  if (initialParams?.difficulty !== undefined) difficulty = initialParams.difficulty;
  if (initialParams?.discrimination !== undefined) discrimination = initialParams.discrimination;
  if (initialParams?.guessing !== undefined) guessing = initialParams.guessing;

  // Iterative refinement (Newton-Raphson-like, 10 iterations)
  for (let iter = 0; iter < 10; iter++) {
    let gradient = 0;
    let hessian = 0;

    for (const response of responses) {
      const params: IRTParameters = { difficulty, discrimination, guessing };
      const p = irt3PL(response.score, params);
      const q = 1 - p;
      const residual = response.score - p;

      gradient += discrimination * residual;
      hessian += discrimination ** 2 * p * q;
    }

    if (Math.abs(hessian) > 1e-6) {
      difficulty -= gradient / hessian * 0.1;
      difficulty = Math.max(-3, Math.min(3, difficulty));
    }
  }

  return { difficulty, discrimination, guessing };
}

/* ------------------------------------------------------------------ */
/*  Calibration                                                       */
/* ------------------------------------------------------------------ */

export function classifyDifficulty(difficulty: number): DifficultyLevel {
  if (difficulty < -2) return "trivial";
  if (difficulty < -0.5) return "easy";
  if (difficulty < 0.5) return "medium";
  if (difficulty < 2) return "hard";
  return "expert";
}

export function calibrateProbe(
  probe: ProbeDefinition,
  responses: ProbeResponseData[],
): CalibrationResult {
  const parameters = estimateParameters(responses);
  const characteristicCurve = generateCharacteristicCurve(parameters);

  // Standard error: inverse sqrt of total information at difficulty
  const infoAtDifficulty = itemInformation(parameters.difficulty, parameters);
  const standardError = infoAtDifficulty > 0 ? 1 / Math.sqrt(infoAtDifficulty) : Infinity;

  // Fit index: correlation between predicted and observed proportions
  const abilityBins = 5;
  const sortedResponses = [...responses].sort((a, b) => a.score - b.score);
  const binSize = Math.ceil(sortedResponses.length / abilityBins);
  let ssRes = 0;
  let ssTot = 0;
  const overallMean = responses.reduce((s, r) => s + r.score, 0) / responses.length;

  for (let bin = 0; bin < abilityBins; bin++) {
    const binResponses = sortedResponses.slice(bin * binSize, (bin + 1) * binSize);
    if (binResponses.length === 0) continue;

    const observedProportion =
      binResponses.reduce((s, r) => s + r.score, 0) / binResponses.length;
    const midAbility = (bin - abilityBins / 2) * (6 / abilityBins);
    const predicted = irt3PL(midAbility, parameters);

    ssRes += (observedProportion - predicted) ** 2;
    ssTot += (observedProportion - overallMean) ** 2;
  }

  const fitIndex = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  return {
    probeId: probe.id,
    probeName: probe.name,
    theory: probe.theory,
    parameters,
    standardError: isFinite(standardError) ? standardError : 999,
    fitIndex,
    characteristicCurve,
    recommendedDifficulty: classifyDifficulty(parameters.difficulty),
  };
}

/* ------------------------------------------------------------------ */
/*  Adaptive difficulty recommendation                                */
/* ------------------------------------------------------------------ */

export function recommendAdaptiveProbes(
  modelId: string,
  previousResults: ProbeResponseData[],
  calibrations: CalibrationResult[],
  maxRecommendations: number = 10,
): AdaptiveDifficultyRecommendation {
  // Estimate model ability from previous results
  const modelScores = previousResults.filter((r) => r.modelId === modelId);
  const estimatedAbility =
    modelScores.length > 0
      ? modelScores.reduce((s, r) => s + r.score, 0) / modelScores.length * 6 - 3
      : 0;

  // For each calibrated probe, compute expected information at estimated ability
  const probeInfo = calibrations.map((cal) => ({
    probeId: cal.probeId,
    expectedInformation: itemInformation(estimatedAbility, cal.parameters),
  }));

  // Sort by information descending
  probeInfo.sort((a, b) => b.expectedInformation - a.expectedInformation);

  // Target difficulty for next probes: near current ability
  const nextDifficultyTarget = estimatedAbility;

  return {
    modelId,
    estimatedAbility,
    recommendedProbes: probeInfo.slice(0, maxRecommendations),
    nextDifficultyTarget,
  };
}
