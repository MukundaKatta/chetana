import {
  forecast,
  metaAnalyze,
  requiredSampleSize,
  powerAt,
  assessValidity,
  intraclassCorrelation,
  analyzeMultiverse,
  evaluateMetric,
} from "@chetana/scorer";

/**
 * Analytics page (issues #732, #733, #735, #736, #738, #739, #740). Exercises
 * the analytics modules from @chetana/scorer on representative inputs and renders
 * the results, demonstrating each is wired end-to-end.
 */
export const metadata = {
  title: "Analytics — Chetana",
  description: "Forecasting, meta-analysis, power, validity, reliability, and multiverse analysis.",
};

export default function AnalyticsPage() {
  const fc = forecast([0.32, 0.38, 0.41, 0.47, 0.5], 3);
  const meta = metaAnalyze([
    { estimate: 0.48, standardError: 0.06 },
    { estimate: 0.53, standardError: 0.05 },
    { estimate: 0.5, standardError: 0.07 },
  ]);
  const ss = requiredSampleSize(0.5, 0.8);
  const pwr = powerAt(60, 0.5);
  const validity = assessValidity({
    indicatorScores: { a1: [0.1, 0.5, 0.9], a2: [0.12, 0.52, 0.88], b1: [0.9, 0.5, 0.1] },
    theoryOf: { a1: "A", a2: "A", b1: "B" },
  });
  const icc = intraclassCorrelation([[0.8, 0.82], [0.3, 0.31], [0.5, 0.48], [0.9, 0.91]]);
  const multi = analyzeMultiverse([
    { choices: [{ dimension: "weights", label: "equal" }], outcome: 0.5 },
    { choices: [{ dimension: "weights", label: "theory" }], outcome: 0.72 },
    { choices: [{ dimension: "judge", label: "single" }], outcome: 0.55 },
  ]);
  const custom = evaluateMetric("(gwt * 0.6) + (hot * 0.4)", { gwt: 0.7, hot: 0.5 });

  const cards: { title: string; issue: string; value: string }[] = [
    { title: "Trend forecast (next point)", issue: "#732", value: `${fc.forecast[0].value} [${fc.forecast[0].lower}, ${fc.forecast[0].upper}]` },
    { title: "Custom metric", issue: "#733", value: `${custom}` },
    { title: "Meta-analysis (pooled)", issue: "#735", value: `${meta.pooledEstimate} ± ${meta.pooledStandardError}, I² ${meta.iSquared}` },
    { title: "Required sample size (d=0.5, 80%)", issue: "#736", value: `${ss.perGroup}/group · power@60 ${pwr}` },
    { title: "Construct validity", issue: "#738", value: `convergent ${validity.convergent} vs discriminant ${validity.discriminant} (${validity.validityHolds ? "holds" : "fails"})` },
    { title: "Test-retest ICC", issue: "#739", value: `${icc}` },
    { title: "Multiverse", issue: "#740", value: `median ${multi.median}, range ${multi.range}, driver: ${multi.mostInfluentialDimension}` },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-white">Analytics</h1>
        <p className="mt-3 max-w-2xl text-gray-400">
          Higher-order analyses over audit corpora — forecasting, meta-analysis,
          power, construct validity, reliability, and multiverse robustness — each
          shown running on a representative input.
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
    </div>
  );
}
