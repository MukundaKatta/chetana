/**
 * Metrics collector: counter/gauge/histogram/summary types,
 * custom registration, periodic export, in-memory aggregation,
 * dashboard data (Issue #509).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MetricType = "counter" | "gauge" | "histogram" | "summary";

export interface MetricLabels {
  [key: string]: string;
}

export interface MetricDefinition {
  name: string;
  type: MetricType;
  help: string;
  labels?: string[];
  /** Histogram bucket boundaries. */
  buckets?: number[];
  /** Summary quantiles to compute. */
  quantiles?: number[];
}

export interface MetricSample {
  name: string;
  labels: MetricLabels;
  value: number;
  timestamp: number;
}

export interface HistogramData {
  count: number;
  sum: number;
  buckets: Map<number, number>; // upper bound -> cumulative count
}

export interface SummaryData {
  count: number;
  sum: number;
  values: number[]; // raw values for quantile computation
  maxValues: number;
}

export interface DashboardMetric {
  name: string;
  type: MetricType;
  help: string;
  series: Array<{
    labels: MetricLabels;
    value: number;
    timestamp: number;
  }>;
}

export interface ExportPayload {
  metrics: DashboardMetric[];
  collectedAt: string;
  periodMs: number;
}

export type ExportHandler = (payload: ExportPayload) => Promise<void>;

// ---------------------------------------------------------------------------
// Default buckets / quantiles
// ---------------------------------------------------------------------------

const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
const DEFAULT_QUANTILES = [0.5, 0.9, 0.95, 0.99];
const MAX_SUMMARY_VALUES = 10_000;

// ---------------------------------------------------------------------------
// Metric value stores
// ---------------------------------------------------------------------------

function labelsKey(labels: MetricLabels): string {
  const sorted = Object.keys(labels).sort();
  return sorted.map((k) => `${k}=${labels[k]}`).join(",");
}

class CounterMetric {
  private values = new Map<string, { labels: MetricLabels; value: number; ts: number }>();

  inc(labels: MetricLabels = {}, amount = 1): void {
    if (amount < 0) throw new Error("Counter can only increase");
    const key = labelsKey(labels);
    const existing = this.values.get(key);
    if (existing) {
      existing.value += amount;
      existing.ts = Date.now();
    } else {
      this.values.set(key, { labels, value: amount, ts: Date.now() });
    }
  }

  get(labels: MetricLabels = {}): number {
    return this.values.get(labelsKey(labels))?.value ?? 0;
  }

  samples(): Array<{ labels: MetricLabels; value: number; timestamp: number }> {
    return Array.from(this.values.values()).map((v) => ({
      labels: v.labels,
      value: v.value,
      timestamp: v.ts,
    }));
  }

  reset(): void {
    this.values.clear();
  }
}

class GaugeMetric {
  private values = new Map<string, { labels: MetricLabels; value: number; ts: number }>();

  set(labels: MetricLabels = {}, value: number): void {
    const key = labelsKey(labels);
    this.values.set(key, { labels, value, ts: Date.now() });
  }

  inc(labels: MetricLabels = {}, amount = 1): void {
    const key = labelsKey(labels);
    const existing = this.values.get(key);
    this.values.set(key, {
      labels,
      value: (existing?.value ?? 0) + amount,
      ts: Date.now(),
    });
  }

  dec(labels: MetricLabels = {}, amount = 1): void {
    this.inc(labels, -amount);
  }

  get(labels: MetricLabels = {}): number {
    return this.values.get(labelsKey(labels))?.value ?? 0;
  }

  samples(): Array<{ labels: MetricLabels; value: number; timestamp: number }> {
    return Array.from(this.values.values()).map((v) => ({
      labels: v.labels,
      value: v.value,
      timestamp: v.ts,
    }));
  }

  reset(): void {
    this.values.clear();
  }
}

class HistogramMetric {
  private data = new Map<string, { labels: MetricLabels; histo: HistogramData }>();
  private bucketBounds: number[];

  constructor(buckets: number[] = DEFAULT_BUCKETS) {
    this.bucketBounds = [...buckets].sort((a, b) => a - b);
  }

