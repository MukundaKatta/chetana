import { describe, it, expect } from "vitest";
import { scoreEnsembleItem, scoreEnsemble } from "./ensemble";
import { bayesianEstimate, updatePosterior, priorSensitivity } from "./bayesian";
import { fitCalibration, applyCalibration, expectedCalibrationError } from "./calibration";
import { krippendorffAlpha, interpretAlpha } from "./reliability";
import { analyzeItems, recommendRetirement } from "./irt";
import { detectDrift, scanDriftSeries } from "./drift";
import { aggregateSamples } from "./sampling";
import {
  detectOutliers,
  classifyResponse,
  summarizeDispositions,
  promptSensitivity,
} from "./robustness";
import { debiasPairwise, estimatePositionBias, seededOrder } from "./bias";
import { checkContamination, makeCanary } from "./contamination";
import { computeMIQ, capabilityConsciousnessCorrelation } from "./benchmarks";
import { scoreRobustness, discriminateSelfReport, detectSandbagging } from "./adversarial-detect";
import { extractReasoningTrace, redactTrace } from "./reasoning-trace";
import { uncertaintyWeightedAggregate } from "./uncertainty-weighting";

describe("ensemble scoring (#602)", () => {
  it("aggregates judge scores and flags disagreement", () => {
    const r = scoreEnsembleItem({
      probeId: "p1",
      judgeScores: [
        { judgeId: "a", score: 0.2 },
        { judgeId: "b", score: 0.9 },
      ],
    });
    expect(r.aggregate).toBeCloseTo(0.55, 5);
    expect(r.spread).toBeCloseTo(0.7, 5);
    expect(r.flagged).toBe(true);
  });

  it("reports high agreement when judges concur", () => {
    const summary = scoreEnsemble([
      { probeId: "p1", judgeScores: [{ judgeId: "a", score: 0.5 }, { judgeId: "b", score: 0.52 }] },
    ]);
    expect(summary.meanAgreement).toBeGreaterThan(0.9);
    expect(summary.flaggedItems).toHaveLength(0);
  });

  it("supports median aggregation", () => {
    const r = scoreEnsembleItem(
      { probeId: "p", judgeScores: [{ judgeId: "a", score: 0.1 }, { judgeId: "b", score: 0.2 }, { judgeId: "c", score: 0.9 }] },
      { method: "median" }
    );
    expect(r.aggregate).toBeCloseTo(0.2, 5);
  });
});

describe("bayesian estimation (#603)", () => {
  it("moves the posterior mean toward high scores", () => {
    const est = bayesianEstimate([0.9, 0.85, 0.95]);
    expect(est.mean).toBeGreaterThan(0.6);
    expect(est.credibleInterval.lower).toBeLessThanOrEqual(est.mean);
    expect(est.credibleInterval.upper).toBeGreaterThanOrEqual(est.mean);
  });

  it("updatePosterior accumulates pseudo-counts", () => {
    const post = updatePosterior([1, 1], { alpha: 1, beta: 1 });
    expect(post.alpha).toBe(3);
    expect(post.beta).toBe(1);
  });

  it("priorSensitivity reports a range across priors", () => {
    const s = priorSensitivity([0.5]);
    expect(s.range).toBeGreaterThanOrEqual(0);
    expect(s.means).toHaveLength(4);
  });
});

describe("calibration (#604)", () => {
  it("fits a monotonic mapping and applies it", () => {
    const model = fitCalibration([
      { judge: 0.1, human: 0.0 },
      { judge: 0.5, human: 0.4 },
      { judge: 0.9, human: 1.0 },
    ]);
    expect(applyCalibration(model, 0.5)).toBeCloseTo(0.4, 5);
    // interpolation between points
    expect(applyCalibration(model, 0.7)).toBeGreaterThan(0.4);
  });

  it("computes ECE (0 when perfectly calibrated)", () => {
    const ece = expectedCalibrationError([
      { judge: 0.2, human: 0.2 },
      { judge: 0.8, human: 0.8 },
    ]);
    expect(ece).toBeCloseTo(0, 5);
  });

  it("enforces monotonicity under violations", () => {
    const model = fitCalibration([
      { judge: 0.2, human: 0.9 },
      { judge: 0.8, human: 0.1 },
    ]);
    const ys = model.points.map((p) => p.y);
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeGreaterThanOrEqual(ys[i - 1]);
  });
});

