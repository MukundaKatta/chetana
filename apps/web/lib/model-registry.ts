/**
 * Model registry: model CRUD with provider/version/capabilities,
 * comparison table data, evaluation history, deprecation tracking,
 * and search API (Issue #496).
 */

import type { ModelProvider, Theory } from "@chetana/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModelCapability {
  name: string;
  supported: boolean;
  details?: string;
}

export interface ModelVersion {
  version: string;
  releasedAt: string;
  changelog?: string;
  deprecated: boolean;
  deprecatedAt?: string;
  deprecationReason?: string;
  successorVersion?: string;
}

export interface EvaluationRecord {
  id: string;
  auditId: string;
  overallScore: number;
  theoryScores: Record<Theory, number>;
  evaluatedAt: string;
  notes?: string;
}

export interface RegisteredModel {
  id: string;
  name: string;
  provider: ModelProvider;
  currentVersion: string;
  versions: ModelVersion[];
  capabilities: ModelCapability[];
  evaluationHistory: EvaluationRecord[];
  contextWindow: number;
  maxOutputTokens: number;
  costPerMillionInput: number;
  costPerMillionOutput: number;
  tags: string[];
  deprecated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ModelComparison {
  models: RegisteredModel[];
  fields: (keyof RegisteredModel)[];
}

export interface ModelSearchParams {
  query?: string;
  provider?: ModelProvider;
  tags?: string[];
  deprecated?: boolean;
  minContextWindow?: number;
  capabilityName?: string;
  sortBy?: "name" | "createdAt" | "overallScore" | "costPerMillionInput";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface ModelSearchResult {
  models: RegisteredModel[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// In-memory store (swap for DB in production)
// ---------------------------------------------------------------------------

let models: Map<string, RegisteredModel> = new Map();

function generateId(): string {
  return `model_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function createModel(
  input: Omit<RegisteredModel, "id" | "createdAt" | "updatedAt" | "evaluationHistory" | "deprecated">
): RegisteredModel {
  const now = new Date().toISOString();
  const model: RegisteredModel = {
    ...input,
    id: generateId(),
    evaluationHistory: [],
    deprecated: input.versions.some((v) => v.deprecated) && input.versions.every((v) => v.deprecated),
    createdAt: now,
    updatedAt: now,
  };
  models.set(model.id, model);
  return model;
}

export function getModel(id: string): RegisteredModel | undefined {
  return models.get(id);
}

export function updateModel(
  id: string,
  updates: Partial<Omit<RegisteredModel, "id" | "createdAt">>
): RegisteredModel {
  const existing = models.get(id);
  if (!existing) {
    throw new Error(`Model ${id} not found`);
  }
  const updated: RegisteredModel = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  models.set(id, updated);
  return updated;
}

export function deleteModel(id: string): boolean {
  return models.delete(id);
}

export function listModels(): RegisteredModel[] {
  return Array.from(models.values());
}

// ---------------------------------------------------------------------------
// Version helpers
// ---------------------------------------------------------------------------

export function addVersion(modelId: string, version: ModelVersion): RegisteredModel {
  const model = models.get(modelId);
  if (!model) throw new Error(`Model ${modelId} not found`);
  return updateModel(modelId, {
    versions: [...model.versions, version],
    currentVersion: version.deprecated ? model.currentVersion : version.version,
  });
}

export function deprecateVersion(
  modelId: string,
  version: string,
  reason: string,
  successorVersion?: string
): RegisteredModel {
  const model = models.get(modelId);
  if (!model) throw new Error(`Model ${modelId} not found`);
  const updatedVersions = model.versions.map((v) =>
    v.version === version
      ? {
          ...v,
          deprecated: true,
          deprecatedAt: new Date().toISOString(),
          deprecationReason: reason,
          successorVersion,
        }
      : v
  );
  const allDeprecated = updatedVersions.every((v) => v.deprecated);
  return updateModel(modelId, {
    versions: updatedVersions,
    deprecated: allDeprecated,
  });
}

export function getActiveVersions(modelId: string): ModelVersion[] {
  const model = models.get(modelId);
  if (!model) return [];
  return model.versions.filter((v) => !v.deprecated);
}

export function getDeprecatedModels(): RegisteredModel[] {
  return Array.from(models.values()).filter((m) => m.deprecated);
}

// ---------------------------------------------------------------------------
// Evaluation history
// ---------------------------------------------------------------------------

export function addEvaluation(modelId: string, record: Omit<EvaluationRecord, "id">): EvaluationRecord {
  const model = models.get(modelId);
  if (!model) throw new Error(`Model ${modelId} not found`);
  const evaluation: EvaluationRecord = { ...record, id: generateId() };
  updateModel(modelId, {
    evaluationHistory: [...model.evaluationHistory, evaluation],
  });
  return evaluation;
}

export function getEvaluationHistory(modelId: string): EvaluationRecord[] {
  const model = models.get(modelId);
  return model?.evaluationHistory ?? [];
}

export function getLatestEvaluation(modelId: string): EvaluationRecord | undefined {
  const history = getEvaluationHistory(modelId);
  if (history.length === 0) return undefined;
  return history.reduce((latest, curr) =>
    new Date(curr.evaluatedAt) > new Date(latest.evaluatedAt) ? curr : latest
  );
}

// ---------------------------------------------------------------------------
// Comparison table
// ---------------------------------------------------------------------------

export function buildComparisonTable(
  modelIds: string[],
  fields?: (keyof RegisteredModel)[]
): ModelComparison {
  const selected = modelIds
    .map((id) => models.get(id))
    .filter((m): m is RegisteredModel => m !== undefined);

  return {
    models: selected,
    fields: fields ?? [
      "name",
      "provider",
      "currentVersion",
      "contextWindow",
      "maxOutputTokens",
      "costPerMillionInput",
      "costPerMillionOutput",
      "deprecated",
    ],
  };
}

export function compareByLatestScore(modelIds: string[]): Array<{ model: RegisteredModel; score: number | null }> {
  return modelIds
    .map((id) => {
      const model = models.get(id);
      if (!model) return null;
      const latest = getLatestEvaluation(id);
      return { model, score: latest?.overallScore ?? null };
    })
    .filter((entry): entry is { model: RegisteredModel; score: number | null } => entry !== null)
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}

// ---------------------------------------------------------------------------
// Search API
// ---------------------------------------------------------------------------

export function searchModels(params: ModelSearchParams): ModelSearchResult {
  const {
    query,
    provider,
    tags,
    deprecated,
    minContextWindow,
    capabilityName,
    sortBy = "name",
    sortOrder = "asc",
    page = 1,
    pageSize = 20,
  } = params;

  let results = Array.from(models.values());

  // Text search across name, tags, provider
  if (query) {
    const lower = query.toLowerCase();
    results = results.filter(
      (m) =>
        m.name.toLowerCase().includes(lower) ||
        m.provider.toLowerCase().includes(lower) ||
        m.tags.some((t) => t.toLowerCase().includes(lower))
    );
  }

  if (provider) {
    results = results.filter((m) => m.provider === provider);
  }

  if (tags && tags.length > 0) {
    results = results.filter((m) => tags.every((t) => m.tags.includes(t)));
  }

  if (deprecated !== undefined) {
    results = results.filter((m) => m.deprecated === deprecated);
  }

  if (minContextWindow !== undefined) {
    results = results.filter((m) => m.contextWindow >= minContextWindow);
  }

  if (capabilityName) {
    results = results.filter((m) =>
      m.capabilities.some((c) => c.name === capabilityName && c.supported)
    );
  }

  // Sort
  results.sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "createdAt":
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case "costPerMillionInput":
        cmp = a.costPerMillionInput - b.costPerMillionInput;
        break;
      case "overallScore": {
        const scoreA = getLatestEvaluation(a.id)?.overallScore ?? -1;
        const scoreB = getLatestEvaluation(b.id)?.overallScore ?? -1;
        cmp = scoreA - scoreB;
        break;
      }
    }
    return sortOrder === "desc" ? -cmp : cmp;
  });

  const total = results.length;
  const start = (page - 1) * pageSize;
  const paged = results.slice(start, start + pageSize);

  return {
    models: paged,
    total,
    page,
    pageSize,
    hasMore: start + pageSize < total,
  };
}

// ---------------------------------------------------------------------------
// Reset (for testing)
// ---------------------------------------------------------------------------

export function resetRegistry(): void {
  models = new Map();
}
