"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
  type CSSProperties,
} from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type PopoverPlacement =
  | "top"
  | "top-start"
  | "top-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "left"
  | "right";

export interface PopoverProps {
  /** The trigger element. */
  trigger: ReactNode;
  /** Popover content. */
  children: ReactNode;
  /** How to open: click or hover (default "click"). */
  openOn?: "click" | "hover";
  /** Preferred placement (default "bottom"). Flips if near viewport edge. */
  placement?: PopoverPlacement;
  /** Whether to show a pointing arrow (default true). */
  arrow?: boolean;
  /** Whether to trap focus when open (default true for click, false for hover). */
  focusTrap?: boolean;
  /** Controlled open state. */
  open?: boolean;
  /** Callback when open state changes. */
  onOpenChange?: (open: boolean) => void;
  /** Close delay in ms for hover mode (default 150). */
  hoverCloseDelay?: number;
  /** Extra class for the content panel. */
  contentClassName?: string;
  /** Extra class for the outer wrapper. */
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Positioning helpers                                               */
/* ------------------------------------------------------------------ */

interface Position {
  top: number;
  left: number;
  actualPlacement: PopoverPlacement;
  arrowStyle: CSSProperties;
}

function computePosition(
  triggerRect: DOMRect,
  contentRect: DOMRect,
  placement: PopoverPlacement,
  gap: number = 8
): Position {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const positions: Record<string, () => { top: number; left: number }> = {
    top: () => ({
      top: triggerRect.top - contentRect.height - gap,
      left: triggerRect.left + (triggerRect.width - contentRect.width) / 2,
    }),
    "top-start": () => ({
      top: triggerRect.top - contentRect.height - gap,
      left: triggerRect.left,
    }),
    "top-end": () => ({
      top: triggerRect.top - contentRect.height - gap,
      left: triggerRect.right - contentRect.width,
    }),
    bottom: () => ({
      top: triggerRect.bottom + gap,
      left: triggerRect.left + (triggerRect.width - contentRect.width) / 2,
    }),
    "bottom-start": () => ({
      top: triggerRect.bottom + gap,
      left: triggerRect.left,
    }),
    "bottom-end": () => ({
      top: triggerRect.bottom + gap,
      left: triggerRect.right - contentRect.width,
    }),
    left: () => ({
      top: triggerRect.top + (triggerRect.height - contentRect.height) / 2,
      left: triggerRect.left - contentRect.width - gap,
    }),
    right: () => ({
      top: triggerRect.top + (triggerRect.height - contentRect.height) / 2,
      left: triggerRect.right + gap,
    }),
  };

  // Try preferred placement, flip if out of bounds
  let actual = placement;
  let pos = positions[actual]();

  const flipMap: Record<string, string> = {
    top: "bottom",
    "top-start": "bottom-start",
    "top-end": "bottom-end",
    bottom: "top",
    "bottom-start": "top-start",
    "bottom-end": "top-end",
    left: "right",
    right: "left",
  };

  if (pos.top < 0 || pos.top + contentRect.height > vh || pos.left < 0 || pos.left + contentRect.width > vw) {
    const flipped = flipMap[actual] ?? actual;
    const flippedPos = positions[flipped]();
    if (
      flippedPos.top >= 0 &&
      flippedPos.top + contentRect.height <= vh &&
      flippedPos.left >= 0 &&
      flippedPos.left + contentRect.width <= vw
    ) {
      actual = flipped as PopoverPlacement;
      pos = flippedPos;
    }
  }

  // Clamp
  pos.left = Math.max(4, Math.min(pos.left, vw - contentRect.width - 4));
  pos.top = Math.max(4, Math.min(pos.top, vh - contentRect.height - 4));

  // Arrow
  const arrowSize = 6;
  const arrowStyle: CSSProperties = { position: "absolute", width: 0, height: 0 };

  if (actual.startsWith("bottom")) {
    arrowStyle.top = -arrowSize;
    arrowStyle.left = "50%";
    arrowStyle.transform = "translateX(-50%)";
    arrowStyle.borderLeft = `${arrowSize}px solid transparent`;
    arrowStyle.borderRight = `${arrowSize}px solid transparent`;
    arrowStyle.borderBottom = `${arrowSize}px solid rgb(31, 41, 55)`;
  } else if (actual.startsWith("top")) {
    arrowStyle.bottom = -arrowSize;
    arrowStyle.left = "50%";
    arrowStyle.transform = "translateX(-50%)";
    arrowStyle.borderLeft = `${arrowSize}px solid transparent`;
    arrowStyle.borderRight = `${arrowSize}px solid transparent`;
    arrowStyle.borderTop = `${arrowSize}px solid rgb(31, 41, 55)`;
  } else if (actual === "left") {
    arrowStyle.right = -arrowSize;
    arrowStyle.top = "50%";
    arrowStyle.transform = "translateY(-50%)";
    arrowStyle.borderTop = `${arrowSize}px solid transparent`;
    arrowStyle.borderBottom = `${arrowSize}px solid transparent`;
    arrowStyle.borderLeft = `${arrowSize}px solid rgb(31, 41, 55)`;
  } else {
    arrowStyle.left = -arrowSize;
    arrowStyle.top = "50%";
    arrowStyle.transform = "translateY(-50%)";
    arrowStyle.borderTop = `${arrowSize}px solid transparent`;
    arrowStyle.borderBottom = `${arrowSize}px solid transparent`;
    arrowStyle.borderRight = `${arrowSize}px solid rgb(31, 41, 55)`;
  }

  return { top: pos.top, left: pos.left, actualPlacement: actual, arrowStyle };
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function Popover({
  trigger,
  children,
  openOn = "click",
  placement = "bottom",
  arrow = true,
  focusTrap: focusTrapProp,
  open: controlledOpen,
  onOpenChange,
  hoverCloseDelay = 150,
  contentClassName,
  className,
}: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;

  const triggerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shouldTrapFocus = focusTrapProp ?? openOn === "click";

  const [position, setPosition] = useState<Position | null>(null);

  const setOpen = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [controlledOpen, onOpenChange]
  );

  // Position calculation
  useEffect(() => {
    if (!isOpen) return;
    const trigger = triggerRef.current;
    const content = contentRef.current;
    if (!trigger || !content) return;

    const update = () => {
      const tRect = trigger.getBoundingClientRect();
      const cRect = content.getBoundingClientRect();
      setPosition(computePosition(tRect, cRect, placement));
    };

    // Initial + on scroll/resize
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [isOpen, placement]);

  // Dismiss on outside click
  useEffect(() => {
    if (!isOpen || openOn !== "click") return;
    const handleClick = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        contentRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, openOn, setOpen]);

  // Dismiss on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, setOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !shouldTrapFocus || !contentRef.current) return;

    const content = contentRef.current;
    const focusable = content.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const current = focusable.length > 0 ? Array.from(focusable) : [];
      if (current.length === 0) return;

      const first = current[0];
      const last = current[current.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [isOpen, shouldTrapFocus]);

  // Hover handlers
  const handleMouseEnter = useCallback(() => {
    if (openOn !== "hover") return;
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setOpen(true);
  }, [openOn, setOpen]);

  const handleMouseLeave = useCallback(() => {
    if (openOn !== "hover") return;
    hoverTimerRef.current = setTimeout(() => setOpen(false), hoverCloseDelay);
  }, [openOn, setOpen, hoverCloseDelay]);

  const handleTriggerClick = useCallback(() => {
    if (openOn !== "click") return;
    setOpen(!isOpen);
  }, [openOn, isOpen, setOpen]);

  return (
    <div
      className={cn("relative inline-block", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger */}
      <div
        ref={triggerRef}
        role="button"
        tabIndex={0}
        onClick={handleTriggerClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleTriggerClick();
          }
        }}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {trigger}
      </div>

      {/* Content */}
      {isOpen && (
        <div
          ref={contentRef}
          role="dialog"
          aria-modal={shouldTrapFocus}
          className={cn(
            "fixed z-50 rounded-lg border border-white/20 bg-gray-800 p-3 shadow-xl",
            contentClassName
          )}
          style={
            position
              ? { top: position.top, left: position.left }
              : { visibility: "hidden" as const }
          }
        >
          {arrow && position && <div style={position.arrowStyle} />}
          {children}
        </div>
      )}
    </div>
  );
}
