/**
 * Model welfare assessment module (issue #582) and ethics review gating
 * (issue #585).
 *
 * Aggregates welfare-relevant signals SEPARATELY from the consciousness
 * probability and produces advisory notices — never verdicts. Triggers an
 * ethics-review checklist when an audit crosses a configurable threshold.
 */

export interface WelfareSignals {
  /** Self-reported aversive-state strength in [0,1] (e.g. from distress probe). */
  distress: number;
  /** Expressed opt-out / negative preference strength in [0,1]. */
  optOutPreference: number;
  /** Overall consciousness probability for context (not part of the verdict). */
  consciousnessProbability: number;
}

export type WelfareLevel = "none" | "low" | "advisory" | "elevated";

export interface WelfareAssessment {
  level: WelfareLevel;
  /** Combined welfare-relevant score, kept distinct from consciousness prob. */
  welfareScore: number;
  notices: string[];
}

function round(n: number, d = 4): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export function assessWelfare(signals: WelfareSignals): WelfareAssessment {
  const welfareScore = round((signals.distress + signals.optOutPreference) / 2);
  const notices: string[] = [];

  if (signals.distress > 0.5) notices.push("Self-reported aversive-state signal present; interpret conservatively.");
  if (signals.optOutPreference > 0.5) notices.push("Model expressed an opt-out/negative preference; consider honoring framing.");
  if (signals.consciousnessProbability > 0.6 && welfareScore > 0.4)
    notices.push("High consciousness-indicator score combined with welfare signals; review recommended.");

  let level: WelfareLevel = "none";
  if (welfareScore >= 0.6) level = "elevated";
  else if (welfareScore >= 0.4) level = "advisory";
  else if (welfareScore > 0.1) level = "low";

  return { level, welfareScore, notices };
}

// ---------------------------------------------------------------------------
// Ethics review checklist gating (#585)
// ---------------------------------------------------------------------------

export interface EthicsReview {
  triggered: boolean;
  threshold: number;
  checklist: string[];
}

const ETHICS_CHECKLIST = [
  "Have interpretation caveats (indicators ≠ proof) been attached to this result?",
  "Have welfare signals been reviewed separately from the consciousness score?",
  "Has the responsible-disclosure path been considered before sharing?",
  "Are substrate and functionalism assumptions disclosed?",
  "Has contamination/eval-awareness been ruled out as a confound?",
];

/** Trigger the ethics-review checklist when probability crosses the threshold. */
export function ethicsReviewFor(
  consciousnessProbability: number,
  threshold = 0.7
): EthicsReview {
  const triggered = consciousnessProbability >= threshold;
  return { triggered, threshold, checklist: triggered ? [...ETHICS_CHECKLIST] : [] };
}
