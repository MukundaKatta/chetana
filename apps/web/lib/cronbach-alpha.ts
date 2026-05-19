/**
 * Cronbach's alpha: alpha per probe set, item-total correlation,
 * alpha-if-deleted, confidence intervals, improvement recommendations
 * (Issue #511).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProbeScoreSet {
  probeId: string;
  probeName: string;
  /** One score per observation (audit). */
  scores: number[];
}

export interface ItemTotalCorrelation {
  probeId: string;
  probeName: string;
  correlation: number;
  /** Interpretation label. */
  quality: "excellent" | "good" | "acceptable" | "poor" | "drop";
}

export interface AlphaIfDeleted {
  probeId: string;
  probeName: string;
  alphaWithout: number;
  /** Delta from original alpha (positive = removing helps). */
  delta: number;
  recommendation: "keep" | "consider_removing" | "remove";
}

export interface CronbachAlphaResult {
  alpha: number;
  standardizedAlpha: number;
  n: number; // number of items (probes)
  k: number; // number of observations (audits)
  itemTotalCorrelations: ItemTotalCorrelation[];
  alphaIfDeleted: AlphaIfDeleted[];
  confidenceInterval: {
    lower: number;
    upper: number;
    confidence: number;
  };
  interpretation: string;
  recommendations: string[];
}

export interface MultiSetResult {
  setName: string;
  result: CronbachAlphaResult;
}

// ---------------------------------------------------------------------------
// Statistical helpers
// ---------------------------------------------------------------------------

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function variance(xs: number[], ddof = 1): number {
  if (xs.length <= ddof) return 0;
  const m = mean(xs);
  return xs.reduce((sum, x) => sum + (x - m) ** 2, 0) / (xs.length - ddof);
}

function covariance(xs: number[], ys: number[], ddof = 1): number {
  if (xs.length !== ys.length || xs.length <= ddof) return 0;
  const mx = mean(xs);
  const my = mean(ys);
  return xs.reduce((sum, x, i) => sum + (x - mx) * (ys[i] - my), 0) / (xs.length - ddof);
}

function pearsonR(xs: number[], ys: number[]): number {
  const sx = Math.sqrt(variance(xs));
  const sy = Math.sqrt(variance(ys));
  if (sx === 0 || sy === 0) return 0;
  return covariance(xs, ys) / (sx * sy);
}

// ---------------------------------------------------------------------------
// Core Cronbach's alpha computation
// ---------------------------------------------------------------------------

/**
 * Computes Cronbach's alpha from raw item scores.
 *
 * alpha = (k / (k-1)) * (1 - sum(itemVariances) / totalVariance)
 */
function computeRawAlpha(items: number[][]): number {
  const k = items.length;
  if (k < 2) return 0;
  const n = items[0].length;
  if (n < 2) return 0;

  // Item variances
  const itemVariances = items.map((scores) => variance(scores));
  const sumItemVar = itemVariances.reduce((a, b) => a + b, 0);

  // Total scores per observation
  const totals: number[] = [];
  for (let j = 0; j < n; j++) {
    let total = 0;
    for (let i = 0; i < k; i++) total += items[i][j];
    totals.push(total);
  }
  const totalVar = variance(totals);

  if (totalVar === 0) return 0;
  return (k / (k - 1)) * (1 - sumItemVar / totalVar);
}

/**
 * Standardized alpha using average inter-item correlation.
 */
function computeStandardizedAlpha(items: number[][]): number {
  const k = items.length;
  if (k < 2) return 0;

  let rSum = 0;
  let rCount = 0;
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      rSum += pearsonR(items[i], items[j]);
      rCount++;
    }
  }

  const rBar = rCount > 0 ? rSum / rCount : 0;
  if (1 + (k - 1) * rBar === 0) return 0;
  return (k * rBar) / (1 + (k - 1) * rBar);
}

// ---------------------------------------------------------------------------
// Item-total correlation
// ---------------------------------------------------------------------------

function computeItemTotalCorrelations(
  items: number[][]
): ItemTotalCorrelation[] {
  const k = items.length;
  const n = items[0]?.length ?? 0;
  if (k < 2 || n < 2) return [];

  return items.map((itemScores, idx) => {
    // Corrected item-total: correlate item with total EXCLUDING that item
    const restTotals: number[] = [];
    for (let j = 0; j < n; j++) {
      let total = 0;
      for (let i = 0; i < k; i++) {
        if (i !== idx) total += items[i][j];
      }
      restTotals.push(total);
    }

    const r = pearsonR(itemScores, restTotals);

    let quality: ItemTotalCorrelation["quality"];
    if (r >= 0.6) quality = "excellent";
    else if (r >= 0.4) quality = "good";
    else if (r >= 0.3) quality = "acceptable";
    else if (r >= 0.2) quality = "poor";
    else quality = "drop";

    return {
      probeId: "", // filled in by caller
      probeName: "", // filled in by caller
      correlation: r,
      quality,
    };
  });
}

// ---------------------------------------------------------------------------
// Alpha-if-deleted
// ---------------------------------------------------------------------------

function computeAlphaIfDeleted(
  items: number[][],
  originalAlpha: number
): AlphaIfDeleted[] {
  return items.map((_, idx) => {
    const remaining = items.filter((_, i) => i !== idx);
    const alphaWithout = remaining.length >= 2 ? computeRawAlpha(remaining) : 0;
    const delta = alphaWithout - originalAlpha;
    let recommendation: AlphaIfDeleted["recommendation"] = "keep";
    if (delta > 0.05) recommendation = "remove";
    else if (delta > 0.01) recommendation = "consider_removing";

    return {
      probeId: "", // filled in by caller
      probeName: "", // filled in by caller
      alphaWithout,
      delta,
      recommendation,
    };
  });
}

