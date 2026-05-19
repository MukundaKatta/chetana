/**
 * Statistical power analysis (Issue #471).
 * Effect size (Cohen's d, eta-squared), power calculation,
 * required sample size, power curves, multi-comparison correction
 * (Bonferroni, FDR).
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type EffectSizeMeasure = "cohens_d" | "eta_squared" | "r" | "odds_ratio";

export type CorrectionMethod = "bonferroni" | "holm" | "fdr_bh" | "none";

export interface EffectSizeResult {
  measure: EffectSizeMeasure;
  value: number;
  /** Cohen's conventional interpretation. */
  interpretation: "negligible" | "small" | "medium" | "large";
  /** Confidence interval (lower, upper). */
  ci: [number, number];
}

export interface PowerResult {
  power: number;
  effectSize: number;
  sampleSize: number;
  alpha: number;
  /** Two-tailed or one-tailed. */
  tails: 1 | 2;
}

export interface SampleSizeResult {
  requiredN: number;
  effectSize: number;
  power: number;
  alpha: number;
  tails: 1 | 2;
}

export interface PowerCurvePoint {
  sampleSize: number;
  power: number;
}

export interface MultiComparisonResult {
  originalPValues: number[];
  adjustedPValues: number[];
  rejected: boolean[];
  method: CorrectionMethod;
  alpha: number;
}

/* ------------------------------------------------------------------ */
/*  Normal distribution helpers                                       */
/* ------------------------------------------------------------------ */

/** Rational approximation for the standard normal CDF. */
export function normalCDF(x: number): number {
  if (x === 0) return 0.5;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);

  // Abramowitz & Stegun 7.1.26
  const p = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;

  const t = 1 / (1 + p * absX);
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  const t5 = t4 * t;

  const poly = a1 * t + a2 * t2 + a3 * t3 + a4 * t4 + a5 * t5;
  const phi = poly * Math.exp(-absX * absX / 2);

  return sign < 0 ? phi : 1 - phi;
}

/** Inverse normal CDF (quantile function). */
export function normalQuantile(p: number): number {
  if (p <= 0 || p >= 1) throw new Error("p must be in (0,1)");
  if (p === 0.5) return 0;

  const sign = p < 0.5 ? -1 : 1;
  const q = p < 0.5 ? p : 1 - p;
  const t = Math.sqrt(-2 * Math.log(q));

  const c0 = 2.515517;
  const c1 = 0.802853;
  const c2 = 0.010328;
  const d1 = 1.432788;
  const d2 = 0.189269;
  const d3 = 0.001308;

  const num = c0 + c1 * t + c2 * t * t;
  const den = 1 + d1 * t + d2 * t * t + d3 * t * t * t;

  return sign * (t - num / den);
}

/* ------------------------------------------------------------------ */
/*  Effect size calculations                                          */
/* ------------------------------------------------------------------ */

/** Cohen's d from two groups. */
export function cohensD(
  mean1: number,
  mean2: number,
  sd1: number,
  sd2: number,
  n1: number,
  n2: number,
): EffectSizeResult {
  // Pooled standard deviation
  const sp = Math.sqrt(
    ((n1 - 1) * sd1 * sd1 + (n2 - 1) * sd2 * sd2) / (n1 + n2 - 2),
  );

  const d = sp > 0 ? (mean1 - mean2) / sp : 0;

  // Confidence interval for d (Hedges & Olkin)
  const se = Math.sqrt((n1 + n2) / (n1 * n2) + (d * d) / (2 * (n1 + n2)));
  const z = 1.96; // 95% CI
  const ci: [number, number] = [d - z * se, d + z * se];

  return {
    measure: "cohens_d",
    value: d,
    interpretation: interpretCohensD(Math.abs(d)),
    ci,
  };
}

function interpretCohensD(
  absD: number,
): EffectSizeResult["interpretation"] {
  if (absD < 0.2) return "negligible";
  if (absD < 0.5) return "small";
  if (absD < 0.8) return "medium";
  return "large";
}

