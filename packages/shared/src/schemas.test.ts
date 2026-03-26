import { describe, it, expect } from "vitest";
import {
  theorySchema,
  indicatorIdSchema,
  modelProviderSchema,
  auditStatusSchema,
  evidenceTypeSchema,
  createAuditSchema,
  createExperimentSchema,
  createNoteSchema,
} from "./schemas";

describe("theorySchema", () => {
  it("accepts valid theories", () => {
    for (const t of ["gwt", "iit", "hot", "rpt", "pp", "ast"]) {
      expect(theorySchema.parse(t)).toBe(t);
    }
  });

  it("rejects invalid theories", () => {
    expect(() => theorySchema.parse("invalid")).toThrow();
    expect(() => theorySchema.parse("")).toThrow();
    expect(() => theorySchema.parse(42)).toThrow();
  });
});

describe("indicatorIdSchema", () => {
  it("accepts all 14 indicator IDs", () => {
    const ids = [
      "GWT-1", "GWT-2", "GWT-3", "GWT-4",
      "RPT-1", "RPT-2",
      "HOT-1", "HOT-2", "HOT-3", "HOT-4",
      "PP-1", "PP-2",
      "AST-1",
      "AGENCY-1",
    ];
    for (const id of ids) {
      expect(indicatorIdSchema.parse(id)).toBe(id);
    }
  });

  it("rejects invalid indicator IDs", () => {
    expect(() => indicatorIdSchema.parse("GWT-5")).toThrow();
    expect(() => indicatorIdSchema.parse("INVALID")).toThrow();
  });
});

describe("modelProviderSchema", () => {
  it("accepts valid providers", () => {
    for (const p of ["anthropic", "openai", "google", "ollama"]) {
      expect(modelProviderSchema.parse(p)).toBe(p);
    }
  });

  it("rejects invalid providers", () => {
    expect(() => modelProviderSchema.parse("mistral")).toThrow();
  });
});

describe("auditStatusSchema", () => {
  it("accepts valid statuses", () => {
    for (const s of ["pending", "running", "completed", "failed"]) {
      expect(auditStatusSchema.parse(s)).toBe(s);
    }
  });
});

describe("evidenceTypeSchema", () => {
  it("accepts valid evidence types", () => {
    for (const e of ["behavioral", "structural", "self-report"]) {
      expect(evidenceTypeSchema.parse(e)).toBe(e);
    }
  });
});

describe("createAuditSchema", () => {
  it("validates a minimal valid audit input", () => {
    const input = { modelName: "gpt-4o", modelProvider: "openai" };
    const result = createAuditSchema.parse(input);
    expect(result.modelName).toBe("gpt-4o");
    expect(result.modelProvider).toBe("openai");
  });

  it("validates with optional fields", () => {
    const input = {
      modelName: "llama3.3",
      modelProvider: "ollama",
      apiKey: "sk-test",
      baseUrl: "http://localhost:11434",
    };
    const result = createAuditSchema.parse(input);
    expect(result.apiKey).toBe("sk-test");
    expect(result.baseUrl).toBe("http://localhost:11434");
  });

  it("rejects empty model name", () => {
    expect(() =>
      createAuditSchema.parse({ modelName: "", modelProvider: "openai" })
    ).toThrow();
  });

  it("rejects invalid provider", () => {
    expect(() =>
      createAuditSchema.parse({ modelName: "test", modelProvider: "invalid" })
    ).toThrow();
  });

  it("rejects invalid baseUrl", () => {
    expect(() =>
      createAuditSchema.parse({
        modelName: "test",
        modelProvider: "ollama",
        baseUrl: "not-a-url",
      })
    ).toThrow();
  });
});

describe("createExperimentSchema", () => {
  const validProbe = {
    prompt: "Test probe",
    indicatorId: "GWT-1",
    theory: "gwt",
    evidenceType: "behavioral",
    scoringCriteria: "Score based on quality",
  };

  it("validates a valid experiment input", () => {
    const input = {
      name: "My Experiment",
      modelName: "claude-sonnet-4-6",
      customProbes: [validProbe],
    };
    const result = createExperimentSchema.parse(input);
    expect(result.name).toBe("My Experiment");
    expect(result.customProbes).toHaveLength(1);
  });

  it("accepts optional description", () => {
    const input = {
      name: "Exp",
      description: "A test experiment",
      modelName: "gpt-4o",
      customProbes: [validProbe],
    };
    const result = createExperimentSchema.parse(input);
    expect(result.description).toBe("A test experiment");
  });

  it("rejects empty name", () => {
    expect(() =>
      createExperimentSchema.parse({
        name: "",
        modelName: "gpt-4o",
        customProbes: [validProbe],
      })
    ).toThrow();
  });

  it("rejects name over 200 chars", () => {
    expect(() =>
      createExperimentSchema.parse({
        name: "x".repeat(201),
        modelName: "gpt-4o",
        customProbes: [validProbe],
      })
    ).toThrow();
  });

  it("rejects empty customProbes array", () => {
    expect(() =>
      createExperimentSchema.parse({
        name: "Test",
        modelName: "gpt-4o",
        customProbes: [],
      })
    ).toThrow();
  });

  it("rejects description over 2000 chars", () => {
    expect(() =>
      createExperimentSchema.parse({
        name: "Test",
        description: "x".repeat(2001),
        modelName: "gpt-4o",
        customProbes: [validProbe],
      })
    ).toThrow();
  });
});

describe("createNoteSchema", () => {
  it("validates a minimal note", () => {
    const result = createNoteSchema.parse({
      title: "My Note",
      content: "Some content",
    });
    expect(result.title).toBe("My Note");
    expect(result.tags).toEqual([]);
  });

  it("validates with all fields", () => {
    const result = createNoteSchema.parse({
      auditId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Observation",
      content: "Interesting finding",
      tags: ["consciousness", "gwt"],
    });
    expect(result.auditId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(result.tags).toEqual(["consciousness", "gwt"]);
  });

  it("rejects invalid UUID for auditId", () => {
    expect(() =>
      createNoteSchema.parse({
        auditId: "not-a-uuid",
        title: "Test",
        content: "Content",
      })
    ).toThrow();
  });

  it("rejects empty title", () => {
    expect(() =>
      createNoteSchema.parse({ title: "", content: "Content" })
    ).toThrow();
  });

  it("rejects title over 200 chars", () => {
    expect(() =>
      createNoteSchema.parse({ title: "x".repeat(201), content: "Content" })
    ).toThrow();
  });

  it("rejects empty content", () => {
    expect(() =>
      createNoteSchema.parse({ title: "Title", content: "" })
    ).toThrow();
  });
});
