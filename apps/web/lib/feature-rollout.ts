/**
 * Feature rollout management (Issue #521).
 *
 * Percentage-based rollout, user segment targeting, kill switch,
 * dependency tracking, and monitoring dashboard data.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type RolloutStatus = "disabled" | "canary" | "partial" | "full" | "killed";

export interface UserSegment {
  id: string;
  name: string;
  /** Predicate expressed as a set of conditions (all must match). */
  conditions: SegmentCondition[];
}

export interface SegmentCondition {
  field: string;
  operator: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "in" | "contains";
  value: string | number | boolean | string[];
}

export interface RolloutFeature {
  id: string;
  name: string;
  description: string;
  /** Percentage of users that should see this feature (0-100). */
  percentage: number;
  status: RolloutStatus;
  /** Optional list of targeted user segments. */
  targetSegments: string[];
  /** Feature IDs that must be enabled for this to be available. */
  dependencies: string[];
  /** When the rollout was created. */
  createdAt: string;
  /** When the rollout was last updated. */
  updatedAt: string;
  /** Owner / team responsible. */
  owner: string;
  /** Kill switch reason (set when killed). */
  killReason?: string;
  /** Metric thresholds that trigger auto-kill. */
  killThresholds?: KillThreshold[];
  /** Tags for categorization. */
  tags: string[];
}

export interface KillThreshold {
  metric: string;
  operator: "gt" | "lt";
  value: number;
  windowSeconds: number;
}

export interface RolloutEvent {
  featureId: string;
  type: "created" | "updated" | "percentage_changed" | "killed" | "revived" | "full_rollout";
  previousValue?: string | number;
  newValue?: string | number;
  reason?: string;
  actor: string;
  timestamp: string;
}

export interface RolloutMetrics {
  featureId: string;
  enabledUsers: number;
  totalUsers: number;
  enabledPercentage: number;
  errorRate: number;
  latencyP50: number;
  latencyP99: number;
  adoptionRate: number;
  lastUpdated: string;
}

export interface DashboardData {
  features: RolloutFeature[];
  metrics: Record<string, RolloutMetrics>;
  recentEvents: RolloutEvent[];
  healthStatus: Record<string, "healthy" | "degraded" | "critical">;
}

/* ------------------------------------------------------------------ */
/*  In-memory stores                                                  */
/* ------------------------------------------------------------------ */

const features = new Map<string, RolloutFeature>();
const segments = new Map<string, UserSegment>();
const events: RolloutEvent[] = [];
const metricsStore = new Map<string, RolloutMetrics>();

/* ------------------------------------------------------------------ */
/*  Hash function for consistent assignment                           */
/* ------------------------------------------------------------------ */

