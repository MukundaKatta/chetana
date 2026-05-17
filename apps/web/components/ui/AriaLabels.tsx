"use client";

import React, {
  useCallback,
  useRef,
  useState,
  useEffect,
  type ComponentType,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/**
 * ARIA label utilities for accessibility (Issue #243).
 * Provides a HOC for automatic ARIA labeling, a live-region announcer hook,
 * and a VisuallyHidden component.
 */

/**
 * Higher-order component that adds an aria-label to the wrapped component.
 *
 * Usage:
 * ```tsx
 * const LabeledCard = withAriaLabel(Card, "Score card");
 * ```
 */
export function withAriaLabel<P extends Record<string, unknown>>(
  WrappedComponent: ComponentType<P>,
  defaultLabel: string
): ComponentType<P & { "aria-label"?: string }> {
  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";

  function WithAriaLabelWrapper(props: P & { "aria-label"?: string }) {
    const label = props["aria-label"] ?? defaultLabel;
    return React.createElement(WrappedComponent, {
      ...props,
      "aria-label": label,
    } as P);
  }

  WithAriaLabelWrapper.displayName = `withAriaLabel(${displayName})`;
  return WithAriaLabelWrapper;
}

/**
 * Hook for announcing messages to screen readers via an ARIA live region.
 *
 * Usage:
 * ```tsx
 * const { announce, LiveRegion } = useAnnounce();
 *
 * // Later:
 * announce("Score updated to 0.72");
 *
 * // In JSX:
 * <LiveRegion />
 * ```
 */
export function useAnnounce(politeness: "polite" | "assertive" = "polite") {
  const [message, setMessage] = useState("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const announce = useCallback(
    (text: string) => {
      // Clear then re-set to trigger screen reader re-announcement
      setMessage("");
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setMessage(text);
      }, 50);
    },
    []
  );

  // Clean up timeout on unmount
  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const LiveRegion = useCallback(
    () =>
      React.createElement(
        "div",
        {
          role: "status",
          "aria-live": politeness,
          "aria-atomic": "true",
          className: "sr-only",
        },
        message
      ),
    [message, politeness]
  );

  return { announce, message, LiveRegion };
}

/**
 * Visually hides content while keeping it accessible to screen readers.
 * Uses the standard CSS technique recommended by accessibility experts.
 *
 * Usage:
 * ```tsx
 * <VisuallyHidden>Loading score data</VisuallyHidden>
 * ```
 */
export function VisuallyHidden({
  children,
  as: Tag = "span",
  className,
  ...props
}: {
  children: ReactNode;
  as?: "span" | "div" | "p" | "h2" | "h3";
  className?: string;
  [key: string]: unknown;
}) {
  return React.createElement(
    Tag,
    {
      ...props,
      className: cn("sr-only", className),
      // Explicit styles as a fallback in case sr-only is not available
      style: {
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: 0,
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0,0,0,0)",
        whiteSpace: "nowrap",
        borderWidth: 0,
      },
    },
    children
  );
}
