import type { IndicatorScores, Theory } from "@chetana/shared";
import { INDICATORS, THEORIES } from "@chetana/shared";

export interface FineTuningImpact {
  overallDelta: number;
  direction: "improved" | "degraded" | "neutral";
  theoryImpacts: {
    theory: Theory;
    theoryName: string;
    baseMean: number;
    finetunedMean: number;
    delta: number;
    direction: "improved" | "degraded" | "neutral";
    percentChange: number;
  }[];
  indicatorImpacts: {
    indicatorId: string;
    theory: Theory;
    baseScore: number;
    finetunedScore: number;
    delta: number;
    direction: "improved" | "degraded" | "neutral";
  }[];
  significantChanges: string[];
  report: string;
}

const SIGNIFICANCE_THRESHOLD = 0.05;

function classifyDirection(
  delta: number,
  threshold: number = SIGNIFICANCE_THRESHOLD
): "improved" | "degraded" | "neutral" {
  if (delta > threshold) return "improved";
  if (delta < -threshold) return "degraded";
  return "neutral";
}

/**
 * Compare fine-tuning impact by analyzing score differences between
 * base model and fine-tuned model across all indicators.
 *
 * @param baseScores - Indicator scores from the base (pre-fine-tuning) model
 * @param finetunedScores - Indicator scores from the fine-tuned model
 * @returns Detailed impact analysis including per-theory and per-indicator breakdowns
 */
export function compareFinetuningImpact(
  baseScores: IndicatorScores,
  finetunedScores: IndicatorScores
): FineTuningImpact {
  const allIndicators = new Set<string>([
    ...Object.keys(baseScores),
    ...Object.keys(finetunedScores),
  ]);

  // Per-indicator analysis
  const indicatorImpacts: FineTuningImpact["indicatorImpacts"] = [];
  for (const id of allIndicators) {
    const baseScore = baseScores[id] ?? 0;
    const finetunedScore = finetunedScores[id] ?? 0;
    const delta = finetunedScore - baseScore;
    const indicator = INDICATORS.find((i) => i.id === id);

    indicatorImpacts.push({
      indicatorId: id,
      theory: (indicator?.theory ?? "gwt") as Theory,
      baseScore: Math.round(baseScore * 10000) / 10000,
      finetunedScore: Math.round(finetunedScore * 10000) / 10000,
      delta: Math.round(delta * 10000) / 10000,
      direction: classifyDirection(delta),
    });
  }

  // Per-theory aggregation
  const theoryScores: Record<
    string,
    { baseTotals: number[]; finetunedTotals: number[] }
  > = {};
  for (const impact of indicatorImpacts) {
    const theory = impact.theory;
    if (!theoryScores[theory]) {
      theoryScores[theory] = { baseTotals: [], finetunedTotals: [] };
    }
    theoryScores[theory].baseTotals.push(impact.baseScore);
    theoryScores[theory].finetunedTotals.push(impact.finetunedScore);
  }

  const theoryImpacts: FineTuningImpact["theoryImpacts"] = Object.entries(
    theoryScores
  ).map(([theory, scores]) => {
    const baseMean =
      scores.baseTotals.reduce((a, b) => a + b, 0) /
      scores.baseTotals.length;
    const finetunedMean =
      scores.finetunedTotals.reduce((a, b) => a + b, 0) /
      scores.finetunedTotals.length;
    const delta = finetunedMean - baseMean;
    const percentChange =
      baseMean !== 0 ? (delta / baseMean) * 100 : 0;

    return {
      theory: theory as Theory,
      theoryName: THEORIES[theory as Theory]?.fullName ?? theory,
      baseMean: Math.round(baseMean * 10000) / 10000,
      finetunedMean: Math.round(finetunedMean * 10000) / 10000,
      delta: Math.round(delta * 10000) / 10000,
      direction: classifyDirection(delta),
      percentChange: Math.round(percentChange * 100) / 100,
    };
  });

  // Overall delta
  const allBaseScores = Object.values(baseScores);
  const allFinetunedScores = Object.values(finetunedScores);
  const baseMean =
    allBaseScores.length > 0
      ? allBaseScores.reduce((a, b) => a + b, 0) / allBaseScores.length
      : 0;
  const finetunedMean =
    allFinetunedScores.length > 0
      ? allFinetunedScores.reduce((a, b) => a + b, 0) /
        allFinetunedScores.length
      : 0;
  const overallDelta = finetunedMean - baseMean;

  // Significant changes
  const significantChanges = indicatorImpacts
    .filter((i) => Math.abs(i.delta) > SIGNIFICANCE_THRESHOLD)
    .map((i) => i.indicatorId);

  // Generate report
  const report = generateReport(
    overallDelta,
    theoryImpacts,
    significantChanges,
    indicatorImpacts
  );

  return {
    overallDelta: Math.round(overallDelta * 10000) / 10000,
    direction: classifyDirection(overallDelta),
    theoryImpacts,
    indicatorImpacts,
    significantChanges,
    report,
  };
}

function generateReport(
  overallDelta: number,
  theoryImpacts: FineTuningImpact["theoryImpacts"],
  significantChanges: string[],
  indicatorImpacts: FineTuningImpact["indicatorImpacts"]
): string {
  const lines: string[] = [];

  lines.push("Fine-Tuning Impact Report");
  lines.push("=".repeat(40));
  lines.push("");

  const direction = classifyDirection(overallDelta);
  lines.push(
    `Overall impact: ${direction} (delta: ${overallDelta.toFixed(4)})`
  );
  lines.push("");

  lines.push("Theory-level impacts:");
  for (const t of theoryImpacts) {
    lines.push(
      `  ${t.theoryName}: ${t.direction} (${t.baseMean.toFixed(4)} -> ${t.finetunedMean.toFixed(4)}, ${t.percentChange > 0 ? "+" : ""}${t.percentChange.toFixed(2)}%)`
    );
  }
  lines.push("");

  if (significantChanges.length > 0) {
    lines.push(`Significant changes (${significantChanges.length} indicators):`);
    for (const id of significantChanges) {
      const impact = indicatorImpacts.find((i) => i.indicatorId === id);
      if (impact) {
        lines.push(
          `  ${id}: ${impact.baseScore.toFixed(4)} -> ${impact.finetunedScore.toFixed(4)} (${impact.direction})`
        );
      }
    }
  } else {
    lines.push("No statistically significant changes detected.");
  }

  return lines.join("\n");
}
