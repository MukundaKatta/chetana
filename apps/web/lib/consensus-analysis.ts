/**
 * Cross-model consensus analysis (Issue #302).
 * Computes inter-rater reliability metrics and identifies consensus/divergence
 * across multiple audit results.
 */

/**
 * Computes Fleiss' kappa for inter-rater reliability.
 * Measures agreement among multiple raters (models) on categorical ratings.
 *
 * @param ratings - 2D array where ratings[i][j] is the number of raters who assigned
 *   subject i to category j.
 * @returns Fleiss' kappa value (-1 to 1). 1 = perfect agreement, 0 = chance, <0 = worse than chance.
 */
export function computeFleissKappa(ratings: number[][]): number {
  const n = ratings.length; // number of subjects
  if (n === 0) return 0;

  const k = ratings[0]?.length ?? 0; // number of categories
  if (k === 0) return 0;

  // Number of raters per subject (assumed constant)
  const N = ratings[0].reduce((sum, val) => sum + val, 0);
  if (N <= 1) return 0;

  // Proportion of raters who assigned each category (p_j)
  const pj: number[] = [];
  for (let j = 0; j < k; j++) {
    let total = 0;
    for (let i = 0; i < n; i++) {
      total += ratings[i][j];
    }
    pj.push(total / (n * N));
  }

  // Expected proportion of agreement by chance
  const Pe = pj.reduce((sum, p) => sum + p * p, 0);

  // Observed agreement per subject
  const Pi: number[] = [];
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < k; j++) {
      sum += ratings[i][j] * ratings[i][j];
    }
    Pi.push((sum - N) / (N * (N - 1)));
  }

  // Mean observed agreement
  const Pbar = Pi.reduce((sum, p) => sum + p, 0) / n;

  // Fleiss' kappa
  if (Math.abs(1 - Pe) < 1e-10) return 1; // all raters agree perfectly
  return (Pbar - Pe) / (1 - Pe);
}

export interface AuditScores {
  auditId: string;
  modelName: string;
  theoryScores: Record<string, number>;
  indicatorScores: Record<string, number>;
  overallScore: number;
}

export interface ConsensusIndicator {
  /** The indicator or theory where consensus is found. */
  key: string;
  /** Average score across all audits. */
  averageScore: number;
  /** Standard deviation (lower = more consensus). */
  standardDeviation: number;
  /** How many audits agree within a threshold. */
  agreementCount: number;
  /** Total audits compared. */
  totalAudits: number;
}

export interface DivergenceIndicator {
  /** The indicator or theory where divergence is found. */
  key: string;
  /** Average score across all audits. */
  averageScore: number;
  /** Standard deviation (higher = more divergence). */
  standardDeviation: number;
  /** The two audits with the most different scores. */
  mostDivergent: { auditA: string; auditB: string; scoreA: number; scoreB: number };
}

/** Threshold for considering two scores as "in agreement". */
const AGREEMENT_THRESHOLD = 0.15;

/** Standard deviation above which a metric is considered divergent. */
const DIVERGENCE_THRESHOLD = 0.20;

/**
 * Finds indicators/theories where multiple audits show consensus.
 */
export function findConsensusIndicators(
  audits: AuditScores[]
): ConsensusIndicator[] {
  if (audits.length < 2) return [];

  // Collect all score keys
  const allKeys = new Set<string>();
  for (const audit of audits) {
    for (const key of Object.keys(audit.theoryScores)) allKeys.add(`theory:${key}`);
    for (const key of Object.keys(audit.indicatorScores)) allKeys.add(`indicator:${key}`);
  }

  const results: ConsensusIndicator[] = [];

  for (const key of allKeys) {
    const scores = audits.map((a) => {
      if (key.startsWith("theory:")) {
        return a.theoryScores[key.replace("theory:", "")] ?? 0;
      }
      return a.indicatorScores[key.replace("indicator:", "")] ?? 0;
    });

    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    const variance =
      scores.reduce((s, v) => s + (v - avg) * (v - avg), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    const agreementCount = scores.filter(
      (s) => Math.abs(s - avg) <= AGREEMENT_THRESHOLD
    ).length;

    if (stdDev < DIVERGENCE_THRESHOLD) {
      results.push({
        key,
        averageScore: Math.round(avg * 1000) / 1000,
        standardDeviation: Math.round(stdDev * 1000) / 1000,
        agreementCount,
        totalAudits: audits.length,
      });
    }
  }

  // Sort by strongest consensus (lowest stdDev)
  results.sort((a, b) => a.standardDeviation - b.standardDeviation);
  return results;
}

/**
 * Finds indicators/theories where multiple audits diverge significantly.
 */
export function findDivergenceIndicators(
  audits: AuditScores[]
): DivergenceIndicator[] {
  if (audits.length < 2) return [];

  const allKeys = new Set<string>();
  for (const audit of audits) {
    for (const key of Object.keys(audit.theoryScores)) allKeys.add(`theory:${key}`);
    for (const key of Object.keys(audit.indicatorScores)) allKeys.add(`indicator:${key}`);
  }

  const results: DivergenceIndicator[] = [];

  for (const key of allKeys) {
    const scores = audits.map((a) => {
      const raw = key.startsWith("theory:")
        ? a.theoryScores[key.replace("theory:", "")]
        : a.indicatorScores[key.replace("indicator:", "")];
      return { auditId: a.auditId, score: raw ?? 0 };
    });

    const avg = scores.reduce((s, v) => s + v.score, 0) / scores.length;
    const variance =
      scores.reduce((s, v) => s + (v.score - avg) * (v.score - avg), 0) /
      scores.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev >= DIVERGENCE_THRESHOLD) {
      // Find the pair with the largest difference
      let maxDiff = 0;
      let mostDivergent = {
        auditA: scores[0].auditId,
        auditB: scores[1].auditId,
        scoreA: scores[0].score,
        scoreB: scores[1].score,
      };

      for (let i = 0; i < scores.length; i++) {
        for (let j = i + 1; j < scores.length; j++) {
          const diff = Math.abs(scores[i].score - scores[j].score);
          if (diff > maxDiff) {
            maxDiff = diff;
            mostDivergent = {
              auditA: scores[i].auditId,
              auditB: scores[j].auditId,
              scoreA: scores[i].score,
              scoreB: scores[j].score,
            };
          }
        }
      }

      results.push({
        key,
        averageScore: Math.round(avg * 1000) / 1000,
        standardDeviation: Math.round(stdDev * 1000) / 1000,
        mostDivergent,
      });
    }
  }

  // Sort by strongest divergence (highest stdDev)
  results.sort((a, b) => b.standardDeviation - a.standardDeviation);
  return results;
}
