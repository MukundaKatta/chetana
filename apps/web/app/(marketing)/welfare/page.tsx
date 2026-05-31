import { WelfareAssessment } from "@/components/research/WelfareAssessment";

/**
 * Model welfare page (issues #582, #585, #586). Explains welfare-aware
 * evaluation and provides an interactive assessment panel, plus a summary of
 * the responsible-disclosure workflow.
 */
export const metadata = {
  title: "Model Welfare — Chetana",
  description: "Welfare-aware evaluation: assessment, ethics review, and responsible disclosure.",
};

export default function WelfarePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-white">Model Welfare</h1>
        <p className="mt-3 max-w-2xl text-gray-400">
          Model welfare moved into mainstream discourse in 2026. Chetana summarizes
          welfare-relevant signals <strong>separately</strong> from the consciousness
          probability — these are advisory notices, never verdicts — and gates an
          ethics-review checklist when a result crosses a configurable threshold.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-medium text-gray-200">Interactive assessment</h2>
        <WelfareAssessment />
      </section>

      <section className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
        <h2 className="mb-2 text-lg font-medium text-gray-200">Responsible disclosure</h2>
        <p className="text-sm text-gray-400">
          Notable findings flow through a draft → review → embargo → publish
          workflow that requires a methodology and limitations attachment before
          publication and records an audit trail of every decision. See the
          <code className="mx-1 rounded bg-white/5 px-1 text-xs">@chetana/scorer</code>
          disclosure module.
        </p>
      </section>
    </div>
  );
}
