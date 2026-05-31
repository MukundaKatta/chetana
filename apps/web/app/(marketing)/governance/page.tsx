import {
  classifyEuAiActRisk,
  checkModelCard,
  generateTransparencyReport,
  computeUptime,
  errorBudget,
  meterUsage,
} from "@chetana/scorer";

/**
 * Governance & operations page (issues #743, #747, #748, #752, #756, #759).
 * Exercises the governance/ops cores from @chetana/scorer end-to-end.
 */
export const metadata = {
  title: "Governance & Ops — Chetana",
  description: "Compliance classification, model-card checks, SLAs, error budgets, and usage metering.",
};

export default function GovernancePage() {
  const aiAct = classifyEuAiActRisk({ highRiskDomain: true });
  const card = checkModelCard({ name: "GPT-5.4", provider: "OpenAI", intendedUse: "research" });
  const uptime = computeUptime([{ durationMs: 2_591_000, up: true }, { durationMs: 9_000, up: false }], 0.999);
  const budget = errorBudget(0.99, 100_000, 1_200);
  const usage = meterUsage(
    [{ model: "gpt-5.4", inputTokens: 3_000_000, outputTokens: 1_000_000 }],
    { "gpt-5.4": { input: 2, output: 8 } }
  );
  const report = generateTransparencyReport({
    auditsRun: 1240, modelsEvaluated: 48, methodologyVersion: "v3",
    periodStart: "2026-01-01", periodEnd: "2026-03-31",
  });

  const cards: { title: string; issue: string; value: string }[] = [
    { title: "EU AI Act classification", issue: "#743", value: `${aiAct.tier} — ${aiAct.obligations.length} obligations` },
    { title: "Model-card completeness", issue: "#747", value: `${(card.completeness * 100).toFixed(0)}% (${card.compliant ? "compliant" : "missing " + card.missing.length})` },
    { title: "Uptime / SLA", issue: "#752", value: `${uptime.uptimePercent}% (${uptime.meetsSla ? "meets" : "misses"} SLA)` },
    { title: "Error budget", issue: "#756", value: `burned ${budget.burned} (${budget.breached ? "BREACHED" : "ok"})` },
    { title: "Usage metering", issue: "#759", value: `$${usage.totalCost.toFixed(2)} over ${(usage.totalInputTokens / 1e6).toFixed(0)}M+${(usage.totalOutputTokens / 1e6).toFixed(0)}M tokens` },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-white">Governance &amp; Ops</h1>
        <p className="mt-3 max-w-2xl text-gray-400">
          Compliance and operational controls for running consciousness audits
          responsibly at scale — risk classification, model-card checks, SLAs,
          error budgets, and usage metering.
        </p>
      </header>

      <ul className="space-y-3">
        {cards.map((c) => (
          <li key={c.title} className="flex items-baseline justify-between gap-4 rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <div>
              <h3 className="text-sm font-medium text-gray-100">{c.title}</h3>
              <span className="font-mono text-[10px] text-gray-600">{c.issue}</span>
            </div>
            <code className="text-right text-xs tabular-nums text-chetana-300">{c.value}</code>
          </li>
        ))}
      </ul>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-medium text-gray-200">Transparency report (#748)</h2>
        <pre className="overflow-x-auto rounded-xl border border-white/8 bg-black/30 p-4 text-xs text-gray-300">
          {report}
        </pre>
      </section>
    </div>
  );
}
