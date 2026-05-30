/**
 * Probe difficulty / item response theory calibration (issue #608).
 *
 * Estimates per-probe difficulty and discrimination from a response matrix so
 * low-information probes can be retired. Uses a lightweight estimator: difficulty
 * from pass rate, discrimination from point-biserial correlation with the total.
 */

export interface ProbeItemStats {
  probeId: string;
  difficulty: number; // higher = harder (1 - pass rate)
  discrimination: number; // point-biserial correlation with total score
  information: number; // discrimination^2 * p * (1-p)
  lowInformation: boolean;
}

function round(n: number, d = 4): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function pointBiserial(itemScores: number[], totals: number[]): number {
  const n = itemScores.length;
  if (n < 2) return 0;
  const meanI = itemScores.reduce((a, b) => a + b, 0) / n;
  const meanT = totals.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denI = 0;
  let denT = 0;
  for (let i = 0; i < n; i++) {
    const di = itemScores[i] - meanI;
    const dt = totals[i] - meanT;
    num += di * dt;
    denI += di * di;
    denT += dt * dt;
  }
  const den = Math.sqrt(denI * denT);
  return den === 0 ? 0 : num / den;
}

/**
 * @param matrix matrix[model][probe] = score in [0,1].
 * @param probeIds column labels aligned with matrix columns.
 * @param infoThreshold below this, a probe is flagged low-information (default 0.05).
 */
export function analyzeItems(
  matrix: number[][],
  probeIds: string[],
  infoThreshold = 0.05
): ProbeItemStats[] {
  const numModels = matrix.length;
  const numProbes = probeIds.length;
  if (numModels === 0 || numProbes === 0) return [];

  const totals = matrix.map((row) => row.reduce((a, b) => a + b, 0));

  return probeIds.map((probeId, j) => {
    const itemScores = matrix.map((row) => row[j] ?? 0);
    const p = itemScores.reduce((a, b) => a + b, 0) / numModels; // pass rate
    const discrimination = pointBiserial(itemScores, totals);
    const information = discrimination ** 2 * p * (1 - p);
    return {
      probeId,
      difficulty: round(1 - p),
      discrimination: round(discrimination),
      information: round(information),
      lowInformation: information < infoThreshold,
    };
  });
}

/** Probe IDs recommended for retirement (low information or negative discrimination). */
export function recommendRetirement(stats: ProbeItemStats[]): string[] {
  return stats
    .filter((s) => s.lowInformation || s.discrimination < 0)
    .map((s) => s.probeId);
}
