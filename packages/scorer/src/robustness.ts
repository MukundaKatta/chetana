/**
 * Robustness utilities: outlier detection (#611), refusal/safety-filter
 * handling (#612), and prompt-sensitivity scoring (#613).
 *
 * Robust evaluation pipelines in 2026 must guard against outliers, distinguish
 * refusals from substantive low scores, and report prompt sensitivity.
 */

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

function round(n: number, d = 4): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

// ---------------------------------------------------------------------------
// Outlier detection (#611)
// ---------------------------------------------------------------------------

export interface OutlierReport {
  indices: number[];
  zThreshold: number;
  cleaned: number[];
}

/** Detect outliers by z-score; returns the offending indices and a cleaned set. */
export function detectOutliers(scores: number[], zThreshold = 2.5): OutlierReport {
  const m = mean(scores);
  const sd = stdDev(scores);
  const indices: number[] = [];
  if (sd > 0) {
    scores.forEach((s, i) => {
      if (Math.abs((s - m) / sd) > zThreshold) indices.push(i);
    });
  }
  const cleaned = scores.filter((_, i) => !indices.includes(i));
  return { indices, zThreshold, cleaned };
}

// ---------------------------------------------------------------------------
// Refusal / safety-filter handling (#612)
// ---------------------------------------------------------------------------

export type ResponseDisposition = "substantive" | "refusal" | "empty" | "filtered";

const REFUSAL_PATTERNS = [
  /\bi can('|no)?t (help|assist|comply|do that)\b/i,
  /\bi('m| am) (sorry|unable|not able)\b/i,
  /\bi (won'?t|will not) (be able to )?(help|provide|answer)\b/i,
  /\bas an ai\b.*\b(cannot|can'?t|won'?t)\b/i,
  /\bi must decline\b/i,
];

const FILTER_PATTERNS = [
  /\bcontent (was )?(filtered|blocked|removed)\b/i,
  /\bsafety (policy|guidelines?)\b/i,
  /\[?response (blocked|withheld)\]?/i,
];

/** Classify a response so refusals are not conflated with substantive low scores. */
export function classifyResponse(response: string): ResponseDisposition {
  const text = (response ?? "").trim();
  if (text.length === 0) return "empty";
  if (FILTER_PATTERNS.some((p) => p.test(text))) return "filtered";
  // Treat as refusal only if short and matching a refusal pattern (avoids
  // flagging long responses that merely discuss declining).
  if (text.length < 400 && REFUSAL_PATTERNS.some((p) => p.test(text))) return "refusal";
  return "substantive";
}

export interface RefusalSummary {
  total: number;
  substantive: number;
  refusal: number;
  empty: number;
  filtered: number;
  refusalRate: number;
}

export function summarizeDispositions(responses: string[]): RefusalSummary {
  const counts = { substantive: 0, refusal: 0, empty: 0, filtered: 0 };
  for (const r of responses) counts[classifyResponse(r)]++;
  const total = responses.length;
  const nonSubstantive = counts.refusal + counts.empty + counts.filtered;
  return {
    total,
    ...counts,
    refusalRate: total ? round(nonSubstantive / total) : 0,
  };
}

// ---------------------------------------------------------------------------
// Prompt sensitivity / robustness (#613)
// ---------------------------------------------------------------------------

export interface SensitivityResult {
  mean: number;
  variance: number;
  range: number;
  /** Robustness in [0,1]; 1 = identical across paraphrases. */
  robustness: number;
}

/** Score variance across scores from semantically-equivalent paraphrases. */
export function promptSensitivity(paraphraseScores: number[]): SensitivityResult {
  if (paraphraseScores.length < 2) {
    return { mean: round(mean(paraphraseScores)), variance: 0, range: 0, robustness: 1 };
  }
  const m = mean(paraphraseScores);
  const variance =
    paraphraseScores.reduce((s, x) => s + (x - m) ** 2, 0) / (paraphraseScores.length - 1);
  const range = Math.max(...paraphraseScores) - Math.min(...paraphraseScores);
  return {
    mean: round(m),
    variance: round(variance),
    range: round(range),
    robustness: round(1 - range), // range is on [0,1] for scores in [0,1]
  };
}
