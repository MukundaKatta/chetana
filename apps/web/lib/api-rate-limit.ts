/**
 * API key-based rate limiter using a sliding-window algorithm.
 * Designed for per-key quotas on authenticated API endpoints.
 */

import { NextRequest, NextResponse } from "next/server";

export interface RateLimitConfig {
  /** Maximum number of requests allowed per window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
  /** Extract the API key from the request. Defaults to the Authorization header. */
  keyFn?: (request: NextRequest) => string | null;
  /** Optional per-key limit overrides (e.g. premium tiers). */
  keyLimits?: Record<string, number>;
}

interface WindowEntry {
  timestamps: number[];
}

class SlidingWindowLimiter {
  private store = new Map<string, WindowEntry>();
  private windowMs: number;
  private defaultLimit: number;
  private keyLimits: Record<string, number>;
  private lastCleanup = Date.now();

  constructor(config: RateLimitConfig) {
    this.windowMs = config.windowMs;
    this.defaultLimit = config.limit;
    this.keyLimits = config.keyLimits ?? {};
  }

  /**
   * Check and record a request for the given key.
   */
  check(key: string): {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetAt: Date;
    retryAfterMs: number;
  } {
    const now = Date.now();
    this.maybeCleanup(now);

    const limit = this.keyLimits[key] ?? this.defaultLimit;

    if (!this.store.has(key)) {
      this.store.set(key, { timestamps: [] });
    }

    const entry = this.store.get(key)!;

    // Slide the window — discard timestamps outside the window
    entry.timestamps = entry.timestamps.filter(
      (ts) => now - ts < this.windowMs
    );

    if (entry.timestamps.length >= limit) {
      const oldestInWindow = entry.timestamps[0];
      const resetAt = new Date(oldestInWindow + this.windowMs);
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetAt,
        retryAfterMs: resetAt.getTime() - now,
      };
    }

    entry.timestamps.push(now);
    const remaining = limit - entry.timestamps.length;

    return {
      allowed: true,
      limit,
      remaining,
      resetAt: new Date(now + this.windowMs),
      retryAfterMs: 0,
    };
  }

  /** Periodic eviction of expired keys. */
  private maybeCleanup(now: number): void {
    if (now - this.lastCleanup < 60_000) return;
    this.lastCleanup = now;

    for (const [key, entry] of this.store.entries()) {
      entry.timestamps = entry.timestamps.filter(
        (ts) => now - ts < this.windowMs
      );
      if (entry.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * Build a standard 429 Too Many Requests response with rate-limit headers.
 */
function buildRateLimitResponse(
  result: ReturnType<SlidingWindowLimiter["check"]>
): NextResponse {
  const retryAfterSec = Math.ceil(result.retryAfterMs / 1000);

  return NextResponse.json(
    {
      error: "Rate limit exceeded",
      retryAfter: retryAfterSec,
    },
    {
      status: 429,
      headers: rateLimitHeaders(result),
    }
  );
}

/**
 * Standard rate-limit response headers.
 */
function rateLimitHeaders(
  result: ReturnType<SlidingWindowLimiter["check"]>
): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": result.resetAt.toISOString(),
    ...(result.retryAfterMs > 0
      ? { "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)) }
      : {}),
  };
}

/**
 * Create a per-API-key rate limiter that can be used as middleware
 * wrapping a Next.js route handler.
 *
 * @example
 * ```ts
 * const limiter = createApiRateLimiter({ limit: 100, windowMs: 60_000 });
 *
 * export const GET = limiter(async (req) => {
 *   return NextResponse.json({ ok: true });
 * });
 * ```
 */
export function createApiRateLimiter(config: RateLimitConfig) {
  const limiter = new SlidingWindowLimiter(config);

  const defaultKeyFn = (req: NextRequest): string | null => {
    const auth = req.headers.get("authorization");
    if (auth) return auth;
    return (
      req.headers.get("x-api-key") ??
      req.headers.get("x-forwarded-for") ??
      req.headers.get("x-real-ip") ??
      "anonymous"
    );
  };

  const keyFn = config.keyFn ?? defaultKeyFn;

  return function withApiRateLimit(
    handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>
  ) {
    return async (
      request: NextRequest,
      ...args: any[]
    ): Promise<NextResponse> => {
      const key = keyFn(request);
      if (!key) {
        return NextResponse.json(
          { error: "API key required" },
          { status: 401 }
        );
      }

      const result = limiter.check(key);

      if (!result.allowed) {
        return buildRateLimitResponse(result);
      }

      const response = await handler(request, ...args);

      // Attach rate-limit headers to successful responses
      const headers = rateLimitHeaders(result);
      for (const [k, v] of Object.entries(headers)) {
        response.headers.set(k, v);
      }

      return response;
    };
  };
}
