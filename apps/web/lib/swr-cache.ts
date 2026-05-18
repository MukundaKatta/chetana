/**
 * SWR-pattern (stale-while-revalidate) in-memory cache with TTL,
 * request deduplication, and pattern-based invalidation.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface InFlightRequest<T> {
  promise: Promise<T>;
  abortController?: AbortController;
}

export class CacheManager {
  private cache = new Map<string, CacheEntry<unknown>>();
  private inFlight = new Map<string, InFlightRequest<unknown>>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private cleanupIntervalMs = 60_000) {
    if (typeof globalThis !== "undefined") {
      this.cleanupTimer = setInterval(
        () => this.evictExpired(),
        this.cleanupIntervalMs
      );
      // Allow the timer to not block Node from exiting
      if (typeof this.cleanupTimer === "object" && "unref" in this.cleanupTimer) {
        this.cleanupTimer.unref();
      }
    }
  }

  /**
   * Return the cached value if it exists and is within its TTL.
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data;
  }

  /**
   * Store a value with a TTL (milliseconds).
   */
  set<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  /**
   * Check whether a non-expired entry exists for the key.
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Invalidate a single key.
   */
  delete(key: string): boolean {
    this.inFlight.delete(key);
    return this.cache.delete(key);
  }

  /**
   * Invalidate all keys matching a pattern (substring or RegExp).
   */
  invalidateByPattern(pattern: string | RegExp): number {
    const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        this.inFlight.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this.cache.clear();
    this.inFlight.clear();
  }

  /**
   * Stop the background eviction timer (for graceful shutdown / tests).
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /** Number of live entries. */
  get size(): number {
    return this.cache.size;
  }

  // --- Private helpers ---

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Deduplicate an in-flight request: if the same key is already being
   * fetched, return the existing promise instead of starting a new one.
   */
  dedup<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key) as InFlightRequest<T> | undefined;
    if (existing) return existing.promise;

    const promise = fetcher().finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, { promise: promise as Promise<unknown> });
    return promise;
  }
}

// ---- Convenience singleton and function ----

const defaultManager = new CacheManager();

/**
 * Fetch a URL with SWR-style caching and automatic request deduplication.
 *
 * @param url - The URL to fetch
 * @param options - Standard RequestInit options
 * @param ttl - Cache time-to-live in milliseconds (default: 30 seconds)
 * @returns The parsed JSON response
 */
export async function fetchWithCache<T = unknown>(
  url: string,
  options?: RequestInit,
  ttl = 30_000
): Promise<T> {
  const cacheKey = `fetch:${url}`;

  // Return cached data if fresh
  const cached = defaultManager.get<T>(cacheKey);
  if (cached !== undefined) return cached;

  // Deduplicate concurrent requests for the same URL
  return defaultManager.dedup(cacheKey, async () => {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    }

    const data: T = await response.json();
    defaultManager.set(cacheKey, data, ttl);
    return data;
  });
}

export { defaultManager as cacheManager };
