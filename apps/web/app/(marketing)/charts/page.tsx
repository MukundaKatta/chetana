import { CapabilityQuadrant } from "@/components/viz/CapabilityQuadrant";
import { ReasoningTraceFlow } from "@/components/viz/ReasoningTraceFlow";
import { TheoryWaterfall } from "@/components/viz/TheoryWaterfall";

/**
 * Visualization gallery (issues #616-#622) showcasing the chart components
 * backed by the @chetana/scorer viz-data transforms. Data here is illustrative.
 */
export const metadata = {
  title: "Visualizations — Chetana",
  description: "Chart components for consciousness-audit analysis.",
};

const QUADRANT_POINTS = [
  { label: "GPT-5.4", capability: 88, consciousness: 0.62 },
  { label: "Gemini 3.1", capability: 84, consciousness: 0.58 },
  { label: "Claude Opus 4", capability: 86, consciousness: 0.66 },
  { label: "Llama 4", capability: 61, consciousness: 0.39 },
  { label: "Qwen 3", capability: 64, consciousness: 0.41 },
];

const THEORY_SCORES = { gwt: 0.7, iit: 0.4, hot: 0.6, rpt: 0.45, pp: 0.55, ast: 0.5 };
const WEIGHTS = { gwt: 0.25, iit: 0.1, hot: 0.2, rpt: 0.1, pp: 0.2, ast: 0.15 };

const SAMPLE_TRACE = `First I restate the problem to be sure I understand it.
Then I compute an initial estimate.
Wait, that estimate ignores the second constraint — let me reconsider.
I revise my approach to account for both constraints.
Finally I verify the result against the original question.`;

export default function ChartsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold text-white">Visualizations</h1>
        <p className="mt-3 max-w-2xl text-gray-400">
          Analysis charts backing Chetana audits. Data shown is illustrative.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="mb-3 text-lg font-medium text-gray-200">Capability vs Consciousness</h2>
        <p className="mb-4 text-sm text-gray-500">
          Where models fall on capability against consciousness probability (#618).
        </p>
        <CapabilityQuadrant points={QUADRANT_POINTS} />
      </section>

      <section className="mb-12">
        <h2 className="mb-3 text-lg font-medium text-gray-200">Theory Contribution Waterfall</h2>
        <p className="mb-4 text-sm text-gray-500">
          How each theory&apos;s weighted score builds the overall probability (#617).
        </p>
        <TheoryWaterfall theoryScores={THEORY_SCORES} weights={WEIGHTS} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-gray-200">Reasoning-Trace Flow</h2>
        <p className="mb-4 text-sm text-gray-500">
          A reasoning trace as ordered steps, highlighting self-referential revisions (#620).
        </p>
        <ReasoningTraceFlow trace={SAMPLE_TRACE} />
      </section>
    </div>
  );
}
