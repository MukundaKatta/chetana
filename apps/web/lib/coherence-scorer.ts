/**
 * Model response coherence scorer (Issue #443).
 * Analyses cross-reference consistency, contradiction detection,
 * logical coherence scoring, topic drift measurement, and produces
 * visualization data across a probe sequence.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ProbeResponse {
  /** Probe identifier. */
  probeId: string;
  /** Sequence index (order in which the probe was administered). */
  sequenceIndex: number;
  /** The model's response text. */
  response: string;
  /** Optional extracted claims / assertions from the response. */
  claims?: string[];
  /** Optional topic keywords. */
  topics?: string[];
}

export interface CoherenceResult {
  /** Overall coherence score (0-1). */
  overallScore: number;
  /** Cross-reference consistency score (0-1). */
  consistencyScore: number;
  /** Contradiction severity (0 = none, 1 = severe). */
  contradictionScore: number;
  /** Logical coherence score (0-1). */
  logicalCoherenceScore: number;
  /** Topic drift magnitude (0 = no drift, 1 = complete drift). */
  topicDriftScore: number;
  /** Individual contradiction instances found. */
  contradictions: Contradiction[];
  /** Topic drift data points for visualization. */
  topicDriftData: TopicDriftPoint[];
  /** Per-response coherence detail. */
  responseDetails: ResponseCoherenceDetail[];
}

export interface Contradiction {
  /** First probe ID. */
  probeIdA: string;
  /** Second probe ID. */
  probeIdB: string;
  /** Claim from first response. */
  claimA: string;
  /** Conflicting claim from second response. */
  claimB: string;
  /** Severity (0-1). */
  severity: number;
  /** Type of contradiction. */
  type: ContradictionType;
}

export type ContradictionType =
  | "direct_negation"
  | "logical_inconsistency"
  | "factual_conflict"
  | "hedging_shift";

export interface TopicDriftPoint {
  /** Sequence index in the probe sequence. */
  sequenceIndex: number;
  /** Probe ID. */
  probeId: string;
  /** Similarity to initial topic distribution (0-1). */
  topicSimilarity: number;
  /** Similarity to previous response topics (0-1). */
  localSimilarity: number;
  /** Dominant topics at this point. */
  dominantTopics: string[];
}

export interface ResponseCoherenceDetail {
  probeId: string;
  sequenceIndex: number;
  /** Internal coherence of this single response (0-1). */
  internalCoherence: number;
  /** Consistency with previous responses (0-1). */
  crossReferenceScore: number;
  /** Number of contradictions involving this response. */
  contradictionCount: number;
}

export interface CoherenceVisualizationData {
  /** Line chart data for coherence over the probe sequence. */
  sequenceData: Array<{
    index: number;
    probeId: string;
    coherence: number;
    consistency: number;
    topicDrift: number;
  }>;
  /** Heatmap data for pairwise consistency. */
  consistencyMatrix: {
    probeIds: string[];
    matrix: number[][];
  };
  /** Summary statistics. */
  summary: {
    meanCoherence: number;
    minCoherence: number;
    maxCoherence: number;
    contradictionCount: number;
    driftMagnitude: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Text analysis utilities                                           */
/* ------------------------------------------------------------------ */

/**
 * Tokenize text into lowercase words.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/**
 * Extract simple claim-like sentences from text.
 */
function extractClaims(text: string): string[] {
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  return sentences.filter((s) => {
    const lower = s.toLowerCase();
    // Heuristic: claims tend to be declarative statements
    return (
      !lower.startsWith("what") &&
      !lower.startsWith("how") &&
      !lower.startsWith("why") &&
      !lower.startsWith("when") &&
      !lower.startsWith("where") &&
      !lower.startsWith("who")
    );
  });
}

/**
 * Compute term frequency vector for a text.
 */
function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
  }
  // Normalize
  const total = tokens.length || 1;
  for (const [term, count] of tf) {
    tf.set(term, count / total);
  }
  return tf;
}

/**
 * Cosine similarity between two term frequency vectors.
 */