/** Eta-squared from ANOVA-style data. */
export function etaSquared(
  ssEffect: number,
  ssTotal: number,
): EffectSizeResult {
  const eta2 = ssTotal > 0 ? ssEffect / ssTotal : 0;

  // Approximate CI using non-central F conversion
  const se = Math.sqrt((4 * eta2 * (1 - eta2) * (1 - eta2)) / 100); // rough
  const ci: [number, number] = [
    Math.max(0, eta2 - 1.96 * se),
    Math.min(1, eta2 + 1.96 * se),
  ];

  return {
    measure: "eta_squared",
    value: eta2,
    interpretation: interpretEtaSquared(eta2),
    ci,
  };
}

function interpretEtaSquared(
  eta2: number,
): EffectSizeResult["interpretation"] {
  if (eta2 < 0.01) return "negligible";
  if (eta2 < 0.06) return "small";
  if (eta2 < 0.14) return "medium";
  return "large";
}

/** Convert between effect size measures. */
export function convertEffectSize(
  value: number,
  from: EffectSizeMeasure,
  to: EffectSizeMeasure,
): number {
  // First convert to Cohen's d
  let d: number;
  switch (from) {
    case "cohens_d":
      d = value;
      break;
    case "r":
      d = (2 * value) / Math.sqrt(1 - value * value);
      break;
    case "eta_squared":
      d = (2 * Math.sqrt(value)) / Math.sqrt(1 - value);
      break;
    case "odds_ratio":
      d = (Math.log(value) * Math.sqrt(3)) / Math.PI;
      break;
    default:
      throw new Error(`Unknown effect size measure: ${from}`);
  }

  // Then convert to target
  switch (to) {
    case "cohens_d":
      return d;
    case "r":
      return d / Math.sqrt(d * d + 4);
    case "eta_squared":
      return (d * d) / (d * d + 4);
    case "odds_ratio":
      return Math.exp((d * Math.PI) / Math.sqrt(3));
    default:
      throw new Error(`Unknown effect size measure: ${to}`);
  }
}

/* ------------------------------------------------------------------ */
/*  Power calculation                                                 */
/* ------------------------------------------------------------------ */

/**
 * Calculate statistical power for a two-sample t-test.
 */
export function calculatePower(
  effectSize: number,
  sampleSize: number,
  alpha: number = 0.05,
  tails: 1 | 2 = 2,
): PowerResult {
  const zAlpha = tails === 2
    ? normalQuantile(1 - alpha / 2)
    : normalQuantile(1 - alpha);

  // Non-centrality parameter
  const ncp = effectSize * Math.sqrt(sampleSize / 2);

  // Power = P(Z > z_alpha - ncp)
  const power = 1 - normalCDF(zAlpha - ncp);

  return {
    power: Math.min(1, Math.max(0, power)),
    effectSize,
    sampleSize,
    alpha,
    tails,
  };
}

/* ------------------------------------------------------------------ */
/*  Required sample size                                              */
/* ------------------------------------------------------------------ */

/**
 * Calculate required sample size per group for desired power.
 */
export function requiredSampleSize(
  effectSize: number,
  power: number = 0.8,
  alpha: number = 0.05,
  tails: 1 | 2 = 2,
): SampleSizeResult {
  if (effectSize <= 0) {
    throw new Error("Effect size must be positive");
  }

  const zAlpha = tails === 2
    ? normalQuantile(1 - alpha / 2)
    : normalQuantile(1 - alpha);
  const zBeta = normalQuantile(power);

  // n = 2 * ((z_alpha + z_beta) / d)^2
  const n = Math.ceil(2 * Math.pow((zAlpha + zBeta) / effectSize, 2));

  return {
    requiredN: n,
    effectSize,
    power,
    alpha,
    tails,
  };
}

/* ------------------------------------------------------------------ */
/*  Power curves                                                      */
/* ------------------------------------------------------------------ */

/**
 * Generate a power curve (power as a function of sample size).
 */
export function powerCurve(
  effectSize: number,
  alpha: number = 0.05,
  tails: 1 | 2 = 2,
  minN: number = 5,
  maxN: number = 500,
  steps: number = 50,
): PowerCurvePoint[] {
  const points: PowerCurvePoint[] = [];
  const stepSize = Math.max(1, Math.floor((maxN - minN) / steps));

  for (let n = minN; n <= maxN; n += stepSize) {
    const result = calculatePower(effectSize, n, alpha, tails);
    points.push({ sampleSize: n, power: result.power });
  }

  return points;
}

