"use client";

/**
 * Issue #418 - Paginated virtual list
 *
 * Windowed rendering (only visible items), dynamic row heights,
 * smooth scrolling with overscan, scroll-to-item API,
 * and loading placeholders for async items.
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
  type ReactNode,
  type CSSProperties,
} from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface VirtualListItem<T = unknown> {
  id: string | number;
  data: T;
  /** Override estimated height for this specific item. */
  height?: number;
}

export interface VirtualListProps<T = unknown> {
  /** Full list of items to render. */
  items: VirtualListItem<T>[];
  /** Default estimated row height (used before measurement). */
  estimatedItemHeight?: number;
  /** Number of extra items to render above/below visible area. */
  overscan?: number;
  /** Height of the scrollable container (px). */
  height: number;
  /** Width of the scrollable container. */
  width?: number | string;
  /** Render function for each item. */
  renderItem: (item: VirtualListItem<T>, index: number) => ReactNode;
  /** Render function for loading placeholders. */
  renderPlaceholder?: (index: number) => ReactNode;
  /** Total number of items (including not-yet-loaded). */
  totalCount?: number;
  /** Called when the user scrolls near the end. */
  onLoadMore?: () => void;
  /** Threshold in px from bottom to trigger onLoadMore. */
  loadMoreThreshold?: number;
  /** Whether more items are being loaded. */
  isLoading?: boolean;
  /** Smooth scrolling behavior. */
  smoothScroll?: boolean;
  className?: string;
  /** Extra styles on container. */
  style?: CSSProperties;
}

export interface VirtualListHandle {
  scrollToItem: (index: number, align?: "start" | "center" | "end") => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  getVisibleRange: () => { start: number; end: number };
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const DEFAULT_ESTIMATED_HEIGHT = 50;
const DEFAULT_OVERSCAN = 5;
const DEFAULT_LOAD_MORE_THRESHOLD = 200;

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

function VirtualListInner<T>(
  props: VirtualListProps<T>,
  ref: React.ForwardedRef<VirtualListHandle>,
) {
  const {
    items,
    estimatedItemHeight = DEFAULT_ESTIMATED_HEIGHT,
    overscan = DEFAULT_OVERSCAN,
    height,
    width = "100%",
    renderItem,
    renderPlaceholder,
    totalCount,
    onLoadMore,
    loadMoreThreshold = DEFAULT_LOAD_MORE_THRESHOLD,
    isLoading = false,
    smoothScroll = true,
    className,
    style,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const measuredHeights = useRef<Map<string | number, number>>(new Map());
  const [scrollTop, setScrollTop] = useState(0);
  const [, forceUpdate] = useState(0);

  const effectiveTotal = totalCount ?? items.length;

  /* ---- Height cache ---- */

  const getItemHeight = useCallback(
    (index: number): number => {
      if (index < items.length) {
        const item = items[index];
        const measured = measuredHeights.current.get(item.id);
        if (measured !== undefined) return measured;
        if (item.height !== undefined) return item.height;
      }
      return estimatedItemHeight;
    },
    [items, estimatedItemHeight],
  );

  /** Cumulative offsets for each item. */
  const offsets = useMemo(() => {
    const arr: number[] = new Array(effectiveTotal + 1);
    arr[0] = 0;
    for (let i = 0; i < effectiveTotal; i++) {
      arr[i + 1] = arr[i] + getItemHeight(i);
    }
    return arr;
  }, [effectiveTotal, getItemHeight]);

  const totalHeight = offsets[effectiveTotal] ?? 0;

  /* ---- Visible range ---- */

  const getVisibleRange = useCallback((): { start: number; end: number } => {
    if (effectiveTotal === 0) return { start: 0, end: 0 };

    // Binary search for start
    let lo = 0;
    let hi = effectiveTotal - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (offsets[mid + 1] <= scrollTop) lo = mid + 1;
      else hi = mid;
    }
    const start = Math.max(0, lo - overscan);

    // Find end
    const viewBottom = scrollTop + height;
    let end = lo;
    while (end < effectiveTotal && offsets[end] < viewBottom) {
      end++;
    }
    end = Math.min(effectiveTotal, end + overscan);

    return { start, end };
  }, [scrollTop, height, offsets, effectiveTotal, overscan]);

  const visibleRange = useMemo(() => getVisibleRange(), [getVisibleRange]);

  /* ---- Scroll handler ---- */

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    setScrollTop(el.scrollTop);

    // Check if near bottom for load-more
    if (onLoadMore && !isLoading) {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distanceFromBottom < loadMoreThreshold) {
        onLoadMore();
      }
    }
  }, [onLoadMore, isLoading, loadMoreThreshold]);

  /* ---- Measurement callback ---- */

  const measureRow = useCallback(
    (id: string | number, element: HTMLElement | null) => {
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const prev = measuredHeights.current.get(id);
      if (prev !== rect.height) {
        measuredHeights.current.set(id, rect.height);
        forceUpdate((n) => n + 1);
      }
    },
    [],
  );

  /* ---- Imperative API ---- */

  useImperativeHandle(ref, () => ({
    scrollToItem(index: number, align: "start" | "center" | "end" = "start") {
      const el = containerRef.current;
      if (!el || index < 0 || index >= effectiveTotal) return;

      let targetTop: number;
      const itemTop = offsets[index];
      const itemHeight = getItemHeight(index);

      switch (align) {
        case "center":
          targetTop = itemTop - height / 2 + itemHeight / 2;
          break;
        case "end":
          targetTop = itemTop - height + itemHeight;
          break;
        case "start":
        default:
          targetTop = itemTop;
          break;
      }

      el.scrollTo({
        top: Math.max(0, targetTop),
        behavior: smoothScroll ? "smooth" : "instant",
      });
    },
    scrollToTop() {
      containerRef.current?.scrollTo({
        top: 0,
        behavior: smoothScroll ? "smooth" : "instant",
      });
    },
    scrollToBottom() {
      containerRef.current?.scrollTo({
        top: totalHeight,
        behavior: smoothScroll ? "smooth" : "instant",
      });
    },
    getVisibleRange,
  }));

  /* ---- Scroll listener ---- */

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  /* ---- Render ---- */

  const visibleItems: ReactNode[] = [];

  for (let i = visibleRange.start; i < visibleRange.end; i++) {
    const top = offsets[i];

    if (i >= items.length) {
      // Placeholder for not-yet-loaded items
      visibleItems.push(
        <div
          key={`placeholder-${i}`}
          style={{
            position: "absolute",
            top,
            left: 0,
            right: 0,
            height: estimatedItemHeight,
          }}
        >
          {renderPlaceholder ? (
            renderPlaceholder(i)
          ) : (
            <div className="animate-pulse rounded bg-white/5 h-full mx-2" />
          )}
        </div>,
      );
    } else {
      const item = items[i];
      visibleItems.push(
        <div
          key={item.id}
          ref={(el) => measureRow(item.id, el)}
          style={{
            position: "absolute",
            top,
            left: 0,
            right: 0,
          }}
        >
          {renderItem(item, i)}
        </div>,
      );
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto relative", className)}
      style={{
        height,
        width,
        ...style,
      }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {visibleItems}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
        </div>
      )}
    </div>
  );
}

export const VirtualList = forwardRef(VirtualListInner) as <T>(
  props: VirtualListProps<T> & { ref?: React.Ref<VirtualListHandle> },
) => ReactNode;

export type { VirtualListItem, VirtualListProps, VirtualListHandle };
