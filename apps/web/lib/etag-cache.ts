/**
 * ETag caching utilities (Issue #526).
 *
 * ETag generation from content hash, If-None-Match / 304 handling,
 * Cache-Control header building, Vary header management, and
 * cache busting strategies.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface CacheConfig {
  /** Max-age in seconds (default 3600). */
  maxAge: number;
  /** S-maxage for shared caches in seconds (optional). */
  sMaxAge?: number;
  /** Whether to set must-revalidate (default true). */
  mustRevalidate: boolean;
  /** Whether to set public or private (default "public"). */
  visibility: "public" | "private";
  /** Whether to set no-cache (requires revalidation). */
  noCache: boolean;
  /** Whether to set no-store (no caching at all). */
  noStore: boolean;
  /** Stale-while-revalidate duration in seconds (optional). */
  staleWhileRevalidate?: number;
  /** Stale-if-error duration in seconds (optional). */
  staleIfError?: number;
  /** Immutable flag for versioned assets. */
  immutable: boolean;
}

export interface ETagOptions {
  /** Use weak ETags (prefix with W/). */
  weak: boolean;
  /** Custom hash function override. */
  hashFn?: (content: string) => string;
}

export interface CacheHeaders {
  "Cache-Control": string;
  ETag?: string;
  Vary?: string;
  "Last-Modified"?: string;
}

export interface CacheMatchResult {
  matched: boolean;
  status: 200 | 304;
  headers: CacheHeaders;
}

export interface CacheBustConfig {
  /** Strategy for cache busting. */
  strategy: "query" | "path" | "filename";
  /** Version or hash to use. */
  version: string;
}

export interface CacheEntry<T = unknown> {
  data: T;
  etag: string;
  createdAt: number;
  lastAccessed: number;
  hitCount: number;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxAge: 3600,
  mustRevalidate: true,
  visibility: "public",
  noCache: false,
  noStore: false,
  immutable: false,
};

const DEFAULT_ETAG_OPTIONS: ETagOptions = {
  weak: false,
};

/* ------------------------------------------------------------------ */
/*  ETag generation                                                   */
/* ------------------------------------------------------------------ */

/**
 * Simple content hash using FNV-1a algorithm.
 * Returns a hex string.
 */
