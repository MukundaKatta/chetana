/**
 * Smart probe ordering algorithm (Issue #358).
 * Topological sort respecting probe dependencies, information gain heuristic,
 * adaptive reordering, and priority boost for high discriminative power.
 */

import type { ProbeDefinition, Theory } from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ProbeDependency {
  /** Probe ID that has a dependency. */
  probeId: string;
  /** Probe IDs that this probe depends on (must run first). */
  dependsOn: string[];
}

export interface ProbeOrderingConfig {
  /** Weight for information gain heuristic (0-1, default 0.4). */
  informationGainWeight: number;
  /** Weight for discriminative power (0-1, default 0.3). */
  discriminativePowerWeight: number;
  /** Weight for theory diversity (0-1, default 0.2). */
  theoryDiversityWeight: number;
  /** Weight for execution cost (0-1, default 0.1). */
  costWeight: number;
  /** Enable adaptive reordering based on runtime results (default true). */
  adaptiveReordering: boolean;
}

export interface ProbeMetrics {
  /** Probe ID. */
  probeId: string;
  /** Estimated information gain (0-1). */
  informationGain: number;
  /** Discriminative power across theories (0-1). */
  discriminativePower: number;
  /** Estimated token cost. */
  estimatedTokens: number;
  /** Historical average score variance. */
  scoreVariance: number;
}

export interface OrderedProbe {
  probe: ProbeDefinition;
  priority: number;
  reason: string;
  dependencies: string[];
}

export interface AdaptiveContext {
  /** Completed probe IDs mapped to their scores. */
  completedProbes: Map<string, number>;
  /** Theory scores accumulated so far. */
  currentTheoryScores: Partial<Record<Theory, number[]>>;
  /** Probes that have been skipped. */
  skippedProbes: Set<string>;
}

const DEFAULT_CONFIG: ProbeOrderingConfig = {
  informationGainWeight: 0.4,
  discriminativePowerWeight: 0.3,
  theoryDiversityWeight: 0.2,
  costWeight: 0.1,
  adaptiveReordering: true,
};

/* ------------------------------------------------------------------ */
/*  Topological Sort                                                  */
/* ------------------------------------------------------------------ */

/**
 * Topological sort using Kahn's algorithm.
 * Throws if a cycle is detected.
 */
export function topologicalSort(
  probeIds: string[],
  dependencies: ProbeDependency[]
): string[] {
  const idSet = new Set(probeIds);
  const adjList = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize
  for (const id of probeIds) {
    adjList.set(id, []);
    inDegree.set(id, 0);
  }

  // Build graph
  for (const dep of dependencies) {
    if (!idSet.has(dep.probeId)) continue;
    for (const parent of dep.dependsOn) {
      if (!idSet.has(parent)) continue;
      adjList.get(parent)!.push(dep.probeId);
      inDegree.set(dep.probeId, (inDegree.get(dep.probeId) ?? 0) + 1);
    }
  }

  // Kahn's algorithm
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);
    for (const neighbor of adjList.get(node) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  if (sorted.length !== probeIds.length) {
    const missing = probeIds.filter((id) => !sorted.includes(id));
    throw new Error(
      `Cycle detected in probe dependencies. Involved probes: ${missing.join(", ")}`
    );
  }

  return sorted;
}

/**
 * Detect cycles in the dependency graph.
 */
export function detectCycles(
  probeIds: string[],
  dependencies: ProbeDependency[]
): string[][] {
  const idSet = new Set(probeIds);
  const adjList = new Map<string, string[]>();

  for (const id of probeIds) {
    adjList.set(id, []);
  }
  for (const dep of dependencies) {
    if (!idSet.has(dep.probeId)) continue;
    for (const parent of dep.dependsOn) {
      if (!idSet.has(parent)) continue;
      adjList.get(parent)!.push(dep.probeId);
    }
  }

  const visited = new Set<string>();
  const recStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(node: string, path: string[]): void {
    visited.add(node);
    recStack.add(node);
    path.push(node);

    for (const neighbor of adjList.get(node) ?? []) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, path);
      } else if (recStack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor);
        cycles.push(path.slice(cycleStart));
      }
    }

    path.pop();
    recStack.delete(node);
  }

  for (const id of probeIds) {
    if (!visited.has(id)) {
      dfs(id, []);
    }
  }

  return cycles;
}

/* ------------------------------------------------------------------ */
/*  Information Gain Heuristic                                        */
/* ------------------------------------------------------------------ */

/**
 * Estimate information gain for a probe based on current context.
 * Higher values indicate the probe is likely to provide more useful information.
 */
export function estimateInformationGain(
  probe: ProbeDefinition,
  context: AdaptiveContext,
  metrics?: ProbeMetrics
): number {
  let gain = 0.5; // Base information gain

  // Probes for theories with fewer completed probes gain more
  const theoryScores = context.currentTheoryScores[probe.theory] ?? [];
  if (theoryScores.length === 0) {
    gain += 0.3; // No data for this theory yet
  } else if (theoryScores.length < 3) {
    gain += 0.15; // Limited data
  }

  // High variance probes provide more information
  if (metrics?.scoreVariance) {
    gain += metrics.scoreVariance * 0.2;
  }

  // Information gain from metrics
  if (metrics?.informationGain) {
    gain = gain * 0.5 + metrics.informationGain * 0.5;
  }

  return Math.min(1, Math.max(0, gain));
}

/**
 * Calculate discriminative power - how well a probe distinguishes theories.
 */
