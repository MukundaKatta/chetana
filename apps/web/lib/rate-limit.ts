import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  timestamps: number[];
}

// In-memory store for rate limit tracking
const store = new Map<string, RateLimitEntry>();

// Periodic cleanup to prevent memory leaks
const CLEANUP_INTERVAL = 60_000; // 1 minute
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

/**
 * Simple in-memory sliding window rate limiter.
 *
 * @param key - Unique identifier for the rate limit bucket (e.g., IP or user ID)
 * @param limit - Maximum number of requests allowed within the window
 * @param windowMs - Time window in milliseconds
 * @returns Object indicating whether the request is allowed
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number; resetAt: Date } {
  const now = Date.now();

  cleanup(windowMs);

  if (!store.has(key)) {
    store.set(key, { timestamps: [] });
  }

  const entry = store.get(key)!;

  // Remove timestamps outside the sliding window
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);

  if (entry.timestamps.length >= limit) {
    // Rate limit exceeded
    const oldestInWindow = entry.timestamps[0];
    const resetAt = new Date(oldestInWindow + windowMs);
    return {
      success: false,
      remaining: 0,
      resetAt,
    };
  }

  // Allow the request
  entry.timestamps.push(now);
  const remaining = limit - entry.timestamps.length;
  const resetAt = new Date(now + windowMs);

  return {
    success: true,
    remaining,
    resetAt,
  };
}

/**
 * Higher-order function that wraps an API route handler with rate limiting.
 *
 * @param handler - The route handler function to wrap
 * @param options - Rate limiting configuration
 * @returns Wrapped handler that enforces rate limits
 */
export function withRateLimit(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>,
  options: {
    limit: number;
    window: number;
    keyFn?: (request: NextRequest) => string;
  }
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const key = options.keyFn
      ? options.keyFn(request)
      : request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "anonymous";

    const result = rateLimit(key, options.limit, options.window);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter: Math.ceil((result.resetAt.getTime() - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(options.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": result.resetAt.toISOString(),
            "Retry-After": String(
              Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)
            ),
          },
        }
      );
    }

    const response = await handler(request, ...args);

    // Add rate limit headers to successful responses
    response.headers.set("X-RateLimit-Limit", String(options.limit));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    response.headers.set("X-RateLimit-Reset", result.resetAt.toISOString());

    return response;
  };
}
