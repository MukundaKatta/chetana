/**
 * Response latency tracker (Issue #360).
 * Record latency per API call with provider/model metadata,
 * rolling avg, p50/p95/p99, alerts, and CSV export.
 */

import type { ModelProvider } from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface LatencyRecord {
  /** Unique ID for this record. */
  id: string;
  /** Model provider. */
  provider: ModelProvider;
  /** Model name/version. */
  model: string;
  /** API endpoint or operation name. */
  endpoint: string;
  /** Latency in milliseconds. */
  latencyMs: number;
  /** HTTP status code. */
  statusCode: number;
  /** Whether the request succeeded. */
  success: boolean;
  /** ISO timestamp of the request. */
  timestamp: string;
  /** Optional token count for the request. */
  tokenCount?: number;
  /** Optional additional metadata. */
  metadata?: Record<string, unknown>;
}

export interface LatencyStats {
  count: number;
  mean: number;
  median: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  stdDev: number;
}

export interface LatencyAlert {
  id: string;
  provider: ModelProvider;
  model: string;
  latencyMs: number;
  thresholdMs: number;
  timestamp: string;
  message: string;
}

export interface LatencyTrackerConfig {
  /** Maximum records to keep in memory (default 10000). */
  maxRecords: number;
  /** Rolling window size for averages (default 100). */
  rollingWindowSize: number;
  /** Latency threshold in ms for alerts (default 10000). */
  alertThresholdMs: number;
  /** Per-provider thresholds (overrides global). */
  providerThresholds?: Partial<Record<ModelProvider, number>>;
  /** Callback when an alert fires. */
  onAlert?: (alert: LatencyAlert) => void;
  /** localStorage key (default "chetana:latency-records"). */
  storageKey: string;
}

const DEFAULT_CONFIG: LatencyTrackerConfig = {
  maxRecords: 10_000,
  rollingWindowSize: 100,
  alertThresholdMs: 10_000,
  storageKey: "chetana:latency-records",
};

/* ------------------------------------------------------------------ */
/*  Statistical helpers                                               */
/* ------------------------------------------------------------------ */

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower]!;
  const weight = index - lower;
  return sorted[lower]! * (1 - weight) + sorted[upper]! * weight;
}

