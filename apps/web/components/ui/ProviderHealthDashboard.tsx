"use client";

/**
 * Issue #421 - Model provider health dashboard
 *
 * Status indicators: healthy/degraded/down,
 * latency sparklines, error rate over time,
 * uptime percentage, auto-refresh.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { ModelProvider } from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type HealthStatus = "healthy" | "degraded" | "down" | "unknown";

export interface LatencyDataPoint {
  timestamp: number;
  latencyMs: number;
}

export interface ErrorRateDataPoint {
  timestamp: number;
  errorRate: number;
}

export interface ProviderHealth {
  provider: ModelProvider;
  displayName: string;
  status: HealthStatus;
  latencyMs: number | null;
  latencyHistory: LatencyDataPoint[];
  errorRate: number;
  errorRateHistory: ErrorRateDataPoint[];
  uptimePercent: number;
  lastChecked: number;
  message?: string;
}

export interface ProviderHealthDashboardProps {
  /** Initial provider health data. If omitted, will fetch via fetchHealth. */
  providers?: ProviderHealth[];
  /** Function to fetch live health data. */
  fetchHealth?: () => Promise<ProviderHealth[]>;
  /** Auto-refresh interval in ms (default 30000). Set to 0 to disable. */
  refreshInterval?: number;
  /** Called when a provider row is clicked. */
  onProviderClick?: (provider: ProviderHealth) => void;
  /** Compact mode (fewer details). */
  compact?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG: Record<HealthStatus, { label: string; color: string; dotColor: string; bgColor: string }> = {
  healthy: {
    label: "Healthy",
    color: "text-green-400",
    dotColor: "bg-green-400",
    bgColor: "bg-green-500/10",
  },
  degraded: {
    label: "Degraded",
    color: "text-yellow-400",
    dotColor: "bg-yellow-400",
    bgColor: "bg-yellow-500/10",
  },
  down: {
    label: "Down",
    color: "text-red-400",
    dotColor: "bg-red-400",
    bgColor: "bg-red-500/10",
  },
  unknown: {
    label: "Unknown",
    color: "text-gray-400",
    dotColor: "bg-gray-400",
    bgColor: "bg-gray-500/10",
  },
};

const PROVIDER_NAMES: Record<ModelProvider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google AI",
  ollama: "Ollama (Local)",
  mistral: "Mistral AI",
  deepseek: "DeepSeek",
  openrouter: "OpenRouter",
};

const DEFAULT_REFRESH_INTERVAL = 30_000;
const SPARKLINE_WIDTH = 120;
const SPARKLINE_HEIGHT = 30;

/* ------------------------------------------------------------------ */
/*  Mini Sparkline (inline)                                           */
/* ------------------------------------------------------------------ */

