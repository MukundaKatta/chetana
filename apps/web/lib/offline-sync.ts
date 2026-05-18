/**
 * Issue #416 - Offline mode with service worker sync
 *
 * Caches critical app assets, queues API requests while offline,
 * syncs on reconnection, and provides conflict resolution for concurrent edits.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface QueuedRequest {
  id: string;
  url: string;
  method: RequestMethod;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  resourceId?: string;
  resourceVersion?: number;
}

export interface SyncResult {
  requestId: string;
  success: boolean;
  status: number | null;
  responseBody: unknown;
  conflict: boolean;
  error?: string;
}

export interface ConflictResolution {
  strategy: "client-wins" | "server-wins" | "merge" | "manual";
  resolvedData?: unknown;
}

export interface OfflineState {
  isOnline: boolean;
  queueLength: number;
  lastSyncAt: number | null;
  syncInProgress: boolean;
  pendingConflicts: ConflictRecord[];
}

export interface ConflictRecord {
  id: string;
  requestId: string;
  resourceId: string;
  clientData: unknown;
  serverData: unknown;
  detectedAt: number;
  resolved: boolean;
  resolution?: ConflictResolution;
}

export interface CacheManifest {
  version: string;
  assets: CacheAsset[];
  updatedAt: number;
}

export interface CacheAsset {
  url: string;
  priority: "critical" | "prefetch" | "lazy";
  maxAge: number;
  cachedAt?: number;
}

export type OfflineEventType =
  | "online"
  | "offline"
  | "sync-start"
  | "sync-complete"
  | "sync-error"
  | "conflict-detected"
  | "conflict-resolved"
  | "request-queued"
  | "request-replayed";

export type OfflineEventListener = (event: OfflineEventType, data?: unknown) => void;

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const QUEUE_STORAGE_KEY = "chetana:offline-queue";
const CONFLICT_STORAGE_KEY = "chetana:offline-conflicts";
const SYNC_STATE_KEY = "chetana:sync-state";
const DEFAULT_MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = 1000;
const MAX_QUEUE_SIZE = 200;

const CRITICAL_ASSETS: CacheAsset[] = [
  { url: "/", priority: "critical", maxAge: 86_400_000 },
  { url: "/dashboard", priority: "critical", maxAge: 86_400_000 },
  { url: "/audits", priority: "critical", maxAge: 86_400_000 },
  { url: "/manifest.json", priority: "critical", maxAge: 604_800_000 },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function generateId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Request Queue                                                     */
/* ------------------------------------------------------------------ */

export class OfflineRequestQueue {
  private queue: QueuedRequest[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    const storage = getStorage();
    if (!storage) return;
    this.queue = safeJsonParse<QueuedRequest[]>(storage.getItem(QUEUE_STORAGE_KEY), []);
  }

  private persist(): void {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
  }

  enqueue(request: Omit<QueuedRequest, "id" | "timestamp" | "retryCount" | "maxRetries"> & { maxRetries?: number }): QueuedRequest {
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      throw new Error(`Offline queue is full (max ${MAX_QUEUE_SIZE} requests)`);
    }

    const queued: QueuedRequest = {
      id: generateId(),
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: request.maxRetries ?? DEFAULT_MAX_RETRIES,
      ...request,
    };

    this.queue.push(queued);
    this.persist();
    return queued;
  }

  dequeue(): QueuedRequest | undefined {
    const item = this.queue.shift();
    this.persist();
    return item;
  }

  peek(): QueuedRequest | undefined {
    return this.queue[0];
  }

  remove(id: string): boolean {
    const idx = this.queue.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    this.queue.splice(idx, 1);
    this.persist();
    return true;
  }

  getAll(): readonly QueuedRequest[] {
    return [...this.queue];
  }

  get length(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
    this.persist();
  }

  incrementRetry(id: string): boolean {
    const item = this.queue.find((r) => r.id === id);
    if (!item) return false;
    item.retryCount += 1;
    this.persist();
    return item.retryCount <= item.maxRetries;
  }

  removeExhausted(): QueuedRequest[] {
    const exhausted = this.queue.filter((r) => r.retryCount >= r.maxRetries);
    this.queue = this.queue.filter((r) => r.retryCount < r.maxRetries);
    this.persist();
    return exhausted;
  }
}

/* ------------------------------------------------------------------ */
/*  Conflict Resolution                                               */
/* ------------------------------------------------------------------ */

export class ConflictResolver {
  private conflicts: ConflictRecord[] = [];
  private defaultStrategy: ConflictResolution["strategy"];

  constructor(defaultStrategy: ConflictResolution["strategy"] = "server-wins") {
    this.defaultStrategy = defaultStrategy;
    this.load();
  }

  private load(): void {
    const storage = getStorage();
    if (!storage) return;
    this.conflicts = safeJsonParse<ConflictRecord[]>(storage.getItem(CONFLICT_STORAGE_KEY), []);
  }

  private persist(): void {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(CONFLICT_STORAGE_KEY, JSON.stringify(this.conflicts));
  }

