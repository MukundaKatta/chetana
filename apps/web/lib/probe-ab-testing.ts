/**
 * Probe A/B testing framework with variant creation,
 * random assignment per audit, statistical comparison,
 * winner selection, and auto-promotion (Issue #391).
 */

import type { ProbeDefinition, ProbeResult, Theory, IndicatorId } from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type ExperimentStatus = "draft" | "running" | "completed" | "cancelled";
export type VariantLabel = "control" | "variant_a" | "variant_b" | "variant_c";

export interface ProbeVariant {
  id: string;
  label: VariantLabel;
  probe: ProbeDefinition;
  description: string;
}

export interface ProbeExperiment {
  id: string;
  name: string;
  description: string;
  baseProbeId: string;
  indicatorId: IndicatorId;
  theory: Theory;
  variants: ProbeVariant[];
  status: ExperimentStatus;
  /** Required sample size per variant. */
  targetSampleSize: number;
  /** Traffic allocation per variant (0-1, must sum to 1). */
  trafficAllocation: Record<string, number>;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  winnerId: string | null;
}

export interface VariantResult {
  variantId: string;
  label: VariantLabel;
  scores: number[];
  sampleSize: number;
  mean: number;
  stdDev: number;
  confidence95: [number, number];
}

export interface ExperimentComparison {
  experimentId: string;
  variants: VariantResult[];
  /** Pairwise comparisons between control and each variant. */
  pairwise: PairwiseResult[];
  /** The recommended winner (or null if inconclusive). */
  winner: VariantResult | null;
  /** Whether the experiment has reached statistical significance. */
  isSignificant: boolean;
  /** Power analysis: whether sufficient samples were collected. */
  hasSufficientPower: boolean;
  summary: string;
}

export interface PairwiseResult {
  controlId: string;
  variantId: string;
  controlMean: number;
  variantMean: number;
  difference: number;
  /** Percentage improvement over control. */
  improvement: number;
  /** Two-sample t-test p-value. */
  pValue: number;
  /** Whether the difference is statistically significant at alpha=0.05. */
  significant: boolean;
  /** Effect size (Cohen's d). */
  effectSize: number;
  effectLabel: "negligible" | "small" | "medium" | "large";
}

/* ------------------------------------------------------------------ */
/*  Stats helpers                                                     */
/* ------------------------------------------------------------------ */

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance =
    values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function confidence95(values: number[]): [number, number] {
  const m = mean(values);
  const se = stdDev(values) / Math.sqrt(values.length);
  const z = 1.96;
  return [
    Math.round((m - z * se) * 10000) / 10000,
    Math.round((m + z * se) * 10000) / 10000,
  ];
}

/**
 * Two-sample Welch's t-test (unequal variances).
 * Returns a p-value (approximate using t-distribution approximation).
 */
function welchTTest(
  a: number[],
  b: number[],
): { tStat: number; pValue: number } {
  const nA = a.length;
  const nB = b.length;
  if (nA < 2 || nB < 2) return { tStat: 0, pValue: 1 };

  const mA = mean(a);
  const mB = mean(b);
  const vA = a.reduce((s, x) => s + (x - mA) ** 2, 0) / (nA - 1);
  const vB = b.reduce((s, x) => s + (x - mB) ** 2, 0) / (nB - 1);

  const se = Math.sqrt(vA / nA + vB / nB);
  if (se === 0) return { tStat: 0, pValue: 1 };

  const tStat = (mA - mB) / se;

  // Welch-Satterthwaite degrees of freedom
  const dfNum = (vA / nA + vB / nB) ** 2;
  const dfDen =
    (vA / nA) ** 2 / (nA - 1) + (vB / nB) ** 2 / (nB - 1);
  const df = dfNum / dfDen;

  // Approximate p-value using the t-distribution
  // Using a simple approximation for |t| > 0
  const absT = Math.abs(tStat);
  const pValue = approximateTwoTailP(absT, df);

  return { tStat, pValue };
}

/**
 * Approximate two-tailed p-value from a t-distribution.
 * Uses the regularized incomplete beta function approximation.
 */
