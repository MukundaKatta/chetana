/**
 * Cache warming utilities with priority-based warming order,
 * periodic scheduling, and hit rate tracking (Issue #348).
 */

export interface CacheEntry {
  key: string;
  data: unknown;
  cachedAt: number;
  expiresAt: number;
  hits: number;
  misses: number;
}

export interface WarmTarget {
  /** Unique key for the cache entry. */
  key: string;
  /** Priority: higher values are warmed first. */
  priority: number;
  /** Function that fetches the data to cache. */
  fetcher: () => Promise<unknown>;
  /** TTL in milliseconds (default 5 minutes). */
  ttlMs?: number;
}

export interface RouteTarget {
  /** Route path to warm. */
  path: string;
  /** Priority: higher values are warmed first. */
  priority: number;
  /** Route fetcher function. */
  fetcher: () => Promise<unknown>;
  /** TTL in milliseconds (default 5 minutes). */
  ttlMs?: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class CacheWarmer {
  private cache = new Map<string, CacheEntry>();
  private dataTargets: WarmTarget[] = [];
  private routeTargets: RouteTarget[] = [];
  private periodicTimer: ReturnType<typeof setInterval> | null = null;
  private totalHits = 0;
  private totalMisses = 0;

  /**
   * Register a data target for warming.
   */
  addDataTarget(target: WarmTarget): void {
    // Replace if already registered
    this.dataTargets = this.dataTargets.filter((t) => t.key !== target.key);
    this.dataTargets.push(target);
  }

  /**
   * Register a route target for warming.
   */
  addRouteTarget(target: RouteTarget): void {
    this.routeTargets = this.routeTargets.filter(
      (t) => t.path !== target.path
    );
    this.routeTargets.push(target);
  }

  /**
   * Warm a specific data entry by key and fetcher.
   */
  async warmData(
    key: string,
    fetcher: () => Promise<unknown>,
    ttlMs?: number
  ): Promise<void> {
    const ttl = ttlMs ?? DEFAULT_TTL_MS;
    const data = await fetcher();
    const now = Date.now();

    const existing = this.cache.get(key);
    this.cache.set(key, {
      key,
      data,
      cachedAt: now,
      expiresAt: now + ttl,
      hits: existing?.hits ?? 0,
      misses: existing?.misses ?? 0,
    });
  }

  /**
   * Warm a specific route.
   */
  async warmRoute(
    path: string,
    fetcher?: () => Promise<unknown>,
    ttlMs?: number
  ): Promise<void> {
    const target = this.routeTargets.find((t) => t.path === path);
    const fn = fetcher ?? target?.fetcher;
    if (!fn) {
      throw new Error(`No fetcher registered for route "${path}"`);
    }
    await this.warmData(`route:${path}`, fn, ttlMs ?? target?.ttlMs);
  }

  /**
   * Warm all registered targets in priority order (highest first).
   */
  async warmAll(): Promise<{
    warmed: string[];
    failed: { key: string; error: string }[];
  }> {
    // Combine data and route targets, sorted by priority descending
    const allTargets: { key: string; priority: number; fetcher: () => Promise<unknown>; ttlMs?: number }[] = [
      ...this.dataTargets.map((t) => ({
        key: t.key,
        priority: t.priority,
        fetcher: t.fetcher,
        ttlMs: t.ttlMs,
      })),
      ...this.routeTargets.map((t) => ({
        key: `route:${t.path}`,
        priority: t.priority,
        fetcher: t.fetcher,
        ttlMs: t.ttlMs,
      })),
    ].sort((a, b) => b.priority - a.priority);

    const warmed: string[] = [];
    const failed: { key: string; error: string }[] = [];

    for (const target of allTargets) {
      try {
        await this.warmData(target.key, target.fetcher, target.ttlMs);
        warmed.push(target.key);
      } catch (err) {
        failed.push({
          key: target.key,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { warmed, failed };
  }

  /**
   * Get a cached value. Tracks hits and misses.
   * Returns null if the entry has expired or does not exist.
   */
  get(key: string): unknown | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.totalMisses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.totalMisses++;
      entry.misses++;
      return null;
    }

    entry.hits++;
    this.totalHits++;
    return entry.data;
  }

  /**
   * Get cache hit rate as a fraction (0-1).
   */
  getHitRate(): {
    hitRate: number;
    totalHits: number;
    totalMisses: number;
    totalRequests: number;
  } {
    const total = this.totalHits + this.totalMisses;
    return {
      hitRate: total > 0 ? Math.round((this.totalHits / total) * 10000) / 10000 : 0,
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
      totalRequests: total,
    };
  }

  /**
   * Get per-key hit rate statistics.
   */
  getKeyStats(): Record<
    string,
    { hits: number; misses: number; hitRate: number; expired: boolean }
  > {
    const stats: Record<
      string,
      { hits: number; misses: number; hitRate: number; expired: boolean }
    > = {};

    const now = Date.now();
    for (const [key, entry] of this.cache) {
      const total = entry.hits + entry.misses;
      stats[key] = {
        hits: entry.hits,
        misses: entry.misses,
        hitRate: total > 0 ? Math.round((entry.hits / total) * 10000) / 10000 : 0,
        expired: now > entry.expiresAt,
      };
    }

    return stats;
  }

  /**
   * Schedule periodic cache warming at a given interval.
   *
   * @param intervalMs - Interval in milliseconds between warm cycles
   */
  schedulePeriodicWarm(intervalMs: number): void {
    this.stopPeriodicWarm();
    this.periodicTimer = setInterval(async () => {
      await this.warmAll();
    }, intervalMs);
  }

  /**
   * Stop periodic cache warming.
   */
  stopPeriodicWarm(): void {
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
      this.periodicTimer = null;
    }
  }

  /**
   * Get the number of entries currently in the cache.
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clear all cached data and reset statistics.
   */
  clear(): void {
    this.cache.clear();
    this.totalHits = 0;
    this.totalMisses = 0;
  }

  /**
   * Evict expired entries from the cache.
   */
  evictExpired(): number {
    const now = Date.now();
    let evicted = 0;
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        evicted++;
      }
    }
    return evicted;
  }
}
