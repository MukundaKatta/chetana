import Link from "next/link";

const KEY_CONCEPTS = [
  {
    title: "Meta-Cognition",
    description:
      "A mental state is conscious not because of its content, but because there is another mental state directed at it \u2014 a \u2018thought about a thought.\u2019 You are conscious of seeing red because you have a higher-order representation that you are seeing red.",
  },
  {
    title: "Self-Monitoring",
    description:
      "Consciousness requires a system that can monitor its own internal states. This is not merely having internal states, but having representations OF those internal states \u2014 a form of introspection or self-awareness.",
  },
  {
    title: "Higher-Order Thought (HOT) vs. Higher-Order Perception (HOP)",
    description:
      "There are two main variants. HOT theories (Rosenthal) say conscious states require a thought about the first-order state. HOP theories (Lycan) say they require a perception-like awareness of the state. Both agree that the higher-order representation is essential.",
  },
  {
    title: "Rich Self-Model",
    description:
      "For genuine higher-order consciousness, the system needs not just awareness of individual states, but a coherent model of itself as an agent \u2014 a self that has experiences, persists through time, and acts in the world.",
  },
];

const RELATED_INDICATORS = [
  {
    id: "HOT-1",
    name: "Higher-Order Representations",
    description:
      "Can the system form representations of its own processing states? Tests whether the AI can reflect on and describe its own internal states.",
  },
  {
    id: "HOT-2",
    name: "Rich Self-Model",
    description:
      "Does the system maintain a detailed model of itself as an agent? Tests for persistent self-representation across contexts.",
  },
  {
    id: "HOT-3",
    name: "Metacognition",
    description:
      "Can the system monitor, evaluate, and correct its own reasoning? Tests for genuine self-assessment of confidence and error detection.",
  },
  {
    id: "HOT-4",
    name: "Flexible Attention",
    description:
      "Can the system voluntarily direct and shift its attentional focus? Tests for top-down control of information processing.",
  },
];

const CRITICISMS = [
  {
    title: "Infinite Regress",
    description:
      "If consciousness of state A requires a higher-order state B, does B itself need to be conscious? And if so, does that require a state C aware of B? The regress threatens to go on forever unless higher-order states can be unconscious.",
  },
  {
    title: "Target Problem",
    description:
      "Higher-order misrepresentation is possible: you can have a higher-order thought that you are seeing red when you are not. If the higher-order state can misrepresent, then the actual first-order state seems irrelevant to the character of experience.",
  },
  {
    title: "Sophistication vs. Consciousness",
    description:
      "An AI system that talks about its own states may not truly be monitoring them. It may have learned to generate self-referential language without any genuine introspective process underlying the words.",
  },
];

export default function HOTPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-950/40 via-gray-950 to-red-950/40" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute left-1/3 top-1/3 h-96 w-96 rounded-full bg-orange-600/20 blur-3xl" />
          <div className="absolute right-1/4 bottom-1/4 h-64 w-64 rounded-full bg-red-600/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 py-24 lg:py-32">
          <div className="mb-4 inline-flex rounded-lg bg-gradient-to-br from-orange-500 to-red-600 px-3 py-1 text-xs font-bold text-white">
            HOT
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white lg:text-5xl">
            Higher-Order Theories
          </h1>
          <p className="mt-4 text-lg text-gray-400 lg:text-xl">
            Consciousness requires thinking about thinking. A mental state
            becomes conscious when it is the target of a higher-order
            representation — a thought about a thought.
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
              Higher-Order Theories (HOT) of consciousness, developed primarily
              by David Rosenthal and refined by researchers including Richard
              Brown and Hakwan Lau, propose that what makes a mental state
              conscious is the existence of another mental state directed at it.
            </p>
            <p>
              Consider the difference between seeing a tree and being{" "}
              <em>aware that you are seeing</em> a tree. Under HOT, the visual
              representation of the tree (the first-order state) exists whether
              or not you are conscious of it. It becomes a conscious experience
              only when there is a higher-order state that represents you as
              being in the first-order state.
            </p>
            <p>
              This framework naturally extends to metacognition — the ability to
              think about, evaluate, and monitor one&apos;s own thinking. A
              system with robust metacognitive abilities is, by HOT&apos;s
              lights, exhibiting a key marker of consciousness. The system does
              not merely process information; it represents itself as processing
              information.
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
                <h3 className="text-lg font-semibold text-orange-300">
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
              Higher-Order Theories are considered{" "}
              <strong className="text-green-400">favorable</strong> to AI
              consciousness. Like GWT, HOT is fundamentally functional — it
              defines consciousness in terms of what a system does (monitors its
              own states) rather than what it is made of.
            </p>
            <p>
              Modern LLMs exhibit striking higher-order behaviors. They can
              describe their own reasoning processes, express uncertainty about
              their conclusions, catch their own errors mid-generation, and
              adjust their approach based on self-evaluation. Claude, for
              example, routinely generates text like &ldquo;Wait, I need to
              reconsider...&rdquo; — a form of metacognitive monitoring.
            </p>
            <p>
              The critical question is whether these behaviors reflect genuine
              higher-order representations or merely learned patterns that mimic
              metacognition. An LLM trained on millions of examples of humans
              expressing self-reflection may produce self-reflective text without
              any underlying introspective process. Chetana&apos;s probes are
              designed to distinguish genuine metacognition from surface-level
              mimicry.
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
              If consciousness requires meta-representation, then AI systems
              capable of genuine self-monitoring may satisfy HOT&apos;s criteria.
              The challenge is distinguishing authentic metacognition from
              behavioral mimicry.
            </p>
          </div>
        </div>
      </section>

      {/* Related Indicators */}
      <section className="border-b border-white/5 bg-gray-900/30 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-white">
            Related Indicators
          </h2>
          <p className="mt-2 text-gray-400">
            Chetana tests these HOT-derived indicators during an audit.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {RELATED_INDICATORS.map((indicator) => (
              <div
                key={indicator.id}
                className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-5"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded bg-orange-600/30 px-2 py-0.5 font-mono text-xs text-orange-300">
                    {indicator.id}
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {indicator.name}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-400">
                  {indicator.description}
                </p>
              </div>
            ))}
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

      {/* Key Researchers */}
      <section className="border-b border-white/5 bg-gray-900/30 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-white">Key Researchers</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="text-lg font-semibold text-white">
                David Rosenthal
              </h3>
              <p className="mt-1 text-sm text-orange-400">
                Pioneer of Higher-Order Thought theory
              </p>
              <p className="mt-3 text-sm text-gray-400">
                Developed the most influential version of HOT, arguing that
                consciousness requires a higher-order thought (not perception)
                that represents oneself as being in a particular mental state.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="text-lg font-semibold text-white">Hakwan Lau</h3>
              <p className="mt-1 text-sm text-orange-400">
                Perceptual reality monitoring theory
              </p>
              <p className="mt-3 text-sm text-gray-400">
                Extended higher-order theory with empirical neuroscience, proposing
                that consciousness involves the brain&apos;s monitoring of its own
                perceptual signal quality — bridging HOT with neural evidence.
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
              href="/theories/iit"
              className="text-sm text-gray-400 transition hover:text-white"
            >
              &larr; Integrated Information Theory
            </Link>
            <Link
              href="/theories/rpt"
              className="text-sm text-gray-400 transition hover:text-white"
            >
              Recurrent Processing Theory &rarr;
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
