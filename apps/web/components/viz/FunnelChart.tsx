"use client";

/**
 * Issue #420 - Funnel chart for audit pipeline
 *
 * Stages: scheduled -> running -> scored -> reviewed -> published
 * Count/percentage, drop-off highlighting,
 * click to filter, animated transitions.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type AuditPipelineStage =
  | "scheduled"
  | "running"
  | "scored"
  | "reviewed"
  | "published";

export interface FunnelStage {
  id: AuditPipelineStage;
  label: string;
  count: number;
  color?: string;
}

export interface FunnelChartProps {
  stages: FunnelStage[];
  /** Called when a stage bar is clicked. */
  onStageClick?: (stage: FunnelStage) => void;
  /** Currently selected stage (for highlighting). */
  selectedStage?: AuditPipelineStage | null;
  /** Show percentage labels. */
  showPercentages?: boolean;
  /** Show drop-off between stages. */
  showDropOff?: boolean;
  /** Animate bars on mount / data change. */
  animated?: boolean;
  /** Chart height in px (default 320). */
  height?: number;
  /** Orientation: vertical (default) or horizontal. */
  orientation?: "vertical" | "horizontal";
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const DEFAULT_COLORS: Record<AuditPipelineStage, string> = {
  scheduled: "#60a5fa",
  running: "#a78bfa",
  scored: "#34d399",
  reviewed: "#fbbf24",
  published: "#f87171",
};

