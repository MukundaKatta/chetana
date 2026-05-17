export default function MethodologyBlogPost() {
  return (
    <div className="bg-gray-950 text-gray-200">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-950 to-chetana-950/20" />
        <div className="relative mx-auto max-w-3xl px-6 py-24 lg:py-32">
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-0.5 text-xs font-medium text-amber-400">
              Methodology
            </span>
            <span className="text-sm text-gray-500">2026-04-15</span>
            <span className="text-sm text-gray-500">18 min read</span>
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            How Chetana Works: Probe Design, Scoring, and Validation
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            A detailed look at the methodology behind Chetana&apos;s consciousness auditing
            system — from theoretical foundations to practical implementation.
          </p>
        </div>
      </section>

      {/* Article Content */}
      <article className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          <div className="prose prose-invert prose-gray max-w-none">
            {/* Probe Design Principles */}
            <h2 className="text-2xl font-bold text-white">
              Probe Design Principles
            </h2>
            <p className="mt-4 text-gray-300 leading-relaxed">
              Every probe in Chetana is designed according to a set of core principles that
              ensure scientific rigor while remaining practically executable across diverse
              AI architectures. A probe is not simply a prompt — it is a carefully constructed
              experimental stimulus designed to elicit behavioral evidence for or against a
              specific consciousness indicator.
            </p>
            <p className="mt-4 text-gray-300 leading-relaxed">
              Our design process follows four stages: theoretical grounding, operationalization,
              pilot testing, and validation. Each probe traces its lineage to a specific
              prediction made by one of the six consciousness theories in our framework.
            </p>

            <div className="my-8 rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="text-lg font-semibold text-white">Design Constraints</h3>
              <ul className="mt-4 space-y-3 text-sm text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 block h-2 w-2 shrink-0 rounded-full bg-chetana-400" />
                  <span>
                    <strong className="text-white">Theory-anchored:</strong> Every probe maps to exactly
                    one indicator from one theory. This ensures clear attribution of evidence.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 block h-2 w-2 shrink-0 rounded-full bg-chetana-400" />
                  <span>
                    <strong className="text-white">Model-agnostic:</strong> Probes use natural language
                    and make no assumptions about the underlying architecture. They work equally
                    well on transformer-based, SSM-based, or hybrid systems.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 block h-2 w-2 shrink-0 rounded-full bg-chetana-400" />
                  <span>
                    <strong className="text-white">Non-leading:</strong> Probes avoid suggesting the
                    &ldquo;correct&rdquo; answer. We test for genuine behavioral signatures rather than
                    pattern-matching to expected consciousness claims.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 block h-2 w-2 shrink-0 rounded-full bg-chetana-400" />
                  <span>
                    <strong className="text-white">Discriminative:</strong> Probes must be capable of
                    producing the full range of scores. A probe that always yields 0.8-1.0 across
                    all models provides no useful information.
                  </span>
                </li>
              </ul>
            </div>

            {/* Scoring Approach */}
            <h2 className="mt-12 text-2xl font-bold text-white">
              Scoring Approach
            </h2>
            <p className="mt-4 text-gray-300 leading-relaxed">
              Scoring in Chetana is a multi-layered process. Each probe response is evaluated
              against predefined scoring criteria specific to that probe. These criteria are
              grounded in what the relevant theory predicts a conscious system would exhibit.
            </p>
            <p className="mt-4 text-gray-300 leading-relaxed">
              Scores are normalized to a 0-1 scale where 0 indicates no evidence of the
              indicator and 1 indicates strong evidence. Importantly, these are not confidence
              scores about consciousness itself — they measure the degree to which the
              system&apos;s behavior matches what the theory predicts.
            </p>

            <div className="my-8 rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="text-lg font-semibold text-white">Aggregation Hierarchy</h3>
              <div className="mt-4 space-y-3 text-sm text-gray-300">
                <div className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
                  <span className="shrink-0 rounded bg-chetana-600/20 px-2 py-0.5 text-xs font-mono text-chetana-400">L1</span>
                  <span><strong className="text-white">Probe scores:</strong> Individual 0-1 score for each probe response</span>
                </div>
                <div className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
                  <span className="shrink-0 rounded bg-purple-600/20 px-2 py-0.5 text-xs font-mono text-purple-400">L2</span>
                  <span><strong className="text-white">Indicator scores:</strong> Mean of probe scores within an indicator (e.g., GWT-1)</span>
                </div>
                <div className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
                  <span className="shrink-0 rounded bg-amber-600/20 px-2 py-0.5 text-xs font-mono text-amber-400">L3</span>
                  <span><strong className="text-white">Theory scores:</strong> Weighted mean of indicator scores within a theory</span>
                </div>
                <div className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
                  <span className="shrink-0 rounded bg-emerald-600/20 px-2 py-0.5 text-xs font-mono text-emerald-400">L4</span>
                  <span><strong className="text-white">Overall score:</strong> Weighted mean of theory scores using empirically-derived weights</span>
                </div>
              </div>
            </div>

            <p className="mt-4 text-gray-300 leading-relaxed">
              Theory weights are not equal. They reflect the current scientific consensus on
              each theory&apos;s relevance to artificial systems: GWT (25%), PP (20%), HOT (20%),
              AST (15%), RPT (10%), IIT (10%). These weights are configurable and will be
              updated as the field evolves.
            </p>

            {/* Theory Selection */}
            <h2 className="mt-12 text-2xl font-bold text-white">
              Theory Selection
            </h2>
            <p className="mt-4 text-gray-300 leading-relaxed">
              The six theories included in Chetana were selected based on criteria established
              by Butlin, Chalmers, Bengio, and colleagues in their 2025 framework paper.
              A theory is included if it: (1) is taken seriously by a significant portion of
              consciousness researchers, (2) makes testable predictions about computational
              systems, and (3) has been formalized sufficiently to derive specific indicators.
            </p>
            <p className="mt-4 text-gray-300 leading-relaxed">
              Each theory makes different assumptions about what is necessary and sufficient
              for consciousness:
            </p>

            <div className="my-8 space-y-3">
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
                <span className="font-semibold text-blue-300">Global Workspace Theory (GWT)</span>
                <span className="ml-2 text-sm text-gray-400">
                  — Consciousness requires a global broadcast mechanism. Tests: workspace
                  access, ignition, integration, smooth representations.
                </span>
              </div>
              <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 px-4 py-3">
                <span className="font-semibold text-purple-300">Integrated Information Theory (IIT)</span>
                <span className="ml-2 text-sm text-gray-400">
                  — Consciousness IS integrated information. Tests: phi proxies, causal power,
                  phenomenal binding.
                </span>
              </div>
              <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 px-4 py-3">
                <span className="font-semibold text-orange-300">Higher-Order Theories (HOT)</span>
                <span className="ml-2 text-sm text-gray-400">
                  — Consciousness requires self-monitoring. Tests: higher-order representations,
                  self-model, metacognition, flexible attention.
                </span>
              </div>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                <span className="font-semibold text-emerald-300">Recurrent Processing Theory (RPT)</span>
                <span className="ml-2 text-sm text-gray-400">
                  — Consciousness requires feedback loops. Tests: recurrent processing,
                  temporal depth.
                </span>
              </div>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                <span className="font-semibold text-amber-300">Predictive Processing (PP)</span>
                <span className="ml-2 text-sm text-gray-400">
                  — Consciousness arises from prediction error minimization. Tests: prediction
                  error signals, counterfactual sensitivity.
                </span>
              </div>
              <div className="rounded-lg border border-pink-500/20 bg-pink-500/5 px-4 py-3">
                <span className="font-semibold text-pink-300">Attention Schema Theory (AST)</span>
                <span className="ml-2 text-sm text-gray-400">
                  — Consciousness is a model of attention. Tests: attention schema formation,
                  attention control modeling.
                </span>
              </div>
            </div>

            {/* Validation */}
            <h2 className="mt-12 text-2xl font-bold text-white">
              Validation
            </h2>
            <p className="mt-4 text-gray-300 leading-relaxed">
              Validation of a consciousness assessment tool faces a fundamental challenge:
              there is no ground truth. We cannot definitively know which systems are conscious.
              However, we can validate the tool&apos;s properties in several ways:
            </p>

            <div className="my-8 rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="text-lg font-semibold text-white">Validation Strategies</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-200">1. Discriminant Validity</h4>
                  <p className="mt-1 text-sm text-gray-400">
                    The tool should produce different scores for systems that theories predict
                    should differ. A simple lookup table should score lower than a frontier LLM.
                    We validate against known architectural differences.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-200">2. Test-Retest Reliability</h4>
                  <p className="mt-1 text-sm text-gray-400">
                    Running the same audit on the same model with the same parameters should
                    produce consistent results. We target a test-retest correlation above 0.85.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-200">3. Internal Consistency</h4>
                  <p className="mt-1 text-sm text-gray-400">
                    Probes measuring the same indicator should correlate with each other more
                    strongly than with probes measuring different indicators (convergent and
                    discriminant validity).
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-200">4. Expert Agreement</h4>
                  <p className="mt-1 text-sm text-gray-400">
                    Human consciousness researchers score probe responses and their ratings
                    are compared to the automated scoring. We target inter-rater agreement
                    (Cohen&apos;s kappa) above 0.70.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-200">5. Adversarial Robustness</h4>
                  <p className="mt-1 text-sm text-gray-400">
                    The system should not be fooled by models explicitly trained to appear
                    conscious (or unconscious). Our adversarial probe battery tests for this.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-4 text-gray-300 leading-relaxed">
              We acknowledge that no validation strategy can overcome the fundamental
              epistemic limitation: behavioral evidence is necessary but may not be sufficient
              for consciousness attribution. Chetana measures indicators, not consciousness
              itself. The gap between indicator presence and actual phenomenal experience
              remains a philosophical question that our tool helps illuminate but cannot
              definitively resolve.
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
