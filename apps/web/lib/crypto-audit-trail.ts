/**
 * Cryptographic audit trail (Issue #494).
 * Hash chain, digital signatures, integrity verification,
 * tamper detection, export verifiable trail.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface AuditTrailEntry {
  /** Unique entry identifier. */
  id: string;
  /** Sequence number (monotonically increasing). */
  sequence: number;
  /** ISO timestamp. */
  timestamp: string;
  /** Who performed the action. */
  actorId: string;
  /** Action type. */
  action: string;
  /** Arbitrary payload. */
  payload: Record<string, unknown>;
  /** SHA-256 hash of the previous entry (empty string for genesis). */
  previousHash: string;
  /** SHA-256 hash of this entry's content. */
  hash: string;
  /** Digital signature of the hash (hex-encoded HMAC-SHA-256). */
  signature: string;
}

export interface TrailConfig {
  /** HMAC signing key (should be stored securely in production). */
  signingKey: string;
  /** Hash algorithm (default "SHA-256"). */
  hashAlgorithm: string;
  /** Maximum entries to hold in memory (default 10000). */
  maxInMemory: number;
}

export interface VerificationResult {
  valid: boolean;
  entries: number;
  firstSequence: number;
  lastSequence: number;
  errors: VerificationError[];
  verifiedAt: string;
}

export interface VerificationError {
  sequence: number;
  entryId: string;
  type: "hash_mismatch" | "chain_break" | "signature_invalid" | "sequence_gap" | "timestamp_regression";
  expected: string;
  actual: string;
  message: string;
}

export interface TamperDetectionResult {
  tampered: boolean;
  suspiciousEntries: number[];
  details: VerificationError[];
  checkedAt: string;
}

export interface ExportedTrail {
  version: number;
  algorithm: string;
  entries: AuditTrailEntry[];
  metadata: {
    totalEntries: number;
    firstEntry: string;
    lastEntry: string;
    exportedAt: string;
    exportedBy: string;
  };
  trailHash: string;
}

/* ------------------------------------------------------------------ */
/*  Crypto helpers (Web Crypto API compatible)                        */
/* ------------------------------------------------------------------ */

async function sha256(data: string): Promise<string> {
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.subtle) {
    const encoded = new TextEncoder().encode(data);
    const buffer = await globalThis.crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // Fallback: simple hash for environments without Web Crypto
  return simpleSha256(data);
}

async function hmacSha256(key: string, data: string): Promise<string> {
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.subtle) {
    const keyData = new TextEncoder().encode(key);
    const cryptoKey = await globalThis.crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const encoded = new TextEncoder().encode(data);
    const buffer = await globalThis.crypto.subtle.sign("HMAC", cryptoKey, encoded);
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // Fallback
  return simpleSha256(key + ":" + data);
}

/**
 * Simple deterministic hash fallback (NOT cryptographically secure).
 * Used only when Web Crypto is unavailable (e.g., tests).
 */
function simpleSha256(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  // Extend to 64 hex chars for consistent format
  const h1 = (hash >>> 0).toString(16).padStart(8, "0");
  let hash2 = 0x6c62272e;
  for (let i = 0; i < input.length; i++) {
    hash2 ^= input.charCodeAt(i);
    hash2 = Math.imul(hash2, 0x01000193);
  }
  const h2 = (hash2 >>> 0).toString(16).padStart(8, "0");

  let hash3 = 0xcbf29ce4;
  for (let i = input.length - 1; i >= 0; i--) {
    hash3 ^= input.charCodeAt(i);
    hash3 = Math.imul(hash3, 0x01000193);
  }
  const h3 = (hash3 >>> 0).toString(16).padStart(8, "0");

  let hash4 = 0x84222325;
  for (let i = 0; i < input.length; i++) {
    hash4 = ((hash4 << 5) - hash4 + input.charCodeAt(i)) | 0;
  }
  const h4 = (hash4 >>> 0).toString(16).padStart(8, "0");

  return (h1 + h2 + h3 + h4).padEnd(64, "0");
}

