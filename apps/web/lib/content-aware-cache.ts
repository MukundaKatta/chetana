/**
 * Content-aware caching (Issue #549).
 * Cache per model+params hash, content-aware expiry,
 * background refresh, warmup on audit start, quota management.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface CacheConfig {
  /** Max entries in the cache (default 500). */
  maxEntries: number;
  /** Default TTL in ms (default 300_000 = 5 min). */
  defaultTtlMs: number;
  /** Max total size in bytes (default 50MB). */
  maxSizeBytes: number;
  /** Background refresh interval in ms (default 60_000). */
  refreshIntervalMs: number;
  /** Whether background refresh is enabled (default true). */
  backgroundRefreshEnabled: boolean;
}

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  hash: string;
  createdAt: number;
  expiresAt: number;
  lastAccessedAt: number;
  accessCount: number;
  sizeBytes: number;
  /** Tags for group invalidation. */
  tags: string[];
  /** Whether this entry is being refreshed in the background. */
  refreshing: boolean;
}

export interface CacheStats {
  totalEntries: number;
  totalSizeBytes: number;
  maxSizeBytes: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  evictionCount: number;
  refreshCount: number;
  oldestEntryAge: number | null;
  quotaUsagePercent: number;
}

export interface WarmupTask {
  key: string;
  params: CacheKeyParams;
  loader: () => Promise<unknown>;
}

export interface CacheKeyParams {
  modelId: string;
  modelProvider: string;
  [key: string]: string | number | boolean | undefined;
}

/* ------------------------------------------------------------------ */
/*  Hash helpers                                                      */
/* ------------------------------------------------------------------ */

function stableStringify(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort();
  const parts: string[] = [];
  for (const key of keys) {
    const val = obj[key];
    if (val !== undefined) {
      parts.push(`${key}:${JSON.stringify(val)}`);
    }
  }
  return parts.join("|");
}

async function computeHash(input: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const data = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback: simple FNV-1a hash
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash.toString(16);
}

export function buildCacheKey(params: CacheKeyParams): string {
  return `${params.modelProvider}:${params.modelId}:${stableStringify(params as unknown as Record<string, unknown>)}`;
}

function estimateSize(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return 1024; // fallback estimate
  }
}

/* ------------------------------------------------------------------ */
/*  Content-aware expiry                                              */
/* ------------------------------------------------------------------ */

interface ExpiryRule {
  /** Matcher: tag prefix, key pattern, etc. */
  match: (entry: CacheEntry) => boolean;
  /** TTL in ms for matching entries. */
  ttlMs: number;
}

/* ------------------------------------------------------------------ */
/*  Cache implementation                                              */
/* ------------------------------------------------------------------ */

export class ContentAwareCache {
  private entries: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private expiryRules: ExpiryRule[] = [];
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private loaders: Map<string, () => Promise<unknown>> = new Map();

