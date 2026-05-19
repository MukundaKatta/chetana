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

export type PanelDirection = "horizontal" | "vertical";

export interface PanelConfig {
  /** Unique panel identifier. */
  id: string;
  /** Panel content. */
  children: ReactNode;
  /** Initial size as a percentage (0-100). */
  defaultSize?: number;
  /** Minimum size in pixels (default 100). */
  minSize?: number;
  /** Maximum size in pixels (optional). */
  maxSize?: number;
  /** Whether the panel starts collapsed. */
  defaultCollapsed?: boolean;
  /** Header content for the panel. */
  header?: ReactNode;
  /** Additional class names. */
  className?: string;
}

export interface PanelLayoutProps {
  /** Panel configuration array. */
  panels: PanelConfig[];
  /** Layout direction (default "horizontal"). */
  direction?: PanelDirection;
  /** Divider thickness in pixels (default 6). */
  dividerSize?: number;
  /** Persistence key for localStorage (optional). */
  storageKey?: string;
  /** Additional class names for the container. */
  className?: string;
}

interface PanelState {
  /** Current size as percentage. */
  size: number;
  /** Whether the panel is collapsed. */
  collapsed: boolean;
  /** Size before collapse for restoring. */
  preCollapseSize: number;
}

interface StoredLayout {
  sizes: number[];
  collapsed: boolean[];
}

/* ------------------------------------------------------------------ */
/*  Persistence                                                       */
/* ------------------------------------------------------------------ */

function saveLayout(key: string, layout: StoredLayout): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(`panel-layout:${key}`, JSON.stringify(layout));
    }
  } catch {
    // Ignore storage errors
  }
}

