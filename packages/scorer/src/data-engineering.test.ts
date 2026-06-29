import { describe, it, expect } from "vitest";
import {
  initialState, applyEvent, rebuildState, replayTo,
  checkCompatibility, validateAgainstSchema, runQualityChecks,
  type AuditEvent, type RegisteredSchema,
} from "./data-engineering";

const events: AuditEvent[] = [
  { type: "created", at: "2026-01-01", model: "GPT-5.4" },
  { type: "scored", at: "2026-01-02", overall: 0.6 },
  { type: "annotated", at: "2026-01-03", note: "looks high" },
  { type: "published", at: "2026-01-04" },
];

describe("event sourcing (#866)", () => {
  it("rebuilds current state from the event log", () => {
    const s = rebuildState(events);
    expect(s.model).toBe("GPT-5.4");
    expect(s.overall).toBe(0.6);
    expect(s.notes).toEqual(["looks high"]);
    expect(s.status).toBe("published");
    expect(s.version).toBe(4);
  });
  it("replays to a point in time", () => {
    const s = replayTo(events, "2026-01-02");
    expect(s.status).toBe("scored");
    expect(s.notes).toEqual([]);
  });
  it("applyEvent is immutable", () => {
    const s0 = initialState();
    const s1 = applyEvent(s0, { type: "created", at: "t", model: "x" });
    expect(s0.model).toBeNull();
    expect(s1.model).toBe("x");
  });
});

describe("schema registry (#867)", () => {
  const v1: RegisteredSchema = {
    version: 1,
    fields: [
      { name: "id", type: "string", required: true },
      { name: "score", type: "number", required: true },
    ],
  };
  it("accepts adding an optional field as compatible", () => {
    const v2: RegisteredSchema = { version: 2, fields: [...v1.fields, { name: "note", type: "string", required: false }] };
    expect(checkCompatibility(v1, v2).compatible).toBe(true);
  });
  it("flags removing a field or adding a required field as breaking", () => {
    const removed: RegisteredSchema = { version: 2, fields: [v1.fields[0]] };
    expect(checkCompatibility(v1, removed).breaking).toContain('removed field "score"');
    const addedReq: RegisteredSchema = { version: 2, fields: [...v1.fields, { name: "owner", type: "string", required: true }] };
    expect(checkCompatibility(v1, addedReq).compatible).toBe(false);
  });
  it("validates payloads against a schema", () => {
    expect(validateAgainstSchema(v1, { id: "a", score: 0.5 })).toHaveLength(0);
    const issues = validateAgainstSchema(v1, { id: "a", score: "high" });
    expect(issues[0].field).toBe("score");
    expect(validateAgainstSchema(v1, { id: "a" })[0].message).toMatch(/missing/);
  });
});

describe("data-quality checks (#868)", () => {
  it("flags non-null, range, and uniqueness violations", () => {
    const rows = [
      { id: "a", score: 0.5 },
      { id: "b", score: 1.5 },   // out of range
      { id: "a", score: null },  // duplicate id + null score
    ];
    const report = runQualityChecks(rows, [
      { field: "score", check: "non-null" },
      { field: "score", check: "in-range", min: 0, max: 1 },
      { field: "id", check: "unique" },
    ]);
    expect(report.totalRows).toBe(3);
    expect(report.violations.length).toBeGreaterThanOrEqual(3);
    expect(report.passRate).toBeLessThan(1);
  });
  it("reports a perfect pass rate for clean data", () => {
    const report = runQualityChecks([{ id: "a", score: 0.5 }], [{ field: "score", check: "non-null" }]);
    expect(report.passRate).toBe(1);
  });
});
