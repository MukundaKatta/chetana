"use client";

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Text overflow utilities (Issue #350).
 * Truncation helpers, an overflow-aware tooltip hook, and ready-made
 * components for long text / model identifiers.
 */

// ---------------------------------------------------------------------------
// Pure truncation helpers
// ---------------------------------------------------------------------------

/**
 * Truncates `text` in the middle, preserving the beginning and end.
 *
 * @example
 * truncateMiddle("anthropic/claude-3-5-sonnet-20241022", 24)
 * // → "anthropic/cl...nnet-20241022"
 */
export function truncateMiddle(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  if (maxLength < 5) return text.slice(0, maxLength);

  const ellipsis = "...";
  const charsToShow = maxLength - ellipsis.length;
  const headLength = Math.ceil(charsToShow / 2);
  const tailLength = Math.floor(charsToShow / 2);

  return `${text.slice(0, headLength)}${ellipsis}${text.slice(text.length - tailLength)}`;
}

/**
 * Truncates `text` at the end with an ellipsis.
 *
 * @example
 * truncateEnd("very long name here", 13)
 * // → "very long na..."
 */
export function truncateEnd(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  if (maxLength < 4) return text.slice(0, maxLength);

  return `${text.slice(0, maxLength - 3)}...`;
}

// ---------------------------------------------------------------------------
// useTooltipOnOverflow hook
// ---------------------------------------------------------------------------

/**
 * Hook that detects whether a text element is overflowing and provides
 * tooltip state accordingly. The tooltip is only shown when the element's
 * scrollWidth exceeds its clientWidth.
 *
 * @example
 * ```tsx
 * function Name({ text }: { text: string }) {
 *   const { ref, showTooltip, tooltipProps } = useTooltipOnOverflow();
 *   return (
 *     <span ref={ref} className="truncate" {...tooltipProps}>
 *       {text}
 *     </span>
 *   );
 * }
 * ```
 */
export function useTooltipOnOverflow<T extends HTMLElement = HTMLElement>(): {
  ref: React.RefObject<T | null>;
  isOverflowing: boolean;
  showTooltip: boolean;
  tooltipProps: {
    title: string | undefined;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
} {
  const ref = useRef<T | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const checkOverflow = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setIsOverflowing(el.scrollWidth > el.clientWidth);
  }, []);

  useEffect(() => {
    checkOverflow();

    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);
    return () => observer.disconnect();
  }, [checkOverflow]);

  const onMouseEnter = useCallback(() => setIsHovering(true), []);
  const onMouseLeave = useCallback(() => setIsHovering(false), []);

  const showTooltip = isOverflowing && isHovering;

  return {
    ref,
    isOverflowing,
    showTooltip,
    tooltipProps: {
      title: isOverflowing ? ref.current?.textContent ?? undefined : undefined,
      onMouseEnter,
      onMouseLeave,
    },
  };
}

// ---------------------------------------------------------------------------
// TruncatedText component
// ---------------------------------------------------------------------------

/**
 * Renders text with CSS truncation and adds a native tooltip when the
 * content overflows.
 */
export function TruncatedText({
  children,
  className,
  as: Component = "span",
}: {
  children: ReactNode;
  className?: string;
  as?: "span" | "p" | "div";
}) {
  const { ref, tooltipProps } = useTooltipOnOverflow<HTMLElement>();

  return React.createElement(
    Component,
    {
      ref,
      className: cn("truncate", className),
      ...tooltipProps,
    },
    children
  );
}

// ---------------------------------------------------------------------------
// ModelName component
// ---------------------------------------------------------------------------

/**
 * Displays a model identifier (e.g. "anthropic/claude-3-5-sonnet-20241022")
 * with middle-truncation and a hover tooltip showing the full name.
 */
export function ModelName({
  name,
  maxLength = 30,
  className,
}: {
  name: string;
  maxLength?: number;
  className?: string;
}) {
  const truncated = truncateMiddle(name, maxLength);
  const isTruncated = truncated !== name;

  return React.createElement(
    "span",
    {
      className: cn(
        "font-mono text-sm whitespace-nowrap",
        className
      ),
      title: isTruncated ? name : undefined,
    },
    truncated
  );
}
