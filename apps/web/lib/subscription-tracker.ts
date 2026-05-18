"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Subscription cleanup tracker (Issue #289).
 * Prevents memory leaks by tracking active subscriptions and
 * cleaning them all up on unmount or explicit cleanup.
 */

export interface Unsubscribable {
  unsubscribe: () => void;
}

type CleanupFn = () => void;
type Subscription = Unsubscribable | CleanupFn;

/**
 * Standalone class for tracking subscriptions outside of React.
 * Call `track()` for each subscription and `cleanupAll()` when done.
 */
export class SubscriptionTracker {
  private subscriptions: Set<Subscription> = new Set();

  /**
   * Track a subscription for later cleanup.
   * Accepts either an object with an `unsubscribe()` method or a plain cleanup function.
   */
  track(subscription: Subscription): void {
    this.subscriptions.add(subscription);
  }

  /**
   * Remove a specific subscription from tracking (without calling its cleanup).
   */
  untrack(subscription: Subscription): void {
    this.subscriptions.delete(subscription);
  }

  /**
   * Clean up all tracked subscriptions.
   */
  cleanupAll(): void {
    for (const sub of this.subscriptions) {
      try {
        if (typeof sub === "function") {
          sub();
        } else {
          sub.unsubscribe();
        }
      } catch {
        // Silently ignore cleanup errors to ensure all subscriptions are attempted
      }
    }
    this.subscriptions.clear();
  }

  /**
   * Returns the number of active tracked subscriptions.
   */
  get size(): number {
    return this.subscriptions.size;
  }
}

/**
 * React hook that tracks subscriptions and cleans them up on unmount.
 *
 * Usage:
 * ```tsx
 * const { track } = useTrackedSubscription();
 *
 * useEffect(() => {
 *   const sub = supabase
 *     .channel("scores")
 *     .on("postgres_changes", { event: "*", schema: "public" }, handler)
 *     .subscribe();
 *
 *   track({ unsubscribe: () => supabase.removeChannel(sub) });
 * }, [track]);
 * ```
 */
export function useTrackedSubscription() {
  const trackerRef = useRef<SubscriptionTracker | null>(null);

  // Lazy-init the tracker so it survives across renders
  if (trackerRef.current === null) {
    trackerRef.current = new SubscriptionTracker();
  }

  const track = useCallback((subscription: Subscription) => {
    trackerRef.current?.track(subscription);
  }, []);

  const cleanupAll = useCallback(() => {
    trackerRef.current?.cleanupAll();
  }, []);

  // Automatically clean up on unmount
  useEffect(() => {
    return () => {
      trackerRef.current?.cleanupAll();
    };
  }, []);

  return { track, cleanupAll, tracker: trackerRef.current };
}
