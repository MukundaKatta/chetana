/**
 * Probe response caching layer (Issue #364).
 * Content-addressable cache keyed by probe+model+params hash,
 * TTL-based expiration, cache hit/miss stats,
 * selective invalidation, LRU eviction with memory bound.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface CacheKey {
  probeId: string;
  model: string;
  provider: string;
  params: Record<string, unknown>;
}

export interface CacheEntry<T = unknown> {
  /** Content-addressable hash key. */
  hash: string;
  /** Cached value. */
  value: T;
  /** ISO timestamp when the entry was created. */
  createdAt: string;
  /** ISO timestamp when the entry expires. */
  expiresAt: string;
  /** Number of times this entry has been accessed. */
  accessCount: number;
  /** ISO timestamp of last access. */
  lastAccessedAt: string;
  /** Approximate size in bytes. */
  sizeBytes: number;
  /** Original cache key components. */
  key: CacheKey;
}

export interface CacheStats {
  /** Total cache hits. */
  hits: number;
  /** Total cache misses. */
  misses: number;
  /** Hit rate (0-1). */
  hitRate: number;
  /** Number of entries currently in cache. */
  entryCount: number;
  /** Total size in bytes. */
  totalSizeBytes: number;
  /** Number of evictions due to memory bound. */
  evictions: number;
  /** Number of expirations. */
  expirations: number;
}

export interface ProbeCacheConfig {
  /** TTL in milliseconds (default 30 minutes). */
  ttlMs: number;
  /** Maximum entries (default 500). */
  maxEntries: number;
  /** Maximum total size in bytes (default 50MB). */
  maxSizeBytes: number;
  /** Enable localStorage persistence (default true). */
  persist: boolean;
  /** localStorage key prefix (default "chetana:probe-cache"). */
  storageKey: string;
}

const DEFAULT_CONFIG: ProbeCacheConfig = {
  ttlMs: 30 * 60 * 1000,
  maxEntries: 500,
  maxSizeBytes: 50 * 1024 * 1024,
  persist: true,
  storageKey: "chetana:probe-cache",
};

/* ------------------------------------------------------------------ */
/*  Hashing                                                           */
/* ------------------------------------------------------------------ */

/**
 * Generate a content-addressable hash from cache key components.
 */
export function generateCacheHash(key: CacheKey): string {
  const canonical = JSON.stringify({
    p: key.probeId,
    m: key.model,
    v: key.provider,
    a: sortObject(key.params),
  });

  // DJB2 hash variant
  let hash = 5381;
  for (let i = 0; i < canonical.length; i++) {
    hash = ((hash << 5) + hash + canonical.charCodeAt(i)) | 0;
  }

  return `pc_${Math.abs(hash).toString(36)}_${simpleHash(canonical).toString(16)}`;
}

function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function sortObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    const value = obj[key];
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      sorted[key] = sortObject(value as Record<string, unknown>);
    } else {
      sorted[key] = value;
    }
  }
  return sorted;
}

function estimateSize(value: unknown): number {
  try {
    return new Blob([JSON.stringify(value)]).size;
  } catch {
    return JSON.stringify(value).length * 2; // rough UTF-16 estimate
  }
}

/* ------------------------------------------------------------------ */
/*  ProbeCache                                                        */
/* ------------------------------------------------------------------ */

