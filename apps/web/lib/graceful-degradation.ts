/**
 * Graceful degradation system (Issue #535).
 *
 * Fallback model chain, cached responses during outage,
 * degradation indicators, auto-recovery, and event logging.
 */

import type { ModelProvider } from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type DegradationLevel = "none" | "minor" | "moderate" | "severe" | "total";

export interface FallbackModel {
  provider: ModelProvider;
  model: string;
  priority: number;
  maxLatencyMs: number;
  available: boolean;
}

export interface DegradationState {
  level: DegradationLevel;
  activeFallbackIndex: number;
  primaryAvailable: boolean;
  usingCache: boolean;
  lastHealthCheck: string;
  recoveryAttempts: number;
  startedAt: string | null;
}

export interface DegradationEvent {
  type:
    | "degradation_started"
    | "degradation_level_changed"
    | "fallback_activated"
    | "cache_activated"
    | "recovery_attempt"
    | "recovery_success"
    | "recovery_failed"
    | "health_check";
  level: DegradationLevel;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface CachedResponse {
  key: string;
  response: string;
  provider: ModelProvider;
  model: string;
  cachedAt: number;
  expiresAt: number;
  hitCount: number;
}

export interface DegradationIndicator {
  name: string;
  value: number;
  threshold: number;
  status: "ok" | "warning" | "critical";
  description: string;
}

export interface HealthCheckResult {
  provider: ModelProvider;
  model: string;
  available: boolean;
  latencyMs: number;
  error?: string;
  checkedAt: string;
}

export interface GracefulDegradationConfig {
  /** Primary model. */
  primary: { provider: ModelProvider; model: string };
  /** Ordered fallback chain. */
  fallbackChain: FallbackModel[];
  /** Health check interval in ms (default 30000). */
  healthCheckIntervalMs: number;
  /** Max recovery attempts before giving up (default 10). */
  maxRecoveryAttempts: number;
  /** Recovery backoff base in ms (default 5000). */
  recoveryBackoffMs: number;
  /** Cache TTL in ms for outage responses (default 3600000 = 1h). */
  cacheTtlMs: number;
  /** Max cached responses (default 500). */
  maxCacheEntries: number;
  /** Latency threshold for warning (ms). */
  latencyWarningMs: number;
  /** Error rate threshold for degradation (0-1). */
  errorRateThreshold: number;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_CONFIG: GracefulDegradationConfig = {
  primary: { provider: "anthropic", model: "claude-sonnet-4-20250514" },
  fallbackChain: [],
  healthCheckIntervalMs: 30_000,
  maxRecoveryAttempts: 10,
  recoveryBackoffMs: 5_000,
  cacheTtlMs: 3_600_000,
  maxCacheEntries: 500,
  latencyWarningMs: 5000,
  errorRateThreshold: 0.1,
};

/* ------------------------------------------------------------------ */
/*  Graceful Degradation Manager                                      */
/* ------------------------------------------------------------------ */

export class GracefulDegradationManager {
  private config: GracefulDegradationConfig;
  private state: DegradationState;
  private events: DegradationEvent[] = [];
  private responseCache = new Map<string, CachedResponse>();
  private recentErrors: number[] = [];
  private recentLatencies: number[] = [];
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private healthCheckFn?: (
    provider: ModelProvider,
    model: string
  ) => Promise<HealthCheckResult>;

  constructor(config: Partial<GracefulDegradationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      level: "none",
      activeFallbackIndex: -1,
      primaryAvailable: true,
      usingCache: false,
      lastHealthCheck: new Date().toISOString(),
      recoveryAttempts: 0,
      startedAt: null,
    };
  }

  /* -------------------------------------------------------------- */
  /*  State access                                                  */
  /* -------------------------------------------------------------- */

  getState(): DegradationState {
    return { ...this.state };
  }

  getEvents(limit: number = 50): DegradationEvent[] {
    return this.events.slice(-limit);
  }

  getDegradationLevel(): DegradationLevel {
    return this.state.level;
  }

  /* -------------------------------------------------------------- */
  /*  Health check                                                  */
  /* -------------------------------------------------------------- */

  /** Register a health check function. */
  setHealthCheckFn(
    fn: (provider: ModelProvider, model: string) => Promise<HealthCheckResult>
  ): void {
    this.healthCheckFn = fn;
  }

  /** Start periodic health checks. */
  startHealthChecks(): void {
    if (this.healthCheckTimer) return;
    this.healthCheckTimer = setInterval(
      () => void this.performHealthCheck(),
      this.config.healthCheckIntervalMs
    );
  }

