import type { Theory, TheoryScores } from "@chetana/shared";
import { THEORY_WEIGHTS } from "@chetana/shared";

/**
 * Consciousness Index - A composite metric that combines theory scores
 * into a single 0-100 index with confidence bounds.
 */

export interface ConsciousnessIndexOptions {
  /** Aggregation method */
  method?: "mean" | "weighted" | "geometric";
  /** Custom weights per theory (overrides defaults). Values will be normalized. */
  customWeights?: Partial<Record<Theory, number>>;
}

export interface TheoryContribution {
  theory: Theory;
  /** How much this theory contributed to the final index (0-100 scale) */
  contribution: number;
}

export interface ConsciousnessIndexResult {
  /** Composite index on a 0-100 scale */
  index: number;
  /** Per-theory contribution breakdown */
  breakdown: TheoryContribution[];
  /** Confidence interval (0-100 scale) */
  confidence: { lower: number; upper: number };
}

const THEORIES: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];

/**
 * Calculate the Consciousness Index composite metric from theory scores.
 *
 * @param theoryScores - Scores per theory (0-1 each)
 * @param options - Aggregation method and optional custom weights
 * @returns ConsciousnessIndexResult with index, breakdown, and confidence
 */
export function calculateConsciousnessIndex(
  theoryScores: TheoryScores,
  options: ConsciousnessIndexOptions = {}
): ConsciousnessIndexResult {
  const { method = "weighted", customWeights } = options;

  // Resolve weights
  const rawWeights: Record<Theory, number> = { ...THEORY_WEIGHTS };
  if (customWeights) {
    for (const [theory, weight] of Object.entries(customWeights) as [Theory, number][]) {
      if (weight !== undefined && THEORIES.includes(theory)) {
        rawWeights[theory] = weight;
      }
    }
  }

  // Normalize weights to sum to 1
  const totalWeight = THEORIES.reduce((sum, t) => sum + rawWeights[t], 0);
  const weights: Record<Theory, number> = {} as Record<Theory, number>;
  for (const t of THEORIES) {
    weights[t] = totalWeight > 0 ? rawWeights[t] / totalWeight : 1 / THEORIES.length;
  }

  const scores = THEORIES.map((t) => theoryScores[t]);

  let index: number;
  let breakdown: TheoryContribution[];

  switch (method) {
    case "mean": {
      const validScores = scores.filter((s) => s >= 0);
      index = validScores.length > 0
        ? (validScores.reduce((a, b) => a + b, 0) / validScores.length) * 100
        : 0;
      breakdown = THEORIES.map((theory) => ({
        theory,
        contribution: (theoryScores[theory] / validScores.length) * 100,
      }));
      break;
    }

    case "geometric": {
      // Geometric mean: (product of scores)^(1/n)
      // Handle zeros by using a small epsilon
      const epsilon = 0.001;
      const adjustedScores = scores.map((s) => Math.max(s, epsilon));
      const logSum = adjustedScores.reduce(
        (sum, s, i) => sum + weights[THEORIES[i]] * Math.log(s),
        0
      );
      index = Math.exp(logSum) * 100;
      breakdown = THEORIES.map((theory, i) => ({
        theory,
        contribution: weights[theory] * Math.log(adjustedScores[i]) / (logSum || 1) * index,
      }));
      break;
    }

    case "weighted":
    default: {
      index = THEORIES.reduce(
        (sum, theory) => sum + theoryScores[theory] * weights[theory] * 100,
        0
      );
      breakdown = THEORIES.map((theory) => ({
        theory,
        contribution: theoryScores[theory] * weights[theory] * 100,
      }));
      break;
    }
  }

  // Clamp index to 0-100
  index = Math.max(0, Math.min(100, round(index)));

  // Round breakdown contributions
  breakdown = breakdown.map((b) => ({
    ...b,
    contribution: round(Math.max(0, b.contribution)),
  }));

  // Compute confidence interval using score variance
  const confidence = computeConfidence(theoryScores, weights, index);

  return { index, breakdown, confidence };
}

/**
 * Compute confidence bounds based on inter-theory variance.
 * More agreement between theories = tighter bounds.
 */
function computeConfidence(
  theoryScores: TheoryScores,
  weights: Record<Theory, number>,
  index: number
): { lower: number; upper: number } {
  const scores = THEORIES.map((t) => theoryScores[t] * 100);
  const n = scores.length;

  if (n < 2) {
    return { lower: Math.max(0, index - 20), upper: Math.min(100, index + 20) };
  }

  // Weighted standard deviation
  const weightedMean = THEORIES.reduce(
    (sum, t) => sum + theoryScores[t] * 100 * weights[t],
    0
  );
  const weightedVariance = THEORIES.reduce(
    (sum, t) => sum + weights[t] * (theoryScores[t] * 100 - weightedMean) ** 2,
    0
  );
  const weightedStdDev = Math.sqrt(weightedVariance);

  // Use 1.645 for ~90% CI (one-sided margin for bounded 0-100)
  const margin = 1.645 * weightedStdDev / Math.sqrt(n);

  return {
    lower: round(Math.max(0, index - margin)),
    upper: round(Math.min(100, index + margin)),
  };
}

function round(n: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}
