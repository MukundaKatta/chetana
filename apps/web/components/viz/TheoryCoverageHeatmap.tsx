"use client";

/**
 * Heatmap visualization for theory coverage (Issue #372).
 * Matrix: theories as rows, indicators as columns.
 * Color intensity by probe count per cell.
 * Click drill-down, highlight gaps, filter by evidence type.
 */

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { Theory, EvidenceType, IndicatorId } from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface HeatmapCell {
  theory: Theory;
  indicatorId: string;
  probeCount: number;
  averageScore: number;
  scores: number[];
  evidenceTypes: EvidenceType[];
}

export interface TheoryCoverageHeatmapProps {
  /** Heatmap cell data. */
  cells: HeatmapCell[];
  /** Available theories. */
  theories?: Theory[];
  /** Available indicator IDs. */
  indicators?: string[];
  /** Callback when a cell is clicked. */
  onCellClick?: (cell: HeatmapCell) => void;
  /** Whether to highlight coverage gaps (default true). */
  highlightGaps?: boolean;
  /** Minimum probe count to not be considered a gap (default 1). */
  gapThreshold?: number;
  /** Custom class name. */
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const DEFAULT_THEORIES: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];

const THEORY_LABELS: Record<Theory, string> = {
  gwt: "GWT",
  iit: "IIT",
  hot: "HOT",
  rpt: "RPT",
  pp: "PP",
  ast: "AST",
};

const THEORY_FULL_NAMES: Record<Theory, string> = {
  gwt: "Global Workspace Theory",
  iit: "Integrated Information Theory",
  hot: "Higher-Order Theories",
  rpt: "Recurrent Processing Theory",
  pp: "Predictive Processing",
  ast: "Attention Schema Theory",
};

const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  behavioral: "Behavioral",
  structural: "Structural",
  "self-report": "Self-Report",
};

/* ------------------------------------------------------------------ */
/*  Color scale                                                       */
/* ------------------------------------------------------------------ */

function getHeatColor(value: number, maxValue: number): string {
  if (maxValue === 0 || value === 0) return "#f3f4f6"; // gray-100

  const intensity = Math.min(1, value / maxValue);

  // Blue scale: light to dark
  if (intensity < 0.25) return "#dbeafe"; // blue-100
  if (intensity < 0.5) return "#93c5fd";  // blue-300
  if (intensity < 0.75) return "#3b82f6"; // blue-500
  return "#1d4ed8";                        // blue-700
}

