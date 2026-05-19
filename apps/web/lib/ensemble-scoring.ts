/**
 * Ensemble scoring engine (Issue #490).
 * Majority vote, weighted average, stacking strategies,
 * weight optimization, diversity metric, ensemble vs individual comparison.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type EnsembleStrategy =
  | "majority_vote"
  | "weighted_average"
  | "stacking"
  | "rank_average"
  | "trimmed_mean";

export interface ScorerResult {
  scorerId: string;
  score: number;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface EnsembleConfig {
  strategy: EnsembleStrategy;
  /** Weights per scorer (used in weighted_average). */
  weights?: Record<string, number>;
  /** Number of scoring bins for majority vote (default 5). */
  voteBins?: number;
  /** Trim proportion for trimmed mean (default 0.1). */
  trimProportion?: number;
  /** Meta-learner weights for stacking (learned from validation). */
  stackingWeights?: number[];
  /** Minimum number of scorers required (default 2). */
  minScorers?: number;
}

export interface EnsembleResult {
  score: number;
  confidence: number;
  strategy: EnsembleStrategy;
  individualResults: ScorerResult[];
  diversity: DiversityMetric;
  comparison: EnsembleComparison;
  metadata: {
    nScorers: number;
    effectiveWeights: Record<string, number>;
    timestamp: string;
  };
}

export interface DiversityMetric {
  /** Disagreement measure (0 = full agreement, 1 = full disagreement). */
  disagreement: number;
  /** Correlation-based diversity (lower correlation = more diverse). */
  correlationDiversity: number;
  /** Entropy of score distribution. */
  entropy: number;
  /** Q-statistic (pairwise measure of diversity). */
  qStatistic: number;
}

export interface EnsembleComparison {
  ensembleScore: number;
  bestIndividualScore: number;
  bestIndividualScorerId: string;
  worstIndividualScore: number;
  worstIndividualScorerId: string;
  meanIndividualScore: number;
  ensembleImprovement: number;
  /** Whether ensemble outperforms the best individual. */
  ensembleBetter: boolean;
}

export interface WeightOptimizationResult {
  optimizedWeights: Record<string, number>;
  iterations: number;
  convergence: number;
  improvementPercent: number;
  previousWeights: Record<string, number>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function variance(values: number[], m?: number): number {
  if (values.length < 2) return 0;
  const avg = m ?? mean(values);
  return values.reduce((s, v) => s + (v - avg) ** 2, 0) / (values.length - 1);
}

function pearsonCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const ma = mean(a.slice(0, n));
  const mb = mean(b.slice(0, n));
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const diffA = a[i] - ma;
    const diffB = b[i] - mb;
    num += diffA * diffB;
    da += diffA * diffA;
    db += diffB * diffB;
  }
  const denom = Math.sqrt(da * db);
  return denom > 0 ? num / denom : 0;
}

