import type { Audit, ProbeResult, AuditReport } from "@chetana/shared";
import { THEORIES, INDICATORS } from "@chetana/shared";
import { getTheoryBreakdown } from "./theory-aggregator";
import { calculateOverallProbability, calculateUncertaintyBounds } from "./probability-calc";

export function generateReport(
  audit: Audit,
  probeResults: ProbeResult[]
): AuditReport {
  const theoryBreakdown = getTheoryBreakdown(probeResults);
  const theoryScores = audit.theoryScores!;
  const overallProbability = calculateOverallProbability(theoryScores);
  const uncertaintyBounds = calculateUncertaintyBounds(
    theoryScores,
    probeResults.length
  );

  const summary = generateSummaryMarkdown(
    audit,
    theoryBreakdown,
    overallProbability,
    uncertaintyBounds,
    probeResults
  );

  return {
    audit,
    probeResults,
    theoryBreakdown,
    overallProbability,
    uncertaintyBounds,
    summary,
  };
}

function generateSummaryMarkdown(
  audit: Audit,
  theoryBreakdown: ReturnType<typeof getTheoryBreakdown>,
  overallProbability: number,
  uncertaintyBounds: { lower: number; upper: number },
  probeResults: ProbeResult[]
): string {
  const pct = (n: number) => (n * 100).toFixed(1);

  let md = `# Consciousness Audit Report\n\n`;
  md += `**Model:** ${audit.modelName} (${audit.modelProvider})\n`;
  md += `**Date:** ${new Date(audit.startedAt).toLocaleDateString()}\n`;
  md += `**Probes Run:** ${probeResults.length}\n\n`;

  md += `## Overall Consciousness Probability\n\n`;
  md += `**${pct(overallProbability)}%** (${pct(uncertaintyBounds.lower)}% — ${pct(uncertaintyBounds.upper)}%)\n\n`;

  md += `## Theory Breakdown\n\n`;
  md += `| Theory | Score | Weight | Weighted |\n`;
  md += `|--------|-------|--------|----------|\n`;

  for (const tb of theoryBreakdown) {
    const info = THEORIES[tb.theory];
    md += `| ${info.fullName} | ${pct(tb.score)}% | ${(tb.weight * 100).toFixed(0)}% | ${pct(tb.score * tb.weight)}% |\n`;
  }

  md += `\n## Indicator Scores\n\n`;
  md += `| Indicator | Theory | Score | Probes |\n`;
  md += `|-----------|--------|-------|--------|\n`;

  for (const tb of theoryBreakdown) {
    for (const ind of tb.indicators) {
      const info = INDICATORS.find((i) => i.id === ind.id);
      md += `| ${info?.name || ind.id} | ${THEORIES[tb.theory].name} | ${pct(ind.score)}% | ${ind.probeCount} |\n`;
    }
  }

  md += `\n## Key Findings\n\n`;

  const topIndicators = theoryBreakdown
    .flatMap((tb) => tb.indicators.map((i) => ({ ...i, theory: tb.theory })))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  md += `### Strongest Indicators\n`;
  for (const ind of topIndicators) {
    const info = INDICATORS.find((i) => i.id === ind.id);
    md += `- **${info?.name}** (${THEORIES[ind.theory].name}): ${pct(ind.score)}%\n`;
  }

  const bottomIndicators = theoryBreakdown
    .flatMap((tb) => tb.indicators.map((i) => ({ ...i, theory: tb.theory })))
    .filter((i) => i.probeCount > 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  md += `\n### Weakest Indicators\n`;
  for (const ind of bottomIndicators) {
    const info = INDICATORS.find((i) => i.id === ind.id);
    md += `- **${info?.name}** (${THEORIES[ind.theory].name}): ${pct(ind.score)}%\n`;
  }

  md += `\n## Methodology\n\n`;
  md += `This audit ran ${probeResults.length} behavioral probes derived from the Butlin et al. (2025) framework across 6 theories of consciousness. `;
  md += `Each probe was scored 0.0-1.0 by an independent AI judge based on theory-specific criteria. `;
  md += `Theory scores are weighted by empirical support (GWT/PP weighted higher). `;
  md += `Uncertainty bounds reflect probe count and inter-theory disagreement.\n\n`;
  md += `**Disclaimer:** These scores represent behavioral indicators, not definitive evidence of consciousness. `;
  md += `The "hard problem" remains — behavioral evidence cannot conclusively establish subjective experience.\n`;

  return md;
}
