/**
 * Non-parametric statistical tests (Issue #539).
 * Mann-Whitney U, Kruskal-Wallis, rank-biserial effect size,
 * Dunn's post-hoc, and interpretation helpers.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface MannWhitneyResult {
  U: number;
  z: number;
  pValue: number;
  n1: number;
  n2: number;
  /** Rank-biserial correlation effect size. */
  effectSize: number;
  interpretation: string;
}

export interface KruskalWallisResult {
  H: number;
  df: number;
  pValue: number;
  groupSizes: number[];
  interpretation: string;
}

export interface DunnPostHocPair {
  groupA: number;
  groupB: number;
  z: number;
  pValue: number;
  pAdjusted: number;
  significant: boolean;
}

export interface DunnPostHocResult {
  pairs: DunnPostHocPair[];
  alpha: number;
  method: "bonferroni";
}

export interface EffectSizeResult {
  value: number;
  magnitude: "negligible" | "small" | "medium" | "large";
  interpretation: string;
}

/* ------------------------------------------------------------------ */
/*  Ranking helpers                                                   */
/* ------------------------------------------------------------------ */

interface RankedValue {
  value: number;
  originalIndex: number;
  group: number;
  rank: number;
}

function assignRanks(values: Array<{ value: number; group: number }>): RankedValue[] {
  const sorted = values
    .map((v, i) => ({ ...v, originalIndex: i, rank: 0 }))
    .sort((a, b) => a.value - b.value);

  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j < sorted.length && sorted[j].value === sorted[i].value) {
      j++;
    }
    // Average rank for ties
    const avgRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) {
      sorted[k].rank = avgRank;
    }
    i = j;
  }

  return sorted;
}

/* ------------------------------------------------------------------ */
/*  Normal approximation helpers                                      */
/* ------------------------------------------------------------------ */

