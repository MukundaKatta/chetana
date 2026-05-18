"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface TooltipDataPoint {
  label: string;
  value: string | number;
  color?: string;
}

export interface ChartTooltipProps {
  /** Data points to display in the tooltip. */
  data: TooltipDataPoint[];
  /** Title shown at the top of the tooltip. */
  title?: string;
  /** Whether the tooltip is visible. */
  visible: boolean;
  /** X position relative to the chart container. */
  x: number;
  /** Y position relative to the chart container. */
  y: number;
  /** Whether the tooltip is pinned (clicked). */
  pinned?: boolean;
  /** Callback when the user pins/unpins. */
  onPinChange?: (pinned: boolean) => void;
  /** Extra className. */
  className?: string;
}

/**
 * Enhanced chart tooltip with cursor following, pin-on-click, and mobile support (Issue #278).
 */
export function ChartTooltip({
  data,
  title,
  visible,
  x,
  y,
  pinned = false,
  onPinChange,
  className,
}: ChartTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 12, y: -12 });

  // Adjust offset if tooltip would overflow the container
  useEffect(() => {
    if (!tooltipRef.current || !visible) return;

    const rect = tooltipRef.current.getBoundingClientRect();
    const parentRect = tooltipRef.current.parentElement?.getBoundingClientRect();
    if (!parentRect) return;

    let newOffsetX = 12;
    let newOffsetY = -12;

    // Flip horizontally if overflowing right
    if (x + rect.width + 12 > parentRect.width) {
      newOffsetX = -(rect.width + 12);
    }

    // Flip vertically if overflowing top
    if (y - rect.height - 12 < 0) {
      newOffsetY = 12;
    }

    setOffset({ x: newOffsetX, y: newOffsetY });
  }, [x, y, visible, data]);

  if (!visible || data.length === 0) return null;

  return (
    <div
      ref={tooltipRef}
      role="tooltip"
      className={cn(
        "pointer-events-none absolute z-30 min-w-[140px] rounded-lg border border-white/15 bg-gray-900/95 px-3 py-2.5 shadow-2xl backdrop-blur-sm transition-opacity duration-100",
        pinned && "pointer-events-auto ring-1 ring-violet-500/30",
        className
      )}
      style={{
        left: `${x + offset.x}px`,
        top: `${y + offset.y}px`,
        opacity: visible ? 1 : 0,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onPinChange?.(!pinned);
      }}
    >
      {title && (
        <p className="mb-1.5 text-[10px] font-semibold text-white/60">
          {title}
        </p>
      )}
      <div className="space-y-1">
        {data.map((point, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-xs text-white/50">
              {point.color && (
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: point.color }}
                />
              )}
              {point.label}
            </span>
            <span className="text-xs font-semibold tabular-nums text-white">
              {typeof point.value === "number"
                ? point.value.toFixed(2)
                : point.value}
            </span>
          </div>
        ))}
      </div>
      {pinned && (
        <p className="mt-2 text-[9px] text-white/25">Click to unpin</p>
      )}
    </div>
  );
}

/**
 * Hook for managing tooltip state including position tracking and pin behavior.
 */
export function useChartTooltip() {
  const [tooltipState, setTooltipState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    data: TooltipDataPoint[];
    title?: string;
    pinned: boolean;
  }>({
    visible: false,
    x: 0,
    y: 0,
    data: [],
    title: undefined,
    pinned: false,
  });

  const containerRef = useRef<HTMLDivElement>(null);

  const show = useCallback(
    (x: number, y: number, data: TooltipDataPoint[], title?: string) => {
      if (tooltipState.pinned) return;
      setTooltipState((prev) => ({
        ...prev,
        visible: true,
        x,
        y,
        data,
        title,
      }));
    },
    [tooltipState.pinned]
  );

  const hide = useCallback(() => {
    if (tooltipState.pinned) return;
    setTooltipState((prev) => ({ ...prev, visible: false }));
  }, [tooltipState.pinned]);

  const pin = useCallback(() => {
    setTooltipState((prev) => ({ ...prev, pinned: true }));
  }, []);

  const unpin = useCallback(() => {
    setTooltipState((prev) => ({ ...prev, pinned: false, visible: false }));
  }, []);

  const togglePin = useCallback((pinned: boolean) => {
    if (pinned) {
      setTooltipState((prev) => ({ ...prev, pinned: true }));
    } else {
      setTooltipState((prev) => ({ ...prev, pinned: false, visible: false }));
    }
  }, []);

  // Handle touch events for mobile tap-to-show
  const handleTouch = useCallback(
    (x: number, y: number, data: TooltipDataPoint[], title?: string) => {
      setTooltipState((prev) => {
        if (prev.pinned) {
          return { ...prev, pinned: false, visible: false };
        }
        return { visible: true, x, y, data, title, pinned: true };
      });
    },
    []
  );

  return {
    ...tooltipState,
    containerRef,
    show,
    hide,
    pin,
    unpin,
    togglePin,
    handleTouch,
  };
}