  /** Stop periodic health checks. */
  stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /** Perform a single health check. */
  async performHealthCheck(): Promise<HealthCheckResult[]> {
    if (!this.healthCheckFn) return [];

    const results: HealthCheckResult[] = [];

    // Check primary
    const primaryResult = await this.healthCheckFn(
      this.config.primary.provider,
      this.config.primary.model
    );
    results.push(primaryResult);

    // Check fallbacks
    for (const fb of this.config.fallbackChain) {
      const fbResult = await this.healthCheckFn(fb.provider, fb.model);
      fb.available = fbResult.available;
      results.push(fbResult);
    }

    // Update state based on primary health
    const wasPrimaryAvailable = this.state.primaryAvailable;
    this.state.primaryAvailable = primaryResult.available;
    this.state.lastHealthCheck = new Date().toISOString();

    this.logEvent("health_check", this.state.level, "Health check completed", {
      primaryAvailable: primaryResult.available,
      primaryLatencyMs: primaryResult.latencyMs,
    });

    // If primary recovered
    if (!wasPrimaryAvailable && primaryResult.available) {
      await this.attemptRecovery();
    }

    // If primary went down
    if (wasPrimaryAvailable && !primaryResult.available) {
      this.handlePrimaryFailure();
    }

    return results;
  }

  /* -------------------------------------------------------------- */
  /*  Degradation handling                                          */
  /* -------------------------------------------------------------- */

  /** Record an error for degradation tracking. */
  recordError(error: string): void {
    this.recentErrors.push(Date.now());
    // Keep only errors from the last minute
    const cutoff = Date.now() - 60_000;
    this.recentErrors = this.recentErrors.filter((t) => t > cutoff);

    // Check if error rate exceeds threshold
    const errorRate = this.recentErrors.length / Math.max(1, this.recentErrors.length + this.recentLatencies.length);
    if (errorRate > this.config.errorRateThreshold) {
      this.escalateDegradation();
    }
  }

  /** Record a latency measurement. */
  recordLatency(ms: number): void {
    this.recentLatencies.push(ms);
    // Keep only the last 100 measurements
    if (this.recentLatencies.length > 100) {
      this.recentLatencies = this.recentLatencies.slice(-100);
    }
  }

  /** Handle primary model failure. */
  private handlePrimaryFailure(): void {
    this.state.startedAt = this.state.startedAt ?? new Date().toISOString();

    const availableFallback = this.config.fallbackChain.findIndex(
      (fb) => fb.available
    );

    if (availableFallback >= 0) {
      this.state.activeFallbackIndex = availableFallback;
      this.setLevel(
        availableFallback === 0 ? "minor" : "moderate"
      );
      this.logEvent(
        "fallback_activated",
        this.state.level,
        `Activated fallback: ${this.config.fallbackChain[availableFallback].model}`,
        { fallbackIndex: availableFallback }
      );
    } else {
      // No fallbacks available, use cache
      this.state.usingCache = true;
      this.setLevel("severe");
      this.logEvent(
        "cache_activated",
        this.state.level,
        "All models unavailable, serving from cache"
      );
    }
  }

  /** Escalate degradation level. */
  private escalateDegradation(): void {
    const levels: DegradationLevel[] = [
      "none",
      "minor",
      "moderate",
      "severe",
      "total",
    ];
    const currentIdx = levels.indexOf(this.state.level);
    if (currentIdx < levels.length - 1) {
      this.setLevel(levels[currentIdx + 1]);
    }
  }

  /** Set degradation level with event logging. */
  private setLevel(level: DegradationLevel): void {
    if (level === this.state.level) return;
    const prev = this.state.level;
    this.state.level = level;
    if (level !== "none" && !this.state.startedAt) {
      this.state.startedAt = new Date().toISOString();
    }
    this.logEvent(
      level === "none" ? "recovery_success" : "degradation_level_changed",
      level,
      `Degradation level changed: ${prev} -> ${level}`
    );
  }

  /* -------------------------------------------------------------- */
  /*  Recovery                                                      */
  /* -------------------------------------------------------------- */

  /** Attempt to recover from degradation. */
  async attemptRecovery(): Promise<boolean> {
    this.state.recoveryAttempts++;

    if (this.state.recoveryAttempts > this.config.maxRecoveryAttempts) {
      this.logEvent(
        "recovery_failed",
        this.state.level,
        "Max recovery attempts exceeded"
      );
      return false;
    }

    this.logEvent(
      "recovery_attempt",
      this.state.level,
      `Recovery attempt ${this.state.recoveryAttempts}`,
    );

    if (this.state.primaryAvailable) {
      this.state.level = "none";
      this.state.activeFallbackIndex = -1;
      this.state.usingCache = false;
      this.state.recoveryAttempts = 0;
      this.state.startedAt = null;
      this.logEvent("recovery_success", "none", "Primary model recovered");
      return true;
    }

    return false;
  }

  /* -------------------------------------------------------------- */
  /*  Fallback chain                                                */
  /* -------------------------------------------------------------- */

