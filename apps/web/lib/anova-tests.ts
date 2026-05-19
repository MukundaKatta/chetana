/**
 * ANOVA and t-test statistical methods (Issue #519).
 *
 * One-way ANOVA, Tukey HSD / Bonferroni post-hoc tests,
 * independent two-sample t-test, effect size (Cohen's d, eta-squared),
 * and results with p-values and confidence intervals.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface Group {
  name: string;
  values: number[];
}

export interface TTestResult {
  tStatistic: number;
  degreesOfFreedom: number;
  pValue: number;
  meanDifference: number;
  confidenceInterval: { lower: number; upper: number };
  confidenceLevel: number;
  effectSize: number;
  effectSizeLabel: "negligible" | "small" | "medium" | "large";
  significant: boolean;
  group1Mean: number;
  group2Mean: number;
  group1Std: number;
  group2Std: number;
}

export interface AnovaResult {
  fStatistic: number;
  pValue: number;
  degreesOfFreedomBetween: number;
  degreesOfFreedomWithin: number;
  sumOfSquaresBetween: number;
  sumOfSquaresWithin: number;
  sumOfSquaresTotal: number;
  meanSquareBetween: number;
  meanSquareWithin: number;
  etaSquared: number;
  etaSquaredLabel: "negligible" | "small" | "medium" | "large";
  significant: boolean;
  grandMean: number;
  groupMeans: Record<string, number>;
}

export interface PostHocComparison {
  group1: string;
  group2: string;
  meanDifference: number;
  standardError: number;
  testStatistic: number;
  pValue: number;
  confidenceInterval: { lower: number; upper: number };
  significant: boolean;
}

export interface PostHocResult {
  method: "tukey" | "bonferroni";
  comparisons: PostHocComparison[];
  familywiseAlpha: number;
}

/* ------------------------------------------------------------------ */
/*  Helper: basic statistics                                          */
/* ------------------------------------------------------------------ */

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function variance(values: number[], ddof: number = 1): number {
  if (values.length <= ddof) return 0;
  const m = mean(values);
  const ss = values.reduce((acc, v) => acc + (v - m) ** 2, 0);
  return ss / (values.length - ddof);
}

function std(values: number[], ddof: number = 1): number {
  return Math.sqrt(variance(values, ddof));
}

function sumOfSquares(values: number[], ref: number): number {
  return values.reduce((acc, v) => acc + (v - ref) ** 2, 0);
}

/* ------------------------------------------------------------------ */
/*  Helper: approximate p-value from t-distribution                   */
/* ------------------------------------------------------------------ */

/**
 * Approximate the two-tailed p-value of a t-statistic using
 * the regularized incomplete beta function approach.
 * For large df this converges to the normal distribution.
 */
function tDistPValue(t: number, df: number): number {
  // Use approximation: p ≈ 2 * (1 - Phi(|t| * sqrt(df/(df + t^2)) * correction))
  // More accurate: use the beta incomplete function relationship
  const x = df / (df + t * t);
  const p = betaIncomplete(df / 2, 0.5, x);
  return Math.min(1, Math.max(0, p));
}

/**
 * Regularized incomplete beta function via continued fraction approximation.
 */
function betaIncomplete(a: number, b: number, x: number): number {
  if (x < 0 || x > 1) return 0;
  if (x === 0) return 0;
  if (x === 1) return 1;

  // Use the identity: if x < (a+1)/(a+b+2), compute directly, else use 1-I(1-x, b, a)
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - betaIncomplete(b, a, 1 - x);
  }

  const lnBeta = gammaLn(a) + gammaLn(b) - gammaLn(a + b);
  const front = Math.exp(
    Math.log(x) * a + Math.log(1 - x) * b - lnBeta
  ) / a;

  // Lentz's continued fraction
  let f = 1;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  f = d;

  for (let m = 1; m <= 200; m++) {
    // Even step
    let numerator =
      (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 + numerator * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + numerator / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    f *= d * c;

    // Odd step
    numerator =
      -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + numerator * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + numerator / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const delta = d * c;
    f *= delta;
    if (Math.abs(delta - 1) < 1e-10) break;
  }

  return front * f;
}

/**
 * Log-gamma function (Lanczos approximation).
 */
