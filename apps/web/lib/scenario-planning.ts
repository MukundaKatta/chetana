/**
 * Scenario planning for consciousness scores (Issue #522).
 *
 * Adjust probe scores for impact analysis, save/load scenarios,
 * scenario diff, best/worst case auto-generation, and
 * sensitivity analysis per probe.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ProbeScoreAdjustment {
  probeId: string;
  originalScore: number;
  adjustedScore: number;
  reason?: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  baseAuditId: string;
  adjustments: ProbeScoreAdjustment[];
  createdAt: string;
  updatedAt: string;
  tags: string[];
  /** Computed overall impact after adjustments. */
  projectedOverallScore: number | null;
  /** Computed theory scores after adjustments. */
  projectedTheoryScores: Record<string, number> | null;
}

export interface ScenarioDiff {
  scenarioA: string;
  scenarioB: string;
  overallDelta: number;
  theoryDeltas: Record<string, number>;
  probeDeltas: Array<{
    probeId: string;
    scoreA: number;
    scoreB: number;
    delta: number;
  }>;
  summary: string;
}

export interface SensitivityResult {
  probeId: string;
  probeName: string;
  theory: string;
  baseScore: number;
  impactWhenZero: number;
  impactWhenMax: number;
  sensitivityIndex: number;
  rank: number;
}

export interface BaseProbeScore {
  probeId: string;
  probeName: string;
  theory: string;
  indicatorId: string;
  score: number;
  weight?: number;
}

/* ------------------------------------------------------------------ */
/*  Scenario storage                                                  */
/* ------------------------------------------------------------------ */

const scenarios = new Map<string, Scenario>();

