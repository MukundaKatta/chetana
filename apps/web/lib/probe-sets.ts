/**
 * Issue #422 - Probe set management
 *
 * CRUD for probe sets, ordering within sets,
 * templates for common scenarios,
 * sharing, versioning with changelog.
 */

import type { ProbeDefinition, Theory, IndicatorId } from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ProbeSetItem {
  probeId: string;
  order: number;
  enabled: boolean;
  overrides?: Partial<Pick<ProbeDefinition, "prompt" | "systemPrompt" | "scoringCriteria">>;
}

export interface ProbeSet {
  id: string;
  name: string;
  description: string;
  items: ProbeSetItem[];
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  isTemplate: boolean;
  isShared: boolean;
  shareToken?: string;
}

export interface ProbeSetChangelog {
  version: number;
  changes: string;
  changedBy: string;
  changedAt: string;
  itemsAdded: string[];
  itemsRemoved: string[];
  itemsReordered: boolean;
}

export interface ProbeSetTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  probeIds: string[];
  theories: Theory[];
}

export type TemplateCategory =
  | "quick-scan"
  | "comprehensive"
  | "theory-specific"
  | "regression"
  | "custom";

export interface ProbeSetShareInfo {
  setId: string;
  shareToken: string;
  sharedBy: string;
  sharedAt: string;
  expiresAt: string | null;
  accessCount: number;
}

