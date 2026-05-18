/**
 * Score rounding utilities for consistent numerical display across the app.
 * Fixes floating-point comparison issues (Issue #282).
 */

/**
 * Rounds a score value to a consistent number of decimal places.
 * Uses the "round half away from zero" strategy to avoid JS floating-point quirks.
 *
 * @param value - The raw score value
 * @param decimals - Number of decimal places (default 4)
 */
export function roundScore(value: number, decimals: number = 4): number {
  if (!Number.isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Compares two score values within an epsilon tolerance.
 * Returns 0 if effectively equal, -1 if a < b, 1 if a > b.
 *
 * @param a - First score
 * @param b - Second score
 * @param epsilon - Tolerance for equality comparison (default 0.0001)
 */
export function compareScores(
  a: number,
  b: number,
  epsilon: number = 0.0001
): -1 | 0 | 1 {
  const diff = a - b;
  if (Math.abs(diff) < epsilon) return 0;
  return diff < 0 ? -1 : 1;
}

/**
 * Formats a score for user-facing display.
 * Scores are 0-1 internally; displayed as percentages with one decimal place.
 *
 * @param value - The raw score (0-1 range)
 */
export function formatScore(value: number): string {
  if (!Number.isFinite(value)) return "0.0%";
  const rounded = roundScore(value * 100, 1);
  return `${rounded.toFixed(1)}%`;
}

/**
 * Clamps a score to the valid [0, 1] range.
 */
export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Computes a weighted average of scores, rounding the result consistently.
 */
export function weightedAverage(
  scores: { value: number; weight: number }[]
): number {
  if (scores.length === 0) return 0;
  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight === 0) return 0;
  const raw = scores.reduce((sum, s) => sum + s.value * s.weight, 0) / totalWeight;
  return roundScore(raw);
}
