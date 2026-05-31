/**
 * Convergent/discriminant validity (issue #738).
 *
 * From a per-model indicator-score matrix, computes inter-indicator
 * correlations and summarizes convergent (within-theory) vs discriminant
 * (cross-theory) validity, flagging poorly-behaved indicators.
 */

function round(n: number, d = 4): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function pearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - mx) * (y[i] - my);
    dx += (x[i] - mx) ** 2;
    dy += (y[i] - my) ** 2;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}

export interface ValidityInput {
  /** indicatorScores[indicatorId] = scores across models. */
  indicatorScores: Record<string, number[]>;
  /** theoryOf[indicatorId] = theory id. */
  theoryOf: Record<string, string>;
}

export interface ValidityResult {
  /** Mean within-theory correlation (higher = better convergent validity). */
  convergent: number;
  /** Mean cross-theory correlation (lower = better discriminant validity). */
  discriminant: number;
  /** True if convergent clearly exceeds discriminant. */
  validityHolds: boolean;
  /** Indicators whose mean cross-theory correlation exceeds within-theory. */
  flagged: string[];
}

export function assessValidity(input: ValidityInput): ValidityResult {
  const ids = Object.keys(input.indicatorScores);
  const within: number[] = [];
  const cross: number[] = [];
  const perIndicatorWithin: Record<string, number[]> = {};
  const perIndicatorCross: Record<string, number[]> = {};

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i], b = ids[j];
      const r = pearson(input.indicatorScores[a], input.indicatorScores[b]);
      const sameTheory = input.theoryOf[a] === input.theoryOf[b];
      (sameTheory ? within : cross).push(r);
      for (const id of [a, b]) {
        const bucket = sameTheory ? perIndicatorWithin : perIndicatorCross;
        (bucket[id] ??= []).push(r);
      }
    }
  }

  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const convergent = round(mean(within));
  const discriminant = round(mean(cross));

  const flagged = ids.filter((id) => {
    const w = mean(perIndicatorWithin[id] ?? []);
    const c = mean(perIndicatorCross[id] ?? []);
    return (perIndicatorWithin[id]?.length ?? 0) > 0 && c > w;
  });

  return { convergent, discriminant, validityHolds: convergent > discriminant, flagged };
}