function loadLayout(key: string): StoredLayout | null {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(`panel-layout:${key}`);
      if (raw) return JSON.parse(raw) as StoredLayout;
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function PanelLayout({
  panels,
  direction = "horizontal",
  dividerSize = 6,
  storageKey,
  className,
}: PanelLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    dividerIndex: number;
    startPos: number;
    startSizes: number[];
  } | null>(null);

  // Initialize panel states
  const [panelStates, setPanelStates] = useState<PanelState[]>(() => {
    const stored = storageKey ? loadLayout(storageKey) : null;

    return panels.map((panel, i) => {
      const defaultSize = panel.defaultSize ?? 100 / panels.length;
      const collapsed =
        stored?.collapsed[i] ?? panel.defaultCollapsed ?? false;
      const size = stored?.sizes[i] ?? defaultSize;

      return {
        size: collapsed ? 0 : size,
        collapsed,
        preCollapseSize: size,
      };
    });
  });

  // Persist on change
  useEffect(() => {
    if (storageKey) {
      saveLayout(storageKey, {
        sizes: panelStates.map((s) =>
          s.collapsed ? s.preCollapseSize : s.size,
        ),
        collapsed: panelStates.map((s) => s.collapsed),
      });
    }
  }, [panelStates, storageKey]);

  /* ---------------------------------------------------------------- */
  /*  Drag to resize                                                  */
  /* ---------------------------------------------------------------- */

  const handleDividerMouseDown = useCallback(
    (dividerIndex: number, e: React.MouseEvent) => {
      e.preventDefault();
      dragState.current = {
        dividerIndex,
        startPos:
          direction === "horizontal" ? e.clientX : e.clientY,
        startSizes: panelStates.map((s) => s.size),
      };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragState.current || !containerRef.current) return;

        const containerRect =
          containerRef.current.getBoundingClientRect();
        const containerSize =
          direction === "horizontal"
            ? containerRect.width
            : containerRect.height;

        const currentPos =
          direction === "horizontal" ? ev.clientX : ev.clientY;
        const delta = currentPos - dragState.current.startPos;
        const deltaPercent = (delta / containerSize) * 100;

        const idx = dragState.current.dividerIndex;
        const startSizes = dragState.current.startSizes;

        const newSizeA = startSizes[idx] + deltaPercent;
        const newSizeB = startSizes[idx + 1] - deltaPercent;

        // Enforce minimum sizes
        const minA =
          ((panels[idx]?.minSize ?? 100) / containerSize) * 100;
        const minB =
          ((panels[idx + 1]?.minSize ?? 100) / containerSize) * 100;

        if (newSizeA < minA || newSizeB < minB) return;

        // Enforce maximum sizes
        const maxA = panels[idx]?.maxSize
          ? (panels[idx].maxSize! / containerSize) * 100
          : 100;
        const maxB = panels[idx + 1]?.maxSize
          ? (panels[idx + 1].maxSize! / containerSize) * 100
          : 100;

        if (newSizeA > maxA || newSizeB > maxB) return;

        setPanelStates((prev) => {
          const next = [...prev];
          next[idx] = { ...next[idx], size: newSizeA };
          next[idx + 1] = { ...next[idx + 1], size: newSizeB };
          return next;
        });
      };

      const handleMouseUp = () => {
        dragState.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor =
        direction === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
    },
    [direction, panelStates, panels],
  );

  /* ---------------------------------------------------------------- */
  /*  Double-click collapse/expand                                    */
  /* ---------------------------------------------------------------- */

  const handleDividerDoubleClick = useCallback(
    (dividerIndex: number) => {
      setPanelStates((prev) => {
        const next = [...prev];
        const panel = next[dividerIndex + 1];

        if (panel.collapsed) {
          // Expand
          const restored = panel.preCollapseSize;
          const availableFrom = next[dividerIndex].size;
          const actualRestore = Math.min(restored, availableFrom * 0.8);

          next[dividerIndex] = {
            ...next[dividerIndex],
            size: next[dividerIndex].size - actualRestore,
          };
          next[dividerIndex + 1] = {
            ...panel,
            size: actualRestore,
            collapsed: false,
          };
        } else {
          // Collapse
          next[dividerIndex] = {
            ...next[dividerIndex],
            size: next[dividerIndex].size + panel.size,
          };
          next[dividerIndex + 1] = {
            ...panel,
            preCollapseSize: panel.size,
            size: 0,
            collapsed: true,
          };
        }
        return next;
      });
    },
    [],
  );

  /* ---------------------------------------------------------------- */
  /*  Programmatic API                                                */
  /* ---------------------------------------------------------------- */

  const collapsePanel = useCallback((panelId: string) => {
    setPanelStates((prev) => {
      const idx = panels.findIndex((p) => p.id === panelId);
      if (idx < 0 || prev[idx].collapsed) return prev;

      const next = [...prev];
      const siblingIdx = idx > 0 ? idx - 1 : idx + 1;
      if (siblingIdx >= next.length) return prev;

      next[siblingIdx] = {
        ...next[siblingIdx],
        size: next[siblingIdx].size + next[idx].size,
      };
      next[idx] = {
        ...next[idx],
        preCollapseSize: next[idx].size,
        size: 0,
        collapsed: true,
      };
      return next;
    });
  }, [panels]);

  const expandPanel = useCallback((panelId: string) => {
    setPanelStates((prev) => {
      const idx = panels.findIndex((p) => p.id === panelId);
      if (idx < 0 || !prev[idx].collapsed) return prev;

      const next = [...prev];
      const restored = next[idx].preCollapseSize;
      const siblingIdx = idx > 0 ? idx - 1 : idx + 1;
      if (siblingIdx >= next.length) return prev;

      const actualRestore = Math.min(
        restored,
        next[siblingIdx].size * 0.8,
      );
      next[siblingIdx] = {
        ...next[siblingIdx],
        size: next[siblingIdx].size - actualRestore,
      };
      next[idx] = {
        ...next[idx],
        size: actualRestore,
        collapsed: false,
      };
      return next;
    });
  }, [panels]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */

  const isHorizontal = direction === "horizontal";

  // Calculate total divider space
  const dividerCount = panels.length - 1;
  const totalDividerPx = dividerCount * dividerSize;

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex overflow-hidden",
        isHorizontal ? "flex-row" : "flex-col",
        className,
      )}
      style={{ height: "100%", width: "100%" }}
    >
      {panels.map((panel, i) => {
        const state = panelStates[i];
        const panelStyle: CSSProperties = {
          [isHorizontal ? "width" : "height"]: state.collapsed
            ? "0px"
            : `calc(${state.size}% - ${(totalDividerPx * state.size) / 100}px)`,
          overflow: "hidden",
          transition: dragState.current
            ? undefined
            : "width 0.2s ease, height 0.2s ease",
          minWidth: state.collapsed
            ? 0
            : isHorizontal
              ? panel.minSize ?? 100
              : undefined,
          minHeight: state.collapsed
            ? 0
            : !isHorizontal
              ? panel.minSize ?? 100
              : undefined,
        };

        return (
          <div key={panel.id} className="contents">
            {/* Panel */}
            <div
              className={cn(
                "flex flex-col overflow-hidden",
                state.collapsed && "invisible w-0 h-0",
                panel.className,
              )}
              style={panelStyle}
              data-panel-id={panel.id}
              data-collapsed={state.collapsed}
            >
              {panel.header && (
                <div className="flex-shrink-0 border-b px-3 py-2 text-sm font-medium">
                  {panel.header}
                </div>
              )}
              <div className="flex-1 overflow-auto">{panel.children}</div>
            </div>

            {/* Divider */}
            {i < panels.length - 1 && (
              <div
                className={cn(
                  "flex-shrink-0 bg-border hover:bg-primary/20 transition-colors",
                  isHorizontal
                    ? "cursor-col-resize"
                    : "cursor-row-resize",
                )}
                style={{
                  [isHorizontal ? "width" : "height"]: dividerSize,
                  [isHorizontal ? "height" : "width"]: "100%",
                }}
                onMouseDown={(e) => handleDividerMouseDown(i, e)}
                onDoubleClick={() => handleDividerDoubleClick(i)}
                role="separator"
                aria-orientation={isHorizontal ? "vertical" : "horizontal"}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleDividerDoubleClick(i);
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