function InlineSparkline({
  data,
  width = SPARKLINE_WIDTH,
  height = SPARKLINE_HEIGHT,
  color,
}: {
  data: number[];
  width?: number;
  height?: number;
  color: string;
}) {
  if (data.length < 2) {
    return (
      <svg width={width} height={height} className="opacity-40">
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke={color} strokeWidth={1} strokeDasharray="4 2" />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;
  const usableH = height - pad * 2;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = pad + usableH - ((v - min) / range) * usableH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg width={width} height={height}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(" ")}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Status Dot                                                        */
/* ------------------------------------------------------------------ */

function StatusDot({ status }: { status: HealthStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className="relative flex h-3 w-3">
      {status === "healthy" && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
            config.dotColor,
          )}
        />
      )}
      <span className={cn("relative inline-flex h-3 w-3 rounded-full", config.dotColor)} />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function ProviderHealthDashboard({
  providers: initialProviders,
  fetchHealth,
  refreshInterval = DEFAULT_REFRESH_INTERVAL,
  onProviderClick,
  compact = false,
  className,
}: ProviderHealthDashboardProps) {
  const [providers, setProviders] = useState<ProviderHealth[]>(initialProviders ?? []);
  const [loading, setLoading] = useState(!initialProviders);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!fetchHealth) return;
    try {
      setLoading(true);
      const data = await fetchHealth();
      setProviders(data);
      setLastRefresh(Date.now());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch health data");
    } finally {
      setLoading(false);
    }
  }, [fetchHealth]);

  // Initial fetch
  useEffect(() => {
    if (!initialProviders && fetchHealth) {
      void refresh();
    }
  }, [initialProviders, fetchHealth, refresh]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0 || !fetchHealth) return;

    intervalRef.current = setInterval(() => {
      void refresh();
    }, refreshInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshInterval, fetchHealth, refresh]);

  // Update from props
  useEffect(() => {
    if (initialProviders) {
      setProviders(initialProviders);
    }
  }, [initialProviders]);

  const sortedProviders = useMemo(() => {
    const statusOrder: Record<HealthStatus, number> = { down: 0, degraded: 1, unknown: 2, healthy: 3 };
    return [...providers].sort(
      (a, b) => (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2),
    );
  }, [providers]);

  const overallStatus = useMemo((): HealthStatus => {
    if (providers.length === 0) return "unknown";
    if (providers.every((p) => p.status === "healthy")) return "healthy";
    if (providers.some((p) => p.status === "down")) return "down";
    return "degraded";
  }, [providers]);

  const formatLatency = (ms: number | null): string => {
    if (ms === null) return "--";
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const timeSinceRefresh = useMemo(() => {
    const diff = Date.now() - lastRefresh;
    if (diff < 60_000) return "just now";
    return `${Math.floor(diff / 60_000)}m ago`;
  }, [lastRefresh]);

  if (error && providers.length === 0) {
    return (
      <div className={cn("rounded-lg border border-red-500/30 bg-red-500/5 p-4", className)}>
        <p className="text-red-400 text-sm">{error}</p>
        {fetchHealth && (
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-2 text-xs text-white/60 hover:text-white underline"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-white/10 bg-white/5", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <StatusDot status={overallStatus} />
          <h3 className="text-sm font-medium text-white">Provider Health</h3>
          {loading && (
            <div className="h-3 w-3 animate-spin rounded-full border border-white/20 border-t-white/60" />
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-white/40">
          <span>Updated {timeSinceRefresh}</span>
          {fetchHealth && (
            <button
              type="button"
              onClick={() => void refresh()}
              className="hover:text-white/70 transition-colors"
              aria-label="Refresh"
            >
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Provider rows */}
      <div className="divide-y divide-white/5">
        {sortedProviders.map((provider) => {
          const statusCfg = STATUS_CONFIG[provider.status];
          const latencyData = provider.latencyHistory.map((d) => d.latencyMs);
          const errorData = provider.errorRateHistory.map((d) => d.errorRate);

          return (
            <button
              key={provider.provider}
              type="button"
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3 text-left transition-colors",
                onProviderClick ? "hover:bg-white/5 cursor-pointer" : "cursor-default",
              )}
              onClick={() => onProviderClick?.(provider)}
            >
              {/* Status dot & name */}
              <div className="flex items-center gap-2 min-w-[140px]">
                <StatusDot status={provider.status} />
                <div>
                  <div className="text-sm font-medium text-white">
                    {provider.displayName || PROVIDER_NAMES[provider.provider] || provider.provider}
                  </div>
                  <div className={cn("text-xs", statusCfg.color)}>{statusCfg.label}</div>
                </div>
              </div>

              {/* Latency */}
              <div className={cn("flex items-center gap-2", compact ? "hidden sm:flex" : "")}>
                <div className="text-right min-w-[60px]">
                  <div className="text-xs text-white/40">Latency</div>
                  <div className="text-sm text-white/80 tabular-nums">
                    {formatLatency(provider.latencyMs)}
                  </div>
                </div>
                {!compact && (
                  <InlineSparkline
                    data={latencyData}
                    color={
                      provider.latencyMs !== null && provider.latencyMs > 5000
                        ? "#f87171"
                        : "#34d399"
                    }
                  />
                )}
              </div>

              {/* Error rate */}
              <div className={cn("flex items-center gap-2", compact ? "hidden md:flex" : "")}>
                <div className="text-right min-w-[60px]">
                  <div className="text-xs text-white/40">Errors</div>
                  <div
                    className={cn(
                      "text-sm tabular-nums",
                      provider.errorRate > 5
                        ? "text-red-400"
                        : provider.errorRate > 1
                          ? "text-yellow-400"
                          : "text-white/80",
                    )}
                  >
                    {provider.errorRate.toFixed(1)}%
                  </div>
                </div>
                {!compact && (
                  <InlineSparkline
                    data={errorData}
                    color={provider.errorRate > 5 ? "#f87171" : "#fbbf24"}
                  />
                )}
              </div>

              {/* Uptime */}
              <div className="text-right min-w-[60px]">
                <div className="text-xs text-white/40">Uptime</div>
                <div
                  className={cn(
                    "text-sm tabular-nums",
                    provider.uptimePercent >= 99.9
                      ? "text-green-400"
                      : provider.uptimePercent >= 99
                        ? "text-yellow-400"
                        : "text-red-400",
                  )}
                >
                  {provider.uptimePercent.toFixed(2)}%
                </div>
              </div>

              {/* Message */}
              {provider.message && !compact && (
                <div className="text-xs text-white/40 truncate max-w-[200px]">
                  {provider.message}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {providers.length === 0 && !loading && (
        <div className="px-4 py-8 text-center text-sm text-white/40">
          No provider data available
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Create a mock ProviderHealth for testing/defaults. */
export function createProviderHealth(
  provider: ModelProvider,
  overrides: Partial<ProviderHealth> = {},
): ProviderHealth {
  return {
    provider,
    displayName: PROVIDER_NAMES[provider] ?? provider,
    status: "unknown",
    latencyMs: null,
    latencyHistory: [],
    errorRate: 0,
    errorRateHistory: [],
    uptimePercent: 100,
    lastChecked: Date.now(),
    ...overrides,
  };
}

/** Determine status from latency and error rate. */
export function deriveStatus(latencyMs: number | null, errorRate: number): HealthStatus {
  if (latencyMs === null) return "unknown";
  if (errorRate > 10 || latencyMs > 10_000) return "down";
  if (errorRate > 2 || latencyMs > 5_000) return "degraded";
  return "healthy";
}

/** Calculate uptime from a boolean availability log. */
export function calculateUptime(checks: boolean[]): number {
  if (checks.length === 0) return 100;
  const up = checks.filter(Boolean).length;
  return (up / checks.length) * 100;
}
