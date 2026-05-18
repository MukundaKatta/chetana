"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  /** Unique key for the column, should match a key of T or be a custom id */
  key: string;
  /** Display header label */
  header: string;
  /** Accessor function to get the cell value for sorting / display */
  accessor: (row: T) => string | number | boolean | null | undefined;
  /** Optional custom render function for the cell */
  render?: (row: T) => React.ReactNode;
  /** Whether this column is sortable. Defaults to true. */
  sortable?: boolean;
  /** Custom class for the column header / cells */
  className?: string;
}

type SortDirection = "asc" | "desc";

interface SortState {
  key: string;
  direction: SortDirection;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  /** Available page sizes. Defaults to [10, 25, 50]. */
  pageSizes?: number[];
  /** Initial page size. Defaults to first value in pageSizes. */
  defaultPageSize?: number;
  /** Unique key extractor for each row */
  rowKey: (row: T) => string | number;
  /** Optional empty state message */
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  pageSizes = [10, 25, 50],
  defaultPageSize,
  rowKey,
  emptyMessage = "No data available.",
  className,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize ?? pageSizes[0]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return data;

    return [...data].sort((a, b) => {
      const aVal = col.accessor(a);
      const bVal = col.accessor(b);
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let cmp: number;
      if (typeof aVal === "number" && typeof bVal === "number") {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal));
      }
      return sort.direction === "asc" ? cmp : -cmp;
    });
  }, [data, sort, columns]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = currentPage * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Reset page when data/sort/pageSize changes
  useMemo(() => {
    setCurrentPage(0);
  }, [data.length, sort, pageSize]);

  const handleSort = useCallback(
    (key: string) => {
      setSort((prev) => {
        if (prev?.key === key) {
          return prev.direction === "asc"
            ? { key, direction: "desc" }
            : null;
        }
        return { key, direction: "asc" };
      });
    },
    []
  );

  const handlePageSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setPageSize(Number(e.target.value));
    },
    []
  );

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/40",
          className
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sort?.key !== columnKey) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-white/20" />;
    }
    return sort.direction === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-blue-400" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-blue-400" />
    );
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              {columns.map((col) => {
                const sortable = col.sortable !== false;
                return (
                  <th
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/50",
                      sortable && "cursor-pointer select-none hover:text-white/80",
                      col.className
                    )}
                    onClick={sortable ? () => handleSort(col.key) : undefined}
                    aria-sort={
                      sort?.key === col.key
                        ? sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <span className="flex items-center gap-1.5">
                      {col.header}
                      {sortable && <SortIcon columnKey={col.key} />}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginatedData.map((row) => (
              <tr
                key={rowKey(row)}
                className="transition-colors hover:bg-white/5"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn("px-4 py-3 text-white/80", col.className)}
                  >
                    {col.render
                      ? col.render(row)
                      : String(col.accessor(row) ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between text-sm text-white/50">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-white outline-none"
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <span className="mr-2">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(0)}
            disabled={currentPage === 0}
            className={cn(
              "rounded-lg p-1.5 transition-colors",
              currentPage === 0
                ? "cursor-not-allowed text-white/20"
                : "text-white/50 hover:bg-white/10 hover:text-white"
            )}
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className={cn(
              "rounded-lg p-1.5 transition-colors",
              currentPage === 0
                ? "cursor-not-allowed text-white/20"
                : "text-white/50 hover:bg-white/10 hover:text-white"
            )}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() =>
              setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
            }
            disabled={currentPage >= totalPages - 1}
            className={cn(
              "rounded-lg p-1.5 transition-colors",
              currentPage >= totalPages - 1
                ? "cursor-not-allowed text-white/20"
                : "text-white/50 hover:bg-white/10 hover:text-white"
            )}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages - 1)}
            disabled={currentPage >= totalPages - 1}
            className={cn(
              "rounded-lg p-1.5 transition-colors",
              currentPage >= totalPages - 1
                ? "cursor-not-allowed text-white/20"
                : "text-white/50 hover:bg-white/10 hover:text-white"
            )}
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
