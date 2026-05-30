import { hashObject } from "@chetana/shared";
import type { ModelProvider } from "@chetana/shared";

/**
 * Audit run reproducibility manifest (issue #627).
 *
 * Captures everything needed to reproduce an audit — model + version, seeds,
 * parameters, probe-set version, exact prompts, judge config, and aggregation
 * weights — with an integrity hash for one-click re-runs.
 */

export interface ReproManifest {
  schemaVersion: 1;
  createdAt: string;
  model: {
    provider: ModelProvider;
    modelId: string;
    temperature?: number;
    maxTokens?: number;
    seed?: number;
  };
  probeSet: {
    version: string;
    probeIds: string[];
    prompts: Record<string, string>;
  };
  judge: {
    provider?: ModelProvider;
    modelId?: string;
    method: string;
  };
  aggregationWeights: Record<string, number>;
  integrityHash: string;
}

export interface ReproManifestInput {
  createdAt: string;
  model: ReproManifest["model"];
  probeSet: ReproManifest["probeSet"];
  judge: ReproManifest["judge"];
  aggregationWeights: Record<string, number>;
}

/** Build a manifest, computing the integrity hash over all content fields. */
export function buildReproManifest(input: ReproManifestInput): ReproManifest {
  const content = {
    schemaVersion: 1 as const,
    createdAt: input.createdAt,
    model: input.model,
    probeSet: input.probeSet,
    judge: input.judge,
    aggregationWeights: input.aggregationWeights,
  };
  return { ...content, integrityHash: hashObject(content) };
}

/** Verify a manifest's content matches its stored integrity hash. */
export function verifyReproManifest(manifest: ReproManifest): boolean {
  const { integrityHash, ...content } = manifest;
  return hashObject(content) === integrityHash;
}