function fnv1aHash(content: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // Produce a longer hash by running multiple passes
  let h2 = hash;
  for (let i = 0; i < content.length; i++) {
    h2 ^= content.charCodeAt(content.length - 1 - i);
    h2 = Math.imul(h2, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0") +
    (h2 >>> 0).toString(16).padStart(8, "0");
}

/**
 * Generate an ETag from content.
 */
export function generateETag(
  content: string,
  options: Partial<ETagOptions> = {}
): string {
  const opts = { ...DEFAULT_ETAG_OPTIONS, ...options };
  const hash = opts.hashFn ? opts.hashFn(content) : fnv1aHash(content);
  const tag = `"${hash}"`;
  return opts.weak ? `W/${tag}` : tag;
}

/**
 * Generate an ETag from an object by serializing to JSON first.
 */
export function generateETagFromObject(
  obj: unknown,
  options: Partial<ETagOptions> = {}
): string {
  return generateETag(JSON.stringify(obj), options);
}

/* ------------------------------------------------------------------ */
/*  Cache-Control header builder                                      */
/* ------------------------------------------------------------------ */

/**
 * Build a Cache-Control header string from config.
 */
export function buildCacheControl(
  config: Partial<CacheConfig> = {}
): string {
  const c = { ...DEFAULT_CACHE_CONFIG, ...config };
  const directives: string[] = [];

  if (c.noStore) {
    directives.push("no-store");
    return directives.join(", ");
  }

  directives.push(c.visibility);

  if (c.noCache) {
    directives.push("no-cache");
  }

  directives.push(`max-age=${c.maxAge}`);

  if (c.sMaxAge !== undefined) {
    directives.push(`s-maxage=${c.sMaxAge}`);
  }

  if (c.mustRevalidate) {
    directives.push("must-revalidate");
  }

  if (c.staleWhileRevalidate !== undefined) {
    directives.push(`stale-while-revalidate=${c.staleWhileRevalidate}`);
  }

  if (c.staleIfError !== undefined) {
    directives.push(`stale-if-error=${c.staleIfError}`);
  }

  if (c.immutable) {
    directives.push("immutable");
  }

  return directives.join(", ");
}

/* ------------------------------------------------------------------ */
/*  Vary header                                                       */
/* ------------------------------------------------------------------ */

/**
 * Build a Vary header from a list of header names.
 */
export function buildVaryHeader(headers: string[]): string {
  const unique = [...new Set(headers.map((h) => h.trim()))];
  return unique.join(", ");
}

/**
 * Merge multiple Vary header values.
 */
export function mergeVaryHeaders(...values: string[]): string {
  const all = values
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
  return buildVaryHeader(all);
}

/* ------------------------------------------------------------------ */
/*  If-None-Match / 304 handling                                      */
/* ------------------------------------------------------------------ */

/**
 * Parse the If-None-Match header into an array of ETags.
 */
export function parseIfNoneMatch(header: string): string[] {
  if (header.trim() === "*") return ["*"];
  return header
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

/**
 * Check if any of the client ETags match the current ETag.
 * Supports both strong and weak comparison.
 */
export function etagMatches(
  clientEtags: string[],
  currentEtag: string,
  weakComparison: boolean = true
): boolean {
  if (clientEtags.includes("*")) return true;

  const normalize = (tag: string): string => {
    if (weakComparison) {
      return tag.replace(/^W\//, "");
    }
    return tag;
  };

  const normalizedCurrent = normalize(currentEtag);
  return clientEtags.some((tag) => normalize(tag) === normalizedCurrent);
}

/**
 * Handle a conditional GET request.
 * Returns whether to send a 304 or the full response.
 */
export function handleConditionalGet(
  ifNoneMatch: string | null,
  currentEtag: string,
  cacheConfig: Partial<CacheConfig> = {},
  varyHeaders: string[] = ["Accept-Encoding"]
): CacheMatchResult {
  const headers: CacheHeaders = {
    "Cache-Control": buildCacheControl(cacheConfig),
    ETag: currentEtag,
    Vary: buildVaryHeader(varyHeaders),
  };

  if (ifNoneMatch) {
    const clientEtags = parseIfNoneMatch(ifNoneMatch);
    if (etagMatches(clientEtags, currentEtag)) {
      return { matched: true, status: 304, headers };
    }
  }

  return { matched: false, status: 200, headers };
}

/* ------------------------------------------------------------------ */
/*  Cache busting                                                     */
/* ------------------------------------------------------------------ */

/**
 * Apply cache busting to a URL.
 */
export function bustCache(url: string, config: CacheBustConfig): string {
  const { strategy, version } = config;

  switch (strategy) {
    case "query": {
      const separator = url.includes("?") ? "&" : "?";
      return `${url}${separator}v=${version}`;
    }
    case "path": {
      const lastSlash = url.lastIndexOf("/");
      if (lastSlash === -1) return `/${version}/${url}`;
      return `${url.slice(0, lastSlash + 1)}${version}/${url.slice(lastSlash + 1)}`;
    }
    case "filename": {
      const dotIndex = url.lastIndexOf(".");
      if (dotIndex === -1) return `${url}.${version}`;
      return `${url.slice(0, dotIndex)}.${version}${url.slice(dotIndex)}`;
    }
    default:
      return url;
  }
}

/* ------------------------------------------------------------------ */
/*  In-memory ETag cache                                              */
/* ------------------------------------------------------------------ */

export class ETagCache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxEntries: number;

  constructor(maxEntries: number = 1000) {
    this.maxEntries = maxEntries;
  }

  /** Set a cache entry, computing the ETag from the data. */
  set(key: string, data: T): CacheEntry<T> {
    // Evict LRU if at capacity
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      this.evictLRU();
    }

    const etag = generateETag(JSON.stringify(data));
    const entry: CacheEntry<T> = {
      data,
      etag,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      hitCount: 0,
    };
    this.cache.set(key, entry);
    return entry;
  }

  /** Get a cache entry if the ETag doesn't match (returns null for cache hit / 304). */
  get(key: string, ifNoneMatch?: string): { data: T; etag: string } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    entry.lastAccessed = Date.now();
    entry.hitCount++;

    if (ifNoneMatch) {
      const clientEtags = parseIfNoneMatch(ifNoneMatch);
      if (etagMatches(clientEtags, entry.etag)) {
        return null; // 304 - not modified
      }
    }

    return { data: entry.data, etag: entry.etag };
  }

  /** Check if a key exists and its ETag matches. */
  has(key: string, etag?: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (etag) return etagMatches([etag], entry.etag);
    return true;
  }

  /** Invalidate a cache entry. */
  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  /** Invalidate all entries matching a pattern. */
  invalidatePattern(pattern: RegExp): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /** Clear the entire cache. */
  clear(): void {
    this.cache.clear();
  }

  /** Get cache statistics. */
  stats(): { size: number; maxEntries: number; totalHits: number } {
    let totalHits = 0;
    for (const entry of this.cache.values()) {
      totalHits += entry.hitCount;
    }
    return { size: this.cache.size, maxEntries: this.maxEntries, totalHits };
  }

  /** Evict the least recently used entry. */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    if (oldestKey) this.cache.delete(oldestKey);
  }
}