/** Standard normal CDF (Abramowitz & Stegun approximation). */
function normalCdf(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

/** Two-tailed p-value from z. */
function twoTailedP(z: number): number {
  return 2 * (1 - normalCdf(Math.abs(z)));
}

/** Chi-squared CDF approximation (Wilson-Hilferty for df >= 1). */
function chiSquaredCdf(x: number, df: number): number {
  if (x <= 0) return 0;
  if (df === 0) return x > 0 ? 1 : 0;
  // Wilson-Hilferty approximation
  const z = Math.pow(x / df, 1 / 3) - (1 - 2 / (9 * df));
  const denom = Math.sqrt(2 / (9 * df));
  return normalCdf(z / denom);
}

function chiSquaredPValue(x: number, df: number): number {
  return 1 - chiSquaredCdf(x, df);
}

/* ------------------------------------------------------------------ */
/*  Mann-Whitney U Test                                               */
/* ------------------------------------------------------------------ */

export function mannWhitneyU(
  sample1: number[],
  sample2: number[]
): MannWhitneyResult {
  if (sample1.length === 0 || sample2.length === 0) {
    throw new Error("Both samples must be non-empty");
  }

  const n1 = sample1.length;
  const n2 = sample2.length;

  const combined = [
    ...sample1.map((v) => ({ value: v, group: 0 })),
    ...sample2.map((v) => ({ value: v, group: 1 })),
  ];

  const ranked = assignRanks(combined);

  const R1 = ranked.filter((r) => r.group === 0).reduce((sum, r) => sum + r.rank, 0);

  const U1 = R1 - (n1 * (n1 + 1)) / 2;
  const U2 = n1 * n2 - U1;
  const U = Math.min(U1, U2);

  // Normal approximation
  const meanU = (n1 * n2) / 2;
  const stdU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  const z = stdU === 0 ? 0 : (U1 - meanU) / stdU;
  const pValue = twoTailedP(z);

  // Rank-biserial effect size
  const effectSize = 1 - (2 * U) / (n1 * n2);

  const interpretation = interpretEffectSize(effectSize).interpretation;

  return { U, z, pValue, n1, n2, effectSize, interpretation };
}

/* ------------------------------------------------------------------ */
/*  Kruskal-Wallis Test                                               */
/* ------------------------------------------------------------------ */

export function kruskalWallis(groups: number[][]): KruskalWallisResult {
  if (groups.length < 2) {
    throw new Error("Kruskal-Wallis requires at least 2 groups");
  }

  const combined: Array<{ value: number; group: number }> = [];
  for (let g = 0; g < groups.length; g++) {
    if (groups[g].length === 0) {
      throw new Error(`Group ${g} is empty`);
    }
    for (const v of groups[g]) {
      combined.push({ value: v, group: g });
    }
  }

  const N = combined.length;
  const ranked = assignRanks(combined);

  // Sum of ranks per group
  const rankSums: number[] = new Array(groups.length).fill(0);
  for (const r of ranked) {
    rankSums[r.group] += r.rank;
  }

  // H statistic
  let H = 0;
  for (let g = 0; g < groups.length; g++) {
    const ng = groups[g].length;
    const meanRank = rankSums[g] / ng;
    H += ng * Math.pow(meanRank - (N + 1) / 2, 2);
  }
  H = (12 / (N * (N + 1))) * H;

  // Tie correction
  const valueCounts = new Map<number, number>();
  for (const r of ranked) {
    valueCounts.set(r.value, (valueCounts.get(r.value) ?? 0) + 1);
  }
  let tieCorrection = 0;
  for (const count of valueCounts.values()) {
    if (count > 1) {
      tieCorrection += Math.pow(count, 3) - count;
    }
  }
  const correctionFactor = 1 - tieCorrection / (Math.pow(N, 3) - N);
  if (correctionFactor > 0) {
    H = H / correctionFactor;
  }

  const df = groups.length - 1;
  const pValue = chiSquaredPValue(H, df);

  const interpretation =
    pValue < 0.001
      ? "Very strong evidence of differences between groups (p < 0.001)"
      : pValue < 0.01
        ? "Strong evidence of differences between groups (p < 0.01)"
        : pValue < 0.05
          ? "Evidence of differences between groups (p < 0.05)"
          : "No significant differences between groups (p >= 0.05)";

  return {
    H,
    df,
    pValue,
    groupSizes: groups.map((g) => g.length),
    interpretation,
  };
}

/* ------------------------------------------------------------------ */
/*  Dunn's Post-Hoc Test                                              */
/* ------------------------------------------------------------------ */

export function dunnPostHoc(
  groups: number[][],
  alpha: number = 0.05
): DunnPostHocResult {
  if (groups.length < 2) {
    throw new Error("Dunn's test requires at least 2 groups");
  }

  const combined: Array<{ value: number; group: number }> = [];
  for (let g = 0; g < groups.length; g++) {
    for (const v of groups[g]) {
      combined.push({ value: v, group: g });
    }
  }

  const N = combined.length;
  const ranked = assignRanks(combined);

  // Mean rank per group
  const groupRankSums: number[] = new Array(groups.length).fill(0);
  const groupCounts: number[] = groups.map((g) => g.length);
  for (const r of ranked) {
    groupRankSums[r.group] += r.rank;
  }
  const groupMeanRanks = groupRankSums.map((s, i) => s / groupCounts[i]);

  // Tie correction for variance
  const valueCounts = new Map<number, number>();
  for (const r of ranked) {
    valueCounts.set(r.value, (valueCounts.get(r.value) ?? 0) + 1);
  }
  let tieSum = 0;
  for (const count of valueCounts.values()) {
    tieSum += Math.pow(count, 3) - count;
  }

  const variance = (N * (N + 1)) / 12 - tieSum / (12 * (N - 1));

  const pairs: DunnPostHocPair[] = [];
  const numComparisons = (groups.length * (groups.length - 1)) / 2;

  for (let a = 0; a < groups.length; a++) {
    for (let b = a + 1; b < groups.length; b++) {
      const diff = Math.abs(groupMeanRanks[a] - groupMeanRanks[b]);
      const se = Math.sqrt(variance * (1 / groupCounts[a] + 1 / groupCounts[b]));
      const z = se === 0 ? 0 : diff / se;
      const pValue = twoTailedP(z);
      const pAdjusted = Math.min(pValue * numComparisons, 1); // Bonferroni

      pairs.push({
        groupA: a,
        groupB: b,
        z,
        pValue,
        pAdjusted,
        significant: pAdjusted < alpha,
      });
    }
  }

  return { pairs, alpha, method: "bonferroni" };
}

/* ------------------------------------------------------------------ */
/*  Rank-Biserial Effect Size                                         */
/* ------------------------------------------------------------------ */

export function rankBiserialEffectSize(
  sample1: number[],
  sample2: number[]
): EffectSizeResult {
  const result = mannWhitneyU(sample1, sample2);
  return interpretEffectSize(result.effectSize);
}

/* ------------------------------------------------------------------ */
/*  Interpretation Helpers                                            */
/* ------------------------------------------------------------------ */

export function interpretEffectSize(r: number): EffectSizeResult {
  const abs = Math.abs(r);
  let magnitude: EffectSizeResult["magnitude"];
  if (abs < 0.1) magnitude = "negligible";
  else if (abs < 0.3) magnitude = "small";
  else if (abs < 0.5) magnitude = "medium";
  else magnitude = "large";

  const direction = r >= 0 ? "positive" : "negative";

  const interpretation =
    magnitude === "negligible"
      ? `Negligible ${direction} effect (r = ${r.toFixed(3)}). The two groups are nearly indistinguishable.`
      : magnitude === "small"
        ? `Small ${direction} effect (r = ${r.toFixed(3)}). A minor practical difference between groups.`
        : magnitude === "medium"
          ? `Medium ${direction} effect (r = ${r.toFixed(3)}). A moderately meaningful difference between groups.`
          : `Large ${direction} effect (r = ${r.toFixed(3)}). A substantial and practically important difference.`;

  return { value: r, magnitude, interpretation };
}

export function interpretPValue(p: number, alpha: number = 0.05): string {
  if (p < 0.001) return `Highly significant (p = ${p.toExponential(2)}, p < 0.001)`;
  if (p < 0.01) return `Very significant (p = ${p.toFixed(4)}, p < 0.01)`;
  if (p < alpha) return `Significant (p = ${p.toFixed(4)}, p < ${alpha})`;
  return `Not significant (p = ${p.toFixed(4)}, p >= ${alpha})`;
}

export function recommendTest(params: {
  numGroups: number;
  paired: boolean;
  normalDistribution: boolean;
}): string {
  const { numGroups, paired, normalDistribution } = params;

  if (numGroups === 2) {
    if (normalDistribution) {
      return paired ? "Paired t-test" : "Independent samples t-test";
    }
    return paired ? "Wilcoxon signed-rank test" : "Mann-Whitney U test";
  }

  if (numGroups > 2) {
    if (normalDistribution) {
      return paired ? "Repeated measures ANOVA" : "One-way ANOVA";
    }
    return paired ? "Friedman test" : "Kruskal-Wallis test with Dunn's post-hoc";
  }

  return "Descriptive statistics only";
}