/**
 * Generate power curves for multiple effect sizes.
 */
export function powerCurveFamily(
  effectSizes: number[],
  alpha: number = 0.05,
  tails: 1 | 2 = 2,
  minN: number = 5,
  maxN: number = 500,
  steps: number = 50,
): Map<number, PowerCurvePoint[]> {
  const curves = new Map<number, PowerCurvePoint[]>();
  for (const es of effectSizes) {
    curves.set(es, powerCurve(es, alpha, tails, minN, maxN, steps));
  }
  return curves;
}

/* ------------------------------------------------------------------ */
/*  Multiple comparison corrections                                   */
/* ------------------------------------------------------------------ */

/** Bonferroni correction: multiply p-values by number of tests. */
export function bonferroniCorrection(
  pValues: number[],
  alpha: number = 0.05,
): MultiComparisonResult {
  const m = pValues.length;
  const adjusted = pValues.map((p) => Math.min(p * m, 1));
  const rejected = adjusted.map((p) => p < alpha);

  return {
    originalPValues: pValues,
    adjustedPValues: adjusted,
    rejected,
    method: "bonferroni",
    alpha,
  };
}

/** Holm-Bonferroni step-down correction. */
export function holmCorrection(
  pValues: number[],
  alpha: number = 0.05,
): MultiComparisonResult {
  const m = pValues.length;
  const indexed = pValues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);

  const adjusted = new Array(m).fill(0);
  let maxAdj = 0;

  for (let k = 0; k < m; k++) {
    const adj = Math.min(indexed[k].p * (m - k), 1);
    maxAdj = Math.max(maxAdj, adj); // Enforce monotonicity
    adjusted[indexed[k].i] = maxAdj;
  }

  const rejected = adjusted.map((p) => p < alpha);

  return {
    originalPValues: pValues,
    adjustedPValues: adjusted,
    rejected,
    method: "holm",
    alpha,
  };
}

/** Benjamini-Hochberg FDR correction. */
export function fdrCorrection(
  pValues: number[],
  alpha: number = 0.05,
): MultiComparisonResult {
  const m = pValues.length;
  const indexed = pValues
    .map((p, i) => ({ p, i }))
    .sort((a, b) => a.p - b.p);

  const adjusted = new Array(m).fill(0);
  let minAdj = 1;

  // Work backwards to enforce monotonicity
  for (let k = m - 1; k >= 0; k--) {
    const adj = Math.min((indexed[k].p * m) / (k + 1), 1);
    minAdj = Math.min(minAdj, adj);
    adjusted[indexed[k].i] = minAdj;
  }

  const rejected = adjusted.map((p) => p < alpha);

  return {
    originalPValues: pValues,
    adjustedPValues: adjusted,
    rejected,
    method: "fdr_bh",
    alpha,
  };
}

/** Apply a correction method by name. */
export function applyCorrection(
  pValues: number[],
  method: CorrectionMethod,
  alpha: number = 0.05,
): MultiComparisonResult {
  switch (method) {
    case "bonferroni":
      return bonferroniCorrection(pValues, alpha);
    case "holm":
      return holmCorrection(pValues, alpha);
    case "fdr_bh":
      return fdrCorrection(pValues, alpha);
    case "none":
      return {
        originalPValues: pValues,
        adjustedPValues: [...pValues],
        rejected: pValues.map((p) => p < alpha),
        method: "none",
        alpha,
      };
    default:
      throw new Error(`Unknown correction method: ${method}`);
  }
}

/* ------------------------------------------------------------------ */
/*  Convenience: sensitivity analysis                                 */
/* ------------------------------------------------------------------ */

/**
 * What is the minimum detectable effect size given sample size and power?
 */
export function minimumDetectableEffect(
  sampleSize: number,
  power: number = 0.8,
  alpha: number = 0.05,
  tails: 1 | 2 = 2,
): number {
  const zAlpha = tails === 2
    ? normalQuantile(1 - alpha / 2)
    : normalQuantile(1 - alpha);
  const zBeta = normalQuantile(power);

  return (zAlpha + zBeta) * Math.sqrt(2 / sampleSize);
}