export function calculateDiscriminativePower(
  probe: ProbeDefinition,
  metrics?: ProbeMetrics
): number {
  if (metrics?.discriminativePower !== undefined) {
    return metrics.discriminativePower;
  }

  // Default heuristic based on evidence type
  switch (probe.evidenceType) {
    case "behavioral":
      return 0.7;
    case "structural":
      return 0.5;
    case "self-report":
      return 0.3;
    default:
      return 0.5;
  }
}

/* ------------------------------------------------------------------ */
/*  Priority Scoring                                                  */
/* ------------------------------------------------------------------ */

/**
 * Calculate the composite priority score for a probe.
 */
export function calculatePriority(
  probe: ProbeDefinition,
  context: AdaptiveContext,
  config: ProbeOrderingConfig,
  metrics?: ProbeMetrics,
  recentTheories?: Theory[]
): { priority: number; reason: string } {
  const infoGain = estimateInformationGain(probe, context, metrics);
  const discPower = calculateDiscriminativePower(probe, metrics);

  // Theory diversity: boost probes from underrepresented theories
  let diversityScore = 0.5;
  if (recentTheories) {
    const recentCount = recentTheories.filter((t) => t === probe.theory).length;
    diversityScore = Math.max(0, 1 - recentCount * 0.2);
  }

  // Cost efficiency (inverse normalized)
  let costScore = 0.5;
  if (metrics?.estimatedTokens) {
    costScore = Math.max(0, 1 - metrics.estimatedTokens / 5000);
  }

  const priority =
    infoGain * config.informationGainWeight +
    discPower * config.discriminativePowerWeight +
    diversityScore * config.theoryDiversityWeight +
    costScore * config.costWeight;

  const reasons: string[] = [];
  if (infoGain > 0.7) reasons.push("high info gain");
  if (discPower > 0.7) reasons.push("high discriminative power");
  if (diversityScore > 0.7) reasons.push("improves diversity");
  if (costScore > 0.7) reasons.push("cost efficient");

  return {
    priority: Math.min(1, Math.max(0, priority)),
    reason: reasons.length > 0 ? reasons.join(", ") : "standard priority",
  };
}

/* ------------------------------------------------------------------ */
/*  Main Ordering Function                                            */
/* ------------------------------------------------------------------ */

/**
 * Generate an optimally ordered list of probes respecting dependencies,
 * information gain, and discriminative power.
 */
export function orderProbes(
  probes: ProbeDefinition[],
  dependencies: ProbeDependency[],
  config: Partial<ProbeOrderingConfig> = {},
  metricsMap?: Map<string, ProbeMetrics>,
  context?: AdaptiveContext
): OrderedProbe[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const ctx: AdaptiveContext = context ?? {
    completedProbes: new Map(),
    currentTheoryScores: {},
    skippedProbes: new Set(),
  };

  const probeMap = new Map(probes.map((p) => [p.id, p]));
  const probeIds = probes.map((p) => p.id);

  // Build dependency lookup
  const depMap = new Map<string, string[]>();
  for (const dep of dependencies) {
    depMap.set(dep.probeId, dep.dependsOn);
  }

  // Topological sort to get a valid ordering
  const topoOrder = topologicalSort(probeIds, dependencies);

  // Group by dependency level (probes with no unmet deps can be reordered)
  const levels: string[][] = [];
  const placed = new Set<string>();

  while (placed.size < topoOrder.length) {
    const level: string[] = [];
    for (const id of topoOrder) {
      if (placed.has(id)) continue;
      const deps = depMap.get(id) ?? [];
      if (deps.every((d) => placed.has(d) || !probeMap.has(d))) {
        level.push(id);
      }
    }
    if (level.length === 0) break;
    levels.push(level);
    for (const id of level) {
      placed.add(id);
    }
  }

  // Within each level, sort by priority
  const result: OrderedProbe[] = [];
  const recentTheories: Theory[] = [];

  for (const level of levels) {
    const scored = level.map((id) => {
      const probe = probeMap.get(id)!;
      const metrics = metricsMap?.get(id);
      const { priority, reason } = calculatePriority(
        probe,
        ctx,
        cfg,
        metrics,
        recentTheories
      );
      return {
        probe,
        priority,
        reason,
        dependencies: depMap.get(id) ?? [],
      };
    });

    // Sort descending by priority within each dependency level
    scored.sort((a, b) => b.priority - a.priority);

    for (const item of scored) {
      result.push(item);
      recentTheories.push(item.probe.theory);
      // Keep recent window at 5
      if (recentTheories.length > 5) recentTheories.shift();
    }
  }

  return result;
}

/**
 * Adaptively reorder remaining probes based on completed results.
 * Call this after each probe completes to get an updated ordering.
 */
export function adaptiveReorder(
  remainingProbes: ProbeDefinition[],
  dependencies: ProbeDependency[],
  context: AdaptiveContext,
  config: Partial<ProbeOrderingConfig> = {},
  metricsMap?: Map<string, ProbeMetrics>
): OrderedProbe[] {
  // Filter out completed and skipped probes from dependencies
  const activeIds = new Set(remainingProbes.map((p) => p.id));
  const filteredDeps = dependencies
    .filter((d) => activeIds.has(d.probeId))
    .map((d) => ({
      ...d,
      dependsOn: d.dependsOn.filter(
        (dep) => activeIds.has(dep) && !context.completedProbes.has(dep)
      ),
    }));

  return orderProbes(remainingProbes, filteredDeps, config, metricsMap, context);
}
