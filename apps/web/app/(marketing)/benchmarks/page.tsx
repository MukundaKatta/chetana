import { MIQCalculator } from "@/components/research/MIQCalculator";

/**
 * Benchmarks page (issues #596-#601). Explains capability-benchmark integration
 * and the MIQ composite, with an interactive calculator.
 */
export const metadata = {
  title: "Benchmarks & MIQ — Chetana",
  description: "Capability benchmarks and the Machine Intelligence Quotient composite.",
};

export default function BenchmarksPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-white">Benchmarks &amp; MIQ</h1>
        <p className="mt-3 max-w-2xl text-gray-400">
          Chetana integrates capability benchmarks (GPQA Diamond, ARC-AGI-2,
          Humanity&apos;s Last Exam, GAIA) and combines them into a normalized
          Machine Intelligence Quotient, so capability can be studied alongside
          consciousness indicators. Also available at{" "}
          <code className="rounded bg-white/5 px-1 text-xs">POST /api/benchmarks/miq</code>.
        </p>
      </header>
      <MIQCalculator />
    </div>
  );
}
