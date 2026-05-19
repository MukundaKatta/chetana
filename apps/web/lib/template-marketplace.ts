/**
 * Audit template marketplace (Issue #444).
 * Browse community-contributed audit templates, rate/review them,
 * import with one click, preview before import, and track usage statistics.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface TemplateAuthor {
  id: string;
  displayName: string;
  avatarUrl?: string;
  verified: boolean;
}

export interface TemplateProbe {
  id: string;
  title: string;
  description: string;
  theory: string;
  category: string;
  promptTemplate: string;
}

export interface AuditTemplate {
  id: string;
  /** Human-readable title. */
  title: string;
  /** Detailed description. */
  description: string;
  /** Template author. */
  author: TemplateAuthor;
  /** Semantic version (e.g. "1.2.0"). */
  version: string;
  /** Consciousness theories covered. */
  theories: string[];
  /** Target model types. */
  targetModels: string[];
  /** Probes included in the template. */
  probes: TemplateProbe[];
  /** Tags for discovery. */
  tags: string[];
  /** ISO timestamp of creation. */
  createdAt: string;
  /** ISO timestamp of last update. */
  updatedAt: string;
  /** Whether the template is publicly listed. */
  published: boolean;
  /** License identifier (e.g. "MIT", "CC-BY-4.0"). */
  license: string;
}

export interface TemplateReview {
  id: string;
  templateId: string;
  userId: string;
  displayName: string;
  /** Rating from 1-5. */
  rating: number;
  /** Review text. */
  comment: string;
  /** ISO timestamp. */
  createdAt: string;
  /** Helpful vote count. */
  helpfulCount: number;
}

export interface TemplateStats {
  templateId: string;
  totalImports: number;
  weeklyImports: number;
  averageRating: number;
  reviewCount: number;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface TemplatePreview {
  template: AuditTemplate;
  stats: TemplateStats;
  recentReviews: TemplateReview[];
  /** Whether the current user has already imported this template. */
  alreadyImported: boolean;
  /** Compatibility warnings (e.g. "requires model X"). */
  warnings: string[];
}

export type SortOption =
  | "popular"
  | "recent"
  | "top_rated"
  | "most_reviewed";

export interface BrowseFilters {
  /** Search query. */
  query?: string;
  /** Filter by theories. */
  theories?: string[];
  /** Filter by tags. */
  tags?: string[];
  /** Filter by author. */
  authorId?: string;
  /** Minimum rating. */
  minRating?: number;
  /** Sort option. */
  sort?: SortOption;
  /** Page number (1-indexed). */
  page?: number;
  /** Items per page (default 20). */
  pageSize?: number;
}

export interface BrowseResult {
  templates: Array<AuditTemplate & { stats: TemplateStats }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ImportResult {
  success: boolean;
  templateId: string;
  importedProbes: number;
  /** New audit ID if an audit was created. */
  auditId?: string;
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  Template marketplace                                              */
/* ------------------------------------------------------------------ */

export class TemplateMarketplace {
  private templates = new Map<string, AuditTemplate>();
  private reviews = new Map<string, TemplateReview[]>();
  private stats = new Map<string, TemplateStats>();
  private imports = new Map<string, Set<string>>(); // templateId -> set of userIds

  /**
   * Publish a template to the marketplace.
   */
  publishTemplate(template: AuditTemplate): AuditTemplate {
    const published: AuditTemplate = {
      ...template,
      published: true,
      updatedAt: new Date().toISOString(),
    };

    this.templates.set(template.id, published);

    if (!this.stats.has(template.id)) {
      this.stats.set(template.id, {
        templateId: template.id,
        totalImports: 0,
        weeklyImports: 0,
        averageRating: 0,
        reviewCount: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      });
    }

    if (!this.reviews.has(template.id)) {
      this.reviews.set(template.id, []);
    }

    return published;
  }

  /**
   * Browse templates with filters and sorting.
   */
  browse(filters: BrowseFilters = {}): BrowseResult {
    const {
      query,
      theories,
      tags,
      authorId,
      minRating,
      sort = "popular",
      page = 1,
      pageSize = 20,
    } = filters;

    let results = Array.from(this.templates.values()).filter(
      (t) => t.published,
    );

    // Apply filters
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)),
      );
    }

    if (theories && theories.length > 0) {
      results = results.filter((t) =>
        theories.some((theory) => t.theories.includes(theory)),
      );
    }

    if (tags && tags.length > 0) {
      results = results.filter((t) =>
        tags.some((tag) => t.tags.includes(tag)),
      );
    }

    if (authorId) {
      results = results.filter((t) => t.author.id === authorId);
    }

    if (minRating !== undefined) {
      results = results.filter((t) => {
        const s = this.stats.get(t.id);
        return s && s.averageRating >= minRating;
      });
    }

