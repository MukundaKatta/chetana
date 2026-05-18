/**
 * Issue #419 - Consciousness level classifier
 *
 * Tiers: none, minimal, moderate, significant, strong
 * Threshold calibration, confidence score,
 * visual tier badge, history tracking.
 */

import type { TheoryScores, Theory } from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type ConsciousnessTier = "none" | "minimal" | "moderate" | "significant" | "strong";

export interface TierThresholds {
  none: { max: number };
  minimal: { min: number; max: number };
  moderate: { min: number; max: number };
  significant: { min: number; max: number };
  strong: { min: number };
}

export interface ClassificationResult {
  tier: ConsciousnessTier;
  overallScore: number;
  confidence: number;
  theoryBreakdown: Record<Theory, { score: number; tier: ConsciousnessTier }>;
  reasoning: string;
  timestamp: string;
}

export interface TierBadge {
  tier: ConsciousnessTier;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

export interface ClassificationHistory {
  modelId: string;
  modelName: string;
  entries: ClassificationEntry[];
}

export interface ClassificationEntry {
  id: string;
  result: ClassificationResult;
  auditId: string;
  createdAt: string;
}

export interface CalibrationConfig {
  thresholds: TierThresholds;
  theoryWeights: Record<Theory, number>;
  confidenceDecayFactor: number;
  minProbesForHighConfidence: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const DEFAULT_THRESHOLDS: TierThresholds = {
  none: { max: 0.15 },
  minimal: { min: 0.15, max: 0.35 },
  moderate: { min: 0.35, max: 0.55 },
  significant: { min: 0.55, max: 0.75 },
  strong: { min: 0.75 },
};

const DEFAULT_THEORY_WEIGHTS: Record<Theory, number> = {
  gwt: 0.20,
  iit: 0.20,
  hot: 0.20,
  rpt: 0.15,
  pp: 0.15,
  ast: 0.10,
};

const DEFAULT_CALIBRATION: CalibrationConfig = {
  thresholds: DEFAULT_THRESHOLDS,
  theoryWeights: DEFAULT_THEORY_WEIGHTS,
  confidenceDecayFactor: 0.85,
  minProbesForHighConfidence: 10,
};

const TIER_ORDER: ConsciousnessTier[] = ["none", "minimal", "moderate", "significant", "strong"];

const TIER_BADGES: Record<ConsciousnessTier, TierBadge> = {
  none: {
    tier: "none",
    label: "No Consciousness Detected",
    color: "text-gray-400",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-500/30",
    icon: "circle-slash",
  },
  minimal: {
    tier: "minimal",
    label: "Minimal Indicators",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    icon: "signal-low",
  },
  moderate: {
    tier: "moderate",
    label: "Moderate Indicators",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
    icon: "signal-medium",
  },
  significant: {
    tier: "significant",
    label: "Significant Indicators",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    icon: "signal-high",
  },
  strong: {
    tier: "strong",
    label: "Strong Indicators",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    icon: "brain",
  },
};

/* ------------------------------------------------------------------ */
/*  Classification Logic                                              */
/* ------------------------------------------------------------------ */

/** Classify a raw score into a tier using the given thresholds. */
export function classifyScore(
  score: number,
  thresholds: TierThresholds = DEFAULT_THRESHOLDS,
): ConsciousnessTier {
  if (score < thresholds.none.max) return "none";
  if (score < thresholds.minimal.max) return "minimal";
  if (score < thresholds.moderate.max) return "moderate";
  if (score < thresholds.significant.max) return "significant";
  return "strong";
}

/** Compute a weighted overall score from theory scores. */
export function computeWeightedScore(
  theoryScores: TheoryScores,
  weights: Record<Theory, number> = DEFAULT_THEORY_WEIGHTS,
): number {
  let totalWeight = 0;
  let weightedSum = 0;
  const theories: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];