/* ------------------------------------------------------------------ */
/*  Content serialization                                             */
/* ------------------------------------------------------------------ */

function serializeContent(entry: {
  sequence: number;
  timestamp: string;
  actorId: string;
  action: string;
  payload: Record<string, unknown>;
  previousHash: string;
}): string {
  return JSON.stringify({
    sequence: entry.sequence,
    timestamp: entry.timestamp,
    actorId: entry.actorId,
    action: entry.action,
    payload: entry.payload,
    previousHash: entry.previousHash,
  });
}

/* ------------------------------------------------------------------ */
/*  Audit Trail                                                       */
/* ------------------------------------------------------------------ */

const DEFAULT_CONFIG: TrailConfig = {
  signingKey: "chetana-default-signing-key",
  hashAlgorithm: "SHA-256",
  maxInMemory: 10_000,
};

export class CryptoAuditTrail {
  private config: TrailConfig;
  private entries: AuditTrailEntry[] = [];
  private nextSequence = 1;

  constructor(config?: Partial<TrailConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /* -- Append ------------------------------------------------------- */

  async append(
    actorId: string,
    action: string,
    payload: Record<string, unknown>
  ): Promise<AuditTrailEntry> {
    const sequence = this.nextSequence++;
    const timestamp = new Date().toISOString();
    const previousHash =
      this.entries.length > 0
        ? this.entries[this.entries.length - 1].hash
        : "";

    const content = serializeContent({
      sequence,
      timestamp,
      actorId,
      action,
      payload,
      previousHash,
    });

    const hash = await sha256(content);
    const signature = await hmacSha256(this.config.signingKey, hash);

    const entry: AuditTrailEntry = {
      id: `trail_${sequence}_${Date.now().toString(36)}`,
      sequence,
      timestamp,
      actorId,
      action,
      payload,
      previousHash,
      hash,
      signature,
    };

    this.entries.push(entry);

    // Trim if exceeds memory limit
    if (this.entries.length > this.config.maxInMemory) {
      this.entries.splice(0, this.entries.length - this.config.maxInMemory);
    }

    return entry;
  }

  /* -- Verification ------------------------------------------------- */

  async verify(entries?: AuditTrailEntry[]): Promise<VerificationResult> {
    const trail = entries ?? this.entries;
    const errors: VerificationError[] = [];

    if (trail.length === 0) {
      return {
        valid: true,
        entries: 0,
        firstSequence: 0,
        lastSequence: 0,
        errors: [],
        verifiedAt: new Date().toISOString(),
      };
    }

    for (let i = 0; i < trail.length; i++) {
      const entry = trail[i];
      const prev = i > 0 ? trail[i - 1] : null;

      // Check sequence continuity
      if (prev && entry.sequence !== prev.sequence + 1) {
        errors.push({
          sequence: entry.sequence,
          entryId: entry.id,
          type: "sequence_gap",
          expected: String(prev.sequence + 1),
          actual: String(entry.sequence),
          message: `Sequence gap: expected ${prev.sequence + 1}, got ${entry.sequence}.`,
        });
      }

      // Check timestamp doesn't regress
      if (prev && entry.timestamp < prev.timestamp) {
        errors.push({
          sequence: entry.sequence,
          entryId: entry.id,
          type: "timestamp_regression",
          expected: `>= ${prev.timestamp}`,
          actual: entry.timestamp,
          message: `Timestamp regression at sequence ${entry.sequence}.`,
        });
      }

      // Verify hash chain
      const expectedPrevHash = prev ? prev.hash : "";
      if (entry.previousHash !== expectedPrevHash) {
        errors.push({
          sequence: entry.sequence,
          entryId: entry.id,
          type: "chain_break",
          expected: expectedPrevHash,
          actual: entry.previousHash,
          message: `Chain broken at sequence ${entry.sequence}: previousHash mismatch.`,
        });
      }

      // Recompute and verify content hash
      const content = serializeContent({
        sequence: entry.sequence,
        timestamp: entry.timestamp,
        actorId: entry.actorId,
        action: entry.action,
        payload: entry.payload,
        previousHash: entry.previousHash,
      });

      const recomputedHash = await sha256(content);
      if (recomputedHash !== entry.hash) {
        errors.push({
          sequence: entry.sequence,
          entryId: entry.id,
          type: "hash_mismatch",
          expected: recomputedHash,
          actual: entry.hash,
          message: `Hash mismatch at sequence ${entry.sequence}: content has been modified.`,
        });
      }

      // Verify signature
      const recomputedSig = await hmacSha256(this.config.signingKey, entry.hash);
      if (recomputedSig !== entry.signature) {
        errors.push({
          sequence: entry.sequence,
          entryId: entry.id,
          type: "signature_invalid",
          expected: recomputedSig,
          actual: entry.signature,
          message: `Invalid signature at sequence ${entry.sequence}.`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      entries: trail.length,
      firstSequence: trail[0].sequence,
      lastSequence: trail[trail.length - 1].sequence,
      errors,
      verifiedAt: new Date().toISOString(),
    };
  }

  /* -- Tamper detection ---------------------------------------------- */

  async detectTampering(
    entries?: AuditTrailEntry[]
  ): Promise<TamperDetectionResult> {
    const result = await this.verify(entries);

    const suspiciousEntries = Array.from(
      new Set(result.errors.map((e) => e.sequence))
    ).sort((a, b) => a - b);

    return {
      tampered: !result.valid,
      suspiciousEntries,
      details: result.errors,
      checkedAt: new Date().toISOString(),
    };
  }

  /* -- Export ------------------------------------------------------- */

  async exportTrail(exportedBy: string): Promise<ExportedTrail> {
    const entries = [...this.entries];

    // Compute overall trail hash
    const trailContent = entries.map((e) => e.hash).join("|");
    const trailHash = await sha256(trailContent);

    return {
      version: 1,
      algorithm: this.config.hashAlgorithm,
      entries,
      metadata: {
        totalEntries: entries.length,
        firstEntry: entries[0]?.timestamp ?? "",
        lastEntry: entries[entries.length - 1]?.timestamp ?? "",
        exportedAt: new Date().toISOString(),
        exportedBy,
      },
      trailHash,
    };
  }

  /**
   * Import and verify a previously exported trail.
   */
  async importAndVerify(exported: ExportedTrail): Promise<{
    valid: boolean;
    trailHashValid: boolean;
    verification: VerificationResult;
  }> {
    // Verify trail hash
    const trailContent = exported.entries.map((e) => e.hash).join("|");
    const recomputedTrailHash = await sha256(trailContent);
    const trailHashValid = recomputedTrailHash === exported.trailHash;

    // Verify individual entries
    const verification = await this.verify(exported.entries);

    return {
      valid: trailHashValid && verification.valid,
      trailHashValid,
      verification,
    };
  }

  /* -- Query -------------------------------------------------------- */

  getEntries(filter?: {
    actorId?: string;
    action?: string;
    fromSequence?: number;
    toSequence?: number;
    fromTimestamp?: string;
    toTimestamp?: string;
  }): AuditTrailEntry[] {
    if (!filter) return [...this.entries];

    return this.entries.filter((entry) => {
      if (filter.actorId && entry.actorId !== filter.actorId) return false;
      if (filter.action && entry.action !== filter.action) return false;
      if (filter.fromSequence && entry.sequence < filter.fromSequence) return false;
      if (filter.toSequence && entry.sequence > filter.toSequence) return false;
      if (filter.fromTimestamp && entry.timestamp < filter.fromTimestamp) return false;
      if (filter.toTimestamp && entry.timestamp > filter.toTimestamp) return false;
      return true;
    });
  }

  getLatest(n: number = 10): AuditTrailEntry[] {
    return this.entries.slice(-n);
  }

  getEntry(sequence: number): AuditTrailEntry | undefined {
    return this.entries.find((e) => e.sequence === sequence);
  }

  get length(): number {
    return this.entries.length;
  }

  /**
   * Clear all entries (for testing).
   */
  clear(): void {
    this.entries = [];
    this.nextSequence = 1;
  }
}
