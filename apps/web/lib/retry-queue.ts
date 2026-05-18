"use client";

/**
 * Retry queue for failed API requests (Issue #356).
 * Queue failed requests with metadata, exponential backoff with jitter,
 * persist to localStorage, and expose a React hook.
 */

import { useState, useEffect, useCallback, useRef } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface RetryQueueItem {
  /** Unique identifier for this queued request. */
  id: string;
  /** URL or endpoint of the failed request. */
  url: string;
  /** HTTP method. */
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Serialized request body. */
  body?: string;
  /** Request headers. */
  headers?: Record<string, string>;
  /** ISO timestamp of initial failure. */
  failedAt: string;
  /** Number of attempts so far. */
  attemptCount: number;
  /** Last error message. */
  lastError: string;
  /** ISO timestamp of the last retry attempt. */
  lastAttemptAt: string | null;
  /** Scheduled next retry ISO timestamp. */
  nextRetryAt: string;
  /** Current status. */
  status: "pending" | "retrying" | "succeeded" | "dead";
  /** Optional metadata attached by the caller. */
  metadata?: Record<string, unknown>;
}

export interface RetryQueueConfig {
  /** Maximum number of retries before marking dead (default 5). */
  maxRetries: number;
  /** Base delay in ms for exponential backoff (default 1000). */
  baseDelayMs: number;
  /** Maximum delay in ms (cap for backoff, default 60000). */
  maxDelayMs: number;
  /** Jitter factor 0-1 (default 0.3). */
  jitterFactor: number;
  /** localStorage key (default "chetana:retry-queue"). */
  storageKey: string;
  /** Maximum queue size (default 100). */
  maxQueueSize: number;
}

export interface RetryQueueStats {
  pending: number;
  retrying: number;
  succeeded: number;
  dead: number;
  total: number;
}

export interface RetryResult {
  item: RetryQueueItem;
  success: boolean;
  response?: Response;
  error?: string;
}

