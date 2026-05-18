/**
 * Filename sanitization utilities (Issue #351).
 * Provides helpers for generating safe, portable filenames for
 * exported audit reports and other downloadable files.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum character length for generated filenames (excluding extension). */
const MAX_FILENAME_LENGTH = 200;

/** Characters that are unsafe in filenames across Windows, macOS, and Linux. */
const UNSAFE_CHARS = /[<>:"/\\|?*\x00-\x1F]/g;

/** Collapse multiple consecutive dashes or underscores. */
const REPEATED_SEPARATORS = /[-_]{2,}/g;

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/**
 * Strips special characters, trims whitespace, and limits the base name
 * to 200 characters. The result is safe for use on all major operating
 * systems and file systems.
 */
export function sanitizeFilename(name: string): string {
  let sanitized = name
    .trim()
    .replace(UNSAFE_CHARS, "")
    .replace(REPEATED_SEPARATORS, "-")
    .replace(/^[.\- ]+/, "") // no leading dots / dashes
    .replace(/[.\- ]+$/, ""); // no trailing dots / dashes

  if (sanitized.length > MAX_FILENAME_LENGTH) {
    sanitized = sanitized.slice(0, MAX_FILENAME_LENGTH);
    // Clean up any partial separator we may have sliced through
    sanitized = sanitized.replace(/[.\- ]+$/, "");
  }

  return sanitized || "untitled";
}

/**
 * Replaces whitespace sequences with the given `replacement` character.
 *
 * @param name - The filename to process.
 * @param replacement - Character to replace spaces with (default `"-"`).
 */
export function replaceSpaces(
  name: string,
  replacement: string = "-"
): string {
  return name.replace(/\s+/g, replacement);
}

/**
 * Appends an ISO-8601-ish timestamp to the filename, using only
 * filesystem-safe characters (hyphens instead of colons).
 *
 * @example
 * addTimestamp("audit-report")
 * // → "audit-report-2024-01-15T10-30-00"
 */
export function addTimestamp(
  name: string,
  date: Date = new Date()
): string {
  const iso = date.toISOString().replace(/:/g, "-").replace(/\.\d{3}Z$/, "");
  return `${name}-${iso}`;
}

/**
 * Ensures the filename ends with the given extension. If it already has
 * the correct extension, it is returned unchanged.
 *
 * @param name - The filename.
 * @param ext  - The desired extension, with or without a leading dot.
 */
export function ensureExtension(name: string, ext: string): string {
  const normalizedExt = ext.startsWith(".") ? ext : `.${ext}`;

  if (name.toLowerCase().endsWith(normalizedExt.toLowerCase())) {
    return name;
  }

  return `${name}${normalizedExt}`;
}

// ---------------------------------------------------------------------------
// High-level export filename generator
// ---------------------------------------------------------------------------

/**
 * Generates a complete, safe filename for an exported audit report.
 *
 * @param auditName - Human-readable audit name (will be sanitized).
 * @param format    - Export format / file extension (e.g. `"csv"`, `"json"`, `"pdf"`).
 * @param date      - Optional date to use for the timestamp (defaults to now).
 *
 * @example
 * generateExportFilename("My Audit: GPT-4 vs Claude", "csv")
 * // → "my-audit-gpt-4-vs-claude-2024-01-15T10-30-00.csv"
 */
export function generateExportFilename(
  auditName: string,
  format: string,
  date: Date = new Date()
): string {
  const base = sanitizeFilename(
    replaceSpaces(auditName.toLowerCase())
  );
  const timestamped = addTimestamp(base, date);
  return ensureExtension(timestamped, format);
}
