/**
 * Date formatting utilities for consistent timezone handling.
 * All dates are stored/compared in UTC and displayed in the user's local timezone.
 */

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * Formats a UTC date string to a human-readable date in the user's local timezone.
 * Example: "Jan 15, 2026"
 */
export function formatDate(
  dateInput: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return "";

  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;

  if (isNaN(date.getTime())) return "";

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  };

  return date.toLocaleDateString(undefined, defaultOptions);
}

/**
 * Formats a UTC date string to a full timestamp in the user's local timezone.
 * Example: "Jan 15, 2026, 2:30:45 PM"
 */
export function formatTimestamp(
  dateInput: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return "";

  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;

  if (isNaN(date.getTime())) return "";

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    ...options,
  };

  // Use toLocaleString (not toLocaleDateString): the date-only formatter is
  // specified to ignore the hour/minute/second options, so the time portion of
  // the timestamp would be silently dropped on spec-compliant engines.
  return date.toLocaleString(undefined, defaultOptions);
}

/**
 * Formats a UTC date string as relative time from now.
 * Examples: "2 hours ago", "just now", "in 3 days"
 */
export function formatRelativeTime(
  dateInput: string | Date | null | undefined
): string {
  if (!dateInput) return "";

  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;

  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const absDiff = Math.abs(diffSeconds);
  const isFuture = diffSeconds < 0;

  let relativeStr: string;

  if (absDiff < 30) {
    return "just now";
  } else if (absDiff < MINUTE) {
    relativeStr = `${absDiff} seconds`;
  } else if (absDiff < HOUR) {
    const minutes = Math.floor(absDiff / MINUTE);
    relativeStr = `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  } else if (absDiff < DAY) {
    const hours = Math.floor(absDiff / HOUR);
    relativeStr = `${hours} hour${hours !== 1 ? "s" : ""}`;
  } else if (absDiff < WEEK) {
    const days = Math.floor(absDiff / DAY);
    relativeStr = `${days} day${days !== 1 ? "s" : ""}`;
  } else if (absDiff < MONTH) {
    const weeks = Math.floor(absDiff / WEEK);
    relativeStr = `${weeks} week${weeks !== 1 ? "s" : ""}`;
  } else if (absDiff < YEAR) {
    const months = Math.floor(absDiff / MONTH);
    relativeStr = `${months} month${months !== 1 ? "s" : ""}`;
  } else {
    const years = Math.floor(absDiff / YEAR);
    relativeStr = `${years} year${years !== 1 ? "s" : ""}`;
  }

  return isFuture ? `in ${relativeStr}` : `${relativeStr} ago`;
}

/**
 * Converts a local date to UTC ISO string for storage.
 */
export function toUTCString(date: Date): string {
  return date.toISOString();
}

/**
 * Parses a UTC date string and returns a Date object.
 * Ensures the string is treated as UTC if no timezone is specified.
 */
export function parseUTCDate(dateStr: string): Date {
  // If the string doesn't contain timezone info, treat as UTC
  if (!dateStr.endsWith("Z") && !dateStr.includes("+") && !dateStr.includes("T")) {
    return new Date(dateStr + "Z");
  }
  return new Date(dateStr);
}

/**
 * Formats the duration between two dates as a human-readable string.
 * Example: "2h 15m", "45s"
 */
export function formatDuration(
  startInput: string | Date | null | undefined,
  endInput: string | Date | null | undefined
): string {
  if (!startInput || !endInput) return "";

  const start = typeof startInput === "string" ? new Date(startInput) : startInput;
  const end = typeof endInput === "string" ? new Date(endInput) : endInput;

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return "";

  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return "";

  const totalSeconds = Math.floor(diffMs / 1000);

  if (totalSeconds < MINUTE) {
    return `${totalSeconds}s`;
  }

  const hours = Math.floor(totalSeconds / HOUR);
  const minutes = Math.floor((totalSeconds % HOUR) / MINUTE);
  const seconds = totalSeconds % MINUTE;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}
