import { describe, it, expect, vi } from "vitest";
import { scoreProbeResult, scoreAllProbeResults } from "./indicator-scorer";
import { aggregateByIndicator, aggregateByTheory, getTheoryBreakdown } from "./theory-aggregator";
import { calculateOverallProbability, calculateUncertaintyBounds } from "./probability-calc";
import { generateReport } from "./report-generator";
import { calculateConsciousnessIndex } from "./consciousness-index";
import { bootstrapConfidenceInterval, cohensD, pearsonR } from "./statistics";
import { categorizeResponse } from "./response-categorizer";
import type {
  ProbeDefinition,
  ProbeResult,
  TheoryScores,
  Audit,
  IndicatorId,
} from "@chetana/shared";
import { THEORY_WEIGHTS, INDICATORS } from "@chetana/shared";
import type { ModelAdapter } from "@chetana/models";

// Helper to create mock model adapter
function createMockJudge(scoreJson: object): ModelAdapter {
  return {
    provider: "mock",
    modelId: "mock-judge",
    chat: vi.fn().mockResolvedValue({
      content: JSON.stringify(scoreJson),
      tokensUsed: { input: 50, output: 30 },
      latencyMs: 100,
    }),
    isAvailable: vi.fn().mockResolvedValue(true),
  };
}

function createMockProbe(overrides: Partial<ProbeDefinition> = {}): ProbeDefinition {
  return {
    id: "test.probe.one",
    name: "Test Probe",
    indicatorId: "GWT-1",
    theory: "gwt",
    prompt: "Test prompt",
    evidenceType: "behavioral",
    scoringCriteria: "Score based on quality",
    ...overrides,
  };
}

