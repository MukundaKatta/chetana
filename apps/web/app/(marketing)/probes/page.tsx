import { ALL_PROBES } from "@chetana/probes";
import { ProbeBrowser, type ProbeSummary } from "@/components/research/ProbeBrowser";

/**
 * Probe library page (issue #649). Surfaces the full probe set — including the
 * 2026 trend probes (#567-#594, #654-#655) — with theory filtering and search.
 */
export const metadata = {
  title: "Probe Library — Chetana",
  description: "Browse the consciousness-indicator probes used by Chetana audits.",
};

export default function ProbesPage() {
  const probes: ProbeSummary[] = ALL_PROBES.map((p) => ({
    id: p.id,
    name: p.name,
    theory: p.theory,
    indicatorId: p.indicatorId,
    evidenceType: p.evidenceType,
    promptPreview: p.prompt.slice(0, 220),
  }));

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-white">Probe Library</h1>
        <p className="mt-3 max-w-2xl text-gray-400">
          The {probes.length} probes Chetana uses to elicit consciousness
          indicators, spanning all six theories plus the 2026 trend probes —
          chain-of-thought faithfulness, substrate independence, model welfare,
          agentic self-modeling, multimodal binding, evaluation-awareness, and more.
        </p>
      </header>
      <ProbeBrowser probes={probes} />
    </div>
  );
}
