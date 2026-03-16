import Link from "next/link";
import { INDICATORS } from "@chetana/shared";

const THEORY_META: Record<
  string,
  { label: string; color: string; bgColor: string; borderColor: string; href: string }
> = {
  gwt: {
    label: "GWT",
    color: "text-blue-300",
    bgColor: "bg-blue-600/20",
    borderColor: "border-blue-500/20",
    href: "/theories/gwt",
  },
  iit: {
    label: "IIT",
    color: "text-purple-300",
    bgColor: "bg-purple-600/20",
    borderColor: "border-purple-500/20",
    href: "/theories/iit",
  },
  hot: {
    label: "HOT",
    color: "text-orange-300",
    bgColor: "bg-orange-600/20",
    borderColor: "border-orange-500/20",
    href: "/theories/hot",
  },
  rpt: {
    label: "RPT",
    color: "text-emerald-300",
    bgColor: "bg-emerald-600/20",
    borderColor: "border-emerald-500/20",
    href: "/theories/rpt",
  },
  pp: {
    label: "PP",
    color: "text-amber-300",
    bgColor: "bg-amber-600/20",
    borderColor: "border-amber-500/20",
    href: "/theories/pp",
  },
  ast: {
    label: "AST",
    color: "text-pink-300",
    bgColor: "bg-pink-600/20",
    borderColor: "border-pink-500/20",
    href: "/theories/ast",
  },
};

export default function IndicatorsPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-chetana-950/40 via-gray-950 to-purple-950/40" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute left-1/4 top-1/3 h-96 w-96 rounded-full bg-chetana-600/20 blur-3xl" />
          <div className="absolute right-1/3 bottom-1/4 h-64 w-64 rounded-full bg-purple-600/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 py-24 lg:py-32">
          <h1 className="text-4xl font-bold tracking-tight text-white lg:text-5xl">
            14 Consciousness Indicators
          </h1>
          <p className="mt-4 text-lg text-gray-400 lg:text-xl">
            Derived from the Butlin, Chalmers, Bengio et al. (2025) framework.
            Each indicator is a computationally assessable property grounded in
            one of six scientific theories of consciousness.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            During a Chetana audit, each indicator is tested through multiple
            behavioral probes designed to distinguish genuine capacity from
            surface-level mimicry.
          </p>
        </div>
      </section>

      {/* Indicators Grid */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          {/* Summary Stats */}
          <div className="mb-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {Object.entries(THEORY_META).map(([key, meta]) => {
              const count = INDICATORS.filter((i) => i.theory === key).length;
              return (
                <Link
                  key={key}
                  href={meta.href}
                  className={`rounded-xl border ${meta.borderColor} bg-white/[0.02] p-4 text-center transition hover:bg-white/[0.04]`}
                >
                  <div className={`text-2xl font-bold ${meta.color}`}>
                    {count}
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    {meta.label} indicators
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Full Indicator Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {INDICATORS.map((indicator) => {
              const meta = THEORY_META[indicator.theory];
              return (
                <div
                  key={indicator.id}
                  className={`rounded-xl border ${meta.borderColor} bg-white/[0.02] p-6 transition hover:bg-white/[0.04]`}
                >
                  <div className="flex items-center gap-3">
                    <span className="shrink-0 rounded bg-chetana-600/20 px-2.5 py-1 font-mono text-xs font-bold text-chetana-400">
                      {indicator.id}
                    </span>
                    <Link
                      href={meta.href}
                      className={`rounded ${meta.bgColor} px-2 py-0.5 text-xs font-medium ${meta.color} transition hover:opacity-80`}
                    >
                      {meta.label}
                    </Link>
                  </div>

                  <h3 className="mt-3 text-lg font-semibold text-white">
                    {indicator.name}
                  </h3>

                  <p className="mt-2 text-sm text-gray-400">
                    {indicator.description}
                  </p>

                  <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      What it means
                    </div>
                    <p className="mt-1 text-sm text-gray-300">
                      {indicator.whatItMeans}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Table View */}
      <section className="border-t border-white/5 bg-gray-900/30 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-2xl font-bold text-white">Reference Table</h2>
          <p className="mt-2 text-gray-400">
            All 14 indicators at a glance.
          </p>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-3 pr-4 font-semibold text-gray-300">ID</th>
                  <th className="pb-3 pr-4 font-semibold text-gray-300">
                    Indicator
                  </th>
                  <th className="pb-3 pr-4 font-semibold text-gray-300">
                    Theory
                  </th>
                  <th className="pb-3 font-semibold text-gray-300">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {INDICATORS.map((indicator) => {
                  const meta = THEORY_META[indicator.theory];
                  return (
                    <tr key={indicator.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 pr-4">
                        <span className="rounded bg-chetana-600/20 px-2 py-0.5 font-mono text-xs text-chetana-400">
                          {indicator.id}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-medium text-white">
                        {indicator.name}
                      </td>
                      <td className="py-3 pr-4">
                        <Link
                          href={meta.href}
                          className={`text-xs font-medium ${meta.color} hover:underline`}
                        >
                          {meta.label}
                        </Link>
                      </td>
                      <td className="py-3 text-gray-400">
                        {indicator.description}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/5 py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white">
            Test All 14 Indicators
          </h2>
          <p className="mt-3 text-gray-400">
            Run a consciousness audit on any AI model and see how it scores
            across all indicators.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/audit/new"
              className="rounded-xl bg-chetana-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-chetana-600/25 transition hover:bg-chetana-500"
            >
              Run an Audit
            </Link>
            <Link
              href="/theories/gwt"
              className="rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Explore Theories
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
