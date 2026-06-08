import { describe, it, expect, vi, afterEach } from "vitest";
import { formatRelativeTime, formatDate, formatDuration, formatTimestamp } from "./date";

describe("formatRelativeTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty string for null/undefined input", () => {
    expect(formatRelativeTime(null)).toBe("");
    expect(formatRelativeTime(undefined)).toBe("");
  });

  it("returns empty string for invalid date", () => {
    expect(formatRelativeTime("not-a-date")).toBe("");
  });

  it("returns 'just now' for very recent dates", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-17T12:00:00Z"));

    // 10 seconds ago
    const result = formatRelativeTime("2026-05-17T11:59:50Z");
    expect(result).toBe("just now");

    vi.useRealTimers();
  });

  it("formats seconds ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-17T12:00:00Z"));

    // 45 seconds ago
    const result = formatRelativeTime("2026-05-17T11:59:15Z");
    expect(result).toBe("45 seconds ago");

    vi.useRealTimers();
  });

  it("formats minutes ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-17T12:00:00Z"));

    // 5 minutes ago
    const result = formatRelativeTime("2026-05-17T11:55:00Z");
    expect(result).toBe("5 minutes ago");

    vi.useRealTimers();
  });

  it("formats single minute correctly (no plural)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-17T12:00:00Z"));

    // 1 minute ago
    const result = formatRelativeTime("2026-05-17T11:59:00Z");
    expect(result).toBe("1 minute ago");

    vi.useRealTimers();
  });

  it("formats hours ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-17T12:00:00Z"));

    // 3 hours ago
    const result = formatRelativeTime("2026-05-17T09:00:00Z");
    expect(result).toBe("3 hours ago");

    vi.useRealTimers();
  });

  it("formats days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-17T12:00:00Z"));

    // 5 days ago
    const result = formatRelativeTime("2026-05-12T12:00:00Z");
    expect(result).toBe("5 days ago");

    vi.useRealTimers();
  });

  it("formats weeks ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-17T12:00:00Z"));

    // 3 weeks ago
    const result = formatRelativeTime("2026-04-26T12:00:00Z");
    expect(result).toBe("3 weeks ago");

    vi.useRealTimers();
  });

  it("formats months ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-17T12:00:00Z"));

    // ~2 months ago (60 days)
    const twoMonthsAgo = new Date("2026-05-17T12:00:00Z");
    twoMonthsAgo.setSeconds(twoMonthsAgo.getSeconds() - 60 * 24 * 60 * 60);
    const result = formatRelativeTime(twoMonthsAgo);
    expect(result).toBe("2 months ago");

    vi.useRealTimers();
  });

  it("formats years ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-17T12:00:00Z"));

    // ~2 years ago
    const twoYearsAgo = new Date("2026-05-17T12:00:00Z");
    twoYearsAgo.setSeconds(twoYearsAgo.getSeconds() - 2 * 365 * 24 * 60 * 60);
    const result = formatRelativeTime(twoYearsAgo);
    expect(result).toBe("2 years ago");

    vi.useRealTimers();
  });

  it("formats future dates with 'in' prefix", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-17T12:00:00Z"));

    // 3 hours in the future
    const result = formatRelativeTime("2026-05-17T15:00:00Z");
    expect(result).toBe("in 3 hours");

    vi.useRealTimers();
  });

  it("accepts Date objects", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-17T12:00:00Z"));

    const twoHoursAgo = new Date("2026-05-17T10:00:00Z");
    const result = formatRelativeTime(twoHoursAgo);
    expect(result).toBe("2 hours ago");

    vi.useRealTimers();
  });
});

describe("formatDate", () => {
  it("returns empty string for null/undefined", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
  });

  it("returns empty string for invalid date", () => {
    expect(formatDate("invalid")).toBe("");
  });

  it("formats a valid date string", () => {
    const result = formatDate("2026-03-15T10:00:00Z");
    // Should contain year, month, and day in some locale format. The exact day
    // is timezone-dependent (formatDate renders in the reader's local timezone,
    // and at UTC+14 this rolls forward to the 16th), so assert structurally on a
    // 1-2 digit day rather than a fixed value.
    expect(result).toContain("2026");
    expect(result).toMatch(/\b\d{1,2}\b/);
    // Month is locale-dependent but should be non-empty
    expect(result.length).toBeGreaterThan(5);
  });

  it("formats a Date object", () => {
    // Use midday UTC so the date does not roll back to the previous day in
    // timezones west of UTC. formatDate renders in the runner's local
    // timezone by design, so a UTC-midnight input would otherwise make this
    // assertion timezone-dependent (e.g. "Dec 31, 2025" in US timezones).
    const result = formatDate(new Date("2026-01-01T12:00:00Z"));
    expect(result).toContain("2026");
    expect(result.length).toBeGreaterThan(0);
  });

  it("accepts custom options", () => {
    const result = formatDate("2026-06-20T00:00:00Z", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    expect(result).toContain("2026");
    // Should contain full month name
    expect(result.length).toBeGreaterThan(8);
  });
});

describe("formatTimestamp", () => {
  it("returns empty string for null/undefined", () => {
    expect(formatTimestamp(null)).toBe("");
    expect(formatTimestamp(undefined)).toBe("");
  });

  it("returns empty string for invalid date", () => {
    expect(formatTimestamp("invalid")).toBe("");
  });

  it("includes both the date and a time component", () => {
    const result = formatTimestamp("2026-03-15T14:30:45Z");
    expect(result).toContain("2026");
    // The time portion must survive: there should be at least one ":" separator
    // between hour and minute. Regression guard for toLocaleDateString dropping
    // the hour/minute/second options on spec-compliant engines.
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it("honors custom options", () => {
    const result = formatTimestamp("2026-03-15T14:30:45Z", {
      hour: "2-digit",
      minute: "2-digit",
    });
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe("formatDuration", () => {
  it("returns empty string for null inputs", () => {
    expect(formatDuration(null, null)).toBe("");
    expect(formatDuration("2026-01-01T00:00:00Z", null)).toBe("");
    expect(formatDuration(null, "2026-01-01T00:00:00Z")).toBe("");
  });

  it("returns empty string for invalid dates", () => {
    expect(formatDuration("invalid", "also-invalid")).toBe("");
  });

  it("returns empty string for negative duration", () => {
    expect(formatDuration("2026-01-02T00:00:00Z", "2026-01-01T00:00:00Z")).toBe("");
  });

  it("formats seconds only", () => {
    const result = formatDuration("2026-01-01T00:00:00Z", "2026-01-01T00:00:45Z");
    expect(result).toBe("45s");
  });

  it("formats minutes and seconds", () => {
    const result = formatDuration("2026-01-01T00:00:00Z", "2026-01-01T00:05:30Z");
    expect(result).toBe("5m 30s");
  });

  it("formats minutes only (no seconds)", () => {
    const result = formatDuration("2026-01-01T00:00:00Z", "2026-01-01T00:10:00Z");
    expect(result).toBe("10m");
  });

  it("formats hours and minutes", () => {
    const result = formatDuration("2026-01-01T00:00:00Z", "2026-01-01T02:15:00Z");
    expect(result).toBe("2h 15m");
  });

  it("formats hours only", () => {
    const result = formatDuration("2026-01-01T00:00:00Z", "2026-01-01T03:00:00Z");
    expect(result).toBe("3h");
  });

  it("accepts Date objects", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    const end = new Date("2026-01-01T01:30:00Z");
    const result = formatDuration(start, end);
    expect(result).toBe("1h 30m");
  });
});
