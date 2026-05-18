/**
 * Model capability fingerprint (Issue #362).
 * Hash probe response patterns into fingerprint vectors,
 * compute similarity (cosine, Jaccard), cluster models,
 * and detect version changes via fingerprint drift.
 */

import type { ProbeResult, Theory, ModelProvider } from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ModelFingerprint {
  /** Unique fingerprint ID. */
  id: string;
  /** Model name. */
  model: string;
  /** Model provider. */
  provider: ModelProvider;
  /** Fingerprint vector (score pattern per probe). */
  vector: number[];
  /** Probe IDs that make up the vector (order matters). */
  probeIds: string[];
  /** Binary feature flags for Jaccard comparison. */
  binaryFeatures: boolean[];
  /** Sha256-style hash of the vector (for quick comparison). */
  hash: string;
  /** ISO timestamp when fingerprint was generated. */
  createdAt: string;
  /** Number of probes used. */
  probeCount: number;
  /** Theory coverage scores. */
  theoryCoverage: Record<Theory, number>;
}

export interface SimilarityResult {
  /** Cosine similarity (-1 to 1). */
  cosine: number;
  /** Jaccard similarity (0 to 1). */
  jaccard: number;
  /** Euclidean distance. */
  euclidean: number;
  /** Manhattan distance. */
  manhattan: number;
  /** Weighted combined similarity. */
  combined: number;
}

export interface FingerprintDrift {
  /** Model being compared. */
  model: string;
  /** Provider. */
  provider: ModelProvider;
  /** Earlier fingerprint. */
  before: ModelFingerprint;
  /** Later fingerprint. */
  after: ModelFingerprint;
  /** Overall drift magnitude (0-1). */
  driftMagnitude: number;
  /** Per-theory drift. */
  theoryDrifts: Record<Theory, number>;
  /** Whether drift exceeds threshold. */
  drifted: boolean;
  /** Changed probes (score delta > threshold). */
  changedProbes: Array<{
    probeId: string;
    scoreBefore: number;
    scoreAfter: number;
    delta: number;
  }>;
}

export interface ModelCluster {
  /** Cluster label/ID. */
  id: number;
  /** Models in this cluster. */
  models: ModelFingerprint[];
  /** Centroid vector. */
  centroid: number[];
  /** Average intra-cluster similarity. */
  avgSimilarity: number;
}

/* ------------------------------------------------------------------ */
/*  Fingerprint Generation                                            */
/* ------------------------------------------------------------------ */

/**
 * Simple hash function for fingerprint vector.
 */
