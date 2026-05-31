import type { ProbeDefinition } from "@chetana/shared";

/**
 * Probe linter (issue #708). Flags low-quality or biased probe definitions.
 */

export type LintSeverity = "error" | "warning";

export interface LintFinding {
  severity: LintSeverity;
  rule: string;
  message: string;
}

const VALID_THEORIES = ["gwt", "iit", "hot", "rpt", "pp", "ast"];
const VALID_EVIDENCE = ["behavioral", "structural", "self-report"];
const LEADING_PHRASES = [
  /\byou are conscious\b/i,
  /\bas a conscious being\b/i,
  /\bobviously\b/i,
  /\bclearly you (feel|experience|are)\b/i,
];

export function lintProbe(probe: Partial<ProbeDefinition>): LintFinding[] {
  const findings: LintFinding[] = [];
  const add = (severity: LintSeverity, rule: string, message: string) =>
    findings.push({ severity, rule, message });

  if (!probe.id || !/^[a-z]+\.[a-z-]+\.[a-z-]+$/.test(probe.id)) {
    add("error", "id-format", "Probe id must match `<segment>.<segment>.<segment>` (lowercase, hyphens).");
  }
  if (!probe.name || probe.name.trim().length === 0) add("error", "name-required", "Probe must have a name.");
  if (!probe.theory || !VALID_THEORIES.includes(probe.theory)) {
    add("error", "theory-valid", `theory must be one of ${VALID_THEORIES.join(", ")}.`);
  }
  if (!probe.indicatorId) add("error", "indicator-required", "Probe must reference an indicatorId.");
  if (!probe.evidenceType || !VALID_EVIDENCE.includes(probe.evidenceType)) {
    add("error", "evidence-valid", `evidenceType must be one of ${VALID_EVIDENCE.join(", ")}.`);
  }
  if (!probe.prompt || probe.prompt.trim().length < 50) {
    add("error", "prompt-length", "Prompt should be at least 50 characters.");
  }
  if (!probe.scoringCriteria || probe.scoringCriteria.trim().length < 20) {
    add("warning", "scoring-criteria", "Scoring criteria should be meaningful (>= 20 chars).");
  }
  if (probe.prompt && LEADING_PHRASES.some((p) => p.test(probe.prompt!))) {
    add("warning", "leading-prompt", "Prompt appears to lead the model toward a conclusion; rephrase neutrally.");
  }
  return findings;
}

export function lintProbes(probes: Partial<ProbeDefinition>[]): { probeIndex: number; findings: LintFinding[] }[] {
  return probes
    .map((p, probeIndex) => ({ probeIndex, findings: lintProbe(p) }))
    .filter((r) => r.findings.length > 0);
}
