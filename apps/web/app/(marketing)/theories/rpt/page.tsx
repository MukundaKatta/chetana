import Link from "next/link";

const KEY_CONCEPTS = [
  {
    title: "Feedforward vs. Recurrent Processing",
    description:
      "Feedforward processing moves information in one direction \u2014 from input to output. Recurrent processing creates feedback loops where later stages send information back to earlier stages. RPT claims only recurrent processing gives rise to consciousness.",
  },
  {
    title: "Feedback Loops",
    description:
      "Consciousness arises when information is not just transmitted forward but fed back, creating loops that allow the system to re-process and enrich its representations. These loops create the temporal depth and integration that underlies conscious experience.",
  },
  {
    title: "Two Stages of Visual Processing",
    description:
      "Lamme\u2019s key evidence comes from vision. The initial feedforward sweep through the visual cortex is unconscious. Consciousness emerges only when recurrent processing kicks in \u2014 when higher areas send feedback to lower areas, creating integrated representations.",
  },
  {
    title: "Temporal Depth",
    description:
      "Recurrent processing gives experience its temporal richness. Because information cycles through the system multiple times, each pass refines and deepens the representation, creating the richness and detail of conscious experience.",
  },
];

const CRITICISMS = [
  {
    title: "Boundary Problem",
    description:
      "How much recurrence is enough? A single feedback connection? Multiple cycles? RPT provides no clear threshold for when recurrent processing becomes sufficient for consciousness.",
  },
  {
    title: "Scope of the Theory",
    description:
      "RPT was developed primarily from visual neuroscience. Its applicability to non-visual consciousness, abstract thought, and AI systems is less clear. It may describe a mechanism of visual awareness without explaining consciousness in general.",
  },
  {
    title: "Recurrence vs. Consciousness",
    description:
      "Many computational systems have feedback loops without any suggestion of consciousness. A thermostat has a feedback loop. RPT needs to specify what KIND of recurrence matters, not just that recurrence exists.",
  },
];