function hashToPercentage(featureId: string, userId: string): number {
  const input = `rollout:${featureId}:${userId}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    hash = (hash << 5) - hash + c;
    hash |= 0;
  }
  return Math.abs(hash) % 100;
}

/* ------------------------------------------------------------------ */
/*  Segment evaluation                                                */
/* ------------------------------------------------------------------ */

export interface UserContext {
  userId: string;
  [key: string]: string | number | boolean | string[];
}

function evaluateCondition(ctx: UserContext, cond: SegmentCondition): boolean {
  const val = ctx[cond.field];
  if (val === undefined) return false;

  switch (cond.operator) {
    case "eq":
      return val === cond.value;
    case "neq":
      return val !== cond.value;
    case "gt":
      return typeof val === "number" && val > (cond.value as number);
    case "lt":
      return typeof val === "number" && val < (cond.value as number);
    case "gte":
      return typeof val === "number" && val >= (cond.value as number);
    case "lte":
      return typeof val === "number" && val <= (cond.value as number);
    case "in":
      return Array.isArray(cond.value) && cond.value.includes(String(val));
    case "contains":
      return typeof val === "string" && val.includes(String(cond.value));
    default:
      return false;
  }
}

function matchesSegment(ctx: UserContext, segment: UserSegment): boolean {
  return segment.conditions.every((c) => evaluateCondition(ctx, c));
}

/* ------------------------------------------------------------------ */
/*  Core API                                                          */
/* ------------------------------------------------------------------ */

/** Register a user segment. */
export function registerSegment(segment: UserSegment): void {
  segments.set(segment.id, segment);
}

/** Create a new rollout feature. */
export function createFeature(
  feature: Omit<RolloutFeature, "createdAt" | "updatedAt">
): RolloutFeature {
  const now = new Date().toISOString();
  const full: RolloutFeature = { ...feature, createdAt: now, updatedAt: now };
  features.set(full.id, full);
  recordEvent(full.id, "created", undefined, undefined, "system", "Feature created");
  return full;
}

/** Check whether a feature is enabled for a given user context. */
export function isEnabled(featureId: string, ctx: UserContext): boolean {
  const feature = features.get(featureId);
  if (!feature) return false;

  // Kill switch overrides everything
  if (feature.status === "killed" || feature.status === "disabled") return false;
  if (feature.status === "full") return true;

  // Check dependencies first
  for (const dep of feature.dependencies) {
    if (!isEnabled(dep, ctx)) return false;
  }

  // Check segment targeting
  if (feature.targetSegments.length > 0) {
    const inSegment = feature.targetSegments.some((segId) => {
      const seg = segments.get(segId);
      return seg ? matchesSegment(ctx, seg) : false;
    });
    if (!inSegment) return false;
  }

  // Percentage-based check
  return hashToPercentage(featureId, ctx.userId) < feature.percentage;
}

/** Update the rollout percentage. */
export function setPercentage(
  featureId: string,
  percentage: number,
  actor: string
): void {
  const feature = features.get(featureId);
  if (!feature) throw new Error(`Feature ${featureId} not found`);
  if (percentage < 0 || percentage > 100) {
    throw new Error("Percentage must be between 0 and 100");
  }

  const prev = feature.percentage;
  feature.percentage = percentage;
  feature.updatedAt = new Date().toISOString();

  if (percentage === 100) {
    feature.status = "full";
    recordEvent(featureId, "full_rollout", prev, 100, actor);
  } else if (percentage > 0) {
    feature.status = percentage <= 5 ? "canary" : "partial";
    recordEvent(featureId, "percentage_changed", prev, percentage, actor);
  } else {
    feature.status = "disabled";
    recordEvent(featureId, "percentage_changed", prev, 0, actor);
  }
}

/** Activate the kill switch for a feature. */
export function killSwitch(
  featureId: string,
  reason: string,
  actor: string
): void {
  const feature = features.get(featureId);
  if (!feature) throw new Error(`Feature ${featureId} not found`);

  feature.status = "killed";
  feature.killReason = reason;
  feature.updatedAt = new Date().toISOString();
  recordEvent(featureId, "killed", feature.percentage, 0, actor, reason);
}

/** Revive a killed feature (goes back to disabled at 0%). */
export function reviveFeature(featureId: string, actor: string): void {
  const feature = features.get(featureId);
  if (!feature) throw new Error(`Feature ${featureId} not found`);
  if (feature.status !== "killed") {
    throw new Error("Feature is not killed");
  }

  feature.status = "disabled";
  feature.percentage = 0;
  feature.killReason = undefined;
  feature.updatedAt = new Date().toISOString();
  recordEvent(featureId, "revived", undefined, undefined, actor);
}

/** Check whether the dependency graph is acyclic. */
export function validateDependencies(featureId: string): {
  valid: boolean;
  cycle?: string[];
} {
  const visited = new Set<string>();
  const path: string[] = [];

  function dfs(id: string): string[] | null {
    if (path.includes(id)) {
      return [...path.slice(path.indexOf(id)), id];
    }
    if (visited.has(id)) return null;
    visited.add(id);
    path.push(id);

    const f = features.get(id);
    if (f) {
      for (const dep of f.dependencies) {
        const cycle = dfs(dep);
        if (cycle) return cycle;
      }
    }

    path.pop();
    return null;
  }

  const cycle = dfs(featureId);
  return cycle ? { valid: false, cycle } : { valid: true };
}

/** Update metrics for a feature. */
export function updateMetrics(
  featureId: string,
  partial: Partial<Omit<RolloutMetrics, "featureId" | "lastUpdated">>
): void {
  const existing = metricsStore.get(featureId) ?? {
    featureId,
    enabledUsers: 0,
    totalUsers: 0,
    enabledPercentage: 0,
    errorRate: 0,
    latencyP50: 0,
    latencyP99: 0,
    adoptionRate: 0,
    lastUpdated: new Date().toISOString(),
  };

  metricsStore.set(featureId, {
    ...existing,
    ...partial,
    featureId,
    lastUpdated: new Date().toISOString(),
  });

  // Check kill thresholds
  const feature = features.get(featureId);
  if (feature?.killThresholds) {
    const m = metricsStore.get(featureId)!;
    for (const threshold of feature.killThresholds) {
      const metricVal = (m as Record<string, unknown>)[threshold.metric];
      if (typeof metricVal === "number") {
        const triggered =
          threshold.operator === "gt"
            ? metricVal > threshold.value
            : metricVal < threshold.value;
        if (triggered) {
          killSwitch(
            featureId,
            `Auto-kill: ${threshold.metric} ${threshold.operator} ${threshold.value} (actual: ${metricVal})`,
            "auto-monitor"
          );
          break;
        }
      }
    }
  }
}

/** Get monitoring dashboard data. */
export function getDashboardData(): DashboardData {
  const allFeatures = Array.from(features.values());
  const allMetrics: Record<string, RolloutMetrics> = {};
  const healthStatus: Record<string, "healthy" | "degraded" | "critical"> = {};

  for (const f of allFeatures) {
    const m = metricsStore.get(f.id);
    if (m) {
      allMetrics[f.id] = m;
      if (m.errorRate > 5) {
        healthStatus[f.id] = "critical";
      } else if (m.errorRate > 1 || m.latencyP99 > 5000) {
        healthStatus[f.id] = "degraded";
      } else {
        healthStatus[f.id] = "healthy";
      }
    } else {
      healthStatus[f.id] = f.status === "killed" ? "critical" : "healthy";
    }
  }

  return {
    features: allFeatures,
    metrics: allMetrics,
    recentEvents: events.slice(-50),
    healthStatus,
  };
}

/** Get a single feature by ID. */
export function getFeature(featureId: string): RolloutFeature | undefined {
  return features.get(featureId);
}

/** List all features. */
export function listFeatures(): RolloutFeature[] {
  return Array.from(features.values());
}

/** Clear all data (useful for testing). */
export function resetAll(): void {
  features.clear();
  segments.clear();
  events.length = 0;
  metricsStore.clear();
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                  */
/* ------------------------------------------------------------------ */

function recordEvent(
  featureId: string,
  type: RolloutEvent["type"],
  previousValue?: string | number,
  newValue?: string | number,
  actor: string = "system",
  reason?: string
): void {
  events.push({
    featureId,
    type,
    previousValue,
    newValue,
    reason,
    actor,
    timestamp: new Date().toISOString(),
  });
}
