"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  FileText,
  BarChart2,
  FlaskConical,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/date";

export type ActivityType = "audit" | "note" | "experiment" | "comparison";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: string;
  href?: string;
}

const ACTIVITY_ICONS: Record<ActivityType, typeof Activity> = {
  audit: BarChart2,
  note: FileText,
  experiment: FlaskConical,
  comparison: Activity,
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  audit: "bg-violet-500/15 text-violet-400",
  note: "bg-blue-500/15 text-blue-400",
  experiment: "bg-emerald-500/15 text-emerald-400",
  comparison: "bg-amber-500/15 text-amber-400",
};

/** Default auto-refresh interval: 60 seconds. */
const AUTO_REFRESH_MS = 60_000;

export interface ActivityFeedProps {
  /** Static items to display (if not using fetchUrl). */
  items?: ActivityItem[];
  /** API endpoint to fetch activity from (overrides items). */
  fetchUrl?: string;
  /** Auto-refresh interval in ms (0 to disable, default 60000). */
  refreshInterval?: number;
  /** Maximum items to display. */
  maxItems?: number;
  /** Extra className. */
  className?: string;
}

/**
 * Recent activity feed component (Issue #212).
 * Shows a list of recent activity items with type icons and relative timestamps.
 * Supports auto-refresh by polling an API endpoint.
 */
export function ActivityFeed({
  items: staticItems,
  fetchUrl,
  refreshInterval = AUTO_REFRESH_MS,
  maxItems = 10,
  className,
}: ActivityFeedProps) {
  const [items, setItems] = useState<ActivityItem[]>(staticItems ?? []);
  const [isLoading, setIsLoading] = useState(false);

  const fetchActivity = useCallback(async () => {
    if (!fetchUrl) return;
    setIsLoading(true);
    try {
      const response = await fetch(fetchUrl);
      if (response.ok) {
        const data: ActivityItem[] = await response.json();
        setItems(data.slice(0, maxItems));
      }
    } catch {
      // Silently ignore fetch errors during auto-refresh
    } finally {
      setIsLoading(false);
    }
  }, [fetchUrl, maxItems]);

  // Initial fetch
  useEffect(() => {
    if (fetchUrl) {
      fetchActivity();
    }
  }, [fetchUrl, fetchActivity]);

  // Auto-refresh
  useEffect(() => {
    if (!fetchUrl || refreshInterval <= 0) return;
    const interval = setInterval(fetchActivity, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchUrl, refreshInterval, fetchActivity]);

  // Update from static items prop
  useEffect(() => {
    if (staticItems) {
      setItems(staticItems.slice(0, maxItems));
    }
  }, [staticItems, maxItems]);

  const displayItems = items.slice(0, maxItems);

  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-white/[0.02] p-5",
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-200">
          Recent Activity
        </h3>
        {fetchUrl && (
          <button
            onClick={fetchActivity}
            disabled={isLoading}
            className="rounded-md p-1.5 text-white/30 transition-colors hover:bg-white/5 hover:text-white/60"
            aria-label="Refresh activity feed"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isLoading && "animate-spin")}
            />
          </button>
        )}
      </div>

      {displayItems.length === 0 ? (
        <p className="py-6 text-center text-xs text-white/30">
          No recent activity
        </p>
      ) : (
        <ul className="space-y-1" role="list" aria-label="Activity feed">
          {displayItems.map((item) => {
            const Icon = ACTIVITY_ICONS[item.type] ?? Activity;
            const colorClass = ACTIVITY_COLORS[item.type] ?? "bg-white/10 text-white/50";

            const content = (
              <div className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/5">
                <div
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                    colorClass
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-200">
                    {item.title}
                  </p>
                  {item.description && (
                    <p className="truncate text-xs text-white/40">
                      {item.description}
                    </p>
                  )}
                </div>
                <time
                  className="shrink-0 text-[10px] text-white/30"
                  dateTime={item.timestamp}
                  title={new Date(item.timestamp).toLocaleString()}
                >
                  {formatRelativeTime(item.timestamp)}
                </time>
              </div>
            );

            return (
              <li key={item.id}>
                {item.href ? (
                  <a href={item.href} className="block">
                    {content}
                  </a>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
