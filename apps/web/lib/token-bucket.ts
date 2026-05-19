/**
 * Token bucket rate limiter (Issue #476).
 * Configurable capacity/refill, per-user and per-endpoint,
 * rate limit headers, graceful 429, utilization dashboard data.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface TokenBucketConfig {
  /** Maximum number of tokens the bucket can hold. */
  capacity: number;
  /** Number of tokens added per refill interval. */
  refillRate: number;
  /** Refill interval in milliseconds (default 1000). */
  refillIntervalMs?: number;
  /** Optional label for dashboard display. */
  label?: string;
}

export interface BucketState {
  tokens: number;
  lastRefillAt: number;
  totalConsumed: number;
  totalRejected: number;
  createdAt: number;
}

export interface ConsumeResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number | null;
  limit: number;
  resetAt: number;
}

export interface RateLimitHeaders {
  "X-RateLimit-Limit": string;
  "X-RateLimit-Remaining": string;
  "X-RateLimit-Reset": string;
  "Retry-After"?: string;
}

export interface BucketUtilization {
  key: string;
  label: string;
  capacity: number;
  currentTokens: number;
  utilizationPercent: number;
  totalConsumed: number;
  totalRejected: number;
  rejectionRate: number;
  ageMs: number;
}

export interface UtilizationDashboardData {
  buckets: BucketUtilization[];
  totalBuckets: number;
  overallUtilizationPercent: number;
  overallRejectionRate: number;
  hotBuckets: BucketUtilization[];
  timestamp: string;
}

/* ------------------------------------------------------------------ */
/*  Default configs per scope                                         */
/* ------------------------------------------------------------------ */

const DEFAULT_USER_CONFIG: TokenBucketConfig = {
  capacity: 100,
  refillRate: 10,
  refillIntervalMs: 1_000,
  label: "user",
};

const DEFAULT_ENDPOINT_CONFIG: TokenBucketConfig = {
  capacity: 500,
  refillRate: 50,
  refillIntervalMs: 1_000,
  label: "endpoint",
};

const DEFAULT_CONFIGS: Record<string, TokenBucketConfig> = {
  user: DEFAULT_USER_CONFIG,
  endpoint: DEFAULT_ENDPOINT_CONFIG,
};

/* ------------------------------------------------------------------ */
/*  Bucket store                                                      */
/* ------------------------------------------------------------------ */

const buckets = new Map<string, { state: BucketState; config: TokenBucketConfig }>();

const CLEANUP_INTERVAL_MS = 60_000;
const BUCKET_TTL_MS = 300_000; // 5 minutes idle
let lastCleanup = Date.now();

function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.state.lastRefillAt > BUCKET_TTL_MS) {
      buckets.delete(key);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Core logic                                                        */
/* ------------------------------------------------------------------ */

function refill(state: BucketState, config: TokenBucketConfig): void {
  const now = Date.now();
  const intervalMs = config.refillIntervalMs ?? 1_000;
  const elapsed = now - state.lastRefillAt;
  const intervalsElapsed = Math.floor(elapsed / intervalMs);

  if (intervalsElapsed > 0) {
    state.tokens = Math.min(
      config.capacity,
      state.tokens + intervalsElapsed * config.refillRate
    );
    state.lastRefillAt = state.lastRefillAt + intervalsElapsed * intervalMs;
  }
}

function getOrCreateBucket(
  key: string,
  config: TokenBucketConfig
): { state: BucketState; config: TokenBucketConfig } {
  const existing = buckets.get(key);
  if (existing) return existing;

  const now = Date.now();
  const bucket = {
    state: {
      tokens: config.capacity,
      lastRefillAt: now,
      totalConsumed: 0,
      totalRejected: 0,
      createdAt: now,
    },
    config,
  };
  buckets.set(key, bucket);
  return bucket;
}

/**
 * Build a composite key from scope, user, and endpoint.
 */
function buildKey(
  scope: "user" | "endpoint" | "combined",
  userId?: string,
  endpoint?: string
): string {
  switch (scope) {
    case "user":
      return `user:${userId ?? "anonymous"}`;
    case "endpoint":
      return `endpoint:${endpoint ?? "/"}`;
    case "combined":
      return `combined:${userId ?? "anonymous"}:${endpoint ?? "/"}`;
  }
}

/**
 * Attempt to consume a token from the bucket.
 */
export function consume(
  key: string,
  config: TokenBucketConfig,
  cost: number = 1
): ConsumeResult {
  cleanup();

  const bucket = getOrCreateBucket(key, config);
  refill(bucket.state, bucket.config);

  const intervalMs = config.refillIntervalMs ?? 1_000;

  if (bucket.state.tokens >= cost) {
    bucket.state.tokens -= cost;
    bucket.state.totalConsumed += cost;

    return {
      allowed: true,
      remaining: Math.floor(bucket.state.tokens),
      retryAfterMs: null,
      limit: config.capacity,
      resetAt: bucket.state.lastRefillAt + intervalMs,
    };
  }

  bucket.state.totalRejected += cost;
  const deficit = cost - bucket.state.tokens;
  const intervalsNeeded = Math.ceil(deficit / config.refillRate);
  const retryAfterMs = intervalsNeeded * intervalMs;

  return {
    allowed: false,
    remaining: Math.floor(bucket.state.tokens),
    retryAfterMs,
    limit: config.capacity,
    resetAt: bucket.state.lastRefillAt + retryAfterMs,
  };
}

/* ------------------------------------------------------------------ */
/*  Per-user rate limiting                                            */
/* ------------------------------------------------------------------ */

export function consumeForUser(
  userId: string,
  config?: Partial<TokenBucketConfig>,
  cost?: number
): ConsumeResult {
  const merged = { ...DEFAULT_USER_CONFIG, ...config };
  return consume(buildKey("user", userId), merged, cost);
}

/* ------------------------------------------------------------------ */
/*  Per-endpoint rate limiting                                        */
/* ------------------------------------------------------------------ */

export function consumeForEndpoint(
  endpoint: string,
  config?: Partial<TokenBucketConfig>,
  cost?: number
): ConsumeResult {
  const merged = { ...DEFAULT_ENDPOINT_CONFIG, ...config };
  return consume(buildKey("endpoint", undefined, endpoint), merged, cost);
}

/* ------------------------------------------------------------------ */
/*  Combined per-user + per-endpoint                                  */
/* ------------------------------------------------------------------ */

export function consumeCombined(
  userId: string,
  endpoint: string,
  userConfig?: Partial<TokenBucketConfig>,
  endpointConfig?: Partial<TokenBucketConfig>,
  cost?: number
): ConsumeResult {
  const userResult = consumeForUser(userId, userConfig, cost);
  if (!userResult.allowed) return userResult;

  const endpointResult = consumeForEndpoint(endpoint, endpointConfig, cost);
  if (!endpointResult.allowed) return endpointResult;

  // Return the more restrictive result
  return userResult.remaining < endpointResult.remaining
    ? userResult
    : endpointResult;
}

/* ------------------------------------------------------------------ */
/*  Rate limit headers                                                */
/* ------------------------------------------------------------------ */

export function buildRateLimitHeaders(result: ConsumeResult): RateLimitHeaders {
  const headers: RateLimitHeaders = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1_000)),
  };

  if (result.retryAfterMs !== null) {
    headers["Retry-After"] = String(Math.ceil(result.retryAfterMs / 1_000));
  }

  return headers;
}

