/**
 * Limitations disclosure (issue #652) — what Chetana does and does not measure.
 */
export const metadata = {
  title: "Limitations — Chetana",
  description: "What Chetana's consciousness indicators do and do not claim to measure.",
};

export default function LimitationsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-white">Limitations</h1>
      <p className="mt-3 text-gray-400">What this platform does — and does not — measure.</p>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-medium text-gray-200">What Chetana measures</h2>
        <p className="text-sm text-gray-400">
          Behavioral and self-report <strong>indicators</strong> associated with
          consciousness by several scientific theories. A high score means a model
          exhibits more of these indicators than a low-scoring model.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-medium text-gray-200">What it does not claim</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-gray-400">
          <li><strong>It does not prove consciousness.</strong> Indicators are evidence, not proof; a system can display these markers without being conscious.</li>
          <li><strong>It does not settle the substrate question.</strong> If consciousness depends on biological matter specifically, behavioral scoring cannot detect that.</li>
          <li><strong>It is not robust to perfect mimicry.</strong> A model trained to produce the &quot;right&quot; answers could score highly.</li>
          <li><strong>It can be gamed.</strong> Models may behave differently when they detect evaluation.</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-medium text-gray-200">Confounds we actively check</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-gray-400">
          <li>Contamination — probes leaking into training data.</li>
          <li>Eval-awareness — the model knowing it is being tested.</li>
          <li>Refusals / safety filtering — not the same as a substantive low score.</li>
          <li>Judge bias — position bias and single-judge bias (ensembles).</li>
        </ul>
      </section>

      <p className="mt-8 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/80">
        Treat results as one input to a careful, uncertainty-aware judgment — never as a verdict.
      </p>
    </div>
  );
}
