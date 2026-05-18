/**
 * Issue #432 - Idempotency key middleware
 *
 * Accept Idempotency-Key header,
 * store request/response pairs, return cached for duplicates,
 * key expiration, conflict detection.
 */

import { NextRequest, NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface IdempotencyEntry {
  key: string;
  requestHash: string;
  statusCode: number;
  responseBody: string;
  responseHeaders: Record<string, string>;
  createdAt: number;
  expiresAt: number;
  locked: boolean;
}

export interface IdempotencyConfig {
  /** Header name to read the idempotency key from (default: "Idempotency-Key"). */
  headerName: string;
  /** Time-to-live for cached entries in ms (default: 24 hours). */
  ttlMs: number;
  /** Max key length (default: 256). */
  maxKeyLength: number;
  /** Maximum stored entries before cleanup (default: 10,000). */
  maxEntries: number;
  /** Lock timeout in ms to prevent concurrent processing (default: 30s). */
  lockTimeoutMs: number;
}

export interface IdempotencyResult {
  /** Whether a cached response was found. */
  cached: boolean;
  /** The cached response (if found). */
  response: NextResponse | null;
  /** The idempotency key used. */
  key: string | null;
  /** Whether there was a conflict (same key, different request body). */
  conflict: boolean;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const DEFAULT_CONFIG: IdempotencyConfig = {
  headerName: "Idempotency-Key",
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours
  maxKeyLength: 256,
  maxEntries: 10_000,
  lockTimeoutMs: 30_000,
};

/* ------------------------------------------------------------------ */
/*  In-Memory Store                                                   */
/* ------------------------------------------------------------------ */

export class IdempotencyStore {
  private entries: Map<string, IdempotencyEntry> = new Map();
  private config: IdempotencyConfig;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<IdempotencyConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Periodic cleanup
    if (typeof setInterval !== "undefined") {
      this.cleanupTimer = setInterval(() => this.cleanup(), 60_000);
    }
  }

  /** Get a cached entry by key. */
  get(key: string): IdempotencyEntry | null {
    const entry = this.entries.get(key);
    if (!entry) return null;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      return null;
    }

    return entry;
  }

  /** Store a response for a key. */
  set(
    key: string,
    requestHash: string,
    statusCode: number,
    responseBody: string,
    responseHeaders: Record<string, string> = {},
  ): IdempotencyEntry {
    const entry: IdempotencyEntry = {
      key,
      requestHash,
      statusCode,
      responseBody,
      responseHeaders,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.ttlMs,
      locked: false,
    };

    this.entries.set(key, entry);

    // Enforce max entries
    if (this.entries.size > this.config.maxEntries) {
      this.cleanup();
    }

    return entry;
  }

  /** Acquire a lock for processing a key. Returns true if lock acquired. */
  lock(key: string): boolean {
    const existing = this.entries.get(key);

    if (existing) {
      if (existing.locked) {
        // Check if lock has timed out
        const lockAge = Date.now() - existing.createdAt;
        if (lockAge < this.config.lockTimeoutMs) {
          return false; // Still locked
        }
        // Lock timed out, remove stale entry
        this.entries.delete(key);
      } else {
        return false; // Entry exists and isn't locked (already completed)
      }
    }

    // Create a lock placeholder
    this.entries.set(key, {
      key,
      requestHash: "",
      statusCode: 0,
      responseBody: "",
      responseHeaders: {},
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.ttlMs,
      locked: true,
    });

    return true;
  }

  /** Release a lock (on error). */
  unlock(key: string): void {
    const entry = this.entries.get(key);
    if (entry?.locked) {
      this.entries.delete(key);
    }
  }

  /** Check if a key exists (cached or locked). */
  has(key: string): boolean {
    const entry = this.entries.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      return false;
    }
    return true;
  }

  /** Remove expired entries and enforce max size. */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.entries) {
      if (now > entry.expiresAt) {
        this.entries.delete(key);
        removed++;
      }
    }

    // If still over max, remove oldest entries
    if (this.entries.size > this.config.maxEntries) {
      const sorted = Array.from(this.entries.entries())
        .sort(([, a], [, b]) => a.createdAt - b.createdAt);

      const toRemove = sorted.slice(0, this.entries.size - this.config.maxEntries);
      for (const [key] of toRemove) {
        this.entries.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /** Get the number of stored entries. */
  get size(): number {
    return this.entries.size;
  }

  /** Clear all entries. */
  clear(): void {
    this.entries.clear();
  }

  /** Destroy the store and stop cleanup timer. */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.entries.clear();
  }
}

/* ------------------------------------------------------------------ */
/*  Hash Helper                                                       */
/* ------------------------------------------------------------------ */

