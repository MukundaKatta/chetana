/**
 * Smart retry policy engine (Issue #459).
 * Configurable per operation, circuit breaker integration types,
 * retry budget, jittered exponential backoff, retry event logging.
 */

import type { CircuitState } from "./circuit-breaker";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface RetryPolicyConfig {
  /** Maximum number of retry attempts (default 3). */
  maxRetries: number;
  /** Initial backoff delay in ms (default 1000). */
  initialDelayMs: number;
  /** Maximum backoff delay in ms (default 30000). */
  maxDelayMs: number;
  /** Backoff multiplier (default 2). */
  backoffMultiplier: number;
  /** Amount of random jitter to add, as a fraction 0-1 (default 0.25). */
  jitterFraction: number;
  /** Optional per-error-type override: return false to skip retrying. */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Timeout per attempt in ms (default no timeout). */
  attemptTimeoutMs?: number;
  /** Operation name for logging. */
  operationName?: string;
}

export interface RetryBudgetConfig {
  /** Maximum retries allowed within the window. */
  maxRetriesPerWindow: number;
  /** Window duration in ms (default 60000). */
  windowMs: number;
}

export interface CircuitBreakerRef {
  /** Current state of the circuit breaker. */
  getState: () => CircuitState;
  /** Record a failure. */
  recordFailure: (error: string) => void;
  /** Record a success. */
  recordSuccess: () => void;
}

export interface RetryEvent {
  type: "attempt" | "retry" | "success" | "failure" | "budget_exhausted" | "circuit_open";
  operationName: string;
  attempt: number;
  maxRetries: number;
  delayMs?: number;
  error?: string;
  timestamp: string;
  durationMs?: number;
}

export type RetryEventHandler = (event: RetryEvent) => void;

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: unknown;
  attempts: number;
  totalDurationMs: number;
  events: RetryEvent[];
}

/* ------------------------------------------------------------------ */
/*  Default config                                                    */
/* ------------------------------------------------------------------ */

const DEFAULT_CONFIG: RetryPolicyConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30_000,
  backoffMultiplier: 2,
  jitterFraction: 0.25,
};

/* ------------------------------------------------------------------ */
/*  Retry budget                                                      */
/* ------------------------------------------------------------------ */

export class RetryBudget {
  private timestamps: number[] = [];

  constructor(private readonly config: RetryBudgetConfig) {}

  /** Check whether a retry is within budget. */
  canRetry(): boolean {
    this.prune();
    return this.timestamps.length < this.config.maxRetriesPerWindow;
  }

  /** Record that a retry was consumed. */
  consume(): void {
    this.timestamps.push(Date.now());
  }

  /** Get remaining retries in the current window. */
  remaining(): number {
    this.prune();
    return Math.max(0, this.config.maxRetriesPerWindow - this.timestamps.length);
  }

  /** Reset the budget. */
  reset(): void {
    this.timestamps = [];
  }

  private prune(): void {
    const cutoff = Date.now() - this.config.windowMs;
    this.timestamps = this.timestamps.filter((t) => t > cutoff);
  }
}

/* ------------------------------------------------------------------ */
/*  Backoff calculation                                               */
/* ------------------------------------------------------------------ */

export function calculateBackoff(
  attempt: number,
  config: Pick<
    RetryPolicyConfig,
    "initialDelayMs" | "maxDelayMs" | "backoffMultiplier" | "jitterFraction"
  >,
): number {
  const base =
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  const capped = Math.min(base, config.maxDelayMs);

  // Full jitter: uniform random between [0, capped * jitterFraction]
  const jitter = capped * config.jitterFraction * Math.random();
  // Decorrelated: base * (1 - jitter/2) + jitter
  return Math.round(capped + jitter);
}

/* ------------------------------------------------------------------ */
/*  Sleep helper                                                      */
/* ------------------------------------------------------------------ */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ------------------------------------------------------------------ */
/*  Retry policy engine                                               */
/* ------------------------------------------------------------------ */

export class RetryPolicy {
  private readonly config: RetryPolicyConfig;
  private budget: RetryBudget | null = null;
  private circuitBreaker: CircuitBreakerRef | null = null;
  private eventHandlers: RetryEventHandler[] = [];