function approximateTwoTailP(t: number, df: number): number {
  // For large df, approximate using normal distribution
  if (df > 100) {
    // Normal approximation
    const z = t;
    const p = 2 * normalCDF(-Math.abs(z));
    return Math.max(0, Math.min(1, p));
  }

  // Simple approximation using the formula:
  // p ≈ 2 * (1 - Φ(|t| * sqrt(df / (df + t^2))))
  const x = df / (df + t * t);
  const p = 2 * normalCDF(-Math.abs(t) * Math.sqrt(x));
  return Math.max(0, Math.min(1, p));
}

function normalCDF(x: number): number {
  // Approximation using Abramowitz and Stegun
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.SQRT2;

  const t = 1.0 / (1.0 + p * x);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Cohen's d effect size.
 */
function cohensD(a: number[], b: number[]): number {
  const mA = mean(a);
  const mB = mean(b);
  const sA = stdDev(a);
  const sB = stdDev(b);

  // Pooled standard deviation
  const nA = a.length;
  const nB = b.length;
  const pooledSD = Math.sqrt(
    ((nA - 1) * sA ** 2 + (nB - 1) * sB ** 2) / (nA + nB - 2),
  );

  if (pooledSD === 0) return 0;
  return Math.abs(mA - mB) / pooledSD;
}

function effectSizeLabel(d: number): PairwiseResult["effectLabel"] {
  if (d < 0.2) return "negligible";
  if (d < 0.5) return "small";
  if (d < 0.8) return "medium";
  return "large";
}

/* ------------------------------------------------------------------ */
/*  Variant creation                                                  */
/* ------------------------------------------------------------------ */

/**
 * Create a variant probe from a base probe with modifications.
 */
export function createVariant(
  base: ProbeDefinition,
  label: VariantLabel,
  modifications: Partial<Pick<ProbeDefinition, "prompt" | "systemPrompt" | "scoringCriteria" | "followUp">>,
  description: string,
): ProbeVariant {
  return {
    id: `${base.id}_${label}`,
    label,
    probe: {
      ...base,
      id: `${base.id}_${label}`,
      name: `${base.name} (${label})`,
      ...modifications,
    },
    description,
  };
}

/* ------------------------------------------------------------------ */
/*  Assignment                                                        */
/* ------------------------------------------------------------------ */

/**
 * Deterministic assignment: hash auditId to pick a variant.
 */
export function assignVariant(
  experiment: ProbeExperiment,
  auditId: string,
): ProbeVariant | null {
  if (experiment.status !== "running") return null;
  if (experiment.variants.length === 0) return null;

  // Hash the audit ID for consistent assignment
  const hash = djb2Hash(`${experiment.id}:${auditId}`);
  const bucket = (hash % 10000) / 10000;

  let cumulative = 0;
  for (const variant of experiment.variants) {
    cumulative += experiment.trafficAllocation[variant.id] ?? (1 / experiment.variants.length);
    if (bucket < cumulative) {
      return variant;
    }
  }

  return experiment.variants[experiment.variants.length - 1];
}

function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

/* ------------------------------------------------------------------ */
/*  Statistical comparison                                            */
/* ------------------------------------------------------------------ */

/**
 * Compare experiment results across variants.
 */
export function compareVariants(
  experiment: ProbeExperiment,
  resultsByVariant: Map<string, ProbeResult[]>,
): ExperimentComparison {
  const variantResults: VariantResult[] = experiment.variants.map((v) => {
    const results = resultsByVariant.get(v.id) ?? [];
    const scores = results.map((r) => r.score);
    return {
      variantId: v.id,
      label: v.label,
      scores,
      sampleSize: scores.length,
      mean: round(mean(scores)),
      stdDev: round(stdDev(scores)),
      confidence95: confidence95(scores),
    };
  });

  // Find control
  const control = variantResults.find((v) => v.label === "control");
  const pairwise: PairwiseResult[] = [];

  if (control) {
    for (const variant of variantResults) {
      if (variant.variantId === control.variantId) continue;

      const { tStat, pValue } = welchTTest(control.scores, variant.scores);
      const d = cohensD(control.scores, variant.scores);
      const diff = variant.mean - control.mean;
      const improvement =
        control.mean !== 0 ? (diff / Math.abs(control.mean)) * 100 : 0;

      pairwise.push({
        controlId: control.variantId,
        variantId: variant.variantId,
        controlMean: control.mean,
        variantMean: variant.mean,
        difference: round(diff),
        improvement: round(improvement),
        pValue: round(pValue),
        significant: pValue < 0.05,
        effectSize: round(d),
        effectLabel: effectSizeLabel(d),
      });
    }
  }

  const isSignificant = pairwise.some((p) => p.significant);
  const hasSufficientPower = variantResults.every(
    (v) => v.sampleSize >= experiment.targetSampleSize,
  );

  // Select winner: variant with highest mean that's significantly better than control
  let winner: VariantResult | null = null;
  const significantWinners = pairwise
    .filter((p) => p.significant && p.difference > 0)
    .sort((a, b) => b.difference - a.difference);

  if (significantWinners.length > 0) {
    winner =
      variantResults.find(
        (v) => v.variantId === significantWinners[0].variantId,
      ) ?? null;
  } else if (hasSufficientPower && !isSignificant) {
    // No significant difference found - control wins by default
    winner = control ?? null;
  }

  const summary = generateSummary(
    variantResults,
    pairwise,
    winner,
    isSignificant,
    hasSufficientPower,
  );

  return {
    experimentId: experiment.id,
    variants: variantResults,
    pairwise,
    winner,
    isSignificant,
    hasSufficientPower,
    summary,
  };
}

function generateSummary(
  variants: VariantResult[],
  pairwise: PairwiseResult[],
  winner: VariantResult | null,
  isSignificant: boolean,
  hasSufficientPower: boolean,
): string {
  const lines: string[] = ["Probe A/B Test Results"];

  for (const v of variants) {
    lines.push(
      `  ${v.label}: mean=${v.mean.toFixed(4)}, n=${v.sampleSize}, CI=[${v.confidence95[0].toFixed(4)}, ${v.confidence95[1].toFixed(4)}]`,
    );
  }

  if (pairwise.length > 0) {
    lines.push("");
    lines.push("Pairwise comparisons:");
    for (const p of pairwise) {
      const sigLabel = p.significant ? "SIGNIFICANT" : "not significant";
      lines.push(
        `  Control vs ${p.variantId}: diff=${p.difference.toFixed(4)} (${p.improvement.toFixed(1)}%), p=${p.pValue.toFixed(4)} [${sigLabel}], d=${p.effectSize.toFixed(2)} (${p.effectLabel})`,
      );
    }
  }

  lines.push("");
  if (!hasSufficientPower) {
    lines.push("Insufficient sample size - continue collecting data.");
  } else if (winner) {
    lines.push(`Winner: ${winner.label} (mean=${winner.mean.toFixed(4)})`);
  } else {
    lines.push("No clear winner detected.");
  }

  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/*  Auto-promotion                                                    */
/* ------------------------------------------------------------------ */

/**
 * Check if the experiment should auto-promote the winner.
 * Returns the winning probe definition if promotion criteria are met.
 */
export function checkAutoPromotion(
  experiment: ProbeExperiment,
  comparison: ExperimentComparison,
  options?: {
    minSampleSize?: number;
    minEffectSize?: number;
    maxPValue?: number;
  },
): { shouldPromote: boolean; probe: ProbeDefinition | null; reason: string } {
  const minSample = options?.minSampleSize ?? experiment.targetSampleSize;
  const minEffect = options?.minEffectSize ?? 0.2;
  const maxP = options?.maxPValue ?? 0.05;

  if (!comparison.hasSufficientPower) {
    return {
      shouldPromote: false,
      probe: null,
      reason: `Insufficient samples (need ${minSample} per variant)`,
    };
  }

  if (!comparison.isSignificant) {
    return {
      shouldPromote: false,
      probe: null,
      reason: "No statistically significant difference found",
    };
  }

  // Find the best significant variant
  const bestPairwise = comparison.pairwise
    .filter((p) => p.significant && p.pValue <= maxP && p.effectSize >= minEffect && p.difference > 0)
    .sort((a, b) => b.difference - a.difference)[0];

  if (!bestPairwise) {
    return {
      shouldPromote: false,
      probe: null,
      reason: `No variant meets promotion criteria (minEffect=${minEffect}, maxP=${maxP})`,
    };
  }

  const winningVariant = experiment.variants.find(
    (v) => v.id === bestPairwise.variantId,
  );

  if (!winningVariant) {
    return {
      shouldPromote: false,
      probe: null,
      reason: "Winning variant not found",
    };
  }

  return {
    shouldPromote: true,
    probe: winningVariant.probe,
    reason: `Variant "${winningVariant.label}" is significantly better (diff=${bestPairwise.difference.toFixed(4)}, p=${bestPairwise.pValue.toFixed(4)}, d=${bestPairwise.effectSize.toFixed(2)})`,
  };
}

/* ------------------------------------------------------------------ */
/*  Experiment manager                                                */
/* ------------------------------------------------------------------ */

export class ProbeABTestManager {
  private experiments = new Map<string, ProbeExperiment>();

  createExperiment(options: {
    name: string;
    description: string;
    baseProbe: ProbeDefinition;
    variants: Array<{
      label: VariantLabel;
      modifications: Partial<Pick<ProbeDefinition, "prompt" | "systemPrompt" | "scoringCriteria" | "followUp">>;
      description: string;
    }>;
    targetSampleSize?: number;
  }): ProbeExperiment {
    const baseVariant = createVariant(
      options.baseProbe,
      "control",
      {},
      "Original probe (control)",
    );

    const variants = [
      baseVariant,
      ...options.variants.map((v) =>
        createVariant(options.baseProbe, v.label, v.modifications, v.description),
      ),
    ];

    const allocation: Record<string, number> = {};
    const weight = 1 / variants.length;
    for (const v of variants) {
      allocation[v.id] = weight;
    }

    const experiment: ProbeExperiment = {
      id: `exp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      name: options.name,
      description: options.description,
      baseProbeId: options.baseProbe.id,
      indicatorId: options.baseProbe.indicatorId,
      theory: options.baseProbe.theory,
      variants,
      status: "draft",
      targetSampleSize: options.targetSampleSize ?? 30,
      trafficAllocation: allocation,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      winnerId: null,
    };

    this.experiments.set(experiment.id, experiment);
    return experiment;
  }

  startExperiment(experimentId: string): boolean {
    const exp = this.experiments.get(experimentId);
    if (!exp || exp.status !== "draft") return false;
    exp.status = "running";
    exp.startedAt = new Date().toISOString();
    return true;
  }

  completeExperiment(experimentId: string, winnerId?: string): boolean {
    const exp = this.experiments.get(experimentId);
    if (!exp || exp.status !== "running") return false;
    exp.status = "completed";
    exp.completedAt = new Date().toISOString();
    exp.winnerId = winnerId ?? null;
    return true;
  }

  cancelExperiment(experimentId: string): boolean {
    const exp = this.experiments.get(experimentId);
    if (!exp || exp.status === "completed") return false;
    exp.status = "cancelled";
    exp.completedAt = new Date().toISOString();
    return true;
  }

  getExperiment(experimentId: string): ProbeExperiment | undefined {
    return this.experiments.get(experimentId);
  }

  listExperiments(status?: ExperimentStatus): ProbeExperiment[] {
    const all = Array.from(this.experiments.values());
    return status ? all.filter((e) => e.status === status) : all;
  }

  /**
   * Get the probe to use for a given audit, respecting experiments.
   */
  getProbeForAudit(
    baseProbeId: string,
    auditId: string,
  ): ProbeDefinition | null {
    // Find running experiment for this probe
    const experiment = Array.from(this.experiments.values()).find(
      (e) => e.baseProbeId === baseProbeId && e.status === "running",
    );

    if (!experiment) return null;

    const variant = assignVariant(experiment, auditId);
    return variant?.probe ?? null;
  }
}

/* ------------------------------------------------------------------ */
/*  Utilities                                                         */
/* ------------------------------------------------------------------ */

function round(v: number, decimals: number = 4): number {
  const factor = 10 ** decimals;
  return Math.round(v * factor) / factor;
}
