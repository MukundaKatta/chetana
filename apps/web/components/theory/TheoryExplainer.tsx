import { cn } from "@/lib/utils";

interface IndicatorInfo {
  id: string;
  name: string;
  description: string;
}

interface TheoryExplainerProps {
  theory: string;
  name: string;
  fullName: string;
  description: string;
  favorability: string;
  indicators: IndicatorInfo[];
}

const FAVORABILITY_STYLES: Record<string, { bg: string; text: string }> = {
  Favorable: { bg: "bg-green-500/10", text: "text-green-400" },
  Mixed: { bg: "bg-yellow-500/10", text: "text-yellow-400" },
  "Partially Favorable": { bg: "bg-orange-500/10", text: "text-orange-400" },
  Unfavorable: { bg: "bg-red-500/10", text: "text-red-400" },
};

export function TheoryExplainer({
  theory,
  name,
  fullName,
  description,
  favorability,
  indicators,
}: TheoryExplainerProps) {
  const favStyle = FAVORABILITY_STYLES[favorability] ?? {
    bg: "bg-neutral-500/10",
    text: "text-neutral-400",
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      {/* Header */}
      <div
        className="px-6 py-5"
        style={{
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div className="mb-2 flex items-center gap-3">
          <span className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-bold tracking-wider text-neutral-300">
            {name}
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
              favStyle.bg,
              favStyle.text
            )}
          >
            {favorability}
          </span>
        </div>
        <h2 className="text-xl font-bold text-neutral-100">{fullName}</h2>
      </div>

      {/* Description */}
      <div className="border-b border-white/8 px-6 py-4">
        <p className="text-sm leading-relaxed text-neutral-400">
          {description}
        </p>
      </div>

      {/* Indicators */}
      <div className="px-6 py-4">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          Indicators ({indicators.length})
        </h3>
        <div className="space-y-3">
          {indicators.map((indicator) => (
            <div
              key={indicator.id}
              className="rounded-lg border border-white/6 bg-white/[0.02] px-4 py-3"
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="font-mono text-[11px] text-neutral-500">
                  {indicator.id}
                </span>
                <span className="text-sm font-medium text-neutral-200">
                  {indicator.name}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-neutral-500">
                {indicator.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
