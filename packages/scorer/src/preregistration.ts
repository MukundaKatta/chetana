import { hashObject } from "@chetana/shared";

/**
 * Preregistration for consciousness experiments (issue #630).
 *
 * Produces a timestamped, immutable preregistration record (hypotheses, models,
 * probes, analysis plan) and logs deviations between plan and execution.
 */

export interface PreregistrationInput {
  title: string;
  hypotheses: string[];
  models: string[];
  probeIds: string[];
  analysisPlan: string;
  registeredAt: string;
}

export interface Preregistration extends PreregistrationInput {
  id: string; // content hash, immutable
}

export function preregister(input: PreregistrationInput): Preregistration {
  return { ...input, id: hashObject(input) };
}

/** Detect deviations between the preregistered plan and what was executed. */
export interface ExecutionRecord {
  models: string[];
  probeIds: string[];
}

export interface Deviation {
  field: "models" | "probeIds";
  added: string[];
  removed: string[];
}

export function diffExecution(
  prereg: Preregistration,
  execution: ExecutionRecord
): Deviation[] {
  const deviations: Deviation[] = [];
  for (const field of ["models", "probeIds"] as const) {
    const planned = new Set(prereg[field]);
    const actual = new Set(execution[field]);
    const added = [...actual].filter((x) => !planned.has(x));
    const removed = [...planned].filter((x) => !actual.has(x));
    if (added.length || removed.length) deviations.push({ field, added, removed });
  }
  return deviations;
}
