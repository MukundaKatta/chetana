/**
 * Probe inter-rater reliability analysis (Issue #441).
 * Computes Cohen's Kappa (two raters), Fleiss' Kappa (multiple raters),
 * Intraclass Correlation Coefficient (ICC), agreement matrices, and
 * supports discrepancy resolution workflows.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface RaterScore {
  /** Rater identifier (e.g. model name or evaluator ID). */
  raterId: string;
  /** Probe identifier. */
  probeId: string;
  /** Categorical rating or numeric score. */
  rating: number;
}

export interface KappaResult {
  /** Kappa value (-1 to 1). */
  kappa: number;
  /** Observed agreement proportion. */
  observedAgreement: number;
  /** Expected agreement by chance. */
  expectedAgreement: number;
  /** Interpretation label. */
  interpretation: KappaInterpretation;
  /** Standard error of kappa. */
  standardError: number;
  /** 95% confidence interval. */
  confidenceInterval: [number, number];
}

export type KappaInterpretation =
  | "poor"
  | "slight"
  | "fair"
  | "moderate"
  | "substantial"
  | "almost_perfect";

export interface ICCResult {
  /** ICC value (0 to 1). */
  icc: number;
  /** ICC model type. */
  model: ICCModel;
  /** Between-subject variance. */
  betweenVariance: number;
  /** Within-subject variance. */
  withinVariance: number;
  /** 95% confidence interval. */
  confidenceInterval: [number, number];
}

export type ICCModel = "one-way" | "two-way-random" | "two-way-mixed";

export interface AgreementMatrix {
  /** Rater IDs (column / row labels). */
  raters: string[];
  /** Pairwise agreement proportions (raters.length x raters.length). */
  matrix: number[][];
  /** Overall agreement across all rater pairs. */
  overallAgreement: number;
}

export interface Discrepancy {
  /** Probe where discrepancy was found. */
  probeId: string;
  /** Ratings from each rater. */
  ratings: Array<{ raterId: string; rating: number }>;
  /** Magnitude of the discrepancy (max - min). */
  magnitude: number;
  /** Status of the resolution. */
  status: DiscrepancyStatus;
  /** Resolved value (set after resolution). */
  resolvedValue?: number;
  /** Method used to resolve. */
  resolutionMethod?: ResolutionMethod;
  /** Notes from the resolver. */
  notes?: string;
}

export type DiscrepancyStatus = "open" | "in_review" | "resolved" | "dismissed";

export type ResolutionMethod =
  | "consensus"
  | "majority_vote"
  | "expert_override"
  | "mean"
  | "median";

/* ------------------------------------------------------------------ */
/*  Kappa interpretation                                              */
/* ------------------------------------------------------------------ */

function interpretKappa(kappa: number): KappaInterpretation {
  if (kappa < 0.0) return "poor";
  if (kappa < 0.2) return "slight";
  if (kappa < 0.4) return "fair";
  if (kappa < 0.6) return "moderate";
  if (kappa < 0.8) return "substantial";
  return "almost_perfect";
}

/* ------------------------------------------------------------------ */
/*  Cohen's Kappa (two raters)                                        */
/* ------------------------------------------------------------------ */

/**
 * Compute Cohen's Kappa for two raters on categorical ratings.
 *
 * @param ratingsA - Array of ratings from rater A (one per subject).
 * @param ratingsB - Array of ratings from rater B (one per subject).
 * @param categories - All possible category values. Auto-detected if omitted.
 */
