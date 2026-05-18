"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { Search, CornerDownLeft, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CommandItem {
  id: string;
  label: string;
  /** Optional description shown below the label */
  description?: string;
  /** Optional icon rendered to the left */
  icon?: ReactNode;
  /** Optional keyboard shortcut hint */
  shortcut?: string;
  /** Optional group/section name */
  group?: string;
  /** Called when the item is selected */
  action: () => void;
  /** Optional keywords for search matching */
  keywords?: string[];
}

interface CommandPaletteProps {
  items: CommandItem[];
  /** Placeholder text for the search input */
  placeholder?: string;
  /** Maximum number of recent items to show */
  maxRecent?: number;
  className?: string;
}

const RECENT_KEY = "chetana-command-palette-recent";

function getRecentIds(max: number): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return (stored as string[]).slice(0, max);
  } catch {
    return [];
  }
}

function addRecentId(id: string, max: number) {
  const recent = getRecentIds(max).filter((r) => r !== id);
  recent.unshift(id);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, max)));
}

/**
 * Simple fuzzy match: check if all characters of the query appear
 * in order within the target string.
 */
function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  // Exact prefix match scores highest
  if (t.startsWith(q)) return 2;
  // Contains as substring
  if (t.includes(q)) return 1;
  // Fuzzy match
  if (fuzzyMatch(query, target)) return 0.5;
  return 0;
}

export function CommandPalette({
  items,
  placeholder = "Type a command...",
  maxRecent = 5,
  className,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Open on Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      // Small delay so the DOM renders first
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Filtered + scored items
  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    return items
      .map((item) => {
        const labelScore = fuzzyScore(query, item.label);
        const descScore = item.description
          ? fuzzyScore(query, item.description) * 0.5
          : 0;
        const kwScore = item.keywords
          ? Math.max(...item.keywords.map((k) => fuzzyScore(query, k))) * 0.3
          : 0;
        return { item, score: Math.max(labelScore, descScore, kwScore) };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.item);
  }, [items, query]);

  // Recent items
  const recentItems = useMemo(() => {
    if (query.trim()) return [];
    const recentIds = getRecentIds(maxRecent);
    return recentIds
      .map((id) => items.find((item) => item.id === id))
      .filter((item): item is CommandItem => item != null);
  }, [items, maxRecent, query]);

  const displayItems = query.trim() ? filtered : recentItems;

  // Clamp active index
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const select = useCallback(
    (item: CommandItem) => {
      addRecentId(item.id, maxRecent);
      setOpen(false);
      item.action();
    },
    [maxRecent]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, displayItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = displayItems[activeIndex];
        if (item) select(item);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    },
    [displayItems, activeIndex, select]
  );

  // Scroll active item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector("[data-active='true']");
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  // Group items by their group property
  const grouped = new Map<string, CommandItem[]>();
  for (const item of displayItems) {
    const group = item.group || "";
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group)!.push(item);
  }

  let globalIndex = 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9990] bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-label="Command palette"
        className={cn(
          "fixed left-1/2 top-[20%] z-[9991] w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-white/10 bg-gray-900 shadow-2xl",
          className
        )}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4">
          <Search className="h-4 w-4 shrink-0 text-white/40" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-white/30"
            aria-label="Search commands"
            autoComplete="off"
          />
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {displayItems.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-white/40">
              {query.trim() ? "No results found." : "Start typing to search..."}
            </p>
          )}

          {Array.from(grouped.entries()).map(([group, groupItems]) => (
            <div key={group}>
              {group && (
                <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-white/30">
                  {group}
                </p>
              )}
              {!group && recentItems.length > 0 && !query.trim() && (
                <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-white/30">
                  Recent
                </p>
              )}
              {groupItems.map((item) => {
                const idx = globalIndex++;
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={item.id}
                    data-active={isActive}
                    onClick={() => select(item)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                      isActive ? "bg-white/10 text-white" : "text-white/70"
                    )}
                  >
                    {item.icon && (
                      <span className="shrink-0 text-white/40">
                        {item.icon}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {item.label}
                      </span>
                      {item.description && (
                        <span className="block truncate text-xs text-white/40">
                          {item.description}
                        </span>
                      )}
                    </div>
                    {item.shortcut && (
                      <kbd className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-white/30">
                        {item.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 border-t border-white/10 px-4 py-2 text-[10px] text-white/30">
          <span className="flex items-center gap-1">
            <ArrowUp className="h-3 w-3" />
            <ArrowDown className="h-3 w-3" />
            navigate
          </span>
          <span className="flex items-center gap-1">
            <CornerDownLeft className="h-3 w-3" />
            select
          </span>
          <span>esc close</span>
        </div>
      </div>
    </>
  );
}
