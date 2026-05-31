/**
 * Operations utilities (issues #752, #756, #759).
 *
 * - Uptime / SLA computation from up/down intervals (#752)
 * - SLO error-budget burn (#756)
 * - Usage metering and cost (#759)
 */

function round(n: number, d = 4): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

// --- Uptime / SLA (#752) ---------------------------------------------------

export interface StatusInterval {
  durationMs: number;
  up: boolean;
}

export interface UptimeResult {
  uptime: number; // 0-1
  uptimePercent: number;
  totalMs: number;
  downMs: number;
  meetsSla: boolean;
}

export function computeUptime(intervals: StatusInterval[], slaTarget = 0.999): UptimeResult {
  const totalMs = intervals.reduce((s, i) => s + i.durationMs, 0);
  const downMs = intervals.filter((i) => !i.up).reduce((s, i) => s + i.durationMs, 0);
  const uptime = totalMs === 0 ? 1 : (totalMs - downMs) / totalMs;
  return {
    uptime: round(uptime),
    uptimePercent: round(uptime * 100, 3),
    totalMs,
    downMs,
    meetsSla: uptime >= slaTarget,
  };
}

// --- Error budget (#756) ---------------------------------------------------

export interface ErrorBudgetResult {
  /** Allowed error fraction (1 - SLO). */
  budget: number;
  /** Observed error fraction. */
  observed: number;
  /** Fraction of the budget consumed (>1 means breached). */
  burned: number;
  breached: boolean;
}

export function errorBudget(slo: number, totalRequests: number, failedRequests: number): ErrorBudgetResult {
  const budget = 1 - slo;
  const observed = totalRequests === 0 ? 0 : failedRequests / totalRequests;
  const burned = budget === 0 ? (observed > 0 ? Infinity : 0) : observed / budget;
  return {
    budget: round(budget),
    observed: round(observed),
    burned: Number.isFinite(burned) ? round(burned) : burned,
    breached: observed > budget,
  };
}

// --- Usage metering & cost (#759) ------------------------------------------

export interface UsageRecord {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface PricePerMillion {
  input: number;
  output: number;
}

export interface UsageSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  byModel: Record<string, { inputTokens: number; outputTokens: number; cost: number }>;
}

export function meterUsage(
  records: UsageRecord[],
  pricing: Record<string, PricePerMillion>
): UsageSummary {
  const byModel: UsageSummary["byModel"] = {};
  let totalInput = 0;
  let totalOutput = 0;
  let totalCost = 0;

  for (const r of records) {
    const price = pricing[r.model] ?? { input: 0, output: 0 };
    const cost = (r.inputTokens / 1e6) * price.input + (r.outputTokens / 1e6) * price.output;
    totalInput += r.inputTokens;
    totalOutput += r.outputTokens;
    totalCost += cost;
    const m = (byModel[r.model] ??= { inputTokens: 0, outputTokens: 0, cost: 0 });
    m.inputTokens += r.inputTokens;
    m.outputTokens += r.outputTokens;
    m.cost = round(m.cost + cost, 6);
  }

  return {
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    totalCost: round(totalCost, 6),
    byModel,
  };
}
