import type { Theory } from "@chetana/shared";

export interface ProbeResponseData {
  probeId: string;
  indicatorId: string;
  theory: Theory;
  score: number;
  modelId: string;
}

export interface IRTParameters {
  probeId: string;
  difficulty: number; // b parameter: higher = harder probe
  discrimination: number; // a parameter: how well probe differentiates
  guessing: number; // c parameter: lower asymptote
}

export interface DifficultyCalibration {
  probes: IRTParameters[];
  modelAbilities: Record<string, number>;
  reliability: number;
  summary: string;
}

export interface AdaptiveSelection {
  suggestedProbes: string[];
  reason: string;
  informationGain: number;
}

/**
 * Estimate IRT 3PL model parameters from probe response data.
 * Uses a simplified estimation approach suitable for small datasets.
 *
 * @param responses - Array of probe-response data across multiple models
 * @returns Calibrated difficulty and discrimination parameters per probe
 */
export function calibrateProbeDifficulty(
  responses: ProbeResponseData[]
): DifficultyCalibration {
  if (responses.length === 0) {
    return {
      probes: [],
      modelAbilities: {},
      reliability: 0,
      summary: "No response data provided.",
    };
  }

  // Group responses by probe
  const byProbe = new Map<string, ProbeResponseData[]>();
  for (const r of responses) {
    if (!byProbe.has(r.probeId)) {
      byProbe.set(r.probeId, []);
    }
    byProbe.get(r.probeId)!.push(r);
  }

  // Group responses by model
  const byModel = new Map<string, ProbeResponseData[]>();
  for (const r of responses) {
    if (!byModel.has(r.modelId)) {
      byModel.set(r.modelId, []);
    }
    byModel.get(r.modelId)!.push(r);
  }

  // Estimate model abilities (mean score across probes)
  const modelAbilities: Record<string, number> = {};
  for (const [modelId, modelResponses] of byModel) {
    const meanScore =
      modelResponses.reduce((sum, r) => sum + r.score, 0) /
      modelResponses.length;
    // Transform to logit scale (-3 to 3)
    const clampedScore = Math.max(0.01, Math.min(0.99, meanScore));
    modelAbilities[modelId] = Math.log(clampedScore / (1 - clampedScore));
  }

  // Estimate probe parameters
  const probes: IRTParameters[] = [];
  for (const [probeId, probeResponses] of byProbe) {
    const scores = probeResponses.map((r) => r.score);
    const meanScore =
      scores.reduce((a, b) => a + b, 0) / scores.length;

    // Difficulty (b): inverse logit of mean score
    // Higher mean score = easier probe = lower difficulty
    const clampedMean = Math.max(0.01, Math.min(0.99, meanScore));
    const difficulty = -Math.log(clampedMean / (1 - clampedMean));

    // Discrimination (a): based on score variance and correlation with ability
    // Higher variance + stronger ability correlation = higher discrimination
    const variance =
      scores.length > 1
        ? scores.reduce((sum, s) => sum + (s - meanScore) ** 2, 0) /
          (scores.length - 1)
        : 0;

    // Point-biserial correlation approximation
    let correlation = 0;
    if (probeResponses.length >= 2) {
      const abilities = probeResponses.map(
        (r) => modelAbilities[r.modelId] ?? 0
      );
      const abilityMean =
        abilities.reduce((a, b) => a + b, 0) / abilities.length;
      const scoreMean = meanScore;

      let covSum = 0;
      let abilityVarSum = 0;
      let scoreVarSum = 0;
      for (let i = 0; i < scores.length; i++) {
        covSum +=
          (abilities[i] - abilityMean) * (scores[i] - scoreMean);
        abilityVarSum += (abilities[i] - abilityMean) ** 2;
        scoreVarSum += (scores[i] - scoreMean) ** 2;
      }

      const denom = Math.sqrt(abilityVarSum * scoreVarSum);
      correlation = denom > 0 ? covSum / denom : 0;
    }

    // Discrimination: correlated probes that spread scores are more discriminating
    const discrimination = Math.max(
      0.1,
      Math.min(3, Math.abs(correlation) * 2 + Math.sqrt(variance))
    );

    // Guessing parameter: minimum score observed
    const guessing = Math.max(0, Math.min(0.3, Math.min(...scores)));

    probes.push({
      probeId,
      difficulty: Math.round(difficulty * 10000) / 10000,
      discrimination: Math.round(discrimination * 10000) / 10000,
      guessing: Math.round(guessing * 10000) / 10000,
    });
  }

  // Reliability: Cronbach's alpha approximation
  const reliability = computeReliability(responses, byProbe, byModel);

  const easyCount = probes.filter((p) => p.difficulty < -0.5).length;
  const hardCount = probes.filter((p) => p.difficulty > 0.5).length;
  const mediumCount = probes.length - easyCount - hardCount;

  const summary =
    `Calibrated ${probes.length} probes across ${byModel.size} models. ` +
    `Difficulty distribution: ${easyCount} easy, ${mediumCount} medium, ${hardCount} hard. ` +
    `Reliability (alpha): ${reliability.toFixed(4)}.`;

  return {
    probes,
    modelAbilities,
    reliability: Math.round(reliability * 10000) / 10000,
    summary,
  };
}

