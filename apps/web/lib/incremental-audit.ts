/**
 * Incremental audit updates with probe change detection,
 * carry-forward of unchanged results, result merging,
 * freshness tracking, and cost savings estimation (Issue #393).
 */

import type {
  ProbeDefinition,
  ProbeResult,
  Audit,
  Theory,
  IndicatorId,
} from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type ProbeStatus = "fresh" | "carried-forward" | "needs-rerun" | "new";

export interface IncrementalProbeState {
  probeId: string;
  probeName: string;
  status: ProbeStatus;
  currentHash: string;
  previousHash: string | null;
  previousResult: ProbeResult | null;
  reason: string;
}

export interface IncrementalAuditPlan {
  auditId: string;
  previousAuditId: string | null;
  totalProbes: number;
  probesToRun: IncrementalProbeState[];
  probesToCarryForward: IncrementalProbeState[];
  newProbes: IncrementalProbeState[];
  estimatedSavings: CostSavings;
  plan: string;
}

export interface CostSavings {
  /** Probes skipped via carry-forward. */
  skippedProbes: number;
  /** Estimated tokens saved. */
  estimatedTokensSaved: number;
  /** Estimated cost savings in cents. */
  estimatedCostSavedCents: number;
  /** Percentage of work saved. */
  percentageSaved: number;
}

export interface MergedResult {
  probeId: string;
  probeName: string;
  result: ProbeResult;
  status: ProbeStatus;
  sourceAuditId: string;
  /** When the result was originally generated. */
  resultTimestamp: string;
}

export interface IncrementalAuditResult {
  auditId: string;
  results: MergedResult[];
  freshCount: number;
  carriedForwardCount: number;
  totalCount: number;
  actualCostCents: number;
  savingsVsFullAudit: CostSavings;
  summary: string;
}

/* ------------------------------------------------------------------ */
/*  Probe hashing                                                     */
/* ------------------------------------------------------------------ */

/**
 * Compute a content hash for a probe definition.
 * Changes in any scoring-relevant field will produce a different hash.
 */