function hashVector(vector: number[]): string {
  let hash = 0;
  const str = vector.map((v) => v.toFixed(4)).join(",");
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

/**
 * Generate a fingerprint from probe results.
 *
 * @param model - Model name
 * @param provider - Model provider
 * @param results - Array of probe results
 * @param binaryThreshold - Score threshold for binary features (default 0.5)
 * @returns Model fingerprint
 */
export function generateFingerprint(
  model: string,
  provider: ModelProvider,
  results: ProbeResult[],
  binaryThreshold: number = 0.5
): ModelFingerprint {
  // Sort by probe name for consistent ordering
  const sorted = [...results].sort((a, b) =>
    a.probeName.localeCompare(b.probeName)
  );

  const vector = sorted.map((r) => r.score);
  const probeIds = sorted.map((r) => r.probeName);
  const binaryFeatures = sorted.map((r) => r.score >= binaryThreshold);

  // Theory coverage
  const theories: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];
  const theoryCoverage: Record<Theory, number> = {} as Record<Theory, number>;
  for (const theory of theories) {
    const theoryResults = sorted.filter((r) => r.theory === theory);
    theoryCoverage[theory] =
      theoryResults.length > 0
        ? theoryResults.reduce((sum, r) => sum + r.score, 0) /
          theoryResults.length
        : 0;
  }

  return {
    id: `fp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    model,
    provider,
    vector,
    probeIds,
    binaryFeatures,
    hash: hashVector(vector),
    createdAt: new Date().toISOString(),
    probeCount: sorted.length,
    theoryCoverage,
  };
}

/* ------------------------------------------------------------------ */
/*  Similarity Measures                                               */
/* ------------------------------------------------------------------ */

/**
 * Calculate cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dotProduct += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}

/**
 * Calculate Jaccard similarity between two binary feature sets.
 */
export function jaccardSimilarity(a: boolean[], b: boolean[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;

  let intersection = 0;
  let union = 0;

  for (let i = 0; i < len; i++) {
    if (a[i] || b[i]) union++;
    if (a[i] && b[i]) intersection++;
  }

  return union === 0 ? 0 : intersection / union;
}

/**
 * Calculate Euclidean distance between two vectors.
 */
export function euclideanDistance(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < len; i++) {
    sum += (a[i]! - b[i]!) ** 2;
  }
  return Math.sqrt(sum);
}

/**
 * Calculate Manhattan distance between two vectors.
 */
export function manhattanDistance(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < len; i++) {
    sum += Math.abs(a[i]! - b[i]!);
  }
  return sum;
}

/**
 * Compute full similarity comparison between two fingerprints.
 */
export function compareSimilarity(
  fpA: ModelFingerprint,
  fpB: ModelFingerprint
): SimilarityResult {
  const cosine = cosineSimilarity(fpA.vector, fpB.vector);
  const jaccard = jaccardSimilarity(fpA.binaryFeatures, fpB.binaryFeatures);
  const euclidean = euclideanDistance(fpA.vector, fpB.vector);
  const manhattan = manhattanDistance(fpA.vector, fpB.vector);

  // Normalize euclidean to 0-1 range for combination
  const maxEuclidean = Math.sqrt(fpA.vector.length); // max possible for 0-1 range
  const normalizedEuclidean =
    maxEuclidean > 0 ? 1 - euclidean / maxEuclidean : 1;

  const combined = cosine * 0.4 + jaccard * 0.3 + normalizedEuclidean * 0.3;

  return {
    cosine: Math.round(cosine * 10000) / 10000,
    jaccard: Math.round(jaccard * 10000) / 10000,
    euclidean: Math.round(euclidean * 10000) / 10000,
    manhattan: Math.round(manhattan * 10000) / 10000,
    combined: Math.round(combined * 10000) / 10000,
  };
}

/* ------------------------------------------------------------------ */
/*  Fingerprint Drift Detection                                       */
/* ------------------------------------------------------------------ */

/**
 * Detect drift between two fingerprints of the same model.
 *
 * @param before - Earlier fingerprint
 * @param after - Later fingerprint
 * @param threshold - Drift threshold (default 0.1)
 * @returns Drift analysis
 */
export function detectFingerprintDrift(
  before: ModelFingerprint,
  after: ModelFingerprint,
  threshold: number = 0.1
): FingerprintDrift {
  const similarity = compareSimilarity(before, after);
  const driftMagnitude = 1 - similarity.combined;

  // Per-theory drift
  const theories: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];
  const theoryDrifts: Record<Theory, number> = {} as Record<Theory, number>;
  for (const theory of theories) {
    theoryDrifts[theory] = Math.abs(
      (after.theoryCoverage[theory] ?? 0) -
        (before.theoryCoverage[theory] ?? 0)
    );
  }

  // Identify changed probes
  const changedProbes: FingerprintDrift["changedProbes"] = [];
  const commonProbes = before.probeIds.filter((id) =>
    after.probeIds.includes(id)
  );
  for (const probeId of commonProbes) {
    const idxBefore = before.probeIds.indexOf(probeId);
    const idxAfter = after.probeIds.indexOf(probeId);
    const scoreBefore = before.vector[idxBefore]!;
    const scoreAfter = after.vector[idxAfter]!;
    const delta = Math.abs(scoreAfter - scoreBefore);
    if (delta > threshold) {
      changedProbes.push({ probeId, scoreBefore, scoreAfter, delta });
    }
  }

  changedProbes.sort((a, b) => b.delta - a.delta);

  return {
    model: after.model,
    provider: after.provider,
    before,
    after,
    driftMagnitude: Math.round(driftMagnitude * 10000) / 10000,
    theoryDrifts,
    drifted: driftMagnitude > threshold,
    changedProbes,
  };
}

/* ------------------------------------------------------------------ */
/*  Clustering                                                        */
/* ------------------------------------------------------------------ */

/**
 * Cluster models by fingerprint similarity using simple k-means.
 *
 * @param fingerprints - Array of fingerprints to cluster
 * @param k - Number of clusters
 * @param maxIterations - Maximum iterations (default 50)
 * @returns Array of model clusters
 */
export function clusterFingerprints(
  fingerprints: ModelFingerprint[],
  k: number,
  maxIterations: number = 50
): ModelCluster[] {
  if (fingerprints.length === 0) return [];
  if (k >= fingerprints.length) {
    return fingerprints.map((fp, i) => ({
      id: i,
      models: [fp],
      centroid: fp.vector,
      avgSimilarity: 1,
    }));
  }

  const vectorLen = Math.max(...fingerprints.map((fp) => fp.vector.length));

  // Pad vectors to uniform length
  const padded = fingerprints.map((fp) => {
    const v = [...fp.vector];
    while (v.length < vectorLen) v.push(0);
    return v;
  });

  // Initialize centroids with k-means++ style
  const centroids: number[][] = [];
  centroids.push([...padded[0]!]);

  for (let c = 1; c < k; c++) {
    const distances = padded.map((v) => {
      const minDist = Math.min(
        ...centroids.map((cent) => euclideanDistance(v, cent))
      );
      return minDist * minDist;
    });
    const totalDist = distances.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalDist;
    for (let i = 0; i < distances.length; i++) {
      r -= distances[i]!;
      if (r <= 0) {
        centroids.push([...padded[i]!]);
        break;
      }
    }
    if (centroids.length === c) {
      centroids.push([...padded[c]!]);
    }
  }

  // K-means iterations
  let assignments = new Array<number>(fingerprints.length).fill(0);

  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign each fingerprint to nearest centroid
    const newAssignments = padded.map((v) => {
      let minDist = Infinity;
      let bestCluster = 0;
      for (let c = 0; c < k; c++) {
        const dist = euclideanDistance(v, centroids[c]!);
        if (dist < minDist) {
          minDist = dist;
          bestCluster = c;
        }
      }
      return bestCluster;
    });

    // Check convergence
    const changed = newAssignments.some((a, i) => a !== assignments[i]);
    assignments = newAssignments;
    if (!changed) break;

    // Update centroids
    for (let c = 0; c < k; c++) {
      const members = padded.filter((_, i) => assignments[i] === c);
      if (members.length === 0) continue;
      for (let d = 0; d < vectorLen; d++) {
        centroids[c]![d] =
          members.reduce((sum, m) => sum + m[d]!, 0) / members.length;
      }
    }
  }

  // Build clusters
  const clusters: ModelCluster[] = [];
  for (let c = 0; c < k; c++) {
    const memberIndices = assignments
      .map((a, i) => (a === c ? i : -1))
      .filter((i) => i >= 0);
    const members = memberIndices.map((i) => fingerprints[i]!);

    if (members.length === 0) continue;

    // Calculate average intra-cluster similarity
    let totalSim = 0;
    let pairs = 0;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        totalSim += cosineSimilarity(members[i]!.vector, members[j]!.vector);
        pairs++;
      }
    }

    clusters.push({
      id: c,
      models: members,
      centroid: centroids[c]!,
      avgSimilarity: pairs > 0 ? Math.round((totalSim / pairs) * 10000) / 10000 : 1,
    });
  }

  return clusters;
}

/**
 * Find the most similar models to a given fingerprint.
 */
export function findSimilarModels(
  target: ModelFingerprint,
  candidates: ModelFingerprint[],
  topK: number = 5
): Array<{ fingerprint: ModelFingerprint; similarity: SimilarityResult }> {
  return candidates
    .filter((c) => c.id !== target.id)
    .map((fp) => ({
      fingerprint: fp,
      similarity: compareSimilarity(target, fp),
    }))
    .sort((a, b) => b.similarity.combined - a.similarity.combined)
    .slice(0, topK);
}
