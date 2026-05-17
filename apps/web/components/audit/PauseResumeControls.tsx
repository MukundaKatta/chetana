"use client";

import { cn } from "@/lib/utils";

interface PauseResumeControlsProps {
  auditId: string;
  isRunning: boolean;
  onPause: () => void;
  onResume: () => void;
  completedCount: number;
  totalCount: number;
}

export function PauseResumeControls({
  auditId,
  isRunning,
  onPause,
  onResume,
  completedCount,
  totalCount,
}: PauseResumeControlsProps) {
  const progress =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isPaused = !isRunning && completedCount > 0 && completedCount < totalCount;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      {/* Progress bar */}
      <div className="mb-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400">
            {completedCount} of {totalCount} probes completed
          </span>
          <span className="text-xs font-medium text-gray-500">{progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isRunning
                ? "bg-gradient-to-r from-cyan-500 to-blue-500"
                : "bg-gradient-to-r from-amber-500 to-orange-500",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {isRunning ? (
          <button
            type="button"
            onClick={onPause}
            className="flex items-center gap-2 rounded-lg bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-500/25"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Pause Audit
          </button>
        ) : isPaused ? (
          <button
            type="button"
            onClick={onResume}
            className="flex items-center gap-2 rounded-lg bg-green-500/15 px-4 py-2 text-sm font-medium text-green-300 transition hover:bg-green-500/25"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Resume Audit
          </button>
        ) : null}

        {/* Paused status badge */}
        {isPaused && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
            Paused
          </span>
        )}

        {/* Running status badge */}
        {isRunning && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
            Running
          </span>
        )}
      </div>

      {/* Audit ID reference */}
      <p className="mt-3 text-[10px] font-mono text-gray-600">
        Session: {auditId}
      </p>
    </div>
  );
}
