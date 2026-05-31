import { describe, it, expect } from "vitest";
import { forecast } from "./forecasting";
import { metaAnalyze } from "./meta-analysis";
import { requiredSampleSize, powerAt, powerCurve } from "./power-analysis";
import { assessValidity } from "./validity";
import { intraclassCorrelation, testRetestByIndicator } from "./test-retest";
import { analyzeMultiverse } from "./multiverse";
import { evaluateMetric, validateMetric } from "./custom-metric";

describe("forecasting (#732)", () => {
  it("projects an upward trend forward", () => {
    const r = forecast([0.1, 0.2, 0.3, 0.4], 2);
    expect(r.forecast).toHaveLength(2);
    expect(r.forecast[0].value).toBeGreaterThan(0.4);
    expect(r.forecast[0].upper).toBeGreaterThanOrEqual(r.forecast[0].lower);
  });
  it("handles short history gracefully", () => {
    expect(forecast([0.5], 3).forecast).toHaveLength(3);
  });
});

describe("meta-analysis (#735)", () => {
  it("pools estimates with lower SE than individuals", () => {
    const r = metaAnalyze([
      { estimate: 0.5, standardError: 0.1 },
      { estimate: 0.54, standardError: 0.1 },
      { estimate: 0.52, standardError: 0.1 },
    ]);
    expect(r.pooledEstimate).toBeGreaterThan(0.49);
    expect(r.pooledEstimate).toBeLessThan(0.55);
    expect(r.pooledStandardError).toBeLessThan(0.1);
    expect(r.iSquared).toBeGreaterThanOrEqual(0);
  });
  it("reports high heterogeneity for divergent estimates", () => {
    const r = metaAnalyze([
      { estimate: 0.1, standardError: 0.02 },
      { estimate: 0.9, standardError: 0.02 },
    ]);
    expect(r.iSquared).toBeGreaterThan(0.5);
  });
});

describe("power analysis (#736)", () => {
  it("requires more samples for smaller effects", () => {
    const small = requiredSampleSize(0.2).perGroup;
    const large = requiredSampleSize(0.8).perGroup;
    expect(small).toBeGreaterThan(large);
  });
  it("power increases with n", () => {
    expect(powerAt(100, 0.5)).toBeGreaterThan(powerAt(10, 0.5));
  });
  it("produces a power curve", () => {
    const curve = powerCurve(0.5, [10, 50, 100]);
    expect(curve).toHaveLength(3);
    expect(curve[2].power).toBeGreaterThanOrEqual(curve[0].power);
  });
});

describe("validity (#738)", () => {
  it("detects convergent > discriminant when within-theory correlates", () => {
    const r = assessValidity({
      indicatorScores: {
        a1: [0.1, 0.5, 0.9],
        a2: [0.12, 0.52, 0.88],
        b1: [0.9, 0.5, 0.1],
      },
      theoryOf: { a1: "A", a2: "A", b1: "B" },
    });
    expect(r.convergent).toBeGreaterThan(r.discriminant);
    expect(r.validityHolds).toBe(true);
  });
});

describe("test-retest (#739)", () => {
  it("gives high ICC for consistent repeats", () => {
    const icc = intraclassCorrelation([[0.8, 0.82], [0.3, 0.31], [0.5, 0.48], [0.9, 0.91]]);
    expect(icc).toBeGreaterThan(0.9);
  });
  it("flags unreliable indicators", () => {
    const flags = testRetestByIndicator({
      stable: [[0.8, 0.81], [0.2, 0.22], [0.5, 0.49], [0.9, 0.88]],
      noisy: [[0.8, 0.2], [0.2, 0.9], [0.5, 0.1], [0.9, 0.3]],
    });
    expect(flags.find((f) => f.indicatorId === "stable")!.reliable).toBe(true);
    expect(flags.find((f) => f.indicatorId === "noisy")!.reliable).toBe(false);
  });
});

describe("multiverse (#740)", () => {
  it("summarizes the outcome distribution and most-influential dimension", () => {
    const r = analyzeMultiverse([
      { choices: [{ dimension: "weights", label: "equal" }], outcome: 0.5 },
      { choices: [{ dimension: "weights", label: "theory" }], outcome: 0.8 },
      { choices: [{ dimension: "weights", label: "equal" }], outcome: 0.52 },
    ]);
    expect(r.n).toBe(3);
    expect(r.range).toBeGreaterThan(0);
    expect(r.mostInfluentialDimension).toBe("weights");
    expect(r.curve[0].outcome).toBeLessThanOrEqual(r.curve[r.curve.length - 1].outcome);
  });
});

describe("custom metric (#733)", () => {
  it("evaluates arithmetic over named scores", () => {
    expect(evaluateMetric("(gwt + hot) / 2", { gwt: 0.6, hot: 0.4 })).toBeCloseTo(0.5, 5);
  });
  it("supports helper functions", () => {
    expect(evaluateMetric("max(a, b)", { a: 0.3, b: 0.7 })).toBeCloseTo(0.7, 5);
    expect(evaluateMetric("avg(a, b, c)", { a: 0.3, b: 0.6, c: 0.9 })).toBeCloseTo(0.6, 5);
  });
  it("rejects unknown identifiers and bad syntax", () => {
    expect(validateMetric("gwt + mystery", ["gwt"]).valid).toBe(false);
    expect(validateMetric("gwt + ", ["gwt"]).valid).toBe(false);
    expect(validateMetric("(gwt + hot) / 2", ["gwt", "hot"]).valid).toBe(true);
  });
  it("does not execute arbitrary code", () => {
    expect(validateMetric("process.exit(1)", ["gwt"]).valid).toBe(false);
  });
});
