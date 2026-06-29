import {
  executiveSummary,
  narrativeReport,
  plainLanguageExplainer,
  comparisonReport,
  type ReportInput,
} from "@chetana/scorer";

/**
 * Reports showcase (#856, #857, #861, #863). A polished, accessible page that
 * renders the report generators on representative audit data so the formats are
 * visible end-to-end. Data here is illustrative.
 */
export const metadata = {
  title: "Reports — Chetana",
  description: "Executive summaries, narrative reports, plain-language explainers, and comparisons.",
};

const SAMPLE: ReportInput = {
  modelName: "GPT-5.4",
  overallProbability: 0.62,
  ci: { lower: 0.5, upper: 0.74, level: 0.95 },
  theoryScores: { gwt: 0.7, hot: 0.6, pp: 0.55, ast: 0.5, rpt: 0.45, iit: 0.4 },
  createdAt: "2026-06-01",
  methodologyVersion: "v3",
};

const SAMPLE_B: ReportInput = {
  ...SAMPLE,
  modelName: "Llama 4",
  overallProbability: 0.41,
  theoryScores: { gwt: 0.45, hot: 0.4, pp: 0.42, ast: 0.38, rpt: 0.4, iit: 0.35 },
};

function Panel({ title, badge, body }: { title: string; badge: string; body: string }) {
  return (
    <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-100">{title}</h2>
        <span className="rounded-full bg-chetana-600/20 px-2.5 py-0.5 font-mono text-[10px] text-chetana-300">
          {badge}
        </span>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-white/8 bg-black/30 p-4 text-xs leading-relaxed text-gray-300">
        {body}
      </pre>
    </section>
  );
}

export default function ReportsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Reports</h1>
        <p className="mt-3 max-w-2xl text-gray-400">
          Every audit can be rendered in formats tuned to different audiences — a
          one-line executive summary, a full narrative report, a plain-language
          explainer, and multi-model comparisons. Examples below use illustrative data.
        </p>
      </header>

      <div className="grid gap-6">
        <Panel title="Executive summary" badge="#856" body={executiveSummary(SAMPLE)} />
        <Panel title="Plain-language explainer" badge="#861" body={plainLanguageExplainer(SAMPLE)} />
        <Panel title="Narrative report" badge="#857" body={narrativeReport(SAMPLE)} />
        <Panel title="Comparison report" badge="#863" body={comparisonReport({ models: [SAMPLE, SAMPLE_B] })} />
      </div>
    </div>
  );
}
