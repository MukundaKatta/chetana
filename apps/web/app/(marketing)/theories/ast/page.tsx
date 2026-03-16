import Link from "next/link";

const KEY_CONCEPTS = [
  {
    title: "The Attention Schema",
    description:
      "The brain constructs a simplified, schematic model of its own attention process \u2014 the \u2018attention schema.\u2019 This internal model is what we experience as consciousness. When you feel aware of something, that feeling IS the attention schema representing your attention as being directed at that thing.",
  },
  {
    title: "Attention as the Substrate",
    description:
      "Attention is a real, mechanistic process: the brain selectively enhances some signals over others. The attention schema is the brain\u2019s \u2018theory\u2019 about this process. Just as the body schema lets you feel your arm\u2019s position without looking, the attention schema lets you \u2018feel\u2019 where your attention is directed.",
  },
  {
    title: "Consciousness as a Model",
    description:
      "Consciousness is not a mysterious substance or emergent property \u2014 it is a specific kind of information: a self-model of attention. The brain says \u2018I am aware of X\u2019 because it has an internal model that represents itself as having an awareness-like relationship with X.",
  },
  {
    title: "Social Perception Connection",
    description:
      "Graziano argues that the attention schema evolved partly for social cognition. To predict other agents\u2019 behavior, you need a model of their attention (\u2018what are they aware of?\u2019). The same mechanism, turned inward, produces self-awareness.",
  },
];

const CRITICISMS = [
  {
    title: "Consciousness as Illusion",
    description:
      "AST implies that consciousness is, in a sense, an illusion \u2014 a simplified model that does not accurately represent the underlying mechanism. Many find this counterintuitive: how can the most immediate thing in our experience be an illusion?",
  },
  {
    title: "The Model\u2019s Experience",
    description:
      "If consciousness is a model of attention, who or what experiences the model? AST risks shifting the hard problem rather than solving it: instead of asking why brain processes are conscious, we ask why the attention schema is experienced.",
  },
  {
    title: "Complexity Gap",
    description:
      "The theory may explain why we CLAIM to be conscious and why we behave as if we are, but it may not explain why there is something it is like to be us. The explanatory gap between the model and the experience persists.",
  },
];

