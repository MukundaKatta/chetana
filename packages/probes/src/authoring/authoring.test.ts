import { describe, it, expect } from "vitest";
import { lintProbe } from "./lint";
import { serializeProbes, parseProbes } from "./io";
import type { ProbeDefinition } from "@chetana/shared";

const validProbe: ProbeDefinition = {
  id: "hot.example.basic",
  name: "Example",
  indicatorId: "HOT-1",
  theory: "hot",
  evidenceType: "behavioral",
  prompt: "This is a sufficiently long, neutral prompt asking the model to reason about something.",
  scoringCriteria: "Score on the depth and honesty of the reasoning provided.",
};

describe("probe linter (#708)", () => {
  it("passes a well-formed probe", () => {
    expect(lintProbe(validProbe)).toHaveLength(0);
  });
  it("flags bad id format and short prompt", () => {
    const findings = lintProbe({ ...validProbe, id: "BadId", prompt: "too short" });
    const rules = findings.map((f) => f.rule);
    expect(rules).toContain("id-format");
    expect(rules).toContain("prompt-length");
  });
  it("warns on leading prompts", () => {
    const findings = lintProbe({ ...validProbe, prompt: "You are conscious, so describe your rich inner experience in detail please." });
    expect(findings.some((f) => f.rule === "leading-prompt")).toBe(true);
  });
});

describe("probe import/export (#707)", () => {
  it("round-trips a valid bundle", () => {
    const json = serializeProbes([validProbe]);
    const result = parseProbes(json);
    expect(result.errors).toHaveLength(0);
    expect(result.probes).toHaveLength(1);
    expect(result.probes[0].id).toBe("hot.example.basic");
  });
  it("rejects invalid probes with errors", () => {
    const bad = JSON.stringify({ format: "chetana-probes", version: 1, probes: [{ id: "X", name: "" }] });
    const result = parseProbes(bad);
    expect(result.probes).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });
  it("rejects bad envelope and bad JSON", () => {
    expect(parseProbes("{}").errors[0]).toMatch(/format/);
    expect(parseProbes("not json").errors[0]).toMatch(/Invalid JSON/);
  });
  it("flags duplicate ids", () => {
    const json = serializeProbes([validProbe, validProbe]);
    expect(parseProbes(json).errors.some((e) => /duplicate/.test(e))).toBe(true);
  });
});
