/**
 * Cache invalidation: TTL, event-based, tag-based,
 * stale-while-revalidate, cross-tab coherence (Issue #508).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  tags: string[];
  createdAt: number;
  expiresAt: number;
  staleAt: number;
  revalidating: boolean;
  version: number;
}

export interface CacheOptions {
  /** Time-to-live in milliseconds. Default 60_000 (1 min). */
  ttl?: number;
  /** Stale-while-revalidate window in ms after ttl. Default 30_000. */
  swr?: number;
  /** Tags for tag-based invalidation. */
  tags?: string[];
}

export type RevalidateFn<T> = (key: string) => Promise<T>;

export interface CacheEvent {
  type: "set" | "delete" | "invalidate_tag" | "invalidate_all" | "revalidate";
  key?: string;
  tag?: string;
  timestamp: number;
  sourceTabId: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  staleHits: number;
  revalidations: number;
  evictions: number;
  size: number;
}

// ---------------------------------------------------------------------------
// BroadcastChannel-based cross-tab coherence
// ---------------------------------------------------------------------------

const TAB_ID =
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

let broadcastChannel: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel("chetana-cache-sync");
  }
  return broadcastChannel;
}

function broadcast(event: CacheEvent): void {
  getBroadcastChannel()?.postMessage(event);
}

// ---------------------------------------------------------------------------
// Cache implementation
// ---------------------------------------------------------------------------