  observe(labels: MetricLabels = {}, value: number): void {
    const key = labelsKey(labels);
    let entry = this.data.get(key);
    if (!entry) {
      const bucketMap = new Map<number, number>();
      for (const b of this.bucketBounds) bucketMap.set(b, 0);
      bucketMap.set(Infinity, 0);
      entry = { labels, histo: { count: 0, sum: 0, buckets: bucketMap } };
      this.data.set(key, entry);
    }
    entry.histo.count++;
    entry.histo.sum += value;
    for (const b of this.bucketBounds) {
      if (value <= b) entry.histo.buckets.set(b, (entry.histo.buckets.get(b) ?? 0) + 1);
    }
    entry.histo.buckets.set(Infinity, (entry.histo.buckets.get(Infinity) ?? 0) + 1);
  }

  getData(labels: MetricLabels = {}): HistogramData | undefined {
    return this.data.get(labelsKey(labels))?.histo;
  }

  samples(): Array<{ labels: MetricLabels; value: number; timestamp: number }> {
    const now = Date.now();
    const result: Array<{ labels: MetricLabels; value: number; timestamp: number }> = [];
    for (const entry of this.data.values()) {
      // Export sum as the primary metric
      result.push({ labels: entry.labels, value: entry.histo.sum, timestamp: now });
    }
    return result;
  }

  reset(): void {
    this.data.clear();
  }
}

class SummaryMetric {
  private data = new Map<string, { labels: MetricLabels; summary: SummaryData }>();
  private quantiles: number[];

  constructor(quantiles: number[] = DEFAULT_QUANTILES) {
    this.quantiles = quantiles;
  }

  observe(labels: MetricLabels = {}, value: number): void {
    const key = labelsKey(labels);
    let entry = this.data.get(key);
    if (!entry) {
      entry = {
        labels,
        summary: { count: 0, sum: 0, values: [], maxValues: MAX_SUMMARY_VALUES },
      };
      this.data.set(key, entry);
    }
    entry.summary.count++;
    entry.summary.sum += value;
    if (entry.summary.values.length < entry.summary.maxValues) {
      entry.summary.values.push(value);
    }
  }

  getQuantile(labels: MetricLabels = {}, q: number): number | undefined {
    const entry = this.data.get(labelsKey(labels));
    if (!entry || entry.summary.values.length === 0) return undefined;
    const sorted = [...entry.summary.values].sort((a, b) => a - b);
    const idx = Math.ceil(q * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }

  getAllQuantiles(labels: MetricLabels = {}): Record<string, number> {
    const result: Record<string, number> = {};
    for (const q of this.quantiles) {
      const val = this.getQuantile(labels, q);
      if (val !== undefined) result[`p${q * 100}`] = val;
    }
    return result;
  }

  samples(): Array<{ labels: MetricLabels; value: number; timestamp: number }> {
    const now = Date.now();
    const result: Array<{ labels: MetricLabels; value: number; timestamp: number }> = [];
    for (const entry of this.data.values()) {
      result.push({ labels: entry.labels, value: entry.summary.sum, timestamp: now });
    }
    return result;
  }

  reset(): void {
    this.data.clear();
  }
}

// ---------------------------------------------------------------------------
// Metrics collector
// ---------------------------------------------------------------------------

type MetricInstance = CounterMetric | GaugeMetric | HistogramMetric | SummaryMetric;

export class MetricsCollector {
  private definitions = new Map<string, MetricDefinition>();
  private metrics = new Map<string, MetricInstance>();
  private exportHandlers: ExportHandler[] = [];
  private exportTimer: ReturnType<typeof setInterval> | null = null;
  private exportIntervalMs = 60_000;

  // -----------------------------------------------------------------------
  // Registration
  // -----------------------------------------------------------------------

  register(def: MetricDefinition): void {
    if (this.definitions.has(def.name)) {
      throw new Error(`Metric "${def.name}" is already registered`);
    }
    this.definitions.set(def.name, def);
    switch (def.type) {
      case "counter":
        this.metrics.set(def.name, new CounterMetric());
        break;
      case "gauge":
        this.metrics.set(def.name, new GaugeMetric());
        break;
      case "histogram":
        this.metrics.set(def.name, new HistogramMetric(def.buckets));
        break;
      case "summary":
        this.metrics.set(def.name, new SummaryMetric(def.quantiles));
        break;
    }
  }

  unregister(name: string): boolean {
    this.definitions.delete(name);
    return this.metrics.delete(name);
  }

