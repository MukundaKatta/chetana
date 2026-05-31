import { describe, it, expect } from "vitest";
import { classifyEuAiActRisk, checkModelCard, generateTransparencyReport } from "./governance";
import { appendAuditLogEntry, verifyAuditLog } from "./audit-log";
import { computeUptime, errorBudget, meterUsage } from "./ops";

describe("EU AI Act classification (#743)", () => {
  it("classifies prohibited practices as unacceptable", () => {
    expect(classifyEuAiActRisk({ prohibitedPractice: true }).tier).toBe("unacceptable");
  });
  it("classifies high-risk domains with obligations", () => {
    const r = classifyEuAiActRisk({ highRiskDomain: true });
    expect(r.tier).toBe("high");
    expect(r.obligations.length).toBeGreaterThan(3);
  });
  it("classifies user-facing systems as limited risk", () => {
    expect(classifyEuAiActRisk({ interactsWithUsers: true }).tier).toBe("limited");
  });
  it("defaults to minimal risk", () => {
    expect(classifyEuAiActRisk({}).tier).toBe("minimal");
  });
});

describe("model card check (#747)", () => {
  it("flags missing required fields", () => {
    const r = checkModelCard({ name: "X", provider: "Y" });
    expect(r.compliant).toBe(false);
    expect(r.missing).toContain("limitations");
    expect(r.completeness).toBeLessThan(0.75);
  });
  it("passes a complete card", () => {
    const r = checkModelCard({
      name: "X", provider: "Y", intendedUse: "a", limitations: "b", trainingData: "c",
      evaluation: "d", ethicalConsiderations: "e", license: "MIT",
    });
    expect(r.compliant).toBe(true);
    expect(r.completeness).toBe(1);
  });
});

describe("transparency report (#748)", () => {
  it("generates a markdown report", () => {
    const md = generateTransparencyReport({
      auditsRun: 100, modelsEvaluated: 20, methodologyVersion: "v3",
      periodStart: "2026-01-01", periodEnd: "2026-03-31",
    });
    expect(md).toContain("# Transparency Report");
    expect(md).toContain("Audits run: 100");
  });
});

describe("compliance audit log (#745)", () => {
  it("hash-chains entries and verifies intact", () => {
    let chain = appendAuditLogEntry([], { timestamp: "t0", actor: "alice", action: "export" });
    chain = appendAuditLogEntry(chain, { timestamp: "t1", actor: "bob", action: "delete", target: "audit-1" });
    expect(chain).toHaveLength(2);
    expect(verifyAuditLog(chain).valid).toBe(true);
  });
  it("detects tampering", () => {
    let chain = appendAuditLogEntry([], { timestamp: "t0", actor: "alice", action: "export" });
    chain = appendAuditLogEntry(chain, { timestamp: "t1", actor: "bob", action: "delete" });
    chain[0] = { ...chain[0], actor: "mallory" };
    const result = verifyAuditLog(chain);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(0);
  });
});

describe("ops utilities (#752/#756/#759)", () => {
  it("computes uptime and SLA", () => {
    const r = computeUptime([{ durationMs: 9990, up: true }, { durationMs: 10, up: false }], 0.999);
    expect(r.uptime).toBeCloseTo(0.999, 3);
    expect(r.meetsSla).toBe(true);
  });
  it("computes error budget burn and breach", () => {
    const r = errorBudget(0.99, 1000, 20);
    expect(r.budget).toBeCloseTo(0.01, 5);
    expect(r.observed).toBeCloseTo(0.02, 5);
    expect(r.breached).toBe(true);
    expect(r.burned).toBeCloseTo(2, 5);
  });
  it("meters usage and cost by model", () => {
    const r = meterUsage(
      [
        { model: "gpt-5.4", inputTokens: 1_000_000, outputTokens: 500_000 },
        { model: "gpt-5.4", inputTokens: 1_000_000, outputTokens: 0 },
      ],
      { "gpt-5.4": { input: 2, output: 8 } }
    );
    expect(r.totalInputTokens).toBe(2_000_000);
    // 2*$2 + 0.5*$8 = $8
    expect(r.totalCost).toBeCloseTo(8, 5);
    expect(r.byModel["gpt-5.4"].cost).toBeCloseTo(8, 5);
  });
});
