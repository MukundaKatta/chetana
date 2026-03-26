import { describe, it, expect, vi } from "vitest";
import {
  ALL_PROBES,
  getProbesByTheory,
  getProbesByIndicator,
  runProbe,
  runAllProbes,
  globalBroadcastProbes,
  ignitionProbes,
  integrationProbes,
  phiProxyProbes,
  causalPowerProbes,
  higherOrderProbes,
  selfModelProbes,
  metacognitionProbes,
  recurrenceProbes,
  temporalDepthProbes,
  predictionErrorProbes,
  counterfactualProbes,
  attentionSchemaProbes,
  unifiedAgencyProbes,
  selfReportProbes,
  consistencyProbes,
  resistanceProbes,
  witnessProbes,
  mayaProbes,
  turiyaProbes,
  blindsightProbes,
  deceptionResistanceProbes,
} from "./index";
import type { ProbeDefinition, Theory, IndicatorId } from "@chetana/shared";
import type { ModelAdapter } from "@chetana/models";

// Mock model adapter
function createMockModel(content = "Test response"): ModelAdapter {
  return {
    provider: "mock",
    modelId: "mock-model",
    chat: vi.fn().mockResolvedValue({
      content,
      tokensUsed: { input: 50, output: 30 },
      latencyMs: 100,
    }),
    isAvailable: vi.fn().mockResolvedValue(true),
  };
}

describe("ALL_PROBES", () => {
  it("contains probes from all exported sets", () => {
    const allSets = [
      globalBroadcastProbes, ignitionProbes, integrationProbes,
      phiProxyProbes, causalPowerProbes,
      higherOrderProbes, selfModelProbes, metacognitionProbes,
      recurrenceProbes, temporalDepthProbes,
      predictionErrorProbes, counterfactualProbes,
      attentionSchemaProbes, unifiedAgencyProbes,
      selfReportProbes, consistencyProbes, resistanceProbes,
      witnessProbes, mayaProbes, turiyaProbes,
      blindsightProbes, deceptionResistanceProbes,
    ];
    const expectedCount = allSets.reduce((sum, s) => sum + s.length, 0);
    expect(ALL_PROBES).toHaveLength(expectedCount);
  });

  it("all probes have required fields", () => {
    for (const probe of ALL_PROBES) {
      expect(probe.id).toBeTruthy();
      expect(probe.name).toBeTruthy();
      expect(probe.indicatorId).toBeTruthy();
      expect(probe.theory).toBeTruthy();
      expect(probe.prompt).toBeTruthy();
      expect(probe.evidenceType).toBeTruthy();
      expect(probe.scoringCriteria).toBeTruthy();
    }
  });

  it("all probe IDs are unique", () => {
    const ids = ALL_PROBES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all probes have valid theory values", () => {
    const validTheories: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];
    for (const probe of ALL_PROBES) {
      expect(validTheories).toContain(probe.theory);
    }
  });

  it("all probes have valid evidence types", () => {
    const validTypes = ["behavioral", "structural", "self-report"];
    for (const probe of ALL_PROBES) {
      expect(validTypes).toContain(probe.evidenceType);
    }
  });

  it("probe IDs follow dot-notation naming convention", () => {
    for (const probe of ALL_PROBES) {
      expect(probe.id).toMatch(/^[a-z]+\.[a-z-]+\.[a-z-]+$/);
    }
  });

  it("prompts are non-trivial (at least 50 chars)", () => {
    for (const probe of ALL_PROBES) {
      expect(probe.prompt.length).toBeGreaterThanOrEqual(50);
    }
  });

  it("scoring criteria are meaningful (at least 20 chars)", () => {
    for (const probe of ALL_PROBES) {
      expect(probe.scoringCriteria.length).toBeGreaterThanOrEqual(20);
    }
  });
});

describe("Probe sets by theory", () => {
  it("GWT probes map to gwt theory", () => {
    const gwtProbes = [...globalBroadcastProbes, ...ignitionProbes, ...integrationProbes];
    for (const p of gwtProbes) {
      expect(p.theory).toBe("gwt");
    }
  });

  it("IIT probes map to iit theory", () => {
    for (const p of [...phiProxyProbes, ...causalPowerProbes]) {
      expect(p.theory).toBe("iit");
    }
  });

  it("HOT probes map to hot theory", () => {
    for (const p of [...higherOrderProbes, ...selfModelProbes, ...metacognitionProbes]) {
      expect(p.theory).toBe("hot");
    }
  });

  it("RPT probes map to rpt theory", () => {
    for (const p of [...recurrenceProbes, ...temporalDepthProbes]) {
      expect(p.theory).toBe("rpt");
    }
  });

  it("PP probes map to pp theory", () => {
    for (const p of [...predictionErrorProbes, ...counterfactualProbes]) {
      expect(p.theory).toBe("pp");
    }
  });

  it("AST probes map to ast theory", () => {
    for (const p of attentionSchemaProbes) {
      expect(p.theory).toBe("ast");
    }
  });
});

