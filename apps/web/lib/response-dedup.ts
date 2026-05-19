/**
 * Response deduplication (Issue #468).
 * Content hash, near-duplicate with similarity threshold,
 * dedup statistics, configurable strategy, audit trail.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type DedupStrategy = "exact" | "near-duplicate" | "hybrid";

export interface DedupConfig {
  /** Deduplication strategy. */
  strategy: DedupStrategy;
  /** Similarity threshold for near-duplicate detection (0-1, default 0.85). */
  similarityThreshold: number;
  /** Number of shingle tokens for near-duplicate detection (default 3). */
  shingleSize: number;
  /** Whether to keep an audit trail of dedup decisions. */
  enableAuditTrail: boolean;
  /** Max number of fingerprints to keep in memory. */
  maxFingerprints: number;
}

export interface DedupResult {
  isDuplicate: boolean;
  /** The ID of the original response this is a duplicate of (if any). */
  originalId?: string;
  /** Similarity score (1.0 for exact match). */
  similarity: number;
  /** Hash of the content. */
  contentHash: string;
  strategy: DedupStrategy;
}

export interface DedupAuditEntry {
  timestamp: string;
  responseId: string;
  contentHash: string;
  isDuplicate: boolean;
  originalId?: string;
  similarity: number;
  strategy: DedupStrategy;
}

export interface DedupStatistics {
  totalProcessed: number;
  totalDuplicates: number;
  duplicateRate: number;
  exactDuplicates: number;
  nearDuplicates: number;
  uniqueResponses: number;
  averageSimilarity: number;
  topDuplicatedHashes: Array<{ hash: string; count: number }>;
}

/* ------------------------------------------------------------------ */
/*  Default config                                                    */
/* ------------------------------------------------------------------ */

const DEFAULT_CONFIG: DedupConfig = {
  strategy: "hybrid",
  similarityThreshold: 0.85,
  shingleSize: 3,
  enableAuditTrail: true,
  maxFingerprints: 50_000,
};

/* ------------------------------------------------------------------ */
/*  Hashing                                                           */
/* ------------------------------------------------------------------ */

/**
 * FNV-1a 32-bit hash — fast, deterministic, no crypto dependency.
 */
function fnv1a32(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Content hash: normalise whitespace, lowercase, then hash. */
export function contentHash(text: string): string {
  const normalised = text.trim().replace(/\s+/g, " ").toLowerCase();
  return fnv1a32(normalised).toString(16).padStart(8, "0");
}

/* ------------------------------------------------------------------ */
/*  Shingling & MinHash for near-duplicate detection                  */
/* ------------------------------------------------------------------ */

/** Generate character-level shingles from text. */
function shingle(text: string, size: number): Set<string> {
  const normalised = text.trim().replace(/\s+/g, " ").toLowerCase();
  const tokens = normalised.split(" ");
  const shingles = new Set<string>();
  for (let i = 0; i <= tokens.length - size; i++) {
    shingles.add(tokens.slice(i, i + size).join(" "));
  }
  return shingles;
}

/** Jaccard similarity between two sets. */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Generate a MinHash signature for a set of shingles. */
function minHashSignature(
  shingles: Set<string>,
  numHashes: number = 128,
): Uint32Array {
  const sig = new Uint32Array(numHashes).fill(0xffffffff);
  for (const s of shingles) {
    for (let i = 0; i < numHashes; i++) {
      const h = fnv1a32(`${i}::${s}`);
      if (h < sig[i]) sig[i] = h;
    }
  }
  return sig;
}

/** Estimate Jaccard similarity from two MinHash signatures. */
function minHashSimilarity(a: Uint32Array, b: Uint32Array): number {
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) matches++;
  }
  return matches / a.length;
}

/* ------------------------------------------------------------------ */
/*  ResponseDeduplicator                                              */
/* ------------------------------------------------------------------ */

interface StoredFingerprint {
  id: string;
  hash: string;
  signature: Uint32Array;
  shingles: Set<string>;
}

export class ResponseDeduplicator {
  private readonly config: DedupConfig;
  private fingerprints: StoredFingerprint[] = [];
  private hashIndex = new Map<string, string[]>(); // hash -> [responseId]
  private auditTrail: DedupAuditEntry[] = [];
  private stats = {
    totalProcessed: 0,
    exactDuplicates: 0,
    nearDuplicates: 0,
    similaritySum: 0,
  };