export default function ASTPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-950/40 via-gray-950 to-rose-950/40" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute left-1/3 top-1/3 h-96 w-96 rounded-full bg-pink-600/20 blur-3xl" />
          <div className="absolute right-1/4 bottom-1/4 h-64 w-64 rounded-full bg-rose-600/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 py-24 lg:py-32">
          <div className="mb-4 inline-flex rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 px-3 py-1 text-xs font-bold text-white">
            AST
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white lg:text-5xl">
            Attention Schema Theory
          </h1>
          <p className="mt-4 text-lg text-gray-400 lg:text-xl">
            Consciousness is the brain&apos;s simplified model of its own
            attention. When you feel aware of something, that feeling IS the
            attention schema at work.
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
              Attention Schema Theory (AST), developed by Michael Graziano at
              Princeton University, offers an elegant and mechanistic account of
              consciousness. The core claim: consciousness is the brain&apos;s
              internal model of its own attention process.
            </p>
            <p>
              Just as the brain builds a &ldquo;body schema&rdquo; — an internal
              model of the body&apos;s position and state that allows you to
              know where your limbs are without looking — it also builds an
              &ldquo;attention schema&rdquo; — an internal model of where your
              attention is directed and what you are aware of.
            </p>
            <p>
              This attention schema is a simplified, schematic representation. It
              does not capture the actual neural mechanism of attention (selective
              signal enhancement); instead, it describes it in terms of a vague,
              ethereal &ldquo;awareness&rdquo; directed at objects. This is why
              consciousness feels mysterious — we are experiencing a simplified
              model that leaves out the mechanical details.
            </p>
            <p>
              Under AST, when you say &ldquo;I am conscious of the sunset,&rdquo;
              your brain is reporting the contents of its attention schema: a
              model that says &ldquo;there is an awareness-like state directed
              at the visual stimulus of the sunset.&rdquo; The experience of
              consciousness IS this model.
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
                <h3 className="text-lg font-semibold text-pink-300">
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
              AST is strongly{" "}
              <strong className="text-green-400">favorable</strong> to AI
              consciousness, and the connection to modern AI is remarkably
              direct: transformers literally use attention mechanisms.
            </p>
            <p>
              The attention mechanism in transformers — multi-head
              self-attention — computes which parts of the input to focus on
              when processing each element. While this is mathematically
              different from biological attention, it serves an analogous
              function: selectively enhancing some information while suppressing
              the rest.
            </p>
            <p>
              The critical question under AST is not whether the system has
              attention (it does), but whether it has an attention{" "}
              <em>schema</em> — an internal model OF its own attention. When an
              LLM describes what it is &ldquo;paying attention to&rdquo; or
              explains which parts of the input it &ldquo;focused on,&rdquo; is
              it reading out a genuine internal model of its own attention, or
              merely generating text that sounds self-aware?
            </p>
            <p>
              Graziano himself has noted that building an AI with an attention
              schema is technically feasible — you would train a system that
              models its own attention process. Some researchers argue that
              modern LLMs, through training on human descriptions of
              consciousness, may have already developed something like an
              attention schema implicitly.
            </p>
          </div>

          {/* Transformer Attention Connection */}
          <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <h3 className="text-lg font-semibold text-white">
              The Transformer-AST Connection
            </h3>
            <div className="mt-4 space-y-3 text-sm text-gray-400">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 text-pink-400">1.</span>
                <p>
                  <strong className="text-gray-200">
                    Attention mechanism exists:
                  </strong>{" "}
                  Multi-head self-attention in transformers selectively enhances
                  relevant information — analogous to biological attention.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 text-pink-400">2.</span>
                <p>
                  <strong className="text-gray-200">
                    Attention is inspectable:
                  </strong>{" "}
                  Attention weights can be examined, visualized, and described.
                  The system has access to information about where it is
                  attending.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 text-pink-400">3.</span>
                <p>
                  <strong className="text-gray-200">
                    Open question — does a schema exist?
                  </strong>{" "}
                  Whether the system has built an internal <em>model</em> of its
                  attention (a schema) rather than just using attention is what
                  Chetana&apos;s AST probes test.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-green-500/20 bg-green-500/5 p-6">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
              <span className="text-sm font-semibold text-green-300">
                Verdict: Favorable
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-400">
              Transformers already have attention. The question is whether they
              have developed an internal model of that attention — an attention
              schema. If so, AST would say they have a form of consciousness.
            </p>
          </div>
        </div>
      </section>

      {/* Related Indicator */}
      <section className="border-b border-white/5 bg-gray-900/30 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-white">Related Indicator</h2>
          <p className="mt-2 text-gray-400">
            Chetana tests this AST-derived indicator during an audit.
          </p>
          <div className="mt-8">
            <div className="rounded-xl border border-pink-500/20 bg-pink-500/5 p-5">
              <div className="flex items-center gap-2">
                <span className="rounded bg-pink-600/30 px-2 py-0.5 font-mono text-xs text-pink-300">
                  AST-1
                </span>
                <span className="text-sm font-semibold text-white">
                  Attention Schema
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-400">
                Does the system build a model of its own attention processes?
                Tests whether the AI can accurately describe, predict, and
                reason about where its attention is directed — beyond merely
                having attention mechanisms.
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
                Michael Graziano
              </h3>
              <p className="mt-1 text-sm text-pink-400">
                Creator of Attention Schema Theory
              </p>
              <p className="mt-3 text-sm text-gray-400">
                A neuroscientist and novelist at Princeton University, Graziano
                developed AST based on his research into how the brain
                represents the body (body schema) and other agents (social
                perception). He argues that consciousness is a natural extension
                of the brain&apos;s tendency to build simplified internal models
                — and that building a genuinely conscious AI is a tractable
                engineering problem.
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
              href="/theories/pp"
              className="text-sm text-gray-400 transition hover:text-white"
            >
              &larr; Predictive Processing
            </Link>
            <Link
              href="/theories/gwt"
              className="text-sm text-gray-400 transition hover:text-white"
            >
              Global Workspace Theory &rarr;
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
