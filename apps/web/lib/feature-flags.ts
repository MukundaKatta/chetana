/**
 * Feature flag system with boolean and percentage rollout support
 * (Issue #343).
 *
 * Flags can be loaded from JSON config and evaluated per-user
 * for gradual rollouts.
 */

"use client";

import { useState, useEffect, useCallback } from "react";

export interface BooleanFlag {
  type: "boolean";
  enabled: boolean;
  description?: string;
}

export interface PercentageFlag {
  type: "percentage";
  percentage: number; // 0-100
  description?: string;
}

export type FlagDefinition = BooleanFlag | PercentageFlag;

export type FlagConfig = Record<string, FlagDefinition>;

// Module-level flag store
let flagStore: FlagConfig = {};

/**
 * Load flag definitions from a JSON config object.
 */
export function loadFlags(config: FlagConfig): void {
  flagStore = { ...config };
}

/**
 * Get the current loaded flag config.
 */
export function getFlags(): FlagConfig {
  return { ...flagStore };
}

/**
 * Simple deterministic hash for consistent user assignment.
 * Uses a basic string hash to produce a value 0-99.
 */
function hashUserToPercentage(flagName: string, userId: string): number {
  const input = `${flagName}:${userId}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 100;
}

/**
 * Check whether a feature flag is enabled.
 *
 * - For boolean flags: returns the `enabled` value directly.
 * - For percentage flags: uses a deterministic hash of flagName + userId
 *   to consistently assign the user to the rollout group.
 * - If the flag is not defined, returns false.
 *
 * @param flagName - The name of the feature flag
 * @param userId - Optional user ID for percentage-based rollout
 */
export function isFeatureEnabled(
  flagName: string,
  userId?: string
): boolean {
  const flag = flagStore[flagName];
  if (!flag) return false;

  if (flag.type === "boolean") {
    return flag.enabled;
  }

  if (flag.type === "percentage") {
    if (!userId) {
      // Without a user ID, use a random check (non-deterministic)
      return Math.random() * 100 < flag.percentage;
    }
    const bucket = hashUserToPercentage(flagName, userId);
    return bucket < flag.percentage;
  }

  return false;
}

/**
 * React hook for feature flag evaluation.
 * Re-evaluates when flagName or userId changes.
 *
 * @param flagName - The name of the feature flag
 * @param userId - Optional user ID for percentage-based rollout
 * @returns Whether the flag is enabled
 */
export function useFeatureFlag(
  flagName: string,
  userId?: string
): boolean {
  const evaluate = useCallback(
    () => isFeatureEnabled(flagName, userId),
    [flagName, userId]
  );

  const [enabled, setEnabled] = useState(evaluate);

  useEffect(() => {
    setEnabled(evaluate());
  }, [evaluate]);

  return enabled;
}
