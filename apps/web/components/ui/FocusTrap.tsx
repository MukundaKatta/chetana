"use client";

import { useEffect, useRef, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(", ");

interface FocusTrapProps {
  /** Whether the focus trap is active */
  active?: boolean;
  /** Called when the user presses Escape */
  onEscape?: () => void;
  /** Whether pressing Escape should close/deactivate. Defaults to true. */
  escapeDeactivates?: boolean;
  /** Whether to prevent background scrolling. Defaults to true. */
  preventScroll?: boolean;
  /** Whether to return focus to the previously focused element on unmount. Defaults to true. */
  returnFocusOnDeactivate?: boolean;
  /** Optional initial focus target selector within the container */
  initialFocus?: string;
  children: ReactNode;
  className?: string;
}

export function FocusTrap({
  active = true,
  onEscape,
  escapeDeactivates = true,
  preventScroll = true,
  returnFocusOnDeactivate = true,
  initialFocus,
  children,
  className,
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter(
      (el) => !el.hasAttribute("disabled") && el.offsetParent !== null
    );
  }, []);

  // Store previously focused element and set initial focus
  useEffect(() => {
    if (!active) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    // Set initial focus
    const container = containerRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      if (initialFocus) {
        const target = container.querySelector<HTMLElement>(initialFocus);
        if (target) {
          target.focus();
          return;
        }
      }

      // Focus the first focusable element, or the container itself
      const focusable = getFocusableElements();
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        container.focus();
      }
    });

    return () => {
      if (returnFocusOnDeactivate && previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, [active, initialFocus, getFocusableElements, returnFocusOnDeactivate]);

  // Prevent background scroll
  useEffect(() => {
    if (!active || !preventScroll) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Account for scrollbar width to prevent layout shift
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [active, preventScroll]);

  // Handle Tab and Escape keys
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && escapeDeactivates) {
        e.preventDefault();
        e.stopPropagation();
        onEscape?.();
        return;
      }

      if (e.key !== "Tab") return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if focus is on first element, wrap to last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: if focus is on last element, wrap to first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [active, escapeDeactivates, onEscape, getFocusableElements]);

  // Prevent focus from leaving the container
  useEffect(() => {
    if (!active) return;

    const handleFocusIn = (e: FocusEvent) => {
      const container = containerRef.current;
      if (!container) return;

      if (!container.contains(e.target as Node)) {
        e.preventDefault();
        e.stopPropagation();
        const focusable = getFocusableElements();
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          container.focus();
        }
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    return () => document.removeEventListener("focusin", handleFocusIn);
  }, [active, getFocusableElements]);

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className={cn("outline-none", className)}
      role="dialog"
      aria-modal={active ? "true" : undefined}
    >
      {children}
    </div>
  );
}
