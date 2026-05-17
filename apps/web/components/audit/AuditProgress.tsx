"use client";

import { useMemo } from "react";

interface ProbeResult {
  name: string;
  status: string; // "done" | "running" | "pending"
}

interface AuditProgressProps {
  totalProbes: number;
  completedProbes: number;
  currentProbe?: string;
  startedAt: string;
  probeResults?: ProbeResult[];
}

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function formatETA(ms: number): string {
  if (ms <= 0) return "completing...";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes > 0) {
    return `~${minutes}m ${seconds % 60}s remaining`;
  }
  return `~${seconds}s remaining`;
}

export function AuditProgress({
  totalProbes,
  completedProbes,
  currentProbe,
  startedAt,
  probeResults = [],
}: AuditProgressProps) {
  const progress = totalProbes > 0 ? completedProbes / totalProbes : 0;
  const progressPct = (progress * 100).toFixed(1);

  const { elapsed, eta } = useMemo(() => {
    const start = new Date(startedAt).getTime();
    const now = Date.now();
    const elapsedMs = now - start;

    let etaMs = 0;
    if (completedProbes > 0 && completedProbes < totalProbes) {
      const avgTimePerProbe = elapsedMs / completedProbes;
      etaMs = avgTimePerProbe * (totalProbes - completedProbes);
    }

    return { elapsed: elapsedMs, eta: etaMs };
  }, [startedAt, completedProbes, totalProbes]);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
          <span className="text-sm font-semibold text-gray-200">
            Audit in Progress
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {formatElapsed(elapsed)} elapsed
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative mb-3 h-3 w-full overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progressPct}%`,
            background:
              "linear-gradient(90deg, #06b6d4, #3b82f6, #8b5cf6)",
          }}
        />
        {/* Shimmer effect */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
            animation: "shimmer 2s infinite",
          }}
        />
      </div>

      {/* Stats row */}
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="text-gray-400">
          <span className="font-semibold text-gray-200">
            {completedProbes}
          </span>{" "}
          / {totalProbes} probes
        </span>
        <span className="font-medium text-gray-300">{progressPct}%</span>
        {completedProbes > 0 && completedProbes < totalProbes && (
          <span className="text-gray-500">{formatETA(eta)}</span>
        )}
      </div>

      {/* Current probe */}
      {currentProbe && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-950/50 px-3 py-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
            Running:
          </span>
          <span className="truncate text-xs font-medium text-cyan-300">
            {currentProbe}
          </span>
        </div>
      )}

      {/* Probe dots */}
      {probeResults.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {probeResults.map((probe, i) => (
            <div
              key={i}
              className="group relative"
              title={`${probe.name}: ${probe.status}`}
            >
              <div
                className={`h-2.5 w-2.5 rounded-full transition-all ${
                  probe.status === "done"
                    ? "bg-green-500"
                    : probe.status === "running"
                      ? "animate-pulse bg-yellow-400"
                      : "bg-gray-700"
                }`}
              />
            </div>
          ))}
        </div>
      )}

      {/* Inline shimmer keyframe */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
