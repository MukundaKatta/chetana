/**
 * Circuit breaker for model APIs (Issue #373).
 * Three states: closed/open/half-open.
 * Configurable failure threshold and recovery timeout.
 * Per-provider instances, fallback behavior.
 */

import type { ModelProvider } from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerConfig {
  /** Number of failures before opening the circuit (default 5). */
  failureThreshold: number;
  /** Time in ms to wait before transitioning from open to half-open (default 30000). */
  recoveryTimeoutMs: number;
  /** Number of successful requests in half-open to close the circuit (default 2). */
  halfOpenSuccessThreshold: number;
  /** Time window in ms for counting failures (default 60000). */
  failureWindowMs: number;
  /** Callback when state changes. */
  onStateChange?: (from: CircuitState, to: CircuitState, provider: string) => void;
  /** Fallback function when circuit is open. */
  fallback?: <T>() => T | Promise<T>;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailureAt: string | null;
  lastSuccessAt: string | null;
  openedAt: string | null;
  halfOpenAt: string | null;
  closedAt: string | null;
  consecutiveSuccessesInHalfOpen: number;
}

export interface CircuitBreakerEvent {
  type: "state_change" | "failure" | "success" | "rejected";
  from?: CircuitState;
  to?: CircuitState;
  provider: string;
  timestamp: string;
  error?: string;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeoutMs: 30_000,
  halfOpenSuccessThreshold: 2,
  failureWindowMs: 60_000,
};

/* ------------------------------------------------------------------ */
/*  CircuitBreaker                                                    */
/* ------------------------------------------------------------------ */

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures: Array<{ timestamp: number; error: string }> = [];
  private successCount = 0;
  private totalRequests = 0;
  private halfOpenSuccesses = 0;
  private lastFailureAt: string | null = null;
  private lastSuccessAt: string | null = null;
  private openedAt: string | null = null;
  private halfOpenAt: string | null = null;
  private closedAt: string | null = null;
  private recoveryTimer: ReturnType<typeof setTimeout> | null = null;
  private events: CircuitBreakerEvent[] = [];

  constructor(
    private readonly provider: string,
    private readonly config: CircuitBreakerConfig = DEFAULT_CONFIG
  ) {
    this.closedAt = new Date().toISOString();
  }

  /* -- State Machine ----------------------------------------------- */

  private transition(newState: CircuitState): void {
    const oldState = this.state;
    if (oldState === newState) return;

    this.state = newState;
    const now = new Date().toISOString();

    switch (newState) {
      case "open":
        this.openedAt = now;
        this.halfOpenSuccesses = 0;
        this.scheduleRecovery();
        break;
      case "half-open":
        this.halfOpenAt = now;
        this.halfOpenSuccesses = 0;
        break;
      case "closed":
        this.closedAt = now;
        this.failures = [];
        this.halfOpenSuccesses = 0;
        this.cancelRecovery();
        break;
    }

    this.addEvent({
      type: "state_change",
      from: oldState,
      to: newState,
      provider: this.provider,
      timestamp: now,
    });

    this.config.onStateChange?.(oldState, newState, this.provider);
  }

  private scheduleRecovery(): void {
    this.cancelRecovery();
    this.recoveryTimer = setTimeout(() => {
      if (this.state === "open") {
        this.transition("half-open");
      }
    }, this.config.recoveryTimeoutMs);
  }

  private cancelRecovery(): void {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
  }

  /* -- Failure window cleanup -------------------------------------- */

  private cleanFailureWindow(): void {
    const cutoff = Date.now() - this.config.failureWindowMs;
    this.failures = this.failures.filter((f) => f.timestamp >= cutoff);
  }

  /* -- Public API -------------------------------------------------- */

  /**
   * Execute a function through the circuit breaker.
   * If the circuit is open, the call is rejected or falls back.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    if (this.state === "open") {
      this.addEvent({
        type: "rejected",
        provider: this.provider,
        timestamp: new Date().toISOString(),
      });

      if (this.config.fallback) {
        return this.config.fallback<T>() as Promise<T>;
      }

      throw new CircuitBreakerError(
        `Circuit breaker is OPEN for provider ${this.provider}. Request rejected.`,
        this.provider,
        this.state
      );
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Unknown error";
      this.onFailure(errorMsg);
      throw err;
    }
  }

  /**
   * Record a successful execution.
   */
  onSuccess(): void {
    this.successCount++;
    this.lastSuccessAt = new Date().toISOString();

    this.addEvent({
      type: "success",
      provider: this.provider,
      timestamp: this.lastSuccessAt,
    });

    if (this.state === "half-open") {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.config.halfOpenSuccessThreshold) {
        this.transition("closed");
      }
    }
  }

  /**
   * Record a failed execution.
   */
  onFailure(error: string): void {
    const now = Date.now();
    this.lastFailureAt = new Date(now).toISOString();

    this.failures.push({ timestamp: now, error });
    this.cleanFailureWindow();

    this.addEvent({
      type: "failure",
      provider: this.provider,
      timestamp: this.lastFailureAt,
      error,
    });

    if (this.state === "half-open") {
      // Any failure in half-open goes back to open
      this.transition("open");
    } else if (this.state === "closed") {
      if (this.failures.length >= this.config.failureThreshold) {
        this.transition("open");
      }
    }
  }

  /**
   * Check if the circuit allows requests.
   */
  isAllowed(): boolean {
    return this.state !== "open";
  }

  /**
   * Get current state.
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get detailed stats.
   */
  getStats(): CircuitBreakerStats {
    this.cleanFailureWindow();
    return {
      state: this.state,
      failures: this.failures.length,
      successes: this.successCount,
      totalRequests: this.totalRequests,
      lastFailureAt: this.lastFailureAt,
      lastSuccessAt: this.lastSuccessAt,
      openedAt: this.openedAt,
      halfOpenAt: this.halfOpenAt,
      closedAt: this.closedAt,
      consecutiveSuccessesInHalfOpen: this.halfOpenSuccesses,
    };
  }

  /**
   * Get events log.
   */
  getEvents(): readonly CircuitBreakerEvent[] {
    return this.events;
  }

  /**
   * Manually reset the circuit breaker to closed.
   */
  reset(): void {
    this.transition("closed");
    this.failures = [];
    this.successCount = 0;
    this.totalRequests = 0;
    this.halfOpenSuccesses = 0;
    this.events = [];
  }

  /**
   * Manually trip the circuit breaker to open.
   */
  trip(): void {
    this.transition("open");
  }

  /**
   * Dispose resources.
   */
  dispose(): void {
    this.cancelRecovery();
    this.events = [];
  }

  /* -- Internal ---------------------------------------------------- */

  private addEvent(event: CircuitBreakerEvent): void {
    this.events.push(event);
    if (this.events.length > 500) {
      this.events = this.events.slice(-500);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Custom Error                                                      */
/* ------------------------------------------------------------------ */

export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly circuitState: CircuitState
  ) {
    super(message);
    this.name = "CircuitBreakerError";
  }
}

