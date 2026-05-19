/**
 * Small multiples: grid of mini charts (one per theory), each shows
 * all models as bars, consistent y-axis, highlight selected model,
 * sortable (Issue #510).
 */

"use client";

import { useState, useMemo, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SortCriterion = "name" | "score" | "alphabetical";
export type SortDirection = "asc" | "desc";

export interface ModelScore {
  modelId: string;
  modelName: string;
  score: number;
}

export interface TheoryData {
  theory: string;
  label: string;
  scores: ModelScore[];
}

export interface SmallMultiplesProps {
  data: TheoryData[];
  /** Currently selected/highlighted model id. */
  selectedModelId?: string;
  /** Number of columns in the grid. */
  columns?: number;
  /** Height of each mini chart in px. */
  chartHeight?: number;
  /** Callback when a bar is clicked. */
  onBarClick?: (theory: string, modelId: string) => void;
  /** Callback when sort changes. */
  onSortChange?: (criterion: SortCriterion, direction: SortDirection) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Color palette for models
// ---------------------------------------------------------------------------

const MODEL_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#6366f1", // indigo
];

function getModelColor(index: number): string {
  return MODEL_COLORS[index % MODEL_COLORS.length];
}

const HIGHLIGHT_COLOR = "#facc15"; // yellow for selected

// ---------------------------------------------------------------------------
// Mini chart component
// ---------------------------------------------------------------------------

interface MiniChartProps {
  theory: TheoryData;
  globalMax: number;
  selectedModelId?: string;
  chartHeight: number;
  modelColorMap: Map<string, string>;
  onBarClick?: (theory: string, modelId: string) => void;
}

function MiniChart({
  theory,
  globalMax,
  selectedModelId,
  chartHeight,
  modelColorMap,
  onBarClick,
}: MiniChartProps): ReactNode {
  const barWidth = theory.scores.length > 0 ? Math.max(12, Math.min(40, 200 / theory.scores.length)) : 20;
  const gap = 4;
  const totalWidth = theory.scores.length * (barWidth + gap) - gap;

  return (
    <div className="rounded-md border border-gray-800 bg-gray-900 p-3">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
        {theory.label}
      </h4>

      <div className="relative" style={{ height: chartHeight }}>
        {/* Y-axis reference lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <div
            key={tick}
            className="absolute left-0 right-0 border-t border-gray-800"
            style={{ bottom: `${(tick / (globalMax || 1)) * 100}%` }}
          >
            {tick === 0.5 && (
              <span className="absolute -left-1 -translate-x-full text-[9px] text-gray-600">
                {tick.toFixed(1)}
              </span>
            )}
          </div>
        ))}

        {/* Bars */}
        <div
          className="absolute bottom-0 left-1/2 flex items-end"
          style={{
            width: totalWidth,
            height: "100%",
            transform: "translateX(-50%)",
            gap,
          }}
        >
          {theory.scores.map((ms) => {
            const heightPercent =
              globalMax > 0 ? (ms.score / globalMax) * 100 : 0;
            const isSelected = ms.modelId === selectedModelId;
            const color = isSelected
              ? HIGHLIGHT_COLOR
              : modelColorMap.get(ms.modelId) ?? "#6b7280";

            return (
              <div
                key={ms.modelId}
                className="group relative"
                style={{ width: barWidth, height: "100%" }}
              >
                <div
                  className={cn(
                    "absolute bottom-0 w-full rounded-t-sm transition-all duration-300",
                    isSelected ? "ring-1 ring-yellow-400/50" : "",
                    onBarClick ? "cursor-pointer hover:opacity-80" : ""
                  )}
                  style={{
                    height: `${heightPercent}%`,
                    backgroundColor: color,
                    minHeight: ms.score > 0 ? 2 : 0,
                  }}
                  onClick={() => onBarClick?.(theory.theory, ms.modelId)}
                />

                {/* Tooltip */}
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-1.5 py-0.5 text-[9px] text-gray-100 opacity-0 shadow transition-opacity group-hover:opacity-100">
                  {ms.modelName}: {ms.score.toFixed(3)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SmallMultiples({
  data,
  selectedModelId,
  columns = 3,
  chartHeight = 120,
  onBarClick,
  onSortChange,
  className,
}: SmallMultiplesProps): ReactNode {
  const [sortCriterion, setSortCriterion] = useState<SortCriterion>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Build consistent model -> color mapping
  const modelColorMap = useMemo(() => {
    const allModels = new Set<string>();
    for (const t of data) {
      for (const s of t.scores) allModels.add(s.modelId);
    }
    const map = new Map<string, string>();
    let idx = 0;
    for (const modelId of allModels) {
      map.set(modelId, getModelColor(idx++));
    }
    return map;
  }, [data]);

  // Consistent y-axis max across all charts
  const globalMax = useMemo(() => {
    let max = 0;
    for (const t of data) {
      for (const s of t.scores) {
        if (s.score > max) max = s.score;
      }
    }
    return Math.max(max, 1); // at least 1
  }, [data]);

  // Sort theories
  const sortedData = useMemo(() => {
    const sorted = [...data];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortCriterion) {
        case "name":
        case "alphabetical":
          cmp = a.label.localeCompare(b.label);
          break;
        case "score": {
          const avgA =
            a.scores.length > 0
              ? a.scores.reduce((s, m) => s + m.score, 0) / a.scores.length
              : 0;
          const avgB =
            b.scores.length > 0
              ? b.scores.reduce((s, m) => s + m.score, 0) / b.scores.length
              : 0;
          cmp = avgA - avgB;
          break;
        }
      }
      return sortDirection === "desc" ? -cmp : cmp;
    });
    return sorted;
  }, [data, sortCriterion, sortDirection]);

  const handleSortChange = useCallback(
    (criterion: SortCriterion) => {
      const newDir =
        criterion === sortCriterion && sortDirection === "asc" ? "desc" : "asc";
      setSortCriterion(criterion);
      setSortDirection(newDir);
      onSortChange?.(criterion, newDir);
    },
    [sortCriterion, sortDirection, onSortChange]
  );

  // Unique models for legend
  const modelList = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of data) {
      for (const s of t.scores) {
        if (!map.has(s.modelId)) map.set(s.modelId, s.modelName);
      }
    }
    return Array.from(map.entries());
  }, [data]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Sort by:</span>
          {(["name", "score"] as SortCriterion[]).map((c) => (
            <button
              key={c}
              onClick={() => handleSortChange(c)}
              className={cn(
                "rounded px-2 py-1 text-xs font-medium transition-colors",
                sortCriterion === c
                  ? "bg-gray-800 text-gray-100"
                  : "text-gray-500 hover:text-gray-300"
              )}
            >
              {c === "name" ? "Name" : "Avg Score"}
              {sortCriterion === c && (
                <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
              )}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {modelList.map(([modelId, modelName]) => (
            <span key={modelId} className="flex items-center gap-1 text-[10px] text-gray-400">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{
                  backgroundColor:
                    modelId === selectedModelId
                      ? HIGHLIGHT_COLOR
                      : modelColorMap.get(modelId) ?? "#6b7280",
                }}
              />
              {modelName}
            </span>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {sortedData.map((theory) => (
          <MiniChart
            key={theory.theory}
            theory={theory}
            globalMax={globalMax}
            selectedModelId={selectedModelId}
            chartHeight={chartHeight}
            modelColorMap={modelColorMap}
            onBarClick={onBarClick}
          />
        ))}
      </div>
    </div>
  );
}
