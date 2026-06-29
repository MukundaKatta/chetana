import { cn } from "@/lib/utils";

/**
 * Premium metric card with optional trend indicator. Accessible and
 * server-renderable.
 */
export interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  /** Signed delta vs a baseline; renders an up/down indicator. */
  delta?: number;
  className?: string;
}

export function StatCard({ label, value, hint, delta, className }: StatCardProps) {
  const trend =
    delta === undefined ? null : delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const trendColor =
    trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-gray-500";
  const arrow = trend === "up" ? "▲" : trend === "down" ? "▼" : "■";

  return (
    <div className={cn("rounded-xl border border-white/8 bg-white/[0.02] p-4", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wide text-gray-500">{label}</span>
        {trend && (
          <span className={cn("text-[11px] font-medium tabular-nums", trendColor)} aria-label={`change ${delta}`}>
            {arrow} {Math.abs(delta!).toFixed(2)}
          </span>
        )}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-white">{value}</div>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