  constructor(config: Partial<DedupConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Check a response for duplicates and register it. */
  check(responseId: string, text: string): DedupResult {
    this.stats.totalProcessed++;

    const hash = contentHash(text);

    // Exact duplicate check
    if (
      this.config.strategy === "exact" ||
      this.config.strategy === "hybrid"
    ) {
      const existing = this.hashIndex.get(hash);
      if (existing && existing.length > 0) {
        this.stats.exactDuplicates++;
        const result: DedupResult = {
          isDuplicate: true,
          originalId: existing[0],
          similarity: 1.0,
          contentHash: hash,
          strategy: "exact",
        };
        this.recordAudit(responseId, result);
        this.registerFingerprint(responseId, hash, text);
        return result;
      }
    }

    // Near-duplicate check
    if (
      this.config.strategy === "near-duplicate" ||
      this.config.strategy === "hybrid"
    ) {
      const shingles = shingle(text, this.config.shingleSize);
      const signature = minHashSignature(shingles);

      let bestSimilarity = 0;
      let bestMatchId: string | undefined;

      for (const fp of this.fingerprints) {
        // Quick MinHash estimate first
        const estSim = minHashSimilarity(signature, fp.signature);
        if (estSim >= this.config.similarityThreshold * 0.8) {
          // Verify with exact Jaccard
          const exactSim = jaccardSimilarity(shingles, fp.shingles);
          if (exactSim > bestSimilarity) {
            bestSimilarity = exactSim;
            bestMatchId = fp.id;
          }
        }
      }

      this.stats.similaritySum += bestSimilarity;

      if (
        bestSimilarity >= this.config.similarityThreshold &&
        bestMatchId
      ) {
        this.stats.nearDuplicates++;
        const result: DedupResult = {
          isDuplicate: true,
          originalId: bestMatchId,
          similarity: bestSimilarity,
          contentHash: hash,
          strategy: "near-duplicate",
        };
        this.recordAudit(responseId, result);
        this.registerFingerprint(responseId, hash, text);
        return result;
      }
    }

    // Not a duplicate
    const result: DedupResult = {
      isDuplicate: false,
      similarity: 0,
      contentHash: hash,
      strategy: this.config.strategy,
    };
    this.recordAudit(responseId, result);
    this.registerFingerprint(responseId, hash, text);
    return result;
  }

  private registerFingerprint(
    id: string,
    hash: string,
    text: string,
  ): void {
    // Enforce max fingerprints
    if (this.fingerprints.length >= this.config.maxFingerprints) {
      const removed = this.fingerprints.shift();
      if (removed) {
        const ids = this.hashIndex.get(removed.hash);
        if (ids) {
          const idx = ids.indexOf(removed.id);
          if (idx >= 0) ids.splice(idx, 1);
          if (ids.length === 0) this.hashIndex.delete(removed.hash);
        }
      }
    }

    const shingles = shingle(text, this.config.shingleSize);
    const signature = minHashSignature(shingles);

    this.fingerprints.push({ id, hash, signature, shingles });

    const existing = this.hashIndex.get(hash) ?? [];
    existing.push(id);
    this.hashIndex.set(hash, existing);
  }

  private recordAudit(responseId: string, result: DedupResult): void {
    if (!this.config.enableAuditTrail) return;
    this.auditTrail.push({
      timestamp: new Date().toISOString(),
      responseId,
      contentHash: result.contentHash,
      isDuplicate: result.isDuplicate,
      originalId: result.originalId,
      similarity: result.similarity,
      strategy: result.strategy,
    });
  }

  /** Get deduplication statistics. */
  getStatistics(): DedupStatistics {
    const totalDuplicates =
      this.stats.exactDuplicates + this.stats.nearDuplicates;

    // Top duplicated hashes
    const hashCounts = new Map<string, number>();
    for (const [hash, ids] of this.hashIndex) {
      if (ids.length > 1) {
        hashCounts.set(hash, ids.length);
      }
    }
    const topHashes = Array.from(hashCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([hash, count]) => ({ hash, count }));

    return {
      totalProcessed: this.stats.totalProcessed,
      totalDuplicates,
      duplicateRate:
        this.stats.totalProcessed > 0
          ? totalDuplicates / this.stats.totalProcessed
          : 0,
      exactDuplicates: this.stats.exactDuplicates,
      nearDuplicates: this.stats.nearDuplicates,
      uniqueResponses: this.stats.totalProcessed - totalDuplicates,
      averageSimilarity:
        this.stats.totalProcessed > 0
          ? this.stats.similaritySum / this.stats.totalProcessed
          : 0,
      topDuplicatedHashes: topHashes,
    };
  }

  /** Get the audit trail. */
  getAuditTrail(): readonly DedupAuditEntry[] {
    return this.auditTrail;
  }

  /** Clear all state. */
  reset(): void {
    this.fingerprints = [];
    this.hashIndex.clear();
    this.auditTrail = [];
    this.stats = {
      totalProcessed: 0,
      exactDuplicates: 0,
      nearDuplicates: 0,
      similaritySum: 0,
    };
  }
}