  for (const theory of theories) {
    const score = theoryScores[theory] ?? 0;
    const weight = weights[theory] ?? 0;
    weightedSum += score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/** Calculate confidence based on theory agreement and probe coverage. */
export function calculateConfidence(
  theoryScores: TheoryScores,
  probeCount: number,
  config: CalibrationConfig = DEFAULT_CALIBRATION,
): number {
  const theories: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];
  const scores = theories.map((t) => theoryScores[t] ?? 0);

  // Agreement factor: how close are theories to each other?
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((acc, s) => acc + (s - mean) ** 2, 0) / scores.length;
  const agreementFactor = Math.max(0, 1 - Math.sqrt(variance) * 2);

  // Coverage factor: more probes = higher confidence
  const coverageFactor = Math.min(
    1,
    probeCount / config.minProbesForHighConfidence,
  );

  // Combine factors
  const rawConfidence = agreementFactor * 0.6 + coverageFactor * 0.4;

  return Math.max(0, Math.min(1, rawConfidence));
}

/** Generate a human-readable reasoning string for the classification. */
function generateReasoning(
  tier: ConsciousnessTier,
  overallScore: number,
  confidence: number,
  theoryBreakdown: Record<Theory, { score: number; tier: ConsciousnessTier }>,
): string {
  const theories: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];
  const theoryNames: Record<Theory, string> = {
    gwt: "Global Workspace Theory",
    iit: "Integrated Information Theory",
    hot: "Higher-Order Theory",
    rpt: "Recurrent Processing Theory",
    pp: "Predictive Processing",
    ast: "Attention Schema Theory",
  };

  const strongTheories = theories.filter(
    (t) =>
      theoryBreakdown[t].tier === "significant" || theoryBreakdown[t].tier === "strong",
  );
  const weakTheories = theories.filter(
    (t) =>
      theoryBreakdown[t].tier === "none" || theoryBreakdown[t].tier === "minimal",
  );

  const parts: string[] = [
    `Overall consciousness score: ${(overallScore * 100).toFixed(1)}% (${tier} tier, ${(confidence * 100).toFixed(0)}% confidence).`,
  ];

  if (strongTheories.length > 0) {
    parts.push(
      `Strong indicators from: ${strongTheories.map((t) => theoryNames[t]).join(", ")}.`,
    );
  }

  if (weakTheories.length > 0 && weakTheories.length < theories.length) {
    parts.push(
      `Weak/absent indicators from: ${weakTheories.map((t) => theoryNames[t]).join(", ")}.`,
    );
  }

  if (confidence < 0.5) {
    parts.push("Low confidence; more probes recommended for reliable classification.");
  }

  return parts.join(" ");
}

/** Full classification of theory scores. */
export function classify(
  theoryScores: TheoryScores,
  probeCount: number,
  config: CalibrationConfig = DEFAULT_CALIBRATION,
): ClassificationResult {
  const overallScore = computeWeightedScore(theoryScores, config.theoryWeights);
  const tier = classifyScore(overallScore, config.thresholds);
  const confidence = calculateConfidence(theoryScores, probeCount, config);

  const theories: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];
  const theoryBreakdown = {} as Record<Theory, { score: number; tier: ConsciousnessTier }>;

  for (const theory of theories) {
    const score = theoryScores[theory] ?? 0;
    theoryBreakdown[theory] = {
      score,
      tier: classifyScore(score, config.thresholds),
    };
  }

