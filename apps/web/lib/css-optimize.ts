/**
 * CSS optimization utilities (Issue #211).
 * Helpers for Tailwind content path configuration, dynamic class preservation,
 * and bundle size estimation.
 */

/**
 * Default content paths for Tailwind CSS scanning in the Chetana monorepo.
 */
export const TAILWIND_CONTENT_PATHS = [
  "./app/**/*.{ts,tsx}",
  "./components/**/*.{ts,tsx}",
  "./lib/**/*.{ts,tsx}",
  "../../packages/shared/src/**/*.{ts,tsx}",
] as const;

/**
 * Returns a content path configuration for Tailwind CSS.
 * Merges the default paths with any additional paths.
 */
export function getTailwindContentPaths(
  additionalPaths: string[] = []
): string[] {
  return [...TAILWIND_CONTENT_PATHS, ...additionalPaths];
}

/**
 * Dynamic classes that must never be purged by Tailwind.
 * These are generated at runtime (e.g. from API data) so the compiler
 * cannot detect them statically.
 */
export const PRESERVED_CLASSES = [
  // Theory colors (generated from theory keys)
  "text-consciousness-low",
  "text-consciousness-mid",
  "text-consciousness-high",
  "bg-consciousness-low",
  "bg-consciousness-mid",
  "bg-consciousness-high",
  // Score-dependent backgrounds
  "bg-red-500/20",
  "bg-yellow-500/20",
  "bg-green-500/20",
  // Theory badge colors
  "bg-blue-500/15",
  "text-blue-400",
  "bg-purple-500/15",
  "text-purple-400",
  "bg-amber-500/15",
  "text-amber-400",
  "bg-emerald-500/15",
  "text-emerald-400",
  "bg-rose-500/15",
  "text-rose-400",
  "bg-cyan-500/15",
  "text-cyan-400",
  // Grid columns (dynamic count)
  "grid-cols-1",
  "grid-cols-2",
  "grid-cols-3",
  "grid-cols-4",
  "grid-cols-5",
  "grid-cols-6",
] as const;

/**
 * Returns the safelist configuration for Tailwind CSS.
 */
export function getTailwindSafelist(
  additionalClasses: string[] = []
): string[] {
  return [...PRESERVED_CLASSES, ...additionalClasses];
}

/**
 * Rough CSS bundle size estimation.
 * Counts unique utility classes used across a set of file contents.
 *
 * @param fileContents - Array of source file content strings
 * @returns Estimated size information
 */
export function estimateBundleSize(fileContents: string[]): {
  /** Number of unique Tailwind classes detected. */
  uniqueClasses: number;
  /** Estimated CSS size in bytes (rough heuristic). */
  estimatedBytes: number;
  /** Human-readable size string. */
  formattedSize: string;
} {
  // Regex to match common Tailwind class patterns
  const classPattern = /(?:className|class)=(?:{[^}]*}|"[^"]*"|'[^']*')/g;
  const classNames = new Set<string>();

  for (const content of fileContents) {
    const matches = content.matchAll(classPattern);
    for (const match of matches) {
      // Extract individual class names
      const raw = match[0]
        .replace(/className=|class=/g, "")
        .replace(/[{}"']/g, " ");
      const names = raw.split(/\s+/).filter((s) => s.length > 0 && !s.includes("("));
      for (const name of names) {
        classNames.add(name);
      }
    }
  }

  const uniqueClasses = classNames.size;
  // Rough heuristic: ~80 bytes per unique class (rule + properties)
  const estimatedBytes = uniqueClasses * 80;

  let formattedSize: string;
  if (estimatedBytes < 1024) {
    formattedSize = `${estimatedBytes} B`;
  } else if (estimatedBytes < 1024 * 1024) {
    formattedSize = `${(estimatedBytes / 1024).toFixed(1)} KB`;
  } else {
    formattedSize = `${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return { uniqueClasses, estimatedBytes, formattedSize };
}

/**
 * Checks if a class name is in the preserved list.
 */
export function isPreservedClass(className: string): boolean {
  return (PRESERVED_CLASSES as readonly string[]).includes(className);
}
