"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";

/**
 * Pagination with automatic filter-reset (Issue #286).
 * Resets to page 1 whenever a filter value changes, and optionally syncs
 * pagination state with URL query parameters.
 */

export interface PaginationState {
  /** Current page (1-indexed). */
  page: number;
  /** Number of items per page. */
  pageSize: number;
}

export interface PaginatedFilterOptions<F> {
  /** Initial filter values. */
  initialFilters: F;
  /** Initial page size (default 20). */
  pageSize?: number;
  /** Whether to sync state with URL query params (default false). */
  syncUrl?: boolean;
  /** Filter keys that should not trigger a page reset when changed. */
  preserveFilters?: (keyof F)[];
}

export interface PaginatedFilterReturn<F> {
  /** Current filter values. */
  filters: F;
  /** Update one or more filter values. Resets to page 1 unless the key is in preserveFilters. */
  setFilters: (updates: Partial<F>) => void;
  /** Reset all filters to their initial values. */
  resetFilters: () => void;
  /** Current pagination state. */
  pagination: PaginationState;
  /** Go to a specific page (1-indexed). */
  setPage: (page: number) => void;
  /** Update the page size (resets to page 1). */
  setPageSize: (size: number) => void;
  /** Computed offset for database queries. */
  offset: number;
  /** Total pages given a total count. */
  totalPages: (totalCount: number) => number;
}

/**
 * React hook for managing paginated, filterable lists with automatic page reset.
 *
 * Usage:
 * ```tsx
 * const { filters, setFilters, pagination, setPage } = usePaginatedFilter({
 *   initialFilters: { theory: "", search: "" },
 *   pageSize: 20,
 * });
 *
 * // Changing a filter auto-resets to page 1
 * setFilters({ theory: "gwt" });
 * ```
 */
export function usePaginatedFilter<F extends Record<string, unknown>>(
  options: PaginatedFilterOptions<F>
): PaginatedFilterReturn<F> {
  const {
    initialFilters,
    pageSize: initialPageSize = 20,
    syncUrl = false,
    preserveFilters = [],
  } = options;

  const [filters, setFiltersState] = useState<F>(initialFilters);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: initialPageSize,
  });

  const preserveSet = useMemo(
    () => new Set(preserveFilters as string[]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [preserveFilters.join(",")]
  );

  // Track whether this is the initial mount for URL sync
  const isInitialMount = useRef(true);

  // Sync from URL on mount
  useEffect(() => {
    if (!syncUrl || typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const pageParam = params.get("page");
    const pageSizeParam = params.get("pageSize");

    if (pageParam || pageSizeParam) {
      setPagination((prev) => ({
        page: pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : prev.page,
        pageSize: pageSizeParam
          ? Math.max(1, parseInt(pageSizeParam, 10) || prev.pageSize)
          : prev.pageSize,
      }));
    }

    // Parse filter values from URL
    const urlFilters: Partial<F> = {};
    for (const key of Object.keys(initialFilters)) {
      const value = params.get(key);
      if (value !== null) {
        (urlFilters as Record<string, unknown>)[key] = value;
      }
    }
    if (Object.keys(urlFilters).length > 0) {
      setFiltersState((prev) => ({ ...prev, ...urlFilters }));
    }

    isInitialMount.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync to URL when state changes
  useEffect(() => {
    if (!syncUrl || typeof window === "undefined" || isInitialMount.current) return;

    const params = new URLSearchParams();
    params.set("page", String(pagination.page));
    if (pagination.pageSize !== initialPageSize) {
      params.set("pageSize", String(pagination.pageSize));
    }
    for (const [key, value] of Object.entries(filters as Record<string, unknown>)) {
      if (value !== undefined && value !== null && value !== "" && value !== initialFilters[key as keyof F]) {
        params.set(key, String(value));
      }
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [filters, pagination, syncUrl, initialPageSize, initialFilters]);

  const setFilters = useCallback(
    (updates: Partial<F>) => {
      setFiltersState((prev) => ({ ...prev, ...updates }));

      // Reset to page 1 if any non-preserved filter changed
      const shouldReset = Object.keys(updates).some(
        (key) => !preserveSet.has(key)
      );
      if (shouldReset) {
        setPagination((prev) => ({ ...prev, page: 1 }));
      }
    },
    [preserveSet]
  );

  const resetFilters = useCallback(() => {
    setFiltersState(initialFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [initialFilters]);

  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page: Math.max(1, page) }));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPagination({ page: 1, pageSize: Math.max(1, size) });
  }, []);

  const offset = (pagination.page - 1) * pagination.pageSize;

  const totalPages = useCallback(
    (totalCount: number) => Math.max(1, Math.ceil(totalCount / pagination.pageSize)),
    [pagination.pageSize]
  );

  return {
    filters,
    setFilters,
    resetFilters,
    pagination,
    setPage,
    setPageSize,
    offset,
    totalPages,
  };
}
