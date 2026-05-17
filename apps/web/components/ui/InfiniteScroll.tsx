"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfiniteScrollProps {
  /** Called when the sentinel element enters the viewport */
  onLoadMore: () => void;
  /** Whether a load is currently in progress */
  isLoading: boolean;
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Intersection Observer root margin. Defaults to "200px" to trigger before reaching the end. */
  rootMargin?: string;
  /** Intersection Observer threshold. Defaults to 0. */
  threshold?: number;
  /** Custom loading spinner element */
  loader?: ReactNode;
  /** Custom end-of-list indicator */
  endMessage?: ReactNode;
  /** The scrollable container's children (list items) */
  children: ReactNode;
  className?: string;
}

export function InfiniteScroll({
  onLoadMore,
  isLoading,
  hasMore,
  rootMargin = "200px",
  threshold = 0,
  loader,
  endMessage,
  children,
  className,
}: InfiniteScrollProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);

  // Keep the callback ref fresh without re-triggering the observer
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          onLoadMoreRef.current();
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, rootMargin, threshold]);

  return (
    <div className={cn("relative", className)}>
      {children}

      {/* Loading spinner */}
      {isLoading && (
        <div className="flex justify-center py-6" aria-live="polite">
          {loader ?? (
            <div className="flex items-center gap-2 text-sm text-white/40">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading more...</span>
            </div>
          )}
        </div>
      )}

      {/* End-of-list indicator */}
      {!hasMore && !isLoading && (
        <div className="py-6 text-center" aria-live="polite">
          {endMessage ?? (
            <p className="text-sm text-white/30">
              No more items to load.
            </p>
          )}
        </div>
      )}

      {/* Sentinel element for IntersectionObserver */}
      {hasMore && !isLoading && (
        <div
          ref={sentinelRef}
          className="h-px w-full"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

/**
 * Hook for managing infinite scroll data fetching state.
 */
export function useInfiniteScroll<T>({
  fetchFn,
  pageSize = 20,
}: {
  /** Function that fetches a page of data. Receives the current page number (0-based). */
  fetchFn: (page: number) => Promise<T[]>;
  /** Number of items per page. Used to determine if there are more items. */
  pageSize?: number;
}) {
  const pageRef = useRef(0);
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMore = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const newItems = await fetchFn(pageRef.current);
      setItems((prev) => [...prev, ...newItems]);
      setHasMore(newItems.length >= pageSize);
      pageRef.current += 1;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, pageSize, isLoading]);

  const reset = useCallback(() => {
    pageRef.current = 0;
    setItems([]);
    setHasMore(true);
    setError(null);
  }, []);

  return { items, isLoading, hasMore, error, loadMore, reset };
}

