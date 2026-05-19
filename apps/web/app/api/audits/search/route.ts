/**
 * Audit search API: full-text search, faceted filtering
 * (model, theory, date, score), highlighting, sorting options,
 * pagination (Issue #505).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchParams {
  q?: string;
  model?: string;
  provider?: string;
  theory?: string;
  status?: string;
  scoreMin?: number;
  scoreMax?: number;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

interface HighlightSpan {
  field: string;
  snippet: string;
}

interface SearchHit {
  id: string;
  modelName: string;
  modelProvider: string;
  status: string;
  overallScore: number | null;
  theoryScores: Record<string, number> | null;
  startedAt: string;
  completedAt: string | null;
  highlights: HighlightSpan[];
}

interface FacetBucket {
  value: string;
  count: number;
}

interface Facets {
  models: FacetBucket[];
  providers: FacetBucket[];
  statuses: FacetBucket[];
  scoreRanges: FacetBucket[];
}

interface SearchResponse {
  hits: SearchHit[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  facets: Facets;
  query: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseSearchParams(url: URL): SearchParams {
  return {
    q: url.searchParams.get("q") ?? undefined,
    model: url.searchParams.get("model") ?? undefined,
    provider: url.searchParams.get("provider") ?? undefined,
    theory: url.searchParams.get("theory") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    scoreMin: url.searchParams.has("scoreMin")
      ? Number(url.searchParams.get("scoreMin"))
      : undefined,
    scoreMax: url.searchParams.has("scoreMax")
      ? Number(url.searchParams.get("scoreMax"))
      : undefined,
    dateFrom: url.searchParams.get("dateFrom") ?? undefined,
    dateTo: url.searchParams.get("dateTo") ?? undefined,
    sortBy: url.searchParams.get("sortBy") ?? "created_at",
    sortOrder: (url.searchParams.get("sortOrder") as "asc" | "desc") ?? "desc",
    page: url.searchParams.has("page")
      ? Math.max(1, Number(url.searchParams.get("page")))
      : 1,
    pageSize: url.searchParams.has("pageSize")
      ? Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize"))))
      : 20,
  };
}

function highlightMatch(text: string, query: string): string {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`(${escaped})`, "gi"), "<mark>$1</mark>");
}

function buildHighlights(
  audit: Record<string, unknown>,
  query: string
): HighlightSpan[] {
  if (!query) return [];
  const spans: HighlightSpan[] = [];
  const lowerQ = query.toLowerCase();

  const modelName = String(audit.model_name ?? "");
  if (modelName.toLowerCase().includes(lowerQ)) {
    spans.push({ field: "modelName", snippet: highlightMatch(modelName, query) });
  }

  const provider = String(audit.model_provider ?? "");
  if (provider.toLowerCase().includes(lowerQ)) {
    spans.push({ field: "modelProvider", snippet: highlightMatch(provider, query) });
  }

  const report = String(audit.report_markdown ?? "");
  if (report.toLowerCase().includes(lowerQ)) {
    const idx = report.toLowerCase().indexOf(lowerQ);
    const start = Math.max(0, idx - 60);
    const end = Math.min(report.length, idx + query.length + 60);
    const fragment = (start > 0 ? "..." : "") + report.slice(start, end) + (end < report.length ? "..." : "");
    spans.push({ field: "report", snippet: highlightMatch(fragment, query) });
  }

  return spans;
}

function scoreRange(score: number | null): string {
  if (score === null) return "unscored";
  if (score < 0.3) return "low (0-0.3)";
  if (score < 0.6) return "mid (0.3-0.6)";
  return "high (0.6-1.0)";
}

function buildFacets(audits: Record<string, unknown>[]): Facets {
  const models = new Map<string, number>();
  const providers = new Map<string, number>();
  const statuses = new Map<string, number>();
  const ranges = new Map<string, number>();

  for (const a of audits) {
    const m = String(a.model_name ?? "");
    models.set(m, (models.get(m) ?? 0) + 1);
    const p = String(a.model_provider ?? "");
    providers.set(p, (providers.get(p) ?? 0) + 1);
    const s = String(a.status ?? "");
    statuses.set(s, (statuses.get(s) ?? 0) + 1);
    const r = scoreRange(a.overall_score as number | null);
    ranges.set(r, (ranges.get(r) ?? 0) + 1);
  }

  const toBuckets = (map: Map<string, number>): FacetBucket[] =>
    Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);

  return {
    models: toBuckets(models),
    providers: toBuckets(providers),
    statuses: toBuckets(statuses),
    scoreRanges: toBuckets(ranges),
  };
}

// ---------------------------------------------------------------------------
// Allowed sort columns (whitelist to prevent SQL injection)
// ---------------------------------------------------------------------------

const ALLOWED_SORT_COLUMNS: Record<string, string> = {
  created_at: "created_at",
  overall_score: "overall_score",
  model_name: "model_name",
  started_at: "started_at",
  completed_at: "completed_at",
};

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = parseSearchParams(new URL(request.url));

    // Base query
    let query = supabase
      .from("audits")
      .select(
        "id, model_name, model_provider, status, overall_score, theory_scores, started_at, completed_at, report_markdown, created_at",
        { count: "exact" }
      )
      .eq("user_id", user.id);

    // Filters
    if (params.model) {
      query = query.ilike("model_name", `%${params.model}%`);
    }
    if (params.provider) {
      query = query.eq("model_provider", params.provider);
    }
    if (params.status) {
      query = query.eq("status", params.status);
    }
    if (params.scoreMin !== undefined) {
      query = query.gte("overall_score", params.scoreMin);
    }
    if (params.scoreMax !== undefined) {
      query = query.lte("overall_score", params.scoreMax);
    }
    if (params.dateFrom) {
      query = query.gte("started_at", params.dateFrom);
    }
    if (params.dateTo) {
      query = query.lte("started_at", params.dateTo);
    }

    // Full-text search on model_name (Supabase text search)
    if (params.q) {
      query = query.or(
        `model_name.ilike.%${params.q}%,model_provider.ilike.%${params.q}%`
      );
    }

    // Sorting
    const sortCol = ALLOWED_SORT_COLUMNS[params.sortBy ?? "created_at"] ?? "created_at";
    query = query.order(sortCol, {
      ascending: params.sortOrder === "asc",
      nullsFirst: false,
    });

    // Fetch all for facets, then paginate
    const { data: allAudits, error: allError } = await query;

    if (allError) {
      return NextResponse.json(
        { error: "Search failed", details: allError.message },
        { status: 500 }
      );
    }

    const audits = allAudits ?? [];

    // Theory filter (post-query since theory_scores is JSONB)
    let filtered = audits;
    if (params.theory) {
      filtered = audits.filter((a: Record<string, unknown>) => {
        const scores = a.theory_scores as Record<string, number> | null;
        return scores && params.theory! in scores;
      });
    }

    // Build facets from full result set
    const facets = buildFacets(filtered);

    // Paginate
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    const hits: SearchHit[] = paged.map((a: Record<string, unknown>) => ({
      id: String(a.id),
      modelName: String(a.model_name),
      modelProvider: String(a.model_provider),
      status: String(a.status),
      overallScore: a.overall_score as number | null,
      theoryScores: a.theory_scores as Record<string, number> | null,
      startedAt: String(a.started_at),
      completedAt: a.completed_at ? String(a.completed_at) : null,
      highlights: buildHighlights(a, params.q ?? ""),
    }));

    const response: SearchResponse = {
      hits,
      total: filtered.length,
      page,
      pageSize,
      hasMore: start + pageSize < filtered.length,
      facets,
      query: params.q ?? "",
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