export class ProbeCache {
  private entries: Map<string, CacheEntry> = new Map();
  private accessOrder: string[] = []; // LRU tracking
  private config: ProbeCacheConfig;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    entryCount: 0,
    totalSizeBytes: 0,
    evictions: 0,
    expirations: 0,
  };

  constructor(config: Partial<ProbeCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFromStorage();
  }

  /* -- Persistence ------------------------------------------------- */

  private loadFromStorage(): void {
    if (!this.config.persist || typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(this.config.storageKey);
      if (!raw) return;

      const data: { entries: [string, CacheEntry][]; stats: Partial<CacheStats> } = JSON.parse(raw);
      const now = Date.now();

      for (const [hash, entry] of data.entries) {
        if (new Date(entry.expiresAt).getTime() > now) {
          this.entries.set(hash, entry);
          this.accessOrder.push(hash);
        }
      }

      this.updateSizeStats();
    } catch {
      this.entries.clear();
    }
  }

  private persist(): void {
    if (!this.config.persist || typeof window === "undefined") return;
    try {
      const data = {
        entries: Array.from(this.entries.entries()),
        stats: this.stats,
      };
      localStorage.setItem(this.config.storageKey, JSON.stringify(data));
    } catch {
      // Storage full - clear cache and try again
      this.entries.clear();
      this.accessOrder = [];
    }
  }

  private updateSizeStats(): void {
    let total = 0;
    for (const entry of this.entries.values()) {
      total += entry.sizeBytes;
    }
    this.stats.totalSizeBytes = total;
    this.stats.entryCount = this.entries.size;
    this.stats.hitRate =
      this.stats.hits + this.stats.misses > 0
        ? this.stats.hits / (this.stats.hits + this.stats.misses)
        : 0;
  }

  /* -- LRU Eviction ------------------------------------------------ */

  private touchLRU(hash: string): void {
    const idx = this.accessOrder.indexOf(hash);
    if (idx >= 0) this.accessOrder.splice(idx, 1);
    this.accessOrder.push(hash);
  }

  private evictLRU(): void {
    while (
      this.entries.size > this.config.maxEntries ||
      this.stats.totalSizeBytes > this.config.maxSizeBytes
    ) {
      if (this.accessOrder.length === 0) break;
      const oldest = this.accessOrder.shift()!;
      const entry = this.entries.get(oldest);
      if (entry) {
        this.stats.totalSizeBytes -= entry.sizeBytes;
        this.entries.delete(oldest);
        this.stats.evictions++;
      }
    }
  }

  /* -- Expiration -------------------------------------------------- */

  private cleanExpired(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [hash, entry] of this.entries) {
      if (new Date(entry.expiresAt).getTime() <= now) {
        expired.push(hash);
      }
    }

    for (const hash of expired) {
      const entry = this.entries.get(hash);
      if (entry) {
        this.stats.totalSizeBytes -= entry.sizeBytes;
        this.entries.delete(hash);
        this.stats.expirations++;
      }
      const idx = this.accessOrder.indexOf(hash);
      if (idx >= 0) this.accessOrder.splice(idx, 1);
    }
  }

  /* -- Public API -------------------------------------------------- */

  /**
   * Get a cached value by key.
   */
  get<T = unknown>(key: CacheKey): T | null {
    const hash = generateCacheHash(key);
    this.cleanExpired();

    const entry = this.entries.get(hash);
    if (!entry) {
      this.stats.misses++;
      this.updateSizeStats();
      return null;
    }

    // Check expiration
    if (new Date(entry.expiresAt).getTime() <= Date.now()) {
      this.entries.delete(hash);
      this.stats.expirations++;
      this.stats.misses++;
      this.updateSizeStats();
      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessedAt = new Date().toISOString();
    this.touchLRU(hash);
    this.stats.hits++;
    this.updateSizeStats();

    return entry.value as T;
  }

  /**
   * Set a cached value.
   */
  set<T = unknown>(key: CacheKey, value: T, ttlMs?: number): void {
    const hash = generateCacheHash(key);
    const now = new Date();
    const ttl = ttlMs ?? this.config.ttlMs;
    const sizeBytes = estimateSize(value);

    const entry: CacheEntry<T> = {
      hash,
      value,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttl).toISOString(),
      accessCount: 0,
      lastAccessedAt: now.toISOString(),
      sizeBytes,
      key,
    };

    // Remove existing if present
    const existing = this.entries.get(hash);
    if (existing) {
      this.stats.totalSizeBytes -= existing.sizeBytes;
    }

    this.entries.set(hash, entry as CacheEntry);
    this.stats.totalSizeBytes += sizeBytes;
    this.touchLRU(hash);

    // Evict if needed
    this.evictLRU();
    this.updateSizeStats();
    this.persist();
  }

  /**
   * Check if a key exists and is not expired.
   */
  has(key: CacheKey): boolean {
    const hash = generateCacheHash(key);
    const entry = this.entries.get(hash);
    if (!entry) return false;
    return new Date(entry.expiresAt).getTime() > Date.now();
  }

  /**
   * Delete a specific cache entry.
   */
  delete(key: CacheKey): boolean {
    const hash = generateCacheHash(key);
    const entry = this.entries.get(hash);
    if (!entry) return false;

    this.stats.totalSizeBytes -= entry.sizeBytes;
    this.entries.delete(hash);
    const idx = this.accessOrder.indexOf(hash);
    if (idx >= 0) this.accessOrder.splice(idx, 1);
    this.updateSizeStats();
    this.persist();
    return true;
  }

  /**
   * Invalidate all entries matching a pattern.
   */
  invalidate(pattern: {
    probeId?: string;
    model?: string;
    provider?: string;
  }): number {
    let count = 0;
    const toRemove: string[] = [];

    for (const [hash, entry] of this.entries) {
      const matches =
        (!pattern.probeId || entry.key.probeId === pattern.probeId) &&
        (!pattern.model || entry.key.model === pattern.model) &&
        (!pattern.provider || entry.key.provider === pattern.provider);

      if (matches) {
        toRemove.push(hash);
        this.stats.totalSizeBytes -= entry.sizeBytes;
        count++;
      }
    }

    for (const hash of toRemove) {
      this.entries.delete(hash);
      const idx = this.accessOrder.indexOf(hash);
      if (idx >= 0) this.accessOrder.splice(idx, 1);
    }

    this.updateSizeStats();
    this.persist();
    return count;
  }

  /**
   * Get cache statistics.
   */
  getStats(): Readonly<CacheStats> {
    this.updateSizeStats();
    return { ...this.stats };
  }

  /**
   * Get all cache entries (for inspection).
   */
  getEntries(): readonly CacheEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this.entries.clear();
    this.accessOrder = [];
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      entryCount: 0,
      totalSizeBytes: 0,
      evictions: 0,
      expirations: 0,
    };
    this.persist();
  }

  /**
   * Get or set a cached value (cache-aside pattern).
   */
  async getOrSet<T>(
    key: CacheKey,
    fetcher: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;

    const value = await fetcher();
    this.set(key, value, ttlMs);
    return value;
  }
}

/**
 * Singleton probe cache instance.
 */
let globalCache: ProbeCache | null = null;

export function getProbeCache(config?: Partial<ProbeCacheConfig>): ProbeCache {
  if (!globalCache) {
    globalCache = new ProbeCache(config);
  }
  return globalCache;
}
