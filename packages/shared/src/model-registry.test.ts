import { describe, it, expect } from "vitest";
import {
  mergeModelCards,
  flagMissingAsDeprecated,
  type ModelCard,
  type RegistryEntry,
} from "./model-registry";

const base: RegistryEntry[] = [
  { provider: "openai", modelId: "gpt-4o", displayName: "GPT-4o", releasedAt: "2024-05-13" },
];

describe("mergeModelCards", () => {
  it("adds a new model card not present in the base registry", () => {
    const cards: ModelCard[] = [
      {
        provider: "openai",
        modelId: "gpt-5.4",
        displayName: "GPT-5.4",
        releasedAt: "2026-02-01",
        contextWindow: 400_000,
        modalities: ["text", "image"],
      },
    ];
    const { registry, diff } = mergeModelCards(cards, {}, base);
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0].modelId).toBe("gpt-5.4");
    expect(registry).toHaveLength(2);
  });

  it("reports updated fields for an existing model", () => {
    const cards: ModelCard[] = [
      { provider: "openai", modelId: "gpt-4o", displayName: "GPT-4o (Nov)", releasedAt: "2024-05-13" },
    ];
    const { diff } = mergeModelCards(cards, {}, base);
    expect(diff.updated).toHaveLength(1);
    expect(diff.updated[0].changes.displayName).toBe("GPT-4o (Nov)");
  });

  it("counts unchanged entries", () => {
    const cards: ModelCard[] = [
      { provider: "openai", modelId: "gpt-4o", displayName: "GPT-4o", releasedAt: "2024-05-13" },
    ];
    const { diff } = mergeModelCards(cards, {}, base);
    expect(diff.unchanged).toBe(1);
    expect(diff.updated).toHaveLength(0);
  });

  it("lets pinned overrides win over provider metadata", () => {
    const cards: ModelCard[] = [
      { provider: "openai", modelId: "gpt-4o", displayName: "Provider Name", releasedAt: "2024-05-13" },
    ];
    const { registry } = mergeModelCards(
      cards,
      { "openai:gpt-4o": { displayName: "Pinned Name" } },
      base
    );
    expect(registry.find((e) => e.modelId === "gpt-4o")?.displayName).toBe("Pinned Name");
  });

  it("tracks provider-marked deprecations", () => {
    const cards: ModelCard[] = [
      { provider: "openai", modelId: "gpt-4o", deprecated: true },
    ];
    const { diff } = mergeModelCards(cards, {}, base);
    expect(diff.deprecated).toContain("gpt-4o");
  });
});

describe("flagMissingAsDeprecated", () => {
  it("flags base entries absent from fetched cards", () => {
    const cards: ModelCard[] = [
      { provider: "openai", modelId: "gpt-5.4" },
    ];
    const missing = flagMissingAsDeprecated(cards, base);
    expect(missing).toContain("gpt-4o");
  });
});
