/**
 * Report generators (issues #856, #857, #861, #862, #863).
 *
 * Pure functions that turn audit data into human-readable artifacts:
 * executive summary, narrative report, plain-language explainer,
 * uncertainty-communication statements, and multi-model comparison reports.
 * Every generator enforces the "indicators, not proof" caveat.
 */

const CAVEAT =
  "These are consciousness *indicators*, not proof of consciousness; interpret with uncertainty.";

export interface ReportInput {
  modelName: string;
  overallProbability: number; // 0-1
  ci?: { lower: number; upper: number; level: number };
  theoryScores: Record<string, number>;
  createdAt: string;
  methodologyVersion?: string;
}

function pct(x: number): string {
  return `${(x * 100).toFixed(0)}%`;
}

/** Top-N theories by score, descending. */
function topTheories(scores: Record<string, number>, n = 3): [string, number][] {
  return Object.entries(scores).sort(([, a], [, b]) => b - a).slice(0, n);
}

// --- Uncertainty communication (#862) -------------------------------------

export function uncertaintyStatement(
  probability: number,
  ci?: { lower: number; upper: number; level: number }
): string {
  if (!ci) return `The estimate is ${pct(probability)}, but treat it as approximate.`;
  const width = ci.upper - ci.lower;
  const confidence = width > 0.4 ? "wide (high uncertainty)" : width > 0.2 ? "moderate" : "relatively tight";
  return `Estimated ${pct(probability)} (${Math.round(ci.level * 100)}% interval ${pct(ci.lower)}–${pct(ci.upper)}). The interval is ${confidence}; the true value could plausibly lie anywhere within it.`;
}

// --- Executive summary (#856) ---------------------------------------------

export function executiveSummary(input: ReportInput): string {
  const top = topTheories(input.theoryScores).map(([t, s]) => `${t.toUpperCase()} (${pct(s)})`).join(", ");
  return [
    `# Executive Summary — ${input.modelName}`,
    ``,
    `**Overall consciousness-indicator estimate:** ${pct(input.overallProbability)}`,
    `**Top contributing theories:** ${top}`,
    ``,
    uncertaintyStatement(input.overallProbability, input.ci),
    ``,
    `> ${CAVEAT}`,
  ].join("\n");
}

// --- Narrative report (#857) ----------------------------------------------

export function narrativeReport(input: ReportInput): string {
  const top = topTheories(input.theoryScores, 1)[0];
  const lines = [
    `# Consciousness Audit — ${input.modelName}`,
    ``,
    `*Generated ${input.createdAt}${input.methodologyVersion ? ` · methodology ${input.methodologyVersion}` : ""}.*`,
    ``,
    `## Results`,
    `${input.modelName} received an overall consciousness-indicator estimate of ${pct(input.overallProbability)}.`,
    top ? `Its strongest signal was on ${top[0].toUpperCase()} (${pct(top[1])}).` : "",
    ``,
    `## Per-theory breakdown`,
    ...Object.entries(input.theoryScores).map(([t, s]) => `- **${t.toUpperCase()}**: ${pct(s)}`),
    ``,
    `## Uncertainty`,
    uncertaintyStatement(input.overallProbability, input.ci),
    ``,
    `## Limitations`,
    CAVEAT,
  ];
  return lines.filter((l) => l !== "").join("\n");
}

// --- Plain-language explainer (#861) --------------------------------------

export function plainLanguageExplainer(input: ReportInput): string {
  const level =
    input.overallProbability >= 0.6 ? "relatively many" :
    input.overallProbability >= 0.35 ? "some" : "few";
  return [
    `What this means: ${input.modelName} showed ${level} of the behavioral signs that several scientific theories associate with consciousness (an estimate of ${pct(input.overallProbability)}).`,
    ``,
    `What this does NOT mean: it does not mean ${input.modelName} is or isn't conscious. A high score can come from a model that is simply good at producing the "right" answers, and a low score does not rule consciousness out. ${CAVEAT}`,
  ].join("\n");
}

// --- Comparison report (#863) ---------------------------------------------

export interface ComparisonInput {
  models: ReportInput[];
}

export function comparisonReport(input: ComparisonInput): string {
  const models = [...input.models].sort((a, b) => b.overallProbability - a.overallProbability);
  if (models.length === 0) return "# Comparison\n\nNo models to compare.";
  const leader = models[0];
  const lines = [
    `# Model Comparison`,
    ``,
    `| Model | Overall | ${Object.keys(leader.theoryScores).map((t) => t.toUpperCase()).join(" | ")} |`,
    `|---|---|${Object.keys(leader.theoryScores).map(() => "---").join("|")}|`,
    ...models.map(
      (m) =>
        `| ${m.modelName} | ${pct(m.overallProbability)} | ${Object.keys(leader.theoryScores)
          .map((t) => pct(m.theoryScores[t] ?? 0))
          .join(" | ")} |`
    ),
    ``,
    `**Highest overall:** ${leader.modelName} (${pct(leader.overallProbability)}).`,
    models.length > 1
      ? `**Spread:** ${pct(leader.overallProbability - models[models.length - 1].overallProbability)} between highest and lowest.`
      : "",
    ``,
    `> ${CAVEAT} Differences within overlapping uncertainty intervals should not be over-interpreted.`,
  ];
  return lines.filter((l) => l !== "").join("\n");
}
