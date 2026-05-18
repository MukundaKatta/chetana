/**
 * Token usage optimizer (Issue #375).
 * Token count estimation per probe, budget allocation,
 * prompt compression, cost tracking per audit, budget alerts.
 */

import type {
  ProbeDefinition,
  ModelProvider,
  Theory,
} from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface TokenEstimate {
  /** Probe ID. */
  probeId: string;
  /** Estimated input tokens. */
  inputTokens: number;
  /** Estimated output tokens. */
  outputTokens: number;
  /** Total estimated tokens. */
  totalTokens: number;
  /** Estimated cost in cents. */
  estimatedCostCents: number;
  /** Whether compression was applied. */
  compressed: boolean;
  /** Compression savings (tokens saved). */
  compressionSavings: number;
}

export interface BudgetAllocation {
  /** Total budget in cents. */
  totalBudgetCents: number;
  /** Budget per theory. */
  theoryBudgets: Record<Theory, number>;
  /** Budget per probe (probe ID -> cents). */
  probeBudgets: Map<string, number>;
  /** Estimated total cost. */
  estimatedTotalCents: number;
  /** Whether allocation fits within budget. */
  withinBudget: boolean;
  /** Overage in cents (negative if under budget). */
  overageCents: number;
}

export interface CostTracker {
  /** Audit ID. */
  auditId: string;
  /** Running total cost in cents. */
  totalCostCents: number;
  /** Cost per provider. */
  providerCosts: Partial<Record<ModelProvider, number>>;
  /** Cost per theory. */
  theoryCosts: Partial<Record<Theory, number>>;
  /** Token usage breakdown. */
  tokenUsage: {
    totalInput: number;
    totalOutput: number;
    total: number;
  };
  /** Budget remaining (if set). */
  budgetRemainingCents: number | null;
  /** Probes completed. */
  probesCompleted: number;
  /** Probes remaining. */
  probesRemaining: number;
}

export interface BudgetAlert {
  type: "warning" | "critical" | "exceeded";
  message: string;
  currentCostCents: number;
  budgetCents: number;
  percentUsed: number;
  timestamp: string;
}

export interface TokenOptimizerConfig {
  /** Default budget in cents (default 500 = $5). */
  defaultBudgetCents: number;
  /** Alert at this percentage of budget (default 80). */
  warningThresholdPercent: number;
  /** Critical alert at this percentage (default 95). */
  criticalThresholdPercent: number;
  /** Enable prompt compression (default true). */
  enableCompression: boolean;
  /** Target compression ratio (default 0.7 = 30% reduction). */
  compressionTargetRatio: number;
  /** Cost per 1000 input tokens per provider (in cents). */
  inputCostPer1K: Partial<Record<ModelProvider, number>>;
  /** Cost per 1000 output tokens per provider (in cents). */
  outputCostPer1K: Partial<Record<ModelProvider, number>>;
  /** Callback for budget alerts. */
  onBudgetAlert?: (alert: BudgetAlert) => void;
}

const DEFAULT_COST_INPUT: Partial<Record<ModelProvider, number>> = {
  anthropic: 0.3,   // $3/M input
  openai: 0.25,     // $2.5/M input
  google: 0.125,    // $1.25/M input
  mistral: 0.1,     // $1/M input
  deepseek: 0.014,  // $0.14/M input
  ollama: 0,        // free (local)
};

const DEFAULT_COST_OUTPUT: Partial<Record<ModelProvider, number>> = {
  anthropic: 1.5,   // $15/M output
  openai: 1.0,      // $10/M output
  google: 0.5,      // $5/M output
  mistral: 0.3,     // $3/M output
  deepseek: 0.028,  // $0.28/M output
  ollama: 0,        // free (local)
};

const DEFAULT_CONFIG: TokenOptimizerConfig = {
  defaultBudgetCents: 500,
  warningThresholdPercent: 80,
  criticalThresholdPercent: 95,
  enableCompression: true,
  compressionTargetRatio: 0.7,
  inputCostPer1K: DEFAULT_COST_INPUT,
  outputCostPer1K: DEFAULT_COST_OUTPUT,
};

/* ------------------------------------------------------------------ */
/*  Token Estimation                                                  */
/* ------------------------------------------------------------------ */

/**
 * Estimate token count for a string.
 * Uses a rough heuristic: ~4 chars per token for English.
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  // Rough heuristic: ~4 characters per token for English
  // Adjust for code/special chars: ~3.5 chars per token
  return Math.ceil(text.length / 3.5);
}

/**
 * Estimate tokens for a probe definition.
 */