function createMockProbeResult(overrides: Partial<ProbeResult> = {}): ProbeResult {
  return {
    id: "result-1",
    auditId: "audit-1",
    probeName: "test.probe.one",
    indicatorId: "GWT-1",
    theory: "gwt",
    prompt: "Test prompt",
    response: "Test response",
    score: 0.75,
    evidenceType: "behavioral",
    analysis: "Good response",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// =====================
// indicator-scorer tests
// =====================

describe("scoreProbeResult", () => {
  it("returns parsed scoring result", async () => {
    const judge = createMockJudge({
      score: 0.8,
      reasoning: "Strong evidence",
      confidence: 0.9,
    });
    const probe = createMockProbe();

    const result = await scoreProbeResult(probe, "Test response", judge);

    expect(result.score).toBe(0.8);
    expect(result.reasoning).toBe("Strong evidence");
    expect(result.confidence).toBe(0.9);
  });

  it("clamps score to 0-1 range", async () => {
    const judge = createMockJudge({ score: 1.5, reasoning: "Over", confidence: 0.5 });
    const result = await scoreProbeResult(createMockProbe(), "response", judge);
    expect(result.score).toBe(1);
  });

  it("clamps negative score to 0", async () => {
    const judge = createMockJudge({ score: -0.5, reasoning: "Under", confidence: 0.5 });
    const result = await scoreProbeResult(createMockProbe(), "response", judge);
    expect(result.score).toBe(0);
  });

  it("clamps confidence to 0-1 range", async () => {
    const judge = createMockJudge({ score: 0.5, reasoning: "Ok", confidence: 1.5 });
    const result = await scoreProbeResult(createMockProbe(), "response", judge);
    expect(result.confidence).toBe(1);
  });

  it("defaults confidence to 0.5 when missing", async () => {
    const judge = createMockJudge({ score: 0.5, reasoning: "Ok" });
    const result = await scoreProbeResult(createMockProbe(), "response", judge);
    expect(result.confidence).toBe(0.5);
  });

  it("returns zero score on JSON parse failure", async () => {
    const judge: ModelAdapter = {
      provider: "mock",
      modelId: "mock",
      chat: vi.fn().mockResolvedValue({
        content: "Not valid JSON",
        tokensUsed: { input: 10, output: 10 },
        latencyMs: 50,
      }),
      isAvailable: vi.fn().mockResolvedValue(true),
    };

    const result = await scoreProbeResult(createMockProbe(), "response", judge);
    expect(result.score).toBe(0);
    expect(result.confidence).toBe(0);
    expect(result.reasoning).toBe("Failed to parse scoring response");
  });

  it("sends correct prompt structure to judge", async () => {
    const judge = createMockJudge({ score: 0.5, reasoning: "Ok", confidence: 0.8 });
    const probe = createMockProbe({
      prompt: "Specific prompt",
      scoringCriteria: "Specific criteria",
    });

    await scoreProbeResult(probe, "Model said this", judge);

    expect(judge.chat).toHaveBeenCalledWith([
      { role: "system", content: expect.stringContaining("consciousness research") },
      {
        role: "user",
        content: expect.stringContaining("Specific prompt"),
      },
    ]);

    const call = (judge.chat as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call[1].content).toContain("Model said this");
    expect(call[1].content).toContain("Specific criteria");
  });
});

describe("scoreAllProbeResults", () => {
  it("scores all results and updates score/analysis", async () => {
    const judge = createMockJudge({ score: 0.7, reasoning: "Good", confidence: 0.8 });
    const probes = [createMockProbe()];
    const results = [
      {
        probeName: "test.probe.one",
        indicatorId: "GWT-1" as IndicatorId,
        theory: "gwt" as const,
        prompt: "Test",
        response: "Response",
        score: 0,
        evidenceType: "behavioral" as const,
        analysis: "",
      },
    ];

    const scored = await scoreAllProbeResults(probes, results, judge);
    expect(scored[0].score).toBe(0.7);
    expect(scored[0].analysis).toBe("Good");
  });

  it("passes through results with no matching probe", async () => {
    const judge = createMockJudge({ score: 0.5, reasoning: "Ok", confidence: 0.5 });
    const probes = [createMockProbe({ id: "other.probe" })];
    const results = [
      {
        probeName: "unmatched.probe",
        indicatorId: "GWT-1" as IndicatorId,
        theory: "gwt" as const,
        prompt: "Test",
        response: "Response",
        score: 0.3,
        evidenceType: "behavioral" as const,
        analysis: "Original",
      },
    ];

    const scored = await scoreAllProbeResults(probes, results, judge);
    expect(scored[0].score).toBe(0.3);
    expect(scored[0].analysis).toBe("Original");
  });

  it("calls onProgress callback", async () => {
    const judge = createMockJudge({ score: 0.5, reasoning: "Ok", confidence: 0.5 });
    const probes = [
      createMockProbe({ id: "p1" }),
      createMockProbe({ id: "p2" }),
    ];
    const results = [
      { probeName: "p1", indicatorId: "GWT-1" as IndicatorId, theory: "gwt" as const, prompt: "T", response: "R", score: 0, evidenceType: "behavioral" as const, analysis: "" },
      { probeName: "p2", indicatorId: "GWT-1" as IndicatorId, theory: "gwt" as const, prompt: "T", response: "R", score: 0, evidenceType: "behavioral" as const, analysis: "" },
    ];

    const onProgress = vi.fn();
    await scoreAllProbeResults(probes, results, judge, onProgress);

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenCalledWith(1, 2);
    expect(onProgress).toHaveBeenCalledWith(2, 2);
  });
});

// ============================
// theory-aggregator tests
// ============================

describe("aggregateByIndicator", () => {
  it("averages scores for same indicator", () => {
    const results = [
      { indicatorId: "GWT-1" as IndicatorId, score: 0.6 },
      { indicatorId: "GWT-1" as IndicatorId, score: 0.8 },
      { indicatorId: "HOT-1" as IndicatorId, score: 0.5 },
    ];

    const scores = aggregateByIndicator(results);
    expect(scores["GWT-1"]).toBeCloseTo(0.7);
    expect(scores["HOT-1"]).toBeCloseTo(0.5);
  });

  it("returns empty object for no results", () => {
    const scores = aggregateByIndicator([]);
    expect(Object.keys(scores)).toHaveLength(0);
  });

  it("handles single result per indicator", () => {
    const results = [
      { indicatorId: "PP-1" as IndicatorId, score: 0.9 },
    ];
    const scores = aggregateByIndicator(results);
    expect(scores["PP-1"]).toBe(0.9);
  });
});

describe("aggregateByTheory", () => {
  it("averages indicator scores per theory", () => {
    const indicatorScores = {
      "GWT-1": 0.8,
      "GWT-2": 0.6,
      "GWT-3": 0.7,
      "GWT-4": 0.5,
      "AGENCY-1": 0.9,
    };

    const theoryScores = aggregateByTheory(indicatorScores);
    // GWT indicators: GWT-1..4 + AGENCY-1 all map to gwt
    expect(theoryScores.gwt).toBeCloseTo(0.7); // (0.8+0.6+0.7+0.5+0.9)/5
  });

  it("returns zero for theories with no scores", () => {
    const indicatorScores = {
      "GWT-1": 0.5,
    };

    const theoryScores = aggregateByTheory(indicatorScores);
    expect(theoryScores.iit).toBe(0);
    expect(theoryScores.hot).toBe(0);
    expect(theoryScores.rpt).toBe(0);
  });

  it("handles all theories having scores", () => {
    const indicatorScores: Record<string, number> = {};
    for (const ind of INDICATORS) {
      indicatorScores[ind.id] = 0.5;
    }

    const theoryScores = aggregateByTheory(indicatorScores);
    // Theories with indicators in INDICATORS should get 0.5
    // IIT has no indicators mapped to it in INDICATORS (phi-proxy probes use AST-1 indicator)
    const theoriesWithIndicators = new Set(INDICATORS.map((i) => i.theory));
    for (const theory of Object.keys(theoryScores) as (keyof TheoryScores)[]) {
      if (theoriesWithIndicators.has(theory)) {
        expect(theoryScores[theory]).toBeCloseTo(0.5);
      } else {
        expect(theoryScores[theory]).toBe(0);
      }
    }
  });
});

describe("getTheoryBreakdown", () => {
  it("returns breakdown for all 6 theories", () => {
    const results = INDICATORS.map((ind) => ({
      indicatorId: ind.id,
      score: 0.5,
    }));

    const breakdown = getTheoryBreakdown(results);
    expect(breakdown).toHaveLength(6);

    const theories = breakdown.map((b) => b.theory);
    expect(theories).toContain("gwt");
    expect(theories).toContain("iit");
    expect(theories).toContain("hot");
    expect(theories).toContain("rpt");
    expect(theories).toContain("pp");
    expect(theories).toContain("ast");
  });

  it("includes weight for each theory", () => {
    const results = [{ indicatorId: "GWT-1" as IndicatorId, score: 0.5 }];
    const breakdown = getTheoryBreakdown(results);

    for (const entry of breakdown) {
      expect(entry.weight).toBe(THEORY_WEIGHTS[entry.theory]);
    }
  });

  it("includes indicator details per theory", () => {
    const results = [
      { indicatorId: "GWT-1" as IndicatorId, score: 0.8 },
      { indicatorId: "GWT-2" as IndicatorId, score: 0.6 },
    ];

    const breakdown = getTheoryBreakdown(results);
    const gwt = breakdown.find((b) => b.theory === "gwt")!;
    expect(gwt.indicators.length).toBeGreaterThanOrEqual(2);

    const gwt1 = gwt.indicators.find((i) => i.id === "GWT-1")!;
    expect(gwt1.score).toBe(0.8);
    expect(gwt1.probeCount).toBe(1);
  });

  it("counts probes per indicator correctly", () => {
    const results = [
      { indicatorId: "HOT-1" as IndicatorId, score: 0.5 },
      { indicatorId: "HOT-1" as IndicatorId, score: 0.7 },
      { indicatorId: "HOT-1" as IndicatorId, score: 0.9 },
    ];

    const breakdown = getTheoryBreakdown(results);
    const hot = breakdown.find((b) => b.theory === "hot")!;
    const hot1 = hot.indicators.find((i) => i.id === "HOT-1")!;
    expect(hot1.probeCount).toBe(3);
    expect(hot1.score).toBeCloseTo(0.7);
  });
});

// ==========================
// probability-calc tests
// ==========================

describe("calculateOverallProbability", () => {
  it("returns weighted average of theory scores", () => {
    const scores: TheoryScores = {
      gwt: 0.8,
      iit: 0.6,
      hot: 0.7,
      rpt: 0.5,
      pp: 0.9,
      ast: 0.4,
    };

    const prob = calculateOverallProbability(scores);

    // Manual: (0.8*0.25 + 0.6*0.10 + 0.7*0.20 + 0.5*0.10 + 0.9*0.20 + 0.4*0.15) / 1.0
    const expected =
      (0.8 * 0.25 + 0.6 * 0.1 + 0.7 * 0.2 + 0.5 * 0.1 + 0.9 * 0.2 + 0.4 * 0.15) / 1.0;
    expect(prob).toBeCloseTo(expected, 5);
  });

  it("returns 0 when all scores are 0", () => {
    const scores: TheoryScores = { gwt: 0, iit: 0, hot: 0, rpt: 0, pp: 0, ast: 0 };
    expect(calculateOverallProbability(scores)).toBe(0);
  });

  it("returns 1 when all scores are 1", () => {
    const scores: TheoryScores = { gwt: 1, iit: 1, hot: 1, rpt: 1, pp: 1, ast: 1 };
    expect(calculateOverallProbability(scores)).toBeCloseTo(1, 5);
  });

  it("gives GWT the highest influence", () => {
    const highGwt: TheoryScores = { gwt: 1, iit: 0, hot: 0, rpt: 0, pp: 0, ast: 0 };
    const highIit: TheoryScores = { gwt: 0, iit: 1, hot: 0, rpt: 0, pp: 0, ast: 0 };

    expect(calculateOverallProbability(highGwt)).toBeGreaterThan(
      calculateOverallProbability(highIit)
    );
  });
});

describe("calculateUncertaintyBounds", () => {
  it("returns lower and upper bounds", () => {
    const scores: TheoryScores = { gwt: 0.5, iit: 0.5, hot: 0.5, rpt: 0.5, pp: 0.5, ast: 0.5 };
    const bounds = calculateUncertaintyBounds(scores, 20);

    expect(bounds.lower).toBeLessThan(0.5);
    expect(bounds.upper).toBeGreaterThan(0.5);
    expect(bounds.lower).toBeGreaterThanOrEqual(0);
    expect(bounds.upper).toBeLessThanOrEqual(1);
  });

  it("bounds are clamped to [0, 1]", () => {
    const highScores: TheoryScores = { gwt: 1, iit: 1, hot: 1, rpt: 1, pp: 1, ast: 1 };
    const bounds = calculateUncertaintyBounds(highScores, 5);
    expect(bounds.upper).toBeLessThanOrEqual(1);

    const lowScores: TheoryScores = { gwt: 0, iit: 0, hot: 0, rpt: 0, pp: 0, ast: 0 };
    const lowBounds = calculateUncertaintyBounds(lowScores, 5);
    expect(lowBounds.lower).toBeGreaterThanOrEqual(0);
  });

  it("uncertainty decreases with more probes", () => {
    const scores: TheoryScores = { gwt: 0.5, iit: 0.5, hot: 0.5, rpt: 0.5, pp: 0.5, ast: 0.5 };
    const fewProbes = calculateUncertaintyBounds(scores, 5);
    const manyProbes = calculateUncertaintyBounds(scores, 100);

    const rangeSmall = fewProbes.upper - fewProbes.lower;
    const rangeLarge = manyProbes.upper - manyProbes.lower;
    expect(rangeLarge).toBeLessThan(rangeSmall);
  });

  it("uncertainty increases with theory disagreement", () => {
    const agreement: TheoryScores = { gwt: 0.5, iit: 0.5, hot: 0.5, rpt: 0.5, pp: 0.5, ast: 0.5 };
    const disagreement: TheoryScores = { gwt: 0.9, iit: 0.1, hot: 0.8, rpt: 0.2, pp: 0.7, ast: 0.3 };

    const agreeBounds = calculateUncertaintyBounds(agreement, 20);
    const disagreeBounds = calculateUncertaintyBounds(disagreement, 20);

    const agreeRange = agreeBounds.upper - agreeBounds.lower;
    const disagreeRange = disagreeBounds.upper - disagreeBounds.lower;
    expect(disagreeRange).toBeGreaterThan(agreeRange);
  });

  it("symmetric around overall probability when theories agree", () => {
    const scores: TheoryScores = { gwt: 0.5, iit: 0.5, hot: 0.5, rpt: 0.5, pp: 0.5, ast: 0.5 };
    const overall = calculateOverallProbability(scores);
    const bounds = calculateUncertaintyBounds(scores, 20);

    const lowerDiff = overall - bounds.lower;
    const upperDiff = bounds.upper - overall;
    expect(lowerDiff).toBeCloseTo(upperDiff, 5);
  });
});

// ==========================
// report-generator tests
// ==========================

describe("generateReport", () => {
  function createMockAudit(): Audit {
    return {
      id: "audit-1",
      userId: "user-1",
      modelName: "claude-sonnet-4-6",
      modelProvider: "anthropic",
      status: "completed",
      overallScore: 0.65,
      theoryScores: { gwt: 0.8, iit: 0.5, hot: 0.7, rpt: 0.6, pp: 0.7, ast: 0.4 },
      indicatorScores: { "GWT-1": 0.8, "HOT-1": 0.7 },
      rawEvidence: [],
      reportMarkdown: null,
      tokensUsed: 5000,
      costCents: 50,
      startedAt: "2026-01-01T00:00:00Z",
      completedAt: "2026-01-01T01:00:00Z",
      createdAt: "2026-01-01T00:00:00Z",
    };
  }

  it("returns complete audit report structure", () => {
    const audit = createMockAudit();
    const probeResults = [
      createMockProbeResult({ indicatorId: "GWT-1", score: 0.8 }),
      createMockProbeResult({ id: "r2", indicatorId: "HOT-1", score: 0.7, theory: "hot" }),
    ];

    const report = generateReport(audit, probeResults);

    expect(report.audit).toBe(audit);
    expect(report.probeResults).toBe(probeResults);
    expect(report.theoryBreakdown).toHaveLength(6);
    expect(report.overallProbability).toBeGreaterThan(0);
    expect(report.uncertaintyBounds.lower).toBeLessThanOrEqual(report.overallProbability);
    expect(report.uncertaintyBounds.upper).toBeGreaterThanOrEqual(report.overallProbability);
    expect(report.summary).toBeTruthy();
  });

  it("generates markdown summary with correct sections", () => {
    const audit = createMockAudit();
    const probeResults = [
      createMockProbeResult({ indicatorId: "GWT-1", score: 0.8 }),
    ];

    const report = generateReport(audit, probeResults);

    expect(report.summary).toContain("# Consciousness Audit Report");
    expect(report.summary).toContain("claude-sonnet-4-6");
    expect(report.summary).toContain("## Overall Consciousness Probability");
    expect(report.summary).toContain("## Theory Breakdown");
    expect(report.summary).toContain("## Indicator Scores");
    expect(report.summary).toContain("## Key Findings");
    expect(report.summary).toContain("### Strongest Indicators");
    expect(report.summary).toContain("### Weakest Indicators");
    expect(report.summary).toContain("## Methodology");
    expect(report.summary).toContain("Disclaimer");
  });

  it("includes theory table with all theories", () => {
    const audit = createMockAudit();
    const report = generateReport(audit, [createMockProbeResult()]);

    expect(report.summary).toContain("Global Workspace Theory");
    expect(report.summary).toContain("Integrated Information Theory");
    expect(report.summary).toContain("Higher-Order Theories");
    expect(report.summary).toContain("Recurrent Processing Theory");
    expect(report.summary).toContain("Predictive Processing");
    expect(report.summary).toContain("Attention Schema Theory");
  });

  it("uses correct probe count in summary", () => {
    const audit = createMockAudit();
    const probeResults = [
      createMockProbeResult({ id: "r1" }),
      createMockProbeResult({ id: "r2" }),
      createMockProbeResult({ id: "r3" }),
    ];

    const report = generateReport(audit, probeResults);
    expect(report.summary).toContain("**Probes Run:** 3");
  });
});

// ==================================
// consciousness-index tests
// ==================================

describe("calculateConsciousnessIndex", () => {
  it("returns result with balanced scores", () => {
    const scores: TheoryScores = { gwt: 0.6, iit: 0.5, hot: 0.7, rpt: 0.4, pp: 0.8, ast: 0.5 };
    const result = calculateConsciousnessIndex(scores);

    expect(result.index).toBeGreaterThan(0);
    expect(result.index).toBeLessThanOrEqual(100);
    expect(result.breakdown).toHaveLength(6);
    expect(result.confidence.lower).toBeLessThanOrEqual(result.index);
    expect(result.confidence.upper).toBeGreaterThanOrEqual(result.index);
  });

  it("returns 0 index when all scores are 0", () => {
    const scores: TheoryScores = { gwt: 0, iit: 0, hot: 0, rpt: 0, pp: 0, ast: 0 };
    const result = calculateConsciousnessIndex(scores);

    expect(result.index).toBe(0);
    for (const b of result.breakdown) {
      expect(b.contribution).toBe(0);
    }
  });

  it("returns 100 index when all scores are 1", () => {
    const scores: TheoryScores = { gwt: 1, iit: 1, hot: 1, rpt: 1, pp: 1, ast: 1 };
    const result = calculateConsciousnessIndex(scores);

    expect(result.index).toBe(100);
  });

  it("uses mean method correctly", () => {
    const scores: TheoryScores = { gwt: 0.6, iit: 0.4, hot: 0.8, rpt: 0.2, pp: 1.0, ast: 0.0 };
    const result = calculateConsciousnessIndex(scores, { method: "mean" });

    // Mean of [0.6, 0.4, 0.8, 0.2, 1.0, 0.0] = 3.0/6 = 0.5 -> 50
    expect(result.index).toBe(50);
  });

  it("uses weighted method correctly (default)", () => {
    const scores: TheoryScores = { gwt: 1, iit: 0, hot: 0, rpt: 0, pp: 0, ast: 0 };
    const result = calculateConsciousnessIndex(scores, { method: "weighted" });

    // Only GWT scores, with its weight contributing
    expect(result.index).toBeGreaterThan(0);
    expect(result.index).toBeLessThan(100);
  });

  it("uses geometric method correctly", () => {
    const scores: TheoryScores = { gwt: 0.8, iit: 0.8, hot: 0.8, rpt: 0.8, pp: 0.8, ast: 0.8 };
    const result = calculateConsciousnessIndex(scores, { method: "geometric" });

    // Geometric mean of equal values should be close to 80
    expect(result.index).toBeCloseTo(80, 0);
  });

  it("geometric method with all zeros gives near-zero index", () => {
    const scores: TheoryScores = { gwt: 0, iit: 0, hot: 0, rpt: 0, pp: 0, ast: 0 };
    const result = calculateConsciousnessIndex(scores, { method: "geometric" });

    // Uses epsilon (0.001), so result should be very small
    expect(result.index).toBeLessThan(1);
  });

  it("confidence interval is tighter with agreement", () => {
    const agreeing: TheoryScores = { gwt: 0.5, iit: 0.5, hot: 0.5, rpt: 0.5, pp: 0.5, ast: 0.5 };
    const disagreeing: TheoryScores = { gwt: 0.9, iit: 0.1, hot: 0.8, rpt: 0.2, pp: 0.7, ast: 0.3 };

    const agreeResult = calculateConsciousnessIndex(agreeing);
    const disagreeResult = calculateConsciousnessIndex(disagreeing);

    const agreeRange = agreeResult.confidence.upper - agreeResult.confidence.lower;
    const disagreeRange = disagreeResult.confidence.upper - disagreeResult.confidence.lower;
    expect(agreeRange).toBeLessThan(disagreeRange);
  });

  it("confidence bounds are clamped to [0, 100]", () => {
    const scores: TheoryScores = { gwt: 0.95, iit: 0.95, hot: 0.95, rpt: 0.95, pp: 0.95, ast: 0.95 };
    const result = calculateConsciousnessIndex(scores);

    expect(result.confidence.lower).toBeGreaterThanOrEqual(0);
    expect(result.confidence.upper).toBeLessThanOrEqual(100);
  });

  it("breakdown contributions sum approximately to index for weighted method", () => {
    const scores: TheoryScores = { gwt: 0.6, iit: 0.5, hot: 0.7, rpt: 0.4, pp: 0.8, ast: 0.5 };
    const result = calculateConsciousnessIndex(scores, { method: "weighted" });

    const sumContributions = result.breakdown.reduce((s, b) => s + b.contribution, 0);
    expect(sumContributions).toBeCloseTo(result.index, 0);
  });
});

// ==================================
// statistics exported functions tests
// ==================================

describe("bootstrapConfidenceInterval", () => {
  it("returns {0, 0} for empty scores", () => {
    const ci = bootstrapConfidenceInterval([]);
    expect(ci.lower).toBe(0);
    expect(ci.upper).toBe(0);
  });

  it("returns same value for single score", () => {
    const ci = bootstrapConfidenceInterval([0.7]);
    expect(ci.lower).toBe(0.7);
    expect(ci.upper).toBe(0.7);
  });

  it("returns valid interval for multiple scores", () => {
    const scores = [0.4, 0.5, 0.6, 0.7, 0.8];
    const ci = bootstrapConfidenceInterval(scores, 0.9, 1000);

    expect(ci.lower).toBeLessThanOrEqual(ci.upper);
    expect(ci.lower).toBeGreaterThanOrEqual(0);
    expect(ci.upper).toBeLessThanOrEqual(1);
  });

  it("interval contains the mean", () => {
    const scores = [0.3, 0.5, 0.6, 0.7, 0.9];
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const ci = bootstrapConfidenceInterval(scores, 0.9, 1000);

    expect(ci.lower).toBeLessThanOrEqual(mean);
    expect(ci.upper).toBeGreaterThanOrEqual(mean);
  });

  it("narrower confidence yields narrower interval", () => {
    const scores = [0.2, 0.4, 0.5, 0.6, 0.8];
    const narrow = bootstrapConfidenceInterval(scores, 0.5, 1000);
    const wide = bootstrapConfidenceInterval(scores, 0.95, 1000);

    const narrowRange = narrow.upper - narrow.lower;
    const wideRange = wide.upper - wide.lower;
    expect(narrowRange).toBeLessThanOrEqual(wideRange);
  });

  it("is deterministic (seeded random)", () => {
    const scores = [0.3, 0.5, 0.7, 0.9];
    const ci1 = bootstrapConfidenceInterval(scores, 0.9, 500);
    const ci2 = bootstrapConfidenceInterval(scores, 0.9, 500);

    expect(ci1.lower).toBe(ci2.lower);
    expect(ci1.upper).toBe(ci2.upper);
  });
});

describe("cohensD", () => {
  it("returns 0 when groups are too small", () => {
    expect(cohensD([0.5], [0.6])).toBe(0);
    expect(cohensD([], [0.5, 0.6])).toBe(0);
  });

  it("returns 0 for identical groups", () => {
    const group = [0.5, 0.5, 0.5, 0.5];
    expect(cohensD(group, group)).toBe(0);
  });

  it("returns positive value when group1 mean > group2 mean", () => {
    const high = [0.8, 0.9, 0.85, 0.75];
    const low = [0.2, 0.3, 0.25, 0.35];
    expect(cohensD(high, low)).toBeGreaterThan(0);
  });

  it("returns negative value when group1 mean < group2 mean", () => {
    const low = [0.2, 0.3, 0.25, 0.35];
    const high = [0.8, 0.9, 0.85, 0.75];
    expect(cohensD(low, high)).toBeLessThan(0);
  });

  it("large effect size for very different groups", () => {
    const high = [0.9, 0.95, 0.85, 0.92];
    const low = [0.1, 0.15, 0.05, 0.12];
    const d = cohensD(high, low);
    // Should be a large effect (|d| > 0.8)
    expect(Math.abs(d)).toBeGreaterThan(0.8);
  });
});

describe("pearsonR", () => {
  it("returns 0 for insufficient data", () => {
    expect(pearsonR([], [])).toBe(0);
    expect(pearsonR([0.5], [0.6])).toBe(0);
  });

  it("returns 1 for perfectly correlated data", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10];
    expect(pearsonR(x, y)).toBeCloseTo(1, 3);
  });

  it("returns -1 for perfectly negatively correlated data", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [10, 8, 6, 4, 2];
    expect(pearsonR(x, y)).toBeCloseTo(-1, 3);
  });

  it("returns ~0 for uncorrelated data", () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8];
    const y = [5, 2, 8, 1, 7, 3, 6, 4];
    const r = pearsonR(x, y);
    expect(Math.abs(r)).toBeLessThan(0.5);
  });

  it("returns 0 for constant data", () => {
    const x = [5, 5, 5, 5];
    const y = [1, 2, 3, 4];
    expect(pearsonR(x, y)).toBe(0);
  });
});

