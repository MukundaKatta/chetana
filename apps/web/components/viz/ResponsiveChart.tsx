"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export interface ChartDimensions {
  width: number;
  height: number;
}

export interface ResponsiveChartProps {
  /** Aspect ratio as width/height (default 16/9). */
  aspectRatio?: number;
  /** Minimum height in px (default 200). */
  minHeight?: number;
  /** Maximum height in px (default 600). */
  maxHeight?: number;
  /** Debounce delay in ms for resize events (default 150). */
  debounceMs?: number;
  /** Render function receiving the computed dimensions. */
  children: (dimensions: ChartDimensions) => ReactNode;
  /** Extra className. */
  className?: string;
}

/**
 * Responsive chart wrapper (Issue #250).
 * Uses ResizeObserver to dynamically size chart children while maintaining
 * an aspect ratio and debouncing resize events.
 */
export function ResponsiveChart({
  aspectRatio = 16 / 9,
  minHeight = 200,
  maxHeight = 600,
  debounceMs = 150,
  children,
  className,
}: ResponsiveChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<ChartDimensions>({
    width: 0,
    height: 0,
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const computeHeight = useCallback(
    (width: number): number => {
      const raw = width / aspectRatio;
      return Math.max(minHeight, Math.min(maxHeight, Math.round(raw)));
    },
    [aspectRatio, minHeight, maxHeight]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = Math.round(entry.contentRect.width);
        if (width <= 0) continue;

        // Debounce the dimension update
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          const height = computeHeight(width);
          setDimensions((prev) => {
            if (prev.width === width && prev.height === height) return prev;
            return { width, height };
          });
        }, debounceMs);
      }
    });

    observer.observe(container);

    // Initial measurement
    const rect = container.getBoundingClientRect();
    if (rect.width > 0) {
      const width = Math.round(rect.width);
      const height = computeHeight(width);
      setDimensions({ width, height });
    }

    return () => {
      observer.disconnect();
      clearTimeout(timeoutRef.current);
    };
  }, [computeHeight, debounceMs]);

  return (
    <div
      ref={containerRef}
      className={cn("w-full overflow-hidden", className)}
      style={{ minHeight }}
    >
      {dimensions.width > 0 && dimensions.height > 0 && (
        <div
          style={{
            width: dimensions.width,
            height: dimensions.height,
          }}
        >
          {children(dimensions)}
        </div>
      )}
    </div>
  );
}

/**
 * Convenience hook for getting responsive dimensions from a container ref.
 */
export function useResponsiveDimensions(
  debounceMs: number = 150
): {
  ref: React.RefObject<HTMLDivElement | null>;
  dimensions: ChartDimensions;
} {
  const ref = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<ChartDimensions>({
    width: 0,
    height: 0,
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setDimensions({
            width: Math.round(entry.contentRect.width),
            height: Math.round(entry.contentRect.height),
          });
        }, debounceMs);
      }
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(timeoutRef.current);
    };
  }, [debounceMs]);

  return { ref, dimensions };
}
