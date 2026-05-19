/**
 * Intelligent data prefetching (Issue #488).
 * Predict from nav patterns, prefetch on hover,
 * priority queue, cache integration, bandwidth-aware.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type PrefetchPriority = "critical" | "high" | "medium" | "low";

export type PrefetchStatus = "pending" | "loading" | "cached" | "failed" | "evicted";

export interface PrefetchEntry {
  url: string;
  priority: PrefetchPriority;
  status: PrefetchStatus;
  predictedAt: number;
  fetchedAt: number | null;
  expiresAt: number | null;
  size: number | null;
  hitCount: number;
  error: string | null;
}

export interface NavigationPattern {
  from: string;
  to: string;
  count: number;
  lastOccurred: number;
  probability: number;
}

export interface PrefetchConfig {
  /** Maximum number of items to cache (default 50). */
  maxCacheSize: number;
  /** Cache TTL in ms (default 300000 = 5 min). */
  cacheTtlMs: number;
  /** Minimum probability to trigger prefetch (default 0.3). */
  minProbability: number;
  /** Max concurrent prefetch requests (default 3). */
  maxConcurrent: number;
  /** Max bandwidth to use for prefetch in bytes (default 5MB). */
  maxBandwidthBytes: number;
  /** Whether to respect navigator.connection (default true). */
  bandwidthAware: boolean;
  /** Hover delay before triggering prefetch in ms (default 200). */
  hoverDelayMs: number;
  /** Priority weights for queue ordering. */
  priorityWeights: Record<PrefetchPriority, number>;
}

export interface PrefetchStats {
  totalPrefetched: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  totalBytesLoaded: number;
  averageLoadTimeMs: number;
  queueSize: number;
  cacheSize: number;
  patterns: NavigationPattern[];
}

export interface BandwidthEstimate {
  effectiveType: "slow-2g" | "2g" | "3g" | "4g" | "unknown";
  downlinkMbps: number;
  rtt: number;
  saveData: boolean;
}

/* ------------------------------------------------------------------ */
/*  Default config                                                    */
/* ------------------------------------------------------------------ */

const DEFAULT_CONFIG: PrefetchConfig = {
  maxCacheSize: 50,
  cacheTtlMs: 300_000,
  minProbability: 0.3,
  maxConcurrent: 3,
  maxBandwidthBytes: 5_242_880, // 5 MB
  bandwidthAware: true,
  hoverDelayMs: 200,
  priorityWeights: {
    critical: 100,
    high: 75,
    medium: 50,
    low: 25,
  },
};

/* ------------------------------------------------------------------ */
/*  Priority queue                                                    */
/* ------------------------------------------------------------------ */

interface QueueItem {
  url: string;
  priority: PrefetchPriority;
  score: number;
  addedAt: number;
}

class PrefetchQueue {
  private items: QueueItem[] = [];
  private weights: Record<PrefetchPriority, number>;

  constructor(weights: Record<PrefetchPriority, number>) {
    this.weights = weights;
  }

  enqueue(url: string, priority: PrefetchPriority): void {
    // Don't add duplicates
    if (this.items.some((item) => item.url === url)) return;

    const now = Date.now();
    this.items.push({
      url,
      priority,
      score: this.weights[priority],
      addedAt: now,
    });

    // Sort by score descending, then by added time ascending
    this.items.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.addedAt - b.addedAt;
    });
  }

  dequeue(): QueueItem | undefined {
    return this.items.shift();
  }

  remove(url: string): void {
    this.items = this.items.filter((item) => item.url !== url);
  }

  get size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }
}

/* ------------------------------------------------------------------ */
/*  Prefetch engine                                                   */
/* ------------------------------------------------------------------ */

export class PrefetchEngine {
  private config: PrefetchConfig;
  private cache: Map<string, PrefetchEntry> = new Map();
  private patterns: Map<string, NavigationPattern> = new Map();
  private queue: PrefetchQueue;
  private activeRequests = 0;
  private totalBytesLoaded = 0;
  private loadTimes: number[] = [];
  private cacheHits = 0;
  private cacheMisses = 0;
  private totalPrefetched = 0;
  private hoverTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private fetchFn: (url: string) => Promise<{ data: unknown; size: number }>;