function calculateStats(latencies: number[]): LatencyStats {
  if (latencies.length === 0) {
    return { count: 0, mean: 0, median: 0, p50: 0, p95: 0, p99: 0, min: 0, max: 0, stdDev: 0 };
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / sorted.length;
  const variance =
    sorted.reduce((acc, val) => acc + (val - mean) ** 2, 0) / sorted.length;

  return {
    count: sorted.length,
    mean: Math.round(mean * 100) / 100,
    median: percentile(sorted, 50),
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    stdDev: Math.round(Math.sqrt(variance) * 100) / 100,
  };
}

/* ------------------------------------------------------------------ */
/*  LatencyTracker                                                    */
/* ------------------------------------------------------------------ */

export class LatencyTracker {
  private records: LatencyRecord[] = [];
  private alerts: LatencyAlert[] = [];
  private config: LatencyTrackerConfig;
  private idCounter = 0;

  constructor(config: Partial<LatencyTrackerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFromStorage();
  }

  /* -- Persistence ------------------------------------------------- */

  private loadFromStorage(): void {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(this.config.storageKey);
      if (raw) {
        this.records = JSON.parse(raw);
      }
    } catch {
      this.records = [];
    }
  }

  private persist(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        this.config.storageKey,
        JSON.stringify(this.records)
      );
    } catch {
      // Storage full - trim older records
      this.records = this.records.slice(-Math.floor(this.config.maxRecords / 2));
      try {
        localStorage.setItem(
          this.config.storageKey,
          JSON.stringify(this.records)
        );
      } catch {
        // Give up on persistence
      }
    }
  }

  /* -- Recording --------------------------------------------------- */

  /**
   * Record a latency measurement.
   */
  record(
    provider: ModelProvider,
    model: string,
    endpoint: string,
    latencyMs: number,
    statusCode: number,
    options?: {
      tokenCount?: number;
      metadata?: Record<string, unknown>;
    }
  ): LatencyRecord {
    const entry: LatencyRecord = {
      id: `lat_${++this.idCounter}_${Date.now()}`,
      provider,
      model,
      endpoint,
      latencyMs,
      statusCode,
      success: statusCode >= 200 && statusCode < 300,
      timestamp: new Date().toISOString(),
      tokenCount: options?.tokenCount,
      metadata: options?.metadata,
    };

    this.records.push(entry);

    // Enforce max records
    if (this.records.length > this.config.maxRecords) {
      this.records = this.records.slice(-this.config.maxRecords);
    }

    // Check alerts
    this.checkAlert(entry);
    this.persist();

    return entry;
  }

  /**
   * Wrap a fetch call and automatically record its latency.
   */
  async trackFetch(
    provider: ModelProvider,
    model: string,
    endpoint: string,
    fetchFn: () => Promise<Response>,
    options?: { tokenCount?: number; metadata?: Record<string, unknown> }
  ): Promise<Response> {
    const start = performance.now();
    let statusCode = 0;
    try {
      const response = await fetchFn();
      statusCode = response.status;
      return response;
    } catch (err) {
      statusCode = 0;
      throw err;
    } finally {
      const latencyMs = Math.round(performance.now() - start);
      this.record(provider, model, endpoint, latencyMs, statusCode, options);
    }
  }

  /* -- Querying ---------------------------------------------------- */

  /**
   * Get all records, optionally filtered.
   */
  getRecords(filter?: {
    provider?: ModelProvider;
    model?: string;
    endpoint?: string;
    since?: string;
    until?: string;
    successOnly?: boolean;
  }): LatencyRecord[] {
    let results = this.records;

    if (filter) {
      if (filter.provider) {
        results = results.filter((r) => r.provider === filter.provider);
      }
      if (filter.model) {
        results = results.filter((r) => r.model === filter.model);
      }
      if (filter.endpoint) {
        results = results.filter((r) => r.endpoint === filter.endpoint);
      }
      if (filter.since) {
        results = results.filter((r) => r.timestamp >= filter.since!);
      }
      if (filter.until) {
        results = results.filter((r) => r.timestamp <= filter.until!);
      }
      if (filter.successOnly) {
        results = results.filter((r) => r.success);
      }
    }

    return results;
  }

  /**
   * Calculate statistics for matching records.
   */
  getStats(filter?: {
    provider?: ModelProvider;
    model?: string;
    endpoint?: string;
    since?: string;
  }): LatencyStats {
    const records = this.getRecords(filter);
    return calculateStats(records.map((r) => r.latencyMs));
  }

  /**
   * Calculate rolling average over the last N records.
   */
  getRollingAverage(
    provider?: ModelProvider,
    model?: string,
    windowSize?: number
  ): number {
    const size = windowSize ?? this.config.rollingWindowSize;
    let records = this.records;
    if (provider) records = records.filter((r) => r.provider === provider);
    if (model) records = records.filter((r) => r.model === model);

    const window = records.slice(-size);
    if (window.length === 0) return 0;
    return (
      Math.round(
        (window.reduce((sum, r) => sum + r.latencyMs, 0) / window.length) * 100
      ) / 100
    );
  }

  /**
   * Get per-provider statistics.
   */
  getStatsByProvider(): Map<ModelProvider, LatencyStats> {
    const grouped = new Map<ModelProvider, number[]>();
    for (const record of this.records) {
      const existing = grouped.get(record.provider) ?? [];
      existing.push(record.latencyMs);
      grouped.set(record.provider, existing);
    }

    const result = new Map<ModelProvider, LatencyStats>();
    for (const [provider, latencies] of grouped) {
      result.set(provider, calculateStats(latencies));
    }
    return result;
  }

  /**
   * Get per-model statistics.
   */
  getStatsByModel(): Map<string, LatencyStats> {
    const grouped = new Map<string, number[]>();
    for (const record of this.records) {
      const key = `${record.provider}/${record.model}`;
      const existing = grouped.get(key) ?? [];
      existing.push(record.latencyMs);
      grouped.set(key, existing);
    }

    const result = new Map<string, LatencyStats>();
    for (const [key, latencies] of grouped) {
      result.set(key, calculateStats(latencies));
    }
    return result;
  }

  /* -- Alerts ------------------------------------------------------ */

  private checkAlert(record: LatencyRecord): void {
    const threshold =
      this.config.providerThresholds?.[record.provider] ??
      this.config.alertThresholdMs;

    if (record.latencyMs > threshold) {
      const alert: LatencyAlert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        provider: record.provider,
        model: record.model,
        latencyMs: record.latencyMs,
        thresholdMs: threshold,
        timestamp: record.timestamp,
        message: `Latency ${record.latencyMs}ms exceeds threshold ${threshold}ms for ${record.provider}/${record.model}`,
      };
      this.alerts.push(alert);
      this.config.onAlert?.(alert);
    }
  }

  /**
   * Get all alerts.
   */
  getAlerts(): readonly LatencyAlert[] {
    return this.alerts;
  }

  /**
   * Clear all alerts.
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /* -- Export ------------------------------------------------------ */

  /**
   * Export records as CSV string.
   */
  exportCSV(filter?: {
    provider?: ModelProvider;
    model?: string;
    since?: string;
  }): string {
    const records = this.getRecords(filter);
    const headers = [
      "id",
      "provider",
      "model",
      "endpoint",
      "latencyMs",
      "statusCode",
      "success",
      "timestamp",
      "tokenCount",
    ];

    const rows = records.map((r) =>
      [
        r.id,
        r.provider,
        r.model,
        r.endpoint,
        r.latencyMs,
        r.statusCode,
        r.success,
        r.timestamp,
        r.tokenCount ?? "",
      ].join(",")
    );

    return [headers.join(","), ...rows].join("\n");
  }

  /**
   * Clear all records.
   */
  clear(): void {
    this.records = [];
    this.alerts = [];
    this.persist();
  }

  /**
   * Get total record count.
   */
  get size(): number {
    return this.records.length;
  }
}

/**
 * Singleton tracker instance for global use.
 */
let globalTracker: LatencyTracker | null = null;

export function getLatencyTracker(
  config?: Partial<LatencyTrackerConfig>
): LatencyTracker {
  if (!globalTracker) {
    globalTracker = new LatencyTracker(config);
  }
  return globalTracker;
}
