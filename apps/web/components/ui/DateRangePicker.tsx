"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface DateRange {
  start: Date;
  end: Date;
}

export interface PresetRange {
  label: string;
  getValue: () => DateRange;
}

export interface DateRangePickerProps {
  /** Currently selected range. */
  value?: DateRange;
  /** Called when the range changes. */
  onChange?: (range: DateRange) => void;
  /** Earliest selectable date. */
  minDate?: Date;
  /** Latest selectable date. */
  maxDate?: Date;
  /** IANA timezone string for display (default: browser local). */
  timezone?: string;
  /** Whether to show a "compare with previous period" toggle. */
  enableComparison?: boolean;
  /** Called when comparison range is toggled/changed. */
  onComparisonChange?: (comparison: DateRange | null) => void;
  /** Custom preset ranges to show alongside defaults. */
  customPresets?: PresetRange[];
  /** Additional class names. */
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Date helpers                                                      */
/* ------------------------------------------------------------------ */

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isBetween(d: Date, start: Date, end: Date): boolean {
  const t = d.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/* ------------------------------------------------------------------ */
/*  Default presets                                                   */
/* ------------------------------------------------------------------ */

function defaultPresets(): PresetRange[] {
  const today = endOfDay(new Date());
  return [
    {
      label: "Last 7 days",
      getValue: () => ({ start: startOfDay(addDays(today, -6)), end: today }),
    },
    {
      label: "Last 30 days",
      getValue: () => ({ start: startOfDay(addDays(today, -29)), end: today }),
    },
    {
      label: "Last 90 days",
      getValue: () => ({ start: startOfDay(addDays(today, -89)), end: today }),
    },
    {
      label: "This year",
      getValue: () => ({
        start: new Date(today.getFullYear(), 0, 1),
        end: today,
      }),
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Calendar Month                                                    */
/* ------------------------------------------------------------------ */

function CalendarMonth({
  year,
  month,
  selectedRange,
  hoverDate,
  minDate,
  maxDate,
  onDateClick,
  onDateHover,
}: {
  year: number;
  month: number;
  selectedRange: DateRange | null;
  hoverDate: Date | null;
  minDate?: Date;
  maxDate?: Date;
  onDateClick: (d: Date) => void;
  onDateHover: (d: Date | null) => void;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const cells: Array<Date | null> = [];

  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  return (
    <div>
      <div className="mb-1 text-center text-sm font-semibold text-white">
        {MONTH_NAMES[month]} {year}
      </div>
      <div className="grid grid-cols-7 gap-0 text-center text-[11px]">
        {DAY_LABELS.map((dl) => (
          <div key={dl} className="py-1 text-white/40 font-medium">
            {dl}
          </div>
        ))}
        {cells.map((cell, idx) => {
          if (!cell) {
            return <div key={`empty-${idx}`} />;
          }

          const disabled =
            (minDate && cell < startOfDay(minDate)) ||
            (maxDate && cell > endOfDay(maxDate));

          const isStart = selectedRange && isSameDay(cell, selectedRange.start);
          const isEnd = selectedRange && isSameDay(cell, selectedRange.end);
          const inRange =
            selectedRange &&
            isBetween(cell, startOfDay(selectedRange.start), endOfDay(selectedRange.end));

          return (
            <button
              key={cell.toISOString()}
              type="button"
              disabled={!!disabled}
              onClick={() => onDateClick(cell)}
              onMouseEnter={() => onDateHover(cell)}
              onMouseLeave={() => onDateHover(null)}
              className={cn(
                "h-7 w-7 rounded text-xs transition-colors",
                disabled && "cursor-not-allowed text-white/20",
                !disabled && "cursor-pointer hover:bg-white/10 text-white/80",
                inRange && !isStart && !isEnd && "bg-blue-500/20",
                (isStart || isEnd) && "bg-blue-600 text-white font-bold"
              )}
            >
              {cell.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DateRangePicker                                                   */
/* ------------------------------------------------------------------ */

export function DateRangePicker({
  value,
  onChange,
  minDate,
  maxDate,
  timezone,
  enableComparison = false,
  onComparisonChange,
  customPresets,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState<"start" | "end">("start");
  const [pendingStart, setPendingStart] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const [viewYear, setViewYear] = useState(
    value?.start.getFullYear() ?? today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    value?.start.getMonth() ?? today.getMonth()
  );

  const presets = useMemo(
    () => [...defaultPresets(), ...(customPresets ?? [])],
    [customPresets]
  );

  const displayRange = useMemo(() => {
    if (!value) return "Select date range";
    return `${formatDate(value.start)} - ${formatDate(value.end)}`;
  }, [value]);

  const tzLabel = useMemo(() => {
    if (timezone) return timezone;
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "UTC";
    }
  }, [timezone]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleDateClick = useCallback(
    (d: Date) => {
      if (selecting === "start") {
        setPendingStart(d);
        setSelecting("end");
      } else {
        const start = pendingStart ?? d;
        const sorted: DateRange =
          d >= start
            ? { start: startOfDay(start), end: endOfDay(d) }
            : { start: startOfDay(d), end: endOfDay(start) };

        onChange?.(sorted);
        setSelecting("start");
        setPendingStart(null);
        setOpen(false);

        if (compareEnabled && onComparisonChange) {
          const dur = sorted.end.getTime() - sorted.start.getTime();
          onComparisonChange({
            start: new Date(sorted.start.getTime() - dur),
            end: new Date(sorted.start.getTime() - 1),
          });
        }
      }
    },
    [selecting, pendingStart, onChange, compareEnabled, onComparisonChange]
  );

  const handlePreset = useCallback(
    (preset: PresetRange) => {
      const range = preset.getValue();
      onChange?.(range);
      setOpen(false);

      if (compareEnabled && onComparisonChange) {
        const dur = range.end.getTime() - range.start.getTime();
        onComparisonChange({
          start: new Date(range.start.getTime() - dur),
          end: new Date(range.start.getTime() - 1),
        });
      }
    },
    [onChange, compareEnabled, onComparisonChange]
  );

  const prevMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }, [viewMonth]);

  const nextMonth = useCallback(() => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }, [viewMonth]);

  const nextMonthNum = viewMonth === 11 ? 0 : viewMonth + 1;
  const nextMonthYear = viewMonth === 11 ? viewYear + 1 : viewYear;

  const currentRange = useMemo(() => {
    if (pendingStart && hoverDate) {
      return hoverDate >= pendingStart
        ? { start: pendingStart, end: hoverDate }
        : { start: hoverDate, end: pendingStart };
    }
    return value ?? null;
  }, [value, pendingStart, hoverDate]);

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white hover:bg-white/10"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-white/50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <span>{displayRange}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 flex rounded-lg border border-white/20 bg-gray-900 shadow-xl">
          {/* Presets sidebar */}
          <div className="flex flex-col gap-1 border-r border-white/10 p-3">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePreset(preset)}
                className="whitespace-nowrap rounded px-3 py-1.5 text-left text-xs text-white/70 hover:bg-white/10 hover:text-white"
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelecting("start")}
              className="whitespace-nowrap rounded px-3 py-1.5 text-left text-xs font-medium text-blue-400 hover:bg-white/10"
            >
              Custom range
            </button>
          </div>

          {/* Calendars */}
          <div className="p-3">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={prevMonth}
                className="rounded p-1 text-white/60 hover:bg-white/10"
                aria-label="Previous month"
              >
                &larr;
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="rounded p-1 text-white/60 hover:bg-white/10"
                aria-label="Next month"
              >
                &rarr;
              </button>
            </div>

            <div className="flex gap-4">
              <CalendarMonth
                year={viewYear}
                month={viewMonth}
                selectedRange={currentRange}
                hoverDate={hoverDate}
                minDate={minDate}
                maxDate={maxDate}
                onDateClick={handleDateClick}
                onDateHover={setHoverDate}
              />
              <CalendarMonth
                year={nextMonthYear}
                month={nextMonthNum}
                selectedRange={currentRange}
                hoverDate={hoverDate}
                minDate={minDate}
                maxDate={maxDate}
                onDateClick={handleDateClick}
                onDateHover={setHoverDate}
              />
            </div>

            {/* Footer */}
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2 text-xs text-white/50">
              <span>Timezone: {tzLabel}</span>
              {enableComparison && (
                <label className="flex items-center gap-1.5 text-white/60">
                  <input
                    type="checkbox"
                    checked={compareEnabled}
                    onChange={(e) => {
                      setCompareEnabled(e.target.checked);
                      if (!e.target.checked) onComparisonChange?.(null);
                    }}
                    className="accent-blue-500"
                  />
                  Compare with previous period
                </label>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
