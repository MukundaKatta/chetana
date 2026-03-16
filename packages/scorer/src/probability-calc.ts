import type { TheoryScores, Theory } from "@chetana/shared";
import { THEORY_WEIGHTS } from "@chetana/shared";

/**
 * Calculate overall consciousness probability using Bayesian-weighted aggregation.
 *
 * The weighting reflects empirical support for each theory:
 * - GWT and PP get higher weight (more empirical support)
 * - IIT and AST get lower weight (more speculative)
 */
export function calculateOverallProbability(
  theoryScores: TheoryScores
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const theory of Object.keys(THEORY_WEIGHTS) as Theory[]) {
    const weight = THEORY_WEIGHTS[theory];
    const score = theoryScores[theory] || 0;
    weightedSum += score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Calculate uncertainty bounds using bootstrap-like estimation.
 * Returns lower and upper bounds representing a 90% credible interval.
 */
export function calculateUncertaintyBounds(
  theoryScores: TheoryScores,
  probeCount: number
): { lower: number; upper: number } {
  const overall = calculateOverallProbability(theoryScores);

  // Uncertainty decreases with more probes (sqrt scaling)
  const baseUncertainty = 0.2;
  const uncertainty = baseUncertainty / Math.sqrt(Math.max(probeCount / 10, 1));

  // Increase uncertainty when theories disagree
  const scores = Object.values(theoryScores).filter((s) => s > 0);
  const mean = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
  const variance =
    scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / (scores.length || 1);
  const disagreementBonus = Math.sqrt(variance) * 0.3;

  const totalUncertainty = Math.min(uncertainty + disagreementBonus, 0.3);

  return {
    lower: Math.max(0, overall - totalUncertainty),
    upper: Math.min(1, overall + totalUncertainty),
  };
}
