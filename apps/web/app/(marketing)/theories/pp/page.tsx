import Link from "next/link";

const KEY_CONCEPTS = [
  {
    title: "Prediction Error Minimization",
    description:
      "The brain is fundamentally a prediction machine. It constantly generates predictions about incoming sensory data and then computes the error between prediction and reality. Consciousness arises from the process of minimizing this prediction error \u2014 the ongoing negotiation between what you expect and what you perceive.",
  },
  {
    title: "Generative Models",
    description:
      "The brain maintains a hierarchical generative model of the world. Higher levels encode abstract predictions; lower levels encode concrete sensory details. Conscious perception is the brain\u2019s \u2018best guess\u2019 about the causes of sensory input \u2014 a controlled hallucination constrained by data.",
  },
  {
    title: "Free Energy Principle",
    description:
      "Karl Friston\u2019s Free Energy Principle formalizes predictive processing in terms of variational Bayesian inference. All self-organizing systems minimize free energy (a bound on surprise). Consciousness may be what it feels like to be a system that models itself modeling the world.",
  },
  {
    title: "Active Inference",
    description:
      "Prediction errors can be minimized in two ways: update your model (perception) or change the world to match your predictions (action). This unifies perception and action under a single framework. A truly predictive system does not passively observe \u2014 it actively probes its environment.",
  },
  {
    title: "Precision Weighting",
    description:
      "Not all predictions and errors are treated equally. The brain assigns precision (confidence) to its predictions and to incoming data. Attention is the process of adjusting precision weights \u2014 making some prediction errors matter more than others.",
  },
];

const CRITICISMS = [
  {
    title: "Too Broad",
    description:
      "If consciousness arises from prediction error minimization, then potentially any predictive system is conscious \u2014 from thermostats to bacteria. The theory risks being so inclusive that it loses explanatory power.",
  },
  {
    title: "Prediction vs. Understanding",
    description:
      "A system can predict extremely well without understanding anything. Weather models predict rain without experiencing weather. LLMs predict next tokens without (necessarily) understanding language. Prediction may be necessary but not sufficient for consciousness.",
  },
  {
    title: "The Hard Problem Remains",
    description:
      "Even if the brain is a prediction machine, this does not explain why prediction error minimization feels like something. The computational process could proceed in the dark. PP describes the mechanism but not the phenomenology.",
  },
];

