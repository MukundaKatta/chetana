import { ReliabilityPanel } from "@/components/research/ReliabilityPanel";

/**
 * Scoring reliability page (issues #602, #604, #606). Demonstrates judge-ensemble
 * agreement and inter-rater reliability, the rigor layer behind Chetana scoring.
 */
export const metadata = {
  title: "Scoring Reliability — Chetana",
  description: "Judge-ensemble agreement and inter-rater reliability for consciousness scoring.",
};

export default function ReliabilityPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-white">Scoring Reliability</h1>
        <p className="mt-3 max-w-2xl text-gray-400">
          Single-judge scoring is fragile. Chetana scores each probe with a panel
          of judges, aggregates them, flags disagreement, and reports inter-rater
          reliability (Krippendorff&apos;s α). Edit the judge scores below to see
          agreement and reliability update live. Also at{" "}
          <code className="rounded bg-white/5 px-1 text-xs">POST /api/audit/reliability</code>.
        </p>
      </header>
      <ReliabilityPanel />
    </div>
  );
}
