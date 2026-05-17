import Link from "next/link";

const TIERS = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    period: "",
    description: "Get started exploring AI consciousness.",
    cta: "Get Started",
    ctaHref: "/try",
    highlighted: false,
    features: [
      "5 audits per month",
      "Demo mode",
      "Basic CSV export",
      "Community forum access",
      "3 theory coverage",
    ],
  },
  {
    key: "researcher",
    name: "Researcher",
    price: "$19",
    period: "/mo",
    description: "For serious consciousness researchers and AI safety teams.",
    cta: "Subscribe",
    ctaHref: "/signup?plan=researcher",
    highlighted: true,
    features: [
      "Unlimited audits",
      "All 6 theories, 14 indicators",
      "PDF & LaTeX export",
      "API access",
      "Raw probe data download",
      "Priority queue",
      "Custom probe sets",
    ],
  },
  {
    key: "team",
    name: "Team",
    price: "$49",
    period: "/mo",
    description: "Collaborate on consciousness research with your team.",
    cta: "Contact Sales",
    ctaHref: "/signup?plan=team",
    highlighted: false,
    features: [
      "Everything in Researcher",
      "Up to 10 team members",
      "Shared audit results",
      "Collaboration annotations",
      "Priority support",
      "Custom integrations",
      "Compliance reports",
      "White-label option",
    ],
  },
];

const FAQ = [
  {
    q: "What counts as one audit?",
    a: "One audit is a complete run of probes against a single model. Each template (Quick, Standard, Comprehensive) counts as one audit regardless of probe count.",
  },
  {
    q: "Can I use my own API keys?",
    a: "Yes! All plans support bringing your own API keys for OpenAI, Anthropic, Google, or local models via Ollama. You pay the model provider directly for inference costs.",
  },
  {
    q: "What is demo mode?",
    a: "Demo mode uses pre-recorded audit results so you can explore the dashboard and reports without connecting an API key or using audit credits.",
  },
  {
    q: "Do you offer academic discounts?",
    a: "Yes. We offer 50% off the Researcher plan for verified academic researchers. Contact us with your .edu email for the discount.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. All paid plans are month-to-month with no long-term commitment. Cancel anytime from your account settings.",
  },
  {
    q: "What export formats are supported?",
    a: "Free plans support CSV export. Researcher and Team plans additionally support PDF reports and LaTeX-formatted output suitable for academic papers.",
  },
];

export default function PricingPage() {
  return (
    <div className="bg-gray-950">
      {/* Header */}
      <section className="pb-16 pt-24">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h1 className="text-4xl font-bold text-white lg:text-5xl">
            Pricing
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-400">
            Start exploring AI consciousness for free. Upgrade when you need
            more power.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {TIERS.map((tier) => (
              <div
                key={tier.key}
                className={`relative rounded-2xl border p-8 ${
                  tier.highlighted
                    ? "border-chetana-500/50 bg-chetana-600/5"
                    : "border-white/10 bg-white/[0.02]"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-chetana-600 px-3 py-0.5 text-xs font-medium text-white">
                    Most Popular
                  </div>
                )}

                <h3 className="text-lg font-semibold text-white">
                  {tier.name}
                </h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-white">
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className="text-gray-400">{tier.period}</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-400">
                  {tier.description}
                </p>

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
                  href={tier.ctaHref}
                  className={`mt-8 block rounded-lg py-2.5 text-center text-sm font-medium transition ${
                    tier.highlighted
                      ? "bg-chetana-600 text-white hover:bg-chetana-500"
                      : "border border-white/10 text-white hover:bg-white/5"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-bold text-white">
            Feature Comparison
          </h2>

          <div className="mt-12 overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.04]">
                  <th className="px-6 py-4 text-left font-semibold text-gray-300">
                    Feature
                  </th>
                  <th className="px-4 py-4 text-center font-semibold text-gray-300">
                    Free
                  </th>
                  <th className="px-4 py-4 text-center font-semibold text-chetana-400">
                    Researcher
                  </th>
                  <th className="px-4 py-4 text-center font-semibold text-gray-300">
                    Team
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Audits per month", free: "5", researcher: "Unlimited", team: "Unlimited" },
                  { feature: "Theory coverage", free: "3 theories", researcher: "All 6", team: "All 6" },
                  { feature: "Indicators", free: "Basic", researcher: "All 14", team: "All 14" },
                  { feature: "Export formats", free: "CSV", researcher: "CSV, PDF, LaTeX", team: "CSV, PDF, LaTeX" },
                  { feature: "API access", free: "-", researcher: "Yes", team: "Yes" },
                  { feature: "Custom probes", free: "-", researcher: "Yes", team: "Yes" },
                  { feature: "Team collaboration", free: "-", researcher: "-", team: "Yes" },
                  { feature: "Shared results", free: "-", researcher: "-", team: "Yes" },
                  { feature: "Priority support", free: "-", researcher: "-", team: "Yes" },
                  { feature: "White-label", free: "-", researcher: "-", team: "Yes" },
                ].map((row) => (
                  <tr
                    key={row.feature}
                    className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-6 py-3 font-medium text-gray-200">
                      {row.feature}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">
                      {row.free}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-300">
                      {row.researcher}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-300">
                      {row.team}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-2xl font-bold text-white">
            Frequently Asked Questions
          </h2>

          <div className="mt-12 space-y-6">
            {FAQ.map((item) => (
              <div
                key={item.q}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-6"
              >
                <h3 className="text-sm font-semibold text-white">
                  {item.q}
                </h3>
                <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
