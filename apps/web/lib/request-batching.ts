/**
 * Request batching engine (Issue #492).
 * Batch multiple requests, configurable window,
 * per-request response mapping, error handling per item, auto-splitting.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface BatchConfig {
  /** Maximum time to wait before flushing a batch, in ms (default 50). */
  windowMs: number;
  /** Maximum number of items in a single batch (default 20). */
  maxBatchSize: number;
  /** Maximum total payload size in bytes before auto-split (default 1MB). */
  maxPayloadBytes: number;
  /** Whether to retry failed items individually (default true). */
  retryFailedIndividually: boolean;
  /** Maximum number of individual retries for failed items (default 2). */
  maxRetries: number;
  /** Timeout for the entire batch request in ms (default 30000). */
  timeoutMs: number;
}

export interface BatchItem<TReq, TRes> {
  id: string;
  request: TReq;
  resolve: (value: TRes) => void;
  reject: (error: Error) => void;
  retryCount: number;
}

export interface BatchResult<TRes> {
  id: string;
  success: boolean;
  data?: TRes;
  error?: string;
}

export interface BatchExecutor<TReq, TRes> {
  (requests: { id: string; request: TReq }[]): Promise<BatchResult<TRes>[]>;
}

export interface BatchStats {
  totalBatches: number;
  totalItems: number;
  totalSuccesses: number;
  totalFailures: number;
  totalRetries: number;
  totalSplits: number;
  averageBatchSize: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
}

/* ------------------------------------------------------------------ */
/*  Default config                                                    */
/* ------------------------------------------------------------------ */

const DEFAULT_CONFIG: BatchConfig = {
  windowMs: 50,
  maxBatchSize: 20,
  maxPayloadBytes: 1_048_576,
  retryFailedIndividually: true,
  maxRetries: 2,
  timeoutMs: 30_000,
};

/* ------------------------------------------------------------------ */
/*  Request batcher                                                   */
/* ------------------------------------------------------------------ */

export class RequestBatcher<TReq, TRes> {
  private config: BatchConfig;
  private executor: BatchExecutor<TReq, TRes>;
  private queue: BatchItem<TReq, TRes>[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private processing = false;

  // Stats
  private batchCount = 0;
  private itemCount = 0;
  private successCount = 0;
  private failureCount = 0;
  private retryCount = 0;
  private splitCount = 0;
  private latencies: number[] = [];

  constructor(
    executor: BatchExecutor<TReq, TRes>,
    config?: Partial<BatchConfig>
  ) {
    this.executor = executor;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /* -- Public API --------------------------------------------------- */

  /**
   * Add a request to the batch queue. Returns a promise that resolves
   * with the individual response.
   */
  add(request: TReq): Promise<TRes> {
    return new Promise<TRes>((resolve, reject) => {
      const item: BatchItem<TReq, TRes> = {
        id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        request,
        resolve,
        reject,
        retryCount: 0,
      };

      this.queue.push(item);

      // Check if we should flush immediately (batch full)
      if (this.queue.length >= this.config.maxBatchSize) {
        this.flush();
      } else if (!this.timer) {
        // Start the window timer
        this.timer = setTimeout(() => {
          this.timer = null;
          this.flush();
        }, this.config.windowMs);
      }
    });
  }

  /**
   * Force flush the current batch immediately.
   */
  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length === 0) return;

    const items = this.queue.splice(0);
    void this.processBatch(items);
  }

  /**
   * Drain all pending items and stop accepting new ones.
   */
  async drain(): Promise<void> {
    this.flush();
    // Wait for all processing to complete
    while (this.processing) {
      await sleep(10);
    }
  }

  getStats(): BatchStats {
    const avgBatchSize =
      this.batchCount > 0 ? this.itemCount / this.batchCount : 0;
    const avgLatency =
      this.latencies.length > 0
        ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
        : 0;

    // p95 latency
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95Latency = sorted[p95Index] ?? 0;

    return {
      totalBatches: this.batchCount,
      totalItems: this.itemCount,
      totalSuccesses: this.successCount,
      totalFailures: this.failureCount,
      totalRetries: this.retryCount,
      totalSplits: this.splitCount,
      averageBatchSize: Math.round(avgBatchSize * 100) / 100,
      averageLatencyMs: Math.round(avgLatency * 100) / 100,
      p95LatencyMs: Math.round(p95Latency * 100) / 100,
    };
  }

  resetStats(): void {
    this.batchCount = 0;
    this.itemCount = 0;
    this.successCount = 0;
    this.failureCount = 0;
    this.retryCount = 0;
    this.splitCount = 0;
    this.latencies = [];
  }

  /* -- Batch processing --------------------------------------------- */

  private async processBatch(items: BatchItem<TReq, TRes>[]): Promise<void> {
    this.processing = true;

    try {
      // Auto-split if needed
      const batches = this.splitBatch(items);

      for (const batch of batches) {
        await this.executeBatch(batch);
      }
    } finally {
      this.processing = false;
    }
  }

