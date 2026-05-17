"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface AuditFilters {
  search: string;
  dateFrom?: string;
  dateTo?: string;
  scoreMin: number;
  scoreMax: number;
  theories: string[];
  sortBy: string;
  sortOrder: "asc" | "desc";
}

const THEORY_OPTIONS = [
  { key: "gwt", label: "Global Workspace Theory", color: "text-blue-400" },
  { key: "iit", label: "Integrated Information", color: "text-purple-400" },
  { key: "hot", label: "Higher-Order Theories", color: "text-orange-400" },
  { key: "rpt", label: "Recurrent Processing", color: "text-emerald-400" },
  { key: "pp", label: "Predictive Processing", color: "text-amber-400" },
  { key: "ast", label: "Attention Schema", color: "text-pink-400" },
];

const SORT_OPTIONS = [
  { value: "date", label: "Date" },
  { value: "score", label: "Score" },
  { value: "model", label: "Model Name" },
];

const DEFAULT_FILTERS: AuditFilters = {
  search: "",
  dateFrom: undefined,
  dateTo: undefined,
  scoreMin: 0,
  scoreMax: 100,
  theories: [],
  sortBy: "date",
  sortOrder: "desc",
};

interface AuditFiltersProps {
  filters: AuditFilters;
  onChange: (filters: AuditFilters) => void;
}

export function AuditFiltersPanel({ filters, onChange }: AuditFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = useCallback(
    <K extends keyof AuditFilters>(key: K, value: AuditFilters[K]) => {
      onChange({ ...filters, [key]: value });
    },
    [filters, onChange],
  );

  const toggleTheory = useCallback(
    (theory: string) => {
      const next = filters.theories.includes(theory)
        ? filters.theories.filter((t) => t !== theory)
        : [...filters.theories, theory];
      updateFilter("theories", next);
    },
    [filters.theories, updateFilter],
  );

  const handleReset = useCallback(() => {
    onChange({ ...DEFAULT_FILTERS });
  }, [onChange]);

  const hasActiveFilters =
    filters.search !== "" ||
    filters.dateFrom !== undefined ||
    filters.dateTo !== undefined ||
    filters.scoreMin !== 0 ||
    filters.scoreMax !== 100 ||
    filters.theories.length > 0 ||
    filters.sortBy !== "date" ||
    filters.sortOrder !== "desc";

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      {/* Search + Sort row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search input */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            placeholder="Search by model name..."
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-chetana-500 focus:outline-none focus:ring-1 focus:ring-chetana-500"
          />
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-2">
          <select
            value={filters.sortBy}
            onChange={(e) => updateFilter("sortBy", e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 focus:border-chetana-500 focus:outline-none focus:ring-1 focus:ring-chetana-500"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() =>
              updateFilter(
                "sortOrder",
                filters.sortOrder === "asc" ? "desc" : "asc",
              )
            }
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
            title={filters.sortOrder === "asc" ? "Ascending" : "Descending"}
          >
            <svg
              className={cn(
                "h-4 w-4 transition-transform",
                filters.sortOrder === "asc" && "rotate-180",
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Advanced filters toggle */}
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-400 transition hover:text-gray-300"
        >
          <svg
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              showAdvanced && "rotate-180",
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
          Advanced Filters
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-medium text-red-400 transition hover:text-red-300"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Collapsible advanced section */}
      {showAdvanced && (
        <div className="mt-4 space-y-4 border-t border-white/5 pt-4">
          {/* Date range */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">
              Date Range
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.dateFrom ?? ""}
                onChange={(e) =>
                  updateFilter(
                    "dateFrom",
                    e.target.value || undefined,
                  )
                }
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 focus:border-chetana-500 focus:outline-none focus:ring-1 focus:ring-chetana-500"
              />
              <span className="text-xs text-gray-500">to</span>
              <input
                type="date"
                value={filters.dateTo ?? ""}
                onChange={(e) =>
                  updateFilter(
                    "dateTo",
                    e.target.value || undefined,
                  )
                }
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 focus:border-chetana-500 focus:outline-none focus:ring-1 focus:ring-chetana-500"
              />
            </div>
          </div>

          {/* Score range */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">
              Score Range: {filters.scoreMin}% &ndash; {filters.scoreMax}%
            </label>
            <div className="flex items-center gap-4">
              <div className="flex flex-1 items-center gap-2">
                <span className="text-xs text-gray-500">Min</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={filters.scoreMin}
                  onChange={(e) =>
                    updateFilter("scoreMin", Number(e.target.value))
                  }
                  className="flex-1 accent-chetana-500"
                />
              </div>
              <div className="flex flex-1 items-center gap-2">
                <span className="text-xs text-gray-500">Max</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={filters.scoreMax}
                  onChange={(e) =>
                    updateFilter("scoreMax", Number(e.target.value))
                  }
                  className="flex-1 accent-chetana-500"
                />
              </div>
            </div>
          </div>

          {/* Theory filter */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">
              Theories
            </label>
            <div className="flex flex-wrap gap-2">
              {THEORY_OPTIONS.map((theory) => (
                <label
                  key={theory.key}
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                    filters.theories.includes(theory.key)
                      ? "border-chetana-500/40 bg-chetana-600/10 text-chetana-400"
                      : "border-white/10 bg-white/[0.02] text-gray-400 hover:bg-white/[0.04]",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={filters.theories.includes(theory.key)}
                    onChange={() => toggleTheory(theory.key)}
                    className="sr-only"
                  />
                  <span className={theory.color}>
                    {theory.key.toUpperCase()}
                  </span>
                  <span>{theory.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
