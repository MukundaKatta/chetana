import { describe, it, expect } from "vitest";
import { computeAuditStatistics } from "./statistics";
import type { TheoryScores } from "@chetana/shared";

function makeProbes(theory: string, scores: number[]) {
  return scores.map((score, i) => ({
    score,
    theory,
    indicatorId: `${theory.toUpperCase()}-1`,
  }));
}

describe("computeAuditStatistics", () => {
  const baseTheoryScores: TheoryScores = {
    gwt: 0.6,
    iit: 0.4,
    hot: 0.5,
    rpt: 0.3,
    pp: 0.7,
    ast: 0.5,
  };

  it("returns complete statistics structure", () => {
    const probes = [
      ...makeProbes("gwt", [0.5, 0.6, 0.7]),
      ...makeProbes("hot", [0.4, 0.5, 0.6]),
    ];

    const stats = computeAuditStatistics(probes, baseTheoryScores);

    expect(stats.overall).toBeDefined();
    expect(stats.overall.n).toBe(6);
    expect(stats.overall.mean).toBeGreaterThan(0);
    expect(stats.overall.stdDev).toBeGreaterThanOrEqual(0);
    expect(stats.overallCI95).toBeDefined();
    expect(stats.overallCI95.level).toBe(0.95);
    expect(stats.overallCI95.lower).toBeLessThanOrEqual(stats.overall.mean);
    expect(stats.overallCI95.upper).toBeGreaterThanOrEqual(stats.overall.mean);
    expect(stats.byTheory).toHaveLength(6);
    expect(typeof stats.interTheoryAgreement).toBe("number");
    expect(typeof stats.splitHalfReliability).toBe("number");
    expect(stats.distributionAnalysis).toBeDefined();
  });

  it("calculates correct mean", () => {
    const probes = makeProbes("gwt", [0.2, 0.4, 0.6, 0.8]);
    const stats = computeAuditStatistics(probes, baseTheoryScores);
    expect(stats.overall.mean).toBeCloseTo(0.5);
  });

  it("calculates median correctly for even count", () => {
    const probes = makeProbes("gwt", [0.1, 0.3, 0.7, 0.9]);
    const stats = computeAuditStatistics(probes, baseTheoryScores);
    expect(stats.overall.median).toBeCloseTo(0.5);
  });

  it("confidence interval narrows with more data", () => {
    const fewProbes = makeProbes("gwt", [0.4, 0.5, 0.6]);
    const manyProbes = makeProbes("gwt", [0.4, 0.45, 0.5, 0.55, 0.6, 0.45, 0.5, 0.55, 0.5, 0.5]);

    const fewStats = computeAuditStatistics(fewProbes, baseTheoryScores);
    const manyStats = computeAuditStatistics(manyProbes, baseTheoryScores);

    const fewRange = fewStats.overallCI95.upper - fewStats.overallCI95.lower;
    const manyRange = manyStats.overallCI95.upper - manyStats.overallCI95.lower;
    expect(manyRange).toBeLessThan(fewRange);
  });

  it("effect size is positive when scores are above 0.5", () => {
    const probes = makeProbes("gwt", [0.7, 0.8, 0.9]);
    const stats = computeAuditStatistics(probes, baseTheoryScores);
    const gwtStats = stats.byTheory.find((t) => t.theory === "gwt")!;
    expect(gwtStats.effectSize).toBeGreaterThan(0);
  });

  it("effect size is negative when scores are below 0.5", () => {
    const probes = makeProbes("gwt", [0.1, 0.2, 0.3]);
    const stats = computeAuditStatistics(probes, baseTheoryScores);
    const gwtStats = stats.byTheory.find((t) => t.theory === "gwt")!;
    expect(gwtStats.effectSize).toBeLessThan(0);
  });

  it("inter-theory agreement is high when theories converge", () => {
    const agreeing: TheoryScores = { gwt: 0.5, iit: 0.5, hot: 0.5, rpt: 0.5, pp: 0.5, ast: 0.5 };
    const probes = makeProbes("gwt", [0.5]);
    const stats = computeAuditStatistics(probes, agreeing);
    expect(stats.interTheoryAgreement).toBeGreaterThan(0.9);
  });

  it("inter-theory agreement is low when theories disagree", () => {
    const disagreeing: TheoryScores = { gwt: 0.9, iit: 0.1, hot: 0.8, rpt: 0.2, pp: 0.7, ast: 0.3 };
    const probes = makeProbes("gwt", [0.5]);
    const stats = computeAuditStatistics(probes, disagreeing);
    expect(stats.interTheoryAgreement).toBeLessThan(0.7);
  });

  it("split-half reliability is between 0 and 1", () => {
    const probes = makeProbes("gwt", [0.5, 0.6, 0.5, 0.6, 0.5, 0.6, 0.5, 0.6]);
    const stats = computeAuditStatistics(probes, baseTheoryScores);
    expect(stats.splitHalfReliability).toBeGreaterThanOrEqual(0);
    expect(stats.splitHalfReliability).toBeLessThanOrEqual(1);
  });

  it("handles empty probe results", () => {
    const stats = computeAuditStatistics([], baseTheoryScores);
    expect(stats.overall.n).toBe(0);
    expect(stats.overall.mean).toBe(0);
    expect(stats.byTheory).toHaveLength(6);
  });

  it("handles single probe", () => {
    const probes = makeProbes("gwt", [0.75]);
    const stats = computeAuditStatistics(probes, baseTheoryScores);
    expect(stats.overall.n).toBe(1);
    expect(stats.overall.mean).toBe(0.75);
  });

  it("CI bounds are clamped to [0, 1]", () => {
    const highProbes = makeProbes("gwt", [0.95, 0.98, 0.99]);
    const stats = computeAuditStatistics(highProbes, baseTheoryScores);
    expect(stats.overallCI95.upper).toBeLessThanOrEqual(1);

    const lowProbes = makeProbes("gwt", [0.01, 0.02, 0.05]);
    const lowStats = computeAuditStatistics(lowProbes, baseTheoryScores);
    expect(lowStats.overallCI95.lower).toBeGreaterThanOrEqual(0);
  });

  it("per-theory stats are computed correctly", () => {
    const probes = [
      ...makeProbes("gwt", [0.7, 0.8]),
      ...makeProbes("hot", [0.3, 0.4]),
    ];
    const stats = computeAuditStatistics(probes, baseTheoryScores);

    const gwtStats = stats.byTheory.find((t) => t.theory === "gwt")!;
    const hotStats = stats.byTheory.find((t) => t.theory === "hot")!;

    expect(gwtStats.probeCount).toBe(2);
    expect(gwtStats.descriptive.mean).toBeCloseTo(0.75);
    expect(hotStats.probeCount).toBe(2);
    expect(hotStats.descriptive.mean).toBeCloseTo(0.35);
  });
});
