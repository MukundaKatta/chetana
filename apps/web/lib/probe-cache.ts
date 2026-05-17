/**
 * In-memory LRU cache for probe responses with configurable TTL.
 */

export interface CacheEntry {
  response: string;
  score: number;
  cachedAt: number;
  expiresAt: number;
}

interface InternalEntry extends CacheEntry {
  key: string;
  lastAccessed: number;
}

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_SIZE = 100;

const cache = new Map<string, InternalEntry>();

/**
 * Build a cache key from provider, model, and probe identifiers.
 */
export function buildCacheKey(
  modelProvider: string,
  modelName: string,
  probeId: string,
): string {
  return `${modelProvider}:${modelName}:${probeId}`;
}

/**
 * Evict the least-recently-used entry when the cache exceeds its size limit.
 */
function evictLRU(): void {
  if (cache.size <= MAX_CACHE_SIZE) return;

  let oldestKey: string | null = null;
  let oldestTime = Infinity;

  for (const [key, entry] of cache.entries()) {
    if (entry.lastAccessed < oldestTime) {
      oldestTime = entry.lastAccessed;
      oldestKey = key;
    }
  }

  if (oldestKey !== null) {
    cache.delete(oldestKey);
  }
}

/**
 * Remove expired entries from the cache.
 */
function pruneExpired(): void {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now >= entry.expiresAt) {
      cache.delete(key);
    }
  }
}

/**
 * Retrieve a cached response by key.
 * Returns `null` if the entry is missing or expired.
 */
export function getCachedResponse(key: string): CacheEntry | null {
  const entry = cache.get(key);

  if (!entry) return null;

  const now = Date.now();
  if (now >= entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  // Update last accessed time for LRU tracking
  entry.lastAccessed = now;

  return {
    response: entry.response,
    score: entry.score,
    cachedAt: entry.cachedAt,
    expiresAt: entry.expiresAt,
  };
}

/**
 * Store a response in the cache.
 *
 * @param key - Cache key (use `buildCacheKey` to generate)
 * @param response - The model response text
 * @param score - The probe score
 * @param ttlMs - Time-to-live in milliseconds (default: 1 hour)
 */
export function setCachedResponse(
  key: string,
  response: string,
  score: number,
  ttlMs: number = DEFAULT_TTL_MS,
): void {
  const now = Date.now();

  cache.set(key, {
    key,
    response,
    score,
    cachedAt: now,
    expiresAt: now + ttlMs,
    lastAccessed: now,
  });

  // Evict oldest entry if we exceed the size limit
  if (cache.size > MAX_CACHE_SIZE) {
    evictLRU();
  }
}

/**
 * Remove all entries from the cache.
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Remove a single entry from the cache.
 */
export function clearCacheEntry(key: string): void {
  cache.delete(key);
}

/**
 * Get the current number of entries in the cache (excluding expired).
 */
export function getCacheSize(): number {
  pruneExpired();
  return cache.size;
}
