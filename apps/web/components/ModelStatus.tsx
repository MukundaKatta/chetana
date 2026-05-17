"use client";

import { cn } from "@/lib/utils";

interface Provider {
  name: string;
  status: "online" | "offline" | "degraded";
  latencyMs?: number;
}

interface ModelStatusProps {
  providers: Provider[];
}

const STATUS_CONFIG = {
  online: {
    dot: "bg-green-500",
    label: "text-green-400",
    text: "Online",
  },
  offline: {
    dot: "bg-red-500",
    label: "text-red-400",
    text: "Offline",
  },
  degraded: {
    dot: "bg-yellow-500",
    label: "text-yellow-400",
    text: "Degraded",
  },
} as const;

function formatLatency(ms: number | undefined): string {
  if (ms === undefined) return "--";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function ModelStatus({ providers }: ModelStatusProps) {
  const onlineCount = providers.filter((p) => p.status === "online").length;
  const lastChecked = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              onlineCount === providers.length
                ? "bg-green-500"
                : onlineCount > 0
                  ? "bg-yellow-500"
                  : "bg-red-500"
            )}
          />
          <h3 className="text-sm font-semibold text-neutral-100">
            API Provider Status
          </h3>
        </div>
        <span className="text-xs text-neutral-500">
          Last checked: {lastChecked}
        </span>
      </div>

      {/* Provider list */}
      <div className="space-y-2">
        {providers.map((provider) => {
          const config = STATUS_CONFIG[provider.status];
          return (
            <div
              key={provider.name}
              className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3 transition-colors hover:bg-white/[0.04]"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    config.dot,
                    provider.status === "degraded" && "animate-pulse"
                  )}
                />
                <span className="text-sm font-medium text-neutral-200">
                  {provider.name}
                </span>
              </div>

              <div className="flex items-center gap-4">
                {provider.latencyMs !== undefined && (
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      provider.latencyMs < 500
                        ? "text-neutral-500"
                        : provider.latencyMs < 2000
                          ? "text-yellow-500"
                          : "text-red-500"
                    )}
                  >
                    {formatLatency(provider.latencyMs)}
                  </span>
                )}
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                    config.label,
                    provider.status === "online" && "bg-green-500/10",
                    provider.status === "offline" && "bg-red-500/10",
                    provider.status === "degraded" && "bg-yellow-500/10"
                  )}
                >
                  {config.text}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 border-t border-white/5 pt-3">
        <p className="text-xs text-neutral-500">
          <span className="font-medium text-neutral-400">
            {onlineCount}/{providers.length}
          </span>{" "}
          providers operational
        </p>
      </div>
    </div>
  );
}
