/**
 * A/B testing framework with hash-based consistent user assignment,
 * variant selection, and metric tracking (Issue #344).
 */

"use client";

import { useState, useEffect, useCallback } from "react";

export interface Variant {
  id: string;
  name: string;
  /** Weight for assignment. Defaults to 1 (equal distribution). */
  weight?: number;
}

export interface Experiment {
  id: string;
  name: string;
  description?: string;
  variants: Variant[];
  /** Whether the experiment is active. Defaults to true. */
  active?: boolean;
}

export interface MetricEntry {
  experimentId: string;
  variantId: string;
  metricName: string;
  value: number;
  timestamp: number;
  userId?: string;
}

// Module-level stores
const experiments = new Map<string, Experiment>();
const metrics: MetricEntry[] = [];

/**
 * Register an experiment.
 */
export function registerExperiment(experiment: Experiment): void {
  experiments.set(experiment.id, { ...experiment, active: experiment.active ?? true });
}

/**
 * Get a registered experiment by ID.
 */
export function getExperiment(experimentId: string): Experiment | null {
  return experiments.get(experimentId) ?? null;
}

/**
 * List all registered experiments.
 */
export function listExperiments(): Experiment[] {
  return Array.from(experiments.values());
}

/**
 * Deterministic hash-based assignment. Given the same experimentId and userId,
 * always returns the same variant.
 */
function hashAssign(experimentId: string, userId: string): number {
  const input = `ab:${experimentId}:${userId}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Assign a user to a variant for a given experiment.
 * Uses weighted distribution if variants have weights.
 *
 * @param experimentId - The experiment to assign
 * @param userId - The user to assign
 * @returns The assigned variant, or null if experiment not found / inactive
 */
export function assignVariant(
  experimentId: string,
  userId: string
): Variant | null {
  const experiment = experiments.get(experimentId);
  if (!experiment || experiment.active === false) return null;
  if (experiment.variants.length === 0) return null;

  const totalWeight = experiment.variants.reduce(
    (sum, v) => sum + (v.weight ?? 1),
    0
  );

  const hash = hashAssign(experimentId, userId);
  const bucket = hash % totalWeight;

  let cumulative = 0;
  for (const variant of experiment.variants) {
    cumulative += variant.weight ?? 1;
    if (bucket < cumulative) {
      return variant;
    }
  }

  // Fallback to last variant
  return experiment.variants[experiment.variants.length - 1];
}

/**
 * Track a metric for an experiment variant.
 */
export function trackMetric(
  experimentId: string,
  metricName: string,
  value: number,
  options?: { variantId?: string; userId?: string }
): void {
  const variantId =
    options?.variantId ??
    (options?.userId
      ? assignVariant(experimentId, options.userId)?.id ?? "unknown"
      : "unknown");

  metrics.push({
    experimentId,
    variantId,
    metricName,
    value,
    timestamp: Date.now(),
    userId: options?.userId,
  });
}

/**
 * Get all tracked metrics, optionally filtered by experiment.
 */
export function getMetrics(experimentId?: string): MetricEntry[] {
  if (experimentId) {
    return metrics.filter((m) => m.experimentId === experimentId);
  }
  return [...metrics];
}

/**
 * Get aggregated metric summary for an experiment.
 */
export function getMetricSummary(
  experimentId: string,
  metricName: string
): Record<string, { count: number; sum: number; avg: number; min: number; max: number }> {
  const filtered = metrics.filter(
    (m) => m.experimentId === experimentId && m.metricName === metricName
  );

  const byVariant: Record<string, number[]> = {};
  for (const entry of filtered) {
    if (!byVariant[entry.variantId]) {
      byVariant[entry.variantId] = [];
    }
    byVariant[entry.variantId].push(entry.value);
  }

  const summary: Record<
    string,
    { count: number; sum: number; avg: number; min: number; max: number }
  > = {};

  for (const [variantId, values] of Object.entries(byVariant)) {
    const sum = values.reduce((a, b) => a + b, 0);
    summary[variantId] = {
      count: values.length,
      sum,
      avg: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }

  return summary;
}

/**
 * React hook that returns the assigned variant for the current user.
 *
 * @param experimentId - The experiment ID
 * @param userId - The user ID for consistent assignment
 * @returns The assigned variant or null
 */
export function useExperiment(
  experimentId: string,
  userId: string
): Variant | null {
  const assign = useCallback(
    () => assignVariant(experimentId, userId),
    [experimentId, userId]
  );

  const [variant, setVariant] = useState<Variant | null>(assign);

  useEffect(() => {
    setVariant(assign());
  }, [assign]);

  return variant;
}