function gammaLn(z: number): number {
  const g = 7;
  const coef = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return (
      Math.log(Math.PI / Math.sin(Math.PI * z)) - gammaLn(1 - z)
    );
  }
  z -= 1;
  let x = coef[0];
  for (let i = 1; i < g + 2; i++) {
    x += coef[i] / (z + i);
  }
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/**
 * Approximate the two-tailed p-value from an F-distribution.
 */
function fDistPValue(f: number, df1: number, df2: number): number {
  if (f <= 0) return 1;
  const x = df2 / (df2 + df1 * f);
  return betaIncomplete(df2 / 2, df1 / 2, x);
}

/**
 * Critical value of the t-distribution (two-tailed) via bisection.
 */
function tCritical(df: number, alpha: number = 0.05): number {
  let lo = 0;
  let hi = 50;
  const target = alpha;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (tDistPValue(mid, df) < target) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

/* ------------------------------------------------------------------ */
/*  Effect size helpers                                               */
/* ------------------------------------------------------------------ */

function cohensDLabel(
  d: number
): "negligible" | "small" | "medium" | "large" {
  const abs = Math.abs(d);
  if (abs < 0.2) return "negligible";
  if (abs < 0.5) return "small";
  if (abs < 0.8) return "medium";
  return "large";
}

function etaSquaredLabel(
  eta2: number
): "negligible" | "small" | "medium" | "large" {
  if (eta2 < 0.01) return "negligible";
  if (eta2 < 0.06) return "small";
  if (eta2 < 0.14) return "medium";
  return "large";
}

/* ------------------------------------------------------------------ */
/*  Independent two-sample t-test (Welch's)                           */
/* ------------------------------------------------------------------ */

/**
 * Perform Welch's independent two-sample t-test.
 */
export function independentTTest(
  group1: number[],
  group2: number[],
  alpha: number = 0.05
): TTestResult {
  if (group1.length < 2 || group2.length < 2) {
    throw new Error("Each group must have at least 2 observations");
  }

  const n1 = group1.length;
  const n2 = group2.length;
  const m1 = mean(group1);
  const m2 = mean(group2);
  const v1 = variance(group1);
  const v2 = variance(group2);
  const s1 = std(group1);
  const s2 = std(group2);

  const se = Math.sqrt(v1 / n1 + v2 / n2);
  const tStat = (m1 - m2) / se;

  // Welch-Satterthwaite degrees of freedom
  const dfNum = (v1 / n1 + v2 / n2) ** 2;
  const dfDen =
    (v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1);
  const df = dfNum / dfDen;

  const pValue = tDistPValue(tStat, df);

  // Cohen's d using pooled standard deviation
  const pooledStd = Math.sqrt(
    ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2)
  );
  const cohensD = pooledStd > 0 ? (m1 - m2) / pooledStd : 0;

  // Confidence interval for the difference
  const tCrit = tCritical(df, alpha);
  const marginOfError = tCrit * se;

  return {
    tStatistic: tStat,
    degreesOfFreedom: df,
    pValue,
    meanDifference: m1 - m2,
    confidenceInterval: {
      lower: m1 - m2 - marginOfError,
      upper: m1 - m2 + marginOfError,
    },
    confidenceLevel: (1 - alpha) * 100,
    effectSize: cohensD,
    effectSizeLabel: cohensDLabel(cohensD),
    significant: pValue < alpha,
    group1Mean: m1,
    group2Mean: m2,
    group1Std: s1,
    group2Std: s2,
  };
}

/* ------------------------------------------------------------------ */
/*  One-way ANOVA                                                     */
/* ------------------------------------------------------------------ */

/**
 * Perform one-way ANOVA across multiple groups.
 */