  constructor(
    fetchFn: (url: string) => Promise<{ data: unknown; size: number }>,
    config?: Partial<PrefetchConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.queue = new PrefetchQueue(this.config.priorityWeights);
    this.fetchFn = fetchFn;
  }

  /* -- Navigation pattern tracking ---------------------------------- */

  recordNavigation(from: string, to: string): void {
    const key = `${from}|${to}`;
    const existing = this.patterns.get(key);

    if (existing) {
      existing.count++;
      existing.lastOccurred = Date.now();
    } else {
      this.patterns.set(key, {
        from,
        to,
        count: 1,
        lastOccurred: Date.now(),
        probability: 0,
      });
    }

    // Recalculate probabilities for all patterns from this page
    this.recalculateProbabilities(from);

    // Trigger predictive prefetch
    this.prefetchPredicted(to);
  }

  private recalculateProbabilities(fromPage: string): void {
    const fromPatterns: NavigationPattern[] = [];
    let total = 0;

    for (const pattern of this.patterns.values()) {
      if (pattern.from === fromPage) {
        fromPatterns.push(pattern);
        total += pattern.count;
      }
    }

    for (const pattern of fromPatterns) {
      pattern.probability = total > 0 ? pattern.count / total : 0;
    }
  }

  getPredictions(currentPage: string): NavigationPattern[] {
    const predictions: NavigationPattern[] = [];

    for (const pattern of this.patterns.values()) {
      if (
        pattern.from === currentPage &&
        pattern.probability >= this.config.minProbability
      ) {
        predictions.push(pattern);
      }
    }

    return predictions.sort((a, b) => b.probability - a.probability);
  }

  /* -- Prefetch on hover -------------------------------------------- */

  onHoverStart(url: string, priority: PrefetchPriority = "high"): void {
    if (this.cache.has(url)) return;

    const timer = setTimeout(() => {
      this.schedulePrefetch(url, priority);
      this.hoverTimers.delete(url);
    }, this.config.hoverDelayMs);

    this.hoverTimers.set(url, timer);
  }

  onHoverEnd(url: string): void {
    const timer = this.hoverTimers.get(url);
    if (timer) {
      clearTimeout(timer);
      this.hoverTimers.delete(url);
    }
  }

  /* -- Prefetch scheduling ------------------------------------------ */

  schedulePrefetch(url: string, priority: PrefetchPriority = "medium"): void {
    // Check if already cached and not expired
    const entry = this.cache.get(url);
    if (entry && entry.status === "cached" && entry.expiresAt && entry.expiresAt > Date.now()) {
      return;
    }

    // Check bandwidth
    if (this.config.bandwidthAware && !this.hasBandwidthBudget()) {
      return;
    }

    this.queue.enqueue(url, priority);
    void this.processQueue();
  }

  private async processQueue(): Promise<void> {
    while (
      this.activeRequests < this.config.maxConcurrent &&
      this.queue.size > 0
    ) {
      const item = this.queue.dequeue();
      if (!item) break;

      // Check again if cached
      const entry = this.cache.get(item.url);
      if (entry?.status === "cached") continue;

      this.activeRequests++;
      void this.executePrefetch(item.url, item.priority).finally(() => {
        this.activeRequests--;
        void this.processQueue();
      });
    }
  }

  private async executePrefetch(
    url: string,
    priority: PrefetchPriority
  ): Promise<void> {
    const entry: PrefetchEntry = {
      url,
      priority,
      status: "loading",
      predictedAt: Date.now(),
      fetchedAt: null,
      expiresAt: null,
      size: null,
      hitCount: 0,
      error: null,
    };

    this.cache.set(url, entry);
    const start = Date.now();

    try {
      const result = await this.fetchFn(url);
      const loadTime = Date.now() - start;

      entry.status = "cached";
      entry.fetchedAt = Date.now();
      entry.expiresAt = Date.now() + this.config.cacheTtlMs;
      entry.size = result.size;

      this.totalBytesLoaded += result.size;
      this.totalPrefetched++;
      this.loadTimes.push(loadTime);
      if (this.loadTimes.length > 100) this.loadTimes.shift();

      // Evict if over capacity
      this.evictIfNeeded();
    } catch (err) {
      entry.status = "failed";
      entry.error = err instanceof Error ? err.message : String(err);
    }
  }

