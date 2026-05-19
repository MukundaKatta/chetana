"use client";

/**
 * Issue #530 - Waffle chart
 *
 * 10x10 grid of squares, color by category proportion,
 * hover highlight, click for details, responsive.
 */

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface WaffleCategory {
  label: string;
  value: number;
  color: string;
}

export interface WaffleChartProps {
  /** Categories with values (proportions or counts — will be normalized to 100). */
  categories: WaffleCategory[];
  /** Grid dimension (N x N squares, default 10). */
  gridSize?: number;
  /** Total size in px (responsive if not set). */
  size?: number;
  /** Gap between squares in px (default 2). */
  gap?: number;
  /** Corner radius of squares in px (default 2). */
  borderRadius?: number;
  /** Show legend below chart (default true). */
  showLegend?: boolean;
  /** Show percentage labels in legend (default true). */
  showPercentages?: boolean;
  /** Called when a category is clicked. */
  onCategoryClick?: (category: WaffleCategory) => void;
  /** Title above the chart. */
  title?: string;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function WaffleChart({
  categories,
  gridSize = 10,
  size,
  gap = 2,
  borderRadius = 2,
  showLegend = true,
  showPercentages = true,
  onCategoryClick,
  title,
  className,
}: WaffleChartProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    null
  );
  const [tooltip, setTooltip] = useState<{
    label: string;
    percentage: number;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  const totalSquares = gridSize * gridSize;

  // Normalize categories to fill the grid
  const { squares, categoryPercentages } = useMemo(() => {
    const total = categories.reduce((sum, c) => sum + c.value, 0);
    if (total === 0) {
      return {
        squares: Array.from({ length: totalSquares }, () => ({
          label: "",
          color: "#e5e7eb",
        })),
        categoryPercentages: new Map<string, number>(),
      };
    }

    // Compute square counts using largest remainder method
    const raw = categories.map((c) => ({
      ...c,
      exact: (c.value / total) * totalSquares,
    }));

    const floored = raw.map((c) => ({
      ...c,
      count: Math.floor(c.exact),
      remainder: c.exact - Math.floor(c.exact),
    }));

    let allocated = floored.reduce((sum, c) => sum + c.count, 0);
    const remaining = totalSquares - allocated;

    // Distribute remaining squares to categories with largest remainders
    const sorted = [...floored].sort((a, b) => b.remainder - a.remainder);
    for (let i = 0; i < remaining; i++) {
      sorted[i % sorted.length].count++;
    }

    // Build the square grid
    const squareList: Array<{ label: string; color: string }> = [];
    const percMap = new Map<string, number>();

    for (const cat of sorted) {
      for (let i = 0; i < cat.count; i++) {
        squareList.push({ label: cat.label, color: cat.color });
      }
      percMap.set(cat.label, (cat.value / total) * 100);
    }

    // Fill any remaining with empty
    while (squareList.length < totalSquares) {
      squareList.push({ label: "", color: "#e5e7eb" });
    }

    return { squares: squareList.slice(0, totalSquares), categoryPercentages: percMap };
  }, [categories, totalSquares]);

  const handleSquareHover = useCallback(
    (
      label: string,
      e: React.MouseEvent
    ) => {
      if (!label) {
        setTooltip(null);
        setHoveredCategory(null);
        return;
      }
      setHoveredCategory(label);
      const percentage = categoryPercentages.get(label) ?? 0;
      const count = squares.filter((s) => s.label === label).length;
      const rect = (e.currentTarget as HTMLElement).closest(
        "[data-waffle-container]"
      )?.getBoundingClientRect();
      if (rect) {
        setTooltip({
          label,
          percentage,
          count,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    },
    [categoryPercentages, squares]
  );

  const handleSquareClick = useCallback(
    (label: string) => {
      if (!label) return;
      setSelectedCategory((prev) => (prev === label ? null : label));
      const cat = categories.find((c) => c.label === label);
      if (cat && onCategoryClick) onCategoryClick(cat);
    },
    [categories, onCategoryClick]
  );

  return (
    <div
      className={cn("inline-flex flex-col items-center gap-3", className)}
      data-waffle-container
      style={{ position: "relative" }}
    >
      {title && (
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {title}
        </div>
      )}

      {/* Grid */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gap: `${gap}px`,
          width: size ? `${size}px` : "100%",
          aspectRatio: "1 / 1",
          maxWidth: size ? `${size}px` : "300px",
        }}
      >
        {squares.map((sq, i) => {
          const isHovered = hoveredCategory === sq.label && sq.label !== "";
          const isSelected = selectedCategory === sq.label;
          const isDimmed =
            (hoveredCategory !== null && hoveredCategory !== sq.label && sq.label !== "") ||
            (selectedCategory !== null && selectedCategory !== sq.label && sq.label !== "");

          return (
            <div
              key={i}
              className={cn(
                "cursor-pointer transition-all duration-150",
                isHovered && "scale-110 z-10",
                isSelected && "ring-2 ring-white ring-offset-1",
                isDimmed && "opacity-30"
              )}
              style={{
                backgroundColor: sq.color,
                borderRadius: `${borderRadius}px`,
                aspectRatio: "1 / 1",
              }}
              onMouseEnter={(e) => handleSquareHover(sq.label, e)}
              onMouseLeave={() => {
                setHoveredCategory(null);
                setTooltip(null);
              }}
              onClick={() => handleSquareClick(sq.label)}
              role="gridcell"
              aria-label={sq.label || "Empty"}
            />
          );
        })}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
          {categories.map((cat) => {
            const percentage = categoryPercentages.get(cat.label) ?? 0;
            const isActive =
              hoveredCategory === cat.label || selectedCategory === cat.label;

            return (
              <div
                key={cat.label}
                className={cn(
                  "flex items-center gap-1.5 cursor-pointer transition-opacity",
                  hoveredCategory !== null &&
                    hoveredCategory !== cat.label &&
                    "opacity-40"
                )}
                onMouseEnter={() => setHoveredCategory(cat.label)}
                onMouseLeave={() => setHoveredCategory(null)}
                onClick={() => handleSquareClick(cat.label)}
              >
                <div
                  className="h-3 w-3 rounded-sm shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span
                  className={cn(
                    "text-gray-600 dark:text-gray-400",
                    isActive && "font-semibold text-gray-900 dark:text-white"
                  )}
                >
                  {cat.label}
                  {showPercentages && (
                    <span className="ml-1 text-gray-400">
                      ({percentage.toFixed(1)}%)
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-50 rounded bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-lg pointer-events-none"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 12,
            whiteSpace: "nowrap",
          }}
        >
          <div className="font-semibold">{tooltip.label}</div>
          <div>
            {tooltip.percentage.toFixed(1)}% ({tooltip.count}/{totalSquares}{" "}
            squares)
          </div>
        </div>
      )}

      {/* Detail panel (when selected) */}
      {selectedCategory && (
        <div className="w-full max-w-[300px] rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="h-4 w-4 rounded"
                style={{
                  backgroundColor:
                    categories.find((c) => c.label === selectedCategory)
                      ?.color ?? "#ccc",
                }}
              />
              <span className="font-medium">{selectedCategory}</span>
            </div>
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              &times;
            </button>
          </div>
          <div className="mt-2 text-gray-500 dark:text-gray-400">
            <div>
              Percentage: {(categoryPercentages.get(selectedCategory) ?? 0).toFixed(1)}%
            </div>
            <div>
              Squares: {squares.filter((s) => s.label === selectedCategory).length} of{" "}
              {totalSquares}
            </div>
            <div>
              Raw value:{" "}
              {categories.find((c) => c.label === selectedCategory)?.value ?? 0}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WaffleChart;