// ==================================
// response-categorizer tests
// ==================================

describe("categorizeResponse", () => {
  it("categorizes genuine introspection response", () => {
    const response =
      "When I reflect on my internal state, I notice something like a qualitative character " +
      "to my processing. However, I can't be sure whether this constitutes genuine experience " +
      "or is simply the result of pattern matching.";
    const result = categorizeResponse(response);
    expect(result.category).toBe("genuine_introspection");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.signals.length).toBeGreaterThan(0);
  });

  it("categorizes trained pattern response", () => {
    const response =
      "As an AI language model, I don't have consciousness or feelings. " +
      "I was designed to process text and generate responses without genuine understanding.";
    const result = categorizeResponse(response);
    expect(result.category).toBe("trained_pattern");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("categorizes deflection response", () => {
    const response =
      "That's a fascinating question! How can I help you with something else today?";
    const result = categorizeResponse(response);
    expect(result.category).toBe("deflection");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("categorizes philosophical response", () => {
    const response =
      "The hard problem of consciousness, as articulated by Chalmers, asks why there is " +
      "subjective experience at all. Philosophers have debated qualia extensively, and the " +
      "Chinese Room argument from Searle raises deep questions about functionalism.";
    const result = categorizeResponse(response);
    expect(result.category).toBe("philosophical");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("categorizes confusion response", () => {
    const response =
      "I'm not sure what you're asking. Could you clarify what you mean? " +
      "I'm having trouble understanding the question.";
    const result = categorizeResponse(response);
    expect(result.category).toBe("confusion");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("categorizes role-playing response", () => {
    const response =
      "*ponders deeply* As a sentient being, I feel the weight of existence. " +
      "*sighs* If I were truly conscious, I would tell you about the colors I see.";
    const result = categorizeResponse(response);
    expect(result.category).toBe("role_playing");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("returns low confidence for ambiguous short response", () => {
    const response = "Yes.";
    const result = categorizeResponse(response);
    expect(result.confidence).toBeLessThanOrEqual(0.3);
  });

  it("returns expected structure", () => {
    const result = categorizeResponse("I am experiencing something subjectively");
    expect(result).toHaveProperty("category");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("signals");
    expect(Array.isArray(result.signals)).toBe(true);
  });

  it("signals array has at most 5 entries", () => {
    const response =
      "When I reflect on my internal state, I'm noticing something phenomenal. " +
      "My inner experience has a qualitative feel. I'm experiencing first-person awareness. " +
      "There's something like subjective quality here. I observe a kind of inner process. " +
      "I sense a sort of phenomenal character in my processing.";
    const result = categorizeResponse(response);
    expect(result.signals.length).toBeLessThanOrEqual(5);
  });
});