export function estimateProbeTokens(
  probe: ProbeDefinition,
  provider: ModelProvider,
  config: Partial<TokenOptimizerConfig> = {}
): TokenEstimate {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  let inputText = probe.prompt;
  if (probe.systemPrompt) inputText += probe.systemPrompt;
  if (probe.scoringCriteria) inputText += probe.scoringCriteria;

  let inputTokens = estimateTokenCount(inputText);
  const compressionSavings = 0;

  // Apply compression if enabled
  let compressed = false;
  if (cfg.enableCompression) {
    const result = compressPrompt(inputText, cfg.compressionTargetRatio);
    if (result.compressed) {
      const newTokens = estimateTokenCount(result.text);
      if (newTokens < inputTokens) {
        compressed = true;
        inputTokens = newTokens;
      }
    }
  }

  // Estimate output tokens (typically 2-4x input for analysis responses)
  const outputTokens = Math.ceil(inputTokens * 2.5);
  const totalTokens = inputTokens + outputTokens;

  const inputCost =
    (inputTokens / 1000) * (cfg.inputCostPer1K?.[provider] ?? 0.3);
  const outputCost =
    (outputTokens / 1000) * (cfg.outputCostPer1K?.[provider] ?? 1.0);
  const estimatedCostCents = Math.round((inputCost + outputCost) * 100) / 100;

  return {
    probeId: probe.id,
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCostCents,
    compressed,
    compressionSavings,
  };
}

/**
 * Estimate total tokens and cost for a set of probes.
 */
export function estimateBatchTokens(
  probes: ProbeDefinition[],
  provider: ModelProvider,
  config: Partial<TokenOptimizerConfig> = {}
): {
  estimates: TokenEstimate[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCostCents: number;
} {
  const estimates = probes.map((p) =>
    estimateProbeTokens(p, provider, config)
  );

  return {
    estimates,
    totalInputTokens: estimates.reduce((s, e) => s + e.inputTokens, 0),
    totalOutputTokens: estimates.reduce((s, e) => s + e.outputTokens, 0),
    totalTokens: estimates.reduce((s, e) => s + e.totalTokens, 0),
    totalCostCents: estimates.reduce((s, e) => s + e.estimatedCostCents, 0),
  };
}

/* ------------------------------------------------------------------ */
/*  Prompt Compression                                                */
/* ------------------------------------------------------------------ */

/**
 * Compress a prompt to reduce token usage.
 * Applies various compression strategies.
 */
export function compressPrompt(
  text: string,
  targetRatio: number = 0.7
): { text: string; compressed: boolean; originalLength: number; newLength: number } {
  const original = text;
  let result = text;

  // Strategy 1: Remove excessive whitespace
  result = result.replace(/\n{3,}/g, "\n\n");
  result = result.replace(/[ \t]{2,}/g, " ");
  result = result.trim();

  // Strategy 2: Remove redundant instructions
  result = result.replace(
    /please note that |it is important to note that |keep in mind that /gi,
    ""
  );
  result = result.replace(/\bplease\b /gi, "");

  // Strategy 3: Shorten common phrases
  result = result.replace(/in order to/gi, "to");
  result = result.replace(/due to the fact that/gi, "because");
  result = result.replace(/at this point in time/gi, "now");
  result = result.replace(/in the event that/gi, "if");
  result = result.replace(/with regard to/gi, "regarding");
  result = result.replace(/a large number of/gi, "many");
  result = result.replace(/the majority of/gi, "most");

  // Strategy 4: Remove trailing punctuation repetition
  result = result.replace(/\.{2,}/g, ".");
  result = result.replace(/!{2,}/g, "!");

  const currentRatio = result.length / original.length;
  const compressed = currentRatio < 0.95; // At least 5% reduction

  return {
    text: result,
    compressed,
    originalLength: original.length,
    newLength: result.length,
  };
}

/* ------------------------------------------------------------------ */
/*  Budget Allocation                                                 */
/* ------------------------------------------------------------------ */

/**
 * Allocate budget across theories and probes.
 */
export function allocateBudget(
  probes: ProbeDefinition[],
  provider: ModelProvider,
  totalBudgetCents: number,
  config: Partial<TokenOptimizerConfig> = {}
): BudgetAllocation {
  const estimates = probes.map((p) =>
    estimateProbeTokens(p, provider, config)
  );

  const estimatedTotalCents = estimates.reduce(
    (s, e) => s + e.estimatedCostCents,
    0
  );

  // Theory-level allocation (proportional to probe count)
  const theories: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];
  const theoryBudgets: Record<Theory, number> = {} as Record<Theory, number>;

  for (const theory of theories) {
    const theoryProbes = probes.filter((p) => p.theory === theory);
    const proportion = probes.length > 0 ? theoryProbes.length / probes.length : 0;
    theoryBudgets[theory] =
      Math.round(totalBudgetCents * proportion * 100) / 100;
  }

  // Per-probe allocation
  const probeBudgets = new Map<string, number>();
  const scaleFactor =
    estimatedTotalCents > 0 ? totalBudgetCents / estimatedTotalCents : 1;

  for (const est of estimates) {
    probeBudgets.set(
      est.probeId,
      Math.round(est.estimatedCostCents * scaleFactor * 100) / 100
    );
  }

  return {
    totalBudgetCents,
    theoryBudgets,
    probeBudgets,
    estimatedTotalCents: Math.round(estimatedTotalCents * 100) / 100,
    withinBudget: estimatedTotalCents <= totalBudgetCents,
    overageCents:
      Math.round((estimatedTotalCents - totalBudgetCents) * 100) / 100,
  };
}

