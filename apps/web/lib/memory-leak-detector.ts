/**
 * Development-mode memory leak detection utilities.
 * Tracks subscriptions and timers, warns when a component unmounts
 * without cleaning them up.
 */

"use client";

import { useEffect, useRef } from "react";

type CleanupFn = () => void;

interface TrackedResource {
  label: string;
  stack: string;
  cleanup: CleanupFn;
  createdAt: number;
}

/**
 * Dev-only hook that tracks subscriptions, timers, and other resources
 * that must be cleaned up on unmount.
 *
 * In production this is a lightweight no-op.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const track = useTrackCleanup("MyComponent");
 *
 *   useEffect(() => {
 *     const id = setInterval(() => console.log("tick"), 1000);
 *     track("interval", () => clearInterval(id));
 *
 *     const sub = eventBus.subscribe(handler);
 *     track("eventBus subscription", () => sub.unsubscribe());
 *   }, [track]);
 *
 *   return <div />;
 * }
 * ```
 */
export function useTrackCleanup(componentName: string) {
  const resources = useRef<TrackedResource[]>([]);

  const track = useRef(
    (label: string, cleanup: CleanupFn): CleanupFn => {
      if (process.env.NODE_ENV !== "development") {
        // In production just return the cleanup as-is — no tracking overhead
        return cleanup;
      }

      const resource: TrackedResource = {
        label,
        stack: new Error().stack ?? "",
        cleanup,
        createdAt: Date.now(),
      };

      resources.current.push(resource);

      // Return a function that both cleans up and un-tracks
      return () => {
        cleanup();
        resources.current = resources.current.filter((r) => r !== resource);
      };
    }
  ).current;

  useEffect(() => {
    // Cleanup runs on unmount
    return () => {
      if (process.env.NODE_ENV !== "development") return;

      const leaked = resources.current;
      if (leaked.length === 0) return;

      console.warn(
        `[MemoryLeakDetector] ${componentName} unmounted with ${leaked.length} un-cleaned resource(s):`
      );

      for (const res of leaked) {
        console.warn(
          `  - "${res.label}" created ${Date.now() - res.createdAt}ms ago`,
          "\n    at",
          res.stack.split("\n").slice(1, 3).join("\n       ")
        );

        // Auto-cleanup to prevent the actual leak
        try {
          res.cleanup();
        } catch (err) {
          console.error(
            `[MemoryLeakDetector] Error cleaning up "${res.label}":`,
            err
          );
        }
      }

      resources.current = [];
    };
  }, [componentName]);

  return track;
}
