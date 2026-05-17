"use client";

import { useState, useMemo } from "react";

interface HeatmapData {
  model: string;
  indicators: { [id: string]: number };
}

interface ComparisonHeatmapProps {
  data: HeatmapData[];
}

function getHeatColor(score: number): string {
  // Interpolate from red (0) through yellow (0.5) to green (1)
  const clamped = Math.max(0, Math.min(1, score));
  if (clamped <= 0.5) {
    // Red to yellow
    const t = clamped / 0.5;
    const r = 220;
    const g = Math.round(50 + t * 170);
    const b = Math.round(50 + t * 0);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Yellow to green
    const t = (clamped - 0.5) / 0.5;
    const r = Math.round(220 - t * 170);
    const g = Math.round(220 - t * 40);
    const b = Math.round(50 + t * 50);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

export function ComparisonHeatmap({ data }: ComparisonHeatmapProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(false);

  // Collect all unique indicator IDs
  const indicatorIds = useMemo(() => {
    const ids = new Set<string>();
    data.forEach((row) => {
      Object.keys(row.indicators).forEach((id) => ids.add(id));
    });
    return Array.from(ids).sort();
  }, [data]);

  // Sort rows by the selected column
  const sortedData = useMemo(() => {
    if (!sortColumn) return data;
    return [...data].sort((a, b) => {
      const aVal = a.indicators[sortColumn] ?? 0;
      const bVal = b.indicators[sortColumn] ?? 0;
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
  }, [data, sortColumn, sortAsc]);

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortAsc(!sortAsc);
    } else {
      setSortColumn(columnId);
      setSortAsc(false);
    }
  };

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-gray-900/50 p-8 text-center text-sm text-gray-500">
        No data available for comparison.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900/50">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="sticky left-0 z-10 bg-gray-900 px-3 py-2 text-left text-sm font-semibold text-gray-300">
              Model
            </th>
            {indicatorIds.map((id) => (
              <th
                key={id}
                className="cursor-pointer px-2 py-2 text-center font-medium text-gray-400 transition hover:text-white"
                onClick={() => handleSort(id)}
                title={`Sort by ${id}`}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span className="whitespace-nowrap">{id}</span>
                  {sortColumn === id && (
                    <span className="text-[10px] text-chetana-400">
                      {sortAsc ? "▲" : "▼"}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row) => (
            <tr
              key={row.model}
              className="border-b border-gray-800/50 transition hover:bg-white/[0.02]"
            >
              <td className="sticky left-0 z-10 bg-gray-900 px-3 py-2 text-sm font-medium text-gray-200 whitespace-nowrap">
                {row.model}
              </td>
              {indicatorIds.map((id) => {
                const score = row.indicators[id];
                const hasValue = score !== undefined && score !== null;
                return (
                  <td key={id} className="px-1 py-1 text-center">
                    {hasValue ? (
                      <div
                        className="mx-auto flex h-8 w-12 items-center justify-center rounded text-[10px] font-semibold text-gray-950"
                        style={{ backgroundColor: getHeatColor(score) }}
                        title={`${row.model} / ${id}: ${(score * 100).toFixed(1)}%`}
                      >
                        {(score * 100).toFixed(0)}
                      </div>
                    ) : (
                      <div className="mx-auto flex h-8 w-12 items-center justify-center rounded bg-gray-800/50 text-[10px] text-gray-600">
                        --
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