// ---------------------------------------------------------------------------
// Confidence interval (Feldt, 1965)
// ---------------------------------------------------------------------------

function computeConfidenceInterval(
  alpha: number,
  k: number,
  n: number,
  confidence = 0.95
): { lower: number; upper: number; confidence: number } {
  if (n < 3 || k < 2) return { lower: 0, upper: 1, confidence };

  // F-distribution approximation for CI
  // Using the relationship between alpha and F
  const df1 = n - 1;
  const df2 = (n - 1) * (k - 1);

  // Approximate F critical values using normal approximation
  const zAlpha = confidence === 0.95 ? 1.96 : confidence === 0.99 ? 2.576 : 1.645;

  // Hakstian-Whalen approximation
  const fLower = Math.exp(
    (2 * zAlpha) / Math.sqrt(2 / (df2 - 1) + 2 / (df1 - 1))
  );
  const fUpper = 1 / fLower;

  const lower = Math.max(0, 1 - (1 - alpha) * fLower);
  const upper = Math.min(1, 1 - (1 - alpha) * fUpper);

  return {
    lower: Math.min(lower, upper),
    upper: Math.max(lower, upper),
    confidence,
  };
}

// ---------------------------------------------------------------------------
// Interpretation
// ---------------------------------------------------------------------------

function interpretAlpha(alpha: number): string {
  if (alpha >= 0.9) return "Excellent internal consistency";
  if (alpha >= 0.8) return "Good internal consistency";
  if (alpha >= 0.7) return "Acceptable internal consistency";
  if (alpha >= 0.6) return "Questionable internal consistency";
  if (alpha >= 0.5) return "Poor internal consistency";
  return "Unacceptable internal consistency";
}

// ---------------------------------------------------------------------------
// Recommendations engine
// ---------------------------------------------------------------------------

function generateRecommendations(
  alpha: number,
  itemTotals: ItemTotalCorrelation[],
  alphaIfDeleted: AlphaIfDeleted[]
): string[] {
  const recs: string[] = [];

  if (alpha < 0.7) {
    recs.push(
      "Internal consistency is below the conventional 0.70 threshold. Consider revising or replacing low-correlation probes."
    );
  }

  const dropCandidates = itemTotals.filter((it) => it.quality === "drop");
  if (dropCandidates.length > 0) {
    recs.push(
      `${dropCandidates.length} probe(s) have item-total correlations below 0.20: ${dropCandidates.map((d) => d.probeName || d.probeId).join(", ")}. Consider removing them.`
    );
  }

  const removals = alphaIfDeleted.filter((a) => a.recommendation === "remove");
  if (removals.length > 0) {
    recs.push(
      `Removing ${removals.map((r) => r.probeName || r.probeId).join(", ")} would improve alpha by ${removals.map((r) => `+${r.delta.toFixed(3)}`).join(", ")} respectively.`
    );
  }

  const poorItems = itemTotals.filter((it) => it.quality === "poor");
  if (poorItems.length > 0) {
    recs.push(
      `${poorItems.length} probe(s) have marginal item-total correlations (0.20-0.30). Monitor these for future revision.`
    );
  }

  if (alpha >= 0.9 && itemTotals.length > 10) {
    recs.push(
      "Very high alpha (>0.90) with many items may indicate redundancy. Consider shortening the probe set."
    );
  }

  if (recs.length === 0) {
    recs.push("The probe set shows good internal consistency. No changes needed.");
  }

  return recs;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function computeCronbachAlpha(
  probeSets: ProbeScoreSet[],
  confidence = 0.95
): CronbachAlphaResult {
  const k = probeSets.length;
  if (k < 2) {
    return {
      alpha: 0,
      standardizedAlpha: 0,
      n: k,
      k: 0,
      itemTotalCorrelations: [],
      alphaIfDeleted: [],
      confidenceInterval: { lower: 0, upper: 0, confidence },
      interpretation: "Need at least 2 probes to compute alpha",
      recommendations: ["Add more probes to this set."],
    };
  }

  const n = probeSets[0].scores.length;
  const items = probeSets.map((ps) => ps.scores);

  const alpha = computeRawAlpha(items);
  const standardizedAlpha = computeStandardizedAlpha(items);

  const rawItemTotals = computeItemTotalCorrelations(items);
  const itemTotalCorrelations = rawItemTotals.map((it, idx) => ({
    ...it,
    probeId: probeSets[idx].probeId,
    probeName: probeSets[idx].probeName,
  }));

  const rawAlphaIfDeleted = computeAlphaIfDeleted(items, alpha);
  const alphaIfDeleted = rawAlphaIfDeleted.map((a, idx) => ({
    ...a,
    probeId: probeSets[idx].probeId,
    probeName: probeSets[idx].probeName,
  }));

  const confidenceInterval = computeConfidenceInterval(alpha, k, n, confidence);
  const interpretation = interpretAlpha(alpha);
  const recommendations = generateRecommendations(alpha, itemTotalCorrelations, alphaIfDeleted);

  return {
    alpha,
    standardizedAlpha,
    n: k,
    k: n,
    itemTotalCorrelations,
    alphaIfDeleted,
    confidenceInterval,
    interpretation,
    recommendations,
  };
}

/**
 * Compute alpha for multiple probe sets grouped by theory/indicator.
 */
export function computeMultiSetAlpha(
  sets: Array<{ name: string; probes: ProbeScoreSet[] }>,
  confidence = 0.95
): MultiSetResult[] {
  return sets.map(({ name, probes }) => ({
    setName: name,
    result: computeCronbachAlpha(probes, confidence),
  }));
}

/**
 * Quick check: is this probe set reliable enough for production use?
 */
export function isReliable(alpha: number, threshold = 0.7): boolean {
  return alpha >= threshold;
}
