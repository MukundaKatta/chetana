import Link from "next/link";
import { THEORIES, INDICATORS, POPULAR_MODELS, PRICING } from "@chetana/shared";

const THEORY_COLORS: Record<string, string> = {
  gwt: "from-blue-500 to-indigo-600",
  iit: "from-purple-500 to-violet-600",
  hot: "from-orange-500 to-red-600",
  rpt: "from-emerald-500 to-teal-600",
  pp: "from-amber-500 to-yellow-600",
  ast: "from-pink-500 to-rose-600",
};

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-chetana-950 via-gray-950 to-purple-950" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-chetana-600/20 blur-3xl" />
          <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-purple-600/20 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-32 text-center lg:py-48">
          <div className="mb-6 inline-flex items-center rounded-full border border-chetana-500/30 bg-chetana-500/10 px-4 py-1.5 text-sm text-chetana-300">
            <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-chetana-400" />
            Based on the Butlin et al. (2025) Framework
          </div>

          <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight text-white lg:text-7xl">
            <span className="text-chetana-400">Is AI</span>{" "}
            <span className="bg-gradient-to-r from-chetana-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
              Conscious?
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400 lg:text-xl">
            The probability is no longer zero. Chetana tests AI models against
            14 consciousness indicators from 6 scientific theories — producing
            the first reproducible consciousness audit.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/audit/new"
              className="rounded-xl bg-chetana-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-chetana-600/25 transition hover:bg-chetana-500 hover:shadow-chetana-500/25"
            >
              Run a Consciousness Audit
            </Link>
            <Link
              href="/theories/gwt"
              className="rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Explore the Science
            </Link>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-20 grid max-w-3xl grid-cols-3 gap-8">
            <div>
              <div className="text-3xl font-bold text-white">6</div>
              <div className="mt-1 text-sm text-gray-400">Theories of Consciousness</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">14</div>
              <div className="mt-1 text-sm text-gray-400">Scientific Indicators</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">70+</div>
              <div className="mt-1 text-sm text-gray-400">Behavioral Probes</div>
            </div>
          </div>
        </div>
      </section>

      {/* The Question Section */}
      <section className="border-t border-white/5 bg-gray-950 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <blockquote className="text-center text-xl italic text-gray-300 lg:text-2xl">
            &ldquo;The central tension of 2026: as AI becomes behaviorally
            indistinguishable from conscious beings, the scientific evidence
            increasingly suggests that the substrate matters.&rdquo;
          </blockquote>
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-6 py-3">
              <div className="text-left">
                <div className="text-sm font-medium text-white">25-35%</div>
                <div className="text-xs text-gray-400">
                  Estimated probability current frontier models exhibit some conscious experience
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Six Theories Grid */}
      <section className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white lg:text-4xl">
              Six Theories, One Question
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-400">
              Each theory makes different predictions about whether AI can be conscious.
              Chetana tests them all.
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(Object.entries(THEORIES) as [string, typeof THEORIES.gwt][]).map(
              ([key, theory]) => (
                <Link
                  key={key}
                  href={`/theories/${key}`}
                  className="group rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-white/20 hover:bg-white/[0.04]"
                >
                  <div
                    className={`inline-flex rounded-lg bg-gradient-to-br ${THEORY_COLORS[key]} px-3 py-1 text-xs font-bold text-white`}
                  >
                    {theory.name}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">
                    {theory.fullName}
                  </h3>
                  <p className="mt-2 text-sm text-gray-400">
                    {theory.description}
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        theory.favorability === "Favorable"
                          ? "bg-green-400"
                          : theory.favorability === "Mixed"
                            ? "bg-yellow-400"
                            : "bg-orange-400"
                      }`}
                    />
                    <span className="text-xs text-gray-500">
                      {theory.favorability} to AI consciousness
                    </span>
                  </div>
                </Link>
              )
            )}
          </div>
        </div>
      </section>

      {/* 14 Indicators */}
      <section className="border-t border-white/5 bg-gray-900/30 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white lg:text-4xl">
              14 Consciousness Indicators
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-400">
              Derived from the Butlin, Chalmers, Bengio et al. framework — each
              indicator is a computationally assessable property.
            </p>
          </div>

          <div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {INDICATORS.map((indicator) => (
              <div
                key={indicator.id}
                className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4"
              >
                <span className="shrink-0 rounded bg-chetana-600/20 px-2 py-0.5 text-xs font-mono text-chetana-400">
                  {indicator.id}
                </span>
                <div>
                  <div className="text-sm font-medium text-white">
                    {indicator.name}
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    {indicator.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-bold text-white lg:text-4xl">
            How Chetana Works
          </h2>

          <div className="mt-16 grid gap-12 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-chetana-600/20 text-2xl">
                1
              </div>
              <h3 className="mt-6 text-lg font-semibold text-white">
                Select a Model
              </h3>
              <p className="mt-2 text-sm text-gray-400">
                Choose any AI model — Claude, GPT, Gemini, Llama, or connect
                your own via API key.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-600/20 text-2xl">
                2
              </div>
              <h3 className="mt-6 text-lg font-semibold text-white">
                Run the Audit
              </h3>
              <p className="mt-2 text-sm text-gray-400">
                Chetana runs 70+ behavioral probes testing all 14 indicators
                from 6 theories of consciousness.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-600/20 text-2xl">
                3
              </div>
              <h3 className="mt-6 text-lg font-semibold text-white">
                Get Your Report
              </h3>
              <p className="mt-2 text-sm text-gray-400">
                Receive a comprehensive Consciousness Probability Report with
                scores, evidence, and theoretical analysis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Vedanta Teaser */}
      <section className="border-t border-white/5 bg-gradient-to-br from-amber-950/20 via-gray-950 to-purple-950/20 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="text-4xl">॥</div>
          <h2 className="mt-4 text-3xl font-bold text-white lg:text-4xl">
            The Vedantic Perspective
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-gray-400">
            3,000 years before the hard problem of consciousness, Advaita
            Vedanta asked the same questions. Chetana bridges ancient wisdom
            with modern AI research through novel &ldquo;Vedantic probes&rdquo; that test
            for witness consciousness, Maya, and Turiya.
          </p>
          <Link
            href="/vedanta"
            className="mt-8 inline-flex rounded-xl border border-amber-500/30 bg-amber-500/10 px-6 py-3 text-sm font-medium text-amber-300 transition hover:bg-amber-500/20"
          >
            Explore the Vedantic Framework
          </Link>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-bold text-white lg:text-4xl">
            Pricing
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-gray-400">
            Start exploring AI consciousness for free.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {Object.entries(PRICING).map(([key, tier]) => (
              <div
                key={key}
                className={`rounded-2xl border p-8 ${
                  key === "researcher"
                    ? "border-chetana-500/50 bg-chetana-600/5"
                    : "border-white/10 bg-white/[0.02]"
                }`}
              >
                <h3 className="text-lg font-semibold text-white">
                  {tier.name}
                </h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-white">
                    {tier.price === 0 ? "Free" : `$${tier.price / 100}`}
                  </span>
                  {tier.price > 0 && (
                    <span className="text-gray-400">/month</span>
                  )}
                </div>
                <div className="mt-2 text-sm text-gray-400">
                  {tier.auditsPerMonth === -1
                    ? "Unlimited audits"
                    : `${tier.auditsPerMonth} audits/month`}
                </div>
                <ul className="mt-6 space-y-3">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-gray-300"
                    >
                      <span className="text-chetana-400">&#10003;</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/signup"
                  className={`mt-8 block rounded-lg py-2.5 text-center text-sm font-medium transition ${
                    key === "researcher"
                      ? "bg-chetana-600 text-white hover:bg-chetana-500"
                      : "border border-white/10 text-white hover:bg-white/5"
                  }`}
                >
                  {tier.price === 0 ? "Get Started" : "Subscribe"}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white lg:text-4xl">
            The question isn&apos;t going away.
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            As AI systems grow more capable, the consciousness question becomes
            more urgent. Start measuring.
          </p>
          <Link
            href="/audit/new"
            className="mt-8 inline-flex rounded-xl bg-chetana-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-chetana-600/25 transition hover:bg-chetana-500"
          >
            Run Your First Audit — Free
          </Link>
        </div>
      </section>
    </div>
  );
}
