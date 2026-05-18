"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Animation performance utilities (Issue #349).
 * Provides reduced-motion detection, capability-based animation gating,
 * a rAF-based scheduler, and FPS-limited debouncing.
 */

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const ANIMATION_DEFAULTS = {
  /** Transition durations in ms per complexity tier. */
  durations: {
    low: 150,
    medium: 300,
    high: 500,
  },
  /** Maximum concurrent rAF-scheduled callbacks. */
  maxConcurrentAnimations: 8,
  /** Default FPS cap for debounceAnimation. */
  defaultFps: 60,
} as const;

// ---------------------------------------------------------------------------
// Reduced-motion hook
// ---------------------------------------------------------------------------

/**
 * Returns `true` when the user has requested reduced motion via their
 * operating-system or browser preferences.
 */
export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return prefersReduced;
}

// ---------------------------------------------------------------------------
// Device capability detection
// ---------------------------------------------------------------------------

/**
 * Heuristic check for whether the current device can comfortably run
 * animations at the given complexity tier.
 *
 * - `low`    — always animates (opacity, color).
 * - `medium` — skipped on devices with <= 4 logical cores or when
 *              reduced motion is preferred.
 * - `high`   — skipped on devices with <= 4 cores, < 4 GB RAM,
 *              or when reduced motion is preferred.
 */
export function shouldAnimate(
  complexity: "low" | "medium" | "high"
): boolean {
  if (typeof window === "undefined") return false;

  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (prefersReduced) return complexity === "low";

  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;

  switch (complexity) {
    case "low":
      return true;
    case "medium":
      return cores > 4;
    case "high":
      return cores > 4 && (memory === undefined || memory >= 4);
  }
}

// ---------------------------------------------------------------------------
// rAF-based scheduler
// ---------------------------------------------------------------------------

type ScheduledCallback = () => void;

interface SchedulerHandle {
  cancel: () => void;
}

const schedulerQueue: Array<{
  id: number;
  cb: ScheduledCallback;
}> = [];
let schedulerNextId = 0;
let schedulerRafId: number | null = null;

function flushScheduler() {
  const batch = schedulerQueue.splice(
    0,
    ANIMATION_DEFAULTS.maxConcurrentAnimations
  );

  for (const entry of batch) {
    try {
      entry.cb();
    } catch (err) {
      console.error("[animation-perf] Scheduled callback threw:", err);
    }
  }

  if (schedulerQueue.length > 0) {
    schedulerRafId = requestAnimationFrame(flushScheduler);
  } else {
    schedulerRafId = null;
  }
}

/**
 * Schedules `callback` to run in the next `requestAnimationFrame` tick,
 * batched with other scheduled work. Returns a handle with a `cancel`
 * method.
 */
export function scheduleAnimation(
  callback: ScheduledCallback
): SchedulerHandle {
  const id = schedulerNextId++;
  schedulerQueue.push({ id, cb: callback });

  if (schedulerRafId === null) {
    schedulerRafId = requestAnimationFrame(flushScheduler);
  }

  return {
    cancel() {
      const idx = schedulerQueue.findIndex((e) => e.id === id);
      if (idx !== -1) schedulerQueue.splice(idx, 1);
    },
  };
}

/**
 * React hook wrapping `scheduleAnimation` that auto-cancels on unmount.
 */
export function useScheduleAnimation() {
  const handles = useRef<SchedulerHandle[]>([]);

  useEffect(() => {
    return () => {
      for (const h of handles.current) h.cancel();
      handles.current = [];
    };
  }, []);

  return useCallback((cb: ScheduledCallback) => {
    const handle = scheduleAnimation(cb);
    handles.current.push(handle);
    return handle;
  }, []);
}

// ---------------------------------------------------------------------------
// FPS-capped debounce
// ---------------------------------------------------------------------------

/**
 * Creates a debounced version of `callback` that fires at most once per
 * frame at the given `fps` (default 60). Uses `requestAnimationFrame`
 * internally so the work is aligned with the browser paint cycle.
 */
export function debounceAnimation<T extends (...args: unknown[]) => void>(
  callback: T,
  fps: number = ANIMATION_DEFAULTS.defaultFps
): T & { cancel: () => void } {
  const interval = 1000 / fps;
  let lastTime = 0;
  let rafId: number | null = null;
  let latestArgs: Parameters<T> | null = null;

  const debounced = ((...args: Parameters<T>) => {
    latestArgs = args;

    if (rafId !== null) return;

    rafId = requestAnimationFrame((now) => {
      rafId = null;

      if (now - lastTime >= interval && latestArgs) {
        lastTime = now;
        callback(...latestArgs);
        latestArgs = null;
      }
    });
  }) as T & { cancel: () => void };

  debounced.cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    latestArgs = null;
  };

  return debounced;
}
