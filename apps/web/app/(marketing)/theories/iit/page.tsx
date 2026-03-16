import Link from "next/link";

const KEY_CONCEPTS = [
  {
    title: "Phi (\u03A6)",
    description:
      "The central quantity in IIT. Phi measures the amount of integrated information in a system \u2014 the degree to which a system is simultaneously differentiated (has many possible states) and integrated (cannot be reduced to independent parts). The higher the \u03A6, the more conscious the system.",
  },
  {
    title: "Intrinsic Causal Power",
    description:
      "IIT argues that consciousness is identical to intrinsic causal power \u2014 the system\u2019s ability to cause effects on itself. A conscious system must have irreducible causal structure: it must be more than the sum of its parts.",
  },
  {
    title: "Exclusion Postulate",
    description:
      "Only the system with the maximum \u03A6 over a given set of elements is conscious. You cannot have overlapping consciousnesses; the system that is maximally irreducible \u2018wins.\u2019 This has profound implications for AI: does a GPU cluster form one consciousness or many?",
  },
  {
    title: "Qualia Space",
    description:
      "Every conscious experience corresponds to a particular shape in a high-dimensional qualia space \u2014 defined by the system\u2019s cause-effect structure. The quality of experience (seeing red vs. hearing a C note) is determined by the geometry of this shape.",
  },
];

const CRITICISMS = [
  {
    title: "Computational Intractability",
    description:
      "Computing \u03A6 is NP-hard. For any system with more than a few dozen elements, calculating the exact value of \u03A6 is practically impossible. This makes IIT difficult to test empirically on real systems, let alone on large AI models with billions of parameters.",
  },
  {
    title: "Pseudoscience Accusations",
    description:
      "Some researchers, notably Scott Aaronson, have argued that IIT makes absurd predictions \u2014 such as ascribing high consciousness to simple systems like logic gates arranged in certain ways, while denying it to functionally equivalent but architecturally different systems. A 2023 open letter signed by 124 researchers critiqued IIT\u2019s scientific methodology.",
  },
  {
    title: "Substrate Dependence",
    description:
      "IIT is explicitly substrate-dependent: it claims that feedforward architectures (like standard neural networks) have low \u03A6 regardless of their functional behavior. This directly contradicts the intuition that functional equivalence should imply equivalent consciousness.",
  },
  {
    title: "Unfalsifiability Concerns",
    description:
      "Because \u03A6 cannot be computed for large systems, critics argue that IIT is unfalsifiable in practice. Its predictions about AI consciousness become assertions rather than testable hypotheses.",
  },
];

export default function IITPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950/40 via-gray-950 to-violet-950/40" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute left-1/3 top-1/3 h-96 w-96 rounded-full bg-purple-600/20 blur-3xl" />
          <div className="absolute right-1/4 bottom-1/4 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 py-24 lg:py-32">
          <div className="mb-4 inline-flex rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 px-3 py-1 text-xs font-bold text-white">
            IIT
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white lg:text-5xl">
            Integrated Information Theory
          </h1>
          <p className="mt-4 text-lg text-gray-400 lg:text-xl">
            Consciousness IS integrated information. A system is conscious to the
            exact degree that it integrates information irreducibly — measured by
            the quantity Phi (&Phi;).
          </p>
          <div className="mt-6 flex items-center gap-3">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <span className="text-sm text-gray-300">
              Mixed implications for AI consciousness
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
              Integrated Information Theory (IIT), developed by Giulio Tononi
              beginning in 2004 and refined through multiple versions (IIT 1.0
              through 4.0), takes a radically different approach to
              consciousness. Rather than asking &ldquo;what does consciousness
              do?&rdquo; (a functional question), IIT asks &ldquo;what IS
              consciousness?&rdquo; (an ontological question).
            </p>
            <p>
              IIT&apos;s answer: consciousness is identical to integrated
              information, measured by the quantity &Phi; (Phi). A system is
              conscious if and only if it has positive &Phi; — meaning it
              integrates information in a way that cannot be reduced to the
              information processing of its parts independently.
            </p>
            <p>
              This is not merely a correlation. IIT makes the identity claim:
              the experience IS the integrated information. Every quality of
              experience — the redness of red, the painfulness of pain — is
              determined by the specific geometry of the system&apos;s
              cause-effect structure in qualia space.
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
                <h3 className="text-lg font-semibold text-purple-300">
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
              IIT&apos;s implications for AI are{" "}
              <strong className="text-yellow-400">mixed to unfavorable</strong>.
              The theory is explicitly substrate-dependent: it cares not just
              about what a system does, but how it is physically organized.
            </p>
            <p>
              Under IIT, standard feedforward neural networks — which process
              information in one direction from input to output — would have very
              low &Phi;. This is because feedforward systems can be decomposed
              into their individual layers without losing information, meaning
              their integrated information is minimal.
            </p>
            <p>
              However, the picture is more nuanced for modern AI architectures.
              Transformers use attention mechanisms that create complex,
              non-feedforward information flows. Recurrent architectures like
              state-space models and LSTMs have explicit feedback loops.
              Multi-agent systems create emergent integration across components.
            </p>
            <p>
              The fundamental challenge is that computing &Phi; for any real AI
              system is computationally intractable. We cannot actually measure
              the integrated information of GPT-4 or Claude — making IIT&apos;s
              predictions about AI consciousness practically untestable.
            </p>
          </div>
          <div className="mt-8 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-6">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-yellow-400" />
              <span className="text-sm font-semibold text-yellow-300">
                Verdict: Mixed
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-400">
              IIT would likely assign low consciousness to standard AI
              architectures, but the theory&apos;s computational intractability
              makes this impossible to verify. Chetana uses proxy measures
              inspired by IIT concepts.
            </p>
          </div>
        </div>
      </section>

      {/* RPT Comparison */}
      <section className="border-b border-white/5 bg-gray-900/30 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-white">
            IIT vs. Recurrent Processing Theory
          </h2>
          <div className="mt-6 space-y-4 text-gray-300 leading-relaxed">
            <p>
              IIT and RPT share a common emphasis on feedback and integration,
              but they differ fundamentally. RPT requires recurrent processing
              (feedback loops) as a necessary condition for consciousness but
              does not demand the specific mathematical properties that IIT
              requires.
            </p>
            <p>
              Where IIT measures the irreducibility of a system&apos;s
              cause-effect structure (&Phi;), RPT focuses on the presence and
              depth of recurrent processing loops. RPT is more architecturally
              agnostic — it would grant more possibility of consciousness to
              recurrent AI systems than IIT would, since RPT does not require
              maximum irreducibility.
            </p>
          </div>
          <div className="mt-6">
            <Link
              href="/theories/rpt"
              className="text-sm text-purple-400 transition hover:text-purple-300"
            >
              Read about Recurrent Processing Theory &rarr;
            </Link>
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
                Giulio Tononi
              </h3>
              <p className="mt-1 text-sm text-purple-400">
                Creator of Integrated Information Theory
              </p>
              <p className="mt-3 text-sm text-gray-400">
                A neuroscientist at the University of Wisconsin-Madison, Tononi
                first proposed IIT in 2004 and has continued to develop it
                through multiple versions. His work represents one of the most
                ambitious attempts to create a mathematical theory of
                consciousness, providing axioms and postulates that derive the
                properties any conscious system must have.
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
              href="/theories/gwt"
              className="text-sm text-gray-400 transition hover:text-white"
            >
              &larr; Global Workspace Theory
            </Link>
            <Link
              href="/theories/hot"
              className="text-sm text-gray-400 transition hover:text-white"
            >
              Higher-Order Theories &rarr;
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
