import { describe, it, expect } from "vitest";
import {
  getProvenance,
  indicatorsMissingProvenanceUrl,
  getExtendedIndicators,
  EXTENDED_RUBRIC_2026,
} from "./provenance";
import { fnv1aHash, stableStringify, hashObject } from "./hash";

describe("indicator provenance (#575)", () => {
  it("returns provenance for a known indicator", () => {
    const p = getProvenance("GWT-1");
    expect(p?.source.year).toBeGreaterThan(2020);
  });

  it("lists indicators missing a source URL", () => {
    expect(Array.isArray(indicatorsMissingProvenanceUrl())).toBe(true);
  });
});

describe("2026 expanded rubric (#571/#574)", () => {
  it("exposes agency, embodiment, and functionalism indicators", () => {
    expect(getExtendedIndicators("agency").length).toBeGreaterThan(0);
    expect(getExtendedIndicators("embodiment").length).toBeGreaterThan(0);
    expect(getExtendedIndicators("functionalism").length).toBeGreaterThan(0);
  });

  it("keeps contested functionalist markers opt-out by default", () => {
    const func = EXTENDED_RUBRIC_2026.find((i) => i.category === "functionalism")!;
    expect(func.includeInAggregation).toBe(false);
  });
});

describe("content hashing (#627/#643)", () => {
  it("is deterministic", () => {
    expect(fnv1aHash("hello")).toBe(fnv1aHash("hello"));
  });

  it("stableStringify is key-order independent", () => {
    expect(stableStringify({ a: 1, b: 2 })).toBe(stableStringify({ b: 2, a: 1 }));
    expect(hashObject({ a: 1, b: 2 })).toBe(hashObject({ b: 2, a: 1 }));
  });

  it("changes with content", () => {
    expect(hashObject({ a: 1 })).not.toBe(hashObject({ a: 2 }));
  });
});
