import { describe, it, expect } from "vitest";
import {
  executiveSummary, narrativeReport, plainLanguageExplainer,
  uncertaintyStatement, comparisonReport, type ReportInput,
} from "./reporting";

const base: ReportInput = {
  modelName: "GPT-5.4",
  overallProbability: 0.62,
  ci: { lower: 0.5, upper: 0.74, level: 0.95 },
  theoryScores: { gwt: 0.7, hot: 0.6, pp: 0.55, ast: 0.5, rpt: 0.45, iit: 0.4 },
  createdAt: "2026-06-01",
  methodologyVersion: "v3",
};

describe("uncertainty statement (#862)", () => {
  it("includes the interval and a width characterization", () => {
    const s = uncertaintyStatement(0.62, base.ci);
    expect(s).toContain("50%");
    expect(s).toContain("74%");
    expect(s.toLowerCase()).toMatch(/tight|moderate|wide/);
  });
  it("handles missing CI", () => {
    expect(uncertaintyStatement(0.5)).toMatch(/approximate/);
  });
});

describe("executive summary (#856)", () => {
  it("leads with the model, estimate, and caveat", () => {
    const s = executiveSummary(base);
    expect(s).toContain("# Executive Summary — GPT-5.4");
    expect(s).toContain("62%");
    expect(s).toContain("GWT (70%)");
    expect(s.toLowerCase()).toContain("not proof");
  });
});

describe("narrative report (#857)", () => {
  it("includes results, breakdown, uncertainty, and limitations", () => {
    const s = narrativeReport(base);
    expect(s).toContain("## Results");
    expect(s).toContain("## Per-theory breakdown");
    expect(s).toContain("## Uncertainty");
    expect(s).toContain("## Limitations");
    expect(s).toContain("methodology v3");
  });
});

describe("plain-language explainer (#861)", () => {
  it("states what it means and what it does NOT mean", () => {
    const s = plainLanguageExplainer(base);
    expect(s).toContain("What this means");
    expect(s).toContain("does NOT mean");
  });
  it("scales the qualitative level with the score", () => {
    expect(plainLanguageExplainer({ ...base, overallProbability: 0.7 })).toContain("relatively many");
    expect(plainLanguageExplainer({ ...base, overallProbability: 0.1 })).toContain("few");
  });
});

describe("comparison report (#863)", () => {
  it("ranks models and reports the spread", () => {
    const s = comparisonReport({
      models: [base, { ...base, modelName: "Tiny", overallProbability: 0.2, theoryScores: { ...base.theoryScores, gwt: 0.2 } }],
    });
    expect(s).toContain("# Model Comparison");
    expect(s.indexOf("GPT-5.4")).toBeLessThan(s.indexOf("Tiny")); // leader first
    expect(s).toContain("Highest overall:** GPT-5.4");
    expect(s).toContain("Spread:");
  });
  it("handles the empty case", () => {
    expect(comparisonReport({ models: [] })).toContain("No models");
  });
});