function generateId(): string {
  return `scenario_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/* ------------------------------------------------------------------ */
/*  Score computation                                                 */
/* ------------------------------------------------------------------ */

function applyAdjustments(
  baseScores: BaseProbeScore[],
  adjustments: ProbeScoreAdjustment[]
): BaseProbeScore[] {
  const adjustmentMap = new Map(adjustments.map((a) => [a.probeId, a.adjustedScore]));
  return baseScores.map((s) => ({
    ...s,
    score: adjustmentMap.has(s.probeId)
      ? adjustmentMap.get(s.probeId)!
      : s.score,
  }));
}

function computeOverallScore(scores: BaseProbeScore[]): number {
  if (scores.length === 0) return 0;
  const totalWeight = scores.reduce((sum, s) => sum + (s.weight ?? 1), 0);
  const weightedSum = scores.reduce(
    (sum, s) => sum + s.score * (s.weight ?? 1),
    0
  );
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

function computeTheoryScores(
  scores: BaseProbeScore[]
): Record<string, number> {
  const byTheory = new Map<string, { sum: number; weight: number }>();
  for (const s of scores) {
    const entry = byTheory.get(s.theory) ?? { sum: 0, weight: 0 };
    const w = s.weight ?? 1;
    entry.sum += s.score * w;
    entry.weight += w;
    byTheory.set(s.theory, entry);
  }
  const result: Record<string, number> = {};
  for (const [theory, { sum, weight }] of byTheory) {
    result[theory] = weight > 0 ? sum / weight : 0;
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  Core API                                                          */
/* ------------------------------------------------------------------ */

/** Create a new scenario from base probe scores and adjustments. */
export function createScenario(
  name: string,
  description: string,
  baseAuditId: string,
  baseScores: BaseProbeScore[],
  adjustments: ProbeScoreAdjustment[],
  tags: string[] = []
): Scenario {
  const adjusted = applyAdjustments(baseScores, adjustments);
  const now = new Date().toISOString();

  const scenario: Scenario = {
    id: generateId(),
    name,
    description,
    baseAuditId,
    adjustments,
    createdAt: now,
    updatedAt: now,
    tags,
    projectedOverallScore: computeOverallScore(adjusted),
    projectedTheoryScores: computeTheoryScores(adjusted),
  };

  scenarios.set(scenario.id, scenario);
  return scenario;
}

/** Update adjustments in an existing scenario. */
export function updateScenario(
  scenarioId: string,
  baseScores: BaseProbeScore[],
  adjustments: ProbeScoreAdjustment[]
): Scenario {
  const scenario = scenarios.get(scenarioId);
  if (!scenario) throw new Error(`Scenario ${scenarioId} not found`);

  const adjusted = applyAdjustments(baseScores, adjustments);
  scenario.adjustments = adjustments;
  scenario.projectedOverallScore = computeOverallScore(adjusted);
  scenario.projectedTheoryScores = computeTheoryScores(adjusted);
  scenario.updatedAt = new Date().toISOString();

  return scenario;
}

/** Get a scenario by ID. */
export function getScenario(scenarioId: string): Scenario | undefined {
  return scenarios.get(scenarioId);
}

/** List all scenarios. */
export function listScenarios(): Scenario[] {
  return Array.from(scenarios.values());
}

/** Delete a scenario. */
export function deleteScenario(scenarioId: string): boolean {
  return scenarios.delete(scenarioId);
}

/** Save a scenario (serialize to JSON for export). */
export function exportScenario(scenarioId: string): string {
  const scenario = scenarios.get(scenarioId);
  if (!scenario) throw new Error(`Scenario ${scenarioId} not found`);
  return JSON.stringify(scenario, null, 2);
}

/** Import a scenario from JSON. */
export function importScenario(json: string): Scenario {
  const scenario: Scenario = JSON.parse(json);
  if (!scenario.id || !scenario.name) {
    throw new Error("Invalid scenario JSON: missing id or name");
  }
  scenarios.set(scenario.id, scenario);
  return scenario;
}

/* ------------------------------------------------------------------ */
/*  Scenario diff                                                     */
/* ------------------------------------------------------------------ */

/** Compare two scenarios and produce a diff. */
export function diffScenarios(
  scenarioIdA: string,
  scenarioIdB: string
): ScenarioDiff {
  const a = scenarios.get(scenarioIdA);
  const b = scenarios.get(scenarioIdB);
  if (!a) throw new Error(`Scenario ${scenarioIdA} not found`);
  if (!b) throw new Error(`Scenario ${scenarioIdB} not found`);

  const overallDelta =
    (b.projectedOverallScore ?? 0) - (a.projectedOverallScore ?? 0);

  // Theory deltas
  const theoryDeltas: Record<string, number> = {};
  const theories = new Set([
    ...Object.keys(a.projectedTheoryScores ?? {}),
    ...Object.keys(b.projectedTheoryScores ?? {}),
  ]);
  for (const theory of theories) {
    const scoreA = a.projectedTheoryScores?.[theory] ?? 0;
    const scoreB = b.projectedTheoryScores?.[theory] ?? 0;
    theoryDeltas[theory] = scoreB - scoreA;
  }

  // Probe deltas
  const allProbeIds = new Set([
    ...a.adjustments.map((adj) => adj.probeId),
    ...b.adjustments.map((adj) => adj.probeId),
  ]);

  const adjustmentMapA = new Map(
    a.adjustments.map((adj) => [adj.probeId, adj])
  );
  const adjustmentMapB = new Map(
    b.adjustments.map((adj) => [adj.probeId, adj])
  );

  const probeDeltas = Array.from(allProbeIds).map((probeId) => {
    const adjA = adjustmentMapA.get(probeId);
    const adjB = adjustmentMapB.get(probeId);
    const scoreA = adjA?.adjustedScore ?? adjA?.originalScore ?? 0;
    const scoreB = adjB?.adjustedScore ?? adjB?.originalScore ?? 0;
    return { probeId, scoreA, scoreB, delta: scoreB - scoreA };
  });

  const significantChanges = probeDeltas.filter(
    (d) => Math.abs(d.delta) > 0.05
  );
  const summary =
    significantChanges.length === 0
      ? "Scenarios are nearly identical"
      : `${significantChanges.length} probe(s) differ significantly. Overall score ${overallDelta >= 0 ? "+" : ""}${overallDelta.toFixed(3)}.`;

  return {
    scenarioA: scenarioIdA,
    scenarioB: scenarioIdB,
    overallDelta,
    theoryDeltas,
    probeDeltas,
    summary,
  };
}

/* ------------------------------------------------------------------ */
/*  Best / worst case auto-generation                                 */
/* ------------------------------------------------------------------ */

/** Generate a best-case scenario (all probes at maximum plausible score). */
export function generateBestCase(
  baseAuditId: string,
  baseScores: BaseProbeScore[],
  maxScore: number = 1.0
): Scenario {
  const adjustments: ProbeScoreAdjustment[] = baseScores.map((s) => ({
    probeId: s.probeId,
    originalScore: s.score,
    adjustedScore: maxScore,
    reason: "Best case: maximum plausible score",
  }));

  return createScenario(
    "Best Case",
    "All probes set to maximum plausible score",
    baseAuditId,
    baseScores,
    adjustments,
    ["auto-generated", "best-case"]
  );
}

/** Generate a worst-case scenario (all probes at minimum). */
export function generateWorstCase(
  baseAuditId: string,
  baseScores: BaseProbeScore[],
  minScore: number = 0
): Scenario {
  const adjustments: ProbeScoreAdjustment[] = baseScores.map((s) => ({
    probeId: s.probeId,
    originalScore: s.score,
    adjustedScore: minScore,
    reason: "Worst case: minimum plausible score",
  }));

  return createScenario(
    "Worst Case",
    "All probes set to minimum plausible score",
    baseAuditId,
    baseScores,
    adjustments,
    ["auto-generated", "worst-case"]
  );
}

/* ------------------------------------------------------------------ */
/*  Sensitivity analysis                                              */
/* ------------------------------------------------------------------ */

/**
 * Compute sensitivity of overall score to each probe.
 * Measures how much the overall score changes when a single probe
 * goes from 0 to max.
 */
export function sensitivityAnalysis(
  baseScores: BaseProbeScore[],
  maxScore: number = 1.0
): SensitivityResult[] {
  const baseOverall = computeOverallScore(baseScores);
  const results: SensitivityResult[] = [];

  for (const probe of baseScores) {
    // Impact when this probe is zeroed
    const withZero = baseScores.map((s) =>
      s.probeId === probe.probeId ? { ...s, score: 0 } : s
    );
    const overallWithZero = computeOverallScore(withZero);

    // Impact when this probe is maxed
    const withMax = baseScores.map((s) =>
      s.probeId === probe.probeId ? { ...s, score: maxScore } : s
    );
    const overallWithMax = computeOverallScore(withMax);

    const sensitivityIndex = overallWithMax - overallWithZero;

    results.push({
      probeId: probe.probeId,
      probeName: probe.probeName,
      theory: probe.theory,
      baseScore: probe.score,
      impactWhenZero: overallWithZero - baseOverall,
      impactWhenMax: overallWithMax - baseOverall,
      sensitivityIndex,
      rank: 0, // will be filled below
    });
  }

  // Assign ranks (higher sensitivity = rank 1)
  results.sort((a, b) => b.sensitivityIndex - a.sensitivityIndex);
  results.forEach((r, i) => {
    r.rank = i + 1;
  });

  return results;
}

/** Clear all stored scenarios (useful for testing). */
export function resetScenarios(): void {
  scenarios.clear();
}
