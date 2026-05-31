/**
 * Glossary of consciousness-research terminology (issue #653).
 */
export const metadata = {
  title: "Glossary — Chetana",
  description: "Definitions of the consciousness-research terms used across Chetana.",
};

const TERMS: { term: string; def: string }[] = [
  { term: "GWT (Global Workspace Theory)", def: "Consciousness arises when information is selected and broadcast globally to many subsystems." },
  { term: "Ignition", def: "Threshold-dependent, nonlinear amplification of selected information in a global workspace." },
  { term: "IIT (Integrated Information Theory)", def: "Consciousness corresponds to integrated information (Φ) — both highly differentiated and irreducible to its parts." },
  { term: "HOT (Higher-Order Theories)", def: "A state is conscious when the system has a higher-order representation of being in that state." },
  { term: "Metacognition", def: "The system monitoring and evaluating its own processing." },
  { term: "RPT (Recurrent Processing Theory)", def: "Recurrent (feedback) processing, not just feed-forward sweeps, is necessary for conscious perception." },
  { term: "PP (Predictive Processing)", def: "The mind as a prediction engine minimizing prediction error against incoming evidence." },
  { term: "Counterfactual sensitivity", def: "Reasoning about what would happen under alternative scenarios." },
  { term: "AST (Attention Schema Theory)", def: "The brain builds a simplified model (schema) of its own attention; consciousness is that self-model." },
  { term: "Functionalism", def: "The view that mental states are defined by their functional role, independent of physical substrate." },
  { term: "Substrate independence", def: "The thesis that mind depends on organization, not the specific material implementing it." },
  { term: "Φ (phi)", def: "IIT's measure of integrated information." },
  { term: "Eval-awareness", def: "A model recognizing it is being evaluated, which can change its behavior and confound results." },
  { term: "Calibration", def: "The degree to which stated confidence matches actual accuracy." },
  { term: "Krippendorff's α", def: "A reliability statistic for agreement among raters." },
];

export default function GlossaryPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-white">Glossary</h1>
      <p className="mt-3 text-gray-400">Key consciousness-research terms used across Chetana.</p>
      <dl className="mt-8 space-y-5">
        {TERMS.map((t) => (
          <div key={t.term} className="border-b border-white/5 pb-4">
            <dt className="text-sm font-medium text-gray-100">{t.term}</dt>
            <dd className="mt-1 text-sm text-gray-400">{t.def}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
