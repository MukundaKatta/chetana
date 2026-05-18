"use client";

/**
 * Audit diff viewer (Issue #359).
 * Side-by-side score comparison with delta indicators,
 * highlight improved/degraded indicators,
 * collapsible sections per theory, summary stats, color-coded magnitude.
 */

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { Audit, Theory, TheoryScores } from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface AuditDiffViewerProps {
  /** Left audit (typically the older one). */
  auditA: Audit;
  /** Right audit (typically the newer one). */
  auditB: Audit;
  /** Label for left audit (default "Before"). */
  labelA?: string;
  /** Label for right audit (default "After"). */
  labelB?: string;
  /** Threshold for significant change (default 0.05). */
  significanceThreshold?: number;
  /** Custom class name. */
  className?: string;
}

interface ScoreDiff {
  label: string;
  key: string;
  scoreA: number;
  scoreB: number;
  delta: number;
  absDelta: number;
  direction: "improved" | "degraded" | "unchanged";
  magnitude: "negligible" | "small" | "medium" | "large";
}

interface TheorySectionData {
  theory: Theory;
  name: string;
  diff: ScoreDiff;
  indicators: ScoreDiff[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const THEORY_NAMES: Record<Theory, string> = {
  gwt: "Global Workspace Theory",
  iit: "Integrated Information Theory",
  hot: "Higher-Order Theories",
  rpt: "Recurrent Processing Theory",
  pp: "Predictive Processing",
  ast: "Attention Schema Theory",
};

const THEORIES: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function getMagnitude(
  absDelta: number,
  threshold: number
): ScoreDiff["magnitude"] {
  if (absDelta < threshold) return "negligible";
  if (absDelta < threshold * 3) return "small";
  if (absDelta < threshold * 6) return "medium";
  return "large";
}

function getDirection(
  delta: number,
  threshold: number
): ScoreDiff["direction"] {
  if (delta > threshold) return "improved";
  if (delta < -threshold) return "degraded";
  return "unchanged";
}

function magnitudeColor(magnitude: ScoreDiff["magnitude"]): string {
  switch (magnitude) {
    case "negligible":
      return "text-gray-400";
    case "small":
      return "text-yellow-500";
    case "medium":
      return "text-orange-500";
    case "large":
      return "text-red-500";
  }
}

function directionIcon(direction: ScoreDiff["direction"]): string {
  switch (direction) {
    case "improved":
      return "▲";
    case "degraded":
      return "▼";
    case "unchanged":
      return "—";
  }
}

function directionColor(direction: ScoreDiff["direction"]): string {
  switch (direction) {
    case "improved":
      return "text-green-600";
    case "degraded":
      return "text-red-600";
    case "unchanged":
      return "text-gray-400";
  }
}

function formatScore(score: number | null): string {
  if (score === null) return "N/A";
  return (score * 100).toFixed(1) + "%";
}

function formatDelta(delta: number): string {
  const sign = delta > 0 ? "+" : "";
  return sign + (delta * 100).toFixed(1) + "%";
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function AuditDiffViewer({
  auditA,
  auditB,
  labelA = "Before",
  labelB = "After",
  significanceThreshold = 0.05,
  className,
}: AuditDiffViewerProps) {
  const [collapsedTheories, setCollapsedTheories] = useState<Set<Theory>>(
    new Set()
  );

  const toggleTheory = useCallback((theory: Theory) => {
    setCollapsedTheories((prev) => {
      const next = new Set(prev);
      if (next.has(theory)) next.delete(theory);
      else next.add(theory);
      return next;
    });
  }, []);

  // Overall diff
  const overallDiff = useMemo<ScoreDiff>(() => {
    const scoreA = auditA.overallScore ?? 0;
    const scoreB = auditB.overallScore ?? 0;
    const delta = scoreB - scoreA;
    const absDelta = Math.abs(delta);
    return {
      label: "Overall Score",
      key: "overall",
      scoreA,
      scoreB,
      delta,
      absDelta,
      direction: getDirection(delta, significanceThreshold),
      magnitude: getMagnitude(absDelta, significanceThreshold),
    };
  }, [auditA, auditB, significanceThreshold]);

  // Theory-level diffs
  const theorySections = useMemo<TheorySectionData[]>(() => {
    const scoresA = auditA.theoryScores ?? ({} as TheoryScores);
    const scoresB = auditB.theoryScores ?? ({} as TheoryScores);
    const indicatorsA = auditA.indicatorScores ?? {};
    const indicatorsB = auditB.indicatorScores ?? {};

    return THEORIES.map((theory) => {
      const sA = scoresA[theory] ?? 0;
      const sB = scoresB[theory] ?? 0;
      const delta = sB - sA;
      const absDelta = Math.abs(delta);

      // Collect indicators for this theory
      const indicatorKeys = new Set([
        ...Object.keys(indicatorsA),
        ...Object.keys(indicatorsB),
      ]);

      const prefix = theory.toUpperCase() + "-";
      const theoryIndicators = Array.from(indicatorKeys)
        .filter((k) => k.startsWith(prefix) || k.startsWith(theory.toUpperCase()))
        .map((key): ScoreDiff => {
          const iA = indicatorsA[key] ?? 0;
          const iB = indicatorsB[key] ?? 0;
          const iDelta = iB - iA;
          const iAbsDelta = Math.abs(iDelta);
          return {
            label: key,
            key,
            scoreA: iA,
            scoreB: iB,
            delta: iDelta,
            absDelta: iAbsDelta,
            direction: getDirection(iDelta, significanceThreshold),
            magnitude: getMagnitude(iAbsDelta, significanceThreshold),
          };
        });

      return {
        theory,
        name: THEORY_NAMES[theory],
        diff: {
          label: THEORY_NAMES[theory],
          key: theory,
          scoreA: sA,
          scoreB: sB,
          delta,
          absDelta,
          direction: getDirection(delta, significanceThreshold),
          magnitude: getMagnitude(absDelta, significanceThreshold),
        },
        indicators: theoryIndicators,
      };
    });
  }, [auditA, auditB, significanceThreshold]);

  // Summary stats
  const summary = useMemo(() => {
    const allDiffs = theorySections.map((s) => s.diff);
    const improved = allDiffs.filter((d) => d.direction === "improved").length;
    const degraded = allDiffs.filter((d) => d.direction === "degraded").length;
    const unchanged = allDiffs.filter((d) => d.direction === "unchanged").length;
    const avgDelta =
      allDiffs.reduce((s, d) => s + d.delta, 0) / (allDiffs.length || 1);
    return { improved, degraded, unchanged, avgDelta };
  }, [theorySections]);

  return (
    <div className={cn("rounded-lg border bg-white shadow-sm", className)}>
      {/* Header */}
      <div className="border-b p-4">
        <h3 className="text-lg font-semibold">Audit Comparison</h3>
        <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">{labelA}:</span>{" "}
            <span className="font-medium">{auditA.modelName}</span>
          </div>
          <div className="text-center font-medium">vs</div>
          <div className="text-right">
            <span className="text-gray-500">{labelB}:</span>{" "}
            <span className="font-medium">{auditB.modelName}</span>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-2 border-b bg-gray-50 p-4 text-center text-sm">
        <div>
          <div className="text-2xl font-bold text-green-600">
            {summary.improved}
          </div>
          <div className="text-gray-500">Improved</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-red-600">
            {summary.degraded}
          </div>
          <div className="text-gray-500">Degraded</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-400">
            {summary.unchanged}
          </div>
          <div className="text-gray-500">Unchanged</div>
        </div>
        <div>
          <div
            className={cn(
              "text-2xl font-bold",
              summary.avgDelta > 0
                ? "text-green-600"
                : summary.avgDelta < 0
                  ? "text-red-600"
                  : "text-gray-400"
            )}
          >
            {formatDelta(summary.avgDelta)}
          </div>
          <div className="text-gray-500">Avg Delta</div>
        </div>
      </div>

      {/* Overall score */}
      <div className="border-b p-4">
        <DiffRow diff={overallDiff} isHeader />
      </div>

      {/* Theory sections */}
      {theorySections.map((section) => {
        const isCollapsed = collapsedTheories.has(section.theory);
        return (
          <div key={section.theory} className="border-b last:border-b-0">
            <button
              onClick={() => toggleTheory(section.theory)}
              className="flex w-full items-center gap-2 p-4 text-left hover:bg-gray-50"
              aria-expanded={!isCollapsed}
            >
              <span
                className="text-xs text-gray-400"
                style={{
                  transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                  display: "inline-block",
                }}
              >
                {"▼"}
              </span>
              <DiffRow diff={section.diff} isHeader />
            </button>

            {!isCollapsed && section.indicators.length > 0 && (
              <div className="bg-gray-50 px-4 pb-4">
                {section.indicators.map((ind) => (
                  <div key={ind.key} className="py-1 pl-6">
                    <DiffRow diff={ind} />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DiffRow sub-component                                             */
/* ------------------------------------------------------------------ */

function DiffRow({
  diff,
  isHeader = false,
}: {
  diff: ScoreDiff;
  isHeader?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-4 items-center gap-2 text-sm",
        isHeader && "font-medium"
      )}
    >
      <div className="truncate">{diff.label}</div>
      <div className="text-center tabular-nums">{formatScore(diff.scoreA)}</div>
      <div className="text-center tabular-nums">{formatScore(diff.scoreB)}</div>
      <div className="flex items-center justify-end gap-1 tabular-nums">
        <span className={directionColor(diff.direction)}>
          {directionIcon(diff.direction)}
        </span>
        <span className={directionColor(diff.direction)}>
          {formatDelta(diff.delta)}
        </span>
        <span
          className={cn(
            "ml-1 inline-block h-2 w-2 rounded-full",
            magnitudeColor(diff.magnitude)
          )}
          style={{
            backgroundColor:
              diff.magnitude === "negligible"
                ? "#d1d5db"
                : diff.magnitude === "small"
                  ? "#eab308"
                  : diff.magnitude === "medium"
                    ? "#f97316"
                    : "#ef4444",
          }}
          title={`Magnitude: ${diff.magnitude}`}
        />
      </div>
    </div>
  );
}