  detectConflict(
    requestId: string,
    resourceId: string,
    clientData: unknown,
    serverData: unknown,
  ): ConflictRecord {
    const record: ConflictRecord = {
      id: `conflict_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      requestId,
      resourceId,
      clientData,
      serverData,
      detectedAt: Date.now(),
      resolved: false,
    };

    this.conflicts.push(record);
    this.persist();
    return record;
  }

  resolve(conflictId: string, resolution: ConflictResolution): ConflictRecord | null {
    const record = this.conflicts.find((c) => c.id === conflictId);
    if (!record) return null;

    record.resolved = true;
    record.resolution = resolution;
    this.persist();
    return record;
  }

  autoResolve(conflictId: string): ConflictRecord | null {
    const record = this.conflicts.find((c) => c.id === conflictId);
    if (!record) return null;

    let resolvedData: unknown;

    switch (this.defaultStrategy) {
      case "client-wins":
        resolvedData = record.clientData;
        break;
      case "server-wins":
        resolvedData = record.serverData;
        break;
      case "merge":
        resolvedData = this.mergeData(record.clientData, record.serverData);
        break;
      case "manual":
        return record;
    }

    record.resolved = true;
    record.resolution = { strategy: this.defaultStrategy, resolvedData };
    this.persist();
    return record;
  }

  private mergeData(client: unknown, server: unknown): unknown {
    if (
      typeof client === "object" &&
      client !== null &&
      typeof server === "object" &&
      server !== null &&
      !Array.isArray(client) &&
      !Array.isArray(server)
    ) {
      const merged: Record<string, unknown> = { ...(server as Record<string, unknown>) };
      const clientObj = client as Record<string, unknown>;
      for (const key of Object.keys(clientObj)) {
        if (clientObj[key] !== undefined) {
          merged[key] = clientObj[key];
        }
      }
      return merged;
    }
    // Fallback: client wins for non-object types
    return client;
  }

  getPending(): ConflictRecord[] {
    return this.conflicts.filter((c) => !c.resolved);
  }

  getAll(): readonly ConflictRecord[] {
    return [...this.conflicts];
  }

  clearResolved(): void {
    this.conflicts = this.conflicts.filter((c) => !c.resolved);
    this.persist();
  }
}

/* ------------------------------------------------------------------ */
/*  Asset Cache Manager                                               */
/* ------------------------------------------------------------------ */

export class AssetCacheManager {
  private cacheName: string;

  constructor(cacheName = "chetana-offline-v1") {
    this.cacheName = cacheName;
  }

  async cacheAssets(assets: CacheAsset[] = CRITICAL_ASSETS): Promise<{ cached: number; failed: number }> {
    if (typeof caches === "undefined") return { cached: 0, failed: 0 };

    const cache = await caches.open(this.cacheName);
    let cached = 0;
    let failed = 0;

    for (const asset of assets) {
      try {
        const response = await fetch(asset.url);
        if (response.ok) {
          await cache.put(asset.url, response.clone());
          cached++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return { cached, failed };
  }

  async getCached(url: string): Promise<Response | undefined> {
    if (typeof caches === "undefined") return undefined;
    const cache = await caches.open(this.cacheName);
    return cache.match(url) as Promise<Response | undefined>;
  }

  async removeCached(url: string): Promise<boolean> {
    if (typeof caches === "undefined") return false;
    const cache = await caches.open(this.cacheName);
    return cache.delete(url);
  }

  async clearAll(): Promise<boolean> {
    if (typeof caches === "undefined") return false;
    return caches.delete(this.cacheName);
  }

  async getCacheSize(): Promise<number> {
    if (typeof caches === "undefined") return 0;
    const cache = await caches.open(this.cacheName);
    const keys = await cache.keys();
    return keys.length;
  }

  getManifest(): CacheManifest {
    return {
      version: "1.0.0",
      assets: CRITICAL_ASSETS,
      updatedAt: Date.now(),
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Offline Sync Manager                                              */
/* ------------------------------------------------------------------ */

export class OfflineSyncManager {
  private queue: OfflineRequestQueue;
  private conflictResolver: ConflictResolver;
  private cacheManager: AssetCacheManager;
  private listeners: Set<OfflineEventListener> = new Set();
  private isOnline: boolean;
  private syncInProgress = false;
  private lastSyncAt: number | null = null;
  private cleanupHandlers: (() => void)[] = [];

  constructor(
    conflictStrategy: ConflictResolution["strategy"] = "server-wins",
    cacheName?: string,
  ) {
    this.queue = new OfflineRequestQueue();
    this.conflictResolver = new ConflictResolver(conflictStrategy);
    this.cacheManager = new AssetCacheManager(cacheName);
    this.isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
    this.restoreState();
  }

  private restoreState(): void {
    const storage = getStorage();
    if (!storage) return;
    const state = safeJsonParse<{ lastSyncAt: number | null }>(
      storage.getItem(SYNC_STATE_KEY),
      { lastSyncAt: null },
    );
    this.lastSyncAt = state.lastSyncAt;
  }

  private persistState(): void {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(SYNC_STATE_KEY, JSON.stringify({ lastSyncAt: this.lastSyncAt }));
  }

  /** Start listening to online/offline events. */
  start(): void {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      this.isOnline = true;
      this.emit("online");
      void this.sync();
    };

    const handleOffline = () => {
      this.isOnline = false;
      this.emit("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    this.cleanupHandlers.push(() => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    });

    // Pre-cache critical assets
    void this.cacheManager.cacheAssets();
  }

  /** Stop listening and clean up. */
  stop(): void {
    for (const cleanup of this.cleanupHandlers) {
      cleanup();
    }
    this.cleanupHandlers = [];
  }

  /** Subscribe to offline sync events. */
  on(listener: OfflineEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: OfflineEventType, data?: unknown): void {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch {
        // Ignore listener errors
      }
    }
  }

  /** Queue a request for later sync (when offline) or execute immediately. */
  async queueOrExecute(
    url: string,
    options: {
      method?: RequestMethod;
      headers?: Record<string, string>;
      body?: unknown;
      resourceId?: string;
      resourceVersion?: number;
    } = {},
  ): Promise<{ queued: boolean; response?: Response; request?: QueuedRequest }> {
    const method = options.method ?? "GET";
    const headers = options.headers ?? { "Content-Type": "application/json" };
    const body = options.body !== undefined ? JSON.stringify(options.body) : null;

    if (this.isOnline) {
      try {
        const response = await fetch(url, { method, headers, body });
        return { queued: false, response };
      } catch {
        // Network error - fall through to queue
      }
    }

    const request = this.queue.enqueue({
      url,
      method,
      headers,
      body,
      resourceId: options.resourceId,
      resourceVersion: options.resourceVersion,
    });

    this.emit("request-queued", request);
    return { queued: true, request };
  }

  /** Replay all queued requests. */
  async sync(): Promise<SyncResult[]> {
    if (this.syncInProgress) return [];
    if (!this.isOnline) return [];
    if (this.queue.length === 0) return [];

    this.syncInProgress = true;
    this.emit("sync-start");

    const results: SyncResult[] = [];
    const requests = this.queue.getAll();

    for (const request of requests) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body,
        });

        const responseBody = await response.json().catch(() => null);

        if (response.status === 409 && request.resourceId) {
          // Conflict detected
          const conflict = this.conflictResolver.detectConflict(
            request.id,
            request.resourceId,
            request.body ? JSON.parse(request.body) : null,
            responseBody,
          );
          this.emit("conflict-detected", conflict);

          const resolved = this.conflictResolver.autoResolve(conflict.id);
          if (resolved?.resolved) {
            this.emit("conflict-resolved", resolved);
          }

          results.push({
            requestId: request.id,
            success: false,
            status: 409,
            responseBody,
            conflict: true,
          });
        } else if (response.ok) {
          results.push({
            requestId: request.id,
            success: true,
            status: response.status,
            responseBody,
            conflict: false,
          });
          this.emit("request-replayed", request);
        } else {
          const canRetry = this.queue.incrementRetry(request.id);
          results.push({
            requestId: request.id,
            success: false,
            status: response.status,
            responseBody,
            conflict: false,
            error: canRetry ? "Will retry" : "Max retries exhausted",
          });
        }

        this.queue.remove(request.id);

        // Backoff between requests
        await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS));
      } catch (err) {
        const canRetry = this.queue.incrementRetry(request.id);
        results.push({
          requestId: request.id,
          success: false,
          status: null,
          responseBody: null,
          conflict: false,
          error: canRetry
            ? "Network error, will retry"
            : `Network error: ${err instanceof Error ? err.message : "Unknown"}`,
        });

        if (!canRetry) {
          this.queue.remove(request.id);
        }
      }
    }

    // Clean up exhausted requests
    this.queue.removeExhausted();

    this.lastSyncAt = Date.now();
    this.syncInProgress = false;
    this.persistState();
    this.emit("sync-complete", results);

    return results;
  }

  /** Get current offline state. */
  getState(): OfflineState {
    return {
      isOnline: this.isOnline,
      queueLength: this.queue.length,
      lastSyncAt: this.lastSyncAt,
      syncInProgress: this.syncInProgress,
      pendingConflicts: this.conflictResolver.getPending(),
    };
  }

  /** Get the request queue instance. */
  getQueue(): OfflineRequestQueue {
    return this.queue;
  }

  /** Get the conflict resolver instance. */
  getConflictResolver(): ConflictResolver {
    return this.conflictResolver;
  }

  /** Get the cache manager instance. */
  getCacheManager(): AssetCacheManager {
    return this.cacheManager;
  }
}

/* ------------------------------------------------------------------ */
/*  Singleton                                                         */
/* ------------------------------------------------------------------ */

let _instance: OfflineSyncManager | null = null;

export function getOfflineSyncManager(
  conflictStrategy?: ConflictResolution["strategy"],
): OfflineSyncManager {
  if (!_instance) {
    _instance = new OfflineSyncManager(conflictStrategy);
  }
  return _instance;
}

/** Check current online status. */
export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

/** Format last sync time for display. */
export function formatLastSync(timestamp: number | null): string {
  if (timestamp === null) return "Never synced";
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}
