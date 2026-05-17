"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import type { Theory } from "@chetana/shared";

const THEORY_OPTIONS: { value: Theory; label: string; color: string }[] = [
  { value: "gwt", label: "GWT", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  { value: "iit", label: "IIT", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  { value: "hot", label: "HOT", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  { value: "rpt", label: "RPT", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  { value: "pp", label: "PP", color: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
  { value: "ast", label: "AST", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
];

export interface StickyFilterBarProps {
  /** Currently selected theory filters. */
  selectedTheories: Theory[];
  /** Called when the theory selection changes. */
  onTheoriesChange: (theories: Theory[]) => void;
  /** Additional filter content rendered on the right side. */
  children?: React.ReactNode;
  /** Extra className for the bar container. */
  className?: string;
}

export function StickyFilterBar({
  selectedTheories,
  onTheoriesChange,
  children,
  className,
}: StickyFilterBarProps) {
  const toggleTheory = (theory: Theory) => {
    if (selectedTheories.includes(theory)) {
      onTheoriesChange(selectedTheories.filter((t) => t !== theory));
    } else {
      onTheoriesChange([...selectedTheories, theory]);
    }
  };

  const clearAll = () => {
    onTheoriesChange([]);
  };

  const hasFilters = selectedTheories.length > 0;

  return (
    <div
      className={cn(
        "sticky top-0 z-20 -mx-6 border-b border-white/10 bg-gray-950/80 px-6 py-3 backdrop-blur-xl",
        className
      )}
      role="toolbar"
      aria-label="Filter controls"
    >
      <div className="flex flex-wrap items-center gap-2">
        {/* Theory filter pills */}
        <span className="mr-1 text-xs font-medium text-white/40">Theories:</span>
        {THEORY_OPTIONS.map((option) => {
          const isSelected = selectedTheories.includes(option.value);
          return (
            <button
              key={option.value}
              onClick={() => toggleTheory(option.value)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
                isSelected
                  ? option.color
                  : "border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white/70"
              )}
              aria-pressed={isSelected}
              aria-label={`Filter by ${option.label}`}
            >
              {option.label}
            </button>
          );
        })}

        {/* Clear all button */}
        {hasFilters && (
          <button
            onClick={clearAll}
            className="ml-1 inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-xs font-medium text-white/40 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
            aria-label="Clear all filters"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}

        {/* Additional filter content */}
        {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}