/* ------------------------------------------------------------------ */
/*  Graceful 429 response                                             */
/* ------------------------------------------------------------------ */

export interface RateLimitErrorBody {
  error: "rate_limit_exceeded";
  message: string;
  retryAfterMs: number | null;
  limit: number;
  remaining: number;
}

export function buildRateLimitResponse(result: ConsumeResult): {
  status: 429;
  headers: RateLimitHeaders;
  body: RateLimitErrorBody;
} {
  return {
    status: 429,
    headers: buildRateLimitHeaders(result),
    body: {
      error: "rate_limit_exceeded",
      message: `Rate limit exceeded. ${
        result.retryAfterMs !== null
          ? `Retry after ${Math.ceil(result.retryAfterMs / 1_000)} seconds.`
          : "Please try again later."
      }`,
      retryAfterMs: result.retryAfterMs,
      limit: result.limit,
      remaining: result.remaining,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Utilization dashboard data                                        */
/* ------------------------------------------------------------------ */

function computeBucketUtilization(
  key: string,
  bucket: { state: BucketState; config: TokenBucketConfig }
): BucketUtilization {
  refill(bucket.state, bucket.config);

  const total = bucket.state.totalConsumed + bucket.state.totalRejected;
  const rejectionRate = total > 0 ? bucket.state.totalRejected / total : 0;
  const utilizationPercent =
    ((bucket.config.capacity - bucket.state.tokens) / bucket.config.capacity) * 100;

  return {
    key,
    label: bucket.config.label ?? key,
    capacity: bucket.config.capacity,
    currentTokens: Math.floor(bucket.state.tokens),
    utilizationPercent: Math.round(utilizationPercent * 100) / 100,
    totalConsumed: bucket.state.totalConsumed,
    totalRejected: bucket.state.totalRejected,
    rejectionRate: Math.round(rejectionRate * 10_000) / 10_000,
    ageMs: Date.now() - bucket.state.createdAt,
  };
}

export function getUtilizationDashboardData(): UtilizationDashboardData {
  const bucketUtils: BucketUtilization[] = [];

  for (const [key, bucket] of buckets.entries()) {
    bucketUtils.push(computeBucketUtilization(key, bucket));
  }

  const totalBuckets = bucketUtils.length;
  const overallUtilization =
    totalBuckets > 0
      ? bucketUtils.reduce((sum, b) => sum + b.utilizationPercent, 0) / totalBuckets
      : 0;

  const totalConsumed = bucketUtils.reduce((s, b) => s + b.totalConsumed, 0);
  const totalRejected = bucketUtils.reduce((s, b) => s + b.totalRejected, 0);
  const totalAll = totalConsumed + totalRejected;
  const overallRejectionRate = totalAll > 0 ? totalRejected / totalAll : 0;

  // Hot buckets: those with > 80% utilization
  const hotBuckets = bucketUtils
    .filter((b) => b.utilizationPercent > 80)
    .sort((a, b) => b.utilizationPercent - a.utilizationPercent);

  return {
    buckets: bucketUtils,
    totalBuckets,
    overallUtilizationPercent: Math.round(overallUtilization * 100) / 100,
    overallRejectionRate: Math.round(overallRejectionRate * 10_000) / 10_000,
    hotBuckets,
    timestamp: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/*  Configuration helpers                                             */
/* ------------------------------------------------------------------ */

export function registerDefaultConfig(
  scope: string,
  config: TokenBucketConfig
): void {
  DEFAULT_CONFIGS[scope] = config;
}

export function getDefaultConfig(scope: string): TokenBucketConfig | undefined {
  return DEFAULT_CONFIGS[scope];
}

/**
 * Reset all buckets (useful for testing).
 */
export function resetAll(): void {
  buckets.clear();
}