  /** Get the current active model (primary or fallback). */
  getActiveModel(): { provider: ModelProvider; model: string } | null {
    if (this.state.primaryAvailable) {
      return this.config.primary;
    }

    if (this.state.activeFallbackIndex >= 0) {
      const fb = this.config.fallbackChain[this.state.activeFallbackIndex];
      if (fb?.available) {
        return { provider: fb.provider, model: fb.model };
      }
    }

    return null;
  }

  /** Add a fallback model to the chain. */
  addFallback(fallback: FallbackModel): void {
    this.config.fallbackChain.push(fallback);
    this.config.fallbackChain.sort((a, b) => a.priority - b.priority);
  }

  /* -------------------------------------------------------------- */
  /*  Cache                                                         */
  /* -------------------------------------------------------------- */

  /** Cache a response for potential use during outage. */
  cacheResponse(
    key: string,
    response: string,
    provider: ModelProvider,
    model: string
  ): void {
    // Evict if at capacity
    if (
      this.responseCache.size >= this.config.maxCacheEntries &&
      !this.responseCache.has(key)
    ) {
      const oldest = this.findOldestCacheEntry();
      if (oldest) this.responseCache.delete(oldest);
    }

    this.responseCache.set(key, {
      key,
      response,
      provider,
      model,
      cachedAt: Date.now(),
      expiresAt: Date.now() + this.config.cacheTtlMs,
      hitCount: 0,
    });
  }

  /** Get a cached response. */
  getCachedResponse(key: string): string | null {
    const entry = this.responseCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.responseCache.delete(key);
      return null;
    }
    entry.hitCount++;
    return entry.response;
  }

  /** Get the number of cached responses. */
  getCacheSize(): number {
    return this.responseCache.size;
  }

  private findOldestCacheEntry(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.responseCache) {
      if (entry.cachedAt < oldestTime) {
        oldestTime = entry.cachedAt;
        oldestKey = key;
      }
    }
    return oldestKey;
  }

  /* -------------------------------------------------------------- */
  /*  Degradation indicators                                        */
  /* -------------------------------------------------------------- */

  /** Get current degradation indicators. */
  getIndicators(): DegradationIndicator[] {
    const indicators: DegradationIndicator[] = [];

    // Error rate
    const totalRecent = this.recentErrors.length + this.recentLatencies.length;
    const errorRate =
      totalRecent > 0 ? this.recentErrors.length / totalRecent : 0;
    indicators.push({
      name: "Error Rate",
      value: errorRate,
      threshold: this.config.errorRateThreshold,
      status:
        errorRate > this.config.errorRateThreshold
          ? "critical"
          : errorRate > this.config.errorRateThreshold * 0.5
            ? "warning"
            : "ok",
      description: `${(errorRate * 100).toFixed(1)}% of recent requests failed`,
    });

    // Latency
    const avgLatency =
      this.recentLatencies.length > 0
        ? this.recentLatencies.reduce((a, b) => a + b, 0) /
          this.recentLatencies.length
        : 0;
    indicators.push({
      name: "Average Latency",
      value: avgLatency,
      threshold: this.config.latencyWarningMs,
      status:
        avgLatency > this.config.latencyWarningMs * 2
          ? "critical"
          : avgLatency > this.config.latencyWarningMs
            ? "warning"
            : "ok",
      description: `${avgLatency.toFixed(0)}ms average response time`,
    });

    // Cache usage
    const cacheUsage =
      this.responseCache.size / Math.max(1, this.config.maxCacheEntries);
    indicators.push({
      name: "Cache Usage",
      value: cacheUsage,
      threshold: 0.9,
      status:
        cacheUsage > 0.9 ? "critical" : cacheUsage > 0.7 ? "warning" : "ok",
      description: `${this.responseCache.size}/${this.config.maxCacheEntries} cache entries used`,
    });

    // Fallback depth
    const fallbackDepth =
      this.state.activeFallbackIndex >= 0
        ? (this.state.activeFallbackIndex + 1) /
          Math.max(1, this.config.fallbackChain.length)
        : 0;
    indicators.push({
      name: "Fallback Depth",
      value: fallbackDepth,
      threshold: 0.5,
      status:
        fallbackDepth > 0.75
          ? "critical"
          : fallbackDepth > 0
            ? "warning"
            : "ok",
      description:
        this.state.activeFallbackIndex >= 0
          ? `Using fallback ${this.state.activeFallbackIndex + 1} of ${this.config.fallbackChain.length}`
          : "Using primary model",
    });

    return indicators;
  }

  /* -------------------------------------------------------------- */
  /*  Event logging                                                 */
  /* -------------------------------------------------------------- */

  private logEvent(
    type: DegradationEvent["type"],
    level: DegradationLevel,
    message: string,
    details?: Record<string, unknown>
  ): void {
    this.events.push({
      type,
      level,
      message,
      details,
      timestamp: new Date().toISOString(),
    });
    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }
}