export function oneWayAnova(
  groups: Group[],
  alpha: number = 0.05
): AnovaResult {
  if (groups.length < 2) {
    throw new Error("ANOVA requires at least 2 groups");
  }

  const allValues: number[] = [];
  const groupMeans: Record<string, number> = {};

  for (const g of groups) {
    if (g.values.length < 1) {
      throw new Error(`Group "${g.name}" must have at least 1 observation`);
    }
    allValues.push(...g.values);
    groupMeans[g.name] = mean(g.values);
  }

  const grandMean = mean(allValues);
  const N = allValues.length;
  const k = groups.length;

  // Sum of squares between groups
  let ssBetween = 0;
  for (const g of groups) {
    ssBetween += g.values.length * (mean(g.values) - grandMean) ** 2;
  }

  // Sum of squares within groups
  let ssWithin = 0;
  for (const g of groups) {
    const gMean = mean(g.values);
    ssWithin += sumOfSquares(g.values, gMean);
  }

  const ssTotal = ssBetween + ssWithin;
  const dfBetween = k - 1;
  const dfWithin = N - k;
  const msBetween = ssBetween / dfBetween;
  const msWithin = dfWithin > 0 ? ssWithin / dfWithin : 0;
  const fStat = msWithin > 0 ? msBetween / msWithin : Infinity;
  const pValue = fDistPValue(fStat, dfBetween, dfWithin);
  const eta2 = ssTotal > 0 ? ssBetween / ssTotal : 0;

  return {
    fStatistic: fStat,
    pValue,
    degreesOfFreedomBetween: dfBetween,
    degreesOfFreedomWithin: dfWithin,
    sumOfSquaresBetween: ssBetween,
    sumOfSquaresWithin: ssWithin,
    sumOfSquaresTotal: ssTotal,
    meanSquareBetween: msBetween,
    meanSquareWithin: msWithin,
    etaSquared: eta2,
    etaSquaredLabel: etaSquaredLabel(eta2),
    significant: pValue < alpha,
    grandMean,
    groupMeans,
  };
}

/* ------------------------------------------------------------------ */
/*  Post-hoc: Tukey HSD                                               */
/* ------------------------------------------------------------------ */

/**
 * Tukey HSD post-hoc test following a significant ANOVA.
 *
 * Uses the Studentized Range distribution approximation.
 */
export function tukeyHSD(
  groups: Group[],
  anovaResult: AnovaResult,
  alpha: number = 0.05
): PostHocResult {
  const comparisons: PostHocComparison[] = [];
  const msw = anovaResult.meanSquareWithin;
  const dfWithin = anovaResult.degreesOfFreedomWithin;

  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      const g1 = groups[i];
      const g2 = groups[j];
      const m1 = mean(g1.values);
      const m2 = mean(g2.values);
      const diff = m1 - m2;

      const se = Math.sqrt(msw * (1 / g1.values.length + 1 / g2.values.length) / 2);
      const q = Math.abs(diff) / se;

      // Approximate p-value: convert q to t-like statistic
      // q = t * sqrt(2), so t = q / sqrt(2)
      const tEquiv = q / Math.sqrt(2);
      const rawP = tDistPValue(tEquiv, dfWithin);
      // Adjust for number of comparisons
      const numComparisons = (groups.length * (groups.length - 1)) / 2;
      const pValue = Math.min(1, rawP * numComparisons);

      // CI using critical t-value
      const tCrit = tCritical(dfWithin, alpha / numComparisons);
      const margin = tCrit * se * Math.sqrt(2);

      comparisons.push({
        group1: g1.name,
        group2: g2.name,
        meanDifference: diff,
        standardError: se,
        testStatistic: q,
        pValue,
        confidenceInterval: { lower: diff - margin, upper: diff + margin },
        significant: pValue < alpha,
      });
    }
  }

  return { method: "tukey", comparisons, familywiseAlpha: alpha };
}

/* ------------------------------------------------------------------ */
/*  Post-hoc: Bonferroni                                              */
/* ------------------------------------------------------------------ */

/**
 * Bonferroni-corrected pairwise t-tests following a significant ANOVA.
 */
export function bonferroniPostHoc(
  groups: Group[],
  alpha: number = 0.05
): PostHocResult {
  const numComparisons = (groups.length * (groups.length - 1)) / 2;
  const adjustedAlpha = alpha / numComparisons;
  const comparisons: PostHocComparison[] = [];

  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      const result = independentTTest(groups[i].values, groups[j].values, adjustedAlpha);
      const adjustedP = Math.min(1, result.pValue * numComparisons);

      comparisons.push({
        group1: groups[i].name,
        group2: groups[j].name,
        meanDifference: result.meanDifference,
        standardError: Math.sqrt(
          variance(groups[i].values) / groups[i].values.length +
            variance(groups[j].values) / groups[j].values.length
        ),
        testStatistic: result.tStatistic,
        pValue: adjustedP,
        confidenceInterval: result.confidenceInterval,
        significant: adjustedP < alpha,
      });
    }
  }

  return { method: "bonferroni", comparisons, familywiseAlpha: alpha };
}
