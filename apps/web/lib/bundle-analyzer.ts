/**
 * Bundle size utilities — module size reporting and size budget checking.
 * Designed to run in a Node.js build/CI context.
 */

export interface ModuleStats {
  name: string;
  /** Size in bytes. */
  size: number;
  /** Gzipped size in bytes (if available). */
  gzipSize?: number;
}

export interface BundleStats {
  /** All modules and their sizes. */
  modules: ModuleStats[];
  /** Total raw size in bytes. */
  totalSize: number;
}

export interface SizeBudget {
  /** Maximum total bundle size in bytes. */
  maxTotalSize?: number;
  /** Maximum individual module size in bytes. */
  maxModuleSize?: number;
  /** Per-module overrides: module name pattern -> max bytes. */
  moduleLimits?: Record<string, number>;
}

export interface BudgetViolation {
  type: "total" | "module";
  name: string;
  actualSize: number;
  limitSize: number;
  overBy: number;
}

export interface AnalysisResult {
  stats: BundleStats;
  violations: BudgetViolation[];
  passed: boolean;
  summary: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Analyze bundle stats against optional size budgets.
 *
 * @param stats - The build output stats (module names and sizes).
 * @param budget - Optional size budgets to check against.
 * @returns Analysis result with violations (if any).
 *
 * @example
 * ```ts
 * const result = analyzeBundleSize(
 *   {
 *     modules: [
 *       { name: "react-dom", size: 130_000 },
 *       { name: "lodash", size: 72_000 },
 *     ],
 *     totalSize: 202_000,
 *   },
 *   { maxTotalSize: 250_000, maxModuleSize: 100_000 }
 * );
 * console.log(result.summary);
 * ```
 */
export function analyzeBundleSize(
  stats: BundleStats,
  budget?: SizeBudget
): AnalysisResult {
  const violations: BudgetViolation[] = [];

  if (budget?.maxTotalSize && stats.totalSize > budget.maxTotalSize) {
    violations.push({
      type: "total",
      name: "total bundle",
      actualSize: stats.totalSize,
      limitSize: budget.maxTotalSize,
      overBy: stats.totalSize - budget.maxTotalSize,
    });
  }

  for (const mod of stats.modules) {
    // Check per-module pattern limits first
    if (budget?.moduleLimits) {
      for (const [pattern, limit] of Object.entries(budget.moduleLimits)) {
        if (mod.name.includes(pattern) && mod.size > limit) {
          violations.push({
            type: "module",
            name: mod.name,
            actualSize: mod.size,
            limitSize: limit,
            overBy: mod.size - limit,
          });
        }
      }
    }

    // Check global per-module limit
    if (budget?.maxModuleSize && mod.size > budget.maxModuleSize) {
      // Avoid duplicate if already flagged by pattern
      const alreadyFlagged = violations.some(
        (v) => v.type === "module" && v.name === mod.name
      );
      if (!alreadyFlagged) {
        violations.push({
          type: "module",
          name: mod.name,
          actualSize: mod.size,
          limitSize: budget.maxModuleSize,
          overBy: mod.size - budget.maxModuleSize,
        });
      }
    }
  }

  const passed = violations.length === 0;

  // Build human-readable summary
  const sorted = [...stats.modules].sort((a, b) => b.size - a.size);
  const top5 = sorted.slice(0, 5);

  const lines: string[] = [
    `Bundle analysis: ${formatBytes(stats.totalSize)} total (${stats.modules.length} modules)`,
    "",
    "Top modules:",
    ...top5.map(
      (m, i) =>
        `  ${i + 1}. ${m.name} — ${formatBytes(m.size)}${m.gzipSize ? ` (${formatBytes(m.gzipSize)} gzip)` : ""}`
    ),
  ];

  if (violations.length > 0) {
    lines.push("", `Budget violations (${violations.length}):`);
    for (const v of violations) {
      lines.push(
        `  - ${v.name}: ${formatBytes(v.actualSize)} exceeds limit of ${formatBytes(v.limitSize)} by ${formatBytes(v.overBy)}`
      );
    }
  } else if (budget) {
    lines.push("", "All size budgets passed.");
  }

  return {
    stats,
    violations,
    passed,
    summary: lines.join("\n"),
  };
}
