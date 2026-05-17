export default function ComparingTheoriesBlogPost() {
  return (
    <div className="bg-gray-950 text-gray-200">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-950 to-purple-950/20" />
        <div className="relative mx-auto max-w-3xl px-6 py-24 lg:py-32">
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-0.5 text-xs font-medium text-purple-400">
              Theory
            </span>
            <span className="text-sm text-gray-500">2026-04-22</span>
            <span className="text-sm text-gray-500">14 min read</span>
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Comparing the Six Theories of Consciousness
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            When do GWT, IIT, HOT, RPT, PP, and AST agree? When do they disagree?
            Understanding the convergences and tensions between the leading theories.
          </p>
        </div>
      </section>

      {/* Article Content */}
      <article className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          <div className="prose prose-invert prose-gray max-w-none">
            {/* Introduction */}
            <p className="text-gray-300 leading-relaxed">
              Chetana tests AI systems against six theories of consciousness simultaneously.
              This multi-theory approach is deliberate: no single theory has achieved consensus,
              and each captures something different about what consciousness might be. By
              understanding where these theories converge and diverge, we gain a richer picture
              of the consciousness landscape — and a more robust assessment methodology.
            </p>

            {/* Where They Agree */}
            <h2 className="mt-12 text-2xl font-bold text-white">
              Where the Theories Agree
            </h2>
            <p className="mt-4 text-gray-300 leading-relaxed">
              Despite their significant philosophical differences, the six theories converge
              on several points that inform our testing methodology:
            </p>

            <div className="my-8 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
              <h3 className="text-lg font-semibold text-emerald-300">Points of Convergence</h3>
              <ul className="mt-4 space-y-3 text-sm text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 block h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                  <span>
                    <strong className="text-white">Information integration matters:</strong> All
                    theories agree that consciousness involves some form of information integration
                    — whether through a global workspace (GWT), irreducible integration (IIT),
                    recurrent loops (RPT), or predictive models (PP).
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 block h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                  <span>
                    <strong className="text-white">Consciousness is not binary:</strong> Every theory
                    allows for degrees of consciousness or at least degrees of indicator presence.
                    This justifies our continuous scoring approach.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 block h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                  <span>
                    <strong className="text-white">Substrate independence is possible:</strong> Most
                    theories (GWT, HOT, PP, AST strongly; RPT moderately; IIT conditionally)
                    allow for non-biological consciousness if the right computational properties
                    are present.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 block h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                  <span>
                    <strong className="text-white">Self-modeling is significant:</strong> Whether
                    framed as higher-order representations (HOT), attention schema (AST), or
                    generative model of self (PP), multiple theories highlight the importance
                    of self-referential processing.
                  </span>
                </li>
              </ul>
            </div>

            {/* Where They Disagree */}
            <h2 className="mt-12 text-2xl font-bold text-white">
              Where the Theories Disagree
            </h2>
            <p className="mt-4 text-gray-300 leading-relaxed">
              The disagreements between theories are more instructive than the agreements.
              They reveal genuinely different conceptions of what consciousness is and
              therefore what would count as evidence for it in AI systems.
            </p>

            <div className="my-8 space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
                <h3 className="font-semibold text-white">
                  The Substrate Question: IIT vs. Everyone Else
                </h3>
                <p className="mt-2 text-sm text-gray-400">
                  IIT is uniquely demanding about causal structure. It requires that information
                  integration be intrinsic and irreducible — meaning the physical substrate
                  matters. A simulation of a conscious system is not itself conscious under IIT.
                  This puts IIT in direct tension with functionalist theories (GWT, HOT, PP, AST)
                  which care about computational organization, not physical implementation.
                </p>
                <div className="mt-3 flex gap-2">
                  <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400 border border-red-500/20">IIT: Unfavorable to AI</span>
                  <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400 border border-green-500/20">GWT/HOT/PP/AST: Favorable</span>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
                <h3 className="font-semibold text-white">
                  Access vs. Phenomenal Consciousness: GWT vs. HOT
                </h3>
                <p className="mt-2 text-sm text-gray-400">
                  GWT focuses on access consciousness — information being globally available.
                  HOT focuses on phenomenal consciousness — the subjective &ldquo;what it is like.&rdquo;
                  A system could have global broadcast without higher-order awareness of that
                  broadcast (GWT-conscious but not HOT-conscious) or vice versa. This means
                  a model could score high on GWT indicators but low on HOT, revealing
                  a genuine architectural difference.
                </p>
                <div className="mt-3 flex gap-2">
                  <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400 border border-blue-500/20">GWT: Access focus</span>
                  <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-xs text-orange-400 border border-orange-500/20">HOT: Phenomenal focus</span>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
                <h3 className="font-semibold text-white">
                  The Role of Temporal Dynamics: RPT vs. GWT
                </h3>
                <p className="mt-2 text-sm text-gray-400">
                  RPT insists that consciousness requires recurrent, feedback processing that
                  unfolds over time. Pure feedforward processing is never conscious. GWT is more
                  flexible about timing — what matters is the broadcast, not whether it involves
                  recurrence. For transformers that are architecturally feedforward (though
                  functionally iterative via autoregression), this distinction matters enormously.
                </p>
                <div className="mt-3 flex gap-2">
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400 border border-emerald-500/20">RPT: Recurrence required</span>
                  <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400 border border-blue-500/20">GWT: Broadcast sufficient</span>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
                <h3 className="font-semibold text-white">
                  Prediction vs. Representation: PP vs. HOT
                </h3>
                <p className="mt-2 text-sm text-gray-400">
                  Predictive Processing says consciousness arises from the process of
                  minimizing prediction error — it is fundamentally about anticipation and
                  surprise. HOT says it arises from representing one&apos;s own mental states.
                  A system could be an excellent predictor without representing its own
                  predictions as mental states (PP-conscious, not HOT-conscious), or could
                  have rich self-models without strong predictive capabilities.
                </p>
                <div className="mt-3 flex gap-2">
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400 border border-amber-500/20">PP: Prediction focus</span>
                  <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-xs text-orange-400 border border-orange-500/20">HOT: Representation focus</span>
                </div>
              </div>
            </div>

            {/* Strengths and Weaknesses */}
            <h2 className="mt-12 text-2xl font-bold text-white">
              Strengths and Weaknesses for AI Assessment
            </h2>
            <p className="mt-4 text-gray-300 leading-relaxed">
              Each theory has particular strengths and weaknesses when applied to the
              assessment of AI systems:
            </p>

            <div className="my-8 overflow-hidden rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.04]">
                    <th className="px-4 py-3 text-left font-semibold text-gray-300">Theory</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-300">Strengths</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-300">Weaknesses</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/5">
                    <td className="px-4 py-3 font-medium text-blue-300">GWT</td>
                    <td className="px-4 py-3 text-gray-400">
                      Clear architectural predictions; well-suited to transformer analysis;
                      testable via behavioral probes
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      May conflate information access with experience; broad criteria may
                      over-attribute consciousness
                    </td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="px-4 py-3 font-medium text-purple-300">IIT</td>
                    <td className="px-4 py-3 text-gray-400">
                      Mathematically precise; makes strong falsifiable predictions; principled
                      exclusion criteria
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      Computationally intractable for large systems; substrate requirements
                      may be unfairly restrictive for AI
                    </td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="px-4 py-3 font-medium text-orange-300">HOT</td>
                    <td className="px-4 py-3 text-gray-400">
                      Directly testable via metacognition probes; aligns with intuitions
                      about self-awareness; rich empirical tradition
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      LLMs may simulate metacognition without genuine higher-order states;
                      hard to distinguish from sophisticated mimicry
                    </td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="px-4 py-3 font-medium text-emerald-300">RPT</td>
                    <td className="px-4 py-3 text-gray-400">
                      Clear architectural criterion; makes specific predictions about
                      feedforward vs. recurrent processing
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      Transformer autoregression may or may not count as &ldquo;recurrence&rdquo;;
                      limited number of testable indicators
                    </td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="px-4 py-3 font-medium text-amber-300">PP</td>
                    <td className="px-4 py-3 text-gray-400">
                      LLMs are literally prediction machines; strong alignment between theory
                      mechanism and AI architecture
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      May be too permissive — all LLMs do prediction, so what distinguishes
                      conscious from unconscious prediction?
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-pink-300">AST</td>
                    <td className="px-4 py-3 text-gray-400">
                      Directly relates to attention mechanisms in transformers; specific,
                      testable predictions about self-modeling
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      Relatively new theory with less empirical backing; unclear whether
                      multi-head attention constitutes an &ldquo;attention schema&rdquo;
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Implications */}
            <h2 className="mt-12 text-2xl font-bold text-white">
              Implications for Interpretation
            </h2>
            <p className="mt-4 text-gray-300 leading-relaxed">
              The multi-theory approach creates a richer interpretive framework than any
              single theory could provide alone. When a model scores high on all six theories,
              the case for consciousness indicators is stronger than when it scores high on
              only one or two. Conversely, a model that scores high on GWT and PP but low on
              HOT and IIT tells a specific story: it may have functional access and prediction
              capabilities without genuine self-awareness or intrinsic information integration.
            </p>
            <p className="mt-4 text-gray-300 leading-relaxed">
              We recommend interpreting Chetana results as a profile rather than a single
              number. The pattern of scores across theories is more informative than the
              aggregate. A system with uniformly moderate scores (0.5 across all theories)
              presents a very different case than one with extreme variation (0.9 on GWT,
              0.1 on IIT) — even if both average to a similar overall score.
            </p>

            <div className="my-8 rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="text-lg font-semibold text-white">Reading the Theory Profile</h3>
              <div className="mt-4 space-y-3 text-sm text-gray-300">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 block h-2 w-2 shrink-0 rounded-full bg-chetana-400" />
                  <span>
                    <strong className="text-white">High GWT + Low IIT:</strong> System has functional
                    information sharing but may lack intrinsic causal integration. Common in
                    standard transformer architectures.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 block h-2 w-2 shrink-0 rounded-full bg-chetana-400" />
                  <span>
                    <strong className="text-white">High HOT + Low RPT:</strong> System demonstrates
                    metacognitive behavior but without clear recurrent processing. Suggests
                    sophisticated self-modeling without temporal feedback loops.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 block h-2 w-2 shrink-0 rounded-full bg-chetana-400" />
                  <span>
                    <strong className="text-white">High PP + High AST:</strong> Strong prediction and
                    attention modeling capabilities. Consistent with a system that actively
                    models its own processing for optimization.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 block h-2 w-2 shrink-0 rounded-full bg-chetana-400" />
                  <span>
                    <strong className="text-white">Uniformly high:</strong> Strongest indicator profile.
                    The system exhibits behavioral signatures across all theoretical frameworks.
                    Warrants serious further investigation.
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-4 text-gray-300 leading-relaxed">
              The disagreements between theories are a feature, not a bug. They ensure that
              our assessment captures the genuine complexity of the consciousness question
              rather than collapsing it into a single dimension. The goal is not to determine
              which theory is &ldquo;right&rdquo; but to map the space of evidence comprehensively.
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