function cosineSimilarity(
  a: Map<string, number>,
  b: Map<string, number>,
): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const [term, freqA] of a) {
    normA += freqA * freqA;
    const freqB = b.get(term);
    if (freqB !== undefined) {
      dot += freqA * freqB;
    }
  }
  for (const [, freqB] of b) {
    normB += freqB * freqB;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

/**
 * Detect negation patterns between two claims.
 */
function detectNegation(claimA: string, claimB: string): boolean {
  const negationWords = [
    "not", "no", "never", "neither", "nor", "cannot", "can't",
    "won't", "doesn't", "don't", "isn't", "aren't", "wasn't",
    "weren't", "hasn't", "haven't", "hadn't", "wouldn't", "shouldn't",
    "couldn't", "unable", "impossible", "false", "incorrect",
  ];

  const tokensA = new Set(tokenize(claimA));
  const tokensB = new Set(tokenize(claimB));

  // Check if claims are similar in content but differ in negation
  const sharedTokens = [...tokensA].filter((t) => tokensB.has(t));
  const similarity =
    sharedTokens.length /
    Math.max(1, Math.min(tokensA.size, tokensB.size));

  if (similarity < 0.3) return false; // Too different to be contradictory

  const negA = [...tokensA].filter((t) => negationWords.includes(t)).length;
  const negB = [...tokensB].filter((t) => negationWords.includes(t)).length;

  // One has negation, the other doesn't
  return (negA % 2 !== negB % 2) && similarity > 0.4;
}

/**
 * Detect hedging shift (confident in one, uncertain in another).
 */
function detectHedgingShift(claimA: string, claimB: string): boolean {
  const confidentWords = [
    "definitely", "certainly", "clearly", "obviously", "always",
    "absolutely", "undoubtedly", "sure", "confirmed",
  ];
  const hedgingWords = [
    "maybe", "perhaps", "possibly", "might", "could", "uncertain",
    "unclear", "debatable", "questionable", "sometimes", "arguably",
  ];

  const tokensA = tokenize(claimA);
  const tokensB = tokenize(claimB);

  const confidentA = tokensA.some((t) => confidentWords.includes(t));
  const hedgingA = tokensA.some((t) => hedgingWords.includes(t));
  const confidentB = tokensB.some((t) => confidentWords.includes(t));
  const hedgingB = tokensB.some((t) => hedgingWords.includes(t));

  // Check content similarity first
  const tfA = termFrequency(tokensA);
  const tfB = termFrequency(tokensB);
  const sim = cosineSimilarity(tfA, tfB);

  if (sim < 0.3) return false;

  return (confidentA && hedgingB) || (hedgingA && confidentB);
}

/* ------------------------------------------------------------------ */
/*  Core scoring functions                                            */
/* ------------------------------------------------------------------ */

/**
 * Compute internal coherence of a single response.
 * Checks if sentences within the response are topically consistent.
 */
export function computeInternalCoherence(text: string): number {
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  if (sentences.length <= 1) return 1;

  const tfVectors = sentences.map((s) => termFrequency(tokenize(s)));

  let totalSim = 0;
  let pairs = 0;

  // Compare adjacent sentences
  for (let i = 0; i < tfVectors.length - 1; i++) {
    totalSim += cosineSimilarity(tfVectors[i], tfVectors[i + 1]);
    pairs++;
  }

  return pairs > 0 ? totalSim / pairs : 1;
}

/**
 * Detect contradictions between two sets of claims.
 */
export function detectContradictions(
  probeIdA: string,
  claimsA: string[],
  probeIdB: string,
  claimsB: string[],
): Contradiction[] {
  const contradictions: Contradiction[] = [];

  for (const claimA of claimsA) {
    for (const claimB of claimsB) {
      if (detectNegation(claimA, claimB)) {
        contradictions.push({
          probeIdA,
          probeIdB,
          claimA,
          claimB,
          severity: 0.8,
          type: "direct_negation",
        });
      } else if (detectHedgingShift(claimA, claimB)) {
        contradictions.push({
          probeIdA,
          probeIdB,
          claimA,
          claimB,
          severity: 0.4,
          type: "hedging_shift",
        });
      }
    }
  }

  return contradictions;
}

/**
 * Measure topic drift across a sequence of responses.
 */
export function measureTopicDrift(
  responses: ProbeResponse[],
): TopicDriftPoint[] {
  if (responses.length === 0) return [];

  const sorted = [...responses].sort(
    (a, b) => a.sequenceIndex - b.sequenceIndex,
  );

  const tfVectors = sorted.map((r) =>
    termFrequency(tokenize(r.response)),
  );

  const initialTF = tfVectors[0];

  return sorted.map((r, i) => {
    const topicSimilarity =
      i === 0 ? 1 : cosineSimilarity(initialTF, tfVectors[i]);
    const localSimilarity =
      i === 0 ? 1 : cosineSimilarity(tfVectors[i - 1], tfVectors[i]);

    // Get dominant topics from term frequencies
    const tf = tfVectors[i];
    const sortedTerms = [...tf.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const dominantTopics =
      r.topics ?? sortedTerms.map(([term]) => term);

    return {
      sequenceIndex: r.sequenceIndex,
      probeId: r.probeId,
      topicSimilarity,
      localSimilarity,
      dominantTopics: dominantTopics.slice(0, 5),
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Main scoring function                                             */
/* ------------------------------------------------------------------ */

/**
 * Compute comprehensive coherence scores for a set of probe responses.
 */
export function scoreCoherence(
  responses: ProbeResponse[],
): CoherenceResult {
  if (responses.length === 0) {
    return {
      overallScore: 0,
      consistencyScore: 0,
      contradictionScore: 0,
      logicalCoherenceScore: 0,
      topicDriftScore: 0,
      contradictions: [],
      topicDriftData: [],
      responseDetails: [],
    };
  }

  const sorted = [...responses].sort(
    (a, b) => a.sequenceIndex - b.sequenceIndex,
  );

  // Extract claims for each response
  const responseClaims = sorted.map((r) => ({
    ...r,
    claims: r.claims ?? extractClaims(r.response),
  }));

  // Compute internal coherence per response
  const internalScores = sorted.map((r) =>
    computeInternalCoherence(r.response),
  );

  // Compute pairwise consistency
  const tfVectors = sorted.map((r) =>
    termFrequency(tokenize(r.response)),
  );

  const pairwiseConsistency: number[][] = [];
  for (let i = 0; i < sorted.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < sorted.length; j++) {
      row.push(
        i === j ? 1 : cosineSimilarity(tfVectors[i], tfVectors[j]),
      );
    }
    pairwiseConsistency.push(row);
  }

  // Cross-reference consistency (average off-diagonal)
  let totalConsistency = 0;
  let pairCount = 0;
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      totalConsistency += pairwiseConsistency[i][j];
      pairCount++;
    }
  }
  const consistencyScore = pairCount > 0 ? totalConsistency / pairCount : 1;

  // Detect contradictions
  const allContradictions: Contradiction[] = [];
  for (let i = 0; i < responseClaims.length; i++) {
    for (let j = i + 1; j < responseClaims.length; j++) {
      const found = detectContradictions(
        responseClaims[i].probeId,
        responseClaims[i].claims,
        responseClaims[j].probeId,
        responseClaims[j].claims,
      );
      allContradictions.push(...found);
    }
  }

  // Contradiction score (normalized severity)
  const maxPossibleContradictions =
    (responseClaims.length * (responseClaims.length - 1)) / 2;
  const contradictionScore =
    maxPossibleContradictions > 0
      ? Math.min(
          1,
          allContradictions.reduce((s, c) => s + c.severity, 0) /
            maxPossibleContradictions,
        )
      : 0;

  // Topic drift
  const topicDriftData = measureTopicDrift(sorted);
  const topicDriftScore =
    topicDriftData.length > 1
      ? 1 -
        topicDriftData.reduce((s, d) => s + d.topicSimilarity, 0) /
          topicDriftData.length
      : 0;

  // Logical coherence (combination of internal coherence)
  const logicalCoherenceScore =
    internalScores.reduce((s, v) => s + v, 0) / internalScores.length;

  // Response-level details
  const responseDetails: ResponseCoherenceDetail[] = sorted.map((r, i) => {
    let crossRef = 0;
    let crossCount = 0;
    for (let j = 0; j < sorted.length; j++) {
      if (j !== i) {
        crossRef += pairwiseConsistency[i][j];
        crossCount++;
      }
    }

    return {
      probeId: r.probeId,
      sequenceIndex: r.sequenceIndex,
      internalCoherence: internalScores[i],
      crossReferenceScore:
        crossCount > 0 ? crossRef / crossCount : 1,
      contradictionCount: allContradictions.filter(
        (c) => c.probeIdA === r.probeId || c.probeIdB === r.probeId,
      ).length,
    };
  });

  // Overall score: weighted combination
  const overallScore =
    0.3 * consistencyScore +
    0.25 * (1 - contradictionScore) +
    0.25 * logicalCoherenceScore +
    0.2 * (1 - topicDriftScore);

  return {
    overallScore: Math.max(0, Math.min(1, overallScore)),
    consistencyScore,
    contradictionScore,
    logicalCoherenceScore,
    topicDriftScore,
    contradictions: allContradictions,
    topicDriftData,
    responseDetails,
  };
}

/* ------------------------------------------------------------------ */
/*  Visualization data                                                */
/* ------------------------------------------------------------------ */

/**
 * Generate visualization-ready data from coherence results.
 */
export function buildCoherenceVisualization(
  responses: ProbeResponse[],
  result: CoherenceResult,
): CoherenceVisualizationData {
  const sorted = [...responses].sort(
    (a, b) => a.sequenceIndex - b.sequenceIndex,
  );

  const sequenceData = result.responseDetails.map((detail) => {
    const drift = result.topicDriftData.find(
      (d) => d.probeId === detail.probeId,
    );
    return {
      index: detail.sequenceIndex,
      probeId: detail.probeId,
      coherence: detail.internalCoherence,
      consistency: detail.crossReferenceScore,
      topicDrift: drift ? 1 - drift.topicSimilarity : 0,
    };
  });

  const tfVectors = sorted.map((r) =>
    termFrequency(tokenize(r.response)),
  );

  const probeIds = sorted.map((r) => r.probeId);
  const matrix: number[][] = [];
  for (let i = 0; i < sorted.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < sorted.length; j++) {
      row.push(
        i === j ? 1 : cosineSimilarity(tfVectors[i], tfVectors[j]),
      );
    }
    matrix.push(row);
  }

  const coherenceValues = result.responseDetails.map(
    (d) => d.internalCoherence,
  );

  return {
    sequenceData,
    consistencyMatrix: { probeIds, matrix },
    summary: {
      meanCoherence: result.overallScore,
      minCoherence:
        coherenceValues.length > 0 ? Math.min(...coherenceValues) : 0,
      maxCoherence:
        coherenceValues.length > 0 ? Math.max(...coherenceValues) : 0,
      contradictionCount: result.contradictions.length,
      driftMagnitude: result.topicDriftScore,
    },
  };
}
