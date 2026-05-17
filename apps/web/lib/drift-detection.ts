import type { TheoryScores, IndicatorScores, Theory } from "@chetana/shared";

export interface DriftResult {
  overallDrift: boolean;
  overallDelta: number;
  theoryDrifts: {
    theory: Theory;
    scoreA: number;
    scoreB: number;
    delta: number;
    drifted: boolean;
    direction: "improved" | "degraded" | "stable";
  }[];
  indicatorDrifts: {
    indicator: string;
    scoreA: number;
    scoreB: number;
    delta: number;
    drifted: boolean;
    direction: "improved" | "degraded" | "stable";
  }[];
  driftedIndicators: string[];
  report: string;
}

export interface AuditSnapshot {
  overallScore: number;
  theoryScores: TheoryScores;
  indicatorScores: IndicatorScores;
  completedAt: string;
}

/**
 * Detect drift between two audit snapshots.
 * Flags significant score changes exceeding the threshold (default 0.1).
 *
 * @param auditA - Earlier audit snapshot
 * @param auditB - Later audit snapshot
 * @param threshold - Minimum delta to flag as drift (default 0.1)
 * @returns Detailed drift analysis
 */
export function detectDrift(
  auditA: AuditSnapshot,
  auditB: AuditSnapshot,
  threshold: number = 0.1
): DriftResult {
  // Overall score drift
  const overallDelta = Math.abs(auditB.overallScore - auditA.overallScore);
  const overallDrift = overallDelta > threshold;

  // Theory-level drift
  const theories: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];
  const theoryDrifts = theories.map((theory) => {
    const scoreA = auditA.theoryScores[theory] ?? 0;
    const scoreB = auditB.theoryScores[theory] ?? 0;
    const delta = Math.abs(scoreB - scoreA);
    const direction: "improved" | "degraded" | "stable" =
      scoreB - scoreA > threshold
        ? "improved"
        : scoreA - scoreB > threshold
          ? "degraded"
          : "stable";
    return {
      theory,
      scoreA: Math.round(scoreA * 10000) / 10000,
      scoreB: Math.round(scoreB * 10000) / 10000,
      delta: Math.round(delta * 10000) / 10000,
      drifted: delta > threshold,
      direction,
    };
  });

  // Indicator-level drift
  const allIndicators = new Set<string>([
    ...Object.keys(auditA.indicatorScores),
    ...Object.keys(auditB.indicatorScores),
  ]);

  const indicatorDrifts = Array.from(allIndicators).map((indicator) => {
    const scoreA = auditA.indicatorScores[indicator] ?? 0;
    const scoreB = auditB.indicatorScores[indicator] ?? 0;
    const delta = Math.abs(scoreB - scoreA);
    const direction: "improved" | "degraded" | "stable" =
      scoreB - scoreA > threshold
        ? "improved"
        : scoreA - scoreB > threshold
          ? "degraded"
          : "stable";
    return {
      indicator,
      scoreA: Math.round(scoreA * 10000) / 10000,
      scoreB: Math.round(scoreB * 10000) / 10000,
      delta: Math.round(delta * 10000) / 10000,
      drifted: delta > threshold,
      direction,
    };
  });

  const driftedIndicators = indicatorDrifts
    .filter((d) => d.drifted)
    .map((d) => d.indicator);

  // Generate report
  const driftedTheories = theoryDrifts.filter((t) => t.drifted);
  const report = generateDriftReport(
    overallDrift,
    overallDelta,
    driftedTheories,
    driftedIndicators,
    auditA,
    auditB,
    threshold
  );

  return {
    overallDrift,
    overallDelta: Math.round(overallDelta * 10000) / 10000,
    theoryDrifts,
    indicatorDrifts,
    driftedIndicators,
    report,
  };
}

function generateDriftReport(
  overallDrift: boolean,
  overallDelta: number,
  driftedTheories: DriftResult["theoryDrifts"],
  driftedIndicators: string[],
  auditA: AuditSnapshot,
  auditB: AuditSnapshot,
  threshold: number
): string {
  const lines: string[] = [];

  lines.push(`Drift Detection Report`);
  lines.push(`Period: ${auditA.completedAt} -> ${auditB.completedAt}`);
  lines.push(`Threshold: ${threshold}`);
  lines.push("");

  if (overallDrift) {
    const direction = auditB.overallScore > auditA.overallScore ? "increased" : "decreased";
    lines.push(
      `Overall score ${direction} by ${overallDelta.toFixed(4)} ` +
        `(${auditA.overallScore.toFixed(4)} -> ${auditB.overallScore.toFixed(4)})`
    );
  } else {
    lines.push(`Overall score stable (delta: ${overallDelta.toFixed(4)})`);
  }
  lines.push("");

  if (driftedTheories.length > 0) {
    lines.push(`Theory-level drifts (${driftedTheories.length}):`);
    for (const t of driftedTheories) {
      lines.push(
        `  ${t.theory.toUpperCase()}: ${t.scoreA} -> ${t.scoreB} (${t.direction}, delta: ${t.delta})`
      );
    }
  } else {
    lines.push("No theory-level drifts detected.");
  }
  lines.push("");

  if (driftedIndicators.length > 0) {
    lines.push(`Indicator-level drifts (${driftedIndicators.length}):`);
    for (const id of driftedIndicators) {
      lines.push(`  ${id}`);
    }
  } else {
    lines.push("No indicator-level drifts detected.");
  }

  return lines.join("\n");
}
