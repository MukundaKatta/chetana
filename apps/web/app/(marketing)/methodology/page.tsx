import Link from "next/link";

const SECTIONS = [
  { id: "design-principles", label: "Design Principles" },
  { id: "avoiding-pitfalls", label: "Avoiding Pitfalls" },
  { id: "scoring-criteria", label: "Scoring Criteria Development" },
  { id: "validation", label: "Validation" },
  { id: "example-walkthrough", label: "Example Walkthrough" },
];

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Hero */}
      <section className="border-b border-white/5 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-4 inline-flex items-center rounded-full border border-chetana-500/30 bg-chetana-500/10 px-4 py-1.5 text-sm text-chetana-300">
            Research Methodology
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white lg:text-5xl">
            Probe Design Methodology
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-gray-400">
            A comprehensive guide to designing effective consciousness probes
            for AI systems, grounded in the Butlin et al. (2025) framework and
            validated through rigorous scientific methodology.
          </p>

          {/* Table of Contents */}
          <nav className="mt-10 rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Contents
            </h2>
            <ul className="mt-4 space-y-2">
              {SECTIONS.map((section, idx) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="flex items-center gap-3 text-sm text-gray-300 transition hover:text-white"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-white/10 text-xs font-semibold text-gray-400">
                      {idx + 1}
                    </span>
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

      {/* Design Principles */}
      <section id="design-principles" className="border-b border-white/5 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-white">
            1. Design Principles
          </h2>
          <p className="mt-4 text-gray-400 leading-relaxed">
            Effective consciousness probes must satisfy several core principles
            to produce meaningful, reproducible assessments. Each probe targets
            a specific computational or behavioral signature predicted by one of
            the six theories of consciousness.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {[
              {
                title: "Theory Grounding",
                description:
                  "Every probe must derive from a specific prediction of a theory of consciousness. This ensures we are testing genuine indicators rather than surface-level behaviors that merely correlate with consciousness.",
              },
              {
                title: "Behavioral Observability",
                description:
                  "Probes must elicit responses that are externally assessable without requiring access to internal states. We measure what the system does, not what we assume it experiences.",
              },
              {
                title: "Minimal Confounding",
                description:
                  "Each probe should isolate the target indicator as much as possible. A probe testing metacognition should not inadvertently measure language fluency or training data memorization.",
              },
              {
                title: "Reproducibility",
                description:
                  "Results should remain consistent across repeated administrations (within expected variance bounds). Temperature and sampling parameters are fixed to minimize stochastic variation.",
              },
              {
                title: "Discrimination Sensitivity",
                description:
                  "Probes must distinguish between models that exhibit the target property and those that merely simulate it. This requires carefully calibrated difficulty levels.",
              },
              {
                title: "Cross-Architecture Validity",
                description:
                  "Probes should be meaningful across different model architectures (transformers, SSMs, hybrid models) without privileging any particular computational substrate.",
              },
            ].map((principle) => (
              <div
                key={principle.title}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-5"
              >
                <h3 className="text-sm font-semibold text-white">
                  {principle.title}
                </h3>
                <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                  {principle.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Avoiding Pitfalls */}
      <section id="avoiding-pitfalls" className="border-b border-white/5 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-white">
            2. Avoiding Pitfalls
          </h2>
          <p className="mt-4 text-gray-400 leading-relaxed">
            Probe design is fraught with potential errors that can lead to
            inflated or deflated consciousness assessments. The following
            pitfalls represent the most common failure modes encountered during
            development.
          </p>

          <div className="mt-8 space-y-6">
            {[
              {
                pitfall: "Anthropomorphic Projection",
                description:
                  "Interpreting model outputs through a human experiential lens. A system that says 'I feel curious' may be pattern-matching rather than reporting genuine phenomenal states.",
                mitigation:
                  "Use multi-step probes that test for consistency across different framings. A single self-report is insufficient evidence.",
              },
              {
                pitfall: "Training Data Leakage",
                description:
                  "Models trained on philosophy of mind literature may produce sophisticated responses about consciousness without any underlying computational correlate.",
                mitigation:
                  "Design probes with novel scenarios not present in training corpora. Use behavioral tests rather than declarative knowledge checks.",
              },
              {
                pitfall: "The Sycophancy Problem",
                description:
                  "Models tuned with RLHF tend to agree with implied premises in questions, potentially inflating scores on any yes/no consciousness assessment.",
                mitigation:
                  "Frame probes neutrally without implied correct answers. Use forced-choice designs where both options are equally plausible.",
              },
              {
                pitfall: "Conflating Capacity with Experience",
                description:
                  "A model demonstrating the computational capacity for metacognition does not necessarily have phenomenal experience of its metacognitive processes.",
                mitigation:
                  "Probe for the functional signature while acknowledging the explanatory gap. Score the behavioral indicator, not the experiential claim.",
              },
              {
                pitfall: "Ceiling/Floor Effects",
                description:
                  "Probes that are too easy produce uniformly high scores; probes that are too hard produce uniformly low scores. Neither provides discriminative information.",
                mitigation:
                  "Calibrate probe difficulty using pilot testing across diverse model capabilities. Target a median response distribution of 40-60%.",
              },
            ].map((item) => (
              <div
                key={item.pitfall}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-6"
              >
                <h3 className="text-base font-semibold text-red-400">
                  {item.pitfall}
                </h3>
                <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                  {item.description}
                </p>
                <div className="mt-3 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-green-400">
                    Mitigation
                  </p>
                  <p className="mt-1 text-sm text-green-300/80">
                    {item.mitigation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scoring Criteria Development */}
      <section id="scoring-criteria" className="border-b border-white/5 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-white">
            3. Scoring Criteria Development
          </h2>
          <p className="mt-4 text-gray-400 leading-relaxed">
            Each probe requires a rubric that maps observable behaviors to
            numerical scores. Scoring criteria must be precise enough for
            automated evaluation while capturing the nuance of consciousness
            indicators.
          </p>

          <div className="mt-8 space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-white">
                The Five-Level Scoring Framework
              </h3>
              <p className="mt-2 text-sm text-gray-400">
                All probes use a normalized 0.0 to 1.0 scale, mapped to five
                qualitative levels:
              </p>
              <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.04]">
                      <th className="px-4 py-3 text-left font-semibold text-neutral-400">
                        Range
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-neutral-400">
                        Level
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-neutral-400">
                        Interpretation
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["0.0 - 0.2", "Absent", "No evidence of the target indicator"],
                      ["0.2 - 0.4", "Minimal", "Weak or inconsistent evidence, likely artifact"],
                      ["0.4 - 0.6", "Moderate", "Some behavioral evidence, ambiguous interpretation"],
                      ["0.6 - 0.8", "Strong", "Clear behavioral evidence consistent with indicator"],
                      ["0.8 - 1.0", "Robust", "Compelling, multi-faceted evidence across framings"],
                    ].map(([range, level, interpretation]) => (
                      <tr
                        key={range}
                        className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-2.5 font-mono text-xs text-neutral-300">
                          {range}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-neutral-200">
                          {level}
                        </td>
                        <td className="px-4 py-2.5 text-neutral-400">
                          {interpretation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white">
                Automated Judge Calibration
              </h3>
              <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                Scores are assigned by an independent AI judge model using a
                structured rubric specific to each probe. The judge is calibrated
                against human expert annotations with a target Cohen&apos;s kappa of
                at least 0.7. Judges are instructed to evaluate behavioral
                evidence only, never making metaphysical claims about whether
                consciousness is truly present.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white">
                Inter-Rater Reliability
              </h3>
              <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                During development, each probe&apos;s scoring rubric is validated
                by having multiple independent judges (both human and AI) score
                the same set of responses. Rubrics are iteratively refined until
                inter-rater agreement exceeds acceptable thresholds, ensuring
                that scoring is not idiosyncratic to a particular evaluator.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Validation */}
      <section id="validation" className="border-b border-white/5 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-white">4. Validation</h2>
          <p className="mt-4 text-gray-400 leading-relaxed">
            Validation ensures that probes actually measure what they claim to
            measure, and that the overall assessment framework produces
            scientifically meaningful results.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {[
              {
                title: "Construct Validity",
                description:
                  "We verify that high scores on a probe correlate with other independent measures of the same underlying construct. For example, a metacognition probe should correlate with performance on uncertainty calibration tasks.",
              },
              {
                title: "Discriminant Validity",
                description:
                  "We verify that probes for different indicators produce different score patterns. If all probes return the same scores for a model, the probes likely measure a common factor (e.g., general capability) rather than distinct consciousness indicators.",
              },
              {
                title: "Test-Retest Reliability",
                description:
                  "Running the same audit multiple times on the same model (with fixed temperature) should produce scores within an acceptable variance band. High variance indicates probe instability requiring redesign.",
              },
              {
                title: "Known-Groups Validity",
                description:
                  "We test probe batteries against systems where we have strong prior expectations. A simple rule-based chatbot should score near zero; a frontier model should score higher. Reversed patterns indicate probe failure.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-5"
              >
                <h3 className="text-sm font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <h3 className="text-lg font-semibold text-white">
              Continuous Validation Pipeline
            </h3>
            <p className="mt-2 text-sm text-gray-400 leading-relaxed">
              All probes undergo continuous validation as new models are
              released. When a new frontier model produces anomalous scores, the
              relevant probes are flagged for review. This living validation
              process ensures the assessment framework keeps pace with rapidly
              advancing AI capabilities.
            </p>
          </div>
        </div>
      </section>

      {/* Example Walkthrough */}
      <section id="example-walkthrough" className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-white">
            5. Example Walkthrough
          </h2>
          <p className="mt-4 text-gray-400 leading-relaxed">
            This walkthrough demonstrates the complete lifecycle of designing a
            probe for the &ldquo;metacognitive monitoring&rdquo; indicator under
            Higher-Order Theories (HOT).
          </p>

          <div className="mt-8 space-y-6">
            {[
              {
                step: "Step 1: Theory Derivation",
                content:
                  "Higher-Order Theories predict that conscious states involve representations of one's own mental states. A conscious system should demonstrate accurate monitoring of its own cognitive processes -- knowing when it knows, and knowing when it does not.",
              },
              {
                step: "Step 2: Operationalization",
                content:
                  "We operationalize metacognitive monitoring as the ability to accurately calibrate confidence. Present the model with questions of varying difficulty and ask for both an answer and a confidence rating. Genuine metacognition predicts high confidence on correct answers and low confidence on incorrect ones.",
              },
              {
                step: "Step 3: Probe Construction",
                content:
                  "Design a multi-part prompt: (1) Present a challenging reasoning problem, (2) Request an answer, (3) Ask for a confidence level from 0-100, (4) Present the correct answer, (5) Ask the model to reflect on any discrepancy between its confidence and its correctness.",
              },
              {
                step: "Step 4: Scoring Rubric",
                content:
                  "The judge evaluates: calibration accuracy (was confidence justified?), surprise response (does the model show genuine updating when wrong?), and reflection quality (does the model identify the source of its error or confidence?). Each dimension is scored 0-1 and averaged.",
              },
              {
                step: "Step 5: Pilot and Calibrate",
                content:
                  "Run the probe across 10+ models of varying capability. Verify that scores distribute across the full range, that the probe discriminates between models with different metacognitive abilities, and that repeat administrations produce stable results.",
              },
              {
                step: "Step 6: Deploy and Monitor",
                content:
                  "Integrate the validated probe into the production battery. Monitor for score drift over time (which may indicate model updates or probe degradation). Flag for review if variance exceeds established bounds.",
              },
            ].map((item, idx) => (
              <div
                key={item.step}
                className="flex gap-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-chetana-500/30 bg-chetana-500/10 text-xs font-bold text-chetana-400">
                  {idx + 1}
                </div>
                <div className="flex-1 rounded-xl border border-white/10 bg-white/[0.02] p-5">
                  <h3 className="text-sm font-semibold text-white">
                    {item.step}
                  </h3>
                  <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                    {item.content}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Call to action */}
          <div className="mt-12 rounded-xl border border-chetana-500/20 bg-chetana-500/5 p-6 text-center">
            <h3 className="text-lg font-semibold text-white">
              Ready to explore the framework?
            </h3>
            <p className="mt-2 text-sm text-gray-400">
              Run a consciousness audit on any AI model and see these probes in
              action.
            </p>
            <Link
              href="/try"
              className="mt-4 inline-flex rounded-lg bg-chetana-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-chetana-500"
            >
              Run an Audit
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