const STAGE_LABELS: Record<AuditPipelineStage, string> = {
  scheduled: "Scheduled",
  running: "Running",
  scored: "Scored",
  reviewed: "Reviewed",
  published: "Published",
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function FunnelChart({
  stages,
  onStageClick,
  selectedStage = null,
  showPercentages = true,
  showDropOff = true,
  animated = true,
  height = 320,
  orientation = "vertical",
  className,
}: FunnelChartProps) {
  const [animatedWidths, setAnimatedWidths] = useState<number[]>(
    stages.map(() => 0),
  );
  const animationRef = useRef<number | null>(null);

  const maxCount = useMemo(
    () => Math.max(...stages.map((s) => s.count), 1),
    [stages],
  );

  const percentages = useMemo(() => {
    if (stages.length === 0) return [];
    const first = stages[0].count || 1;
    return stages.map((s) => (s.count / first) * 100);
  }, [stages]);

  const dropOffs = useMemo(() => {
    return stages.map((s, i) => {
      if (i === 0) return 0;
      const prev = stages[i - 1].count;
      if (prev === 0) return 0;
      return ((prev - s.count) / prev) * 100;
    });
  }, [stages]);

  // Animate widths on mount/data change
  useEffect(() => {
    if (!animated) {
      setAnimatedWidths(stages.map((s) => (s.count / maxCount) * 100));
      return;
    }

    // Reset
    setAnimatedWidths(stages.map(() => 0));

    const targetWidths = stages.map((s) => (s.count / maxCount) * 100);
    const startTime = performance.now();
    const duration = 600;

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - (1 - progress) ** 3;

      setAnimatedWidths(targetWidths.map((w) => w * eased));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [stages, maxCount, animated]);

  const handleClick = useCallback(
    (stage: FunnelStage) => {
      onStageClick?.(stage);
    },
    [onStageClick],
  );

  if (stages.length === 0) {
    return (
      <div className={cn("flex items-center justify-center text-white/40", className)} style={{ height }}>
        No pipeline data available
      </div>
    );
  }

  const isVertical = orientation === "vertical";

  return (
    <div
      className={cn(
        "flex gap-1",
        isVertical ? "flex-col" : "flex-row items-end",
        className,
      )}
      style={{ height }}
      role="img"
      aria-label="Audit pipeline funnel chart"
    >
      {stages.map((stage, i) => {
        const barWidth = animatedWidths[i] ?? 0;
        const color = stage.color ?? DEFAULT_COLORS[stage.id] ?? "#888";
        const isSelected = selectedStage === stage.id;
        const pct = percentages[i];
        const dropOff = dropOffs[i];

        return (
          <div
            key={stage.id}
            className={cn(
              "relative group",
              isVertical ? "flex items-center gap-3" : "flex flex-col items-center gap-1",
            )}
            style={isVertical ? { height: `${100 / stages.length}%` } : { width: `${100 / stages.length}%` }}
          >
            {/* Label */}
            <div
              className={cn(
                "shrink-0 text-xs font-medium",
                isSelected ? "text-white" : "text-white/60",
                isVertical ? "w-20 text-right" : "w-full text-center",
              )}
            >
              {stage.label || STAGE_LABELS[stage.id]}
            </div>

            {/* Bar container */}
            <div
              className={cn(
                "relative flex-1 flex items-center",
                isVertical ? "w-full" : "h-full w-full flex-col justify-end",
              )}
            >
              {/* Bar */}
              <button
                type="button"
                onClick={() => handleClick(stage)}
                className={cn(
                  "relative rounded-sm transition-all duration-200",
                  "hover:brightness-125 focus:outline-none focus:ring-2 focus:ring-white/40",
                  isSelected && "ring-2 ring-white/60",
                  onStageClick ? "cursor-pointer" : "cursor-default",
                )}
                style={
                  isVertical
                    ? {
                        width: `${barWidth}%`,
                        height: "70%",
                        backgroundColor: color,
                        opacity: isSelected ? 1 : 0.8,
                        minWidth: stage.count > 0 ? 4 : 0,
                      }
                    : {
                        height: `${barWidth}%`,
                        width: "70%",
                        backgroundColor: color,
                        opacity: isSelected ? 1 : 0.8,
                        minHeight: stage.count > 0 ? 4 : 0,
                      }
                }
                aria-label={`${stage.label || STAGE_LABELS[stage.id]}: ${stage.count} (${pct.toFixed(1)}%)`}
              >
                {/* Tooltip on hover */}
                <div
                  className={cn(
                    "absolute z-10 hidden group-hover:block",
                    "bg-gray-900 border border-white/20 rounded px-2 py-1",
                    "text-xs text-white whitespace-nowrap shadow-lg",
                    isVertical ? "left-full ml-2 top-1/2 -translate-y-1/2" : "bottom-full mb-2 left-1/2 -translate-x-1/2",
                  )}
                >
                  <div className="font-medium">{stage.label || STAGE_LABELS[stage.id]}</div>
                  <div>Count: {stage.count.toLocaleString()}</div>
                  {showPercentages && <div>{pct.toFixed(1)}% of total</div>}
                  {showDropOff && i > 0 && (
                    <div className="text-red-400">
                      Drop-off: {dropOff.toFixed(1)}%
                    </div>
                  )}
                </div>
              </button>

              {/* Count & percentage */}
              <div
                className={cn(
                  "text-xs tabular-nums",
                  isVertical ? "ml-2 shrink-0" : "mt-1 shrink-0",
                )}
              >
                <span className="text-white/80 font-medium">
                  {stage.count.toLocaleString()}
                </span>
                {showPercentages && (
                  <span className="text-white/40 ml-1">({pct.toFixed(0)}%)</span>
                )}
              </div>
            </div>

            {/* Drop-off indicator */}
            {showDropOff && i > 0 && dropOff > 0 && isVertical && (
              <div
                className={cn(
                  "absolute -top-1 right-0 text-[10px] tabular-nums",
                  dropOff > 50 ? "text-red-400" : dropOff > 25 ? "text-yellow-400" : "text-white/40",
                )}
              >
                -{dropOff.toFixed(0)}%
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Create default pipeline stages from audit counts. */
export function createPipelineStages(counts: {
  scheduled: number;
  running: number;
  scored: number;
  reviewed: number;
  published: number;
}): FunnelStage[] {
  const stageIds: AuditPipelineStage[] = [
    "scheduled",
    "running",
    "scored",
    "reviewed",
    "published",
  ];

  return stageIds.map((id) => ({
    id,
    label: STAGE_LABELS[id],
    count: counts[id],
    color: DEFAULT_COLORS[id],
  }));
}

/** Calculate conversion rate between two stages. */
export function conversionRate(from: number, to: number): number {
  if (from === 0) return 0;
  return (to / from) * 100;
}

/** Calculate overall pipeline efficiency (last stage / first stage). */
export function pipelineEfficiency(stages: FunnelStage[]): number {
  if (stages.length < 2) return 100;
  const first = stages[0].count;
  const last = stages[stages.length - 1].count;
  if (first === 0) return 0;
  return (last / first) * 100;
}
