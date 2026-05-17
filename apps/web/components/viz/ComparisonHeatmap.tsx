"use client";

import { useState, useMemo } from "react";

interface ComparisonHeatmapProps {
  data: Array<{ model: string; scores: Record<string, number> }>;
}

function getHeatColor(score: number): string {
  const clamped = Math.max(0, Math.min(1, score));
  if (clamped <= 0.5) {
    // Red (#ef4444) to Yellow (#eab308)
    const t = clamped / 0.5;
    const r = Math.round(239 + t * (234 - 239));
    const g = Math.round(68 + t * (179 - 68));
    const b = Math.round(68 + t * (8 - 68));
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Yellow (#eab308) to Green (#22c55e)
    const t = (clamped - 0.5) / 0.5;
    const r = Math.round(234 + t * (34 - 234));
    const g = Math.round(179 + t * (197 - 179));
    const b = Math.round(8 + t * (94 - 8));
    return `rgb(${r}, ${g}, ${b})`;
  }
}

function getOpacity(score: number): number {
  return 0.1 + Math.max(0, Math.min(1, score)) * 0.8;
}

export function ComparisonHeatmap({ data }: ComparisonHeatmapProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{
    model: string;
    indicator: string;
    score: number;
  } | null>(null);

  // Collect all unique indicator IDs
  const indicatorIds = useMemo(() => {
    const ids = new Set<string>();
    data.forEach((row) => {
      Object.keys(row.scores).forEach((id) => ids.add(id));
    });
    return Array.from(ids).sort();
  }, [data]);

  // Sort rows by the selected column
  const sortedData = useMemo(() => {
    if (!sortColumn) return data;
    return [...data].sort((a, b) => {
      const aVal = a.scores[sortColumn] ?? 0;
      const bVal = b.scores[sortColumn] ?? 0;
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
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center text-sm text-gray-500">
        No data available for comparison.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900/50">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="sticky left-0 z-10 bg-gray-900 px-3 py-3 text-left text-sm font-semibold text-gray-300">
              Model
            </th>
            {indicatorIds.map((id) => (
              <th
                key={id}
                className="cursor-pointer px-2 py-3 text-center font-medium text-gray-400 transition hover:text-white"
                onClick={() => handleSort(id)}
                title={`Sort by ${id}`}
              >
                <div
                  className="flex items-center justify-center"
                  style={{ height: "3rem" }}
                >
                  <span
                    className="inline-block whitespace-nowrap origin-center"
                    style={{ transform: "rotate(-45deg)" }}
                  >
                    {id}
                  </span>
                </div>
                {sortColumn === id && (
                  <span className="mt-0.5 block text-[10px] text-cyan-400">
                    {sortAsc ? "▲" : "▼"}
                  </span>
                )}
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
                const score = row.scores[id];
                const hasValue = score !== undefined && score !== null;
                const isHovered =
                  hoveredCell?.model === row.model &&
                  hoveredCell?.indicator === id;
                return (
                  <td key={id} className="px-1 py-1 text-center">
                    {hasValue ? (
                      <div
                        className="relative mx-auto flex h-8 w-12 items-center justify-center rounded text-[10px] font-semibold"
                        style={{
                          backgroundColor: getHeatColor(score),
                          opacity: getOpacity(score),
                        }}
                        onMouseEnter={() =>
                          setHoveredCell({ model: row.model, indicator: id, score })
                        }
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <span className="text-gray-950">
                          {(score * 100).toFixed(0)}
                        </span>
                        {isHovered && (
                          <div className="pointer-events-none absolute -top-8 left-1/2 z-30 -translate-x-1/2 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-[11px] font-medium text-gray-200 shadow-lg whitespace-nowrap">
                            {row.model} / {id}: {score.toFixed(3)}
                          </div>
                        )}
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
