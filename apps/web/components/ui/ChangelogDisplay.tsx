"use client";

import { useState, useMemo, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type ChangelogCategory = "feature" | "fix" | "improvement" | "breaking" | "deprecation";

export interface ChangelogEntry {
  id: string;
  category: ChangelogCategory;
  title: string;
  /** Markdown-formatted description. */
  description?: string;
  /** Associated issue/PR numbers. */
  references?: string[];
}

export interface ChangelogVersion {
  version: string;
  date: string;
  entries: ChangelogEntry[];
  /** Whether this version is the latest. */
  isLatest?: boolean;
}

export interface ChangelogDisplayProps {
  versions: ChangelogVersion[];
  /** Version the user last saw (shows "new" badge on newer items). */
  lastSeenVersion?: string;
  /** Called when the user marks changelog as read. */
  onMarkRead?: (version: string) => void;
  /** Filter to specific categories. */
  categoryFilter?: ChangelogCategory[];
  /** Extra class. */
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Category config                                                   */
/* ------------------------------------------------------------------ */

const CATEGORY_CONFIG: Record<
  ChangelogCategory,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  feature: {
    label: "Feature",
    color: "text-green-400",
    bgColor: "bg-green-500/20 border-green-500/30",
    icon: "+",
  },
  fix: {
    label: "Fix",
    color: "text-red-400",
    bgColor: "bg-red-500/20 border-red-500/30",
    icon: "!",
  },
  improvement: {
    label: "Improvement",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20 border-blue-500/30",
    icon: "^",
  },
  breaking: {
    label: "Breaking",
    color: "text-orange-400",
    bgColor: "bg-orange-500/20 border-orange-500/30",
    icon: "!!",
  },
  deprecation: {
    label: "Deprecated",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20 border-yellow-500/30",
    icon: "~",
  },
};

/* ------------------------------------------------------------------ */
/*  Simple Markdown renderer                                          */
/* ------------------------------------------------------------------ */

function renderMarkdown(md: string): ReactNode {
  // Very lightweight inline markdown: **bold**, `code`, [link](url)
  const parts: ReactNode[] = [];
  let remaining = md;
  let keyIdx = 0;

  const patterns: Array<{
    regex: RegExp;
    render: (match: RegExpMatchArray) => ReactNode;
  }> = [
    {
      regex: /\*\*(.+?)\*\*/,
      render: (m) => <strong key={keyIdx++} className="font-semibold text-white">{m[1]}</strong>,
    },
    {
      regex: /`(.+?)`/,
      render: (m) => (
        <code key={keyIdx++} className="rounded bg-white/10 px-1 py-0.5 text-xs font-mono">
          {m[1]}
        </code>
      ),
    },
    {
      regex: /\[(.+?)\]\((.+?)\)/,
      render: (m) => (
        <a
          key={keyIdx++}
          href={m[2]}
          className="text-blue-400 underline hover:text-blue-300"
          target="_blank"
          rel="noopener noreferrer"
        >
          {m[1]}
        </a>
      ),
    },
  ];

  while (remaining.length > 0) {
    let earliestIdx = remaining.length;
    let earliestMatch: RegExpMatchArray | null = null;
    let earliestPattern: (typeof patterns)[number] | null = null;

    for (const p of patterns) {
      const m = remaining.match(p.regex);
      if (m && m.index !== undefined && m.index < earliestIdx) {
        earliestIdx = m.index;
        earliestMatch = m;
        earliestPattern = p;
      }
    }

    if (!earliestMatch || !earliestPattern) {
      parts.push(remaining);
      break;
    }

    if (earliestIdx > 0) {
      parts.push(remaining.slice(0, earliestIdx));
    }
    parts.push(earliestPattern.render(earliestMatch));
    remaining = remaining.slice(earliestIdx + earliestMatch[0].length);
  }

  return <>{parts}</>;
}

/* ------------------------------------------------------------------ */
/*  Version Badge                                                     */
/* ------------------------------------------------------------------ */

function VersionBadge({ version, isNew }: { version: string; isNew: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-mono font-semibold text-white">
        v{version}
      </span>
      {isNew && (
        <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white animate-pulse">
          New
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Category Badge                                                    */
/* ------------------------------------------------------------------ */

function CategoryBadge({ category }: { category: ChangelogCategory }) {
  const config = CATEGORY_CONFIG[category];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
        config.bgColor,
        config.color
      )}
    >
      <span className="font-mono">{config.icon}</span>
      {config.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Entry component                                                   */
/* ------------------------------------------------------------------ */

function ChangelogEntryItem({ entry }: { entry: ChangelogEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
      <div className="flex items-start gap-2">
        <CategoryBadge category={entry.category} />
        <button
          type="button"
          onClick={() => entry.description && setExpanded(!expanded)}
          className={cn(
            "flex-1 text-left text-sm text-white/90",
            entry.description && "cursor-pointer hover:text-white"
          )}
        >
          {entry.title}
          {entry.description && (
            <span className="ml-1 text-white/30">{expanded ? "[-]" : "[+]"}</span>
          )}
        </button>
      </div>

      {expanded && entry.description && (
        <div className="ml-16 text-xs leading-relaxed text-white/60">
          {renderMarkdown(entry.description)}
        </div>
      )}

      {entry.references && entry.references.length > 0 && (
        <div className="ml-16 flex gap-1.5">
          {entry.references.map((ref) => (
            <span
              key={ref}
              className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/40 font-mono"
            >
              {ref}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export function ChangelogDisplay({
  versions,
  lastSeenVersion,
  onMarkRead,
  categoryFilter,
  className,
}: ChangelogDisplayProps) {
  const [activeFilter, setActiveFilter] = useState<ChangelogCategory | null>(null);

  const effectiveFilter = categoryFilter ?? (activeFilter ? [activeFilter] : null);

  const filteredVersions = useMemo(() => {
    if (!effectiveFilter) return versions;
    return versions
      .map((v) => ({
        ...v,
        entries: v.entries.filter((e) => effectiveFilter.includes(e.category)),
      }))
      .filter((v) => v.entries.length > 0);
  }, [versions, effectiveFilter]);

  const isVersionNew = useCallback(
    (version: string) => {
      if (!lastSeenVersion) return false;
      // Simple semver comparison: newer = higher string sort
      return version > lastSeenVersion;
    },
    [lastSeenVersion]
  );

  const hasNew = useMemo(
    () => versions.some((v) => isVersionNew(v.version)),
    [versions, isVersionNew]
  );

  const allCategories: ChangelogCategory[] = [
    "feature",
    "fix",
    "improvement",
    "breaking",
    "deprecation",
  ];

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Changelog
          {hasNew && (
            <span className="ml-2 rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white animate-pulse">
              What&apos;s New
            </span>
          )}
        </h2>

        {hasNew && onMarkRead && filteredVersions[0] && (
          <button
            type="button"
            onClick={() => onMarkRead(filteredVersions[0].version)}
            className="rounded bg-white/10 px-3 py-1 text-xs text-white/60 hover:bg-white/20 hover:text-white"
          >
            Mark as read
          </button>
        )}
      </div>

      {/* Category filter */}
      {!categoryFilter && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveFilter(null)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
              !activeFilter
                ? "bg-white/15 text-white"
                : "bg-white/5 text-white/50 hover:text-white/80"
            )}
          >
            All
          </button>
          {allCategories.map((cat) => {
            const config = CATEGORY_CONFIG[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveFilter(activeFilter === cat ? null : cat)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  activeFilter === cat
                    ? `${config.bgColor} ${config.color}`
                    : "bg-white/5 text-white/50 hover:text-white/80"
                )}
              >
                {config.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Version list */}
      <div className="flex flex-col gap-6">
        {filteredVersions.map((ver) => (
          <div key={ver.version} className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <VersionBadge version={ver.version} isNew={isVersionNew(ver.version)} />
              <span className="text-xs text-white/40">{ver.date}</span>
              {ver.isLatest && (
                <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] font-medium text-green-400">
                  Latest
                </span>
              )}
            </div>

            <div className="ml-1 flex flex-col gap-1.5 border-l border-white/10 pl-4">
              {ver.entries.map((entry) => (
                <ChangelogEntryItem key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredVersions.length === 0 && (
        <div className="py-8 text-center text-sm text-white/40">
          No changelog entries match the current filter.
        </div>
      )}
    </div>
  );
}