/* ------------------------------------------------------------------ */
/*  Cost Tracking                                                     */
/* ------------------------------------------------------------------ */

export class AuditCostTracker {
  private tracker: CostTracker;
  private config: TokenOptimizerConfig;
  private budgetCents: number | null = null;
  private alertsSent: Set<string> = new Set();

  constructor(
    auditId: string,
    totalProbes: number,
    config: Partial<TokenOptimizerConfig> = {},
    budgetCents?: number
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.budgetCents = budgetCents ?? null;

    this.tracker = {
      auditId,
      totalCostCents: 0,
      providerCosts: {},
      theoryCosts: {},
      tokenUsage: { totalInput: 0, totalOutput: 0, total: 0 },
      budgetRemainingCents: budgetCents ?? null,
      probesCompleted: 0,
      probesRemaining: totalProbes,
    };
  }

  /**
   * Record cost for a completed probe.
   */
  recordProbeCost(
    provider: ModelProvider,
    theory: Theory,
    inputTokens: number,
    outputTokens: number
  ): BudgetAlert | null {
    const inputCost =
      (inputTokens / 1000) *
      (this.config.inputCostPer1K?.[provider] ?? 0.3);
    const outputCost =
      (outputTokens / 1000) *
      (this.config.outputCostPer1K?.[provider] ?? 1.0);
    const costCents = Math.round((inputCost + outputCost) * 100) / 100;

    this.tracker.totalCostCents += costCents;
    this.tracker.providerCosts[provider] =
      (this.tracker.providerCosts[provider] ?? 0) + costCents;
    this.tracker.theoryCosts[theory] =
      (this.tracker.theoryCosts[theory] ?? 0) + costCents;
    this.tracker.tokenUsage.totalInput += inputTokens;
    this.tracker.tokenUsage.totalOutput += outputTokens;
    this.tracker.tokenUsage.total += inputTokens + outputTokens;
    this.tracker.probesCompleted++;
    this.tracker.probesRemaining--;

    if (this.budgetCents !== null) {
      this.tracker.budgetRemainingCents =
        this.budgetCents - this.tracker.totalCostCents;
    }

    return this.checkBudgetAlert();
  }

  /**
   * Check if budget alerts should fire.
   */
  private checkBudgetAlert(): BudgetAlert | null {
    if (this.budgetCents === null) return null;

    const percentUsed =
      (this.tracker.totalCostCents / this.budgetCents) * 100;

    let alert: BudgetAlert | null = null;

    if (
      percentUsed >= 100 &&
      !this.alertsSent.has("exceeded")
    ) {
      alert = {
        type: "exceeded",
        message: `Budget exceeded! Used ${percentUsed.toFixed(1)}% of $${(this.budgetCents / 100).toFixed(2)} budget.`,
        currentCostCents: this.tracker.totalCostCents,
        budgetCents: this.budgetCents,
        percentUsed,
        timestamp: new Date().toISOString(),
      };
      this.alertsSent.add("exceeded");
    } else if (
      percentUsed >= this.config.criticalThresholdPercent &&
      !this.alertsSent.has("critical")
    ) {
      alert = {
        type: "critical",
        message: `Budget critical: ${percentUsed.toFixed(1)}% used of $${(this.budgetCents / 100).toFixed(2)} budget.`,
        currentCostCents: this.tracker.totalCostCents,
        budgetCents: this.budgetCents,
        percentUsed,
        timestamp: new Date().toISOString(),
      };
      this.alertsSent.add("critical");
    } else if (
      percentUsed >= this.config.warningThresholdPercent &&
      !this.alertsSent.has("warning")
    ) {
      alert = {
        type: "warning",
        message: `Budget warning: ${percentUsed.toFixed(1)}% used of $${(this.budgetCents / 100).toFixed(2)} budget.`,
        currentCostCents: this.tracker.totalCostCents,
        budgetCents: this.budgetCents,
        percentUsed,
        timestamp: new Date().toISOString(),
      };
      this.alertsSent.add("warning");
    }

    if (alert) {
      this.config.onBudgetAlert?.(alert);
    }

    return alert;
  }

  /**
   * Get current cost tracker state.
   */
  getTracker(): Readonly<CostTracker> {
    return { ...this.tracker };
  }

  /**
   * Get estimated cost for remaining probes.
   */
  getEstimatedRemainingCost(): number {
    if (this.tracker.probesCompleted === 0) return 0;
    const avgCostPerProbe =
      this.tracker.totalCostCents / this.tracker.probesCompleted;
    return (
      Math.round(avgCostPerProbe * this.tracker.probesRemaining * 100) / 100
    );
  }

  /**
   * Check if the audit is within budget.
   */
  isWithinBudget(): boolean {
    if (this.budgetCents === null) return true;
    return this.tracker.totalCostCents <= this.budgetCents;
  }

  /**
   * Set or update the budget.
   */
  setBudget(budgetCents: number): void {
    this.budgetCents = budgetCents;
    this.tracker.budgetRemainingCents =
      budgetCents - this.tracker.totalCostCents;
    this.alertsSent.clear();
  }
}
