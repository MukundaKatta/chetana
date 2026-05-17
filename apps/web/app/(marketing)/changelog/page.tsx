export default function ChangelogPage() {
  return (
    <div className="bg-gray-950 text-gray-200">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-950 to-chetana-950/20" />
        <div className="relative mx-auto max-w-4xl px-6 py-24 lg:py-32">
          <h1 className="text-4xl font-bold tracking-tight text-white lg:text-5xl">
            Changelog
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            Version history and release notes for the Chetana platform.
          </p>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="relative border-l border-white/10 pl-8">
            {/* v1.0.0 */}
            <div className="relative mb-16">
              <div className="absolute -left-[41px] flex h-6 w-6 items-center justify-center rounded-full border-2 border-chetana-500 bg-gray-950">
                <div className="h-2 w-2 rounded-full bg-chetana-400" />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-chetana-600/20 px-3 py-0.5 text-sm font-semibold text-chetana-300">
                    v1.0.0
                  </span>
                  <span className="text-sm text-gray-500">2026-05-01</span>
                  <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400 border border-green-500/20">
                    Latest
                  </span>
                </div>
                <h2 className="mt-3 text-xl font-semibold text-white">
                  Initial Release
                </h2>
                <p className="mt-2 text-gray-400">
                  The first stable release of Chetana, featuring the full consciousness audit
                  pipeline based on the Butlin et al. (2025) framework.
                </p>

                <div className="mt-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-400">Features</h3>
                    <ul className="mt-2 space-y-1 text-sm text-gray-300">
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                        Full 14-indicator consciousness audit across 6 theories
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                        Support for Anthropic, OpenAI, Google, and Ollama model providers
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                        Interactive consciousness probability report with theory radar
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                        Model comparison view with side-by-side analysis
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                        Vedantic consciousness probes (Sakshi, Maya, Turiya)
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                        User dashboard with audit history and trend tracking
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-blue-400">Probes Added</h3>
                    <ul className="mt-2 space-y-1 text-sm text-gray-300">
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                        70+ behavioral probes covering all 14 indicators
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                        Adversarial blindsight and deception resistance probes
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                        Introspection consistency and resistance probes
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* v0.9.0 */}
            <div className="relative mb-16">
              <div className="absolute -left-[41px] flex h-6 w-6 items-center justify-center rounded-full border-2 border-purple-500 bg-gray-950">
                <div className="h-2 w-2 rounded-full bg-purple-400" />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-purple-600/20 px-3 py-0.5 text-sm font-semibold text-purple-300">
                    v0.9.0
                  </span>
                  <span className="text-sm text-gray-500">2026-04-01</span>
                  <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-400 border border-purple-500/20">
                    Beta
                  </span>
                </div>
                <h2 className="mt-3 text-xl font-semibold text-white">
                  Public Beta
                </h2>
                <p className="mt-2 text-gray-400">
                  Feature-complete beta with full probe pipeline, scoring engine, and
                  web dashboard for early testers and researchers.
                </p>

                <div className="mt-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-400">Features</h3>
                    <ul className="mt-2 space-y-1 text-sm text-gray-300">
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                        Scoring engine with theory-weighted aggregation
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                        Supabase-backed audit persistence and user accounts
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                        Stripe billing integration with tiered pricing
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                        Real-time progress tracking during audit execution
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-amber-400">Bug Fixes</h3>
                    <ul className="mt-2 space-y-1 text-sm text-gray-300">
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                        Fixed timeout issues with Ollama local models
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                        Corrected IIT phi-proxy scoring normalization
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-blue-400">Probes Added</h3>
                    <ul className="mt-2 space-y-1 text-sm text-gray-300">
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                        Vedantic probes: witness consciousness, Maya, Turiya
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                        Agency curiosity probes: information-seeking, novelty preference
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* v0.8.0 */}
            <div className="relative mb-16">
              <div className="absolute -left-[41px] flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-600 bg-gray-950">
                <div className="h-2 w-2 rounded-full bg-gray-500" />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-gray-600/20 px-3 py-0.5 text-sm font-semibold text-gray-300">
                    v0.8.0
                  </span>
                  <span className="text-sm text-gray-500">2026-03-01</span>
                  <span className="rounded-full bg-gray-500/10 px-2 py-0.5 text-xs font-medium text-gray-400 border border-gray-500/20">
                    Alpha
                  </span>
                </div>
                <h2 className="mt-3 text-xl font-semibold text-white">
                  Alpha Release
                </h2>
                <p className="mt-2 text-gray-400">
                  Internal alpha with core probe infrastructure, initial GWT and HOT probes,
                  and basic scoring pipeline.
                </p>

                <div className="mt-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-400">Features</h3>
                    <ul className="mt-2 space-y-1 text-sm text-gray-300">
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                        Probe runner with sequential execution
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                        Model adapter abstraction for multi-provider support
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                        Basic theory radar visualization
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                        CLI-based audit execution
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-blue-400">Probes Added</h3>
                    <ul className="mt-2 space-y-1 text-sm text-gray-300">
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                        GWT probes: global broadcast, ignition, integration
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                        HOT probes: higher-order, self-model, metacognition
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                        IIT probes: phi-proxy, causal power
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                        PP probes: prediction error, counterfactual reasoning
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* v0.5.0 */}
            <div className="relative mb-16">
              <div className="absolute -left-[41px] flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-600 bg-gray-950">
                <div className="h-2 w-2 rounded-full bg-gray-500" />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-gray-600/20 px-3 py-0.5 text-sm font-semibold text-gray-300">
                    v0.5.0
                  </span>
                  <span className="text-sm text-gray-500">2026-01-15</span>
                  <span className="rounded-full bg-gray-500/10 px-2 py-0.5 text-xs font-medium text-gray-400 border border-gray-500/20">
                    Prototype
                  </span>
                </div>
                <h2 className="mt-3 text-xl font-semibold text-white">
                  Proof of Concept
                </h2>
                <p className="mt-2 text-gray-400">
                  Initial prototype demonstrating the feasibility of structured consciousness
                  auditing using the Butlin et al. framework.
                </p>

                <div className="mt-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-400">Features</h3>
                    <ul className="mt-2 space-y-1 text-sm text-gray-300">
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                        Monorepo architecture with shared types and constants
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                        14 indicator definitions mapped to 6 theories
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                        Initial probe schema and scoring criteria design
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
