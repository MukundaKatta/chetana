/**
 * Position / order bias mitigation in judge scoring (issue #614).
 *
 * Position bias in LLM-as-judge is well documented by 2026. For comparison
 * tasks this re-scores with swapped order and averages; it also estimates the
 * residual bias so it can be reported per audit.
 */

export interface PairwiseJudgement {
  /** Judge preference in [0,1] for option A when A is presented first. */
  aFirst: number;
  /** Judge preference in [0,1] for option A when A is presented second. */
  aSecond: number;
}

export interface DebiasedJudgement {
  /** Order-averaged preference for A in [0,1]. */
  preference: number;
  /** Estimated position bias toward the first-presented option. */
  positionBias: number;
}

function round(n: number, d = 4): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

/**
 * Average the two orderings to cancel first-position advantage, and estimate
 * the bias as the asymmetry between orderings.
 */
export function debiasPairwise(j: PairwiseJudgement): DebiasedJudgement {
  const preference = (j.aFirst + j.aSecond) / 2;
  // If A is favored more when first than when second, that gap reflects a
  // first-position advantage.
  const positionBias = (j.aFirst - j.aSecond) / 2;
  return { preference: round(preference), positionBias: round(positionBias) };
}

/** Mean absolute position bias across a set of order-swapped judgements. */
export function estimatePositionBias(judgements: PairwiseJudgement[]): number {
  if (judgements.length === 0) return 0;
  const total = judgements.reduce(
    (s, j) => s + Math.abs(debiasPairwise(j).positionBias),
    0
  );
  return round(total / judgements.length);
}

/**
 * Deterministic presentation-order shuffle keyed by a seed so randomized
 * ordering is reproducible across runs.
 */
export function seededOrder(n: number, seed: number): number[] {
  const idx = Array.from({ length: n }, (_, i) => i);
  let s = seed >>> 0 || 1;
  const rand = () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}
