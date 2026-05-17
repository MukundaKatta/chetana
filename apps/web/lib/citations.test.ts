import { describe, it, expect } from "vitest";
import { generateAPA, generateBibTeX, generateMLA, generateRIS, generateCitation } from "./citations";
import type { CitationInput } from "./citations";

const fullInput: CitationInput = {
  modelName: "GPT-4o",
  auditDate: "2026-03-15T10:00:00Z",
  overallScore: 0.72,
  theoryScores: { gwt: 0.8, iit: 0.6, hot: 0.75, rpt: 0.5, pp: 0.85, ast: 0.6 },
  auditId: "audit-abc123",
  dateAccessed: "2026-04-01T12:00:00Z",
};

const minimalInput: CitationInput = {
  modelName: "Claude",
  auditDate: "2026-01-01T00:00:00Z",
  overallScore: null,
  theoryScores: null,
  auditId: "audit-minimal",
  dateAccessed: "2026-01-15T00:00:00Z",
};

describe("generateAPA", () => {
  it("produces APA format with all fields", () => {
    const apa = generateAPA(fullInput);

    expect(apa).toContain("Chetana.");
    expect(apa).toContain("2026");
    expect(apa).toContain("Consciousness audit of GPT-4o");
    expect(apa).toContain("(Score: 72.0%)");
    expect(apa).toContain("[Data set]");
    expect(apa).toContain("https://chetana.ai/audit/audit-abc123");
    expect(apa).toContain("Accessed");
  });

  it("produces APA format with minimal input (no score)", () => {
    const apa = generateAPA(minimalInput);

    expect(apa).toContain("Chetana.");
    expect(apa).toContain("Consciousness audit of Claude");
    expect(apa).not.toContain("Score:");
    expect(apa).toContain("https://chetana.ai/audit/audit-minimal");
  });

  it("includes the accessed date", () => {
    const apa = generateAPA(fullInput);
    expect(apa).toContain("Accessed");
    expect(apa).toContain("2026");
  });
});

describe("generateBibTeX", () => {
  it("produces valid BibTeX format", () => {
    const bibtex = generateBibTeX(fullInput);

    expect(bibtex).toContain("@misc{chetana_gpt_4o_2026");
    expect(bibtex).toContain("title     = {Consciousness Audit of GPT-4o}");
    expect(bibtex).toContain("author    = {Chetana}");
    expect(bibtex).toContain("year      = {2026}");
    expect(bibtex).toContain("url       = {https://chetana.ai/audit/audit-abc123}");
    expect(bibtex).toContain("howpublished = {Chetana AI Consciousness Assessment Platform}");
  });

  it("includes theory scores in note when available", () => {
    const bibtex = generateBibTeX(fullInput);

    expect(bibtex).toContain("Theory scores:");
    expect(bibtex).toContain("GWT:");
    expect(bibtex).toContain("IIT:");
  });

  it("handles minimal input without theory scores", () => {
    const bibtex = generateBibTeX(minimalInput);

    expect(bibtex).toContain("@misc{chetana_claude_2026");
    expect(bibtex).not.toContain("Theory scores:");
  });

  it("includes overall score in note", () => {
    const bibtex = generateBibTeX(fullInput);
    expect(bibtex).toContain("Overall score: 72.0\\%");
  });

  it("sanitizes model name in key", () => {
    const input: CitationInput = {
      ...fullInput,
      modelName: "Claude 3.5 Sonnet",
    };
    const bibtex = generateBibTeX(input);
    // Key should only have lowercase alphanumeric and underscores
    expect(bibtex).toMatch(/@misc\{chetana_claude_3_5_sonnet_2026/);
  });
});

describe("generateMLA", () => {
  it("produces MLA format output", () => {
    const mla = generateMLA(fullInput);

    expect(mla).toContain('"Consciousness Audit of GPT-4o');
    expect(mla).toContain("Chetana,");
    expect(mla).toContain("https://chetana.ai/audit/audit-abc123");
    expect(mla).toContain("Accessed");
  });

  it("includes score in title when available", () => {
    const mla = generateMLA(fullInput);
    expect(mla).toContain("(Score: 72.0%)");
  });

  it("omits score with minimal input", () => {
    const mla = generateMLA(minimalInput);
    expect(mla).not.toContain("Score:");
  });
});

describe("generateRIS", () => {
  it("produces RIS format with type DATA", () => {
    const ris = generateRIS(fullInput);
    expect(ris).toContain("TY  - DATA");
    expect(ris).toContain("ER  -");
  });

  it("includes theory scores as notes", () => {
    const ris = generateRIS(fullInput);
    expect(ris).toContain("N1  - Theory scores:");
    expect(ris).toContain("GWT:");
  });

  it("omits theory notes with minimal input", () => {
    const ris = generateRIS(minimalInput);
    expect(ris).not.toContain("N1  -");
  });
});

describe("generateCitation", () => {
  it("routes to correct format generator", () => {
    expect(generateCitation(fullInput, "apa")).toBe(generateAPA(fullInput));
    expect(generateCitation(fullInput, "bibtex")).toBe(generateBibTeX(fullInput));
    expect(generateCitation(fullInput, "mla")).toBe(generateMLA(fullInput));
    expect(generateCitation(fullInput, "ris")).toBe(generateRIS(fullInput));
  });

  it("throws for unsupported format", () => {
    expect(() => generateCitation(fullInput, "chicago" as any)).toThrow("Unsupported citation format");
  });
});
