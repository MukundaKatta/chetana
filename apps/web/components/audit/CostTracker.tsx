"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface CostTrackerProps {
  tokensUsed: number;
  probesCompleted: number;
  totalProbes: number;
  modelProvider: string;
}

// Approximate cost per 1M tokens by provider (input + output blended)
const COST_PER_MILLION_TOKENS: Record<string, number> = {
  anthropic: 8.0,
  openai: 5.0,
  google: 3.5,
  meta: 0.0,
  mistral: 2.0,
  default: 5.0,
};

function formatTokens(tokens: number): string {
  if (tokens < 1000) return `${tokens}`;
  if (tokens < 1_000_000) return `${(tokens / 1000).toFixed(1)}k`;
  return `${(tokens / 1_000_000).toFixed(2)}M`;
}

function formatCost(cents: number): string {
  if (cents < 1) return `<$0.01`;
  if (cents < 100) return `$${(cents / 100).toFixed(2)}`;
  return `$${(cents / 100).toFixed(2)}`;
}

export function CostTracker({
  tokensUsed,
  probesCompleted,
  totalProbes,
  modelProvider,
}: CostTrackerProps) {
  const { costSoFar, projectedTotal, tokensPerProbe } = useMemo(() => {
    const provider = modelProvider.toLowerCase();
    const ratePerMillion =
      COST_PER_MILLION_TOKENS[provider] ?? COST_PER_MILLION_TOKENS.default;

    // Cost in cents
    const cost = (tokensUsed / 1_000_000) * ratePerMillion * 100;

    // Project total based on average tokens per probe
    const avgTokensPerProbe =
      probesCompleted > 0 ? tokensUsed / probesCompleted : 0;
    const projected = (avgTokensPerProbe * totalProbes / 1_000_000) * ratePerMillion * 100;

    return {
      costSoFar: cost,
      projectedTotal: projected,
      tokensPerProbe: avgTokensPerProbe,
    };
  }, [tokensUsed, probesCompleted, totalProbes, modelProvider]);

  const progress =
    totalProbes > 0 ? (probesCompleted / totalProbes) * 100 : 0;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-100">
          Cost Tracker
        </h3>
        <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
          {modelProvider}
        </span>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-neutral-400">
            {probesCompleted} / {totalProbes} probes
          </span>
          <span className="font-medium text-neutral-300">
            {progress.toFixed(0)}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
            Tokens Used
          </p>
          <p className="mt-1 text-sm font-bold tabular-nums text-neutral-100">
            {formatTokens(tokensUsed)}
          </p>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
            Cost So Far
          </p>
          <p className="mt-1 text-sm font-bold tabular-nums text-neutral-100">
            {formatCost(costSoFar)}
          </p>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
            Projected
          </p>
          <p
            className={cn(
              "mt-1 text-sm font-bold tabular-nums",
              probesCompleted > 0 ? "text-neutral-100" : "text-neutral-500"
            )}
          >
            {probesCompleted > 0 ? formatCost(projectedTotal) : "--"}
          </p>
        </div>
      </div>

      {/* Per-probe average */}
      {probesCompleted > 0 && (
        <div className="mt-3 border-t border-white/5 pt-3">
          <p className="text-xs text-neutral-500">
            Avg.{" "}
            <span className="font-medium text-neutral-400">
              {formatTokens(Math.round(tokensPerProbe))}
            </span>{" "}
            tokens per probe
          </p>
        </div>
      )}
    </div>
  );
}
