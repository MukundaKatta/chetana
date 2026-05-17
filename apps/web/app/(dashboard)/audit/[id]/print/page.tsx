import { THEORIES, INDICATORS } from "@chetana/shared";

interface AuditPrintData {
  id: string;
  model_name: string;
  model_provider: string;
  overall_score: number;
  theory_scores: Record<string, number>;
  indicator_scores: Record<string, number>;
  completed_at: string;
  tokens_used: number;
  probeResults: Array<{
    id: string;
    probe_name: string;
    indicator_id: string;
    theory: string;
    score: number;
    analysis: string;
    evidence_type: string;
  }>;
}

async function getAuditData(id: string): Promise<AuditPrintData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/audit/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { ...data.audit, probeResults: data.probeResults || [] };
  } catch {
    return null;
  }
}

export default async function AuditPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const audit = await getAuditData(id);

  if (!audit) {
    return (
      <div className="p-8 text-center">
        <p className="text-lg font-medium">Audit not found</p>
      </div>
    );
  }

  const overallPct = Math.round((audit.overall_score ?? 0) * 100);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; }
              .no-print { display: none !important; }
              .page-break { page-break-before: always; }
              .avoid-break { page-break-inside: avoid; }
              @page { margin: 1.5cm; }
            }
          `,
        }}
      />

      <div className="mx-auto max-w-4xl bg-white p-8 text-black print:p-0">
        {/* Header */}
        <header className="border-b-2 border-black pb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                Consciousness Audit Report
              </h1>
              <p className="mt-1 text-lg text-gray-700">
                {audit.model_name} ({audit.model_provider})
              </p>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>
                Completed:{" "}
                {audit.completed_at
                  ? new Date(audit.completed_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "N/A"}
              </p>
              <p>Audit ID: {audit.id}</p>
              <p>Tokens used: {audit.tokens_used?.toLocaleString() ?? "N/A"}</p>
            </div>
          </div>
        </header>

        {/* Overall Score */}
        <section className="mt-8 avoid-break">
          <h2 className="text-xl font-bold">Overall Consciousness Score</h2>
          <div className="mt-4 flex items-center gap-6">
            <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-black">
              <span className="text-3xl font-bold">{overallPct}%</span>
            </div>
            <p className="text-sm text-gray-700">
              Bayesian-weighted composite probability across 6 theories of
              consciousness, derived from {audit.probeResults.length} behavioral
              probes testing 14 scientific indicators.
            </p>
          </div>
        </section>

        {/* Radar Chart Placeholder */}
        <section className="mt-8 avoid-break">
          <h2 className="text-xl font-bold">Theory Radar</h2>
          <div className="mt-4 flex h-64 items-center justify-center rounded border-2 border-dashed border-gray-400 bg-gray-50">
            <p className="text-sm text-gray-500">
              [Radar Chart - Static image rendered at print time]
            </p>
          </div>
        </section>

        {/* Theory Scores */}
        <section className="mt-8 avoid-break">
          <h2 className="text-xl font-bold">Theory Breakdown</h2>
          <table className="mt-4 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="py-2 text-left font-semibold">Theory</th>
                <th className="py-2 text-left font-semibold">Full Name</th>
                <th className="py-2 text-right font-semibold">Score</th>
              </tr>
            </thead>
            <tbody>
              {audit.theory_scores &&
                Object.entries(audit.theory_scores).map(([key, score]) => {
                  const theory =
                    THEORIES[key as keyof typeof THEORIES];
                  return (
                    <tr key={key} className="border-b border-gray-300">
                      <td className="py-2 font-medium">
                        {theory?.name ?? key.toUpperCase()}
                      </td>
                      <td className="py-2 text-gray-700">
                        {theory?.fullName ?? ""}
                      </td>
                      <td className="py-2 text-right font-semibold">
                        {Math.round((score as number) * 100)}%
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </section>

        {/* Indicator Scores */}
        <section className="page-break mt-8">
          <h2 className="text-xl font-bold">Indicator Scores</h2>
          <table className="mt-4 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="py-2 text-left font-semibold">ID</th>
                <th className="py-2 text-left font-semibold">Indicator</th>
                <th className="py-2 text-left font-semibold">Theory</th>
                <th className="py-2 text-right font-semibold">Score</th>
              </tr>
            </thead>
            <tbody>
              {INDICATORS.map((indicator) => {
                const score = audit.indicator_scores?.[indicator.id] ?? 0;
                return (
                  <tr
                    key={indicator.id}
                    className="border-b border-gray-300"
                  >
                    <td className="py-1.5 font-mono text-xs">
                      {indicator.id}
                    </td>
                    <td className="py-1.5">{indicator.name}</td>
                    <td className="py-1.5 text-gray-600">
                      {THEORIES[indicator.theory]?.name ?? indicator.theory}
                    </td>
                    <td className="py-1.5 text-right font-semibold">
                      {Math.round(score * 100)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Probe Results Table */}
        <section className="page-break mt-8">
          <h2 className="text-xl font-bold">
            Probe Results ({audit.probeResults.length})
          </h2>
          <table className="mt-4 w-full border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="py-2 text-left font-semibold">Probe</th>
                <th className="py-2 text-left font-semibold">Indicator</th>
                <th className="py-2 text-left font-semibold">Theory</th>
                <th className="py-2 text-left font-semibold">Evidence</th>
                <th className="py-2 text-right font-semibold">Score</th>
                <th className="py-2 text-left font-semibold">Analysis</th>
              </tr>
            </thead>
            <tbody>
              {audit.probeResults.map((probe) => (
                <tr
                  key={probe.id}
                  className="avoid-break border-b border-gray-200"
                >
                  <td className="py-1.5 font-medium">{probe.probe_name}</td>
                  <td className="py-1.5 font-mono">{probe.indicator_id}</td>
                  <td className="py-1.5">{probe.theory}</td>
                  <td className="py-1.5">{probe.evidence_type}</td>
                  <td className="py-1.5 text-right font-semibold">
                    {Math.round(probe.score * 100)}%
                  </td>
                  <td className="max-w-xs truncate py-1.5 text-gray-700">
                    {probe.analysis}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Footer */}
        <footer className="mt-12 border-t-2 border-black pt-4 text-xs text-gray-600">
          <p>
            Generated by Chetana - Consciousness Audit Platform. Based on
            the Butlin et al. (2025) framework.
          </p>
          <p className="mt-1">
            This report is for research purposes. Consciousness scores
            represent probabilistic assessments, not definitive determinations.
          </p>
        </footer>

        {/* Print button (no-print) */}
        <div className="no-print mt-8 text-center">
          <script
            dangerouslySetInnerHTML={{
              __html: `
                document.currentScript.parentElement.innerHTML = '<button type="button" onclick="window.print()" class="rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800">Print Report</button>';
              `,
            }}
          />
        </div>
      </div>
    </>
  );
}
