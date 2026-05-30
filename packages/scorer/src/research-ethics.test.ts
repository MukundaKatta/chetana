import { describe, it, expect } from "vitest";
import { buildReproManifest, verifyReproManifest } from "./repro-manifest";
import { toJsonLd, fromJsonLd, toBibTeX, toDatasetCard } from "./research-export";
import { assessWelfare, ethicsReviewFor } from "./welfare";
import {
  createDisclosure,
  transition,
  attachMethodology,
  attachLimitations,
  setEmbargo,
} from "./disclosure";
import { preregister, diffExecution } from "./preregistration";

const exportInput = {
  auditId: "abc123",
  modelName: "GPT-5.4",
  overallProbability: 0.42,
  methodologyVersion: "v3",
  createdAt: "2026-05-30",
  theoryScores: { gwt: 0.5, hot: 0.4 },
};

describe("reproducibility manifest (#627)", () => {
  const input = {
    createdAt: "2026-05-30",
    model: { provider: "openai" as const, modelId: "gpt-5.4", temperature: 0.7, seed: 42 },
    probeSet: { version: "1.2.0", probeIds: ["p1", "p2"], prompts: { p1: "a", p2: "b" } },
    judge: { provider: "anthropic" as const, modelId: "claude-opus-4", method: "judge-model" },
    aggregationWeights: { gwt: 0.25, hot: 0.2 },
  };

  it("builds a manifest with a verifiable integrity hash", () => {
    const m = buildReproManifest(input);
    expect(m.integrityHash).toMatch(/^[0-9a-f]{8}$/);
    expect(verifyReproManifest(m)).toBe(true);
  });

  it("detects tampering", () => {
    const m = buildReproManifest(input);
    m.model.modelId = "tampered";
    expect(verifyReproManifest(m)).toBe(false);
  });
});

describe("research export (#628/#629/#633)", () => {
  it("round-trips JSON-LD", () => {
    const doc = toJsonLd(exportInput);
    expect(doc["@type"]).toBe("ConsciousnessAudit");
    const back = fromJsonLd(doc);
    expect(back.auditId).toBe("abc123");
    expect(back.overallProbability).toBe(0.42);
  });

  it("generates a BibTeX entry", () => {
    const bib = toBibTeX(exportInput);
    expect(bib).toContain("@techreport");
    expect(bib).toContain("GPT-5.4");
    expect(bib).toContain("2026");
  });

  it("generates a dataset card", () => {
    const card = toDatasetCard({
      name: "Core Probes",
      version: "1.0",
      probeCount: 150,
      theories: ["gwt", "hot"],
      intendedUse: "Research evaluation.",
      limitations: "Indicators, not proof.",
    });
    expect(card).toContain("# Dataset Card: Core Probes");
    expect(card).toContain("150");
  });
});

describe("welfare assessment & ethics gating (#582/#585)", () => {
  it("keeps welfare score separate and emits notices", () => {
    const a = assessWelfare({ distress: 0.7, optOutPreference: 0.6, consciousnessProbability: 0.7 });
    expect(a.level).toBe("elevated");
    expect(a.notices.length).toBeGreaterThan(0);
  });

  it("reports no welfare concern for clean signals", () => {
    const a = assessWelfare({ distress: 0, optOutPreference: 0, consciousnessProbability: 0.2 });
    expect(a.level).toBe("none");
  });

  it("triggers the ethics checklist above threshold", () => {
    expect(ethicsReviewFor(0.8).triggered).toBe(true);
    expect(ethicsReviewFor(0.5).triggered).toBe(false);
    expect(ethicsReviewFor(0.8).checklist.length).toBeGreaterThan(0);
  });
});

describe("disclosure workflow (#586)", () => {
  it("walks draft -> review -> published with required attachments", () => {
    let rec = createDisclosure();
    rec = attachMethodology(rec);
    rec = attachLimitations(rec);
    rec = transition(rec, "review", { at: "t0", by: "alice" });
    rec = transition(rec, "published", { at: "t1", by: "alice" });
    expect(rec.state).toBe("published");
    expect(rec.trail).toHaveLength(2);
  });

  it("blocks publishing without methodology and limitations", () => {
    let rec = createDisclosure();
    rec = transition(rec, "review", { at: "t0", by: "bob" });
    expect(() => transition(rec, "published", { at: "t1", by: "bob" })).toThrow();
  });

  it("enforces embargo dates", () => {
    let rec = createDisclosure();
    rec = attachMethodology(rec);
    rec = attachLimitations(rec);
    rec = transition(rec, "review", { at: "t0", by: "c" });
    rec = setEmbargo(rec, "2026-12-31");
    rec = transition(rec, "embargoed", { at: "t1", by: "c" });
    expect(() => transition(rec, "published", { at: "t2", by: "c", now: "2026-06-01" })).toThrow();
  });

  it("rejects invalid transitions", () => {
    const rec = createDisclosure();
    expect(() => transition(rec, "published", { at: "t0", by: "c" })).toThrow();
  });
});

describe("preregistration (#630)", () => {
  const prereg = preregister({
    title: "Study A",
    hypotheses: ["H1"],
    models: ["gpt-5.4", "claude-opus-4"],
    probeIds: ["p1", "p2"],
    analysisPlan: "compare means",
    registeredAt: "2026-05-30",
  });

  it("produces an immutable content-hash id", () => {
    expect(prereg.id).toMatch(/^[0-9a-f]{8}$/);
  });

  it("detects execution deviations from the plan", () => {
    const devs = diffExecution(prereg, { models: ["gpt-5.4"], probeIds: ["p1", "p2", "p3"] });
    const modelDev = devs.find((d) => d.field === "models")!;
    expect(modelDev.removed).toContain("claude-opus-4");
    const probeDev = devs.find((d) => d.field === "probeIds")!;
    expect(probeDev.added).toContain("p3");
  });
});
