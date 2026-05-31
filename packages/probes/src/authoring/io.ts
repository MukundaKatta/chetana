import type { ProbeDefinition } from "@chetana/shared";
import { lintProbe } from "./lint";

/**
 * Probe import/export (issue #707). JSON serialization with a versioned
 * envelope and validating import. (YAML can be layered on by callers that bring
 * a YAML parser; the core format is JSON to avoid adding a dependency.)
 */

export interface ProbeBundle {
  format: "chetana-probes";
  version: 1;
  probes: ProbeDefinition[];
}

export function serializeProbes(probes: ProbeDefinition[]): string {
  const bundle: ProbeBundle = { format: "chetana-probes", version: 1, probes };
  return JSON.stringify(bundle, null, 2);
}

export interface ParseResult {
  probes: ProbeDefinition[];
  errors: string[];
}

/** Parse and validate a probe bundle, rejecting probes with lint errors. */
export function parseProbes(json: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    return { probes: [], errors: [`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`] };
  }

  const bundle = parsed as Partial<ProbeBundle>;
  if (bundle.format !== "chetana-probes") {
    return { probes: [], errors: ['Missing or invalid "format" (expected "chetana-probes").'] };
  }
  if (!Array.isArray(bundle.probes)) {
    return { probes: [], errors: ['Bundle "probes" must be an array.'] };
  }

  const errors: string[] = [];
  const valid: ProbeDefinition[] = [];
  const seen = new Set<string>();

  bundle.probes.forEach((probe, i) => {
    const findings = lintProbe(probe).filter((f) => f.severity === "error");
    if (findings.length > 0) {
      errors.push(`probes[${i}]: ${findings.map((f) => f.message).join("; ")}`);
      return;
    }
    if (seen.has(probe.id)) {
      errors.push(`probes[${i}]: duplicate id "${probe.id}"`);
      return;
    }
    seen.add(probe.id);
    valid.push(probe);
  });

  return { probes: valid, errors };
}
