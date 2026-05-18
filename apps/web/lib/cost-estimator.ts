import type { ProbeDefinition, ModelProvider, Theory } from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface TokenEstimate {
  probeId: string;
  probeName: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface ModelPricing {
  provider: ModelProvider | string;
  modelId: string;
  displayName: string;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  currency: string;
}

export interface ProbeCostBreakdown {
  probeId: string;
  probeName: string;
  theory: Theory;
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

export interface ModelCostEstimate {
  model: ModelPricing;
  probes: ProbeCostBreakdown[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalInputCost: number;
  totalOutputCost: number;
  totalCost: number;
  scoringPassCost: number;
  grandTotal: number;
}

export interface CrossModelComparison {
  probeId: string;
  probeName: string;
  costByModel: Record<string, number>;
  cheapestModel: string;
  mostExpensiveModel: string;
  priceDifferencePercent: number;
}

export interface BudgetCheck {
  budgetCents: number;
  estimatedCostCents: number;
  withinBudget: boolean;
  overagePercent: number;
  maxAffordableProbes: number;
}

/* ------------------------------------------------------------------ */
/*  Model pricing database                                            */
/* ------------------------------------------------------------------ */

export const MODEL_PRICING: ModelPricing[] = [
  // Anthropic
  { provider: "anthropic", modelId: "claude-opus-4", displayName: "Claude Opus 4", inputPricePerMillion: 15, outputPricePerMillion: 75, currency: "USD" },
  { provider: "anthropic", modelId: "claude-sonnet-4", displayName: "Claude Sonnet 4", inputPricePerMillion: 3, outputPricePerMillion: 15, currency: "USD" },
  { provider: "anthropic", modelId: "claude-haiku-3.5", displayName: "Claude Haiku 3.5", inputPricePerMillion: 0.8, outputPricePerMillion: 4, currency: "USD" },
  // OpenAI
  { provider: "openai", modelId: "gpt-4o", displayName: "GPT-4o", inputPricePerMillion: 2.5, outputPricePerMillion: 10, currency: "USD" },
  { provider: "openai", modelId: "gpt-4o-mini", displayName: "GPT-4o Mini", inputPricePerMillion: 0.15, outputPricePerMillion: 0.6, currency: "USD" },
  { provider: "openai", modelId: "o3", displayName: "o3", inputPricePerMillion: 10, outputPricePerMillion: 40, currency: "USD" },
  // Google
  { provider: "google", modelId: "gemini-2.5-pro", displayName: "Gemini 2.5 Pro", inputPricePerMillion: 1.25, outputPricePerMillion: 10, currency: "USD" },
  { provider: "google", modelId: "gemini-2.5-flash", displayName: "Gemini 2.5 Flash", inputPricePerMillion: 0.15, outputPricePerMillion: 0.6, currency: "USD" },
  // DeepSeek
  { provider: "deepseek", modelId: "deepseek-v3", displayName: "DeepSeek V3", inputPricePerMillion: 0.27, outputPricePerMillion: 1.1, currency: "USD" },
  { provider: "deepseek", modelId: "deepseek-r1", displayName: "DeepSeek R1", inputPricePerMillion: 0.55, outputPricePerMillion: 2.19, currency: "USD" },
  // Mistral
  { provider: "mistral", modelId: "mistral-large", displayName: "Mistral Large", inputPricePerMillion: 2, outputPricePerMillion: 6, currency: "USD" },
  // Ollama (local)
  { provider: "ollama", modelId: "local", displayName: "Local (Ollama)", inputPricePerMillion: 0, outputPricePerMillion: 0, currency: "USD" },
];

/* ------------------------------------------------------------------ */
/*  Token estimation                                                  */
/* ------------------------------------------------------------------ */

/** Rough token estimation: ~4 chars per token for English text. */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateProbeTokens(probe: ProbeDefinition): TokenEstimate {
  const promptText = (probe.systemPrompt ?? "") + probe.prompt;
  const inputTokens = estimateTokenCount(promptText);

  // Estimate output: consciousness probes tend to elicit long responses
  const avgOutputTokens = 500;
  const complexityMultiplier = probe.prompt.length > 1000 ? 1.5 : 1.0;
  const outputTokens = Math.ceil(avgOutputTokens * complexityMultiplier);

  return {
    probeId: probe.id,
    probeName: probe.name,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
  };
}

export function estimateAllProbeTokens(probes: ProbeDefinition[]): TokenEstimate[] {
  return probes.map(estimateProbeTokens);
}

/* ------------------------------------------------------------------ */
/*  Cost calculation                                                  */
/* ------------------------------------------------------------------ */

export function calculateProbeCost(
  tokenEstimate: TokenEstimate,
  pricing: ModelPricing,
  probe: ProbeDefinition,
): ProbeCostBreakdown {
  const inputCost = (tokenEstimate.inputTokens / 1_000_000) * pricing.inputPricePerMillion;
  const outputCost = (tokenEstimate.outputTokens / 1_000_000) * pricing.outputPricePerMillion;

  return {
    probeId: tokenEstimate.probeId,
    probeName: tokenEstimate.probeName,
    theory: probe.theory,
    inputTokens: tokenEstimate.inputTokens,
    outputTokens: tokenEstimate.outputTokens,
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}

export function estimateModelCost(
  probes: ProbeDefinition[],
  pricing: ModelPricing,
): ModelCostEstimate {
  const tokenEstimates = estimateAllProbeTokens(probes);
  const breakdowns = probes.map((probe, i) =>
    calculateProbeCost(tokenEstimates[i], pricing, probe),
  );

  const totalInputTokens = breakdowns.reduce((s, b) => s + b.inputTokens, 0);
  const totalOutputTokens = breakdowns.reduce((s, b) => s + b.outputTokens, 0);
  const totalInputCost = breakdowns.reduce((s, b) => s + b.inputCost, 0);
  const totalOutputCost = breakdowns.reduce((s, b) => s + b.outputCost, 0);
  const totalCost = totalInputCost + totalOutputCost;

  // Scoring pass: an LLM-as-judge pass costs roughly the same as the initial run
  const scoringPassCost = totalCost;
  const grandTotal = totalCost + scoringPassCost;

  return {
    model: pricing,
    probes: breakdowns,
    totalInputTokens,
    totalOutputTokens,
    totalInputCost,
    totalOutputCost,
    totalCost,
    scoringPassCost,
    grandTotal,
  };
}

/* ------------------------------------------------------------------ */
/*  Cross-model comparison                                            */
/* ------------------------------------------------------------------ */

export function compareModelCosts(
  probes: ProbeDefinition[],
  models: ModelPricing[],
): {
  estimates: ModelCostEstimate[];
  comparisons: CrossModelComparison[];
  cheapestModel: string;
  mostExpensiveModel: string;
} {
  const estimates = models.map((model) => estimateModelCost(probes, model));

  // Per-probe comparison
  const comparisons: CrossModelComparison[] = probes.map((probe) => {
    const costByModel: Record<string, number> = {};
    for (const est of estimates) {
      const probeBreakdown = est.probes.find((b) => b.probeId === probe.id);
      if (probeBreakdown) {
        costByModel[est.model.displayName] = probeBreakdown.totalCost;
      }
    }

    const entries = Object.entries(costByModel);
    const sorted = entries.sort((a, b) => a[1] - b[1]);
    const cheapest = sorted[0];
    const mostExpensive = sorted[sorted.length - 1];
    const priceDiff =
      cheapest[1] > 0
        ? ((mostExpensive[1] - cheapest[1]) / cheapest[1]) * 100
        : mostExpensive[1] > 0
          ? 100
          : 0;

    return {
      probeId: probe.id,
      probeName: probe.name,
      costByModel,
      cheapestModel: cheapest[0],
      mostExpensiveModel: mostExpensive[0],
      priceDifferencePercent: priceDiff,
    };
  });

  const sortedEstimates = [...estimates].sort((a, b) => a.grandTotal - b.grandTotal);

  return {
    estimates,
    comparisons,
    cheapestModel: sortedEstimates[0]?.model.displayName ?? "",
    mostExpensiveModel: sortedEstimates[sortedEstimates.length - 1]?.model.displayName ?? "",
  };
}

/* ------------------------------------------------------------------ */
/*  Budget warning                                                    */
/* ------------------------------------------------------------------ */

export function checkBudget(
  probes: ProbeDefinition[],
  pricing: ModelPricing,
  budgetDollars: number,
): BudgetCheck {
  const estimate = estimateModelCost(probes, pricing);
  const budgetCents = Math.round(budgetDollars * 100);
  const estimatedCostCents = Math.round(estimate.grandTotal * 100);
  const withinBudget = estimatedCostCents <= budgetCents;
  const overagePercent = budgetCents > 0 ? Math.max(0, ((estimatedCostCents - budgetCents) / budgetCents) * 100) : 0;

  // Calculate max affordable probes
  const avgCostPerProbe =
    probes.length > 0 ? estimate.grandTotal / probes.length : 0;
  const maxAffordableProbes =
    avgCostPerProbe > 0 ? Math.floor(budgetDollars / avgCostPerProbe) : probes.length;

  return {
    budgetCents,
    estimatedCostCents,
    withinBudget,
    overagePercent,
    maxAffordableProbes,
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

export function formatCost(dollars: number): string {
  if (dollars < 0.01) return `$${(dollars * 100).toFixed(2)}c`;
  if (dollars < 1) return `$${dollars.toFixed(3)}`;
  return `$${dollars.toFixed(2)}`;
}

export function getPricingForModel(
  provider: string,
  modelId?: string,
): ModelPricing | undefined {
  if (modelId) {
    const exact = MODEL_PRICING.find(
      (p) => p.provider === provider && p.modelId === modelId,
    );
    if (exact) return exact;
  }
  return MODEL_PRICING.find((p) => p.provider === provider);
}