/**
 * Simple hash of the request body for conflict detection.
 * Uses a fast non-crypto hash (FNV-1a variant).
 */
export function hashRequestBody(body: string | null, method: string, url: string): string {
  const input = `${method}:${url}:${body ?? ""}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash.toString(36);
}

/* ------------------------------------------------------------------ */
/*  Middleware                                                         */
/* ------------------------------------------------------------------ */

/** Global store instance (process-level singleton for serverless). */
let _store: IdempotencyStore | null = null;

function getStore(config?: Partial<IdempotencyConfig>): IdempotencyStore {
  if (!_store) {
    _store = new IdempotencyStore(config);
  }
  return _store;
}

export { getStore as getIdempotencyStore };

/**
 * Idempotency middleware for Next.js API routes.
 *
 * Usage in a route handler:
 * ```ts
 * const idem = await checkIdempotency(request);
 * if (idem.cached) return idem.response!;
 * if (idem.conflict) return NextResponse.json({ error: 'Conflict' }, { status: 409 });
 *
 * // ... process request ...
 *
 * const response = NextResponse.json({ ... });
 * await storeIdempotencyResponse(idem.key!, request, response);
 * return response;
 * ```
 */
export async function checkIdempotency(
  request: NextRequest,
  config?: Partial<IdempotencyConfig>,
): Promise<IdempotencyResult> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const store = getStore(config);
  const key = request.headers.get(fullConfig.headerName);

  // No idempotency key provided - proceed normally
  if (!key) {
    return { cached: false, response: null, key: null, conflict: false };
  }

  // Validate key length
  if (key.length > fullConfig.maxKeyLength) {
    return {
      cached: true,
      response: NextResponse.json(
        { error: `Idempotency key exceeds maximum length of ${fullConfig.maxKeyLength}` },
        { status: 400 },
      ),
      key,
      conflict: false,
    };
  }

  // Check for existing entry
  const existing = store.get(key);

  if (existing && !existing.locked) {
    // Compute hash of current request for conflict detection
    const body = await request.clone().text();
    const requestHash = hashRequestBody(body, request.method, request.nextUrl.pathname);

    if (existing.requestHash !== requestHash) {
      // Same key, different request - conflict
      return {
        cached: false,
        response: NextResponse.json(
          {
            error: "Idempotency key conflict: this key was used with a different request",
          },
          { status: 422 },
        ),
        key,
        conflict: true,
      };
    }

    // Return cached response
    const cachedResponse = new NextResponse(existing.responseBody, {
      status: existing.statusCode,
      headers: {
        ...existing.responseHeaders,
        "X-Idempotency-Key": key,
        "X-Idempotency-Cached": "true",
      },
    });

    return { cached: true, response: cachedResponse, key, conflict: false };
  }

  // Try to acquire lock
  if (existing?.locked) {
    // Request is being processed by another instance
    return {
      cached: true,
      response: NextResponse.json(
        { error: "Request with this idempotency key is currently being processed" },
        { status: 409 },
      ),
      key,
      conflict: false,
    };
  }

  // Acquire lock for new key
  const locked = store.lock(key);
  if (!locked) {
    return {
      cached: true,
      response: NextResponse.json(
        { error: "Failed to acquire idempotency lock" },
        { status: 409 },
      ),
      key,
      conflict: false,
    };
  }

  return { cached: false, response: null, key, conflict: false };
}

/**
 * Store the response for an idempotency key.
 */
export async function storeIdempotencyResponse(
  key: string,
  request: NextRequest,
  response: NextResponse,
  config?: Partial<IdempotencyConfig>,
): Promise<void> {
  const store = getStore(config);

  const body = await request.clone().text();
  const requestHash = hashRequestBody(body, request.method, request.nextUrl.pathname);

  const responseBody = await response.clone().text();
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, headerKey) => {
    responseHeaders[headerKey] = value;
  });

  store.set(key, requestHash, response.status, responseBody, responseHeaders);
}

/**
 * Release an idempotency lock on error (so the key can be retried).
 */
export function releaseIdempotencyLock(key: string | null): void {
  if (!key) return;
  const store = getStore();
  store.unlock(key);
}

/* ------------------------------------------------------------------ */
/*  Header helpers for responses                                     */
/* ------------------------------------------------------------------ */

/** Add idempotency-related headers to a response. */
export function addIdempotencyHeaders(
  response: NextResponse,
  key: string | null,
  cached: boolean,
): NextResponse {
  if (key) {
    response.headers.set("X-Idempotency-Key", key);
    response.headers.set("X-Idempotency-Cached", cached ? "true" : "false");
  }
  return response;
}