export function hashProbe(probe: ProbeDefinition): string {
  const content = JSON.stringify({
    prompt: probe.prompt,
    systemPrompt: probe.systemPrompt ?? "",
    scoringCriteria: probe.scoringCriteria,
    followUp: probe.followUp ?? "",
    indicatorId: probe.indicatorId,
    theory: probe.theory,
    evidenceType: probe.evidenceType,
  });

  // DJB2 hash
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = (hash * 33) ^ content.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/* ------------------------------------------------------------------ */
/*  Change detection                                                  */
/* ------------------------------------------------------------------ */

/**
 * Detect which probes need to be re-run.
 */
export function detectChanges(
  currentProbes: ProbeDefinition[],
  previousProbes: ProbeDefinition[],
  previousResults: ProbeResult[],
): IncrementalProbeState[] {
  const prevHashMap = new Map<string, string>();
  const prevProbeMap = new Map<string, ProbeDefinition>();
  const prevResultMap = new Map<string, ProbeResult>();

  for (const probe of previousProbes) {
    const h = hashProbe(probe);
    prevHashMap.set(probe.id, h);
    prevProbeMap.set(probe.id, probe);
  }

  for (const result of previousResults) {
    // Map by probe name for matching
    prevResultMap.set(result.probeName, result);
  }

  const states: IncrementalProbeState[] = [];

  for (const probe of currentProbes) {
    const currentHash = hashProbe(probe);
    const previousHash = prevHashMap.get(probe.id) ?? null;
    const previousResult = prevResultMap.get(probe.name) ?? null;

    if (!previousHash) {
      // New probe: never run before
      states.push({
        probeId: probe.id,
        probeName: probe.name,
        status: "new",
        currentHash,
        previousHash: null,
        previousResult: null,
        reason: "New probe not in previous audit",
      });
    } else if (currentHash !== previousHash) {
      // Modified probe: needs re-run
      states.push({
        probeId: probe.id,
        probeName: probe.name,
        status: "needs-rerun",
        currentHash,
        previousHash,
        previousResult,
        reason: "Probe definition changed since last audit",
      });
    } else if (!previousResult) {
      // Unchanged but no result: needs re-run
      states.push({
        probeId: probe.id,
        probeName: probe.name,
        status: "needs-rerun",
        currentHash,
        previousHash,
        previousResult: null,
        reason: "No previous result found (may have failed)",
      });
    } else {
      // Unchanged and has result: can carry forward
      states.push({
        probeId: probe.id,
        probeName: probe.name,
        status: "carried-forward",
        currentHash,
        previousHash,
        previousResult,
        reason: "Probe unchanged, carrying forward previous result",
      });
    }
  }

  return states;
}

/* ------------------------------------------------------------------ */
/*  Audit plan                                                        */
/* ------------------------------------------------------------------ */

/**
 * Create an incremental audit plan.
 */
export function createIncrementalPlan(
  auditId: string,
  currentProbes: ProbeDefinition[],
  previousAudit: {
    auditId: string;
    probes: ProbeDefinition[];
    results: ProbeResult[];
    tokensUsed: number;
    costCents: number;
  } | null,
  costPerProbeEstimateCents: number = 5,
  tokensPerProbeEstimate: number = 2000,
): IncrementalAuditPlan {
  if (!previousAudit) {
    // No previous audit: run everything
    const states: IncrementalProbeState[] = currentProbes.map((probe) => ({
      probeId: probe.id,
      probeName: probe.name,
      status: "new" as const,
      currentHash: hashProbe(probe),
      previousHash: null,
      previousResult: null,
      reason: "First audit, no previous results",
    }));

    return {
      auditId,
      previousAuditId: null,
      totalProbes: currentProbes.length,
      probesToRun: states,
      probesToCarryForward: [],
      newProbes: states,
      estimatedSavings: {
        skippedProbes: 0,
        estimatedTokensSaved: 0,
        estimatedCostSavedCents: 0,
        percentageSaved: 0,
      },
      plan: `Full audit: running all ${currentProbes.length} probes (no previous audit found)`,
    };
  }

  const states = detectChanges(
    currentProbes,
    previousAudit.probes,
    previousAudit.results,
  );

  const probesToRun = states.filter(
    (s) => s.status === "new" || s.status === "needs-rerun",
  );
  const probesToCarryForward = states.filter(
    (s) => s.status === "carried-forward",
  );
  const newProbes = states.filter((s) => s.status === "new");

  const skippedProbes = probesToCarryForward.length;
  const estimatedTokensSaved = skippedProbes * tokensPerProbeEstimate;
  const estimatedCostSavedCents = skippedProbes * costPerProbeEstimateCents;
  const percentageSaved =
    currentProbes.length > 0
      ? (skippedProbes / currentProbes.length) * 100
      : 0;

  const plan = [
    `Incremental audit plan:`,
    `  Total probes: ${currentProbes.length}`,
    `  To run: ${probesToRun.length} (${newProbes.length} new, ${probesToRun.length - newProbes.length} modified)`,
    `  Carried forward: ${probesToCarryForward.length}`,
    `  Estimated savings: ${percentageSaved.toFixed(0)}% (~${estimatedCostSavedCents}c, ~${estimatedTokensSaved} tokens)`,
  ].join("\n");

  return {
    auditId,
    previousAuditId: previousAudit.auditId,
    totalProbes: currentProbes.length,
    probesToRun,
    probesToCarryForward,
    newProbes,
    estimatedSavings: {
      skippedProbes,
      estimatedTokensSaved,
      estimatedCostSavedCents,
      percentageSaved: Math.round(percentageSaved * 100) / 100,
    },
    plan,
  };
}

/* ------------------------------------------------------------------ */
/*  Result merging                                                    */
/* ------------------------------------------------------------------ */

/**
 * Merge fresh results with carried-forward results.
 */
export function mergeResults(
  plan: IncrementalAuditPlan,
  freshResults: ProbeResult[],
): IncrementalAuditResult {
  const mergedResults: MergedResult[] = [];

  // Add fresh results
  const freshResultMap = new Map<string, ProbeResult>();
  for (const result of freshResults) {
    freshResultMap.set(result.probeName, result);
  }

  for (const state of plan.probesToRun) {
    const result = freshResultMap.get(state.probeName);
    if (result) {
      mergedResults.push({
        probeId: state.probeId,
        probeName: state.probeName,
        result,
        status: "fresh",
        sourceAuditId: plan.auditId,
        resultTimestamp: result.createdAt,
      });
    }
  }

  // Add carried-forward results
  for (const state of plan.probesToCarryForward) {
    if (state.previousResult) {
      mergedResults.push({
        probeId: state.probeId,
        probeName: state.probeName,
        result: {
          ...state.previousResult,
          auditId: plan.auditId, // Re-tag with current audit ID
        },
        status: "carried-forward",
        sourceAuditId: plan.previousAuditId ?? plan.auditId,
        resultTimestamp: state.previousResult.createdAt,
      });
    }
  }

  const freshCount = mergedResults.filter((r) => r.status === "fresh").length;
  const carriedForwardCount = mergedResults.filter(
    (r) => r.status === "carried-forward",
  ).length;

  // Estimate actual cost (only fresh probes incurred cost)
  const avgCostPerProbe =
    plan.totalProbes > 0
      ? (plan.estimatedSavings.estimatedCostSavedCents /
          Math.max(1, plan.probesToCarryForward.length)) *
        plan.probesToRun.length
      : 0;

  const summary = [
    `Incremental audit completed:`,
    `  Fresh results: ${freshCount}`,
    `  Carried forward: ${carriedForwardCount}`,
    `  Total: ${mergedResults.length}`,
    `  Cost savings: ~${plan.estimatedSavings.percentageSaved.toFixed(0)}%`,
  ].join("\n");

  return {
    auditId: plan.auditId,
    results: mergedResults,
    freshCount,
    carriedForwardCount,
    totalCount: mergedResults.length,
    actualCostCents: Math.round(avgCostPerProbe),
    savingsVsFullAudit: plan.estimatedSavings,
    summary,
  };
}

/* ------------------------------------------------------------------ */
/*  Score recomputation                                               */
/* ------------------------------------------------------------------ */

/**
 * Recompute theory and indicator scores from merged results.
 */
export function recomputeScores(
  mergedResults: MergedResult[],
): {
  overallScore: number;
  theoryScores: Record<Theory, number>;
  indicatorScores: Record<string, number>;
} {
  // Group by indicator
  const byIndicator = new Map<string, number[]>();
  for (const mr of mergedResults) {
    const key = mr.result.indicatorId;
    if (!byIndicator.has(key)) byIndicator.set(key, []);
    byIndicator.get(key)!.push(mr.result.score);
  }

  // Compute indicator scores (mean)
  const indicatorScores: Record<string, number> = {};
  for (const [id, scores] of byIndicator) {
    indicatorScores[id] =
      Math.round(
        (scores.reduce((a, b) => a + b, 0) / scores.length) * 10000,
      ) / 10000;
  }

  // Group by theory
  const theories: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];
  const theoryScores: Record<string, number> = {};

  for (const theory of theories) {
    const theoryResults = mergedResults.filter(
      (mr) => mr.result.theory === theory,
    );
    if (theoryResults.length === 0) {
      theoryScores[theory] = 0;
    } else {
      const avg =
        theoryResults.reduce((s, r) => s + r.result.score, 0) /
        theoryResults.length;
      theoryScores[theory] = Math.round(avg * 10000) / 10000;
    }
  }

  // Overall score
  const allScores = mergedResults.map((r) => r.result.score);
  const overallScore =
    allScores.length > 0
      ? Math.round(
          (allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10000,
        ) / 10000
      : 0;

  return {
    overallScore,
    theoryScores: theoryScores as Record<Theory, number>,
    indicatorScores,
  };
}

/* ------------------------------------------------------------------ */
/*  Freshness report                                                  */
/* ------------------------------------------------------------------ */

export interface FreshnessReport {
  totalResults: number;
  fresh: number;
  carriedForward: number;
  freshPercentage: number;
  oldestCarriedForward: string | null;
  averageCarriedForwardAgeDays: number;
  recommendation: string;
}

/**
 * Generate a freshness report for merged results.
 */
export function generateFreshnessReport(
  results: MergedResult[],
): FreshnessReport {
  const fresh = results.filter((r) => r.status === "fresh");
  const carriedForward = results.filter(
    (r) => r.status === "carried-forward",
  );

  const freshPercentage =
    results.length > 0 ? (fresh.length / results.length) * 100 : 100;

  let oldestCarriedForward: string | null = null;
  let totalAgeDays = 0;

  const now = Date.now();
  for (const r of carriedForward) {
    const age = now - new Date(r.resultTimestamp).getTime();
    const ageDays = age / (1000 * 60 * 60 * 24);
    totalAgeDays += ageDays;

    if (
      !oldestCarriedForward ||
      new Date(r.resultTimestamp) < new Date(oldestCarriedForward)
    ) {
      oldestCarriedForward = r.resultTimestamp;
    }
  }

  const avgAgeDays =
    carriedForward.length > 0 ? totalAgeDays / carriedForward.length : 0;

  let recommendation: string;
  if (freshPercentage >= 90) {
    recommendation = "Results are mostly fresh. Good data quality.";
  } else if (freshPercentage >= 50) {
    recommendation =
      "Mix of fresh and carried-forward results. Consider a full re-audit if high accuracy is needed.";
  } else if (avgAgeDays > 30) {
    recommendation =
      "Many results are stale (>30 days old). A full re-audit is recommended.";
  } else {
    recommendation =
      "Most results are carried forward. Suitable for monitoring but not for final assessment.";
  }

  return {
    totalResults: results.length,
    fresh: fresh.length,
    carriedForward: carriedForward.length,
    freshPercentage: Math.round(freshPercentage * 100) / 100,
    oldestCarriedForward,
    averageCarriedForwardAgeDays: Math.round(avgAgeDays * 10) / 10,
    recommendation,
  };
}
