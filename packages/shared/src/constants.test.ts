import { describe, it, expect } from "vitest";
import { THEORIES, INDICATORS, THEORY_WEIGHTS, POPULAR_MODELS, PRICING } from "./constants";
import type { Theory, IndicatorId } from "./types";

describe("THEORIES", () => {
  const allTheories: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];

  it("defines all 6 theories", () => {
    expect(Object.keys(THEORIES)).toHaveLength(6);
    for (const theory of allTheories) {
      expect(THEORIES[theory]).toBeDefined();
    }
  });

  it("each theory has required fields", () => {
    for (const theory of allTheories) {
      const t = THEORIES[theory];
      expect(t.name).toBeTruthy();
      expect(t.fullName).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.favorability).toBeTruthy();
      expect(t.name.length).toBeLessThanOrEqual(5);
    }
  });

  it("has correct abbreviations", () => {
    expect(THEORIES.gwt.name).toBe("GWT");
    expect(THEORIES.iit.name).toBe("IIT");
    expect(THEORIES.hot.name).toBe("HOT");
    expect(THEORIES.rpt.name).toBe("RPT");
    expect(THEORIES.pp.name).toBe("PP");
    expect(THEORIES.ast.name).toBe("AST");
  });
});

describe("INDICATORS", () => {
  it("defines exactly 14 indicators", () => {
    expect(INDICATORS).toHaveLength(14);
  });

  it("all indicators have required fields", () => {
    for (const ind of INDICATORS) {
      expect(ind.id).toBeTruthy();
      expect(ind.name).toBeTruthy();
      expect(ind.theory).toBeTruthy();
      expect(ind.description).toBeTruthy();
      expect(ind.whatItMeans).toBeTruthy();
    }
  });

  it("all indicator IDs are unique", () => {
    const ids = INDICATORS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all indicator theories are valid", () => {
    const validTheories: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];
    for (const ind of INDICATORS) {
      expect(validTheories).toContain(ind.theory);
    }
  });

  it("has correct theory distribution", () => {
    const byCounts = INDICATORS.reduce(
      (acc, ind) => {
        acc[ind.theory] = (acc[ind.theory] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    // GWT has 4 indicators (GWT-1 through GWT-4) + AGENCY-1 maps to gwt
    expect(byCounts.gwt).toBe(5);
    expect(byCounts.hot).toBe(4);
    expect(byCounts.rpt).toBe(2);
    expect(byCounts.pp).toBe(2);
    expect(byCounts.ast).toBe(1);
  });

  it("indicator IDs follow naming pattern", () => {
    for (const ind of INDICATORS) {
      expect(ind.id).toMatch(/^(GWT|IIT|HOT|RPT|PP|AST|AGENCY)-\d+$/);
    }
  });
});

describe("THEORY_WEIGHTS", () => {
  it("defines weights for all 6 theories", () => {
    const theories: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];
    for (const t of theories) {
      expect(THEORY_WEIGHTS[t]).toBeDefined();
      expect(typeof THEORY_WEIGHTS[t]).toBe("number");
    }
  });

  it("weights sum to 1.0", () => {
    const sum = Object.values(THEORY_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it("all weights are between 0 and 1", () => {
    for (const w of Object.values(THEORY_WEIGHTS)) {
      expect(w).toBeGreaterThan(0);
      expect(w).toBeLessThanOrEqual(1);
    }
  });

  it("GWT has highest weight", () => {
    expect(THEORY_WEIGHTS.gwt).toBe(0.25);
    for (const [key, val] of Object.entries(THEORY_WEIGHTS)) {
      if (key !== "gwt") {
        expect(val).toBeLessThanOrEqual(THEORY_WEIGHTS.gwt);
      }
    }
  });
});

describe("POPULAR_MODELS", () => {
  it("has at least one model per provider", () => {
    const providers = new Set(POPULAR_MODELS.map((m) => m.provider));
    expect(providers).toContain("anthropic");
    expect(providers).toContain("openai");
    expect(providers).toContain("google");
    expect(providers).toContain("ollama");
  });

  it("all models have required fields", () => {
    for (const model of POPULAR_MODELS) {
      expect(model.provider).toBeTruthy();
      expect(model.modelId).toBeTruthy();
      expect(model.displayName).toBeTruthy();
    }
  });

  it("model IDs are unique", () => {
    const ids = POPULAR_MODELS.map((m) => m.modelId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("PRICING", () => {
  it("defines three tiers", () => {
    expect(PRICING.explorer).toBeDefined();
    expect(PRICING.researcher).toBeDefined();
    expect(PRICING.enterprise).toBeDefined();
  });

  it("explorer tier is free with limited audits", () => {
    expect(PRICING.explorer.price).toBe(0);
    expect(PRICING.explorer.auditsPerMonth).toBeGreaterThan(0);
  });

  it("researcher tier has unlimited audits", () => {
    expect(PRICING.researcher.auditsPerMonth).toBe(-1);
    expect(PRICING.researcher.price).toBeGreaterThan(0);
  });

  it("enterprise tier is most expensive", () => {
    expect(PRICING.enterprise.price).toBeGreaterThan(PRICING.researcher.price);
  });

  it("all tiers have features array", () => {
    expect(PRICING.explorer.features.length).toBeGreaterThan(0);
    expect(PRICING.researcher.features.length).toBeGreaterThan(0);
    expect(PRICING.enterprise.features.length).toBeGreaterThan(0);
  });
});
