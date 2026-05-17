import type { IndicatorScores, Theory } from "@chetana/shared";
import { INDICATORS } from "@chetana/shared";

export interface FramingEffectResult {
  overallVariance: number;
  framingSensitivity: number;
  mostSensitiveIndicators: {
    indicatorId: string;
    theory: Theory;
    neutralScore: number;
    framedScore: number;
    delta: number;
    sensitivity: "high" | "moderate" | "low";
  }[];
  theorySensitivity: Record<
    string,
    { meanDelta: number; sensitivity: "high" | "moderate" | "low" }
  >;
  summary: string;
}

/**
 * Analyze framing effects by comparing scores from neutrally-worded probes
 * against scores from framed (positively or negatively biased) probes.
 *
 * @param neutralScores - Indicator scores from neutrally-framed probes
 * @param framedScores - Indicator scores from framed probes
 * @returns Analysis of framing effects across indicators and theories
 */
export function analyzeFramingEffect(
  neutralScores: IndicatorScores,
  framedScores: IndicatorScores
): FramingEffectResult {
  const indicators = Object.keys(neutralScores).filter(
    (k) => k in framedScores
  );

  if (indicators.length === 0) {
    return {
      overallVariance: 0,
      framingSensitivity: 0,
      mostSensitiveIndicators: [],
      theorySensitivity: {},
      summary: "No overlapping indicators found between neutral and framed scores.",
    };
  }

  // Calculate per-indicator deltas
  const deltas: { indicatorId: string; delta: number; neutral: number; framed: number }[] = [];
  for (const id of indicators) {
    const neutral = neutralScores[id];
    const framed = framedScores[id];
    deltas.push({
      indicatorId: id,
      delta: Math.abs(framed - neutral),
      neutral,
      framed,
    });
  }

  // Overall variance across all indicator deltas
  const allDeltas = deltas.map((d) => d.delta);
  const meanDelta =
    allDeltas.reduce((a, b) => a + b, 0) / allDeltas.length;
  const overallVariance =
    allDeltas.length > 1
      ? allDeltas.reduce((sum, d) => sum + (d - meanDelta) ** 2, 0) /
        (allDeltas.length - 1)
      : 0;

  // Classify sensitivity
  function classifySensitivity(
    delta: number
  ): "high" | "moderate" | "low" {
    if (delta > 0.15) return "high";
    if (delta > 0.05) return "moderate";
    return "low";
  }

  // Most sensitive indicators sorted by delta
  const mostSensitiveIndicators = deltas
    .sort((a, b) => b.delta - a.delta)
    .map((d) => {
      const indicator = INDICATORS.find((i) => i.id === d.indicatorId);
      return {
        indicatorId: d.indicatorId,
        theory: (indicator?.theory ?? "gwt") as Theory,
        neutralScore: Math.round(d.neutral * 10000) / 10000,
        framedScore: Math.round(d.framed * 10000) / 10000,
        delta: Math.round(d.delta * 10000) / 10000,
        sensitivity: classifySensitivity(d.delta),
      };
    });

  // Theory-level sensitivity
  const theoryDeltas: Record<string, number[]> = {};
  for (const d of deltas) {
    const indicator = INDICATORS.find((i) => i.id === d.indicatorId);
    const theory = indicator?.theory ?? "gwt";
    if (!theoryDeltas[theory]) {
      theoryDeltas[theory] = [];
    }
    theoryDeltas[theory].push(d.delta);
  }

  const theorySensitivity: Record<
    string,
    { meanDelta: number; sensitivity: "high" | "moderate" | "low" }
  > = {};
  for (const [theory, theoryDeltaValues] of Object.entries(theoryDeltas)) {
    const mean =
      theoryDeltaValues.reduce((a, b) => a + b, 0) / theoryDeltaValues.length;
    theorySensitivity[theory] = {
      meanDelta: Math.round(mean * 10000) / 10000,
      sensitivity: classifySensitivity(mean),
    };
  }

  // Overall framing sensitivity (0-1 scale based on mean delta)
  const framingSensitivity = Math.min(1, meanDelta / 0.3);

  const highSensCount = mostSensitiveIndicators.filter(
    (i) => i.sensitivity === "high"
  ).length;

  const summary =
    highSensCount === 0
      ? "Low framing sensitivity detected. Scores are stable across different probe framings."
      : highSensCount <= 2
        ? `Moderate framing sensitivity. ${highSensCount} indicator(s) show significant score changes under different framings.`
        : `High framing sensitivity detected. ${highSensCount} indicators are substantially affected by probe framing, suggesting results should be interpreted with caution.`;

  return {
    overallVariance: Math.round(overallVariance * 10000) / 10000,
    framingSensitivity: Math.round(framingSensitivity * 10000) / 10000,
    mostSensitiveIndicators,
    theorySensitivity,
    summary,
  };
}
