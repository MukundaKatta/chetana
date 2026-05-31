/**
 * Power analysis / sample-size calculator (issue #736).
 *
 * Computes the probe count needed to detect a given effect size at a target
 * power, for one-sample and two-sample designs, plus a power curve.
 */

const Z: Record<number, number> = { 0.8: 0.8416, 0.9: 1.2816, 0.95: 1.6449 };

function zAlpha(alpha: number): number {
  // Two-tailed critical value.
  if (alpha <= 0.01) return 2.5758;
  if (alpha <= 0.05) return 1.96;
  if (alpha <= 0.1) return 1.6449;
  return 1.2816;
}

function zPower(power: number): number {
  if (power >= 0.95) return Z[0.95];
  if (power >= 0.9) return Z[0.9];
  return Z[0.8];
}

export interface SampleSizeResult {
  perGroup: number;
  total: number;
}

/**
 * @param effectSize Cohen's d.
 * @param design "one-sample" or "two-sample".
 */
export function requiredSampleSize(
  effectSize: number,
  power = 0.8,
  alpha = 0.05,
  design: "one-sample" | "two-sample" = "two-sample"
): SampleSizeResult {
  const d = Math.abs(effectSize);
  if (d === 0) return { perGroup: Infinity, total: Infinity };
  const base = ((zAlpha(alpha) + zPower(power)) / d) ** 2;
  if (design === "one-sample") {
    const n = Math.ceil(base);
    return { perGroup: n, total: n };
  }
  const perGroup = Math.ceil(2 * base);
  return { perGroup, total: perGroup * 2 };
}

/** Power achieved for a given n (per group) at an effect size and alpha. */
export function powerAt(
  nPerGroup: number,
  effectSize: number,
  alpha = 0.05,
  design: "one-sample" | "two-sample" = "two-sample"
): number {
  const d = Math.abs(effectSize);
  const factor = design === "two-sample" ? nPerGroup / 2 : nPerGroup;
  const zb = d * Math.sqrt(factor) - zAlpha(alpha);
  // Normal CDF approximation.
  const cdf = 0.5 * (1 + erf(zb / Math.SQRT2));
  return Math.round(Math.max(0, Math.min(1, cdf)) * 10000) / 10000;
}

function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

/** Power curve over a range of per-group sample sizes. */
export function powerCurve(
  effectSize: number,
  sizes: number[],
  alpha = 0.05,
  design: "one-sample" | "two-sample" = "two-sample"
): { n: number; power: number }[] {
  return sizes.map((n) => ({ n, power: powerAt(n, effectSize, alpha, design) }));
}
