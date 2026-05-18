/**
 * Rate limit monitoring and dashboard data provider (Issue #347).
 * Tracks usage per key, provides remaining quota and usage trends,
 * and supports threshold-based alerts.
 */

export interface UsageRecord {
  timestamp: number;
  count: number;
}

export interface UsageTrend {
  period: string;
  total: number;
  peak: number;
  average: number;
}

export interface AlertConfig {
  /** Threshold percentage (0-100). Alert fires when usage exceeds this. */
  thresholdPercent: number;
  /** Callback invoked when the threshold is breached. */
  onAlert: (key: string, usagePercent: number, limit: number) => void;
}

interface KeyState {
  timestamps: number[];
  limit: number;
  windowMs: number;
}

export class RateLimitMonitor {
  private keys = new Map<string, KeyState>();
  private alerts: AlertConfig[] = [];

  /**
   * Register a key with its rate limit configuration.
   */
  registerKey(
    key: string,
    options: { limit: number; windowMs: number }
  ): void {
    if (!this.keys.has(key)) {
      this.keys.set(key, {
        timestamps: [],
        limit: options.limit,
        windowMs: options.windowMs,
      });
    } else {
      const state = this.keys.get(key)!;
      state.limit = options.limit;
      state.windowMs = options.windowMs;
    }
  }

  /**
   * Record a request for a key.
   */
  recordUsage(key: string): void {
    const state = this.keys.get(key);
    if (!state) return;

    const now = Date.now();
    state.timestamps.push(now);

    // Evict timestamps outside the window
    state.timestamps = state.timestamps.filter(
      (ts) => now - ts < state.windowMs
    );

    // Check alerts
    const usagePercent = (state.timestamps.length / state.limit) * 100;
    for (const alert of this.alerts) {
      if (usagePercent >= alert.thresholdPercent) {
        alert.onAlert(key, usagePercent, state.limit);
      }
    }
  }

  /**
   * Get the remaining quota for a key within the current window.
   */
  getRemainingQuota(key: string): {
    remaining: number;
    limit: number;
    used: number;
    usagePercent: number;
  } | null {
    const state = this.keys.get(key);
    if (!state) return null;

    const now = Date.now();
    state.timestamps = state.timestamps.filter(
      (ts) => now - ts < state.windowMs
    );

    const used = state.timestamps.length;
    const remaining = Math.max(0, state.limit - used);
    const usagePercent =
      state.limit > 0 ? Math.round((used / state.limit) * 10000) / 100 : 0;

    return { remaining, limit: state.limit, used, usagePercent };
  }

  /**
   * Get usage trends for a key over a specified period.
   *
   * @param key - The rate limit key
   * @param period - Period to analyse: "hour", "day", or "week"
   */
  getUsageTrends(
    key: string,
    period: "hour" | "day" | "week"
  ): UsageTrend | null {
    const state = this.keys.get(key);
    if (!state) return null;

    const now = Date.now();
    const periodMs =
      period === "hour"
        ? 60 * 60 * 1000
        : period === "day"
          ? 24 * 60 * 60 * 1000
          : 7 * 24 * 60 * 60 * 1000;

    const relevantTimestamps = state.timestamps.filter(
      (ts) => now - ts < periodMs
    );

    if (relevantTimestamps.length === 0) {
      return { period, total: 0, peak: 0, average: 0 };
    }

    // Split into buckets (hour: per minute, day: per hour, week: per day)
    const bucketSizeMs =
      period === "hour"
        ? 60 * 1000
        : period === "day"
          ? 60 * 60 * 1000
          : 24 * 60 * 60 * 1000;

    const buckets = new Map<number, number>();
    for (const ts of relevantTimestamps) {
      const bucketKey = Math.floor(ts / bucketSizeMs);
      buckets.set(bucketKey, (buckets.get(bucketKey) ?? 0) + 1);
    }

    const bucketCounts = Array.from(buckets.values());
    const total = relevantTimestamps.length;
    const peak = Math.max(...bucketCounts);
    const average = Math.round(total / bucketCounts.length);

    return { period, total, peak, average };
  }

  /**
   * Add an alert that fires when any key's usage exceeds a threshold.
   */
  addAlert(config: AlertConfig): void {
    this.alerts.push(config);
  }

  /**
   * Remove all registered alerts.
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Get a snapshot of all tracked keys and their current usage.
   */
  getSnapshot(): Record<
    string,
    { used: number; limit: number; remaining: number; usagePercent: number }
  > {
    const snapshot: Record<
      string,
      { used: number; limit: number; remaining: number; usagePercent: number }
    > = {};

    for (const [key] of this.keys) {
      const quota = this.getRemainingQuota(key);
      if (quota) {
        snapshot[key] = quota;
      }
    }

    return snapshot;
  }

  /**
   * Reset usage data for a specific key.
   */
  resetKey(key: string): void {
    const state = this.keys.get(key);
    if (state) {
      state.timestamps = [];
    }
  }

  /**
   * Remove a key entirely from monitoring.
   */
  removeKey(key: string): void {
    this.keys.delete(key);
  }
}
