import type { Theory, IndicatorId, ProbeResult, TheoryScores, IndicatorScores } from "@chetana/shared";
import { INDICATORS, THEORY_WEIGHTS } from "@chetana/shared";

export function aggregateByIndicator(
  probeResults: Pick<ProbeResult, "indicatorId" | "score">[]
): IndicatorScores {
  const scores: IndicatorScores = {};
  const counts: Record<string, number> = {};

  for (const result of probeResults) {
    const key = result.indicatorId;
    scores[key] = (scores[key] || 0) + result.score;
    counts[key] = (counts[key] || 0) + 1;
  }

  // Average scores per indicator
  for (const key of Object.keys(scores)) {
    scores[key] = scores[key] / (counts[key] || 1);
  }

  return scores;
}

export function aggregateByTheory(
  indicatorScores: IndicatorScores
): TheoryScores {
  const theoryScores: TheoryScores = {
    gwt: 0,
    iit: 0,
    hot: 0,
    rpt: 0,
    pp: 0,
    ast: 0,
  };

  const theoryCounts: Record<Theory, number> = {
    gwt: 0,
    iit: 0,
    hot: 0,
    rpt: 0,
    pp: 0,
    ast: 0,
  };

  for (const indicator of INDICATORS) {
    const score = indicatorScores[indicator.id];
    if (score !== undefined) {
      theoryScores[indicator.theory] += score;
      theoryCounts[indicator.theory]++;
    }
  }

  // Average scores per theory
  for (const theory of Object.keys(theoryScores) as Theory[]) {
    if (theoryCounts[theory] > 0) {
      theoryScores[theory] = theoryScores[theory] / theoryCounts[theory];
    }
  }

  return theoryScores;
}

export function getTheoryBreakdown(
  probeResults: Pick<ProbeResult, "indicatorId" | "score">[]
) {
  const indicatorScores = aggregateByIndicator(probeResults);
  const theories: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];

  return theories.map((theory) => {
    const theoryIndicators = INDICATORS.filter((i) => i.theory === theory);
    const indicators = theoryIndicators.map((ind) => {
      const probesForIndicator = probeResults.filter(
        (r) => r.indicatorId === ind.id
      );
      return {
        id: ind.id as IndicatorId,
        score: indicatorScores[ind.id] || 0,
        probeCount: probesForIndicator.length,
      };
    });

    const avgScore =
      indicators.reduce((sum, i) => sum + i.score, 0) /
      (indicators.length || 1);

    return {
      theory,
      score: avgScore,
      weight: THEORY_WEIGHTS[theory],
      indicators,
    };
  });
}
