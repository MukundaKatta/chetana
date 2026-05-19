/**
 * Issue #434 - Probe tagging and categorization
 *
 * Free-form tags, predefined categories,
 * tag-based filtering, tag cloud data,
 * bulk tag operations.
 */

import type { Theory, IndicatorId } from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ProbeTag {
  name: string;
  color?: string;
  createdAt: string;
}

export interface ProbeCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon?: string;
}

export interface TaggedProbe {
  probeId: string;
  tags: string[];
  categories: string[];
  theory?: Theory;
  indicatorId?: IndicatorId;
}

export interface TagCloudItem {
  tag: string;
  count: number;
  weight: number;
  color?: string;
}

export interface TagFilterResult {
  probes: TaggedProbe[];
  totalCount: number;
  matchedCount: number;
  appliedTags: string[];
  appliedCategories: string[];
}

export interface BulkTagOperation {
  type: "add" | "remove" | "replace";
  probeIds: string[];
  tags?: string[];
  categories?: string[];
}

export interface BulkTagResult {
  operation: BulkTagOperation["type"];
  affected: number;
  skipped: number;
  errors: Array<{ probeId: string; error: string }>;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "chetana:probe-tags";
const CATEGORIES_KEY = "chetana:probe-categories";

const PREDEFINED_CATEGORIES: ProbeCategory[] = [
  {
    id: "cat-metacognition",
    name: "Metacognition",
    description: "Probes testing self-awareness and meta-cognitive abilities",
    color: "#a78bfa",
    icon: "brain",
  },
  {
    id: "cat-emotional",
    name: "Emotional Processing",
    description: "Probes testing emotional recognition and response",
    color: "#f87171",
    icon: "heart",
  },
  {
    id: "cat-integration",
    name: "Information Integration",
    description: "Probes testing cross-modal information binding",
    color: "#60a5fa",
    icon: "link",
  },
  {
    id: "cat-temporal",
    name: "Temporal Awareness",
    description: "Probes testing time perception and temporal reasoning",
    color: "#fbbf24",
    icon: "clock",
  },
  {
    id: "cat-agency",
    name: "Agency & Autonomy",
    description: "Probes testing goal-directed behavior and autonomous decision-making",
    color: "#34d399",
    icon: "compass",
  },
  {
    id: "cat-attention",
    name: "Attention & Selection",
    description: "Probes testing selective attention and attentional control",
    color: "#f472b6",
    icon: "eye",
  },
  {
    id: "cat-prediction",
    name: "Predictive Processing",
    description: "Probes testing prediction and surprise responses",
    color: "#818cf8",
    icon: "trending-up",
  },
];

const TAG_COLORS = [
  "#60a5fa", "#a78bfa", "#f87171", "#34d399",
  "#fbbf24", "#f472b6", "#818cf8", "#2dd4bf",
  "#fb923c", "#a3e635",
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

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

function normalizeTag(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/* ------------------------------------------------------------------ */
/*  Tag Manager                                                       */
/* ------------------------------------------------------------------ */

export class ProbeTagManager {
  private probes: Map<string, TaggedProbe> = new Map();
  private tags: Map<string, ProbeTag> = new Map();
  private categories: Map<string, ProbeCategory> = new Map();

  constructor() {
    this.loadDefaults();
    this.load();
  }

  private loadDefaults(): void {
    for (const cat of PREDEFINED_CATEGORIES) {
      this.categories.set(cat.id, cat);
    }
  }

  private load(): void {
    const storage = getStorage();
    if (!storage) return;

    const probeData = safeJsonParse<Record<string, TaggedProbe>>(
      storage.getItem(STORAGE_KEY),
      {},
    );
    for (const [key, value] of Object.entries(probeData)) {
      this.probes.set(key, value);
      // Auto-register tags
      for (const tag of value.tags) {
        if (!this.tags.has(tag)) {
          this.tags.set(tag, { name: tag, createdAt: new Date().toISOString() });
        }
      }
    }

    const catData = safeJsonParse<Record<string, ProbeCategory>>(
      storage.getItem(CATEGORIES_KEY),
      {},
    );
    for (const [key, value] of Object.entries(catData)) {
      this.categories.set(key, value);
    }
  }

  private persist(): void {
    const storage = getStorage();
    if (!storage) return;

    const probeObj: Record<string, TaggedProbe> = {};
    for (const [key, value] of this.probes) {
      probeObj[key] = value;
    }
    storage.setItem(STORAGE_KEY, JSON.stringify(probeObj));

    const catObj: Record<string, ProbeCategory> = {};
    for (const [key, value] of this.categories) {
      catObj[key] = value;
    }
    storage.setItem(CATEGORIES_KEY, JSON.stringify(catObj));
  }

  /* ---- Tag operations ---- */

  addTag(probeId: string, tag: string): TaggedProbe {
    const normalized = normalizeTag(tag);
    if (!normalized) throw new Error("Tag cannot be empty");

    let probe = this.probes.get(probeId);
    if (!probe) {
      probe = { probeId, tags: [], categories: [] };
      this.probes.set(probeId, probe);
    }

    if (!probe.tags.includes(normalized)) {
      probe.tags.push(normalized);
    }

    // Register tag
    if (!this.tags.has(normalized)) {
      this.tags.set(normalized, {
        name: normalized,
        color: TAG_COLORS[this.tags.size % TAG_COLORS.length],
        createdAt: new Date().toISOString(),
      });
    }

    this.persist();
    return probe;
  }

  removeTag(probeId: string, tag: string): TaggedProbe | null {
    const normalized = normalizeTag(tag);
    const probe = this.probes.get(probeId);
    if (!probe) return null;

    probe.tags = probe.tags.filter((t) => t !== normalized);
    this.persist();
    return probe;
  }

  setTags(probeId: string, tags: string[]): TaggedProbe {
    const normalized = tags.map(normalizeTag).filter(Boolean);

    let probe = this.probes.get(probeId);
    if (!probe) {
      probe = { probeId, tags: [], categories: [] };
      this.probes.set(probeId, probe);
    }

    probe.tags = [...new Set(normalized)];

    for (const tag of probe.tags) {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, {
          name: tag,
          color: TAG_COLORS[this.tags.size % TAG_COLORS.length],
          createdAt: new Date().toISOString(),
        });
      }
    }

    this.persist();
    return probe;
  }

  /* ---- Category operations ---- */

  addCategory(probeId: string, categoryId: string): TaggedProbe | null {
    if (!this.categories.has(categoryId)) return null;

    let probe = this.probes.get(probeId);
    if (!probe) {
      probe = { probeId, tags: [], categories: [] };
      this.probes.set(probeId, probe);
    }

    if (!probe.categories.includes(categoryId)) {
      probe.categories.push(categoryId);
    }

    this.persist();
    return probe;
  }

  removeCategory(probeId: string, categoryId: string): TaggedProbe | null {
    const probe = this.probes.get(probeId);
    if (!probe) return null;

    probe.categories = probe.categories.filter((c) => c !== categoryId);
    this.persist();
    return probe;
  }

  createCategory(params: Omit<ProbeCategory, "id">): ProbeCategory {
    const id = `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const category: ProbeCategory = { id, ...params };
    this.categories.set(id, category);
    this.persist();
    return category;
  }

  deleteCategory(categoryId: string): boolean {
    const deleted = this.categories.delete(categoryId);
    if (deleted) {
      // Remove from all probes
      for (const probe of this.probes.values()) {
        probe.categories = probe.categories.filter((c) => c !== categoryId);
      }
      this.persist();
    }
    return deleted;
  }

  /* ---- Querying ---- */

  getProbe(probeId: string): TaggedProbe | null {
    return this.probes.get(probeId) ?? null;
  }

  getAllTags(): ProbeTag[] {
    return Array.from(this.tags.values());
  }

  getAllCategories(): ProbeCategory[] {
    return Array.from(this.categories.values());
  }

  /** Filter probes by tags and/or categories. */
  filter(params: {
    tags?: string[];
    categories?: string[];
    matchAll?: boolean;
  }): TagFilterResult {
    const { tags = [], categories = [], matchAll = false } = params;
    const allProbes = Array.from(this.probes.values());

    const normalizedTags = tags.map(normalizeTag);

    const matched = allProbes.filter((probe) => {
      const tagMatch =
        normalizedTags.length === 0 ||
        (matchAll
          ? normalizedTags.every((t) => probe.tags.includes(t))
          : normalizedTags.some((t) => probe.tags.includes(t)));

      const catMatch =
        categories.length === 0 ||
        (matchAll
          ? categories.every((c) => probe.categories.includes(c))
          : categories.some((c) => probe.categories.includes(c)));

      return tagMatch && catMatch;
    });

    return {
      probes: matched,
      totalCount: allProbes.length,
      matchedCount: matched.length,
      appliedTags: normalizedTags,
      appliedCategories: categories,
    };
  }

  /* ---- Tag Cloud ---- */

  getTagCloud(): TagCloudItem[] {
    const counts = new Map<string, number>();

    for (const probe of this.probes.values()) {
      for (const tag of probe.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }

    const maxCount = Math.max(...counts.values(), 1);

    return Array.from(counts.entries())
      .map(([tag, count]) => ({
        tag,
        count,
        weight: count / maxCount,
        color: this.tags.get(tag)?.color,
      }))
      .sort((a, b) => b.count - a.count);
  }

  /* ---- Bulk Operations ---- */

  bulkOperation(operation: BulkTagOperation): BulkTagResult {
    let affected = 0;
    let skipped = 0;
    const errors: Array<{ probeId: string; error: string }> = [];

    for (const probeId of operation.probeIds) {
      try {
        switch (operation.type) {
          case "add":
            if (operation.tags) {
              for (const tag of operation.tags) {
                this.addTag(probeId, tag);
              }
            }
            if (operation.categories) {
              for (const cat of operation.categories) {
                this.addCategory(probeId, cat);
              }
            }
            affected++;
            break;

          case "remove":
            if (operation.tags) {
              for (const tag of operation.tags) {
                this.removeTag(probeId, tag);
              }
            }
            if (operation.categories) {
              for (const cat of operation.categories) {
                this.removeCategory(probeId, cat);
              }
            }
            affected++;
            break;

          case "replace": {
            const probe = this.probes.get(probeId);
            if (probe) {
              if (operation.tags !== undefined) {
                probe.tags = operation.tags.map(normalizeTag).filter(Boolean);
              }
              if (operation.categories !== undefined) {
                probe.categories = operation.categories.filter((c) => this.categories.has(c));
              }
              affected++;
            } else {
              skipped++;
            }
            break;
          }
        }
      } catch (err) {
        errors.push({
          probeId,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    this.persist();

    return {
      operation: operation.type,
      affected,
      skipped,
      errors,
    };
  }

  /* ---- Utilities ---- */

  /** Get probes that share tags with the given probe. */
  getRelatedProbes(probeId: string, limit = 10): TaggedProbe[] {
    const probe = this.probes.get(probeId);
    if (!probe) return [];

    const tagSet = new Set(probe.tags);
    const scored: Array<{ probe: TaggedProbe; overlap: number }> = [];

    for (const other of this.probes.values()) {
      if (other.probeId === probeId) continue;
      const overlap = other.tags.filter((t) => tagSet.has(t)).length;
      if (overlap > 0) {
        scored.push({ probe: other, overlap });
      }
    }

    return scored
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, limit)
      .map((s) => s.probe);
  }

  /** Get the total number of tagged probes. */
  getProbeCount(): number {
    return this.probes.size;
  }

  /** Clear all tagging data. */
  clear(): void {
    this.probes.clear();
    this.tags.clear();
    this.persist();
  }
}

/* ------------------------------------------------------------------ */
/*  Singleton                                                         */
/* ------------------------------------------------------------------ */

let _instance: ProbeTagManager | null = null;

export function getProbeTagManager(): ProbeTagManager {
  if (!_instance) {
    _instance = new ProbeTagManager();
  }
  return _instance;
}

/* ------------------------------------------------------------------ */
/*  Exports                                                           */
/* ------------------------------------------------------------------ */

export { PREDEFINED_CATEGORIES, normalizeTag };
