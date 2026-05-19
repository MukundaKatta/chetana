"use client";

/**
 * Issue #527 - Searchable multi-select
 *
 * Search filter with debounce, option grouping, select all per group,
 * chip display for selected items, and full keyboard navigation.
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface MultiSelectOption {
  value: string;
  label: string;
  group?: string;
  disabled?: boolean;
  description?: string;
  icon?: React.ReactNode;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  /** Currently selected values. */
  value: string[];
  /** Called when selection changes. */
  onChange: (value: string[]) => void;
  /** Placeholder when nothing is selected. */
  placeholder?: string;
  /** Search input placeholder. */
  searchPlaceholder?: string;
  /** Debounce delay for search in ms (default 200). */
  debounceMs?: number;
  /** Max number of chips to show before collapsing (default 5). */
  maxChips?: number;
  /** Max selectable items (default unlimited). */
  maxSelections?: number;
  /** Allow select all per group (default true). */
  allowGroupSelectAll?: boolean;
  /** Show search input (default true). */
  searchable?: boolean;
  /** Custom no-results message. */
  noResultsMessage?: string;
  /** Disabled state. */
  disabled?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Debounce hook                                                     */
/* ------------------------------------------------------------------ */

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  debounceMs = 200,
  maxChips = 5,
  maxSelections,
  allowGroupSelectAll = true,
  searchable = true,
  noResultsMessage = "No options found",
  disabled = false,
  className,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebouncedValue(search, debounceMs);

  const selectedSet = useMemo(() => new Set(value), [value]);

  // Filter options by search
  const filteredOptions = useMemo(() => {
    if (!debouncedSearch) return options;
    const lower = debouncedSearch.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(lower) ||
        opt.value.toLowerCase().includes(lower) ||
        opt.description?.toLowerCase().includes(lower) ||
        opt.group?.toLowerCase().includes(lower)
    );
  }, [options, debouncedSearch]);

  // Group options
  const groupedOptions = useMemo(() => {
    const groups = new Map<string, MultiSelectOption[]>();
    const ungrouped: MultiSelectOption[] = [];

    for (const opt of filteredOptions) {
      if (opt.group) {
        const list = groups.get(opt.group) ?? [];
        list.push(opt);
        groups.set(opt.group, list);
      } else {
        ungrouped.push(opt);
      }
    }

    return { groups, ungrouped };
  }, [filteredOptions]);

  // Flat list for keyboard navigation
  const flatItems = useMemo(() => {
    const items: Array<
      | { type: "option"; option: MultiSelectOption }
      | { type: "group-header"; group: string; options: MultiSelectOption[] }
    > = [];

    if (groupedOptions.ungrouped.length > 0) {
      for (const opt of groupedOptions.ungrouped) {
        items.push({ type: "option", option: opt });
      }
    }

    for (const [group, opts] of groupedOptions.groups) {
      items.push({ type: "group-header", group, options: opts });
      for (const opt of opts) {
        items.push({ type: "option", option: opt });
      }
    }

    return items;
  }, [groupedOptions]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search when opened
  useEffect(() => {
    if (isOpen && searchable) {
      searchRef.current?.focus();
    }
  }, [isOpen, searchable]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-item-index]");
      const item = items[focusedIndex];
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [focusedIndex]);

  const toggleOption = useCallback(
    (val: string) => {
      if (selectedSet.has(val)) {
        onChange(value.filter((v) => v !== val));
      } else {
        if (maxSelections && value.length >= maxSelections) return;
        onChange([...value, val]);
      }
    },
    [value, selectedSet, onChange, maxSelections]
  );

  const toggleGroup = useCallback(
    (groupOptions: MultiSelectOption[]) => {
      const groupValues = groupOptions
        .filter((o) => !o.disabled)
        .map((o) => o.value);
      const allSelected = groupValues.every((v) => selectedSet.has(v));

      if (allSelected) {
        // Deselect all in group
        const groupSet = new Set(groupValues);
        onChange(value.filter((v) => !groupSet.has(v)));
      } else {
        // Select all in group
        const newValues = new Set([...value, ...groupValues]);
        if (maxSelections) {
          const arr = Array.from(newValues).slice(0, maxSelections);
          onChange(arr);
        } else {
          onChange(Array.from(newValues));
        }
      }
    },
    [value, selectedSet, onChange, maxSelections]
  );

  const removeChip = useCallback(
    (val: string) => {
      onChange(value.filter((v) => v !== val));
    },
    [value, onChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
          e.preventDefault();
          setIsOpen(true);
          setFocusedIndex(0);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) => {
            let next = prev + 1;
            // Skip group headers for option selection
            while (
              next < flatItems.length &&
              flatItems[next].type === "group-header"
            ) {
              next++;
            }
            return next < flatItems.length ? next : prev;
          });
          break;

        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => {
            let next = prev - 1;
            while (next >= 0 && flatItems[next].type === "group-header") {
              next--;
            }
            return next >= 0 ? next : prev;
          });
          break;

        case "Enter":
        case " ": {
          e.preventDefault();
          const item = flatItems[focusedIndex];
          if (item?.type === "option" && !item.option.disabled) {
            toggleOption(item.option.value);
          } else if (item?.type === "group-header" && allowGroupSelectAll) {
            toggleGroup(item.options);
          }
          break;
        }

        case "Escape":
          setIsOpen(false);
          setSearch("");
          break;

        case "Backspace":
          if (search === "" && value.length > 0) {
            onChange(value.slice(0, -1));
          }
          break;
      }
    },
    [
      isOpen,
      focusedIndex,
      flatItems,
      toggleOption,
      toggleGroup,
      allowGroupSelectAll,
      search,
      value,
      onChange,
    ]
  );

  // Get label for a value
  const getLabel = useCallback(
    (val: string) => options.find((o) => o.value === val)?.label ?? val,
    [options]
  );

  const visibleChips = value.slice(0, maxChips);
  const hiddenCount = Math.max(0, value.length - maxChips);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger / chip area */}
      <div
        className={cn(
          "flex min-h-[38px] flex-wrap items-center gap-1 rounded-md border px-2 py-1 cursor-pointer",
          "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800",
          isOpen && "ring-2 ring-indigo-500 border-indigo-500"
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        tabIndex={0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {visibleChips.length === 0 && !search && (
          <span className="text-gray-400 text-sm">{placeholder}</span>
        )}

        {visibleChips.map((val) => (
          <span
            key={val}
            className="inline-flex items-center gap-1 rounded bg-indigo-100 dark:bg-indigo-900 px-1.5 py-0.5 text-xs text-indigo-700 dark:text-indigo-200"
          >
            {getLabel(val)}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeChip(val);
              }}
              className="hover:text-indigo-900 dark:hover:text-white"
              aria-label={`Remove ${getLabel(val)}`}
            >
              &times;
            </button>
          </span>
        ))}

        {hiddenCount > 0 && (
          <span className="text-xs text-gray-500">+{hiddenCount} more</span>
        )}

        {/* Inline search (when open) */}
        {isOpen && searchable && (
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setFocusedIndex(0);
            }}
            placeholder={value.length === 0 ? searchPlaceholder : ""}
            className="flex-1 min-w-[60px] bg-transparent text-sm outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* Chevron */}
        <svg
          className={cn(
            "ml-auto h-4 w-4 shrink-0 text-gray-400 transition-transform",
            isOpen && "rotate-180"
          )}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
          role="listbox"
          aria-multiselectable
        >
          {filteredOptions.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">
              {noResultsMessage}
            </div>
          )}

          {/* Ungrouped options */}
          {groupedOptions.ungrouped.map((opt) => {
            const idx = flatItems.findIndex(
              (f) => f.type === "option" && f.option.value === opt.value
            );
            return (
              <OptionItem
                key={opt.value}
                option={opt}
                selected={selectedSet.has(opt.value)}
                focused={idx === focusedIndex}
                onToggle={() => toggleOption(opt.value)}
                index={idx}
              />
            );
          })}

          {/* Grouped options */}
          {Array.from(groupedOptions.groups.entries()).map(
            ([group, opts]) => {
              const allSelected = opts
                .filter((o) => !o.disabled)
                .every((o) => selectedSet.has(o.value));

              return (
                <div key={group}>
                  <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-750 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {group}
                    </span>
                    {allowGroupSelectAll && (
                      <button
                        onClick={() => toggleGroup(opts)}
                        className="text-xs text-indigo-500 hover:text-indigo-700"
                      >
                        {allSelected ? "Deselect all" : "Select all"}
                      </button>
                    )}
                  </div>
                  {opts.map((opt) => {
                    const idx = flatItems.findIndex(
                      (f) =>
                        f.type === "option" &&
                        f.option.value === opt.value
                    );
                    return (
                      <OptionItem
                        key={opt.value}
                        option={opt}
                        selected={selectedSet.has(opt.value)}
                        focused={idx === focusedIndex}
                        onToggle={() => toggleOption(opt.value)}
                        index={idx}
                      />
                    );
                  })}
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Option item sub-component                                         */
/* ------------------------------------------------------------------ */

function OptionItem({
  option,
  selected,
  focused,
  onToggle,
  index,
}: {
  option: MultiSelectOption;
  selected: boolean;
  focused: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <div
      data-item-index={index}
      role="option"
      aria-selected={selected}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer",
        focused && "bg-indigo-50 dark:bg-indigo-900/30",
        selected && !focused && "bg-indigo-50/50 dark:bg-indigo-900/20",
        option.disabled && "opacity-40 cursor-not-allowed",
        !option.disabled && !focused && "hover:bg-gray-50 dark:hover:bg-gray-750"
      )}
      onClick={() => !option.disabled && onToggle()}
    >
      {/* Checkbox */}
      <div
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
          selected
            ? "border-indigo-500 bg-indigo-500 text-white"
            : "border-gray-300 dark:border-gray-600"
        )}
      >
        {selected && (
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
            <path d="M10.28 2.28L4.5 8.06 1.72 5.28a.75.75 0 00-1.06 1.06l3.5 3.5a.75.75 0 001.06 0l6.5-6.5a.75.75 0 00-1.06-1.06z" />
          </svg>
        )}
      </div>

      {/* Icon */}
      {option.icon && <span className="shrink-0">{option.icon}</span>}

      {/* Label + description */}
      <div className="flex-1 min-w-0">
        <div className="truncate">{option.label}</div>
        {option.description && (
          <div className="truncate text-xs text-gray-400">
            {option.description}
          </div>
        )}
      </div>
    </div>
  );
}

export default MultiSelect;
