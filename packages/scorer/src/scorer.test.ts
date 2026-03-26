import { describe, it, expect, vi } from "vitest";
import { scoreProbeResult, scoreAllProbeResults } from "./indicator-scorer";
import { aggregateByIndicator, aggregateByTheory, getTheoryBreakdown } from "./theory-aggregator";
import { calculateOverallProbability, calculateUncertaintyBounds } from "./probability-calc";
import { generateReport } from "./report-generator";
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