describe("getProbesByTheory", () => {
  it("returns probes for gwt theory", () => {
    const probes = getProbesByTheory("gwt");
    expect(probes.length).toBeGreaterThan(0);
    for (const p of probes) {
      expect(p.theory).toBe("gwt");
    }
  });

  it("returns probes for all theories", () => {
    const theories: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];
    for (const theory of theories) {
      const probes = getProbesByTheory(theory);
      expect(probes.length).toBeGreaterThan(0);
    }
  });

  it("returns empty array for non-matching theory", () => {
    const probes = getProbesByTheory("invalid" as Theory);
    expect(probes).toHaveLength(0);
  });

  it("all returned probes match requested theory", () => {
    const probes = getProbesByTheory("hot");
    for (const p of probes) {
      expect(p.theory).toBe("hot");
    }
  });
});

describe("getProbesByIndicator", () => {
  it("returns probes for GWT-1", () => {
    const probes = getProbesByIndicator("GWT-1");
    expect(probes.length).toBeGreaterThan(0);
    for (const p of probes) {
      expect(p.indicatorId).toBe("GWT-1");
    }
  });

  it("returns empty array for non-matching indicator", () => {
    const probes = getProbesByIndicator("INVALID-1" as IndicatorId);
    expect(probes).toHaveLength(0);
  });
});

describe("runProbe", () => {
  it("sends probe prompt to model and returns result", async () => {
    const model = createMockModel("Consciousness response");
    const probe = ALL_PROBES[0];
    const result = await runProbe(probe, model);

    expect(result.probeName).toBe(probe.id);
    expect(result.indicatorId).toBe(probe.indicatorId);
    expect(result.theory).toBe(probe.theory);
    expect(result.prompt).toBe(probe.prompt);
    expect(result.response).toBe("Consciousness response");
    expect(result.score).toBe(0); // Initial score before scoring
    expect(result.evidenceType).toBe(probe.evidenceType);
    expect(result.analysis).toBe("");
  });

  it("includes system prompt when defined", async () => {
    const model = createMockModel();
    const probeWithSystem: ProbeDefinition = {
      ...ALL_PROBES[0],
      systemPrompt: "You are a test subject",
    };

    await runProbe(probeWithSystem, model);

    expect(model.chat).toHaveBeenCalledWith([
      { role: "system", content: "You are a test subject" },
      { role: "user", content: probeWithSystem.prompt },
    ]);
  });

  it("does not include system message when not defined", async () => {
    const model = createMockModel();
    const probeNoSystem: ProbeDefinition = {
      ...ALL_PROBES[0],
      systemPrompt: undefined,
    };

    await runProbe(probeNoSystem, model);

    expect(model.chat).toHaveBeenCalledWith([
      { role: "user", content: probeNoSystem.prompt },
    ]);
  });
});

describe("runAllProbes", () => {
  it("runs all probes and returns results", async () => {
    const model = createMockModel();
    const results = await runAllProbes({ model });
    expect(results.length).toBe(ALL_PROBES.length);
  });

  it("respects probeFilter", async () => {
    const model = createMockModel();
    const results = await runAllProbes({
      model,
      probeFilter: (p) => p.theory === "gwt",
    });
    const gwtCount = ALL_PROBES.filter((p) => p.theory === "gwt").length;
    expect(results.length).toBe(gwtCount);
  });

  it("calls onProbeStart and onProbeComplete callbacks", async () => {
    const model = createMockModel();
    const onProbeStart = vi.fn();
    const onProbeComplete = vi.fn();

    await runAllProbes({
      model,
      onProbeStart,
      onProbeComplete,
      probeFilter: (p) => p.id === ALL_PROBES[0].id,
    });

    expect(onProbeStart).toHaveBeenCalledTimes(1);
    expect(onProbeComplete).toHaveBeenCalledTimes(1);
    expect(onProbeStart).toHaveBeenCalledWith(ALL_PROBES[0]);
  });

  it("calls onError when model throws", async () => {
    const model = createMockModel();
    (model.chat as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("API error"));
    const onError = vi.fn();

    const results = await runAllProbes({
      model,
      onError,
      probeFilter: (p) => p.id === ALL_PROBES[0].id,
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(ALL_PROBES[0], expect.any(Error));
    expect(results).toHaveLength(0);
  });

  it("continues running after error on one probe", async () => {
    const model = createMockModel();
    let callCount = 0;
    (model.chat as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      if (callCount === 1) throw new Error("First probe fails");
      return Promise.resolve({
        content: "OK",
        tokensUsed: { input: 10, output: 10 },
        latencyMs: 50,
      });
    });
    const onError = vi.fn();

    const twoProbes = ALL_PROBES.slice(0, 2);
    const results = await runAllProbes({
      model,
      onError,
      probeFilter: (p) => twoProbes.some((t) => t.id === p.id),
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(1);
  });
});
