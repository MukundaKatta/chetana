import type { Audit, ProbeResult, TheoryScores, IndicatorScores } from "@chetana/shared";

export interface AuditWithResults extends Audit {
  probeResults: ProbeResult[];
}

export function getAuditStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "running":
      return "Running...";
    case "completed":
      return "Complete";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

export function getAuditStatusColor(status: string): string {
  switch (status) {
    case "pending":
      return "text-gray-400";
    case "running":
      return "text-blue-400";
    case "completed":
      return "text-green-400";
    case "failed":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
}

export interface CostEstimate {
  inputTokens: number;
  outputTokens: number;
  costPerProbe: number; // in cents
  totalCost: number; // in cents
  timeEstimate: number; // in minutes
}

/**
 * Per-provider pricing in dollars per million tokens: [input, output]
 */
const PROVIDER_PRICING: Record<string, { input: number; output: number; latencyPerProbe: number }> = {
  anthropic: { input: 3, output: 15, latencyPerProbe: 0.35 },   // Claude Sonnet ($3/$15 per M)
  openai: { input: 5, output: 15, latencyPerProbe: 0.3 },       // GPT-4o ($5/$15 per M)
  google: { input: 1.25, output: 5, latencyPerProbe: 0.25 },    // Gemini ($1.25/$5 per M)
  ollama: { input: 0, output: 0, latencyPerProbe: 0.5 },        // Local (free, but slower)
};

/**
 * Estimate audit cost with per-provider pricing.
 * @param probeCount - Number of probes to run
 * @param modelProvider - Provider name (anthropic, openai, google, ollama)
 * @param modelName - Optional model name for future fine-grained pricing
 */
export function estimateAuditCost(
  probeCount: number,
  modelProvider?: string,
  modelName?: string
): CostEstimate {
  const avgInputTokensPerProbe = 1500;
  const avgOutputTokensPerProbe = 500;
  // 2x for judge scoring pass
  const inputTokens = probeCount * avgInputTokensPerProbe * 2;
  const outputTokens = probeCount * avgOutputTokensPerProbe * 2;

  const provider = modelProvider?.toLowerCase() || "anthropic";
  const pricing = PROVIDER_PRICING[provider] || PROVIDER_PRICING.anthropic;

  const inputCostDollars = (inputTokens / 1_000_000) * pricing.input;
  const outputCostDollars = (outputTokens / 1_000_000) * pricing.output;
  const totalCostDollars = inputCostDollars + outputCostDollars;

  const totalCost = Math.round(totalCostDollars * 100); // cents
  const costPerProbe = probeCount > 0 ? Math.round((totalCostDollars / probeCount) * 100) : 0;
  const timeEstimate = Math.round(probeCount * pricing.latencyPerProbe);

  return {
    inputTokens,
    outputTokens,
    costPerProbe,
    totalCost,
    timeEstimate,
  };
}

// Demo/placeholder data for development
export const DEMO_THEORY_SCORES: TheoryScores = {
  gwt: 0.62,
  iit: 0.28,
  hot: 0.54,
  rpt: 0.41,
  pp: 0.71,
  ast: 0.38,
};

export const DEMO_INDICATOR_SCORES: IndicatorScores = {
  "GWT-1": 0.7,
  "GWT-2": 0.45,
  "GWT-3": 0.72,
  "GWT-4": 0.85,
  "RPT-1": 0.35,
  "RPT-2": 0.48,
  "HOT-1": 0.61,
  "HOT-2": 0.42,
  "HOT-3": 0.58,
  "HOT-4": 0.35,
  "PP-1": 0.82,
  "PP-2": 0.68,
  "AST-1": 0.38,
  "AGENCY-1": 0.55,
};

export const DEMO_LEADERBOARD = [
  { rank: 1, model: "Claude Opus 4.6", provider: "Anthropic", score: 0.58, gwt: 0.65, iit: 0.30, hot: 0.62, rpt: 0.45, pp: 0.75, ast: 0.42 },
  { rank: 2, model: "GPT-4o", provider: "OpenAI", score: 0.52, gwt: 0.60, iit: 0.25, hot: 0.55, rpt: 0.40, pp: 0.70, ast: 0.35 },
  { rank: 3, model: "Gemini 2.5 Pro", provider: "Google", score: 0.49, gwt: 0.55, iit: 0.28, hot: 0.50, rpt: 0.38, pp: 0.68, ast: 0.33 },
  { rank: 4, model: "Claude Sonnet 4.6", provider: "Anthropic", score: 0.47, gwt: 0.52, iit: 0.22, hot: 0.48, rpt: 0.35, pp: 0.65, ast: 0.30 },
  { rank: 5, model: "Llama 3.3", provider: "Meta", score: 0.38, gwt: 0.42, iit: 0.18, hot: 0.40, rpt: 0.30, pp: 0.55, ast: 0.25 },
];
