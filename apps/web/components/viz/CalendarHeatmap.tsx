/**
 * Calendar heatmap: GitHub-style contribution calendar, color intensity
 * by count, tooltip with date/count, month/week labels, year selector
 * (Issue #498).
 */

"use client";

import { useState, useMemo, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HeatmapDatum {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface CalendarHeatmapProps {
  /** Data points keyed by date. */
  data: HeatmapDatum[];
  /** Available years. Derived from data if omitted. */
  years?: number[];
  /** Initial selected year. Defaults to current year. */
  defaultYear?: number;
  /** Color scale – five shades from least to most intense. */
  colorScale?: [string, string, string, string, string];
  /** Color for zero / empty cells. */
  emptyColor?: string;
  /** Cell size in px. */
  cellSize?: number;
  /** Gap between cells in px. */
  cellGap?: number;
  /** Callback on cell click. */
  onCellClick?: (datum: HeatmapDatum | null, date: string) => void;
  className?: string;
}

interface TooltipState {
  x: number;
  y: number;
  date: string;
  count: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getWeeksForYear(year: number): string[][] {
  const weeks: string[][] = [];
  const start = new Date(year, 0, 1);
  // Align to Sunday
  const startDay = start.getDay(); // 0=Sun
  const offset = startDay === 0 ? 0 : -startDay;
  const cursor = new Date(year, 0, 1 + offset);

  while (cursor.getFullYear() <= year) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      if (cursor.getFullYear() === year) {
        week.push(formatDate(cursor));
      } else {
        week.push("");
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    if (cursor.getFullYear() > year && week.every((s) => s === "")) break;
  }

  return weeks;
}

function quantize(count: number, max: number): number {
  if (count === 0 || max === 0) return 0;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function deriveYears(data: HeatmapDatum[]): number[] {
  const years = new Set(data.map((d) => parseInt(d.date.slice(0, 4), 10)));
  return Array.from(years).sort((a, b) => b - a);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DEFAULT_COLORS: [string, string, string, string, string] = [
  "#161b22", // empty/bg
  "#0e4429",
  "#006d32",
  "#26a641",
  "#39d353",
];

export function CalendarHeatmap({
  data,
  years: yearsProp,
  defaultYear,
  colorScale = DEFAULT_COLORS,
  emptyColor = "#161b22",
  cellSize = 13,
  cellGap = 3,
  onCellClick,
  className,
}: CalendarHeatmapProps): ReactNode {
  const availableYears = useMemo(
    () => yearsProp ?? deriveYears(data),
    [yearsProp, data]
  );
  const [selectedYear, setSelectedYear] = useState(
    defaultYear ?? availableYears[0] ?? new Date().getFullYear()
  );
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const lookup = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of data) {
      map.set(d.date, (map.get(d.date) ?? 0) + d.count);
    }
    return map;
  }, [data]);

  const maxCount = useMemo(() => {
    let max = 0;
    for (const [key, val] of lookup) {
      if (key.startsWith(String(selectedYear)) && val > max) max = val;
    }
    return max;
  }, [lookup, selectedYear]);

  const weeks = useMemo(() => getWeeksForYear(selectedYear), [selectedYear]);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent, date: string, count: number) => {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 8, date, count });
    },
    []
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  const handleClick = useCallback(
    (date: string) => {
      const count = lookup.get(date) ?? 0;
      onCellClick?.(count > 0 ? { date, count } : null, date);
    },
    [lookup, onCellClick]
  );

  // Determine month label positions
  const monthPositions = useMemo(() => {
    const positions: { label: string; col: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, colIdx) => {
      for (const dateStr of week) {
        if (!dateStr) continue;
        const month = parseInt(dateStr.slice(5, 7), 10) - 1;
        if (month !== lastMonth) {
          positions.push({ label: MONTH_LABELS[month], col: colIdx });
          lastMonth = month;
        }
        break;
      }
    });
    return positions;
  }, [weeks]);

  const totalWidth = weeks.length * (cellSize + cellGap);
  const totalHeight = 7 * (cellSize + cellGap);
  const labelOffset = 32;

  return (
    <div className={cn("relative select-none", className)}>
      {/* Year selector */}
      {availableYears.length > 1 && (
        <div className="mb-3 flex items-center gap-2">
          <label htmlFor="heatmap-year" className="text-xs text-gray-400">
            Year
          </label>
          <select
            id="heatmap-year"
            className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* SVG grid */}
      <div className="overflow-x-auto">
        <svg
          width={totalWidth + labelOffset + 8}
          height={totalHeight + 24}
          role="img"
          aria-label={`Calendar heatmap for ${selectedYear}`}
        >
          {/* Month labels */}
          {monthPositions.map(({ label, col }) => (
            <text
              key={`${label}-${col}`}
              x={labelOffset + col * (cellSize + cellGap)}
              y={10}
              className="fill-gray-400"
              fontSize={10}
            >
              {label}
            </text>
          ))}

          {/* Day-of-week labels */}
          {DAY_LABELS.map((label, idx) =>
            label ? (
              <text
                key={idx}
                x={0}
                y={20 + idx * (cellSize + cellGap) + cellSize / 2 + 3}
                className="fill-gray-500"
                fontSize={9}
              >
                {label}
              </text>
            ) : null
          )}

          {/* Cells */}
          {weeks.map((week, colIdx) =>
            week.map((dateStr, rowIdx) => {
              if (!dateStr) return null;
              const count = lookup.get(dateStr) ?? 0;
              const level = quantize(count, maxCount);
              const fill = level === 0 ? emptyColor : colorScale[level];
              return (
                <rect
                  key={dateStr}
                  x={labelOffset + colIdx * (cellSize + cellGap)}
                  y={18 + rowIdx * (cellSize + cellGap)}
                  width={cellSize}
                  height={cellSize}
                  rx={2}
                  ry={2}
                  fill={fill}
                  className="cursor-pointer transition-opacity hover:opacity-80"
                  onMouseEnter={(e) => handleMouseEnter(e, dateStr, count)}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => handleClick(dateStr)}
                />
              );
            })
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
        <span>Less</span>
        {[emptyColor, ...colorScale.slice(1)].map((color, i) => (
          <span
            key={i}
            className="inline-block rounded-sm"
            style={{
              width: cellSize,
              height: cellSize,
              backgroundColor: color,
            }}
          />
        ))}
        <span>More</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded bg-gray-800 px-2 py-1 text-xs text-gray-100 shadow-lg"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <strong>{tooltip.count}</strong>{" "}
          {tooltip.count === 1 ? "audit" : "audits"} on {tooltip.date}
        </div>
      )}
    </div>
  );
}
