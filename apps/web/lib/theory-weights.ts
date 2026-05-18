import type { Theory, TheoryScores } from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface TheoryWeight {
  theory: Theory;
  label: string;
  weight: number;
  min: number;
  max: number;
  step: number;
  description: string;
}

export interface WeightProfile {
  id: string;
  name: string;
  description: string;
  weights: Record<Theory, number>;
  isPreset: boolean;
  createdAt: string;
}

export interface SensitivityResult {
  theory: Theory;
  originalScore: number;
  adjustedScore: number;
  delta: number;
  sensitivity: number;
}

export interface RecalculationResult {
  overallScore: number;
  normalizedWeights: Record<Theory, number>;
  weightedScores: Record<Theory, number>;
  sensitivity: SensitivityResult[];
}

/* ------------------------------------------------------------------ */
/*  Default slider configs                                            */
/* ------------------------------------------------------------------ */

const THEORY_LABELS: Record<Theory, string> = {
  gwt: "Global Workspace Theory",
  iit: "Integrated Information Theory",
  hot: "Higher-Order Theory",
  rpt: "Recurrent Processing Theory",
  pp: "Predictive Processing",
  ast: "Attention Schema Theory",
};

const THEORY_DESCRIPTIONS: Record<Theory, string> = {
  gwt: "Consciousness arises from information broadcast across a global workspace.",
  iit: "Consciousness correlates with integrated information (phi).",
  hot: "Consciousness requires higher-order representations of mental states.",
  rpt: "Recurrent processing loops are necessary for conscious experience.",
  pp: "Consciousness emerges from hierarchical predictive processing.",
  ast: "The brain models its own attention, creating an internal schema.",
};

export function createDefaultSliders(): TheoryWeight[] {
  const theories: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];
  return theories.map((theory) => ({
    theory,
    label: THEORY_LABELS[theory],
    weight: 1.0,
    min: 0,
    max: 3,
    step: 0.05,
    description: THEORY_DESCRIPTIONS[theory],
  }));
}

/* ------------------------------------------------------------------ */
/*  Preset profiles                                                   */
/* ------------------------------------------------------------------ */

export const PRESET_PROFILES: WeightProfile[] = [
  {
    id: "balanced",
    name: "Balanced",
    description: "Equal weight across all theories.",
    weights: { gwt: 1, iit: 1, hot: 1, rpt: 1, pp: 1, ast: 1 },
    isPreset: true,
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "iit-focused",
    name: "IIT-Focused",
    description: "Emphasises integrated information and causal structure.",
    weights: { gwt: 0.6, iit: 2.5, hot: 0.8, rpt: 1.0, pp: 0.8, ast: 0.5 },
    isPreset: true,
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "gwt-focused",
    name: "GWT-Focused",
    description: "Emphasises global workspace broadcast and integration.",
    weights: { gwt: 2.5, iit: 0.6, hot: 1.0, rpt: 0.8, pp: 0.8, ast: 0.5 },
    isPreset: true,
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "hot-focused",
    name: "HOT-Focused",
    description: "Emphasises higher-order thought and metacognition.",
    weights: { gwt: 0.8, iit: 0.6, hot: 2.5, rpt: 0.8, pp: 1.0, ast: 1.0 },
    isPreset: true,
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "pp-focused",
    name: "PP-Focused",
    description: "Emphasises predictive processing and surprise minimisation.",
    weights: { gwt: 0.8, iit: 0.6, hot: 0.8, rpt: 1.0, pp: 2.5, ast: 0.5 },
    isPreset: true,
    createdAt: "2025-01-01T00:00:00Z",
  },
];

/* ------------------------------------------------------------------ */
/*  Weight normalisation                                              */
/* ------------------------------------------------------------------ */

export function normalizeWeights(weights: Record<Theory, number>): Record<Theory, number> {
  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  if (total === 0) {
    const theories = Object.keys(weights) as Theory[];
    const even = 1 / theories.length;
    return Object.fromEntries(theories.map((t) => [t, even])) as Record<Theory, number>;
  }
  return Object.fromEntries(
    (Object.entries(weights) as [Theory, number][]).map(([t, w]) => [t, w / total]),
  ) as Record<Theory, number>;
}

/* ------------------------------------------------------------------ */
/*  Recalculation                                                     */
/* ------------------------------------------------------------------ */

export function recalculateScores(
  theoryScores: TheoryScores,
  weights: Record<Theory, number>,
): RecalculationResult {
  const normalized = normalizeWeights(weights);
  const theories = Object.keys(normalized) as Theory[];

  const weightedScores = Object.fromEntries(
    theories.map((t) => [t, theoryScores[t] * normalized[t]]),
  ) as Record<Theory, number>;

  const overallScore = theories.reduce((sum, t) => sum + weightedScores[t], 0);

  const sensitivity = theories.map((theory) => {
    const perturbation = 0.1;
    const tweakedUp = { ...weights, [theory]: weights[theory] + perturbation };
    const tweakedDown = { ...weights, [theory]: Math.max(0, weights[theory] - perturbation) };

    const normUp = normalizeWeights(tweakedUp);
    const normDown = normalizeWeights(tweakedDown);

    const scoreUp = theories.reduce((s, t) => s + theoryScores[t] * normUp[t], 0);
    const scoreDown = theories.reduce((s, t) => s + theoryScores[t] * normDown[t], 0);

    const delta = scoreUp - scoreDown;
    const sens = Math.abs(delta) / (2 * perturbation);

    return {
      theory,
      originalScore: theoryScores[theory],
      adjustedScore: weightedScores[theory],
      delta,
      sensitivity: sens,
    };
  });

  return { overallScore, normalizedWeights: normalized, weightedScores, sensitivity };
}

/* ------------------------------------------------------------------ */
/*  Sensitivity analysis                                              */
/* ------------------------------------------------------------------ */

export function fullSensitivityAnalysis(
  theoryScores: TheoryScores,
  weights: Record<Theory, number>,
  steps: number = 10,
): { theory: Theory; weightValues: number[]; scoreValues: number[] }[] {
  const theories = Object.keys(weights) as Theory[];

  return theories.map((theory) => {
    const weightValues: number[] = [];
    const scoreValues: number[] = [];

    for (let i = 0; i <= steps; i++) {
      const w = (i / steps) * 3;
      weightValues.push(w);
      const tweaked = { ...weights, [theory]: w };
      const norm = normalizeWeights(tweaked);
      const score = theories.reduce((s, t) => s + theoryScores[t] * norm[t], 0);
      scoreValues.push(score);
    }

    return { theory, weightValues, scoreValues };
  });
}

/* ------------------------------------------------------------------ */
/*  Profile persistence (localStorage)                                */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "chetana:custom-weight-profiles";

export function loadCustomProfiles(): WeightProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WeightProfile[];
  } catch {
    return [];
  }
}

export function saveCustomProfile(profile: Omit<WeightProfile, "id" | "isPreset" | "createdAt">): WeightProfile {
  const saved: WeightProfile = {
    ...profile,
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    isPreset: false,
    createdAt: new Date().toISOString(),
  };
  const existing = loadCustomProfiles();
  existing.push(saved);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  }
  return saved;
}

export function deleteCustomProfile(id: string): void {
  const existing = loadCustomProfiles().filter((p) => p.id !== id);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  }
}

export function getAllProfiles(): WeightProfile[] {
  return [...PRESET_PROFILES, ...loadCustomProfiles()];
}