  /* -- Cache access ------------------------------------------------- */

  get<T = unknown>(url: string): T | null {
    const entry = this.cache.get(url);

    if (!entry || entry.status !== "cached") {
      this.cacheMisses++;
      return null;
    }

    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      entry.status = "evicted";
      this.cache.delete(url);
      this.cacheMisses++;
      return null;
    }

    entry.hitCount++;
    this.cacheHits++;
    return null as T; // data is held by the external fetch/cache layer
  }

  has(url: string): boolean {
    const entry = this.cache.get(url);
    if (!entry || entry.status !== "cached") return false;
    if (entry.expiresAt && entry.expiresAt < Date.now()) return false;
    return true;
  }

  invalidate(url: string): void {
    this.cache.delete(url);
  }

  clearCache(): void {
    this.cache.clear();
    this.queue.clear();
  }

  /* -- Predictive prefetch ------------------------------------------ */

  private prefetchPredicted(currentPage: string): void {
    const predictions = this.getPredictions(currentPage);

    for (const prediction of predictions) {
      const priority: PrefetchPriority =
        prediction.probability > 0.7
          ? "high"
          : prediction.probability > 0.5
            ? "medium"
            : "low";

      this.schedulePrefetch(prediction.to, priority);
    }
  }

  /* -- Bandwidth awareness ------------------------------------------ */

  getBandwidthEstimate(): BandwidthEstimate {
    if (typeof navigator === "undefined" || !("connection" in navigator)) {
      return {
        effectiveType: "unknown",
        downlinkMbps: 10,
        rtt: 50,
        saveData: false,
      };
    }

    const conn = (navigator as NavigatorWithConnection).connection;
    return {
      effectiveType: (conn?.effectiveType as BandwidthEstimate["effectiveType"]) ?? "unknown",
      downlinkMbps: conn?.downlink ?? 10,
      rtt: conn?.rtt ?? 50,
      saveData: conn?.saveData ?? false,
    };
  }

  private hasBandwidthBudget(): boolean {
    const estimate = this.getBandwidthEstimate();

    // Don't prefetch on save-data mode
    if (estimate.saveData) return false;

    // Don't prefetch on slow connections
    if (estimate.effectiveType === "slow-2g" || estimate.effectiveType === "2g") {
      return false;
    }

    // Check total budget
    if (this.totalBytesLoaded >= this.config.maxBandwidthBytes) {
      return false;
    }

    return true;
  }

  /* -- Eviction ----------------------------------------------------- */

  private evictIfNeeded(): void {
    while (this.cache.size > this.config.maxCacheSize) {
      // Evict least recently used with lowest hit count
      let lruEntry: PrefetchEntry | null = null;
      let lruKey: string | null = null;

      for (const [key, entry] of this.cache.entries()) {
        if (entry.status !== "cached") continue;
        if (
          !lruEntry ||
          entry.hitCount < lruEntry.hitCount ||
          (entry.hitCount === lruEntry.hitCount &&
            (entry.fetchedAt ?? 0) < (lruEntry.fetchedAt ?? 0))
        ) {
          lruEntry = entry;
          lruKey = key;
        }
      }

      if (lruKey) {
        const entry = this.cache.get(lruKey);
        if (entry) entry.status = "evicted";
        this.cache.delete(lruKey);
      } else {
        break;
      }
    }
  }

  /* -- Statistics --------------------------------------------------- */

  getStats(): PrefetchStats {
    const totalAttempts = this.cacheHits + this.cacheMisses;
    const avgLoadTime =
      this.loadTimes.length > 0
        ? this.loadTimes.reduce((a, b) => a + b, 0) / this.loadTimes.length
        : 0;

    return {
      totalPrefetched: this.totalPrefetched,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate: totalAttempts > 0 ? this.cacheHits / totalAttempts : 0,
      totalBytesLoaded: this.totalBytesLoaded,
      averageLoadTimeMs: Math.round(avgLoadTime * 100) / 100,
      queueSize: this.queue.size,
      cacheSize: this.cache.size,
      patterns: Array.from(this.patterns.values()).sort(
        (a, b) => b.probability - a.probability
      ),
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Navigator connection type (for bandwidth awareness)               */
/* ------------------------------------------------------------------ */

interface NavigatorConnection {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NavigatorConnection;
}
