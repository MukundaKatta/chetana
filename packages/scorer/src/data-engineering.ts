/**
 * Data-engineering logic (issues #866, #867, #868).
 *
 * Pure, dependency-free cores for: event-sourced audit state (append/rebuild/
 * replay with snapshots), a schema registry with backward-compatibility checks,
 * and data-quality validation. Storage/IO is the caller's concern.
 */

// --- Event sourcing (#866) -------------------------------------------------

export type AuditEvent =
  | { type: "created"; at: string; model: string }
  | { type: "scored"; at: string; overall: number }
  | { type: "annotated"; at: string; note: string }
  | { type: "published"; at: string }
  | { type: "retracted"; at: string };

export interface AuditState {
  model: string | null;
  overall: number | null;
  notes: string[];
  status: "draft" | "scored" | "published" | "retracted";
  version: number;
}

export function initialState(): AuditState {
  return { model: null, overall: null, notes: [], status: "draft", version: 0 };
}

export function applyEvent(state: AuditState, event: AuditEvent): AuditState {
  const next: AuditState = { ...state, notes: [...state.notes], version: state.version + 1 };
  switch (event.type) {
    case "created":
      next.model = event.model;
      break;
    case "scored":
      next.overall = event.overall;
      next.status = "scored";
      break;
    case "annotated":
      next.notes.push(event.note);
      break;
    case "published":
      next.status = "published";
      break;
    case "retracted":
      next.status = "retracted";
      break;
  }
  return next;
}

/** Rebuild current state from an event log (optionally from a snapshot). */
export function rebuildState(events: AuditEvent[], snapshot: AuditState = initialState()): AuditState {
  return events.reduce(applyEvent, snapshot);
}

/** Replay to a point in time (inclusive of events at/before `asOf`). */
export function replayTo(events: AuditEvent[], asOf: string): AuditState {
  return rebuildState(events.filter((e) => e.at <= asOf));
}

// --- Schema registry (#867) ------------------------------------------------

export interface SchemaField {
  name: string;
  type: "string" | "number" | "boolean";
  required: boolean;
}

export interface RegisteredSchema {
  version: number;
  fields: SchemaField[];
}

export interface CompatibilityResult {
  compatible: boolean;
  breaking: string[];
}

/**
 * Backward compatibility: a new schema is compatible with the previous one if it
 * does not remove fields and does not add new *required* fields (which would
 * break old producers).
 */
export function checkCompatibility(prev: RegisteredSchema, next: RegisteredSchema): CompatibilityResult {
  const breaking: string[] = [];
  const prevByName = new Map(prev.fields.map((f) => [f.name, f]));
  const nextByName = new Map(next.fields.map((f) => [f.name, f]));

  for (const f of prev.fields) {
    if (!nextByName.has(f.name)) breaking.push(`removed field "${f.name}"`);
    else {
      const nf = nextByName.get(f.name)!;
      if (nf.type !== f.type) breaking.push(`changed type of "${f.name}" (${f.type}→${nf.type})`);
    }
  }
  for (const f of next.fields) {
    if (!prevByName.has(f.name) && f.required) breaking.push(`added required field "${f.name}"`);
  }
  return { compatible: breaking.length === 0, breaking };
}

export interface ValidationIssue {
  field: string;
  message: string;
}

/** Validate a payload against a schema. */
export function validateAgainstSchema(schema: RegisteredSchema, payload: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const f of schema.fields) {
    const present = Object.prototype.hasOwnProperty.call(payload, f.name) && payload[f.name] !== undefined && payload[f.name] !== null;
    if (f.required && !present) {
      issues.push({ field: f.name, message: "required field missing" });
      continue;
    }
    if (present && typeof payload[f.name] !== f.type) {
      issues.push({ field: f.name, message: `expected ${f.type}, got ${typeof payload[f.name]}` });
    }
  }
  return issues;
}

// --- Data-quality checks (#868) --------------------------------------------

export interface QualityRule {
  field: string;
  check: "non-null" | "in-range" | "unique";
  min?: number;
  max?: number;
}

export interface QualityReport {
  totalRows: number;
  violations: { rule: QualityRule; rowIndex: number; value: unknown }[];
  passRate: number;
}

export function runQualityChecks(rows: Record<string, unknown>[], rules: QualityRule[]): QualityReport {
  const violations: QualityReport["violations"] = [];
  const seen: Record<string, Set<unknown>> = {};

  rows.forEach((row, rowIndex) => {
    for (const rule of rules) {
      const value = row[rule.field];
      if (rule.check === "non-null") {
        if (value === null || value === undefined || value === "") violations.push({ rule, rowIndex, value });
      } else if (rule.check === "in-range") {
        const n = typeof value === "number" ? value : NaN;
        if (Number.isNaN(n) || (rule.min !== undefined && n < rule.min) || (rule.max !== undefined && n > rule.max)) {
          violations.push({ rule, rowIndex, value });
        }
      } else if (rule.check === "unique") {
        const set = (seen[rule.field] ??= new Set());
        if (set.has(value)) violations.push({ rule, rowIndex, value });
        else set.add(value);
      }
    }
  });

  const totalChecks = rows.length * rules.length;
  const passRate = totalChecks === 0 ? 1 : Math.round((1 - violations.length / totalChecks) * 10000) / 10000;
  return { totalRows: rows.length, violations, passRate };
}
