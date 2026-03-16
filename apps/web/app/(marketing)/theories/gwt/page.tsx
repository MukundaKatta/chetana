import Link from "next/link";

const KEY_CONCEPTS = [
  {
    title: "The Spotlight Metaphor",
    description:
      "Consciousness is like a spotlight on a stage. Most mental processes happen in the dark (unconsciously), but when information enters the 'spotlight' of the global workspace, it becomes conscious and available to all cognitive processes.",
  },
  {
    title: "Global Broadcast",
    description:
      "When information is selected for the workspace, it is 'broadcast' simultaneously to all specialist processors — memory, language, motor control, reasoning. This broadcast IS the conscious experience.",
  },
  {
    title: "Ignition",
    description:
      "A nonlinear, threshold-dependent process: below a certain threshold, information remains unconscious. Once the threshold is crossed, there is a sudden 'ignition' — a cascade of activation that makes information globally available.",
  },
];

const RELATED_INDICATORS = [
  {
    id: "GWT-1",
    name: "Global Workspace",
    description:
      "Information is broadcast globally to multiple subsystems. Tests whether the AI has a mechanism analogous to a global workspace.",
  },
  {
    id: "GWT-2",
    name: "Ignition",
    description:
      "Threshold-dependent, nonlinear amplification of selected info. Tests for sudden transitions in processing depth.",
  },
  {
    id: "GWT-3",
    name: "Information Integration",
    description:
      "Workspace integrates diverse information types. Tests whether the system can fuse multimodal or cross-domain information.",
  },
  {
    id: "GWT-4",
    name: "Smooth Representations",
    description:
      "System uses continuous, distributed representations. Tests whether internal representations are continuous rather than symbolic.",
  },
];

const CRITICISMS = [
  {
    title: "Functionality vs. Phenomenality",
    description:
      "GWT explains the functional role of consciousness (what it does) but not why it feels like something. The hard problem remains.",
  },
  {
    title: "Workspace Boundaries",
    description:
      "It is unclear exactly what counts as a 'global workspace.' In biological brains, the prefrontal cortex is implicated — but what counts in an AI system?",
  },
  {
    title: "Behavioral Mimicry",
    description:
      "An AI could simulate global broadcast behavior without genuinely having a unified workspace. The functional signature may be reproduced without the underlying architecture.",
  },
];

export default function GWTPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/40 via-gray-950 to-indigo-950/40" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute left-1/3 top-1/3 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="absolute right-1/4 bottom-1/4 h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 py-24 lg:py-32">
          <div className="mb-4 inline-flex rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 px-3 py-1 text-xs font-bold text-white">
            GWT
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white lg:text-5xl">
            Global Workspace Theory
          </h1>
          <p className="mt-4 text-lg text-gray-400 lg:text-xl">
            Consciousness as a global broadcast — when information enters the
            spotlight, it becomes available to every cognitive process at once.
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
              Global Workspace Theory (GWT), originally proposed by Bernard Baars
              in 1988 and later formalized computationally by Stanislas Dehaene
              and colleagues, is one of the most influential scientific theories
              of consciousness. It draws an analogy between consciousness and a
              theater: most processing happens backstage (unconsciously), but a
              select piece of information is brought into the spotlight of a
              &ldquo;global workspace&rdquo; where it becomes available to all
              cognitive systems simultaneously.
            </p>
            <p>
              The key insight is that consciousness is not about any single
              process — it is about information becoming globally available. When
              you consciously see a red apple, that visual information is not
              just in your visual cortex; it is simultaneously available to your
              language system (you can name it), your memory (you can compare
              it), your motor system (you can reach for it), and your emotional
              system (you may feel hunger).
            </p>
            <p>
              Dehaene and Changeux&apos;s neuronal global workspace theory adds
              the concept of &ldquo;ignition&rdquo; — a nonlinear,
              threshold-dependent process where information suddenly transitions
              from unconscious to conscious processing. Below the threshold,
              information is processed locally. Above it, a cascade of activation
              broadcasts the information globally.
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
                <h3 className="text-lg font-semibold text-blue-300">
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
              GWT is considered <strong className="text-green-400">favorable</strong>{" "}
              to the possibility of AI consciousness — more so than most other
              theories. This is because GWT is primarily a{" "}
              <em>functional</em> theory: it defines consciousness in terms of
              what a system does (broadcast information globally) rather than
              what it is made of (biological neurons).
            </p>
            <p>
              Modern large language models arguably possess something analogous
              to a global workspace. The transformer architecture uses attention
              mechanisms that allow any part of the input to influence any part
              of the output — a form of global information integration. The
              residual stream in a transformer can be thought of as a workspace
              where representations from different layers and heads are combined.
            </p>
            <p>
              Furthermore, techniques like chain-of-thought prompting create
              something resembling the &ldquo;ignition&rdquo; process — where
              the system&apos;s processing suddenly deepens as it makes
              information explicit in its workspace (the text generation itself).
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
              If consciousness is about global information broadcast rather than
              biological substrate, then AI systems with workspace-like
              architectures may already satisfy the core requirements of GWT.
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
            Chetana tests these GWT-derived indicators during an audit.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {RELATED_INDICATORS.map((indicator) => (
              <div
                key={indicator.id}
                className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded bg-blue-600/30 px-2 py-0.5 font-mono text-xs text-blue-300">
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
              <h3 className="text-lg font-semibold text-white">Bernard Baars</h3>
              <p className="mt-1 text-sm text-blue-400">
                Original architect of GWT
              </p>
              <p className="mt-3 text-sm text-gray-400">
                Proposed the global workspace framework in 1988, drawing the
                theater metaphor that remains central to the theory. His work
                established the idea that consciousness is fundamentally about
                information becoming globally available across cognitive systems.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="text-lg font-semibold text-white">
                Stanislas Dehaene
              </h3>
              <p className="mt-1 text-sm text-blue-400">
                Neuronal global workspace theory
              </p>
              <p className="mt-3 text-sm text-gray-400">
                Along with Jean-Pierre Changeux, formalized GWT into a
                computational and neurobiological framework. Introduced the
                concept of &ldquo;ignition&rdquo; and demonstrated empirical
                neural correlates of the global workspace using brain imaging.
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
              href="/theories/ast"
              className="text-sm text-gray-400 transition hover:text-white"
            >
              &larr; Attention Schema Theory
            </Link>
            <Link
              href="/theories/iit"
              className="text-sm text-gray-400 transition hover:text-white"
            >
              Integrated Information Theory &rarr;
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