export function cohensKappa(
  ratingsA: number[],
  ratingsB: number[],
  categories?: number[],
): KappaResult {
  const n = Math.min(ratingsA.length, ratingsB.length);
  if (n === 0) {
    return {
      kappa: 0,
      observedAgreement: 0,
      expectedAgreement: 0,
      interpretation: "poor",
      standardError: 0,
      confidenceInterval: [0, 0],
    };
  }

  const cats =
    categories ??
    [...new Set([...ratingsA, ...ratingsB])].sort((a, b) => a - b);

  const k = cats.length;
  const catIndex = new Map(cats.map((c, i) => [c, i]));

  // Build confusion matrix
  const confusion: number[][] = Array.from({ length: k }, () =>
    Array(k).fill(0) as number[],
  );
  for (let i = 0; i < n; i++) {
    const ai = catIndex.get(ratingsA[i]);
    const bi = catIndex.get(ratingsB[i]);
    if (ai !== undefined && bi !== undefined) {
      confusion[ai][bi]++;
    }
  }

  // Observed agreement
  let agree = 0;
  for (let i = 0; i < k; i++) {
    agree += confusion[i][i];
  }
  const po = agree / n;

  // Marginal totals
  const rowTotals = confusion.map((row) => row.reduce((s, v) => s + v, 0));
  const colTotals: number[] = Array(k).fill(0);
  for (let j = 0; j < k; j++) {
    for (let i = 0; i < k; i++) {
      colTotals[j] += confusion[i][j];
    }
  }

  // Expected agreement
  let pe = 0;
  for (let i = 0; i < k; i++) {
    pe += (rowTotals[i] / n) * (colTotals[i] / n);
  }

  const kappa = Math.abs(1 - pe) < 1e-10 ? 1 : (po - pe) / (1 - pe);

  // Standard error (Fleiss, Cohen & Everitt, 1969)
  const se =
    n > 0 ? Math.sqrt((po * (1 - po)) / (n * (1 - pe) ** 2)) : 0;

  return {
    kappa,
    observedAgreement: po,
    expectedAgreement: pe,
    interpretation: interpretKappa(kappa),
    standardError: se,
    confidenceInterval: [kappa - 1.96 * se, kappa + 1.96 * se],
  };
}

/* ------------------------------------------------------------------ */
/*  Fleiss' Kappa (multiple raters)                                   */
/* ------------------------------------------------------------------ */

/**
 * Compute Fleiss' Kappa for multiple raters.
 *
 * @param ratings - 2D array where ratings[i][j] is the number of raters who
 *   assigned subject i to category j.
 */
export function fleissKappa(ratings: number[][]): KappaResult {
  const n = ratings.length;
  if (n === 0) {
    return {
      kappa: 0,
      observedAgreement: 0,
      expectedAgreement: 0,
      interpretation: "poor",
      standardError: 0,
      confidenceInterval: [0, 0],
    };
  }

  const k = ratings[0]?.length ?? 0;
  if (k === 0) {
    return {
      kappa: 0,
      observedAgreement: 0,
      expectedAgreement: 0,
      interpretation: "poor",
      standardError: 0,
      confidenceInterval: [0, 0],
    };
  }

  const N = ratings[0].reduce((s, v) => s + v, 0); // raters per subject
  if (N <= 1) {
    return {
      kappa: 0,
      observedAgreement: 0,
      expectedAgreement: 0,
      interpretation: "poor",
      standardError: 0,
      confidenceInterval: [0, 0],
    };
  }

  // Category proportions
  const pj: number[] = [];
  for (let j = 0; j < k; j++) {
    let total = 0;
    for (let i = 0; i < n; i++) {
      total += ratings[i][j];
    }
    pj.push(total / (n * N));
  }

  const pe = pj.reduce((s, p) => s + p * p, 0);

  // Per-subject agreement
  const pi: number[] = [];
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < k; j++) {
      sum += ratings[i][j] * ratings[i][j];
    }
    pi.push((sum - N) / (N * (N - 1)));
  }

  const po = pi.reduce((s, p) => s + p, 0) / n;

  const kappa = Math.abs(1 - pe) < 1e-10 ? 1 : (po - pe) / (1 - pe);

  // Standard error
  const se =
    n > 0 && Math.abs(1 - pe) > 1e-10
      ? Math.sqrt(
          (2 / (n * N * (N - 1))) *
            (pe - pj.reduce((s, p) => s + p * p * p, 0)) /
            (1 - pe) ** 2,
        )
      : 0;

  return {
    kappa,
    observedAgreement: po,
    expectedAgreement: pe,
    interpretation: interpretKappa(kappa),
    standardError: isNaN(se) ? 0 : se,
    confidenceInterval: [kappa - 1.96 * se, kappa + 1.96 * se],
  };
}

/* ------------------------------------------------------------------ */
/*  ICC Calculation                                                   */
/* ------------------------------------------------------------------ */

/**
 * Compute Intraclass Correlation Coefficient.
 *
 * @param data - 2D array where data[i][j] is the rating of subject i by rater j.
 *               Rows are subjects, columns are raters.
 * @param model - ICC model (default "two-way-random").
 */