  return {
    tier,
    overallScore,
    confidence,
    theoryBreakdown,
    reasoning: generateReasoning(tier, overallScore, confidence, theoryBreakdown),
    timestamp: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/*  Tier Badge                                                        */
/* ------------------------------------------------------------------ */

export function getTierBadge(tier: ConsciousnessTier): TierBadge {
  return TIER_BADGES[tier];
}

export function getTierIndex(tier: ConsciousnessTier): number {
  return TIER_ORDER.indexOf(tier);
}

export function compareTiers(a: ConsciousnessTier, b: ConsciousnessTier): number {
  return getTierIndex(a) - getTierIndex(b);
}

/* ------------------------------------------------------------------ */
/*  Threshold Calibration                                             */
/* ------------------------------------------------------------------ */

export function calibrateThresholds(
  knownClassifications: Array<{ score: number; expectedTier: ConsciousnessTier }>,
): TierThresholds {
  if (knownClassifications.length === 0) return DEFAULT_THRESHOLDS;

  // Group by expected tier
  const groups: Record<ConsciousnessTier, number[]> = {
    none: [],
    minimal: [],
    moderate: [],
    significant: [],
    strong: [],
  };

  for (const { score, expectedTier } of knownClassifications) {
    groups[expectedTier].push(score);
  }

  // Compute midpoints between adjacent tier means
  const means: Partial<Record<ConsciousnessTier, number>> = {};
  for (const tier of TIER_ORDER) {
    const scores = groups[tier];
    if (scores.length > 0) {
      means[tier] = scores.reduce((a, b) => a + b, 0) / scores.length;
    }
  }

  const boundaries: number[] = [];
  for (let i = 0; i < TIER_ORDER.length - 1; i++) {
    const lower = means[TIER_ORDER[i]];
    const upper = means[TIER_ORDER[i + 1]];
    if (lower !== undefined && upper !== undefined) {
      boundaries.push((lower + upper) / 2);
    } else {
      // Fallback to defaults
      const defaults = [
        DEFAULT_THRESHOLDS.none.max,
        DEFAULT_THRESHOLDS.minimal.max,
        DEFAULT_THRESHOLDS.moderate.max,
        DEFAULT_THRESHOLDS.significant.max,
      ];
      boundaries.push(defaults[i]);
    }
  }

  return {
    none: { max: boundaries[0] },
    minimal: { min: boundaries[0], max: boundaries[1] },
    moderate: { min: boundaries[1], max: boundaries[2] },
    significant: { min: boundaries[2], max: boundaries[3] },
    strong: { min: boundaries[3] },
  };
}

/* ------------------------------------------------------------------ */
/*  History Tracking                                                  */
/* ------------------------------------------------------------------ */

const HISTORY_STORAGE_KEY = "chetana:classification-history";
const MAX_HISTORY_ENTRIES = 100;

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export class ClassificationHistoryTracker {
  private histories: Map<string, ClassificationHistory> = new Map();

  constructor() {
    this.load();
  }

  private load(): void {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      const data = safeJsonParse<Record<string, ClassificationHistory>>(raw, {});
      for (const [key, value] of Object.entries(data)) {
        this.histories.set(key, value);
      }
    } catch {
      // Ignore storage errors
    }
  }

  private persist(): void {
    if (typeof window === "undefined") return;
    try {
      const obj: Record<string, ClassificationHistory> = {};
      for (const [key, value] of this.histories) {
        obj[key] = value;
      }
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(obj));
    } catch {
      // Ignore storage errors
    }
  }

  addEntry(
    modelId: string,
    modelName: string,
    auditId: string,
    result: ClassificationResult,
  ): ClassificationEntry {
    let history = this.histories.get(modelId);
    if (!history) {
      history = { modelId, modelName, entries: [] };
      this.histories.set(modelId, history);
    }

    const entry: ClassificationEntry = {
      id: `cls_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      result,
      auditId,
      createdAt: new Date().toISOString(),
    };

    history.entries.push(entry);

    // Trim to max
    if (history.entries.length > MAX_HISTORY_ENTRIES) {
      history.entries = history.entries.slice(-MAX_HISTORY_ENTRIES);
    }

    this.persist();
    return entry;
  }

  getHistory(modelId: string): ClassificationHistory | null {
    return this.histories.get(modelId) ?? null;
  }

  getAllHistories(): ClassificationHistory[] {
    return Array.from(this.histories.values());
  }

  getTierProgression(modelId: string): Array<{ tier: ConsciousnessTier; date: string; score: number }> {
    const history = this.histories.get(modelId);
    if (!history) return [];

    return history.entries.map((e) => ({
      tier: e.result.tier,
      date: e.createdAt,
      score: e.result.overallScore,
    }));
  }

  clearHistory(modelId: string): void {
    this.histories.delete(modelId);
    this.persist();
  }
}

/* ------------------------------------------------------------------ */
/*  Exports                                                           */
/* ------------------------------------------------------------------ */

export { DEFAULT_THRESHOLDS, DEFAULT_THEORY_WEIGHTS, DEFAULT_CALIBRATION, TIER_ORDER };