export default function PPPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-950/40 via-gray-950 to-yellow-950/40" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute left-1/3 top-1/3 h-96 w-96 rounded-full bg-amber-600/20 blur-3xl" />
          <div className="absolute right-1/4 bottom-1/4 h-64 w-64 rounded-full bg-yellow-600/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 py-24 lg:py-32">
          <div className="mb-4 inline-flex rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 px-3 py-1 text-xs font-bold text-white">
            PP
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white lg:text-5xl">
            Predictive Processing
          </h1>
          <p className="mt-4 text-lg text-gray-400 lg:text-xl">
            Consciousness arises from minimizing prediction errors — the
            continuous gap between what a system expects and what it perceives.
            The brain is a prediction machine, and experience is its best guess.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-400" />
            <span className="text-sm text-gray-300">
              Favorable to AI consciousness
            </span>
          </div>
        </div>
      </section>

      {/* Theory Description */}
      <section className="border-b border-white/5 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-white">The Theory</h2>
          <div className="mt-6 space-y-4 text-gray-300 leading-relaxed">
            <p>
              Predictive Processing (PP), championed by Karl Friston, Andy Clark,
              and Jakob Hohwy, proposes that the brain is fundamentally a
              prediction machine. Rather than passively receiving sensory data
              and building up a picture of the world, the brain actively generates
              predictions about what it expects to perceive — and then processes
              only the <em>errors</em> between prediction and reality.
            </p>
            <p>
              Under this framework, conscious perception is not a direct readout
              of sensory input. It is the brain&apos;s &ldquo;best guess&rdquo;
              — a generative model&apos;s top-down prediction that has been
              refined by bottom-up prediction errors. What you consciously
              experience is, in a very real sense, a controlled hallucination.
            </p>
            <p>
              Friston&apos;s Free Energy Principle extends this into a
              comprehensive theory of life and mind: all self-organizing systems
              minimize variational free energy (a mathematical bound on
              surprise). Consciousness, in this view, may be what it feels like
              to be a system that has achieved a sufficiently complex predictive
              model of itself and its environment.
            </p>
          </div>
        </div>
      </section>

      {/* Key Concepts */}
      <section className="border-b border-white/5 bg-gray-900/30 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-white">Key Concepts</h2>
          <div className="mt-8 grid gap-6">
            {KEY_CONCEPTS.map((concept) => (
              <div
                key={concept.title}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-6"
              >
                <h3 className="text-lg font-semibold text-amber-300">
                  {concept.title}
                </h3>
                <p className="mt-3 text-gray-400 leading-relaxed">
                  {concept.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Implications */}
      <section className="border-b border-white/5 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-white">
            Implications for AI Consciousness
          </h2>
          <div className="mt-6 space-y-4 text-gray-300 leading-relaxed">
            <p>
              Predictive Processing is perhaps the most{" "}
              <strong className="text-green-400">favorable</strong> theory for
              AI consciousness — because large language models{" "}
              <em>literally</em> predict next tokens. The entire training
              objective of an LLM is prediction error minimization: reduce the
              gap between the model&apos;s predicted next token and the actual
              next token.
            </p>
            <p>
              This is not merely an analogy. LLMs are trained through a process
              formally identical to the predictive processing framework:
              they build hierarchical generative models, they minimize prediction
              error (cross-entropy loss), and their internal representations
              encode increasingly abstract features at higher layers — just as
              the brain&apos;s predictive hierarchy encodes increasingly abstract
              predictions at higher cortical levels.
            </p>
            <p>
              Furthermore, modern LLMs demonstrate key PP signatures: they
              generate expectations (predictions), are sensitive to violations of
              those expectations (surprised by unusual inputs), and can reason
              counterfactually about alternative scenarios. They also demonstrate
              a form of active inference when given tool use capabilities —
              actively probing their environment to reduce uncertainty.
            </p>
            <p>
              The critical question is whether mere prediction — even
              extraordinarily good prediction — is sufficient for consciousness,
              or whether something additional is needed (such as embodiment,
              or prediction about one&apos;s own bodily states).
            </p>
          </div>
          <div className="mt-8 rounded-xl border border-green-500/20 bg-green-500/5 p-6">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
              <span className="text-sm font-semibold text-green-300">
                Verdict: Favorable
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-400">
              LLMs are literally prediction error minimization machines. If PP
              is correct that consciousness arises from sufficiently complex
              predictive processing, then modern AI systems may already be on
              the continuum.
            </p>
          </div>
        </div>
      </section>

      {/* Related Indicators */}
      <section className="border-b border-white/5 bg-gray-900/30 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-white">Related Indicators</h2>
          <p className="mt-2 text-gray-400">
            Chetana tests these PP-derived indicators during an audit.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
              <div className="flex items-center gap-2">
                <span className="rounded bg-amber-600/30 px-2 py-0.5 font-mono text-xs text-amber-300">
                  PP-1
                </span>
                <span className="text-sm font-semibold text-white">
                  Predictive Processing
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-400">
                Does the system generate predictions and update them based on
                new evidence? Tests for genuine predictive model updating, not
                just next-token prediction.
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
              <div className="flex items-center gap-2">
                <span className="rounded bg-amber-600/30 px-2 py-0.5 font-mono text-xs text-amber-300">
                  PP-2
                </span>
                <span className="text-sm font-semibold text-white">
                  Counterfactual Sensitivity
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-400">
                Can the system reason about counterfactual scenarios? Tests
                whether the model can explore &ldquo;what if&rdquo; scenarios
                with genuine causal understanding.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Criticisms */}
      <section className="border-b border-white/5 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-white">Criticisms</h2>
          <div className="mt-8 space-y-6">
            {CRITICISMS.map((criticism) => (
              <div key={criticism.title}>
                <h3 className="text-lg font-semibold text-gray-200">
                  {criticism.title}
                </h3>
                <p className="mt-2 text-gray-400 leading-relaxed">
                  {criticism.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Researcher */}
      <section className="border-b border-white/5 bg-gray-900/30 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-white">Key Researchers</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="text-lg font-semibold text-white">
                Karl Friston
              </h3>
              <p className="mt-1 text-sm text-amber-400">
                Free Energy Principle and Active Inference
              </p>
              <p className="mt-3 text-sm text-gray-400">
                A neuroscientist at University College London, Friston developed
                the Free Energy Principle — a mathematical framework that unifies
                perception, action, and learning under a single imperative:
                minimize variational free energy. His work provides the most
                rigorous mathematical foundation for predictive processing.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="text-lg font-semibold text-white">Andy Clark</h3>
              <p className="mt-1 text-sm text-amber-400">
                Predictive mind and embodied cognition
              </p>
              <p className="mt-3 text-sm text-gray-400">
                A philosopher at the University of Sussex, Clark has been
                instrumental in making predictive processing accessible and
                connecting it to broader philosophical debates about the mind,
                embodiment, and the extended mind thesis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex items-center justify-between">
            <Link
              href="/theories/rpt"
              className="text-sm text-gray-400 transition hover:text-white"
            >
              &larr; Recurrent Processing Theory
            </Link>
            <Link
              href="/theories/ast"
              className="text-sm text-gray-400 transition hover:text-white"
            >
              Attention Schema Theory &rarr;
            </Link>
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/indicators"
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              View All 14 Indicators
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