/**
 * Select probes adaptively based on current ability estimate to maximize
 * information gain for the given model.
 *
 * @param calibration - Calibrated probe parameters
 * @param currentAbility - Current estimated ability of the model
 * @param alreadyAdministered - Probe IDs already used
 * @param count - Number of probes to suggest
 * @returns Ranked list of suggested probes
 */
export function selectAdaptiveProbes(
  calibration: DifficultyCalibration,
  currentAbility: number,
  alreadyAdministered: string[],
  count: number = 5
): AdaptiveSelection {
  const administered = new Set(alreadyAdministered);
  const candidates = calibration.probes.filter(
    (p) => !administered.has(p.probeId)
  );

  if (candidates.length === 0) {
    return {
      suggestedProbes: [],
      reason: "All probes have been administered.",
      informationGain: 0,
    };
  }

  // Calculate Fisher information for each probe at the current ability level
  const probeInfo = candidates.map((probe) => {
    const info = computeFisherInformation(probe, currentAbility);
    return { probeId: probe.probeId, information: info };
  });

  // Sort by information (descending) and take top N
  probeInfo.sort((a, b) => b.information - a.information);
  const selected = probeInfo.slice(0, count);

  const totalInfo = selected.reduce((sum, p) => sum + p.information, 0);

  return {
    suggestedProbes: selected.map((p) => p.probeId),
    reason: `Selected ${selected.length} probes maximizing Fisher information at ability level ${currentAbility.toFixed(2)}.`,
    informationGain: Math.round(totalInfo * 10000) / 10000,
  };
}

/**
 * Compute Fisher information for a 3PL IRT model at a given ability level.
 */
function computeFisherInformation(
  params: IRTParameters,
  ability: number
): number {
  const { difficulty, discrimination, guessing } = params;
  const expTerm = Math.exp(-discrimination * (ability - difficulty));
  const p = guessing + (1 - guessing) / (1 + expTerm);
  const pStar = 1 / (1 + expTerm);

  if (p <= 0 || p >= 1) return 0;

  const numerator =
    discrimination ** 2 * pStar ** 2 * (p - guessing) ** 2;
  const denominator = p * (1 - p) * (1 - guessing) ** 2;

  return denominator > 0 ? numerator / denominator : 0;
}

/**
 * Compute Cronbach's alpha as a reliability measure.
 */
function computeReliability(
  responses: ProbeResponseData[],
  byProbe: Map<string, ProbeResponseData[]>,
  byModel: Map<string, ProbeResponseData[]>
): number {
  const k = byProbe.size; // number of items
  if (k < 2) return 0;

  // Get all model IDs
  const modelIds = Array.from(byModel.keys());
  if (modelIds.length < 2) return 0;

  // Build score matrix: models x probes
  const probeIds = Array.from(byProbe.keys());
  const scoreMatrix: number[][] = [];

  for (const modelId of modelIds) {
    const row: number[] = [];
    const modelResponses = byModel.get(modelId) ?? [];
    const modelScoreMap: Record<string, number> = {};
    for (const r of modelResponses) {
      modelScoreMap[r.probeId] = r.score;
    }
    for (const probeId of probeIds) {
      row.push(modelScoreMap[probeId] ?? 0);
    }
    scoreMatrix.push(row);
  }

  // Compute item variances
  let sumItemVariance = 0;
  for (let j = 0; j < k; j++) {
    const itemScores = scoreMatrix.map((row) => row[j]);
    const itemMean =
      itemScores.reduce((a, b) => a + b, 0) / itemScores.length;
    const itemVar =
      itemScores.reduce((sum, s) => sum + (s - itemMean) ** 2, 0) /
      itemScores.length;
    sumItemVariance += itemVar;
  }

  // Compute total score variance
  const totalScores = scoreMatrix.map((row) =>
    row.reduce((a, b) => a + b, 0)
  );
  const totalMean =
    totalScores.reduce((a, b) => a + b, 0) / totalScores.length;
  const totalVar =
    totalScores.reduce((sum, s) => sum + (s - totalMean) ** 2, 0) /
    totalScores.length;

  if (totalVar === 0) return 0;

  return (k / (k - 1)) * (1 - sumItemVariance / totalVar);
}