function normalizeWeights(weights: Record<string, number>): Record<string, number> {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (total === 0) return weights;
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(weights)) {
    result[k] = v / total;
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  Scoring strategies                                                */
/* ------------------------------------------------------------------ */

function majorityVote(
  results: ScorerResult[],
  bins: number = 5
): { score: number; confidence: number } {
  // Bin scores into discrete categories
  const binSize = 1.0 / bins;
  const votes = new Map<number, number>();

  for (const r of results) {
    const binIdx = Math.min(Math.floor(r.score / binSize), bins - 1);
    const binCenter = (binIdx + 0.5) * binSize;
    votes.set(binCenter, (votes.get(binCenter) ?? 0) + 1);
  }

  // Find the bin with the most votes
  let maxVotes = 0;
  let winningBin = 0;
  for (const [bin, count] of votes.entries()) {
    if (count > maxVotes) {
      maxVotes = count;
      winningBin = bin;
    }
  }

  const confidence = results.length > 0 ? maxVotes / results.length : 0;
  return { score: winningBin, confidence };
}

function weightedAverage(
  results: ScorerResult[],
  weights: Record<string, number>
): { score: number; confidence: number } {
  const normalized = normalizeWeights(weights);
  let totalScore = 0;
  let totalConfidence = 0;
  let totalWeight = 0;

  for (const r of results) {
    const w = normalized[r.scorerId] ?? 1 / results.length;
    totalScore += r.score * w;
    totalConfidence += r.confidence * w;
    totalWeight += w;
  }

  return {
    score: totalWeight > 0 ? totalScore / totalWeight : 0,
    confidence: totalWeight > 0 ? totalConfidence / totalWeight : 0,
  };
}

function stackingCombine(
  results: ScorerResult[],
  stackingWeights?: number[]
): { score: number; confidence: number } {
  if (!stackingWeights || stackingWeights.length === 0) {
    // Default to equal weights
    return weightedAverage(
      results,
      Object.fromEntries(results.map((r) => [r.scorerId, 1]))
    );
  }

  let score = 0;
  let confidence = 0;
  const totalW = stackingWeights.reduce((a, b) => a + b, 0);

  for (let i = 0; i < results.length; i++) {
    const w = (stackingWeights[i] ?? 0) / (totalW || 1);
    score += results[i].score * w;
    confidence += results[i].confidence * w;
  }

  return { score, confidence };
}

function rankAverage(
  results: ScorerResult[]
): { score: number; confidence: number } {
  if (results.length === 0) return { score: 0, confidence: 0 };

  // Rank scores
  const sorted = [...results].sort((a, b) => a.score - b.score);
  const ranks = new Map<string, number>();
  sorted.forEach((r, i) => ranks.set(r.scorerId, (i + 1) / results.length));

  // Average rank
  const avgRank = mean(Array.from(ranks.values()));
  const avgConfidence = mean(results.map((r) => r.confidence));

  return { score: avgRank, confidence: avgConfidence };
}

function trimmedMean(
  results: ScorerResult[],
  trimProportion: number = 0.1
): { score: number; confidence: number } {
  if (results.length === 0) return { score: 0, confidence: 0 };

  const sorted = [...results].sort((a, b) => a.score - b.score);
  const trimCount = Math.floor(sorted.length * trimProportion);
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount || undefined);

  if (trimmed.length === 0) return { score: mean(results.map((r) => r.score)), confidence: mean(results.map((r) => r.confidence)) };

  return {
    score: mean(trimmed.map((r) => r.score)),
    confidence: mean(trimmed.map((r) => r.confidence)),
  };
}

/* ------------------------------------------------------------------ */
/*  Diversity metrics                                                 */
/* ------------------------------------------------------------------ */

export function computeDiversity(results: ScorerResult[]): DiversityMetric {
  const scores = results.map((r) => r.score);

  // Disagreement: variance of scores
  const v = variance(scores);
  const disagreement = Math.min(v * 4, 1); // Normalize to [0,1]

  // Correlation diversity: average pairwise correlation
  let totalCorr = 0;
  let pairCount = 0;
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      totalCorr += Math.abs(
        pearsonCorrelation([results[i].score], [results[j].score])
      );
      pairCount++;
    }
  }
  const avgCorr = pairCount > 0 ? totalCorr / pairCount : 0;
  const correlationDiversity = 1 - avgCorr;

  // Entropy of score distribution (binned)
  const bins = 10;
  const binCounts = new Array(bins).fill(0);
  for (const s of scores) {
    const idx = Math.min(Math.floor(s * bins), bins - 1);
    binCounts[idx]++;
  }
  let entropy = 0;
  for (const count of binCounts) {
    if (count > 0) {
      const p = count / scores.length;
      entropy -= p * Math.log2(p);
    }
  }
  const maxEntropy = Math.log2(bins);
  const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;

  // Q-statistic (simplified pairwise)
  const avgScore = mean(scores);
  let qSum = 0;
  let qPairs = 0;
  for (let i = 0; i < scores.length; i++) {
    for (let j = i + 1; j < scores.length; j++) {
      const agreeHigh = scores[i] > avgScore && scores[j] > avgScore;
      const agreeLow = scores[i] <= avgScore && scores[j] <= avgScore;
      qSum += agreeHigh || agreeLow ? 1 : -1;
      qPairs++;
    }
  }
  const qStatistic = qPairs > 0 ? qSum / qPairs : 0;

  return {
    disagreement: Math.round(disagreement * 10000) / 10000,
    correlationDiversity: Math.round(correlationDiversity * 10000) / 10000,
    entropy: Math.round(normalizedEntropy * 10000) / 10000,
    qStatistic: Math.round(qStatistic * 10000) / 10000,
  };
}