export function computeICC(
  data: number[][],
  model: ICCModel = "two-way-random",
): ICCResult {
  const n = data.length; // subjects
  const k = data[0]?.length ?? 0; // raters

  if (n < 2 || k < 2) {
    return {
      icc: 0,
      model,
      betweenVariance: 0,
      withinVariance: 0,
      confidenceInterval: [0, 0],
    };
  }

  // Grand mean
  let grandSum = 0;
  let totalCount = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < k; j++) {
      grandSum += data[i][j];
      totalCount++;
    }
  }
  const grandMean = grandSum / totalCount;

  // Row means (subject means)
  const rowMeans = data.map(
    (row) => row.reduce((s, v) => s + v, 0) / k,
  );

  // Column means (rater means)
  const colMeans: number[] = [];
  for (let j = 0; j < k; j++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += data[i][j];
    }
    colMeans.push(sum / n);
  }

  // Sum of squares
  let SSB = 0; // Between subjects
  let SSW = 0; // Within subjects
  let SSR = 0; // Between raters
  let SSE = 0; // Residual error

  for (let i = 0; i < n; i++) {
    SSB += k * (rowMeans[i] - grandMean) ** 2;
  }

  for (let j = 0; j < k; j++) {
    SSR += n * (colMeans[j] - grandMean) ** 2;
  }

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < k; j++) {
      SSW += (data[i][j] - rowMeans[i]) ** 2;
      SSE +=
        (data[i][j] - rowMeans[i] - colMeans[j] + grandMean) ** 2;
    }
  }

  // Mean squares
  const MSB = SSB / (n - 1);
  const MSW = SSW / (n * (k - 1));
  const MSR = SSR / (k - 1);
  const MSE = SSE / ((n - 1) * (k - 1));

  let icc: number;
  let betweenVariance: number;
  let withinVariance: number;

  switch (model) {
    case "one-way":
      icc = (MSB - MSW) / (MSB + (k - 1) * MSW);
      betweenVariance = (MSB - MSW) / k;
      withinVariance = MSW;
      break;
    case "two-way-random":
      icc =
        (MSB - MSE) / (MSB + (k - 1) * MSE + (k * (MSR - MSE)) / n);
      betweenVariance = (MSB - MSE) / k;
      withinVariance = MSE;
      break;
    case "two-way-mixed":
      icc = (MSB - MSE) / (MSB + (k - 1) * MSE);
      betweenVariance = (MSB - MSE) / k;
      withinVariance = MSE;
      break;
  }

  // Confidence interval approximation
  const F = MSB / MSE;
  const dfB = n - 1;
  const dfE = (n - 1) * (k - 1);
  // Simple approximation using F-ratio
  const fLower = F / 2.5; // rough 95% CI
  const fUpper = F * 2.5;
  const ciLower = (fLower - 1) / (fLower + k - 1);
  const ciUpper = (fUpper - 1) / (fUpper + k - 1);

  return {
    icc: clamp(icc, 0, 1),
    model,
    betweenVariance: Math.max(0, betweenVariance),
    withinVariance: Math.max(0, withinVariance),
    confidenceInterval: [
      clamp(ciLower, 0, 1),
      clamp(ciUpper, 0, 1),
    ],
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/* ------------------------------------------------------------------ */
/*  Agreement matrix                                                  */
/* ------------------------------------------------------------------ */

/**
 * Build a pairwise agreement matrix across all raters.
 *
 * @param scores - All rater scores (flat array).
 * @param threshold - Maximum difference to count as agreement (default 0, exact match).
 */
export function buildAgreementMatrix(
  scores: RaterScore[],
  threshold: number = 0,
): AgreementMatrix {
  // Group by rater
  const byRater = new Map<string, Map<string, number>>();
  for (const score of scores) {
    if (!byRater.has(score.raterId)) {
      byRater.set(score.raterId, new Map());
    }
    byRater.get(score.raterId)!.set(score.probeId, score.rating);
  }

  const raters = [...byRater.keys()].sort();
  const n = raters.length;
  const matrix: number[][] = Array.from({ length: n }, () =>
    Array(n).fill(0) as number[],
  );

  // Compute pairwise agreement
  const allProbes = new Set(scores.map((s) => s.probeId));
  let totalPairs = 0;
  let totalAgree = 0;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1;
        continue;
      }

      const ratingsI = byRater.get(raters[i])!;
      const ratingsJ = byRater.get(raters[j])!;

      let agree = 0;
      let total = 0;

      for (const probe of allProbes) {
        const ri = ratingsI.get(probe);
        const rj = ratingsJ.get(probe);
        if (ri !== undefined && rj !== undefined) {
          total++;
          if (Math.abs(ri - rj) <= threshold) agree++;
        }
      }

      matrix[i][j] = total > 0 ? agree / total : 0;

      if (i < j) {
        totalPairs += total;
        totalAgree += agree;
      }
    }
  }

  return {
    raters,
    matrix,
    overallAgreement: totalPairs > 0 ? totalAgree / totalPairs : 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Discrepancy resolution workflow                                   */
/* ------------------------------------------------------------------ */

/**
 * Identify discrepancies where raters disagree beyond a threshold.
 */
export function findDiscrepancies(
  scores: RaterScore[],
  magnitudeThreshold: number = 0.2,
): Discrepancy[] {
  // Group by probe
  const byProbe = new Map<string, Array<{ raterId: string; rating: number }>>();
  for (const score of scores) {
    if (!byProbe.has(score.probeId)) {
      byProbe.set(score.probeId, []);
    }
    byProbe.get(score.probeId)!.push({
      raterId: score.raterId,
      rating: score.rating,
    });
  }

  const discrepancies: Discrepancy[] = [];

  for (const [probeId, ratings] of byProbe) {
    if (ratings.length < 2) continue;

    const values = ratings.map((r) => r.rating);
    const magnitude = Math.max(...values) - Math.min(...values);

    if (magnitude > magnitudeThreshold) {
      discrepancies.push({
        probeId,
        ratings,
        magnitude,
        status: "open",
      });
    }
  }

  return discrepancies.sort((a, b) => b.magnitude - a.magnitude);
}

/**
 * Resolve a discrepancy using the specified method.
 */
export function resolveDiscrepancy(
  discrepancy: Discrepancy,
  method: ResolutionMethod,
  notes?: string,
  expertValue?: number,
): Discrepancy {
  const values = discrepancy.ratings.map((r) => r.rating);
  let resolvedValue: number;

  switch (method) {
    case "mean":
      resolvedValue = values.reduce((s, v) => s + v, 0) / values.length;
      break;

    case "median": {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      resolvedValue =
        sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];
      break;
    }

    case "majority_vote": {
      // For numeric ratings, find the mode (rounded to 1 decimal)
      const counts = new Map<number, number>();
      for (const v of values) {
        const rounded = Math.round(v * 10) / 10;
        counts.set(rounded, (counts.get(rounded) ?? 0) + 1);
      }
      let maxCount = 0;
      resolvedValue = values[0];
      for (const [val, count] of counts) {
        if (count > maxCount) {
          maxCount = count;
          resolvedValue = val;
        }
      }
      break;
    }

    case "expert_override":
      resolvedValue = expertValue ?? values[0];
      break;

    case "consensus":
      // Consensus defaults to mean as a starting point
      resolvedValue = expertValue ?? values.reduce((s, v) => s + v, 0) / values.length;
      break;
  }

  return {
    ...discrepancy,
    status: "resolved",
    resolvedValue,
    resolutionMethod: method,
    notes,
  };
}

/**
 * Summary statistics for a set of rater scores.
 */
export function raterReliabilitySummary(scores: RaterScore[]): {
  raterCount: number;
  probeCount: number;
  agreementMatrix: AgreementMatrix;
  discrepancies: Discrepancy[];
  icc: ICCResult;
} {
  const raterIds = [...new Set(scores.map((s) => s.raterId))];
  const probeIds = [...new Set(scores.map((s) => s.probeId))];

  // Build data matrix for ICC
  const dataMatrix: number[][] = [];
  for (const probe of probeIds) {
    const row: number[] = [];
    for (const rater of raterIds) {
      const score = scores.find(
        (s) => s.probeId === probe && s.raterId === rater,
      );
      row.push(score?.rating ?? 0);
    }
    dataMatrix.push(row);
  }

  return {
    raterCount: raterIds.length,
    probeCount: probeIds.length,
    agreementMatrix: buildAgreementMatrix(scores, 0.1),
    discrepancies: findDiscrepancies(scores),
    icc: computeICC(dataMatrix),
  };
}