/* ------------------------------------------------------------------ */
/*  Circuit Breaker Registry (per-provider instances)                 */
/* ------------------------------------------------------------------ */

export class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();
  private defaultConfig: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.defaultConfig = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get or create a circuit breaker for a provider.
   */
  get(
    provider: ModelProvider | string,
    config?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker {
    let breaker = this.breakers.get(provider);
    if (!breaker) {
      breaker = new CircuitBreaker(provider, {
        ...this.defaultConfig,
        ...config,
      });
      this.breakers.set(provider, breaker);
    }
    return breaker;
  }

  /**
   * Execute through the appropriate circuit breaker.
   */
  async execute<T>(
    provider: ModelProvider | string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.get(provider).execute(fn);
  }

  /**
   * Get stats for all providers.
   */
  getAllStats(): Map<string, CircuitBreakerStats> {
    const stats = new Map<string, CircuitBreakerStats>();
    for (const [provider, breaker] of this.breakers) {
      stats.set(provider, breaker.getStats());
    }
    return stats;
  }

  /**
   * Reset all circuit breakers.
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Dispose all circuit breakers.
   */
  dispose(): void {
    for (const breaker of this.breakers.values()) {
      breaker.dispose();
    }
    this.breakers.clear();
  }
}

/**
 * Singleton registry.
 */
let globalRegistry: CircuitBreakerRegistry | null = null;

export function getCircuitBreakerRegistry(
  config?: Partial<CircuitBreakerConfig>
): CircuitBreakerRegistry {
  if (!globalRegistry) {
    globalRegistry = new CircuitBreakerRegistry(config);
  }
  return globalRegistry;
}
