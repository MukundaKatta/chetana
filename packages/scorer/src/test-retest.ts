/**
 * Test-retest reliability (issue #739).
 *
 * Computes a one-way intraclass correlation (ICC) over paired repeated audits
 * of the same model/config, and flags indicators below a reliability threshold.
 */

function round(n: number, d = 4): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

/**
 * ICC(1) from pairs of repeated measurements.
 * @param pairs array of [test, retest] score pairs.
 */
export function intraclassCorrelation(pairs: [number, number][]): number {
  const n = pairs.length;
  if (n < 2) return 0;

  const all = pairs.flat();
  const grand = all.reduce((a, b) => a + b, 0) / all.length;

  // Between-subject and within-subject mean squares (k = 2 raters).
  const k = 2;
  let ssBetween = 0;
  let ssWithin = 0;
  for (const [a, b] of pairs) {
    const subjMean = (a + b) / 2;
    ssBetween += k * (subjMean - grand) ** 2;
    ssWithin += (a - subjMean) ** 2 + (b - subjMean) ** 2;
  }
  const msBetween = ssBetween / (n - 1);
  const msWithin = ssWithin / (n * (k - 1));

  const icc = (msBetween - msWithin) / (msBetween + (k - 1) * msWithin);
  return round(Math.max(-1, Math.min(1, icc || 0)));
}

export interface ReliabilityFlag {
  indicatorId: string;
  icc: number;
  reliable: boolean;
}

/**
 * @param byIndicator indicatorId -> pairs of [test, retest] across models.
 * @param threshold ICC below which an indicator is flagged unreliable (default 0.7).
 */
export function testRetestByIndicator(
  byIndicator: Record<string, [number, number][]>,
  threshold = 0.7
): ReliabilityFlag[] {
  return Object.entries(byIndicator).map(([indicatorId, pairs]) => {
    const icc = intraclassCorrelation(pairs);
    return { indicatorId, icc, reliable: icc >= threshold };
  });
}
