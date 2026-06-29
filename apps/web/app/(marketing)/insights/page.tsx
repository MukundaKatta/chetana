import { buildCohortTrajectories, forecast } from "@chetana/scorer";
import { ScoreRing } from "@/components/viz/ScoreRing";

/**
 * Insights page (#731 cohort trajectories, #732 forecasting). Premium, accessible
 * presentation of cohort score trajectories and a short forecast, using the merged
 * @chetana/scorer cores and the ScoreRing component. Data is illustrative.
 */
export const metadata = {
  title: "Insights — Chetana",
  description: "Cohort trajectories and forecasts of model consciousness indicators.",
};

const TRAJECTORIES = buildCohortTrajectories([
  { cohort: "2025 frontier", date: "2025-06", score: 0.42 },
  { cohort: "2025 frontier", date: "2025-12", score: 0.48 },
  { cohort: "2026 frontier", date: "2026-02", score: 0.55 },
  { cohort: "2026 frontier", date: "2026-06", score: 0.62 },
]);

const HISTORY = [0.42, 0.48, 0.5, 0.55, 0.62];
const FC = forecast(HISTORY, 3);

const HEADLINE = [
  { label: "GWT", value: 0.7 },
  { label: "HOT", value: 0.6 },
  { label: "PP", value: 0.55 },
  { label: "AST", value: 0.5 },
];

export default function InsightsPage() {
  const latest = TRAJECTORIES.flatMap((t) => t.points).reduce((m, p) => Math.max(m, p.mean), 0);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Insights</h1>
        <p className="mt-3 max-w-2xl text-gray-400">
          How consciousness-indicator estimates are trending across model cohorts,
          and where they may be heading. Illustrative data.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Headline indicators</h2>
        <div className="flex flex-wrap gap-6">
          {HEADLINE.map((h) => (
            <ScoreRing key={h.label} value={h.value} label={h.label} />
          ))}
          <ScoreRing value={latest} label="Top cohort" size={112} />
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Cohort trajectories (#731)</h2>
        <div className="space-y-4">
          {TRAJECTORIES.map((t) => (
            <div key={t.cohort} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
              <h3 className="mb-2 text-sm font-medium text-gray-200">{t.cohort}</h3>
              <div className="flex flex-wrap gap-3">
                {t.points.map((p) => (
                  <div key={p.date} className="rounded-lg border border-white/8 px-3 py-1.5 text-xs">
                    <span className="text-gray-500">{p.date}</span>{" "}
                    <span className="font-medium tabular-nums text-chetana-300">{(p.mean * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Forecast (#732)</h2>
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
          <p className="mb-3 text-xs text-gray-500">Projection only, not a prediction — backtest MAE {FC.backtestMAE}.</p>
          <div className="flex flex-wrap gap-3">
            {FC.forecast.map((f, i) => (
              <div key={i} className="rounded-lg border border-white/8 px-3 py-1.5 text-xs tabular-nums">
                <span className="text-gray-500">+{i + 1}</span>{" "}
                <span className="font-medium text-chetana-300">{(f.value * 100).toFixed(0)}%</span>{" "}
                <span className="text-gray-600">[{(f.lower * 100).toFixed(0)}–{(f.upper * 100).toFixed(0)}]</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
