import { describe, it, expect } from "vitest";
import {
  bayesianModelAverage, conformalInterval, jackknife, permutationTest,
  bonferroni, benjaminiHochberg, propensityMatch, regressionDiscontinuity,
} from "./advanced-stats";

describe("Bayesian model averaging (#1011)", () => {
  it("weights toward higher-evidence models", () => {
    const r = bayesianModelAverage([
      { label: "a", estimate: 0.2, logEvidence: -10 },
      { label: "b", estimate: 0.8, logEvidence: -2 },
    ]);
    expect(r.weights.b).toBeGreaterThan(r.weights.a);
    expect(r.averaged).toBeGreaterThan(0.5);
    expect(r.weights.a + r.weights.b).toBeCloseTo(1, 3);
  });
  it("is uniform under equal evidence", () => {
    const r = bayesianModelAverage([
      { label: "a", estimate: 0.3, logEvidence: -5 },
      { label: "b", estimate: 0.7, logEvidence: -5 },
    ]);
    expect(r.averaged).toBeCloseTo(0.5, 3);
  });
});

describe("conformal prediction (#1012)", () => {
  it("produces an interval covering the prediction", () => {
    const r = conformalInterval(0.5, [0.05, -0.1, 0.2, -0.15, 0.08], 0.8);
    expect(r.lower).toBeLessThanOrEqual(0.5);
    expect(r.upper).toBeGreaterThanOrEqual(0.5);
    expect(r.upper - r.lower).toBeGreaterThan(0);
  });
  it("widens with higher confidence", () => {
    const resid = [0.05, -0.1, 0.2, -0.15, 0.08, 0.3, -0.25];
    const lo = conformalInterval(0.5, resid, 0.5);
    const hi = conformalInterval(0.5, resid, 0.95);
    expect(hi.upper - hi.lower).toBeGreaterThanOrEqual(lo.upper - lo.lower);
  });
});

describe("jackknife (#1013)", () => {
  it("estimates near the sample mean with small bias", () => {
    const data = [1, 2, 3, 4, 5];
    const r = jackknife(data, (xs) => xs.reduce((a, b) => a + b, 0) / xs.length);
    expect(r.estimate).toBeCloseTo(3, 4);
    expect(Math.abs(r.bias)).toBeLessThan(1e-6);
    expect(r.standardError).toBeGreaterThan(0);
  });
});

describe("permutation test (#1014)", () => {
  it("finds a low p-value for clearly separated groups", () => {
    const r = permutationTest([10, 11, 12, 13], [0, 1, 2, 3], 1000);
    expect(r.pValue).toBeLessThan(0.05);
  });
  it("finds a high p-value for identical groups", () => {
    const r = permutationTest([1, 2, 3, 4], [1, 2, 3, 4], 1000);
    expect(r.pValue).toBeGreaterThan(0.2);
  });
  it("is reproducible with a fixed seed", () => {
    const a = permutationTest([1, 5, 2], [3, 1, 4], 500, 7);
    const b = permutationTest([1, 5, 2], [3, 1, 4], 500, 7);
    expect(a.pValue).toBe(b.pValue);
  });
});

describe("multiple-comparison correction (#1015)", () => {
  it("Bonferroni scales by the number of tests", () => {
    const r = bonferroni([0.01, 0.04], 0.05);
    expect(r[0].adjusted).toBeCloseTo(0.02, 5);
    expect(r[1].adjusted).toBeCloseTo(0.08, 5);
    expect(r[1].significant).toBe(false);
  });
  it("BH-FDR is less conservative than Bonferroni", () => {
    const ps = [0.001, 0.01, 0.02, 0.04];
    const bh = benjaminiHochberg(ps, 0.05);
    const bonf = bonferroni(ps, 0.05);
    const bhSig = bh.filter((r) => r.significant).length;
    const bonfSig = bonf.filter((r) => r.significant).length;
    expect(bhSig).toBeGreaterThanOrEqual(bonfSig);
  });
});

describe("propensity matching (#1016)", () => {
  it("matches treated to nearest control and estimates ATT", () => {
    const r = propensityMatch([
      { id: "t1", treated: true, propensity: 0.5, outcome: 0.8 },
      { id: "c1", treated: false, propensity: 0.52, outcome: 0.5 },
      { id: "c2", treated: false, propensity: 0.9, outcome: 0.4 },
    ]);
    expect(r.pairs[0].controlId).toBe("c1");
    expect(r.att).toBeCloseTo(0.3, 4);
  });
});

describe("regression discontinuity (#1017)", () => {
  it("detects a jump at the cutoff", () => {
    // y = 0.1*x below cutoff(0); y = 0.1*x + 0.5 at/above cutoff
    const points = [];
    for (let x = -5; x < 0; x++) points.push({ x, y: 0.1 * x });
    for (let x = 0; x <= 5; x++) points.push({ x, y: 0.1 * x + 0.5 });
    const r = regressionDiscontinuity(points, 0, 5);
    expect(r.estimate).toBeCloseTo(0.5, 2);
  });
});