const DEFAULT_CONFIG: RetryQueueConfig = {
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 60_000,
  jitterFactor: 0.3,
  storageKey: "chetana:retry-queue",
  maxQueueSize: 100,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function generateId(): string {
  return `rq_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Calculate exponential backoff delay with jitter.
 */
export function calculateBackoff(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  jitterFactor: number
): number {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  const capped = Math.min(exponentialDelay, maxDelayMs);
  const jitter = capped * jitterFactor * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(capped + jitter));
}

/* ------------------------------------------------------------------ */
/*  RetryQueue class                                                  */
/* ------------------------------------------------------------------ */

export class RetryQueue {
  private queue: RetryQueueItem[] = [];
  private config: RetryQueueConfig;
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor(config: Partial<RetryQueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFromStorage();
  }

  /* -- Persistence ------------------------------------------------- */

  private loadFromStorage(): void {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(this.config.storageKey);
      if (raw) {
        const parsed: RetryQueueItem[] = JSON.parse(raw);
        this.queue = parsed.filter(
          (item) => item.status === "pending" || item.status === "retrying"
        );
        // Reset retrying items back to pending
        for (const item of this.queue) {
          if (item.status === "retrying") {
            item.status = "pending";
          }
        }
        this.persist();
      }
    } catch {
      this.queue = [];
    }
  }

  private persist(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(this.queue));
    } catch {
      // Storage full or unavailable - silently ignore
    }
  }

  private notify(): void {
    this.persist();
    for (const listener of this.listeners) {
      listener();
    }
  }

  /* -- Public API -------------------------------------------------- */

  /**
   * Enqueue a failed request for retry.
   */
  enqueue(
    url: string,
    method: RetryQueueItem["method"],
    error: string,
    options?: {
      body?: string;
      headers?: Record<string, string>;
      metadata?: Record<string, unknown>;
    }
  ): RetryQueueItem {
    if (this.queue.length >= this.config.maxQueueSize) {
      // Remove oldest dead or succeeded items first, then oldest pending
      const removable = this.queue.find(
        (i) => i.status === "dead" || i.status === "succeeded"
      );
      if (removable) {
        this.queue = this.queue.filter((i) => i.id !== removable.id);
      } else {
        this.queue.shift();
      }
    }

    const now = new Date().toISOString();
    const delay = calculateBackoff(
      0,
      this.config.baseDelayMs,
      this.config.maxDelayMs,
      this.config.jitterFactor
    );

    const item: RetryQueueItem = {
      id: generateId(),
      url,
      method,
      body: options?.body,
      headers: options?.headers,
      failedAt: now,
      attemptCount: 0,
      lastError: error,
      lastAttemptAt: null,
      nextRetryAt: new Date(Date.now() + delay).toISOString(),
      status: "pending",
      metadata: options?.metadata,
    };

    this.queue.push(item);
    this.scheduleRetry(item, delay);
    this.notify();
    return item;
  }

  /**
   * Remove an item from the queue.
   */
  remove(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.queue = this.queue.filter((i) => i.id !== id);
    this.notify();
  }

  /**
   * Get all items in the queue.
   */
  getItems(): readonly RetryQueueItem[] {
    return this.queue;
  }

  /**
   * Get queue statistics.
   */
  getStats(): RetryQueueStats {
    const stats: RetryQueueStats = {
      pending: 0,
      retrying: 0,
      succeeded: 0,
      dead: 0,
      total: this.queue.length,
    };
    for (const item of this.queue) {
      stats[item.status]++;
    }
    return stats;
  }

  /**
   * Manually retry a specific item immediately.
   */
  async retryNow(id: string): Promise<RetryResult | null> {
    const item = this.queue.find((i) => i.id === id);
    if (!item || item.status === "dead" || item.status === "succeeded") {
      return null;
    }
    return this.executeRetry(item);
  }

  /**
   * Retry all pending items immediately.
   */
  async retryAll(): Promise<RetryResult[]> {
    const pending = this.queue.filter((i) => i.status === "pending");
    const results = await Promise.allSettled(
      pending.map((item) => this.executeRetry(item))
    );
    return results
      .filter(
        (r): r is PromiseFulfilledResult<RetryResult> =>
          r.status === "fulfilled"
      )
      .map((r) => r.value);
  }

  /**
   * Clear all items from the queue.
   */
  clear(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.queue = [];
    this.notify();
  }

  /**
   * Clear only dead/succeeded items.
   */
  clearCompleted(): void {
    this.queue = this.queue.filter(
      (i) => i.status === "pending" || i.status === "retrying"
    );
    this.notify();
  }

  /**
   * Subscribe to queue changes. Returns unsubscribe function.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Dispose of the queue, clearing all timers.
   */
  dispose(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.listeners.clear();
  }

  /* -- Internal ---------------------------------------------------- */

  private scheduleRetry(item: RetryQueueItem, delayMs: number): void {
    const existing = this.timers.get(item.id);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.executeRetry(item);
    }, delayMs);

    this.timers.set(item.id, timer);
  }

  private async executeRetry(item: RetryQueueItem): Promise<RetryResult> {
    item.status = "retrying";
    item.attemptCount++;
    item.lastAttemptAt = new Date().toISOString();
    this.notify();

    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      item.status = "succeeded";
      this.timers.delete(item.id);
      this.notify();
      return { item, success: true, response };
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Unknown retry error";
      item.lastError = errorMsg;

      if (item.attemptCount >= this.config.maxRetries) {
        item.status = "dead";
        this.timers.delete(item.id);
      } else {
        item.status = "pending";
        const delay = calculateBackoff(
          item.attemptCount,
          this.config.baseDelayMs,
          this.config.maxDelayMs,
          this.config.jitterFactor
        );
        item.nextRetryAt = new Date(Date.now() + delay).toISOString();
        this.scheduleRetry(item, delay);
      }

      this.notify();
      return { item, success: false, error: errorMsg };
    }
  }
}

/* ------------------------------------------------------------------ */
/*  React hook                                                        */
/* ------------------------------------------------------------------ */

export interface UseRetryQueueReturn {
  items: readonly RetryQueueItem[];
  stats: RetryQueueStats;
  enqueue: RetryQueue["enqueue"];
  remove: RetryQueue["remove"];
  retryNow: RetryQueue["retryNow"];
  retryAll: RetryQueue["retryAll"];
  clear: RetryQueue["clear"];
  clearCompleted: RetryQueue["clearCompleted"];
}

/**
 * React hook for managing the retry queue.
 */
export function useRetryQueue(
  config?: Partial<RetryQueueConfig>
): UseRetryQueueReturn {
  const queueRef = useRef<RetryQueue | null>(null);

  if (queueRef.current === null) {
    queueRef.current = new RetryQueue(config);
  }

  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const queue = queueRef.current!;
    const unsub = queue.subscribe(() => {
      forceUpdate((n) => n + 1);
    });
    return () => {
      unsub();
      queue.dispose();
    };
  }, []);

  const enqueue = useCallback<RetryQueue["enqueue"]>(
    (...args) => queueRef.current!.enqueue(...args),
    []
  );
  const remove = useCallback<RetryQueue["remove"]>(
    (id) => queueRef.current!.remove(id),
    []
  );
  const retryNow = useCallback<RetryQueue["retryNow"]>(
    (id) => queueRef.current!.retryNow(id),
    []
  );
  const retryAll = useCallback<RetryQueue["retryAll"]>(
    () => queueRef.current!.retryAll(),
    []
  );
  const clear = useCallback<RetryQueue["clear"]>(
    () => queueRef.current!.clear(),
    []
  );
  const clearCompleted = useCallback<RetryQueue["clearCompleted"]>(
    () => queueRef.current!.clearCompleted(),
    []
  );

  return {
    items: queueRef.current.getItems(),
    stats: queueRef.current.getStats(),
    enqueue,
    remove,
    retryNow,
    retryAll,
    clear,
    clearCompleted,
  };
}