    // Sort
    results.sort((a, b) => {
      const statsA = this.stats.get(a.id);
      const statsB = this.stats.get(b.id);
      switch (sort) {
        case "popular":
          return (
            (statsB?.totalImports ?? 0) - (statsA?.totalImports ?? 0)
          );
        case "recent":
          return (
            new Date(b.updatedAt).getTime() -
            new Date(a.updatedAt).getTime()
          );
        case "top_rated":
          return (
            (statsB?.averageRating ?? 0) -
            (statsA?.averageRating ?? 0)
          );
        case "most_reviewed":
          return (
            (statsB?.reviewCount ?? 0) - (statsA?.reviewCount ?? 0)
          );
        default:
          return 0;
      }
    });

    // Paginate
    const total = results.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const pageResults = results.slice(start, start + pageSize);

    return {
      templates: pageResults.map((t) => ({
        ...t,
        stats: this.stats.get(t.id) ?? {
          templateId: t.id,
          totalImports: 0,
          weeklyImports: 0,
          averageRating: 0,
          reviewCount: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        },
      })),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Get a template preview with stats and reviews.
   */
  getPreview(templateId: string, userId?: string): TemplatePreview | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const stats = this.stats.get(templateId) ?? {
      templateId,
      totalImports: 0,
      weeklyImports: 0,
      averageRating: 0,
      reviewCount: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };

    const allReviews = this.reviews.get(templateId) ?? [];
    const recentReviews = [...allReviews]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);

    const alreadyImported = userId
      ? this.imports.get(templateId)?.has(userId) ?? false
      : false;

    const warnings: string[] = [];
    if (template.probes.length === 0) {
      warnings.push("This template has no probes defined.");
    }
    if (template.theories.length === 0) {
      warnings.push("No target theories specified.");
    }

    return { template, stats, recentReviews, alreadyImported, warnings };
  }

  /**
   * Add a review for a template.
   */
  addReview(
    templateId: string,
    userId: string,
    displayName: string,
    rating: number,
    comment: string,
  ): TemplateReview | null {
    if (!this.templates.has(templateId)) return null;
    if (rating < 1 || rating > 5) return null;

    const review: TemplateReview = {
      id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      templateId,
      userId,
      displayName,
      rating: Math.round(rating),
      comment,
      createdAt: new Date().toISOString(),
      helpfulCount: 0,
    };

    const reviews = this.reviews.get(templateId) ?? [];
    reviews.push(review);
    this.reviews.set(templateId, reviews);

    // Update stats
    this.recalculateStats(templateId);

    return review;
  }

  /**
   * Mark a review as helpful.
   */
  markHelpful(templateId: string, reviewId: string): boolean {
    const reviews = this.reviews.get(templateId);
    if (!reviews) return false;

    const review = reviews.find((r) => r.id === reviewId);
    if (!review) return false;

    review.helpfulCount++;
    return true;
  }

  /**
   * Import a template (record the import).
   */
  importTemplate(templateId: string, userId: string): ImportResult {
    const template = this.templates.get(templateId);
    if (!template) {
      return {
        success: false,
        templateId,
        importedProbes: 0,
        error: "Template not found.",
      };
    }

    // Track import
    if (!this.imports.has(templateId)) {
      this.imports.set(templateId, new Set());
    }
    this.imports.get(templateId)!.add(userId);

    // Update stats
    const stats = this.stats.get(templateId);
    if (stats) {
      stats.totalImports++;
      stats.weeklyImports++;
    }

    return {
      success: true,
      templateId,
      importedProbes: template.probes.length,
      auditId: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
  }

  /**
   * Get usage statistics for a template.
   */
  getStats(templateId: string): TemplateStats | null {
    return this.stats.get(templateId) ?? null;
  }

  /**
   * Recalculate aggregate stats for a template.
   */
  private recalculateStats(templateId: string): void {
    const reviews = this.reviews.get(templateId) ?? [];
    const stats = this.stats.get(templateId);
    if (!stats) return;

    stats.reviewCount = reviews.length;
    stats.ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    let total = 0;
    for (const review of reviews) {
      const r = Math.round(review.rating) as 1 | 2 | 3 | 4 | 5;
      if (r >= 1 && r <= 5) {
        stats.ratingDistribution[r]++;
      }
      total += review.rating;
    }

    stats.averageRating = reviews.length > 0 ? total / reviews.length : 0;
  }
}

/**
 * Singleton marketplace instance.
 */
let _marketplace: TemplateMarketplace | null = null;

export function getTemplateMarketplace(): TemplateMarketplace {
  if (!_marketplace) {
    _marketplace = new TemplateMarketplace();
  }
  return _marketplace;
}
