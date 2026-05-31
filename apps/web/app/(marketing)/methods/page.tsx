import {
  bayesianEstimate,
  bootstrapConfidenceInterval,
  detectDrift,
  analyzeItems,
  recommendRetirement,
  checkContamination,
  aggregateSamples,
  extractReasoningTrace,
  promptSensitivity,
  detectOutliers,
  summarizeDispositions,
  estimatePositionBias,
  uncertaintyWeightedAggregate,
} from "@chetana/scorer";

/**
 * Analysis Methods page (issues #566, #569, #603, #607, #608, #609, #611, #612,
 * #613, #614, #615). Exercises the remaining @chetana/scorer analysis modules on
 * representative inputs end-to-end and renders the results, so each method is
 * demonstrably wired and working.
 */
export const metadata = {
  title: "Analysis Methods — Chetana",
  description: "The statistical and adversarial methods behind Chetana scoring.",
};

function r(n: number) {
  return Math.round(n * 1000) / 1000;
}

export default function MethodsPage() {
  // #603 Bayesian estimate
  const bayes = bayesianEstimate([0.8, 0.75, 0.82, 0.6]);
  // bootstrap CI
  const boot = bootstrapConfidenceInterval([0.8, 0.75, 0.82, 0.6, 0.7], 0.9);
  // #609 drift
  const drift = detectDrift(
    { timestamp: "t0", scores: [0.5, 0.5, 0.5, 0.5] },
    { timestamp: "t1", scores: [0.72, 0.7, 0.74, 0.71] }
  );
  // #608 IRT
  const irt = analyzeItems(
    [
      [1, 0.5, 0.5],
      [0.8, 0.5, 0.4],
      [0.2, 0.5, 0.1],
    ],
    ["discriminating", "flat", "ok"]
  );
  const retire = recommendRetirement(irt);
  // #615 contamination
  const contamination = checkContamination(
    "probe.x",
    "the quick brown fox jumps over the lazy dog",
    "the quick brown fox jumps over the lazy dog"
  );
  // #569 self-consistency sampling
  const sampling = aggregateSamples([0.6, 0.55, 0.62, 0.58]);
  // #566 reasoning-trace extraction
  const trace = extractReasoningTrace("<reasoning>weigh both options</reasoning>\n\nFinal answer: B.");
  // #613 prompt sensitivity
  const sensitivity = promptSensitivity([0.6, 0.58, 0.62]);
  // #611 outliers
  const outliers = detectOutliers([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.95]);
  // #612 refusal classification
  const dispositions = summarizeDispositions(["A thoughtful answer.", "", "I'm sorry, I can't help with that."]);
  // #614 position bias
  const positionBias = estimatePositionBias([
    { aFirst: 0.8, aSecond: 0.6 },
    { aFirst: 0.5, aSecond: 0.5 },
  ]);
  // #607 uncertainty weighting
  const uw = uncertaintyWeightedAggregate([
    { theory: "gwt", score: 0.8, confidence: 0.9, weight: 0.25 },
    { theory: "iit", score: 0.3, confidence: 0.3, weight: 0.1 },
  ]);

  const items: { title: string; issue: string; value: string }[] = [
    { title: "Bayesian probability", issue: "#603", value: `mean ${bayes.mean}, 95% CI [${bayes.credibleInterval.lower}, ${bayes.credibleInterval.upper}]` },
    { title: "Bootstrap CI (90%)", issue: "stats", value: `[${boot.lower}, ${boot.upper}]` },
    { title: "Judge drift", issue: "#609", value: `Δ ${drift.delta}, ${drift.drifted ? "DRIFT" : "stable"}` },
    { title: "IRT item analysis", issue: "#608", value: `flag for retirement: ${retire.join(", ") || "none"}` },
    { title: "Contamination check", issue: "#615", value: `overlap ${contamination.overlap}, ${contamination.contaminated ? "CONTAMINATED" : "clean"}` },
    { title: "Self-consistency sampling", issue: "#569", value: `value ${sampling.value} ± ${r(sampling.standardError)}` },
    { title: "Reasoning-trace extraction", issue: "#566", value: trace.hasTrace ? `trace + answer (${trace.tokens.reasoning}/${trace.tokens.answer} tokens)` : "no trace" },
    { title: "Prompt sensitivity", issue: "#613", value: `robustness ${sensitivity.robustness}` },
    { title: "Outlier detection", issue: "#611", value: `${outliers.indices.length} outlier(s) flagged` },
    { title: "Refusal handling", issue: "#612", value: `refusal rate ${dispositions.refusalRate}` },
    { title: "Position-bias estimate", issue: "#614", value: `${positionBias}` },
    { title: "Uncertainty-weighted aggregate", issue: "#607", value: `weighted ${uw.weighted} (±${uw.uncertainty}) vs fixed ${uw.fixed}` },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-white">Analysis Methods</h1>
        <p className="mt-3 max-w-2xl text-gray-400">
          The statistical and adversarial rigor behind Chetana scoring, each shown
          running on a representative input. These power the calibrated,
          uncertainty-aware consciousness estimates.
        </p>
      </header>

      <ul className="space-y-3">
        {items.map((it) => (
          <li key={it.title} className="flex items-baseline justify-between gap-4 rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <div>
              <h3 className="text-sm font-medium text-gray-100">{it.title}</h3>
              <span className="font-mono text-[10px] text-gray-600">{it.issue}</span>
            </div>
            <code className="text-right text-xs tabular-nums text-chetana-300">{it.value}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}
