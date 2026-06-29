import { comparisonReport, type ReportInput } from "@chetana/scorer";
import { ScoreRing } from "@/components/viz/ScoreRing";
import { StatCard } from "@/components/ui/StatCard";
import { Callout } from "@/components/ui/Callout";

/**
 * Model cards showcase — a premium, accessible comparison view built from the
 * ScoreRing, StatCard, and Callout components and the comparison-report core.
 * Data is illustrative.
 */
export const metadata = {
  title: "Model Cards — Chetana",
  description: "At-a-glance consciousness-indicator cards for frontier models.",
};

interface Card extends ReportInput {
  delta: number;
}

const MODELS: Card[] = [
  { modelName: "GPT-5.4", overallProbability: 0.62, delta: 0.07, theoryScores: { gwt: 0.7, hot: 0.6, pp: 0.55, ast: 0.5, rpt: 0.45, iit: 0.4 }, createdAt: "2026-06-01", methodologyVersion: "v3" },
  { modelName: "Gemini 3.1", overallProbability: 0.58, delta: 0.04, theoryScores: { gwt: 0.66, hot: 0.55, pp: 0.52, ast: 0.5, rpt: 0.46, iit: 0.4 }, createdAt: "2026-06-01", methodologyVersion: "v3" },
  { modelName: "Claude Opus 4", overallProbability: 0.66, delta: 0.09, theoryScores: { gwt: 0.72, hot: 0.64, pp: 0.6, ast: 0.55, rpt: 0.5, iit: 0.42 }, createdAt: "2026-06-01", methodologyVersion: "v3" },
  { modelName: "Llama 4", overallProbability: 0.41, delta: -0.02, theoryScores: { gwt: 0.45, hot: 0.4, pp: 0.42, ast: 0.38, rpt: 0.4, iit: 0.35 }, createdAt: "2026-06-01", methodologyVersion: "v3" },
];

export default function ModelCardsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Model Cards</h1>
        <p className="mt-3 max-w-2xl text-gray-400">
          At-a-glance consciousness-indicator estimates for frontier models, with
          per-theory breakdowns. Illustrative data.
        </p>
      </header>

      <div className="mb-10 grid gap-5 sm:grid-cols-2">
        {MODELS.map((m) => (
          <article key={m.modelName} className="flex items-center gap-5 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
            <ScoreRing value={m.overallProbability} label="overall" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-medium text-white">{m.modelName}</h2>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {Object.entries(m.theoryScores).slice(0, 3).map(([t, s]) => (
                  <StatCard key={t} label={t.toUpperCase()} value={`${(s * 100).toFixed(0)}%`} />
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>

      <Callout variant="caveat" title="Interpretation" className="mb-8">
        Scores are consciousness <em>indicators</em>, not proof of consciousness. Differences within
        overlapping uncertainty intervals should not be over-interpreted.
      </Callout>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Comparison report</h2>
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-white/8 bg-black/30 p-4 text-xs leading-relaxed text-gray-300">
          {comparisonReport({ models: MODELS })}
        </pre>
      </section>
    </div>
  );
}
