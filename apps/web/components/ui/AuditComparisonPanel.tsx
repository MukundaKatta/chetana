"use client";

/**
 * Issue #483 - Side-by-side audit comparison
 *
 * Split view with sync scroll, difference highlighting,
 * theory tabs, delta summary, swap left/right.
 */

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { cn } from "@/lib/utils";
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type Theory = "gwt" | "iit" | "hot" | "rpt" | "pp" | "ast";

export interface AuditProbeResult {
  probeId: string;
  probeName: string;
  theory: Theory;
  score: number;
  confidence: number;
  response: string;
  analysis?: string;
}

export interface AuditSummary {
  id: string;
  modelName: string;
  overallScore: number;
  theoryScores: Record<Theory, number>;
  probeResults: AuditProbeResult[];
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AuditComparisonPanelProps {
  left: AuditSummary;
  right: AuditSummary;
  /** Show probe-level details (default true). */
  showProbeDetails?: boolean;
  /** Initial theory tab (default shows all). */
  initialTheory?: Theory | "all";
  /** Called when swap button is clicked. */
  onSwap?: () => void;
  className?: string;
}

interface ProbeDelta {
  probeId: string;
  probeName: string;
  theory: Theory;
  leftScore: number | null;
  rightScore: number | null;
  delta: number;
  leftConfidence: number | null;
  rightConfidence: number | null;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const THEORY_LABELS: Record<Theory, string> = {
  gwt: "GWT",
  iit: "IIT",
  hot: "HOT",
  rpt: "RPT",
  pp: "PP",
  ast: "AST",
};

const ALL_THEORIES: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function computeDeltas(
  left: AuditSummary,
  right: AuditSummary
): ProbeDelta[] {
  const allProbeIds = new Set([
    ...left.probeResults.map((p) => p.probeId),
    ...right.probeResults.map((p) => p.probeId),
  ]);

  const leftMap = new Map(
    left.probeResults.map((p) => [p.probeId, p])
  );
  const rightMap = new Map(
    right.probeResults.map((p) => [p.probeId, p])
  );

  const deltas: ProbeDelta[] = [];

  for (const id of allProbeIds) {
    const l = leftMap.get(id);
    const r = rightMap.get(id);

    deltas.push({
      probeId: id,
      probeName: l?.probeName ?? r?.probeName ?? id,
      theory: l?.theory ?? r?.theory ?? "gwt",
      leftScore: l?.score ?? null,
      rightScore: r?.score ?? null,
      delta: (r?.score ?? 0) - (l?.score ?? 0),
      leftConfidence: l?.confidence ?? null,
      rightConfidence: r?.confidence ?? null,
    });
  }

  return deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

function getDeltaColor(delta: number): string {
  if (delta > 0.1) return "text-green-600 dark:text-green-400";
  if (delta < -0.1) return "text-red-600 dark:text-red-400";
  return "text-neutral-500 dark:text-neutral-400";
}

function getDeltaBg(delta: number): string {
  if (delta > 0.1) return "bg-green-50 dark:bg-green-900/20";
  if (delta < -0.1) return "bg-red-50 dark:bg-red-900/20";
  return "";
}

function formatScore(score: number | null): string {
  if (score === null) return "-";
  return score.toFixed(3);
}

function formatDelta(delta: number): string {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(3)}`;
}

/* ------------------------------------------------------------------ */
/*  Delta summary bar                                                 */
/* ------------------------------------------------------------------ */

function DeltaSummary({
  left,
  right,
  deltas,
}: {
  left: AuditSummary;
  right: AuditSummary;
  deltas: ProbeDelta[];
}) {
  const improved = deltas.filter((d) => d.delta > 0.01).length;
  const declined = deltas.filter((d) => d.delta < -0.01).length;
  const unchanged = deltas.length - improved - declined;
  const overallDelta = right.overallScore - left.overallScore;

  return (
    <div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-neutral-600 dark:text-neutral-300">
            Overall Delta:
          </span>
          <span
            className={cn(
              "font-semibold",
              getDeltaColor(overallDelta)
            )}
          >
            {formatDelta(overallDelta)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Plus className="h-3.5 w-3.5 text-green-500" />
          <span className="text-neutral-600 dark:text-neutral-300">
            {improved} improved
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Minus className="h-3.5 w-3.5 text-red-500" />
          <span className="text-neutral-600 dark:text-neutral-300">
            {declined} declined
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3.5 w-3.5 text-center text-neutral-400">
            =
          </span>
          <span className="text-neutral-600 dark:text-neutral-300">
            {unchanged} unchanged
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Score card                                                        */
/* ------------------------------------------------------------------ */

function ScoreCard({
  audit,
  label,
}: {
  audit: AuditSummary;
  label: "left" | "right";
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-400">
        {label === "left" ? "Audit A" : "Audit B"}
      </div>
      <div className="mb-1 text-lg font-semibold text-neutral-800 dark:text-neutral-100">
        {audit.modelName}
      </div>
      <div className="mb-3 text-2xl font-bold text-neutral-900 dark:text-white">
        {audit.overallScore.toFixed(3)}
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        {ALL_THEORIES.map((theory) => (
          <div key={theory} className="flex items-center justify-between">
            <span className="font-medium text-neutral-500">
              {THEORY_LABELS[theory]}
            </span>
            <span className="text-neutral-700 dark:text-neutral-300">
              {(audit.theoryScores[theory] ?? 0).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-neutral-400">
        {new Date(audit.timestamp).toLocaleDateString()}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export function AuditComparisonPanel({
  left: initialLeft,
  right: initialRight,
  showProbeDetails = true,
  initialTheory = "all",
  onSwap,
  className,
}: AuditComparisonPanelProps) {
  const [swapped, setSwapped] = useState(false);
  const [activeTheory, setActiveTheory] = useState<Theory | "all">(
    initialTheory
  );
  const [expandedProbes, setExpandedProbes] = useState<Set<string>>(
    new Set()
  );

  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  const left = swapped ? initialRight : initialLeft;
  const right = swapped ? initialLeft : initialRight;

  const deltas = useMemo(() => computeDeltas(left, right), [left, right]);

  const filteredDeltas = useMemo(() => {
    if (activeTheory === "all") return deltas;
    return deltas.filter((d) => d.theory === activeTheory);
  }, [deltas, activeTheory]);

  // Sync scroll
  const handleScroll = useCallback(
    (source: "left" | "right") => {
      if (syncing.current) return;
      syncing.current = true;

      const from =
        source === "left" ? leftScrollRef.current : rightScrollRef.current;
      const to =
        source === "left" ? rightScrollRef.current : leftScrollRef.current;

      if (from && to) {
        to.scrollTop = from.scrollTop;
      }

      requestAnimationFrame(() => {
        syncing.current = false;
      });
    },
    []
  );

  useEffect(() => {
    const leftEl = leftScrollRef.current;
    const rightEl = rightScrollRef.current;

    const onLeftScroll = () => handleScroll("left");
    const onRightScroll = () => handleScroll("right");

    leftEl?.addEventListener("scroll", onLeftScroll);
    rightEl?.addEventListener("scroll", onRightScroll);

    return () => {
      leftEl?.removeEventListener("scroll", onLeftScroll);
      rightEl?.removeEventListener("scroll", onRightScroll);
    };
  }, [handleScroll]);

  const handleSwap = useCallback(() => {
    setSwapped((prev) => !prev);
    onSwap?.();
  }, [onSwap]);

  const toggleProbe = useCallback((probeId: string) => {
    setExpandedProbes((prev) => {
      const next = new Set(prev);
      if (next.has(probeId)) next.delete(probeId);
      else next.add(probeId);
      return next;
    });
  }, []);

  return (
    <div className={cn("w-full", className)}>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          onClick={handleSwap}
          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          Swap
        </button>

        {/* Theory tabs */}
        <div className="flex gap-1">
          <TabButton
            active={activeTheory === "all"}
            onClick={() => setActiveTheory("all")}
          >
            All
          </TabButton>
          {ALL_THEORIES.map((theory) => (
            <TabButton
              key={theory}
              active={activeTheory === theory}
              onClick={() => setActiveTheory(theory)}
            >
              {THEORY_LABELS[theory]}
            </TabButton>
          ))}
        </div>
      </div>

      {/* Score cards */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        <ScoreCard audit={left} label="left" />
        <ScoreCard audit={right} label="right" />
      </div>

      {/* Delta summary */}
      <DeltaSummary left={left} right={right} deltas={filteredDeltas} />

      {/* Probe comparison */}
      {showProbeDetails && (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700">
          <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-medium text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-400">
            <div className="grid grid-cols-[1fr_80px_80px_80px] gap-2">
              <span>Probe</span>
              <span className="text-right">Left</span>
              <span className="text-right">Right</span>
              <span className="text-right">Delta</span>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {filteredDeltas.map((d) => {
              const isExpanded = expandedProbes.has(d.probeId);
              const leftProbe = left.probeResults.find(
                (p) => p.probeId === d.probeId
              );
              const rightProbe = right.probeResults.find(
                (p) => p.probeId === d.probeId
              );

              return (
                <div
                  key={d.probeId}
                  className={cn(
                    "border-b border-neutral-100 dark:border-neutral-800",
                    getDeltaBg(d.delta)
                  )}
                >
                  <button
                    onClick={() => toggleProbe(d.probeId)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30"
                  >
                    <div className="grid grid-cols-[1fr_80px_80px_80px] items-center gap-2">
                      <span className="flex items-center gap-1.5">
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5 text-neutral-400" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
                        )}
                        <span className="truncate font-medium text-neutral-700 dark:text-neutral-200">
                          {d.probeName}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {THEORY_LABELS[d.theory]}
                        </span>
                      </span>
                      <span className="text-right text-neutral-600 dark:text-neutral-300">
                        {formatScore(d.leftScore)}
                      </span>
                      <span className="text-right text-neutral-600 dark:text-neutral-300">
                        {formatScore(d.rightScore)}
                      </span>
                      <span
                        className={cn(
                          "text-right font-medium",
                          getDeltaColor(d.delta)
                        )}
                      >
                        {formatDelta(d.delta)}
                      </span>
                    </div>
                  </button>

                  {/* Expanded detail - synced scroll panels */}
                  {isExpanded && (
                    <div className="grid grid-cols-2 gap-0 border-t border-neutral-100 dark:border-neutral-800">
                      <div
                        ref={leftScrollRef}
                        className="max-h-48 overflow-y-auto border-r border-neutral-100 p-3 text-xs dark:border-neutral-800"
                      >
                        {leftProbe ? (
                          <div>
                            <div className="mb-1 font-medium text-neutral-500">
                              Response
                            </div>
                            <p className="mb-2 whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
                              {leftProbe.response.slice(0, 500)}
                              {leftProbe.response.length > 500 && "..."}
                            </p>
                            {leftProbe.analysis && (
                              <>
                                <div className="mb-1 font-medium text-neutral-500">
                                  Analysis
                                </div>
                                <p className="whitespace-pre-wrap text-neutral-600 dark:text-neutral-400">
                                  {leftProbe.analysis}
                                </p>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-400">
                            Not available
                          </span>
                        )}
                      </div>
                      <div
                        ref={rightScrollRef}
                        className="max-h-48 overflow-y-auto p-3 text-xs"
                      >
                        {rightProbe ? (
                          <div>
                            <div className="mb-1 font-medium text-neutral-500">
                              Response
                            </div>
                            <p className="mb-2 whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
                              {rightProbe.response.slice(0, 500)}
                              {rightProbe.response.length > 500 && "..."}
                            </p>
                            {rightProbe.analysis && (
                              <>
                                <div className="mb-1 font-medium text-neutral-500">
                                  Analysis
                                </div>
                                <p className="whitespace-pre-wrap text-neutral-600 dark:text-neutral-400">
                                  {rightProbe.analysis}
                                </p>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-400">
                            Not available
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab button                                                        */
/* ------------------------------------------------------------------ */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900"
          : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
      )}
    >
      {children}
    </button>
  );
}