  private async executeBatch(items: BatchItem<TReq, TRes>[]): Promise<void> {
    if (items.length === 0) return;

    this.batchCount++;
    this.itemCount += items.length;
    const start = Date.now();

    try {
      const requests = items.map((item) => ({
        id: item.id,
        request: item.request,
      }));

      const results = await withTimeout(
        this.executor(requests),
        this.config.timeoutMs
      );

      const latency = Date.now() - start;
      this.latencies.push(latency);
      if (this.latencies.length > 1000) this.latencies.shift();

      // Map results back to individual items
      const resultMap = new Map<string, BatchResult<TRes>>();
      for (const result of results) {
        resultMap.set(result.id, result);
      }

      const failedItems: BatchItem<TReq, TRes>[] = [];

      for (const item of items) {
        const result = resultMap.get(item.id);

        if (!result) {
          // No result for this item
          if (this.shouldRetry(item)) {
            failedItems.push(item);
          } else {
            item.reject(new Error(`No response received for request ${item.id}`));
            this.failureCount++;
          }
          continue;
        }

        if (result.success && result.data !== undefined) {
          item.resolve(result.data);
          this.successCount++;
        } else {
          if (this.shouldRetry(item)) {
            failedItems.push(item);
          } else {
            item.reject(new Error(result.error ?? `Request ${item.id} failed`));
            this.failureCount++;
          }
        }
      }

      // Retry failed items individually
      if (failedItems.length > 0) {
        await this.retryItems(failedItems);
      }
    } catch (err) {
      const latency = Date.now() - start;
      this.latencies.push(latency);

      // Batch-level failure: retry all items individually
      if (this.config.retryFailedIndividually) {
        const retryable = items.filter((item) => this.shouldRetry(item));
        const nonRetryable = items.filter((item) => !this.shouldRetry(item));

        for (const item of nonRetryable) {
          item.reject(
            err instanceof Error ? err : new Error(String(err))
          );
          this.failureCount++;
        }

        if (retryable.length > 0) {
          await this.retryItems(retryable);
        }
      } else {
        for (const item of items) {
          item.reject(
            err instanceof Error ? err : new Error(String(err))
          );
          this.failureCount++;
        }
      }
    }
  }

  private shouldRetry(item: BatchItem<TReq, TRes>): boolean {
    return (
      this.config.retryFailedIndividually &&
      item.retryCount < this.config.maxRetries
    );
  }

  private async retryItems(items: BatchItem<TReq, TRes>[]): Promise<void> {
    for (const item of items) {
      item.retryCount++;
      this.retryCount++;
    }

    // Retry in smaller batches or individually
    if (items.length === 1) {
      await this.executeBatch(items);
    } else {
      // Split into individual requests for retry
      for (const item of items) {
        await this.executeBatch([item]);
      }
    }
  }

  /* -- Auto-splitting ----------------------------------------------- */

  private splitBatch(items: BatchItem<TReq, TRes>[]): BatchItem<TReq, TRes>[][] {
    // Check batch size limit
    if (items.length <= this.config.maxBatchSize) {
      // Check payload size
      const payloadSize = this.estimatePayloadSize(items);
      if (payloadSize <= this.config.maxPayloadBytes) {
        return [items];
      }
    }

    this.splitCount++;

    // Split in half recursively
    const mid = Math.ceil(items.length / 2);
    const left = items.slice(0, mid);
    const right = items.slice(mid);

    return [...this.splitBatch(left), ...this.splitBatch(right)];
  }

  private estimatePayloadSize(items: BatchItem<TReq, TRes>[]): number {
    try {
      const payload = items.map((item) => ({
        id: item.id,
        request: item.request,
      }));
      return new TextEncoder().encode(JSON.stringify(payload)).length;
    } catch {
      // Fallback: estimate based on count
      return items.length * 1024;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Typed batch creator (convenience)                                 */
/* ------------------------------------------------------------------ */

export function createBatcher<TReq, TRes>(
  executor: BatchExecutor<TReq, TRes>,
  config?: Partial<BatchConfig>
): RequestBatcher<TReq, TRes> {
  return new RequestBatcher(executor, config);
}

/**
 * Create a batcher that groups by a key and executes
 * separate batches per group.
 */
export function createGroupedBatcher<TReq, TRes>(
  keyFn: (request: TReq) => string,
  executor: BatchExecutor<TReq, TRes>,
  config?: Partial<BatchConfig>
): { add: (request: TReq) => Promise<TRes>; flush: () => void; drain: () => Promise<void>; getStats: () => Record<string, BatchStats> } {
  const batchers = new Map<string, RequestBatcher<TReq, TRes>>();

  function getOrCreate(key: string): RequestBatcher<TReq, TRes> {
    let batcher = batchers.get(key);
    if (!batcher) {
      batcher = new RequestBatcher(executor, config);
      batchers.set(key, batcher);
    }
    return batcher;
  }

  return {
    add(request: TReq): Promise<TRes> {
      const key = keyFn(request);
      return getOrCreate(key).add(request);
    },
    flush(): void {
      for (const batcher of batchers.values()) {
        batcher.flush();
      }
    },
    async drain(): Promise<void> {
      const promises = Array.from(batchers.values()).map((b) => b.drain());
      await Promise.all(promises);
    },
    getStats(): Record<string, BatchStats> {
      const stats: Record<string, BatchStats> = {};
      for (const [key, batcher] of batchers.entries()) {
        stats[key] = batcher.getStats();
      }
      return stats;
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Batch request timed out after ${ms}ms`)),
      ms
    );
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