/* ------------------------------------------------------------------ */
/*  Ensemble comparison                                               */
/* ------------------------------------------------------------------ */

function computeComparison(
  ensembleScore: number,
  results: ScorerResult[]
): EnsembleComparison {
  if (results.length === 0) {
    return {
      ensembleScore,
      bestIndividualScore: 0,
      bestIndividualScorerId: "",
      worstIndividualScore: 0,
      worstIndividualScorerId: "",
      meanIndividualScore: 0,
      ensembleImprovement: 0,
      ensembleBetter: false,
    };
  }

  const sorted = [...results].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const avg = mean(results.map((r) => r.score));

  return {
    ensembleScore,
    bestIndividualScore: best.score,
    bestIndividualScorerId: best.scorerId,
    worstIndividualScore: worst.score,
    worstIndividualScorerId: worst.scorerId,
    meanIndividualScore: avg,
    ensembleImprovement:
      avg > 0 ? ((ensembleScore - avg) / avg) * 100 : 0,
    ensembleBetter: ensembleScore >= best.score,
  };
}

/* ------------------------------------------------------------------ */
/*  Main ensemble scoring function                                    */
/* ------------------------------------------------------------------ */

export function ensembleScore(
  results: ScorerResult[],
  config: EnsembleConfig
): EnsembleResult {
  const minScorers = config.minScorers ?? 2;
  if (results.length < minScorers) {
    throw new Error(
      `Ensemble requires at least ${minScorers} scorers, got ${results.length}.`
    );
  }

  let combined: { score: number; confidence: number };

  switch (config.strategy) {
    case "majority_vote":
      combined = majorityVote(results, config.voteBins);
      break;

    case "weighted_average":
      combined = weightedAverage(
        results,
        config.weights ?? Object.fromEntries(results.map((r) => [r.scorerId, 1]))
      );
      break;

    case "stacking":
      combined = stackingCombine(results, config.stackingWeights);
      break;

    case "rank_average":
      combined = rankAverage(results);
      break;

    case "trimmed_mean":
      combined = trimmedMean(results, config.trimProportion);
      break;
  }

  // Compute effective weights
  const effectiveWeights: Record<string, number> = {};
  if (config.strategy === "weighted_average" && config.weights) {
    const norm = normalizeWeights(config.weights);
    for (const r of results) {
      effectiveWeights[r.scorerId] = norm[r.scorerId] ?? 1 / results.length;
    }
  } else {
    for (const r of results) {
      effectiveWeights[r.scorerId] = 1 / results.length;
    }
  }

  return {
    score: Math.round(combined.score * 10000) / 10000,
    confidence: Math.round(combined.confidence * 10000) / 10000,
    strategy: config.strategy,
    individualResults: results,
    diversity: computeDiversity(results),
    comparison: computeComparison(combined.score, results),
    metadata: {
      nScorers: results.length,
      effectiveWeights,
      timestamp: new Date().toISOString(),
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Weight optimization                                               */
/* ------------------------------------------------------------------ */

export function optimizeWeights(
  historicalResults: ScorerResult[][],
  groundTruth: number[],
  currentWeights?: Record<string, number>,
  maxIterations: number = 100,
  learningRate: number = 0.01
): WeightOptimizationResult {
  if (historicalResults.length !== groundTruth.length) {
    throw new Error("Historical results and ground truth must have same length.");
  }

  if (historicalResults.length === 0) {
    throw new Error("Need at least one historical result for optimization.");
  }

  // Get all scorer IDs
  const scorerIds = Array.from(
    new Set(historicalResults.flatMap((r) => r.map((s) => s.scorerId)))
  );

  // Initialize weights
  const weights: Record<string, number> = {};
  for (const id of scorerIds) {
    weights[id] = currentWeights?.[id] ?? 1 / scorerIds.length;
  }
  const previousWeights = { ...weights };

  // Gradient descent to minimize MSE
  let bestLoss = Infinity;
  let iterations = 0;

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations = iter + 1;
    const normalized = normalizeWeights(weights);

    // Compute loss and gradients
    let totalLoss = 0;
    const gradients: Record<string, number> = {};
    for (const id of scorerIds) gradients[id] = 0;

    for (let i = 0; i < historicalResults.length; i++) {
      const results = historicalResults[i];
      const truth = groundTruth[i];

      // Weighted prediction
      let pred = 0;
      for (const r of results) {
        pred += r.score * (normalized[r.scorerId] ?? 0);
      }

      const error = pred - truth;
      totalLoss += error * error;

      // Gradient for each scorer
      for (const r of results) {
        gradients[r.scorerId] = (gradients[r.scorerId] ?? 0) + 2 * error * r.score;
      }
    }

    totalLoss /= historicalResults.length;

    // Update weights
    for (const id of scorerIds) {
      weights[id] -= learningRate * (gradients[id] / historicalResults.length);
      weights[id] = Math.max(0, weights[id]); // Keep non-negative
    }

    // Check convergence
    if (Math.abs(totalLoss - bestLoss) < 1e-8) break;
    bestLoss = Math.min(bestLoss, totalLoss);
  }

  const optimized = normalizeWeights(weights);

  // Compute improvement
  const prevNorm = normalizeWeights(previousWeights);
  let prevLoss = 0;
  let newLoss = 0;
  for (let i = 0; i < historicalResults.length; i++) {
    const results = historicalResults[i];
    const truth = groundTruth[i];
    let prevPred = 0;
    let newPred = 0;
    for (const r of results) {
      prevPred += r.score * (prevNorm[r.scorerId] ?? 0);
      newPred += r.score * (optimized[r.scorerId] ?? 0);
    }
    prevLoss += (prevPred - truth) ** 2;
    newLoss += (newPred - truth) ** 2;
  }

  const improvement =
    prevLoss > 0 ? ((prevLoss - newLoss) / prevLoss) * 100 : 0;

  return {
    optimizedWeights: optimized,
    iterations,
    convergence: bestLoss,
    improvementPercent: Math.round(improvement * 100) / 100,
    previousWeights: prevNorm,
  };
}

/* ------------------------------------------------------------------ */
/*  Convenience: compare multiple strategies                          */
/* ------------------------------------------------------------------ */

export function compareStrategies(
  results: ScorerResult[],
  weights?: Record<string, number>
): Record<EnsembleStrategy, { score: number; confidence: number }> {
  const strategies: EnsembleStrategy[] = [
    "majority_vote",
    "weighted_average",
    "stacking",
    "rank_average",
    "trimmed_mean",
  ];

  const comparison: Record<string, { score: number; confidence: number }> = {};

  for (const strategy of strategies) {
    try {
      const result = ensembleScore(results, {
        strategy,
        weights,
        minScorers: 1,
      });
      comparison[strategy] = { score: result.score, confidence: result.confidence };
    } catch {
      comparison[strategy] = { score: 0, confidence: 0 };
    }
  }

  return comparison as Record<EnsembleStrategy, { score: number; confidence: number }>;
}