export class InvalidatingCache {
  private store = new Map<string, CacheEntry>();
  private tagIndex = new Map<string, Set<string>>();
  private listeners = new Map<string, Set<(key: string) => void>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    staleHits: 0,
    revalidations: 0,
    evictions: 0,
    size: 0,
  };
  private version = 0;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private defaultTtl = 60_000, private defaultSwr = 30_000) {
    this.setupCrossTabListener();
    this.startCleanup();
  }

  // -----------------------------------------------------------------------
  // Core operations
  // -----------------------------------------------------------------------

  set<T>(key: string, value: T, options: CacheOptions = {}): void {
    const ttl = options.ttl ?? this.defaultTtl;
    const swr = options.swr ?? this.defaultSwr;
    const tags = options.tags ?? [];
    const now = Date.now();

    const entry: CacheEntry<T> = {
      key,
      value,
      tags,
      createdAt: now,
      expiresAt: now + ttl,
      staleAt: now + ttl + swr,
      revalidating: false,
      version: ++this.version,
    };

    this.store.set(key, entry as CacheEntry);

    for (const tag of tags) {
      let tagSet = this.tagIndex.get(tag);
      if (!tagSet) {
        tagSet = new Set();
        this.tagIndex.set(tag, tagSet);
      }
      tagSet.add(key);
    }

    this.stats.size = this.store.size;
    broadcast({
      type: "set",
      key,
      timestamp: now,
      sourceTabId: TAB_ID,
    });
  }

  get<T>(key: string): { value: T; stale: boolean } | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();

    // Fully expired past SWR window
    if (now > entry.staleAt) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    // Fresh
    if (now <= entry.expiresAt) {
      this.stats.hits++;
      return { value: entry.value, stale: false };
    }

    // Stale but within SWR window
    this.stats.staleHits++;
    return { value: entry.value, stale: true };
  }

  /**
   * Get value, revalidating in the background if stale.
   */
  async getOrRevalidate<T>(
    key: string,
    revalidate: RevalidateFn<T>,
    options: CacheOptions = {}
  ): Promise<T | null> {
    const cached = this.get<T>(key);

    if (cached && !cached.stale) {
      return cached.value;
    }

    if (cached && cached.stale) {
      const entry = this.store.get(key);
      if (entry && !entry.revalidating) {
        entry.revalidating = true;
        this.stats.revalidations++;
        // Background revalidation
        revalidate(key)
          .then((freshValue) => {
            this.set(key, freshValue, options);
          })
          .catch(() => {
            if (entry) entry.revalidating = false;
          });
        broadcast({
          type: "revalidate",
          key,
          timestamp: Date.now(),
          sourceTabId: TAB_ID,
        });
      }
      return cached.value;
    }

    // Cache miss — fetch synchronously
    try {
      const value = await revalidate(key);
      this.set(key, value, options);
      return value;
    } catch {
      return null;
    }
  }

  delete(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    for (const tag of entry.tags) {
      this.tagIndex.get(tag)?.delete(key);
    }
    this.store.delete(key);
    this.stats.evictions++;
    this.stats.size = this.store.size;

    broadcast({
      type: "delete",
      key,
      timestamp: Date.now(),
      sourceTabId: TAB_ID,
    });
    return true;
  }

  // -----------------------------------------------------------------------
  // Tag-based invalidation
  // -----------------------------------------------------------------------

  invalidateByTag(tag: string): number {
    const keys = this.tagIndex.get(tag);
    if (!keys) return 0;
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count++;
    }
    this.tagIndex.delete(tag);
    this.stats.evictions += count;
    this.stats.size = this.store.size;

    broadcast({
      type: "invalidate_tag",
      tag,
      timestamp: Date.now(),
      sourceTabId: TAB_ID,
    });
    return count;
  }

  invalidateByTags(tags: string[]): number {
    let total = 0;
    for (const tag of tags) {
      total += this.invalidateByTag(tag);
    }
    return total;
  }

  // -----------------------------------------------------------------------
  // Event-based invalidation
  // -----------------------------------------------------------------------

  onInvalidate(key: string, callback: (key: string) => void): () => void {
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(callback);
    return () => {
      set?.delete(callback);
      if (set?.size === 0) this.listeners.delete(key);
    };
  }

  /**
   * Trigger event-based invalidation for a key. Deletes the entry
   * and notifies all listeners.
   */
  invalidate(key: string): void {
    this.delete(key);
    const cbs = this.listeners.get(key);
    if (cbs) {
      for (const cb of cbs) cb(key);
    }
  }

  invalidateAll(): void {
    const keys = Array.from(this.store.keys());
    this.store.clear();
    this.tagIndex.clear();
    this.stats.evictions += keys.length;
    this.stats.size = 0;

    for (const key of keys) {
      const cbs = this.listeners.get(key);
      if (cbs) {
        for (const cb of cbs) cb(key);
      }
    }

    broadcast({
      type: "invalidate_all",
      timestamp: Date.now(),
      sourceTabId: TAB_ID,
    });
  }

  // -----------------------------------------------------------------------
  // Cross-tab coherence
  // -----------------------------------------------------------------------

  private setupCrossTabListener(): void {
    const channel = getBroadcastChannel();
    if (!channel) return;

    channel.addEventListener("message", (e: MessageEvent<CacheEvent>) => {
      const event = e.data;
      if (event.sourceTabId === TAB_ID) return;

      switch (event.type) {
        case "delete":
          if (event.key) this.store.delete(event.key);
          break;
        case "invalidate_tag":
          if (event.tag) {
            const keys = this.tagIndex.get(event.tag);
            if (keys) {
              for (const k of keys) this.store.delete(k);
              this.tagIndex.delete(event.tag);
            }
          }
          break;
        case "invalidate_all":
          this.store.clear();
          this.tagIndex.clear();
          break;
        case "set":
          // We don't have the value, so just invalidate to force refetch
          if (event.key) this.store.delete(event.key);
          break;
      }
      this.stats.size = this.store.size;
    });
  }

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------

  private startCleanup(): void {
    if (typeof setInterval === "undefined") return;
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store) {
        if (now > entry.staleAt) {
          this.delete(key);
        }
      }
    }, 30_000);
  }

  // -----------------------------------------------------------------------
  // Stats & utilities
  // -----------------------------------------------------------------------

  getStats(): CacheStats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      staleHits: 0,
      revalidations: 0,
      evictions: 0,
      size: this.store.size,
    };
  }

  has(key: string): boolean {
    const result = this.get(key);
    return result !== null;
  }

  keys(): string[] {
    return Array.from(this.store.keys());
  }

  size(): number {
    return this.store.size;
  }

  destroy(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.store.clear();
    this.tagIndex.clear();
    this.listeners.clear();
    broadcastChannel?.close();
    broadcastChannel = null;
  }
}

// ---------------------------------------------------------------------------
// Default singleton instance
// ---------------------------------------------------------------------------

let defaultCache: InvalidatingCache | null = null;

export function getCache(): InvalidatingCache {
  if (!defaultCache) {
    defaultCache = new InvalidatingCache();
  }
  return defaultCache;
}

export function resetCache(): void {
  defaultCache?.destroy();
  defaultCache = null;
}
