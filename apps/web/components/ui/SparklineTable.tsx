"use client";

/**
 * Issue #477 - Sparkline table
 *
 * Table columns with embedded sparklines, sortable by trend,
 * color indicators, compact mode, export CSV with trend data.
 */

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, ArrowUpDown, Download } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface SparklineDataPoint {
  value: number;
  timestamp?: number;
  label?: string;
}

export interface SparklineColumn<T> {
  key: string;
  header: string;
  accessor: (row: T) => string | number | null;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface SparklineTrendColumn<T> {
  key: string;
  header: string;
  dataAccessor: (row: T) => SparklineDataPoint[];
  sortable?: boolean;
  /** Width of the sparkline SVG (default 120). */
  sparklineWidth?: number;
  /** Height of the sparkline SVG (default 28). */
  sparklineHeight?: number;
  className?: string;
}

export type TrendDirection = "up" | "down" | "flat";

export interface SparklineTableProps<T> {
  data: T[];
  columns: SparklineColumn<T>[];
  trendColumns: SparklineTrendColumn<T>[];
  rowKey: (row: T) => string;
  /** Compact mode reduces padding (default false). */
  compact?: boolean;
  /** Up trend color (default #34d399). */
  upColor?: string;
  /** Down trend color (default #f87171). */
  downColor?: string;
  /** Flat trend color (default #a3a3a3). */
  flatColor?: string;
  /** Enable CSV export (default true). */
  exportable?: boolean;
  /** CSV file name (default "sparkline-table"). */
  exportFilename?: string;
  className?: string;
}

type SortDirection = "asc" | "desc";

interface SortState {
  key: string;
  direction: SortDirection;
  isTrend: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function computeTrend(data: SparklineDataPoint[]): TrendDirection {
  if (data.length < 2) return "flat";
  const first = data[0].value;
  const last = data[data.length - 1].value;
  const diff = last - first;
  const threshold = Math.abs(first) * 0.02; // 2% threshold for "flat"
  if (diff > threshold) return "up";
  if (diff < -threshold) return "down";
  return "flat";
}

function computeTrendSlope(data: SparklineDataPoint[]): number {
  if (data.length < 2) return 0;
  const n = data.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i].value;
    sumXY += i * data[i].value;
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  return denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
}

function getTrendColor(
  trend: TrendDirection,
  upColor: string,
  downColor: string,
  flatColor: string
): string {
  switch (trend) {
    case "up":
      return upColor;
    case "down":
      return downColor;
    case "flat":
      return flatColor;
  }
}

/* ------------------------------------------------------------------ */
/*  Sparkline SVG                                                     */
/* ------------------------------------------------------------------ */

function SparklineSVG({
  data,
  width,
  height,
  color,
}: {
  data: SparklineDataPoint[];
  width: number;
  height: number;
  color: string;
}) {
  if (data.length === 0) return <svg width={width} height={height} />;

  const padding = 2;
  const effectiveW = width - padding * 2;
  const effectiveH = height - padding * 2;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = padding + (i / Math.max(values.length - 1, 1)) * effectiveW;
      const y = padding + effectiveH - ((v - min) / range) * effectiveH;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="inline-block align-middle">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      {values.length > 0 && (
        <circle
          cx={padding + effectiveW}
          cy={
            padding +
            effectiveH -
            ((values[values.length - 1] - min) / range) * effectiveH
          }
          r={2}
          fill={color}
        />
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Trend indicator                                                   */
/* ------------------------------------------------------------------ */

function TrendIndicator({
  trend,
  slope,
  color,
}: {
  trend: TrendDirection;
  slope: number;
  color: string;
}) {
  const formattedSlope =
    Math.abs(slope) < 0.001 ? "0.0%" : `${(slope * 100).toFixed(1)}%`;

  return (
    <span className="inline-flex items-center gap-1 text-xs" style={{ color }}>
      {trend === "up" && <ArrowUp className="h-3 w-3" />}
      {trend === "down" && <ArrowDown className="h-3 w-3" />}
      {trend === "flat" && <span className="inline-block h-3 w-3 text-center">-</span>}
      {formattedSlope}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  CSV export                                                        */
/* ------------------------------------------------------------------ */

function generateCSV<T>(
  data: T[],
  columns: SparklineColumn<T>[],
  trendColumns: SparklineTrendColumn<T>[],
  rowKey: (row: T) => string
): string {
  const headers = [
    "id",
    ...columns.map((c) => c.header),
    ...trendColumns.flatMap((tc) => [
      `${tc.header} (trend)`,
      `${tc.header} (slope)`,
      `${tc.header} (values)`,
    ]),
  ];

  const rows = data.map((row) => {
    const id = rowKey(row);
    const colValues = columns.map((c) => {
      const val = c.accessor(row);
      return val !== null && val !== undefined ? String(val) : "";
    });

    const trendValues = trendColumns.flatMap((tc) => {
      const points = tc.dataAccessor(row);
      const trend = computeTrend(points);
      const slope = computeTrendSlope(points);
      const valuesStr = points.map((p) => p.value).join(";");
      return [trend, slope.toFixed(6), valuesStr];
    });

    return [id, ...colValues, ...trendValues]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
  });

  return [headers.map((h) => `"${h}"`).join(","), ...rows].join("\n");
}

function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/*  SparklineTable component                                          */
/* ------------------------------------------------------------------ */

export function SparklineTable<T>({
  data,
  columns,
  trendColumns,
  rowKey,
  compact = false,
  upColor = "#34d399",
  downColor = "#f87171",
  flatColor = "#a3a3a3",
  exportable = true,
  exportFilename = "sparkline-table",
  className,
}: SparklineTableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(null);

  const handleSort = useCallback(
    (key: string, isTrend: boolean) => {
      setSort((prev) => {
        if (prev?.key === key) {
          return prev.direction === "asc"
            ? { key, direction: "desc", isTrend }
            : null;
        }
        return { key, direction: "asc", isTrend };
      });
    },
    []
  );

  const sortedData = useMemo(() => {
    if (!sort) return data;

    const copy = [...data];
    copy.sort((a, b) => {
      let comparison = 0;

      if (sort.isTrend) {
        const tc = trendColumns.find((c) => c.key === sort.key);
        if (tc) {
          const slopeA = computeTrendSlope(tc.dataAccessor(a));
          const slopeB = computeTrendSlope(tc.dataAccessor(b));
          comparison = slopeA - slopeB;
        }
      } else {
        const col = columns.find((c) => c.key === sort.key);
        if (col) {
          const valA = col.accessor(a);
          const valB = col.accessor(b);
          if (valA === null || valA === undefined) comparison = -1;
          else if (valB === null || valB === undefined) comparison = 1;
          else if (typeof valA === "number" && typeof valB === "number")
            comparison = valA - valB;
          else comparison = String(valA).localeCompare(String(valB));
        }
      }

      return sort.direction === "asc" ? comparison : -comparison;
    });

    return copy;
  }, [data, sort, columns, trendColumns]);

  const handleExport = useCallback(() => {
    const csv = generateCSV(data, columns, trendColumns, rowKey);
    downloadCSV(csv, exportFilename);
  }, [data, columns, trendColumns, rowKey, exportFilename]);

  const cellPadding = compact ? "px-2 py-1" : "px-4 py-2";
  const textSize = compact ? "text-xs" : "text-sm";

  return (
    <div className={cn("w-full", className)}>
      {exportable && (
        <div className="mb-2 flex justify-end">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    cellPadding,
                    textSize,
                    "text-left font-medium text-neutral-600 dark:text-neutral-300",
                    col.sortable !== false && "cursor-pointer select-none hover:text-neutral-900 dark:hover:text-white",
                    col.className
                  )}
                  onClick={() =>
                    col.sortable !== false && handleSort(col.key, false)
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable !== false && (
                      <SortIcon sortKey={col.key} sort={sort} />
                    )}
                  </span>
                </th>
              ))}
              {trendColumns.map((tc) => (
                <th
                  key={tc.key}
                  className={cn(
                    cellPadding,
                    textSize,
                    "text-left font-medium text-neutral-600 dark:text-neutral-300",
                    tc.sortable !== false && "cursor-pointer select-none hover:text-neutral-900 dark:hover:text-white",
                    tc.className
                  )}
                  onClick={() =>
                    tc.sortable !== false && handleSort(tc.key, true)
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    {tc.header}
                    {tc.sortable !== false && (
                      <SortIcon sortKey={tc.key} sort={sort} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row) => {
              const key = rowKey(row);
              return (
                <tr
                  key={key}
                  className="border-b border-neutral-100 transition-colors hover:bg-neutral-50/50 dark:border-neutral-800 dark:hover:bg-neutral-800/30"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        cellPadding,
                        textSize,
                        "text-neutral-800 dark:text-neutral-200",
                        col.className
                      )}
                    >
                      {col.render
                        ? col.render(row)
                        : String(col.accessor(row) ?? "")}
                    </td>
                  ))}
                  {trendColumns.map((tc) => {
                    const points = tc.dataAccessor(row);
                    const trend = computeTrend(points);
                    const slope = computeTrendSlope(points);
                    const color = getTrendColor(
                      trend,
                      upColor,
                      downColor,
                      flatColor
                    );
                    const w = tc.sparklineWidth ?? 120;
                    const h = tc.sparklineHeight ?? 28;

                    return (
                      <td
                        key={tc.key}
                        className={cn(cellPadding, tc.className)}
                      >
                        <div className="flex items-center gap-2">
                          <SparklineSVG
                            data={points}
                            width={w}
                            height={h}
                            color={color}
                          />
                          <TrendIndicator
                            trend={trend}
                            slope={slope}
                            color={color}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {sortedData.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + trendColumns.length}
                  className={cn(
                    cellPadding,
                    textSize,
                    "text-center text-neutral-400 dark:text-neutral-500"
                  )}
                >
                  No data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sort icon                                                         */
/* ------------------------------------------------------------------ */

function SortIcon({
  sortKey,
  sort,
}: {
  sortKey: string;
  sort: SortState | null;
}) {
  if (!sort || sort.key !== sortKey) {
    return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  }
  return sort.direction === "asc" ? (
    <ArrowUp className="h-3 w-3" />
  ) : (
    <ArrowDown className="h-3 w-3" />
  );
}
