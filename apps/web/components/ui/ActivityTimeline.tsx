"use client";

/**
 * Issue #435 - User activity timeline
 *
 * Chronological feed, activity type icons,
 * expandable details, filter by type/date,
 * pagination.
 */

import {
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type ActivityType =
  | "audit-started"
  | "audit-completed"
  | "audit-failed"
  | "probe-created"
  | "probe-updated"
  | "model-added"
  | "model-removed"
  | "export-generated"
  | "note-created"
  | "experiment-started"
  | "experiment-completed"
  | "settings-changed"
  | "login"
  | "comment";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  details?: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  entityId?: string;
  entityType?: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityFilter {
  types?: ActivityType[];
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  search?: string;
}

export interface ActivityTimelineProps {
  activities: ActivityItem[];
  /** Items per page (default 20). */
  pageSize?: number;
  /** Initial filter. */
  filter?: ActivityFilter;
  /** Show filter controls. */
  showFilters?: boolean;
  /** Called when an activity item is clicked. */
  onItemClick?: (item: ActivityItem) => void;
  /** Called when requesting more items (for server-side pagination). */
  onLoadMore?: () => void;
  /** Whether more items are available. */
  hasMore?: boolean;
  /** Whether items are loading. */
  isLoading?: boolean;
  /** Compact mode (less padding). */
  compact?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

interface ActivityTypeConfig {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

const ACTIVITY_CONFIG: Record<ActivityType, ActivityTypeConfig> = {
  "audit-started": {
    label: "Audit Started",
    icon: "▶",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
  },
  "audit-completed": {
    label: "Audit Completed",
    icon: "✓",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
  },
  "audit-failed": {
    label: "Audit Failed",
    icon: "✗",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
  },
  "probe-created": {
    label: "Probe Created",
    icon: "+",
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
  },
  "probe-updated": {
    label: "Probe Updated",
    icon: "✎",
    color: "text-purple-300",
    bgColor: "bg-purple-500/15",
  },
  "model-added": {
    label: "Model Added",
    icon: "➕",
    color: "text-teal-400",
    bgColor: "bg-teal-500/20",
  },
  "model-removed": {
    label: "Model Removed",
    icon: "➖",
    color: "text-gray-400",
    bgColor: "bg-gray-500/20",
  },
  "export-generated": {
    label: "Export Generated",
    icon: "↓",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
  },
  "note-created": {
    label: "Note Created",
    icon: "✍",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
  },
  "experiment-started": {
    label: "Experiment Started",
    icon: "⚗",
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/20",
  },
  "experiment-completed": {
    label: "Experiment Completed",
    icon: "✓",
    color: "text-indigo-300",
    bgColor: "bg-indigo-500/15",
  },
  "settings-changed": {
    label: "Settings Changed",
    icon: "⚙",
    color: "text-gray-400",
    bgColor: "bg-gray-500/15",
  },
  login: {
    label: "Login",
    icon: "→",
    color: "text-white/60",
    bgColor: "bg-white/10",
  },
  comment: {
    label: "Comment",
    icon: "✉",
    color: "text-sky-400",
    bgColor: "bg-sky-500/20",
  },
};

const ALL_ACTIVITY_TYPES = Object.keys(ACTIVITY_CONFIG) as ActivityType[];

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function applyFilter(items: ActivityItem[], filter: ActivityFilter): ActivityItem[] {
  return items.filter((item) => {
    if (filter.types && filter.types.length > 0 && !filter.types.includes(item.type)) {
      return false;
    }
    if (filter.dateFrom && item.timestamp < filter.dateFrom) return false;
    if (filter.dateTo && item.timestamp > filter.dateTo) return false;
    if (filter.userId && item.userId !== filter.userId) return false;
    if (filter.search) {
      const q = filter.search.toLowerCase();
      if (
        !item.title.toLowerCase().includes(q) &&
        !(item.description ?? "").toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });
}

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const ts = new Date(timestamp).getTime();
  const diff = now - ts;

  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function groupByDate(items: ActivityItem[]): Map<string, ActivityItem[]> {
  const groups = new Map<string, ActivityItem[]>();
  for (const item of items) {
    const dateKey = new Date(item.timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const group = groups.get(dateKey) ?? [];
    group.push(item);
    groups.set(dateKey, group);
  }
  return groups;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function ActivityTimeline({
  activities,
  pageSize = 20,
  filter: externalFilter = {},
  showFilters = true,
  onItemClick,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  compact = false,
  className,
}: ActivityTimelineProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [internalFilter, setInternalFilter] = useState<ActivityFilter>(externalFilter);

  const filter = useMemo(
    () => ({ ...externalFilter, ...internalFilter }),
    [externalFilter, internalFilter],
  );

  const filteredActivities = useMemo(
    () => applyFilter(activities, filter),
    [activities, filter],
  );

  const paginatedActivities = useMemo(
    () => filteredActivities.slice(0, currentPage * pageSize),
    [filteredActivities, currentPage, pageSize],
  );

  const dateGroups = useMemo(
    () => groupByDate(paginatedActivities),
    [paginatedActivities],
  );

  const hasMorePages = paginatedActivities.length < filteredActivities.length || hasMore;

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleLoadMore = useCallback(() => {
    if (paginatedActivities.length < filteredActivities.length) {
      setCurrentPage((p) => p + 1);
    } else if (onLoadMore) {
      onLoadMore();
    }
  }, [paginatedActivities.length, filteredActivities.length, onLoadMore]);

  const handleTypeToggle = useCallback((type: ActivityType) => {
    setInternalFilter((prev) => {
      const currentTypes = prev.types ?? [];
      const hasType = currentTypes.includes(type);
      return {
        ...prev,
        types: hasType
          ? currentTypes.filter((t) => t !== type)
          : [...currentTypes, type],
      };
    });
    setCurrentPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setInternalFilter({});
    setCurrentPage(1);
  }, []);

  return (
    <div className={cn("rounded-lg border border-white/10 bg-white/5", className)}>
      {/* Filters */}
      {showFilters && (
        <div className="border-b border-white/10 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/50">Filter by type:</span>
            {(internalFilter.types?.length ?? 0) > 0 && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-[10px] text-white/40 hover:text-white/60"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {ALL_ACTIVITY_TYPES.map((type) => {
              const config = ACTIVITY_CONFIG[type];
              const isActive =
                !internalFilter.types ||
                internalFilter.types.length === 0 ||
                internalFilter.types.includes(type);

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeToggle(type)}
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded transition-colors",
                    isActive
                      ? `${config.bgColor} ${config.color}`
                      : "bg-white/5 text-white/30",
                  )}
                >
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className={cn("px-4", compact ? "py-2" : "py-4")}>
        {Array.from(dateGroups.entries()).map(([dateLabel, items]) => (
          <div key={dateLabel} className="mb-4 last:mb-0">
            {/* Date header */}
            <div className="text-xs font-medium text-white/40 mb-2 sticky top-0 bg-inherit">
              {dateLabel}
            </div>

            {/* Items */}
            <div className="relative ml-4 border-l border-white/10">
              {items.map((item) => {
                const config = ACTIVITY_CONFIG[item.type];
                const isExpanded = expandedIds.has(item.id);
                const hasDetails = Boolean(item.details);

                return (
                  <div key={item.id} className="relative pl-6 pb-4 last:pb-0">
                    {/* Timeline dot */}
                    <div
                      className={cn(
                        "absolute left-0 -translate-x-1/2 flex items-center justify-center rounded-full",
                        compact ? "w-5 h-5 text-[9px]" : "w-6 h-6 text-[10px]",
                        config.bgColor,
                        config.color,
                      )}
                    >
                      {config.icon}
                    </div>

                    {/* Content */}
                    <div
                      className={cn(
                        "group",
                        onItemClick || hasDetails
                          ? "cursor-pointer"
                          : "cursor-default",
                      )}
                      onClick={() => {
                        if (hasDetails) toggleExpanded(item.id);
                        onItemClick?.(item);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          if (hasDetails) toggleExpanded(item.id);
                          onItemClick?.(item);
                        }
                      }}
                      role={hasDetails ? "button" : undefined}
                      tabIndex={hasDetails ? 0 : undefined}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div
                            className={cn(
                              "text-sm text-white/80 font-medium",
                              !compact && "mb-0.5",
                            )}
                          >
                            {item.title}
                          </div>

                          {item.description && (
                            <div className="text-xs text-white/50 line-clamp-2">
                              {item.description}
                            </div>
                          )}

                          {item.userName && (
                            <div className="text-[10px] text-white/30 mt-0.5">
                              by {item.userName}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-white/30 tabular-nums">
                            {formatRelativeTime(item.timestamp)}
                          </span>

                          {hasDetails && (
                            <span
                              className={cn(
                                "text-white/30 text-xs transition-transform",
                                isExpanded && "rotate-90",
                              )}
                            >
                              {"▸"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expandable details */}
                      {hasDetails && isExpanded && (
                        <div className="mt-2 p-2 rounded bg-white/5 border border-white/10 text-xs text-white/60 whitespace-pre-wrap">
                          {item.details}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Empty state */}
        {paginatedActivities.length === 0 && !isLoading && (
          <div className="text-center text-sm text-white/40 py-8">
            No activities found
          </div>
        )}

        {/* Load more */}
        {hasMorePages && (
          <div className="flex justify-center pt-4">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoading}
              className={cn(
                "text-xs text-white/50 hover:text-white/80 px-4 py-2 rounded",
                "border border-white/10 hover:border-white/20 transition-colors",
                isLoading && "opacity-50 cursor-not-allowed",
              )}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border border-white/20 border-t-white/60" />
                  Loading...
                </span>
              ) : (
                `Show more (${filteredActivities.length - paginatedActivities.length} remaining)`
              )}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/5 px-4 py-2 text-[10px] text-white/30">
        {filteredActivities.length} activit{filteredActivities.length !== 1 ? "ies" : "y"}
        {filteredActivities.length !== activities.length &&
          ` (${activities.length} total)`}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

export function getActivityConfig(type: ActivityType): ActivityTypeConfig {
  return ACTIVITY_CONFIG[type];
}

export { ALL_ACTIVITY_TYPES, formatRelativeTime };
