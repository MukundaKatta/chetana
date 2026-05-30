/**
 * Per-theory uncertainty weighting in aggregation (issue #607).
 *
 * 2026 probabilistic frameworks favour uncertainty-aware aggregation over fixed
 * theory weights. This blends each theory's score by both its configured weight
 * and a confidence term, and propagates the resulting uncertainty to the
 * overall probability.
 */

import type { Theory, TheoryScores } from "@chetana/shared";

export interface TheoryConfidence {
  theory: Theory;
  score: number; // 0-1
  confidence: number; // 0-1, how much we trust this theory's score here
  weight: number; // configured theory weight (e.g. from THEORY_WEIGHTS)
}

export interface UncertaintyWeightedResult {
  /** Fixed-weight aggregate, for comparison. */
  fixed: number;
  /** Confidence-adjusted aggregate. */
  weighted: number;
  /** Propagated standard deviation of the overall estimate. */
  uncertainty: number;
}

function round(n: number, d = 4): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export function uncertaintyWeightedAggregate(
  inputs: TheoryConfidence[]
): UncertaintyWeightedResult {
  if (inputs.length === 0) return { fixed: 0, weighted: 0, uncertainty: 0 };

  // Fixed-weight aggregate.
  const fixedWeightTotal = inputs.reduce((s, t) => s + t.weight, 0);
  const fixed =
    fixedWeightTotal === 0
      ? 0
      : inputs.reduce((s, t) => s + t.score * t.weight, 0) / fixedWeightTotal;

  // Confidence-adjusted weights.
  const adjWeights = inputs.map((t) => t.weight * t.confidence);
  const adjTotal = adjWeights.reduce((a, b) => a + b, 0);
  const weighted =
    adjTotal === 0
      ? fixed
      : inputs.reduce((s, t, i) => s + t.score * adjWeights[i], 0) / adjTotal;

  // Propagate uncertainty: each theory contributes variance ~ (1 - confidence),
  // combined through its normalized adjusted weight.
  let varianceSum = 0;
  for (let i = 0; i < inputs.length; i++) {
    const w = adjTotal === 0 ? 0 : adjWeights[i] / adjTotal;
    const theoryVar = (1 - inputs[i].confidence) * 0.25; // max var of a [0,1] var
    varianceSum += w * w * theoryVar;
  }

  return {
    fixed: round(fixed),
    weighted: round(weighted),
    uncertainty: round(Math.sqrt(varianceSum)),
  };
}

/** Convenience: build inputs from TheoryScores plus confidence/weight maps. */
export function fromTheoryScores(
  scores: TheoryScores,
  confidence: Record<Theory, number>,
  weights: Record<Theory, number>
): TheoryConfidence[] {
  const theories = Object.keys(scores) as Theory[];
  return theories.map((theory) => ({
    theory,
    score: scores[theory],
    confidence: confidence[theory] ?? 1,
    weight: weights[theory] ?? 0,
  }));
}
