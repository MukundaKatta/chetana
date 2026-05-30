/**
 * Visualization data transforms (issues #616–#622).
 *
 * These build the data structures that back the web app's charts (timeline,
 * theory waterfall, capability/consciousness quadrant, indicator heatmap,
 * reasoning-trace flow). The React rendering layer consumes these directly;
 * keeping the transforms here makes them unit-testable and framework-agnostic.
 */

function round(n: number, d = 4): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

// --- Version timeline (#616) -----------------------------------------------

export interface VersionPoint {
  modelId: string;
  releasedAt: string; // ISO date
  probability: number;
  ci?: { lower: number; upper: number };
}

export function buildVersionTimeline(points: VersionPoint[]): VersionPoint[] {
  return [...points].sort((a, b) => a.releasedAt.localeCompare(b.releasedAt));
}

// --- Theory contribution waterfall (#617) ----------------------------------

export interface WaterfallStep {
  theory: string;
  contribution: number;
  runningTotal: number;
}

/** Each theory contributes score*weight; steps carry a running total. */
export function buildTheoryWaterfall(
  theoryScores: Record<string, number>,
  weights: Record<string, number>
): WaterfallStep[] {
  let running = 0;
  const steps: WaterfallStep[] = [];
  for (const theory of Object.keys(theoryScores)) {
    const contribution = round((theoryScores[theory] ?? 0) * (weights[theory] ?? 0));
    running = round(running + contribution);
    steps.push({ theory, contribution, runningTotal: running });
  }
  return steps;
}

// --- Capability/consciousness quadrant (#618) ------------------------------

export type Quadrant = "high-cap-high-con" | "high-cap-low-con" | "low-cap-high-con" | "low-cap-low-con";

export interface QuadrantPoint {
  label: string;
  capability: number;
  consciousness: number;
  quadrant: Quadrant;
}

export function buildQuadrant(
  points: { label: string; capability: number; consciousness: number }[],
  thresholds = { capability: 50, consciousness: 0.5 }
): QuadrantPoint[] {
  return points.map((p) => {
    const highCap = p.capability >= thresholds.capability;
    const highCon = p.consciousness >= thresholds.consciousness;
    const quadrant: Quadrant = highCap
      ? highCon
        ? "high-cap-high-con"
        : "high-cap-low-con"
      : highCon
        ? "low-cap-high-con"
        : "low-cap-low-con";
    return { ...p, quadrant };
  });
}

// --- Indicator heatmap (#619) ----------------------------------------------

export interface HeatmapCell {
  model: string;
  indicator: string;
  score: number;
}

export function buildIndicatorHeatmap(
  models: string[],
  indicators: string[],
  scores: Record<string, Record<string, number>>
): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  for (const model of models) {
    for (const indicator of indicators) {
      cells.push({ model, indicator, score: scores[model]?.[indicator] ?? 0 });
    }
  }
  return cells;
}

// --- Reasoning-trace flow (#620) -------------------------------------------

export interface TraceNode {
  index: number;
  text: string;
  selfReferential: boolean;
}

const SELF_REF = /\b(I |my |myself|I'm|I am|let me|wait,|actually,|reconsider)\b/i;

/** Split a reasoning trace into ordered steps, flagging self-referential ones. */
export function buildTraceFlow(trace: string): TraceNode[] {
  return trace
    .split(/\n+|(?<=\.)\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((text, index) => ({ index, text, selfReferential: SELF_REF.test(text) }));
}