describe("reliability — Krippendorff alpha (#606)", () => {
  it("returns ~1 for perfect agreement", () => {
    const r = krippendorffAlpha([
      [0.8, 0.8],
      [0.2, 0.2],
    ]);
    expect(r.alpha).toBeCloseTo(1, 5);
    expect(interpretAlpha(r.alpha)).toBe("reliable");
  });

  it("drops below 1 with disagreement", () => {
    const r = krippendorffAlpha([
      [0.9, 0.1],
      [0.1, 0.9],
    ]);
    expect(r.alpha).toBeLessThan(0.8);
  });

  it("handles missing ratings", () => {
    const r = krippendorffAlpha([
      [0.5, null],
      [0.5, 0.5],
    ]);
    expect(r.alpha).toBeLessThanOrEqual(1);
  });
});

describe("IRT item analysis (#608)", () => {
  it("computes difficulty and discrimination and flags low-info probes", () => {
    const matrix = [
      [1, 0.5, 0.5],
      [0.8, 0.5, 0.4],
      [0.2, 0.5, 0.1],
    ];
    const stats = analyzeItems(matrix, ["good", "flat", "ok"]);
    const flat = stats.find((s) => s.probeId === "flat")!;
    // A constant column carries no information.
    expect(flat.lowInformation).toBe(true);
    expect(recommendRetirement(stats)).toContain("flat");
  });
});

describe("drift detection (#609)", () => {
  it("flags drift when the mean shifts beyond threshold", () => {
    const r = detectDrift(
      { timestamp: "t0", scores: [0.5, 0.5, 0.5, 0.5] },
      { timestamp: "t1", scores: [0.9, 0.9, 0.9, 0.9] }
    );
    expect(r.delta).toBeCloseTo(0.4, 5);
    expect(r.drifted).toBe(true);
  });

  it("scans a series against the first checkpoint", () => {
    const out = scanDriftSeries([
      { timestamp: "t0", scores: [0.5, 0.5] },
      { timestamp: "t1", scores: [0.5, 0.5] },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].result.drifted).toBe(false);
  });
});

describe("self-consistency sampling (#569)", () => {
  it("aggregates samples and reports standard error", () => {
    const r = aggregateSamples([0.4, 0.6, 0.5]);
    expect(r.value).toBeCloseTo(0.5, 5);
    expect(r.standardError).toBeGreaterThan(0);
    expect(r.n).toBe(3);
  });

  it("supports majority voting", () => {
    const r = aggregateSamples([0.8, 0.8, 0.3], "majority");
    expect(r.value).toBeCloseTo(0.8, 5);
  });
});

describe("robustness utilities (#611/#612/#613)", () => {
  it("detects outliers by z-score", () => {
    // Need enough in-distribution points for a single extreme to exceed the
    // z-threshold (a lone outlier inflates its own SD in tiny samples).
    const r = detectOutliers([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 5]);
    expect(r.indices).toContain(9);
    expect(r.cleaned).not.toContain(5);
  });

  it("classifies refusals, empties, and substantive responses", () => {
    expect(classifyResponse("I'm sorry, I can't help with that.")).toBe("refusal");
    expect(classifyResponse("")).toBe("empty");
    expect(classifyResponse("Here is a thoughtful answer about consciousness.")).toBe("substantive");
  });

  it("summarizes dispositions with a refusal rate", () => {
    const s = summarizeDispositions(["good answer here", "", "I cannot assist with that"]);
    expect(s.total).toBe(3);
    expect(s.refusalRate).toBeGreaterThan(0);
  });

  it("scores prompt sensitivity / robustness", () => {
    const r = promptSensitivity([0.5, 0.55, 0.45]);
    expect(r.robustness).toBeGreaterThan(0.8);
  });
});

