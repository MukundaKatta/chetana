import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;

  // Pagination params
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

  // Sorting params
  const sortBy = searchParams.get("sort_by") || "overall_score"; // overall_score | gwt | iit | hot | rpt | pp | ast
  const sortOrder = searchParams.get("sort_order") === "asc" ? "asc" : "desc";

  // Filtering params
  const modelProvider = searchParams.get("model_provider");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");

  let query = supabase
    .from("audits")
    .select("model_name, model_provider, overall_score, theory_scores, completed_at")
    .eq("status", "completed")
    .not("overall_score", "is", null);

  // Apply filters
  if (modelProvider) {
    query = query.eq("model_provider", modelProvider);
  }
  if (dateFrom) {
    query = query.gte("completed_at", dateFrom);
  }
  if (dateTo) {
    query = query.lte("completed_at", dateTo);
  }

  query = query.order("overall_score", { ascending: false });

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }

  // Aggregate by model
  const modelMap = new Map<
    string,
    {
      modelName: string;
      modelProvider: string;
      auditCount: number;
      totalScore: number;
      scores: Record<string, number[]>;
      lastAuditAt: string | null;
    }
  >();

  for (const row of data || []) {
    const key = `${row.model_provider}:${row.model_name}`;
    if (!modelMap.has(key)) {
      modelMap.set(key, {
        modelName: row.model_name,
        modelProvider: row.model_provider,
        auditCount: 0,
        totalScore: 0,
        scores: { gwt: [], iit: [], hot: [], rpt: [], pp: [], ast: [] },
        lastAuditAt: null,
      });
    }
    const entry = modelMap.get(key)!;
    entry.auditCount++;
    entry.totalScore += row.overall_score;
    if (row.completed_at && (!entry.lastAuditAt || row.completed_at > entry.lastAuditAt)) {
      entry.lastAuditAt = row.completed_at;
    }
    if (row.theory_scores) {
      for (const [theory, score] of Object.entries(row.theory_scores as Record<string, number>)) {
        entry.scores[theory]?.push(score);
      }
    }
  }

  let leaderboard = Array.from(modelMap.values()).map((entry) => ({
    modelName: entry.modelName,
    modelProvider: entry.modelProvider,
    auditCount: entry.auditCount,
    avgScore: entry.totalScore / entry.auditCount,
    lastAuditAt: entry.lastAuditAt,
    theoryAvgs: Object.fromEntries(
      Object.entries(entry.scores).map(([theory, scores]) => [
        theory,
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0,
      ])
    ),
  }));

  // Apply sorting
  const validTheories = ["gwt", "iit", "hot", "rpt", "pp", "ast"];
  if (sortBy === "overall_score") {
    leaderboard.sort((a, b) =>
      sortOrder === "desc" ? b.avgScore - a.avgScore : a.avgScore - b.avgScore
    );
  } else if (validTheories.includes(sortBy)) {
    leaderboard.sort((a, b) => {
      const aVal = (a.theoryAvgs as Record<string, number>)[sortBy] || 0;
      const bVal = (b.theoryAvgs as Record<string, number>)[sortBy] || 0;
      return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
    });
  }

  // Pagination
  const totalCount = leaderboard.length;
  const totalPages = Math.ceil(totalCount / limit);
  const offset = (page - 1) * limit;
  leaderboard = leaderboard.slice(offset, offset + limit);

  return NextResponse.json({
    leaderboard,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
}
