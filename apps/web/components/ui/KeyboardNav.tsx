"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Keyboard focus indicators and :focus-visible management (Issue #253).
 * Detects keyboard vs mouse navigation and applies appropriate focus ring styles.
 */

/**
 * Hook that detects whether the user is navigating with the keyboard.
 * Returns true after a Tab key press, false after a mouse click.
 */
export function useKeyboardNavigation(): boolean {
  const [isKeyboard, setIsKeyboard] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        setIsKeyboard(true);
      }
    };

    const handleMouseDown = () => {
      setIsKeyboard(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  return isKeyboard;
}

/**
 * Provides focus ring CSS classes based on :focus-visible.
 * Uses the brand violet color for consistency with the Chetana design system.
 */
export const focusRingClasses =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950";

/**
 * Variant that uses an inset ring (no offset) for elements with backgrounds.
 */
export const focusRingInsetClasses =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500";

/**
 * Provider that injects global focus-visible styles.
 * Adds a `.keyboard-nav` class to the body when keyboard navigation is detected.
 */
export function KeyboardNavProvider({ children }: { children: ReactNode }) {
  const isKeyboard = useKeyboardNavigation();

  useEffect(() => {
    if (isKeyboard) {
      document.body.classList.add("keyboard-nav");
    } else {
      document.body.classList.remove("keyboard-nav");
    }
  }, [isKeyboard]);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
/* Default: suppress focus outlines for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}

/* Keyboard navigation: brand color focus rings */
body.keyboard-nav :focus-visible {
  outline: 2px solid rgb(139 92 246); /* violet-500 */
  outline-offset: 2px;
  border-radius: 4px;
}

/* Ensure focus rings respect dark backgrounds */
body.keyboard-nav :focus-visible {
  box-shadow: 0 0 0 2px rgb(3 7 18), 0 0 0 4px rgb(139 92 246);
}
`,
        }}
      />
      {children}
    </>
  );
}

/**
 * Wraps an interactive element with accessible focus ring styling.
 */
export function FocusRing({
  children,
  inset = false,
  className,
}: {
  children: ReactNode;
  inset?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        inset ? focusRingInsetClasses : focusRingClasses,
        "rounded-lg",
        className
      )}
    >
      {children}
    </div>
  );
}
