"use client";

/**
 * Issue #431 - Audit comparison matrix
 *
 * Rows: audits, Columns: theories/indicators,
 * cell color intensity by score, sort by any column,
 * filter by date/model/user, export CSV/Excel.
 */

import {
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import type { Theory, IndicatorId } from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface AuditMatrixRow {
  auditId: string;
  modelName: string;
  modelProvider: string;
  userId?: string;
  userName?: string;
  completedAt: string;
  overallScore: number;
  theoryScores: Record<Theory, number>;
  indicatorScores: Record<string, number>;
}

export type MatrixColumnType = "overall" | "theory" | "indicator";

export interface MatrixColumn {
  key: string;
  label: string;
  type: MatrixColumnType;
}

export interface AuditMatrixFilter {
  dateFrom?: string;
  dateTo?: string;
  modelName?: string;
  modelProvider?: string;
  userId?: string;
  minScore?: number;
  maxScore?: number;
}

export type SortDirection = "asc" | "desc";

export interface SortState {
  column: string;
  direction: SortDirection;
}

export interface AuditMatrixProps {
  rows: AuditMatrixRow[];
  /** Columns to display (default: overall + all theories). */
  columns?: MatrixColumn[];
  /** Show indicator-level columns. */
  showIndicators?: boolean;
  /** Default sort. */
  defaultSort?: SortState;
  /** External filter. */
  filter?: AuditMatrixFilter;
  /** Called on row click. */
  onRowClick?: (row: AuditMatrixRow) => void;
  /** Called when export is requested. */
  onExport?: (format: "csv" | "excel", data: string) => void;
  /** Max rows visible (default: 50). */
  maxRows?: number;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const THEORIES: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];

const THEORY_LABELS: Record<Theory, string> = {
  gwt: "GWT",
  iit: "IIT",
  hot: "HOT",
  rpt: "RPT",
  pp: "PP",
  ast: "AST",
};

const DEFAULT_COLUMNS: MatrixColumn[] = [
  { key: "overall", label: "Overall", type: "overall" },
  ...THEORIES.map((t) => ({ key: t, label: THEORY_LABELS[t], type: "theory" as const })),
];

const INDICATOR_COLUMNS: MatrixColumn[] = [
  { key: "GWT-1", label: "GWT-1", type: "indicator" },
  { key: "GWT-2", label: "GWT-2", type: "indicator" },
  { key: "GWT-3", label: "GWT-3", type: "indicator" },
  { key: "GWT-4", label: "GWT-4", type: "indicator" },
  { key: "HOT-1", label: "HOT-1", type: "indicator" },
  { key: "HOT-2", label: "HOT-2", type: "indicator" },
  { key: "HOT-3", label: "HOT-3", type: "indicator" },
  { key: "HOT-4", label: "HOT-4", type: "indicator" },
  { key: "RPT-1", label: "RPT-1", type: "indicator" },
  { key: "RPT-2", label: "RPT-2", type: "indicator" },
  { key: "PP-1", label: "PP-1", type: "indicator" },
  { key: "PP-2", label: "PP-2", type: "indicator" },
  { key: "AST-1", label: "AST-1", type: "indicator" },
  { key: "AGENCY-1", label: "AGENCY-1", type: "indicator" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function getCellScore(row: AuditMatrixRow, column: MatrixColumn): number | null {
  switch (column.type) {
    case "overall":
      return row.overallScore;
    case "theory":
      return row.theoryScores[column.key as Theory] ?? null;
    case "indicator":
      return row.indicatorScores[column.key] ?? null;
  }
}

function scoreToColor(score: number | null): string {
  if (score === null) return "bg-white/5";
  // Map 0-1 to color intensity
  if (score < 0.2) return "bg-red-500/20 text-red-300";
  if (score < 0.4) return "bg-orange-500/20 text-orange-300";
  if (score < 0.6) return "bg-yellow-500/20 text-yellow-300";
  if (score < 0.8) return "bg-green-500/20 text-green-300";
  return "bg-emerald-500/30 text-emerald-300";
}

function scoreToOpacity(score: number | null): number {
  if (score === null) return 0.1;
  return 0.15 + score * 0.6;
}

function applyFilter(rows: AuditMatrixRow[], filter: AuditMatrixFilter): AuditMatrixRow[] {
  return rows.filter((row) => {
    if (filter.dateFrom && row.completedAt < filter.dateFrom) return false;
    if (filter.dateTo && row.completedAt > filter.dateTo) return false;
    if (filter.modelName && !row.modelName.toLowerCase().includes(filter.modelName.toLowerCase())) return false;
    if (filter.modelProvider && row.modelProvider !== filter.modelProvider) return false;
    if (filter.userId && row.userId !== filter.userId) return false;
    if (filter.minScore !== undefined && row.overallScore < filter.minScore) return false;
    if (filter.maxScore !== undefined && row.overallScore > filter.maxScore) return false;
    return true;
  });
}

function sortRows(rows: AuditMatrixRow[], sort: SortState, columns: MatrixColumn[]): AuditMatrixRow[] {
  const column = columns.find((c) => c.key === sort.column);

  return [...rows].sort((a, b) => {
    let valA: number | string;
    let valB: number | string;

    if (sort.column === "modelName") {
      valA = a.modelName;
      valB = b.modelName;
    } else if (sort.column === "completedAt") {
      valA = a.completedAt;
      valB = b.completedAt;
    } else if (column) {
      valA = getCellScore(a, column) ?? -1;
      valB = getCellScore(b, column) ?? -1;
    } else {
      return 0;
    }

    const cmp = valA < valB ? -1 : valA > valB ? 1 : 0;
    return sort.direction === "asc" ? cmp : -cmp;
  });
}

/* ------------------------------------------------------------------ */
/*  Export                                                            */
/* ------------------------------------------------------------------ */

export function exportToCsv(rows: AuditMatrixRow[], columns: MatrixColumn[]): string {
  const headers = ["Audit ID", "Model", "Provider", "Completed At", ...columns.map((c) => c.label)];
  const csvRows = [headers.join(",")];

  for (const row of rows) {
    const values = [
      `"${row.auditId}"`,
      `"${row.modelName}"`,
      `"${row.modelProvider}"`,
      `"${row.completedAt}"`,
      ...columns.map((col) => {
        const score = getCellScore(row, col);
        return score !== null ? score.toFixed(4) : "";
      }),
    ];
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}

export function exportToTsv(rows: AuditMatrixRow[], columns: MatrixColumn[]): string {
  const headers = ["Audit ID", "Model", "Provider", "Completed At", ...columns.map((c) => c.label)];
  const tsvRows = [headers.join("\t")];

  for (const row of rows) {
    const values = [
      row.auditId,
      row.modelName,
      row.modelProvider,
      row.completedAt,
      ...columns.map((col) => {
        const score = getCellScore(row, col);
        return score !== null ? score.toFixed(4) : "";
      }),
    ];
    tsvRows.push(values.join("\t"));
  }

  return tsvRows.join("\n");
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function AuditMatrix({
  rows,
  columns: propColumns,
  showIndicators = false,
  defaultSort = { column: "completedAt", direction: "desc" },
  filter = {},
  onRowClick,
  onExport,
  maxRows = 50,
  className,
}: AuditMatrixProps) {
  const [sort, setSort] = useState<SortState>(defaultSort);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  const columns = useMemo(() => {
    const cols = propColumns ?? DEFAULT_COLUMNS;
    if (showIndicators) return [...cols, ...INDICATOR_COLUMNS];
    return cols;
  }, [propColumns, showIndicators]);

  const filteredRows = useMemo(() => applyFilter(rows, filter), [rows, filter]);
  const sortedRows = useMemo(() => sortRows(filteredRows, sort, columns), [filteredRows, sort, columns]);
  const displayRows = useMemo(() => sortedRows.slice(0, maxRows), [sortedRows, maxRows]);

  const handleSort = useCallback(
    (columnKey: string) => {
      setSort((prev) => ({
        column: columnKey,
        direction: prev.column === columnKey && prev.direction === "asc" ? "desc" : "asc",
      }));
    },
    [],
  );

  const handleExport = useCallback(
    (format: "csv" | "excel") => {
      const data = format === "csv" ? exportToCsv(sortedRows, columns) : exportToTsv(sortedRows, columns);
      onExport?.(format, data);

      // Also trigger download
      const blob = new Blob([data], { type: format === "csv" ? "text/csv" : "text/tab-separated-values" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-matrix.${format === "csv" ? "csv" : "tsv"}`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [sortedRows, columns, onExport],
  );

  const SortIcon = ({ columnKey }: { columnKey: string }): ReactNode => {
    if (sort.column !== columnKey) {
      return <span className="text-white/20 ml-1">&#8597;</span>;
    }
    return (
      <span className="text-white/60 ml-1">
        {sort.direction === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  return (
    <div className={cn("rounded-lg border border-white/10 bg-white/5 overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <div className="text-sm text-white/60">
          {filteredRows.length} audit{filteredRows.length !== 1 ? "s" : ""}
          {filteredRows.length > maxRows && ` (showing ${maxRows})`}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleExport("csv")}
            className="text-xs text-white/50 hover:text-white/80 px-2 py-1 rounded hover:bg-white/10 transition-colors"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => handleExport("excel")}
            className="text-xs text-white/50 hover:text-white/80 px-2 py-1 rounded hover:bg-white/10 transition-colors"
          >
            Export Excel
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/10">
              {/* Frozen columns */}
              <th
                className="sticky left-0 z-10 bg-gray-900 px-3 py-2 text-left font-medium text-white/60 cursor-pointer hover:text-white/80 min-w-[120px]"
                onClick={() => handleSort("modelName")}
              >
                Model
                <SortIcon columnKey="modelName" />
              </th>
              <th
                className="sticky left-[120px] z-10 bg-gray-900 px-3 py-2 text-left font-medium text-white/60 cursor-pointer hover:text-white/80 min-w-[100px]"
                onClick={() => handleSort("completedAt")}
              >
                Date
                <SortIcon columnKey="completedAt" />
              </th>

              {/* Score columns */}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-2 py-2 text-center font-medium text-white/60 cursor-pointer hover:text-white/80 min-w-[60px]"
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  <SortIcon columnKey={col.key} />
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {displayRows.map((row, rowIdx) => (
              <tr
                key={row.auditId}
                className={cn(
                  "border-b border-white/5 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-white/5",
                )}
                onClick={() => onRowClick?.(row)}
              >
                {/* Frozen model name */}
                <td className="sticky left-0 z-10 bg-gray-900 px-3 py-2 text-white/80 font-medium truncate max-w-[120px]">
                  {row.modelName}
                </td>
                <td className="sticky left-[120px] z-10 bg-gray-900 px-3 py-2 text-white/50 tabular-nums">
                  {new Date(row.completedAt).toLocaleDateString()}
                </td>

                {/* Score cells */}
                {columns.map((col, colIdx) => {
                  const score = getCellScore(row, col);
                  const isHovered =
                    hoveredCell?.row === rowIdx && hoveredCell?.col === colIdx;

                  return (
                    <td
                      key={col.key}
                      className={cn(
                        "px-2 py-2 text-center tabular-nums relative",
                        scoreToColor(score),
                        isHovered && "ring-1 ring-white/40",
                      )}
                      style={{ opacity: score !== null ? undefined : 0.3 }}
                      onMouseEnter={() => setHoveredCell({ row: rowIdx, col: colIdx })}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      {/* Color intensity background */}
                      {score !== null && (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            backgroundColor:
                              score >= 0.5
                                ? `rgba(52, 211, 153, ${scoreToOpacity(score)})`
                                : `rgba(248, 113, 113, ${scoreToOpacity(1 - score)})`,
                          }}
                        />
                      )}
                      <span className="relative z-[1]">
                        {score !== null ? (score * 100).toFixed(0) : "--"}
                      </span>

                      {/* Hover tooltip */}
                      {isHovered && score !== null && (
                        <div className="absolute z-20 bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 border border-white/20 rounded px-2 py-1 text-[10px] text-white whitespace-nowrap shadow-lg">
                          {col.label}: {(score * 100).toFixed(1)}%
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {displayRows.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-white/40">
            No audits match the current filters
          </div>
        )}
      </div>
    </div>
  );
}
