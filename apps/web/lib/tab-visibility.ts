"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";

/**
 * Tab visibility and refocus utilities (Issue #354).
 * Detects when the browser tab is hidden/shown and optionally
 * re-fetches stale data on regain of focus.
 */

// ---------------------------------------------------------------------------
// useTabVisibility hook
// ---------------------------------------------------------------------------

export interface TabVisibilityState {
  /** `true` when the document is currently visible. */
  isVisible: boolean;
  /** `true` if the tab was hidden at any point since mount. */
  wasHidden: boolean;
  /** Timestamp (ms) of the most recent hide event, or `null`. */
  lastHiddenAt: number | null;
}

/**
 * Tracks whether the browser tab is visible.
 *
 * @example
 * ```tsx
 * const { isVisible, lastHiddenAt } = useTabVisibility();
 * ```
 */
export function useTabVisibility(): TabVisibilityState {
  const [state, setState] = useState<TabVisibilityState>(() => ({
    isVisible: typeof document !== "undefined" ? !document.hidden : true,
    wasHidden: false,
    lastHiddenAt: null,
  }));

  useEffect(() => {
    const handler = () => {
      const visible = !document.hidden;
      setState((prev) => ({
        isVisible: visible,
        wasHidden: prev.wasHidden || !visible,
        lastHiddenAt: visible ? prev.lastHiddenAt : Date.now(),
      }));
    };

    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  return state;
}

// ---------------------------------------------------------------------------
// useRefetchOnFocus hook
// ---------------------------------------------------------------------------

export interface RefetchOnFocusOptions {
  /** Minimum time (ms) the tab must be hidden before a refetch triggers. Default 30 000. */
  minStaleTime?: number;
  /** Whether the hook is active. Default `true`. */
  enabled?: boolean;
  /** Optional callback invoked right before refetching. */
  onRefetch?: () => void;
}

/**
 * Automatically calls `fetchFn` when the tab regains focus after being
 * hidden for at least `minStaleTime` milliseconds.
 *
 * @example
 * ```tsx
 * useRefetchOnFocus(() => refetchAuditData(), { minStaleTime: 15_000 });
 * ```
 */
export function useRefetchOnFocus(
  fetchFn: () => void | Promise<void>,
  options: RefetchOnFocusOptions = {}
): void {
  const {
    minStaleTime = 30_000,
    enabled = true,
    onRefetch,
  } = options;

  const hiddenAtRef = useRef<number | null>(null);
  const fetchRef = useRef(fetchFn);
  const onRefetchRef = useRef(onRefetch);

  // Keep refs current without re-subscribing to visibilitychange.
  useEffect(() => {
    fetchRef.current = fetchFn;
  }, [fetchFn]);

  useEffect(() => {
    onRefetchRef.current = onRefetch;
  }, [onRefetch]);

  useEffect(() => {
    if (!enabled) return;

    const handler = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
        return;
      }

      const hiddenAt = hiddenAtRef.current;
      if (hiddenAt === null) return;

      const elapsed = Date.now() - hiddenAt;
      hiddenAtRef.current = null;

      if (elapsed >= minStaleTime) {
        onRefetchRef.current?.();
        fetchRef.current();
      }
    };

    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [enabled, minStaleTime]);
}

// ---------------------------------------------------------------------------
// RefreshIndicator component
// ---------------------------------------------------------------------------

/**
 * Displays a brief "Data refreshed" toast that auto-dismisses.
 * Render it conditionally after a refetch completes.
 */
export function RefreshIndicator({
  visible,
  message = "Data refreshed",
  durationMs = 3000,
  onDismiss,
  className,
}: {
  visible: boolean;
  message?: string;
  durationMs?: number;
  onDismiss?: () => void;
  className?: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!visible) {
      setShow(false);
      return;
    }

    setShow(true);
    const timer = setTimeout(() => {
      setShow(false);
      onDismiss?.();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [visible, durationMs, onDismiss]);

  if (!show) return null;

  return React.createElement(
    "div",
    {
      role: "status",
      "aria-live": "polite",
      className:
        className ??
        "fixed bottom-4 right-4 z-50 rounded-md bg-green-900/90 px-4 py-2 text-sm text-green-100 shadow-lg animate-in fade-in slide-in-from-bottom-2",
    },
    message
  );
}