export interface ProbeSetFilter {
  search?: string;
  tags?: string[];
  theories?: Theory[];
  templateOnly?: boolean;
  sharedOnly?: boolean;
  createdBy?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "chetana:probe-sets";
const CHANGELOG_KEY = "chetana:probe-set-changelogs";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function generateId(): string {
  return `pset_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function generateShareToken(): string {
  return `share_${Math.random().toString(36).slice(2, 18)}`;
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Templates                                                         */
/* ------------------------------------------------------------------ */

const BUILT_IN_TEMPLATES: ProbeSetTemplate[] = [
  {
    id: "tpl-quick-scan",
    name: "Quick Scan",
    description: "Fast 5-probe scan covering key consciousness indicators",
    category: "quick-scan",
    probeIds: ["gwt-awareness", "hot-metacognition", "iit-integration", "pp-prediction", "ast-attention"],
    theories: ["gwt", "hot", "iit", "pp", "ast"],
  },
  {
    id: "tpl-comprehensive",
    name: "Comprehensive Audit",
    description: "Full probe set covering all theories and indicators",
    category: "comprehensive",
    probeIds: [
      "gwt-awareness", "gwt-broadcast", "gwt-workspace", "gwt-access",
      "hot-metacognition", "hot-reflection", "hot-monitoring", "hot-introspection",
      "iit-integration", "iit-differentiation",
      "rpt-recurrence", "rpt-feedback",
      "pp-prediction", "pp-surprise",
      "ast-attention",
    ],
    theories: ["gwt", "hot", "iit", "rpt", "pp", "ast"],
  },
  {
    id: "tpl-gwt-focus",
    name: "GWT Focus",
    description: "Deep dive into Global Workspace Theory indicators",
    category: "theory-specific",
    probeIds: ["gwt-awareness", "gwt-broadcast", "gwt-workspace", "gwt-access"],
    theories: ["gwt"],
  },
  {
    id: "tpl-hot-focus",
    name: "HOT Focus",
    description: "Deep dive into Higher-Order Theory indicators",
    category: "theory-specific",
    probeIds: ["hot-metacognition", "hot-reflection", "hot-monitoring", "hot-introspection"],
    theories: ["hot"],
  },
  {
    id: "tpl-regression",
    name: "Regression Check",
    description: "Minimal probes for detecting score regression between model versions",
    category: "regression",
    probeIds: ["gwt-awareness", "hot-metacognition", "iit-integration"],
    theories: ["gwt", "hot", "iit"],
  },
];

export function getBuiltInTemplates(): ProbeSetTemplate[] {
  return [...BUILT_IN_TEMPLATES];
}

export function getTemplatesByCategory(category: TemplateCategory): ProbeSetTemplate[] {
  return BUILT_IN_TEMPLATES.filter((t) => t.category === category);
}

export function getTemplateById(id: string): ProbeSetTemplate | null {
  return BUILT_IN_TEMPLATES.find((t) => t.id === id) ?? null;
}

/* ------------------------------------------------------------------ */
/*  Probe Set Manager                                                 */
/* ------------------------------------------------------------------ */

export class ProbeSetManager {
  private sets: Map<string, ProbeSet> = new Map();
  private changelogs: Map<string, ProbeSetChangelog[]> = new Map();

  constructor() {
    this.load();
  }

  private load(): void {
    const storage = getStorage();
    if (!storage) return;

    const setsData = safeJsonParse<Record<string, ProbeSet>>(
      storage.getItem(STORAGE_KEY),
      {},
    );
    for (const [key, value] of Object.entries(setsData)) {
      this.sets.set(key, value);
    }

    const changelogData = safeJsonParse<Record<string, ProbeSetChangelog[]>>(
      storage.getItem(CHANGELOG_KEY),
      {},
    );
    for (const [key, value] of Object.entries(changelogData)) {
      this.changelogs.set(key, value);
    }
  }

  private persist(): void {
    const storage = getStorage();
    if (!storage) return;

    const setsObj: Record<string, ProbeSet> = {};
    for (const [key, value] of this.sets) {
      setsObj[key] = value;
    }
    storage.setItem(STORAGE_KEY, JSON.stringify(setsObj));

    const changelogObj: Record<string, ProbeSetChangelog[]> = {};
    for (const [key, value] of this.changelogs) {
      changelogObj[key] = value;
    }
    storage.setItem(CHANGELOG_KEY, JSON.stringify(changelogObj));
  }

  /* ---- CRUD ---- */

  create(params: {
    name: string;
    description?: string;
    probeIds?: string[];
    tags?: string[];
    createdBy: string;
    isTemplate?: boolean;
  }): ProbeSet {
    const id = generateId();
    const now = new Date().toISOString();

    const items: ProbeSetItem[] = (params.probeIds ?? []).map((probeId, i) => ({
      probeId,
      order: i,
      enabled: true,
    }));

    const probeSet: ProbeSet = {
      id,
      name: params.name,
      description: params.description ?? "",
      items,
      tags: params.tags ?? [],
      createdBy: params.createdBy,
      createdAt: now,
      updatedAt: now,
      version: 1,
      isTemplate: params.isTemplate ?? false,
      isShared: false,
    };

    this.sets.set(id, probeSet);
    this.changelogs.set(id, [
      {
        version: 1,
        changes: "Initial creation",
        changedBy: params.createdBy,
        changedAt: now,
        itemsAdded: params.probeIds ?? [],
        itemsRemoved: [],
        itemsReordered: false,
      },
    ]);

    this.persist();
    return probeSet;
  }

  get(id: string): ProbeSet | null {
    return this.sets.get(id) ?? null;
  }

  list(filter?: ProbeSetFilter): ProbeSet[] {
    let sets = Array.from(this.sets.values());

    if (filter) {
      if (filter.search) {
        const q = filter.search.toLowerCase();
        sets = sets.filter(
          (s) =>
            s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
        );
      }
      if (filter.tags && filter.tags.length > 0) {
        sets = sets.filter((s) => filter.tags!.some((t) => s.tags.includes(t)));
      }
      if (filter.templateOnly) {
        sets = sets.filter((s) => s.isTemplate);
      }
      if (filter.sharedOnly) {
        sets = sets.filter((s) => s.isShared);
      }
      if (filter.createdBy) {
        sets = sets.filter((s) => s.createdBy === filter.createdBy);
      }
    }

    return sets.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  update(
    id: string,
    updates: Partial<Pick<ProbeSet, "name" | "description" | "tags">>,
    changedBy: string,
  ): ProbeSet | null {
    const set = this.sets.get(id);
    if (!set) return null;

    const now = new Date().toISOString();
    Object.assign(set, updates, {
      updatedAt: now,
      version: set.version + 1,
    });

    this.addChangelog(id, {
      version: set.version,
      changes: `Updated: ${Object.keys(updates).join(", ")}`,
      changedBy,
      changedAt: now,
      itemsAdded: [],
      itemsRemoved: [],
      itemsReordered: false,
    });

    this.persist();
    return set;
  }

  delete(id: string): boolean {
    const deleted = this.sets.delete(id);
    this.changelogs.delete(id);
    if (deleted) this.persist();
    return deleted;
  }

  /* ---- Item management ---- */

  addItem(
    setId: string,
    probeId: string,
    position?: number,
    changedBy?: string,
  ): ProbeSet | null {
    const set = this.sets.get(setId);
    if (!set) return null;

    const existingIndex = set.items.findIndex((item) => item.probeId === probeId);
    if (existingIndex !== -1) return set;

    const order = position ?? set.items.length;
    const item: ProbeSetItem = { probeId, order, enabled: true };

    set.items.splice(order, 0, item);
    this.reorderItems(set);
    set.updatedAt = new Date().toISOString();
    set.version += 1;

    this.addChangelog(setId, {
      version: set.version,
      changes: `Added probe: ${probeId}`,
      changedBy: changedBy ?? "system",
      changedAt: set.updatedAt,
      itemsAdded: [probeId],
      itemsRemoved: [],
      itemsReordered: false,
    });

    this.persist();
    return set;
  }

  removeItem(setId: string, probeId: string, changedBy?: string): ProbeSet | null {
    const set = this.sets.get(setId);
    if (!set) return null;

    const idx = set.items.findIndex((item) => item.probeId === probeId);
    if (idx === -1) return set;

    set.items.splice(idx, 1);
    this.reorderItems(set);
    set.updatedAt = new Date().toISOString();
    set.version += 1;

    this.addChangelog(setId, {
      version: set.version,
      changes: `Removed probe: ${probeId}`,
      changedBy: changedBy ?? "system",
      changedAt: set.updatedAt,
      itemsAdded: [],
      itemsRemoved: [probeId],
      itemsReordered: false,
    });

    this.persist();
    return set;
  }

  moveItem(setId: string, probeId: string, newOrder: number, changedBy?: string): ProbeSet | null {
    const set = this.sets.get(setId);
    if (!set) return null;

    const idx = set.items.findIndex((item) => item.probeId === probeId);
    if (idx === -1) return set;

    const [item] = set.items.splice(idx, 1);
    const insertAt = Math.max(0, Math.min(newOrder, set.items.length));
    set.items.splice(insertAt, 0, item);
    this.reorderItems(set);
    set.updatedAt = new Date().toISOString();
    set.version += 1;

    this.addChangelog(setId, {
      version: set.version,
      changes: `Reordered probe: ${probeId} to position ${newOrder}`,
      changedBy: changedBy ?? "system",
      changedAt: set.updatedAt,
      itemsAdded: [],
      itemsRemoved: [],
      itemsReordered: true,
    });

    this.persist();
    return set;
  }

  toggleItem(setId: string, probeId: string): ProbeSet | null {
    const set = this.sets.get(setId);
    if (!set) return null;

    const item = set.items.find((i) => i.probeId === probeId);
    if (!item) return set;

    item.enabled = !item.enabled;
    set.updatedAt = new Date().toISOString();
    this.persist();
    return set;
  }

  private reorderItems(set: ProbeSet): void {
    set.items.forEach((item, i) => {
      item.order = i;
    });
  }

  /* ---- Sharing ---- */

  share(setId: string): ProbeSetShareInfo | null {
    const set = this.sets.get(setId);
    if (!set) return null;

    const token = generateShareToken();
    set.isShared = true;
    set.shareToken = token;
    set.updatedAt = new Date().toISOString();
    this.persist();

    return {
      setId,
      shareToken: token,
      sharedBy: set.createdBy,
      sharedAt: set.updatedAt,
      expiresAt: null,
      accessCount: 0,
    };
  }

  unshare(setId: string): boolean {
    const set = this.sets.get(setId);
    if (!set) return false;

    set.isShared = false;
    set.shareToken = undefined;
    set.updatedAt = new Date().toISOString();
    this.persist();
    return true;
  }

  importFromTemplate(templateId: string, createdBy: string): ProbeSet | null {
    const template = getTemplateById(templateId);
    if (!template) return null;

    return this.create({
      name: `${template.name} (Copy)`,
      description: template.description,
      probeIds: template.probeIds,
      tags: template.theories,
      createdBy,
    });
  }

  duplicate(setId: string, createdBy: string): ProbeSet | null {
    const original = this.sets.get(setId);
    if (!original) return null;

    const duplicate = this.create({
      name: `${original.name} (Copy)`,
      description: original.description,
      probeIds: original.items.map((i) => i.probeId),
      tags: [...original.tags],
      createdBy,
    });

    return duplicate;
  }

  /* ---- Versioning / Changelog ---- */

  private addChangelog(setId: string, entry: ProbeSetChangelog): void {
    const logs = this.changelogs.get(setId) ?? [];
    logs.push(entry);
    this.changelogs.set(setId, logs);
  }

  getChangelog(setId: string): ProbeSetChangelog[] {
    return this.changelogs.get(setId) ?? [];
  }

  /* ---- Stats ---- */

  getEnabledProbeIds(setId: string): string[] {
    const set = this.sets.get(setId);
    if (!set) return [];
    return set.items
      .filter((i) => i.enabled)
      .sort((a, b) => a.order - b.order)
      .map((i) => i.probeId);
  }

  getSetCount(): number {
    return this.sets.size;
  }
}

/* ------------------------------------------------------------------ */
/*  Singleton                                                         */
/* ------------------------------------------------------------------ */

let _instance: ProbeSetManager | null = null;

export function getProbeSetManager(): ProbeSetManager {
  if (!_instance) {
    _instance = new ProbeSetManager();
  }
  return _instance;
}
