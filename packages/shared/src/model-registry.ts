import type { ModelProvider } from "./types";
import type { ModelVersion } from "./model-versions";
import { getAllModelVersions } from "./model-versions";

/**
 * Model registry auto-sync (issue #565).
 *
 * Frontier models ship on a near-monthly cadence, so the static registry in
 * `model-versions.ts` drifts quickly. This module merges authoritative
 * provider-supplied model-card metadata into the registry, applies a pinned
 * override layer for fields the platform controls, and produces a diff so a
 * scheduled refresh can report exactly what changed.
 */

export interface ModelCard {
  provider: ModelProvider;
  modelId: string;
  displayName?: string;
  releasedAt?: string;
  parameterCount?: string;
  contextWindow?: number;
  modalities?: ("text" | "image" | "audio" | "video")[];
  /** Provider has marked this model deprecated/retired. */
  deprecated?: boolean;
}

export interface RegistryEntry extends ModelVersion {
  contextWindow?: number;
  modalities?: ("text" | "image" | "audio" | "video")[];
  deprecated?: boolean;
}

/** Fields the platform pins regardless of provider metadata. */
export type RegistryOverride = Partial<Omit<RegistryEntry, "provider" | "modelId">>;

export interface RegistryDiff {
  added: RegistryEntry[];
  updated: { modelId: string; changes: Partial<RegistryEntry> }[];
  deprecated: string[];
  unchanged: number;
}

function keyOf(provider: ModelProvider, modelId: string): string {
  return `${provider}:${modelId}`;
}

/**
 * Merge fetched model cards into the existing registry.
 *
 * @param cards     Authoritative model cards fetched from providers.
 * @param overrides Pinned per-model overrides keyed by `provider:modelId`.
 * @param base      Existing registry entries (defaults to the static registry).
 */
export function mergeModelCards(
  cards: ModelCard[],
  overrides: Record<string, RegistryOverride> = {},
  base: RegistryEntry[] = getAllModelVersions()
): { registry: RegistryEntry[]; diff: RegistryDiff } {
  const byKey = new Map<string, RegistryEntry>();
  for (const entry of base) {
    byKey.set(keyOf(entry.provider, entry.modelId), { ...entry });
  }

  const diff: RegistryDiff = { added: [], updated: [], deprecated: [], unchanged: 0 };

  for (const card of cards) {
    const key = keyOf(card.provider, card.modelId);
    const override = overrides[key] ?? {};
    const existing = byKey.get(key);

    // Provider fields, then pinned overrides win.
    const merged: RegistryEntry = {
      provider: card.provider,
      modelId: card.modelId,
      displayName: card.displayName ?? existing?.displayName ?? card.modelId,
      releasedAt: card.releasedAt ?? existing?.releasedAt ?? "unknown",
      parameterCount: card.parameterCount ?? existing?.parameterCount,
      contextWindow: card.contextWindow ?? existing?.contextWindow,
      modalities: card.modalities ?? existing?.modalities,
      deprecated: card.deprecated ?? existing?.deprecated,
      ...override,
    };

    if (!existing) {
      diff.added.push(merged);
      byKey.set(key, merged);
      if (merged.deprecated) diff.deprecated.push(card.modelId);
      continue;
    }

    const changes = fieldChanges(existing, merged);
    if (Object.keys(changes).length === 0) {
      diff.unchanged++;
    } else {
      diff.updated.push({ modelId: card.modelId, changes });
      if (changes.deprecated) diff.deprecated.push(card.modelId);
    }
    byKey.set(key, merged);
  }

  return { registry: [...byKey.values()], diff };
}

function fieldChanges(a: RegistryEntry, b: RegistryEntry): Partial<RegistryEntry> {
  const changes: Partial<RegistryEntry> = {};
  const fields: (keyof RegistryEntry)[] = [
    "displayName",
    "releasedAt",
    "parameterCount",
    "contextWindow",
    "deprecated",
  ];
  for (const f of fields) {
    if (JSON.stringify(a[f]) !== JSON.stringify(b[f])) {
      // @ts-expect-error narrowed assignment across heterogeneous fields
      changes[f] = b[f];
    }
  }
  if (JSON.stringify(a.modalities) !== JSON.stringify(b.modalities)) {
    changes.modalities = b.modalities;
  }
  return changes;
}

/** Flag entries the provider no longer lists as deprecated (not in fetched cards). */
export function flagMissingAsDeprecated(
  cards: ModelCard[],
  base: RegistryEntry[] = getAllModelVersions()
): string[] {
  const present = new Set(cards.map((c) => keyOf(c.provider, c.modelId)));
  return base
    .filter((e) => !present.has(keyOf(e.provider, e.modelId)))
    .map((e) => e.modelId);
}