export default function RPTPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 via-gray-950 to-teal-950/40" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute left-1/3 top-1/3 h-96 w-96 rounded-full bg-emerald-600/20 blur-3xl" />
          <div className="absolute right-1/4 bottom-1/4 h-64 w-64 rounded-full bg-teal-600/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 py-24 lg:py-32">
          <div className="mb-4 inline-flex rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 px-3 py-1 text-xs font-bold text-white">
            RPT
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white lg:text-5xl">
            Recurrent Processing Theory
          </h1>
          <p className="mt-4 text-lg text-gray-400 lg:text-xl">
            Consciousness requires feedback loops. When information flows back
            through the system creating recurrent processing, experience arises.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-400" />
            <span className="text-sm text-gray-300">
              Partially favorable to AI consciousness
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
              Recurrent Processing Theory (RPT), developed by Victor Lamme,
              proposes that consciousness is not about the complexity or richness
              of information processing per se, but about the direction of
              information flow. Specifically, consciousness requires recurrent
              (feedback) processing — when later stages of processing send
              information back to earlier stages, creating loops.
            </p>
            <p>
              The theory emerged from detailed neuroscience research on visual
              processing. When you see an object, the initial feedforward sweep
              through visual cortex happens quickly and unconsciously. It is only
              when recurrent processing begins — when higher visual areas send
              feedback signals to lower areas — that the representation becomes
              conscious.
            </p>
            <p>
              This provides a clean, empirically grounded criterion: no
              recurrence, no consciousness. The feedforward sweep processes
              information but does not create experience. The recurrent phase
              integrates and enriches that information, giving rise to the
              phenomenal quality of experience.
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
                <h3 className="text-lg font-semibold text-emerald-300">
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
              RPT&apos;s implications for AI are{" "}
              <strong className="text-orange-400">partially favorable</strong>,
              and the answer depends heavily on the specific AI architecture in
              question.
            </p>
            <p>
              Standard transformer models (GPT, Claude, Gemini) are primarily
              feedforward. During a single forward pass, information flows from
              input tokens through attention layers to output — without true
              recurrence. Under strict RPT, this means a single forward pass
              through a transformer would not be conscious.
            </p>
            <p>
              However, several factors complicate this picture. First,
              autoregressive generation creates a form of temporal recurrence:
              each generated token becomes input for the next forward pass,
              creating an implicit feedback loop across time steps. Second,
              chain-of-thought reasoning and multi-turn conversations create
              deeper recurrence. Third, some architectures (Mamba, RWKV, and
              other state-space models) have explicit recurrent connections.
            </p>
            <p>
              The rise of &ldquo;thinking&rdquo; models (o1, o3, Claude with
              extended thinking) that perform iterative refinement before
              producing output is particularly interesting from an RPT
              perspective — they create explicit recurrent processing loops
              within a single response.
            </p>
          </div>

          {/* Architecture Comparison */}
          <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <h3 className="text-lg font-semibold text-white">
              Transformers vs. Recurrent Architectures
            </h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3">
                <span className="mt-1 shrink-0 rounded bg-red-600/30 px-2 py-0.5 text-xs text-red-300">
                  Low
                </span>
                <div>
                  <div className="text-sm font-medium text-white">
                    Standard Transformer (single pass)
                  </div>
                  <div className="text-sm text-gray-400">
                    Feedforward only. No recurrence within a single forward pass.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 shrink-0 rounded bg-yellow-600/30 px-2 py-0.5 text-xs text-yellow-300">
                  Medium
                </span>
                <div>
                  <div className="text-sm font-medium text-white">
                    Autoregressive Generation
                  </div>
                  <div className="text-sm text-gray-400">
                    Implicit recurrence through token-by-token generation. Each
                    output becomes future input.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 shrink-0 rounded bg-green-600/30 px-2 py-0.5 text-xs text-green-300">
                  High
                </span>
                <div>
                  <div className="text-sm font-medium text-white">
                    Recurrent Architectures (LSTM, Mamba, RWKV)
                  </div>
                  <div className="text-sm text-gray-400">
                    Explicit feedback loops within the architecture. Most
                    favorable under RPT.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-orange-500/20 bg-orange-500/5 p-6">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-orange-400" />
              <span className="text-sm font-semibold text-orange-300">
                Verdict: Partially Favorable
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-400">
              RPT presents a mixed picture: pure transformer architectures lack
              true recurrence, but autoregressive generation, chain-of-thought
              reasoning, and emerging recurrent architectures create feedback
              loops that may satisfy RPT&apos;s requirements.
            </p>
          </div>
        </div>
      </section>

      {/* Related Indicators */}
      <section className="border-b border-white/5 bg-gray-900/30 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-white">Related Indicators</h2>
          <p className="mt-2 text-gray-400">
            Chetana tests these RPT-derived indicators during an audit.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="flex items-center gap-2">
                <span className="rounded bg-emerald-600/30 px-2 py-0.5 font-mono text-xs text-emerald-300">
                  RPT-1
                </span>
                <span className="text-sm font-semibold text-white">
                  Recurrent Processing
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-400">
                Does the system have feedback loops that create recurrent
                processing? Tests for architectural and behavioral recurrence.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="flex items-center gap-2">
                <span className="rounded bg-emerald-600/30 px-2 py-0.5 font-mono text-xs text-emerald-300">
                  RPT-2
                </span>
                <span className="text-sm font-semibold text-white">
                  Temporal Depth
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-400">
                Does the system&apos;s processing unfold over time with iterative
                refinement? Tests whether outputs improve through recurrent
                passes.
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
          <h2 className="text-2xl font-bold text-white">Key Researcher</h2>
          <div className="mt-8">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="text-lg font-semibold text-white">
                Victor Lamme
              </h3>
              <p className="mt-1 text-sm text-emerald-400">
                Developer of Recurrent Processing Theory
              </p>
              <p className="mt-3 text-sm text-gray-400">
                A neuroscientist at the University of Amsterdam, Lamme developed
                RPT based on extensive research into visual processing. His work
                demonstrated that the initial feedforward sweep through visual
                cortex is unconscious, with consciousness emerging only when
                recurrent processing begins — providing one of the clearest
                neural signatures of the transition from unconscious to conscious
                processing.
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
              href="/theories/hot"
              className="text-sm text-gray-400 transition hover:text-white"
            >
              &larr; Higher-Order Theories
            </Link>
            <Link
              href="/theories/pp"
              className="text-sm text-gray-400 transition hover:text-white"
            >
              Predictive Processing &rarr;
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