  // -----------------------------------------------------------------------
  // Metric operations
  // -----------------------------------------------------------------------

  counter(name: string): CounterMetric {
    const m = this.metrics.get(name);
    if (!m || !(m instanceof CounterMetric)) {
      throw new Error(`Counter "${name}" not found`);
    }
    return m;
  }

  gauge(name: string): GaugeMetric {
    const m = this.metrics.get(name);
    if (!m || !(m instanceof GaugeMetric)) {
      throw new Error(`Gauge "${name}" not found`);
    }
    return m;
  }

  histogram(name: string): HistogramMetric {
    const m = this.metrics.get(name);
    if (!m || !(m instanceof HistogramMetric)) {
      throw new Error(`Histogram "${name}" not found`);
    }
    return m;
  }

  summary(name: string): SummaryMetric {
    const m = this.metrics.get(name);
    if (!m || !(m instanceof SummaryMetric)) {
      throw new Error(`Summary "${name}" not found`);
    }
    return m;
  }

  // -----------------------------------------------------------------------
  // Dashboard data
  // -----------------------------------------------------------------------

  getDashboardData(): DashboardMetric[] {
    const result: DashboardMetric[] = [];
    for (const [name, def] of this.definitions) {
      const metric = this.metrics.get(name);
      if (!metric) continue;
      result.push({
        name: def.name,
        type: def.type,
        help: def.help,
        series: metric.samples(),
      });
    }
    return result;
  }

  // -----------------------------------------------------------------------
  // Export
  // -----------------------------------------------------------------------

  addExportHandler(handler: ExportHandler): void {
    this.exportHandlers.push(handler);
  }

  startPeriodicExport(intervalMs = 60_000): void {
    this.exportIntervalMs = intervalMs;
    if (this.exportTimer) clearInterval(this.exportTimer);
    this.exportTimer = setInterval(() => {
      this.export().catch(() => {
        /* swallow export errors */
      });
    }, intervalMs);
  }

  stopPeriodicExport(): void {
    if (this.exportTimer) {
      clearInterval(this.exportTimer);
      this.exportTimer = null;
    }
  }

  async export(): Promise<ExportPayload> {
    const payload: ExportPayload = {
      metrics: this.getDashboardData(),
      collectedAt: new Date().toISOString(),
      periodMs: this.exportIntervalMs,
    };
    await Promise.allSettled(
      this.exportHandlers.map((h) => h(payload))
    );
    return payload;
  }

  // -----------------------------------------------------------------------
  // Reset
  // -----------------------------------------------------------------------

  resetAll(): void {
    for (const metric of this.metrics.values()) {
      metric.reset();
    }
  }

  destroy(): void {
    this.stopPeriodicExport();
    this.definitions.clear();
    this.metrics.clear();
    this.exportHandlers.length = 0;
  }
}

// ---------------------------------------------------------------------------
// Singleton with pre-registered app metrics
// ---------------------------------------------------------------------------

let defaultCollector: MetricsCollector | null = null;

export function getMetricsCollector(): MetricsCollector {
  if (!defaultCollector) {
    defaultCollector = new MetricsCollector();
    // Pre-register common app metrics
    defaultCollector.register({
      name: "audits_total",
      type: "counter",
      help: "Total number of audits started",
      labels: ["provider", "model"],
    });
    defaultCollector.register({
      name: "audits_active",
      type: "gauge",
      help: "Currently running audits",
    });
    defaultCollector.register({
      name: "audit_duration_seconds",
      type: "histogram",
      help: "Audit duration in seconds",
      buckets: [10, 30, 60, 120, 300, 600],
    });
    defaultCollector.register({
      name: "probe_score",
      type: "summary",
      help: "Distribution of probe scores",
      quantiles: [0.25, 0.5, 0.75, 0.9, 0.99],
    });
    defaultCollector.register({
      name: "api_requests_total",
      type: "counter",
      help: "Total API requests",
      labels: ["method", "path", "status"],
    });
    defaultCollector.register({
      name: "api_latency_seconds",
      type: "histogram",
      help: "API request latency",
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
    });
  }
  return defaultCollector;
}

export function resetMetricsCollector(): void {
  defaultCollector?.destroy();
  defaultCollector = null;
}