  // Stats
  private hitCount = 0;
  private missCount = 0;
  private evictionCount = 0;
  private refreshCount = 0;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxEntries: config?.maxEntries ?? 500,
      defaultTtlMs: config?.defaultTtlMs ?? 300_000,
      maxSizeBytes: config?.maxSizeBytes ?? 50 * 1024 * 1024,
      refreshIntervalMs: config?.refreshIntervalMs ?? 60_000,
      backgroundRefreshEnabled: config?.backgroundRefreshEnabled ?? true,
    };
  }

  /** Start background refresh loop. */
  startBackgroundRefresh(): void {
    if (!this.config.backgroundRefreshEnabled) return;
    if (this.refreshInterval) return;

    this.refreshInterval = setInterval(
      () => this.refreshExpiring(),
      this.config.refreshIntervalMs
    );
  }

  /** Stop background refresh. */
  stopBackgroundRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /** Add a content-aware expiry rule. */
  addExpiryRule(rule: ExpiryRule): void {
    this.expiryRules.push(rule);
  }

  /** Register a loader function for a cache key (used in background refresh). */
  registerLoader(key: string, loader: () => Promise<unknown>): void {
    this.loaders.set(key, loader);
  }

  /** Get a value from the cache. */
  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.entries.get(key);
    if (!entry) {
      this.missCount++;
      return null;
    }

    // Check expiry
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      this.missCount++;
      return null;
    }

    entry.lastAccessedAt = Date.now();
    entry.accessCount++;
    this.hitCount++;
    return entry.value as T;
  }

  /** Get or compute: returns cached value or calls loader and caches the result. */
  async getOrSet<T = unknown>(
    params: CacheKeyParams,
    loader: () => Promise<T>,
    options?: { ttlMs?: number; tags?: string[] }
  ): Promise<T> {
    const key = buildCacheKey(params);
    const hash = await computeHash(stableStringify(params as unknown as Record<string, unknown>));

    const existing = await this.get<T>(key);
    if (existing !== null) {
      // Verify hash matches (content-aware)
      const entry = this.entries.get(key);
      if (entry && entry.hash === hash) {
        return existing;
      }
    }

    const value = await loader();
    await this.set(key, value, hash, options);
    this.registerLoader(key, loader as () => Promise<unknown>);
    return value;
  }

  /** Set a value in the cache. */
  async set<T = unknown>(
    key: string,
    value: T,
    hash?: string,
    options?: { ttlMs?: number; tags?: string[] }
  ): Promise<void> {
    const sizeBytes = estimateSize(value);
    const computedHash =
      hash ??
      (await computeHash(JSON.stringify(value)));

    // Determine TTL
    let ttlMs = options?.ttlMs ?? this.config.defaultTtlMs;

    const now = Date.now();

    const entry: CacheEntry<T> = {
      key,
      value,
      hash: computedHash,
      createdAt: now,
      expiresAt: now + ttlMs,
      lastAccessedAt: now,
      accessCount: 0,
      sizeBytes,
      tags: options?.tags ?? [],
      refreshing: false,
    };

    // Apply content-aware expiry rules
    for (const rule of this.expiryRules) {
      if (rule.match(entry as CacheEntry)) {
        entry.expiresAt = now + rule.ttlMs;
        break;
      }
    }

    // Evict if needed
    await this.ensureCapacity(sizeBytes);

    this.entries.set(key, entry as CacheEntry);
  }

  /** Invalidate a specific key. */
  invalidate(key: string): boolean {
    return this.entries.delete(key);
  }

  /** Invalidate all entries with a given tag. */
  invalidateByTag(tag: string): number {
    let count = 0;
    for (const [key, entry] of this.entries) {
      if (entry.tags.includes(tag)) {
        this.entries.delete(key);
        count++;
      }
    }
    return count;
  }

  /** Invalidate all entries matching a model. */
  invalidateByModel(modelId: string, provider: string): number {
    const prefix = `${provider}:${modelId}:`;
    let count = 0;
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) {
        this.entries.delete(key);
        count++;
      }
    }
    return count;
  }

  /** Clear the entire cache. */
  clear(): void {
    this.entries.clear();
  }

  /** Warm up the cache with multiple tasks (typically called at audit start). */
  async warmup(tasks: WarmupTask[]): Promise<{ succeeded: number; failed: number }> {
    let succeeded = 0;
    let failed = 0;

    const promises = tasks.map(async (task) => {
      try {
        const hash = await computeHash(
          stableStringify(task.params as unknown as Record<string, unknown>)
        );
        const value = await task.loader();
        await this.set(task.key, value, hash);
        this.registerLoader(task.key, task.loader);
        succeeded++;
      } catch {
        failed++;
      }
    });

    await Promise.allSettled(promises);
    return { succeeded, failed };
  }

  /** Get cache statistics. */
  getStats(): CacheStats {
    const totalRequests = this.hitCount + this.missCount;
    const totalSizeBytes = [...this.entries.values()].reduce(
      (sum, e) => sum + e.sizeBytes,
      0
    );

    let oldestAge: number | null = null;
    const now = Date.now();
    for (const entry of this.entries.values()) {
      const age = now - entry.createdAt;
      if (oldestAge === null || age > oldestAge) oldestAge = age;
    }

    return {
      totalEntries: this.entries.size,
      totalSizeBytes,
      maxSizeBytes: this.config.maxSizeBytes,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: totalRequests > 0 ? this.hitCount / totalRequests : 0,
      evictionCount: this.evictionCount,
      refreshCount: this.refreshCount,
      oldestEntryAge: oldestAge,
      quotaUsagePercent:
        this.config.maxSizeBytes > 0
          ? Math.round((totalSizeBytes / this.config.maxSizeBytes) * 100)
          : 0,
    };
  }

  /** Get quota info. */
  getQuota(): { used: number; max: number; percent: number } {
    const used = [...this.entries.values()].reduce(
      (sum, e) => sum + e.sizeBytes,
      0
    );
    return {
      used,
      max: this.config.maxSizeBytes,
      percent:
        this.config.maxSizeBytes > 0
          ? Math.round((used / this.config.maxSizeBytes) * 100)
          : 0,
    };
  }

  /* ---------------------------------------------------------------- */
  /*  Internal                                                        */
  /* ---------------------------------------------------------------- */

  private async ensureCapacity(neededBytes: number): Promise<void> {
    // Evict by entry count
    while (this.entries.size >= this.config.maxEntries) {
      this.evictLRU();
    }

    // Evict by size
    let totalSize = [...this.entries.values()].reduce(
      (sum, e) => sum + e.sizeBytes,
      0
    );
    while (totalSize + neededBytes > this.config.maxSizeBytes && this.entries.size > 0) {
      this.evictLRU();
      totalSize = [...this.entries.values()].reduce(
        (sum, e) => sum + e.sizeBytes,
        0
      );
    }
  }

  private evictLRU(): void {
    let oldest: CacheEntry | null = null;
    for (const entry of this.entries.values()) {
      if (!oldest || entry.lastAccessedAt < oldest.lastAccessedAt) {
        oldest = entry;
      }
    }
    if (oldest) {
      this.entries.delete(oldest.key);
      this.evictionCount++;
    }
  }

  private async refreshExpiring(): Promise<void> {
    const now = Date.now();
    const threshold = this.config.refreshIntervalMs * 2; // Refresh if expiring soon

    for (const entry of this.entries.values()) {
      if (entry.refreshing) continue;
      if (entry.expiresAt - now > threshold) continue;

      const loader = this.loaders.get(entry.key);
      if (!loader) continue;

      entry.refreshing = true;
      try {
        const newValue = await loader();
        const newHash = await computeHash(JSON.stringify(newValue));

        // Only update if content changed
        if (newHash !== entry.hash) {
          entry.value = newValue;
          entry.hash = newHash;
          entry.sizeBytes = estimateSize(newValue);
        }

        entry.expiresAt = now + this.config.defaultTtlMs;
        entry.refreshing = false;
        this.refreshCount++;
      } catch {
        entry.refreshing = false;
      }
    }
  }
}
