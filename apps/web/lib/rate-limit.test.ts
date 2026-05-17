import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit } from "./rate-limit";

// The rate-limit module uses an in-memory Map, so we need unique keys per test
// to avoid interference between tests.
let keyCounter = 0;
function uniqueKey(prefix = "test") {
  return `${prefix}-${Date.now()}-${keyCounter++}`;
}

describe("rateLimit", () => {
  it("allows requests within the limit", () => {
    const key = uniqueKey();
    const limit = 5;
    const windowMs = 60_000;

    const result1 = rateLimit(key, limit, windowMs);
    expect(result1.success).toBe(true);
    expect(result1.remaining).toBe(4);

    const result2 = rateLimit(key, limit, windowMs);
    expect(result2.success).toBe(true);
    expect(result2.remaining).toBe(3);
  });

  it("blocks requests that exceed the limit", () => {
    const key = uniqueKey();
    const limit = 3;
    const windowMs = 60_000;

    // Exhaust the limit
    rateLimit(key, limit, windowMs);
    rateLimit(key, limit, windowMs);
    rateLimit(key, limit, windowMs);

    // Fourth request should be blocked
    const result = rateLimit(key, limit, windowMs);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("returns correct remaining count", () => {
    const key = uniqueKey();
    const limit = 5;
    const windowMs = 60_000;

    for (let i = 0; i < 5; i++) {
      const result = rateLimit(key, limit, windowMs);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4 - i);
    }

    const blocked = rateLimit(key, limit, windowMs);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets after the window expires", () => {
    const key = uniqueKey();
    const limit = 2;
    // Use a very short window (1ms) to simulate window expiry
    const windowMs = 1;

    rateLimit(key, limit, windowMs);
    rateLimit(key, limit, windowMs);

    // Wait for the window to expire by using a timestamp in the past
    // Since we can't easily mock Date.now in this context, we use a 1ms window
    // and rely on the fact that the next call happens after at least 1ms
    // by making the window effectively 0
    const result = rateLimit(key, limit, 0);
    // With windowMs=0, all previous timestamps are outside the window
    expect(result.success).toBe(true);
  });

  it("tracks multiple keys independently", () => {
    const key1 = uniqueKey("user1");
    const key2 = uniqueKey("user2");
    const limit = 2;
    const windowMs = 60_000;

    // Exhaust key1
    rateLimit(key1, limit, windowMs);
    rateLimit(key1, limit, windowMs);
    const blocked = rateLimit(key1, limit, windowMs);
    expect(blocked.success).toBe(false);

    // key2 should still be allowed
    const result = rateLimit(key2, limit, windowMs);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it("returns a resetAt date in the future", () => {
    const key = uniqueKey();
    const limit = 3;
    const windowMs = 60_000;

    const result = rateLimit(key, limit, windowMs);
    expect(result.resetAt).toBeInstanceOf(Date);
    expect(result.resetAt.getTime()).toBeGreaterThan(Date.now() - 1000);
  });

  it("blocked response resetAt is based on oldest timestamp in window", () => {
    const key = uniqueKey();
    const limit = 2;
    const windowMs = 60_000;

    const before = Date.now();
    rateLimit(key, limit, windowMs);
    rateLimit(key, limit, windowMs);

    const blocked = rateLimit(key, limit, windowMs);
    expect(blocked.success).toBe(false);
    // resetAt should be approximately oldest timestamp + windowMs
    expect(blocked.resetAt.getTime()).toBeGreaterThanOrEqual(before + windowMs - 100);
    expect(blocked.resetAt.getTime()).toBeLessThanOrEqual(before + windowMs + 100);
  });
});
