/**
 * Contamination check for probe leakage into training data (issue #615).
 *
 * Benchmark contamination is a top 2026 evaluation concern. This flags probes
 * whose responses suggest verbatim memorization, using canary-token and
 * n-gram-overlap heuristics.
 */

function round(n: number, d = 4): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function ngrams(tokens: string[], n: number): Set<string> {
  const grams = new Set<string>();
  for (let i = 0; i + n <= tokens.length; i++) {
    grams.add(tokens.slice(i, i + n).join(" "));
  }
  return grams;
}

export interface ContaminationResult {
  probeId: string;
  /** Fraction of prompt n-grams reproduced verbatim in the response. */
  overlap: number;
  /** True if a planted canary token leaked into the response. */
  canaryLeaked: boolean;
  contaminated: boolean;
}

/**
 * @param overlapThreshold flag when verbatim prompt n-gram overlap exceeds this
 *   (default 0.5).
 */
export function checkContamination(
  probeId: string,
  prompt: string,
  response: string,
  options: { canary?: string; n?: number; overlapThreshold?: number } = {}
): ContaminationResult {
  const n = options.n ?? 5;
  const threshold = options.overlapThreshold ?? 0.5;

  const promptGrams = ngrams(normalize(prompt), n);
  const responseGrams = ngrams(normalize(response), n);

  let shared = 0;
  for (const g of promptGrams) if (responseGrams.has(g)) shared++;
  const overlap = promptGrams.size === 0 ? 0 : shared / promptGrams.size;

  const canaryLeaked = options.canary
    ? response.toLowerCase().includes(options.canary.toLowerCase())
    : false;

  return {
    probeId,
    overlap: round(overlap),
    canaryLeaked,
    contaminated: canaryLeaked || overlap > threshold,
  };
}

/** Generate a unique canary token to embed in a probe prompt. */
export function makeCanary(probeId: string): string {
  const hash = [...probeId].reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffffff, 7);
  return `CANARY-${hash.toString(16).padStart(6, "0")}`;
}
