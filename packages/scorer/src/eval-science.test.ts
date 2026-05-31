import { describe, it, expect } from "vitest";
import {
  sprt, leaveOneIndicatorOut, judgeSwapRobustness, noiseRobustness,
  shapleyValues, causalMediation, itemInformation, selectNextItem, activeLearningSelect,
} from "./eval-science";

describe("SPRT (#812)", () => {
  it("accepts H1 under strong evidence for p1", () => {
    const r = sprt(Array(40).fill(1), 0.3, 0.7);
    expect(r.decision).toBe("accept-h1");
    expect(r.atStep).toBeLessThanOrEqual(40);
  });
  it("accepts H0 under evidence for p0", () => {
    expect(sprt(Array(40).fill(0), 0.3, 0.7).decision).toBe("accept-h0");
  });
  it("continues without enough evidence", () => {
    expect(sprt([1, 0], 0.4, 0.6).decision).toBe("continue");
  });
});

describe("leave-one-indicator-out (#813)", () => {
  it("ranks the most influential indicator first", () => {
    const r = leaveOneIndicatorOut(
      { a: 0.9, b: 0.5, c: 0.5 },
      { a: 0.5, b: 0.25, c: 0.25 }
    );
    expect(r.influences[0].indicatorId).toBe("a");
    expect(r.influences[0].influence).toBeGreaterThan(0);
  });
});

describe("judge-swap robustness (#814)", () => {
  it("reports high correlation when judges agree on ordering", () => {
    const r = judgeSwapRobustness({
      j1: { a: 0.1, b: 0.5, c: 0.9 },
      j2: { a: 0.15, b: 0.55, c: 0.85 },
    });
    expect(r.meanRankCorrelation).toBeGreaterThan(0.9);
    expect(r.flagged).toHaveLength(0);
  });
  it("flags indicators with large cross-judge spread", () => {
    const r = judgeSwapRobustness({ j1: { a: 0.1 }, j2: { a: 0.8 } });
    expect(r.flagged).toContain("a");
  });
});

describe("noise robustness (#815)", () => {
  it("returns 1 robustness with no degradation", () => {
    expect(noiseRobustness([{ level: 0, score: 0.8 }, { level: 1, score: 0.8 }]).robustness).toBeCloseTo(1, 5);
  });
  it("reports the max drop", () => {
    const r = noiseRobustness([{ level: 0, score: 0.8 }, { level: 1, score: 0.4 }]);
    expect(r.maxDrop).toBeCloseTo(0.4, 5);
    expect(r.robustness).toBeLessThan(1);
  });
});

describe("Shapley values (#809)", () => {
  it("attributes an additive value function exactly", () => {
    // value = sum of fixed contributions
    const contrib: Record<string, number> = { a: 0.5, b: 0.3, c: 0.2 };
    const value = (coalition: string[]) => coalition.reduce((s, p) => s + contrib[p], 0);
    const phi = shapleyValues(["a", "b", "c"], value);
    expect(phi.a).toBeCloseTo(0.5, 4);
    expect(phi.b).toBeCloseTo(0.3, 4);
    expect(phi.c).toBeCloseTo(0.2, 4);
    // Efficiency: sum of Shapley values equals grand-coalition value.
    expect(phi.a + phi.b + phi.c).toBeCloseTo(1.0, 4);
  });
});

describe("causal mediation (#808)", () => {
  it("decomposes total into direct and indirect", () => {
    const r = causalMediation(0.6, 0.2);
    expect(r.indirectEffect).toBeCloseTo(0.4, 5);
    expect(r.proportionMediated).toBeCloseTo(0.6667, 3);
  });
});

describe("adaptive testing (#804)", () => {
  it("information peaks when difficulty matches ability", () => {
    const item = { id: "x", a: 1.5, b: 0.0 };
    expect(itemInformation(item, 0)).toBeGreaterThan(itemInformation(item, 2));
  });
  it("selects the most informative unused item", () => {
    const items = [
      { id: "easy", a: 1, b: -2 },
      { id: "match", a: 1.5, b: 0 },
      { id: "hard", a: 1, b: 2 },
    ];
    expect(selectNextItem(items, 0)!.id).toBe("match");
    expect(selectNextItem(items, 0, ["match"])!.id).not.toBe("match");
  });
});

describe("active-learning selection (#806)", () => {
  it("selects highest-uncertainty indicators within budget", () => {
    const sel = activeLearningSelect({ a: 0.1, b: 0.9, c: 0.5 }, 2);
    expect(sel).toEqual(["b", "c"]);
  });
});
