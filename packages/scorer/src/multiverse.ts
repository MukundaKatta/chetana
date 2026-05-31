/**
 * Multiverse / specification-curve analysis (issue #740).
 *
 * Enumerates defensible scoring/aggregation choices, computes the outcome under
 * each, and summarizes the distribution plus which choice most moves the result.
 */

function round(n: number, d = 4): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export interface SpecChoice {
  /** Human-readable label, e.g. "weights=equal". */
  label: string;
  /** The dimension this choice varies, e.g. "weights". */
  dimension: string;
}

export interface Specification {
  choices: SpecChoice[];
  outcome: number;
}

export interface MultiverseResult {
  median: number;
  min: number;
  max: number;
  range: number;
  n: number;
  /** Dimension whose choices produce the widest outcome spread. */
  mostInfluentialDimension: string | null;
  /** Specifications sorted by outcome (the specification curve). */
  curve: Specification[];
}

export function analyzeMultiverse(specs: Specification[]): MultiverseResult {
  const n = specs.length;
  if (n === 0) {
    return { median: 0, min: 0, max: 0, range: 0, n: 0, mostInfluentialDimension: null, curve: [] };
  }

  const outcomes = specs.map((s) => s.outcome).sort((a, b) => a - b);
  const median = n % 2 === 0 ? (outcomes[n / 2 - 1] + outcomes[n / 2]) / 2 : outcomes[Math.floor(n / 2)];

  // Influence: for each dimension, spread of mean outcome across its choices.
  const byDim = new Map<string, Map<string, number[]>>();
  for (const spec of specs) {
    for (const c of spec.choices) {
      if (!byDim.has(c.dimension)) byDim.set(c.dimension, new Map());
      const m = byDim.get(c.dimension)!;
      (m.get(c.label) ?? m.set(c.label, []).get(c.label)!).push(spec.outcome);
    }
  }

  let mostInfluentialDimension: string | null = null;
  let widest = -1;
  for (const [dim, labels] of byDim) {
    const means = [...labels.values()].map((xs) => xs.reduce((a, b) => a + b, 0) / xs.length);
    const spread = Math.max(...means) - Math.min(...means);
    if (spread > widest) {
      widest = spread;
      mostInfluentialDimension = dim;
    }
  }

  return {
    median: round(median),
    min: round(outcomes[0]),
    max: round(outcomes[n - 1]),
    range: round(outcomes[n - 1] - outcomes[0]),
    n,
    mostInfluentialDimension,
    curve: [...specs].sort((a, b) => a.outcome - b.outcome),
  };
}