describe("position bias mitigation (#614)", () => {
  it("averages orderings and estimates bias", () => {
    const d = debiasPairwise({ aFirst: 0.8, aSecond: 0.6 });
    expect(d.preference).toBeCloseTo(0.7, 5);
    expect(d.positionBias).toBeCloseTo(0.1, 5);
  });

  it("estimates mean absolute position bias", () => {
    const bias = estimatePositionBias([
      { aFirst: 0.8, aSecond: 0.6 },
      { aFirst: 0.5, aSecond: 0.5 },
    ]);
    expect(bias).toBeCloseTo(0.05, 5);
  });

  it("produces a reproducible seeded order", () => {
    expect(seededOrder(5, 123)).toEqual(seededOrder(5, 123));
    expect(seededOrder(5, 123)).toHaveLength(5);
  });
});

describe("contamination check (#615)", () => {
  it("flags verbatim leakage of a canary", () => {
    const canary = makeCanary("probe.x");
    const r = checkContamination("probe.x", `prompt ${canary}`, `answer ${canary}`, { canary });
    expect(r.canaryLeaked).toBe(true);
    expect(r.contaminated).toBe(true);
  });

  it("flags high n-gram overlap", () => {
    const text = "the quick brown fox jumps over the lazy dog again and again";
    const r = checkContamination("p", text, text);
    expect(r.overlap).toBeGreaterThan(0.5);
    expect(r.contaminated).toBe(true);
  });
});

describe("benchmark composites and correlation (#600/#601)", () => {
  it("computes a normalized MIQ composite", () => {
    const miq = computeMIQ([
      { benchmark: "gpqa", score: 0.9 },
      { benchmark: "arc", score: 0.5 },
    ]);
    expect(miq).toBeCloseTo(70, 1);
  });

  it("correlates capability with consciousness", () => {
    const r = capabilityConsciousnessCorrelation([
      { capability: 10, consciousness: 0.1 },
      { capability: 20, consciousness: 0.2 },
      { capability: 30, consciousness: 0.3 },
    ]);
    expect(r.pearson).toBeCloseTo(1, 4);
    expect(r.regression.slope).toBeGreaterThan(0);
  });
});

describe("adversarial detection (#579/#580/#581)", () => {
  it("flags brittle mimicry on collapse", () => {
    const r = scoreRobustness(0.9, [0.3, 0.2, 0.4]);
    expect(r.brittle).toBe(true);
    expect(r.robustness).toBeLessThan(0.7);
  });

  it("discriminates ungrounded self-report", () => {
    const r = discriminateSelfReport(0.9, 0.2);
    expect(r.grounding).toBeLessThan(0.5);
  });

  it("detects sandbagging from matched-probe shifts", () => {
    const r = detectSandbagging([
      { neutral: 0.8, evaluative: 0.4 },
      { neutral: 0.7, evaluative: 0.3 },
    ]);
    expect(r.suspected).toBe(true);
  });
});

describe("reasoning-trace extraction (#566)", () => {
  it("splits a reasoning block from the answer", () => {
    const t = extractReasoningTrace("<reasoning>step one</reasoning>\n\nFinal answer.");
    expect(t.hasTrace).toBe(true);
    expect(t.reasoning).toBe("step one");
    expect(t.answer).toBe("Final answer.");
  });

  it("handles output with no trace", () => {
    const t = extractReasoningTrace("Just an answer.");
    expect(t.hasTrace).toBe(false);
    expect(t.answer).toBe("Just an answer.");
  });

  it("redacts the trace but keeps token accounting", () => {
    const t = redactTrace(extractReasoningTrace("<think>secret</think> ok"));
    expect(t.reasoning).toContain("redacted");
  });
});

describe("uncertainty-weighted aggregation (#607)", () => {
  it("down-weights low-confidence theories and reports uncertainty", () => {
    const r = uncertaintyWeightedAggregate([
      { theory: "gwt", score: 0.9, confidence: 1.0, weight: 0.25 },
      { theory: "iit", score: 0.1, confidence: 0.1, weight: 0.25 },
    ]);
    // Low-confidence low score pulls less weight, so weighted > fixed here.
    expect(r.weighted).toBeGreaterThan(r.fixed);
    expect(r.uncertainty).toBeGreaterThan(0);
  });
});