function getScoreColor(score: number): string {
  if (score >= 0.8) return "#22c55e"; // green
  if (score >= 0.6) return "#84cc16"; // lime
  if (score >= 0.4) return "#eab308"; // yellow
  if (score >= 0.2) return "#f97316"; // orange
  return "#ef4444";                    // red
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function TheoryCoverageHeatmap({
  cells,
  theories = DEFAULT_THEORIES,
  indicators: indicatorsProp,
  onCellClick,
  highlightGaps = true,
  gapThreshold = 1,
  className,
}: TheoryCoverageHeatmapProps) {
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);
  const [evidenceFilter, setEvidenceFilter] = useState<EvidenceType | "all">(
    "all"
  );
  const [colorMode, setColorMode] = useState<"count" | "score">("count");

  // Derive indicators from data if not provided
  const indicators = useMemo(() => {
    if (indicatorsProp) return indicatorsProp;
    const ids = new Set<string>();
    for (const cell of cells) ids.add(cell.indicatorId);
    return Array.from(ids).sort();
  }, [indicatorsProp, cells]);

  // Build cell lookup map
  const cellMap = useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    for (const cell of cells) {
      map.set(`${cell.theory}:${cell.indicatorId}`, cell);
    }
    return map;
  }, [cells]);

  // Filter cells by evidence type
  const filteredCells = useMemo(() => {
    if (evidenceFilter === "all") return cells;
    return cells.filter((c) => c.evidenceTypes.includes(evidenceFilter));
  }, [cells, evidenceFilter]);

  // Max probe count for color scaling
  const maxProbeCount = useMemo(
    () => Math.max(1, ...filteredCells.map((c) => c.probeCount)),
    [filteredCells]
  );

  // Gap analysis
  const gaps = useMemo(() => {
    const gapCells: Array<{ theory: Theory; indicatorId: string }> = [];
    for (const theory of theories) {
      for (const indicator of indicators) {
        const cell = cellMap.get(`${theory}:${indicator}`);
        if (!cell || cell.probeCount < gapThreshold) {
          gapCells.push({ theory, indicatorId: indicator });
        }
      }
    }
    return gapCells;
  }, [theories, indicators, cellMap, gapThreshold]);

  // Coverage stats
  const stats = useMemo(() => {
    const totalCells = theories.length * indicators.length;
    const coveredCells = cells.filter((c) => c.probeCount >= gapThreshold).length;
    const coverage = totalCells > 0 ? coveredCells / totalCells : 0;
    const totalProbes = cells.reduce((s, c) => s + c.probeCount, 0);
    const avgScore =
      cells.length > 0
        ? cells.reduce((s, c) => s + c.averageScore, 0) / cells.length
        : 0;
    return {
      totalCells,
      coveredCells,
      coverage,
      gapCount: gaps.length,
      totalProbes,
      avgScore,
    };
  }, [theories, indicators, cells, gaps, gapThreshold]);

  const handleCellClick = useCallback(
    (cell: HeatmapCell | null) => {
      setSelectedCell(cell);
      if (cell) onCellClick?.(cell);
    },
    [onCellClick]
  );

  return (
    <div className={cn("rounded-lg border bg-white shadow-sm", className)}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
        <h3 className="text-lg font-semibold">Theory Coverage Heatmap</h3>
        <div className="flex items-center gap-3 text-sm">
          {/* Evidence type filter */}
          <select
            value={evidenceFilter}
            onChange={(e) =>
              setEvidenceFilter(e.target.value as EvidenceType | "all")
            }
            className="rounded border px-2 py-1 text-sm"
          >
            <option value="all">All Evidence</option>
            {(
              Object.entries(EVIDENCE_TYPE_LABELS) as Array<
                [EvidenceType, string]
              >
            ).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {/* Color mode toggle */}
          <div className="flex rounded border">
            <button
              onClick={() => setColorMode("count")}
              className={cn(
                "px-2 py-1 text-xs",
                colorMode === "count"
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-50"
              )}
            >
              Count
            </button>
            <button
              onClick={() => setColorMode("score")}
              className={cn(
                "px-2 py-1 text-xs",
                colorMode === "score"
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-50"
              )}
            >
              Score
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 border-b bg-gray-50 px-4 py-2 text-xs text-gray-600">
        <span>
          Coverage:{" "}
          <strong>{(stats.coverage * 100).toFixed(0)}%</strong>
        </span>
        <span>
          Probes: <strong>{stats.totalProbes}</strong>
        </span>
        <span>
          Gaps:{" "}
          <strong className={stats.gapCount > 0 ? "text-red-600" : ""}>
            {stats.gapCount}
          </strong>
        </span>
        <span>
          Avg Score:{" "}
          <strong>{(stats.avgScore * 100).toFixed(1)}%</strong>
        </span>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto p-4">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left text-xs font-medium text-gray-500">
                Theory
              </th>
              {indicators.map((ind) => (
                <th
                  key={ind}
                  className="p-2 text-center text-xs font-medium text-gray-500"
                  style={{ writingMode: "vertical-lr", minWidth: 40 }}
                >
                  {ind}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {theories.map((theory) => (
              <tr key={theory}>
                <td
                  className="whitespace-nowrap p-2 text-xs font-semibold"
                  title={THEORY_FULL_NAMES[theory]}
                >
                  {THEORY_LABELS[theory]}
                </td>
                {indicators.map((indicator) => {
                  const key = `${theory}:${indicator}`;
                  const cell = cellMap.get(key);
                  const probeCount = cell?.probeCount ?? 0;
                  const avgScore = cell?.averageScore ?? 0;
                  const isGap =
                    highlightGaps && probeCount < gapThreshold;
                  const isHovered =
                    hoveredCell?.theory === theory &&
                    hoveredCell?.indicatorId === indicator;
                  const isSelected =
                    selectedCell?.theory === theory &&
                    selectedCell?.indicatorId === indicator;

                  const bgColor =
                    colorMode === "count"
                      ? getHeatColor(probeCount, maxProbeCount)
                      : probeCount > 0
                        ? getScoreColor(avgScore)
                        : "#f3f4f6";

                  return (
                    <td
                      key={key}
                      className={cn(
                        "relative cursor-pointer border border-white p-0 text-center transition-all",
                        isHovered && "ring-2 ring-blue-400",
                        isSelected && "ring-2 ring-blue-600",
                        isGap && "bg-red-50"
                      )}
                      style={{
                        backgroundColor: isGap
                          ? undefined
                          : bgColor,
                        minWidth: 40,
                        height: 40,
                      }}
                      onMouseEnter={() => setHoveredCell(cell ?? null)}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => handleCellClick(cell ?? null)}
                      title={
                        cell
                          ? `${indicator}: ${probeCount} probe${probeCount !== 1 ? "s" : ""}, avg ${(avgScore * 100).toFixed(1)}%`
                          : `${indicator}: No probes`
                      }
                    >
                      {probeCount > 0 && (
                        <span
                          className={cn(
                            "text-xs font-medium",
                            probeCount > maxProbeCount * 0.5
                              ? "text-white"
                              : "text-gray-700"
                          )}
                        >
                          {probeCount}
                        </span>
                      )}
                      {isGap && highlightGaps && (
                        <span className="absolute inset-0 flex items-center justify-center text-xs text-red-400">
                          {"–"}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-4 border-t px-4 py-2 text-xs text-gray-500">
        <span>{colorMode === "count" ? "Probe Count:" : "Avg Score:"}</span>
        {colorMode === "count" ? (
          <div className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: "#f3f4f6" }} />
            <span>0</span>
            <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: "#dbeafe" }} />
            <span>Low</span>
            <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: "#3b82f6" }} />
            <span>Medium</span>
            <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: "#1d4ed8" }} />
            <span>High</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: "#ef4444" }} />
            <span>0-20%</span>
            <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: "#eab308" }} />
            <span>40-60%</span>
            <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: "#22c55e" }} />
            <span>80-100%</span>
          </div>
        )}
        {highlightGaps && (
          <span className="ml-2">
            <span className="inline-block h-3 w-3 rounded bg-red-50 ring-1 ring-red-200" />{" "}
            Gap (below {gapThreshold} probe{gapThreshold !== 1 ? "s" : ""})
          </span>
        )}
      </div>

      {/* Drill-down panel */}
      {selectedCell && (
        <div className="border-t bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">
              {THEORY_LABELS[selectedCell.theory]} /{" "}
              {selectedCell.indicatorId}
            </h4>
            <button
              onClick={() => setSelectedCell(null)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Close
            </button>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Probes:</span>{" "}
              <strong>{selectedCell.probeCount}</strong>
            </div>
            <div>
              <span className="text-gray-500">Avg Score:</span>{" "}
              <strong>
                {(selectedCell.averageScore * 100).toFixed(1)}%
              </strong>
            </div>
            <div>
              <span className="text-gray-500">Evidence:</span>{" "}
              <strong>
                {[...new Set(selectedCell.evidenceTypes)].join(", ")}
              </strong>
            </div>
          </div>
          {selectedCell.scores.length > 0 && (
            <div className="mt-2">
              <span className="text-xs text-gray-500">Score distribution:</span>
              <div className="mt-1 flex gap-1">
                {selectedCell.scores.map((score, i) => (
                  <div
                    key={i}
                    className="h-6 w-4 rounded-sm"
                    style={{
                      backgroundColor: getScoreColor(score),
                    }}
                    title={`${(score * 100).toFixed(1)}%`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