  constructor(config: Partial<RetryPolicyConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Attach a retry budget to limit total retries within a time window. */
  withBudget(budgetConfig: RetryBudgetConfig): this {
    this.budget = new RetryBudget(budgetConfig);
    return this;
  }

  /** Attach a circuit breaker reference. */
  withCircuitBreaker(cb: CircuitBreakerRef): this {
    this.circuitBreaker = cb;
    return this;
  }

  /** Register an event handler for retry events. */
  onEvent(handler: RetryEventHandler): this {
    this.eventHandlers.push(handler);
    return this;
  }

  private emit(event: RetryEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Never let event handlers break the retry loop
      }
    }
  }

  /** Execute an async operation with the configured retry policy. */
  async execute<T>(fn: (attempt: number) => Promise<T>): Promise<RetryResult<T>> {
    const events: RetryEvent[] = [];
    const opName = this.config.operationName ?? "unnamed";
    const startTime = Date.now();
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      // Circuit breaker check
      if (this.circuitBreaker) {
        const cbState = this.circuitBreaker.getState();
        if (cbState === "open") {
          const ev: RetryEvent = {
            type: "circuit_open",
            operationName: opName,
            attempt,
            maxRetries: this.config.maxRetries,
            timestamp: new Date().toISOString(),
          };
          events.push(ev);
          this.emit(ev);
          return {
            success: false,
            error: new Error("Circuit breaker is open"),
            attempts: attempt,
            totalDurationMs: Date.now() - startTime,
            events,
          };
        }
      }

      // Budget check (only for retries, not the first attempt)
      if (attempt > 0 && this.budget) {
        if (!this.budget.canRetry()) {
          const ev: RetryEvent = {
            type: "budget_exhausted",
            operationName: opName,
            attempt,
            maxRetries: this.config.maxRetries,
            timestamp: new Date().toISOString(),
          };
          events.push(ev);
          this.emit(ev);
          return {
            success: false,
            error: lastError ?? new Error("Retry budget exhausted"),
            attempts: attempt,
            totalDurationMs: Date.now() - startTime,
            events,
          };
        }
        this.budget.consume();
      }

      // Backoff delay for retries
      if (attempt > 0) {
        const delayMs = calculateBackoff(attempt - 1, this.config);
        const retryEv: RetryEvent = {
          type: "retry",
          operationName: opName,
          attempt,
          maxRetries: this.config.maxRetries,
          delayMs,
          timestamp: new Date().toISOString(),
        };
        events.push(retryEv);
        this.emit(retryEv);
        await sleep(delayMs);
      }

      const attemptEv: RetryEvent = {
        type: "attempt",
        operationName: opName,
        attempt,
        maxRetries: this.config.maxRetries,
        timestamp: new Date().toISOString(),
      };
      events.push(attemptEv);
      this.emit(attemptEv);

      const attemptStart = Date.now();

      try {
        let result: T;

        if (this.config.attemptTimeoutMs) {
          result = await Promise.race([
            fn(attempt),
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error("Attempt timed out")),
                this.config.attemptTimeoutMs,
              ),
            ),
          ]);
        } else {
          result = await fn(attempt);
        }

        this.circuitBreaker?.recordSuccess();

        const successEv: RetryEvent = {
          type: "success",
          operationName: opName,
          attempt,
          maxRetries: this.config.maxRetries,
          timestamp: new Date().toISOString(),
          durationMs: Date.now() - attemptStart,
        };
        events.push(successEv);
        this.emit(successEv);

        return {
          success: true,
          data: result,
          attempts: attempt + 1,
          totalDurationMs: Date.now() - startTime,
          events,
        };
      } catch (error) {
        lastError = error;
        const errMsg =
          error instanceof Error ? error.message : String(error);

        this.circuitBreaker?.recordFailure(errMsg);

        const failEv: RetryEvent = {
          type: "failure",
          operationName: opName,
          attempt,
          maxRetries: this.config.maxRetries,
          error: errMsg,
          timestamp: new Date().toISOString(),
          durationMs: Date.now() - attemptStart,
        };
        events.push(failEv);
        this.emit(failEv);

        // Check if we should retry this specific error
        if (
          this.config.shouldRetry &&
          !this.config.shouldRetry(error, attempt)
        ) {
          break;
        }
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: this.config.maxRetries + 1,
      totalDurationMs: Date.now() - startTime,
      events,
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Factory helpers                                                   */
/* ------------------------------------------------------------------ */

/** Preset: aggressive retry for idempotent reads. */
export function readRetryPolicy(): RetryPolicy {
  return new RetryPolicy({
    maxRetries: 5,
    initialDelayMs: 500,
    maxDelayMs: 10_000,
    backoffMultiplier: 2,
    jitterFraction: 0.3,
    operationName: "read",
  });
}

/** Preset: conservative retry for writes / mutations. */
export function writeRetryPolicy(): RetryPolicy {
  return new RetryPolicy({
    maxRetries: 2,
    initialDelayMs: 1000,
    maxDelayMs: 5_000,
    backoffMultiplier: 3,
    jitterFraction: 0.5,
    operationName: "write",
    shouldRetry: (error) => {
      // Only retry network / timeout errors, not 4xx
      if (error instanceof Error) {
        return /timeout|network|econnreset|econnrefused/i.test(error.message);
      }
      return false;
    },
  });
}

/** Preset: model API calls with budget. */
export function modelApiRetryPolicy(): RetryPolicy {
  return new RetryPolicy({
    maxRetries: 3,
    initialDelayMs: 2000,
    maxDelayMs: 30_000,
    backoffMultiplier: 2,
    jitterFraction: 0.25,
    operationName: "model-api",
    shouldRetry: (error) => {
      if (error instanceof Error) {
        // Retry rate limits and server errors, not auth failures
        return !/unauthorized|forbidden|invalid.*key/i.test(error.message);
      }
      return true;
    },
  }).withBudget({ maxRetriesPerWindow: 20, windowMs: 60_000 });
}
