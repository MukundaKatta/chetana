/**
 * Inter-rater reliability — Krippendorff's alpha (issue #606).
 *
 * Computes Krippendorff's alpha for interval data across judges/runs, with
 * graceful handling of missing ratings. Reliability statistics are a 2026
 * expectation for defensible model-graded evaluation.
 */

export interface ReliabilityResult {
  alpha: number;
  observedDisagreement: number;
  expectedDisagreement: number;
  units: number;
  raters: number;
}

function round(n: number, d = 4): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

/**
 * Krippendorff's alpha for interval data.
 * @param ratings ratings[unit][rater] — use `null` for a missing rating.
 */
export function krippendorffAlpha(ratings: (number | null)[][]): ReliabilityResult {
  const units = ratings.length;
  const raters = units > 0 ? ratings[0].length : 0;

  // Flatten to (unit, value) and count pairable units.
  const values: number[] = [];
  const perUnit: number[][] = [];
  for (const row of ratings) {
    const present = row.filter((v): v is number => v !== null && v !== undefined);
    perUnit.push(present);
    values.push(...present);
  }

  const totalPairableValues = perUnit.reduce(
    (s, u) => s + (u.length >= 2 ? u.length : 0),
    0
  );
  if (totalPairableValues < 2) {
    return { alpha: 1, observedDisagreement: 0, expectedDisagreement: 0, units, raters };
  }

  // Observed disagreement: average within-unit squared difference, weighted by
  // pairs available in each unit.
  let observedNum = 0;
  let observedPairs = 0;
  for (const u of perUnit) {
    const m = u.length;
    if (m < 2) continue;
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        if (i === j) continue;
        observedNum += (u[i] - u[j]) ** 2;
      }
    }
    observedPairs += m * (m - 1);
  }
  const observed = observedPairs === 0 ? 0 : observedNum / observedPairs;

  // Expected disagreement: average squared difference over all value pairs.
  let expectedNum = 0;
  const N = values.length;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (i === j) continue;
      expectedNum += (values[i] - values[j]) ** 2;
    }
  }
  const expected = N < 2 ? 0 : expectedNum / (N * (N - 1));

  const alpha = expected === 0 ? 1 : 1 - observed / expected;
  return {
    alpha: round(alpha),
    observedDisagreement: round(observed),
    expectedDisagreement: round(expected),
    units,
    raters,
  };
}

/** Qualitative interpretation of an alpha value. */
export function interpretAlpha(alpha: number): "reliable" | "tentative" | "unreliable" {
  if (alpha >= 0.8) return "reliable";
  if (alpha >= 0.667) return "tentative";
  return "unreliable";
}
