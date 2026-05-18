"use client";

import { useState, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Mobile layout helpers (Issue #242).
 * Provides breakpoint hooks and responsive layout components.
 */

type Breakpoint = "sm" | "md" | "lg" | "xl" | "2xl";

const BREAKPOINTS: Record<Breakpoint, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

/**
 * Hook that returns the current breakpoint and width.
 */
export function useBreakpoint(): {
  breakpoint: Breakpoint;
  width: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
} {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);

    // Debounced resize listener
    let timeout: ReturnType<typeof setTimeout>;
    const debounced = () => {
      clearTimeout(timeout);
      timeout = setTimeout(handleResize, 100);
    };

    window.addEventListener("resize", debounced);
    return () => {
      window.removeEventListener("resize", debounced);
      clearTimeout(timeout);
    };
  }, []);

  let breakpoint: Breakpoint = "sm";
  if (width >= BREAKPOINTS["2xl"]) breakpoint = "2xl";
  else if (width >= BREAKPOINTS.xl) breakpoint = "xl";
  else if (width >= BREAKPOINTS.lg) breakpoint = "lg";
  else if (width >= BREAKPOINTS.md) breakpoint = "md";

  return {
    breakpoint,
    width,
    isMobile: width < BREAKPOINTS.md,
    isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isDesktop: width >= BREAKPOINTS.lg,
  };
}

/**
 * Stacks children vertically on mobile, renders as-is on desktop.
 */
export function MobileStack({
  children,
  gap = 4,
  className,
}: {
  children: ReactNode;
  gap?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col",
        `gap-${gap}`,
        `lg:flex-row lg:gap-${gap}`,
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Renders children in a responsive grid: 1 column on mobile, 2 on tablet, 3+ on desktop.
 */
export function DesktopGrid({
  children,
  columns = { sm: 1, md: 2, lg: 3 },
  gap = 4,
  className,
}: {
  children: ReactNode;
  columns?: { sm?: number; md?: number; lg?: number; xl?: number };
  gap?: number;
  className?: string;
}) {
  const gridCols = [
    `grid-cols-${columns.sm ?? 1}`,
    columns.md ? `md:grid-cols-${columns.md}` : "",
    columns.lg ? `lg:grid-cols-${columns.lg}` : "",
    columns.xl ? `xl:grid-cols-${columns.xl}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cn("grid", gridCols, `gap-${gap}`, className)}>
      {children}
    </div>
  );
}

/**
 * Utility classes for touch-friendly sizing.
 * Ensures minimum tap target sizes on mobile (48px as per WCAG 2.5.5).
 */
export const touchTarget = {
  /** Minimum tap target: 48x48px. */
  base: "min-h-[48px] min-w-[48px]",
  /** Comfortable tap target: 48x48px with centered content. */
  centered: "min-h-[48px] min-w-[48px] flex items-center justify-center",
  /** Apply to links and buttons for adequate padding on mobile. */
  padding: "p-3 sm:p-2",
} as const;

/**
 * Renders children only on the specified side of the breakpoint.
 */
export function ShowAbove({
  breakpoint,
  children,
  fallback,
}: {
  breakpoint: Breakpoint;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { width } = useBreakpoint();
  const threshold = BREAKPOINTS[breakpoint];

  if (width >= threshold) return <>{children}</>;
  return fallback ? <>{fallback}</> : null;
}

export function ShowBelow({
  breakpoint,
  children,
  fallback,
}: {
  breakpoint: Breakpoint;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { width } = useBreakpoint();
  const threshold = BREAKPOINTS[breakpoint];

  if (width < threshold) return <>{children}</>;
  return fallback ? <>{fallback}</> : null;
}
