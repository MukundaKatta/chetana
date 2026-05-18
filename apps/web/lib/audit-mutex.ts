/**
 * Audit start mutex (Issue #353).
 * Prevents concurrent audit starts for the same user+model combination.
 * Uses in-memory locks with automatic expiry.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Lock {
  lockId: string;
  userId: string;
  modelId: string;
  acquiredAt: number;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// AuditMutex
// ---------------------------------------------------------------------------

/**
 * In-process mutex that prevents a user from starting multiple audits
 * for the same model concurrently. Locks auto-expire after a configurable
 * TTL (default 60 s) to prevent stale locks from blocking new audits
 * if a previous request crashed.
 *
 * @example
 * ```ts
 * const mutex = new AuditMutex();
 *
 * const lockId = mutex.acquire("user_123", "claude-3-5-sonnet");
 * if (!lockId) {
 *   throw new Error("An audit for this model is already running.");
 * }
 *
 * try {
 *   await runAudit(userId, modelId);
 * } finally {
 *   mutex.release(lockId);
 * }
 * ```
 */
export class AuditMutex {
  private locks = new Map<string, Lock>();
  private readonly ttlMs: number;

  /**
   * @param ttlMs - Lock time-to-live in milliseconds (default 60 000).
   */
  constructor(ttlMs: number = 60_000) {
    this.ttlMs = ttlMs;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Attempts to acquire a lock for the given `userId` + `modelId` pair.
   *
   * @returns A unique `lockId` string on success, or `false` if a lock
   *          already exists and has not expired.
   */
  acquire(userId: string, modelId: string): string | false {
    this.evictExpired();

    const key = this.compositeKey(userId, modelId);

    if (this.locks.has(key)) {
      return false;
    }

    const now = Date.now();
    const lockId = `lock_${now.toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

    this.locks.set(key, {
      lockId,
      userId,
      modelId,
      acquiredAt: now,
      expiresAt: now + this.ttlMs,
    });

    return lockId;
  }

  /**
   * Releases the lock identified by `lockId`.
   * No-op if the lock has already expired or been released.
   */
  release(lockId: string): void {
    for (const [key, lock] of this.locks) {
      if (lock.lockId === lockId) {
        this.locks.delete(key);
        return;
      }
    }
  }

  /**
   * Returns `true` if a non-expired lock exists for the given pair.
   */
  isLocked(userId: string, modelId: string): boolean {
    this.evictExpired();
    return this.locks.has(this.compositeKey(userId, modelId));
  }

  /**
   * Returns the number of currently held (non-expired) locks.
   * Useful for monitoring / tests.
   */
  get size(): number {
    this.evictExpired();
    return this.locks.size;
  }

  /**
   * Clears all locks. Intended for test teardown.
   */
  clear(): void {
    this.locks.clear();
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private compositeKey(userId: string, modelId: string): string {
    return `${userId}::${modelId}`;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, lock] of this.locks) {
      if (now >= lock.expiresAt) {
        this.locks.delete(key);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Deduplication key generator
// ---------------------------------------------------------------------------

/**
 * Generates a deterministic deduplication key for an audit-start request.
 * Requests that share the same key within `windowMs` are considered
 * duplicates.
 *
 * @param userId    - The user starting the audit.
 * @param modelId   - The model being audited.
 * @param timestamp - The request timestamp (ms since epoch).
 * @param windowMs  - Dedup window in milliseconds (default 5 000).
 */
export function generateDeduplicationKey(
  userId: string,
  modelId: string,
  timestamp: number,
  windowMs: number = 5_000
): string {
  // Quantise the timestamp to the dedup window so requests that arrive
  // within the same window produce the same key.
  const bucket = Math.floor(timestamp / windowMs);
  return `dedup:${userId}:${modelId}:${bucket}`;
}
