"use client";

import React from "react";

/**
 * Timezone handling utilities (Issue #287).
 * Consistent UTC conversion and timezone-aware formatting.
 */

/**
 * Converts a Date to a UTC Date (strips local timezone offset).
 */
export function toUTC(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds()
    )
  );
}

/**
 * Converts a UTC Date to a date displayed in the given timezone.
 *
 * @param date - The UTC date
 * @param timezone - IANA timezone string (e.g. "America/New_York")
 */
export function fromUTC(date: Date, timezone: string): Date {
  const utcStr = date.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = date.toLocaleString("en-US", { timeZone: timezone });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  const offset = tzDate.getTime() - utcDate.getTime();
  return new Date(date.getTime() + offset);
}

/**
 * Detects the user's local IANA timezone from the browser.
 * Falls back to "UTC" if detection fails.
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Returns the short timezone abbreviation (e.g. "EST", "PST", "JST").
 */
export function getTimezoneAbbreviation(timezone?: string): string {
  try {
    const tz = timezone ?? getUserTimezone();
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "short",
    }).formatToParts(new Date());
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    return tzPart?.value ?? tz;
  } catch {
    return timezone ?? "UTC";
  }
}

export type DateFormatPreset = "date" | "time" | "datetime" | "full";

const FORMAT_OPTIONS: Record<DateFormatPreset, Intl.DateTimeFormatOptions> = {
  date: { year: "numeric", month: "short", day: "numeric" },
  time: { hour: "numeric", minute: "2-digit", second: "2-digit" },
  datetime: {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  },
  full: {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  },
};

/**
 * Formats a Date in the specified timezone using Intl.DateTimeFormat.
 *
 * @param date - The date to format
 * @param format - A preset name or custom Intl.DateTimeFormatOptions
 * @param timezone - IANA timezone (default: user's local timezone)
 */
export function formatWithTimezone(
  date: Date | string,
  format: DateFormatPreset | Intl.DateTimeFormatOptions = "datetime",
  timezone?: string
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  const tz = timezone ?? getUserTimezone();
  const options: Intl.DateTimeFormatOptions =
    typeof format === "string" ? { ...FORMAT_OPTIONS[format], timeZone: tz } : { ...format, timeZone: tz };

  return new Intl.DateTimeFormat("en-US", options).format(d);
}

/**
 * React component that shows a small timezone indicator badge.
 *
 * Usage:
 * ```tsx
 * <TimezoneIndicator />
 * // renders: "EST" or "America/New_York" depending on mode
 * ```
 */
export function TimezoneIndicator({
  timezone,
  showFull = false,
  className,
}: {
  timezone?: string;
  showFull?: boolean;
  className?: string;
}) {
  const tz = timezone ?? getUserTimezone();
  const abbr = getTimezoneAbbreviation(tz);
  const label = showFull ? tz : abbr;

  return React.createElement(
    "span",
    {
      className: `inline-flex items-center rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-white/50 ${className ?? ""}`,
      title: tz,
      "aria-label": `Timezone: ${tz}`,
    },
    label
  );
}
