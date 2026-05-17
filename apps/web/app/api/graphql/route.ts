import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const graphqlRequestSchema = z.object({
  query: z.string().min(1, "query is required"),
  variables: z.record(z.unknown()).optional(),
  operationName: z.string().optional(),
});

const SCHEMA_SDL = `
  type Query {
    audit(id: ID!): Audit
    audits(limit: Int, offset: Int): [Audit!]!
    probeResults(auditId: ID!): [ProbeResult!]!
    leaderboard(limit: Int): [LeaderboardEntry!]!
    __schema: SchemaInfo!
  }

  type Audit {
    id: ID!
    modelName: String!
    modelProvider: String!
    status: String!
    overallScore: Float
    theoryScores: TheoryScores
    completedAt: String
    createdAt: String!
    probeResults: [ProbeResult!]!
  }

  type ProbeResult {
    id: ID!
    probeName: String!
    indicatorId: String!
    theory: String!
    prompt: String!
    response: String!
    score: Float!
    evidenceType: String!
    analysis: String
  }

  type TheoryScores {
    gwt: Float
    iit: Float
    hot: Float
    rpt: Float
    pp: Float
    ast: Float
  }

  type LeaderboardEntry {
    modelName: String!
    modelProvider: String!
    avgScore: Float!
    auditCount: Int!
  }

  type SchemaInfo {
    types: [String!]!
    queryType: String!
  }
`;

type ResolverContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string | null;
};

type Variables = Record<string, unknown>;

async function resolveQuery(
  queryStr: string,
  variables: Variables,
  ctx: ResolverContext
): Promise<{ data?: unknown; errors?: { message: string }[] }> {
  const trimmed = queryStr.trim();

  // Introspection
  if (trimmed.includes("__schema")) {
    return {
      data: {
        __schema: {
          types: [
            "Query",
            "Audit",
            "ProbeResult",
            "TheoryScores",
            "LeaderboardEntry",
            "SchemaInfo",
          ],
          queryType: "Query",
        },
      },
    };
  }

  // Parse simple query patterns
  if (trimmed.includes("audit(") || trimmed.includes("audit (")) {
    const idMatch =
      trimmed.match(/id:\s*"([^"]+)"/) ??
      trimmed.match(/id:\s*\$(\w+)/);

    let auditId: string | undefined;
    if (idMatch) {
      auditId = idMatch[1].startsWith("$")
        ? (variables[idMatch[1]] as string)
        : idMatch[1];
    }
    if (variables.id) {
      auditId = variables.id as string;
    }

    if (!auditId) {
      return { errors: [{ message: "audit query requires an id argument" }] };
    }

    if (!ctx.userId) {
      return { errors: [{ message: "Authentication required" }] };
    }

    const { data: audit, error } = await ctx.supabase
      .from("audits")
      .select("*")
      .eq("id", auditId)
      .eq("user_id", ctx.userId)
      .single();

    if (error || !audit) {
      return { errors: [{ message: "Audit not found" }] };
    }

    const result: Record<string, unknown> = {
      id: audit.id,
      modelName: audit.model_name,
      modelProvider: audit.model_provider,
      status: audit.status,
      overallScore: audit.overall_score,
      theoryScores: audit.theory_scores,
      completedAt: audit.completed_at,
      createdAt: audit.created_at,
    };

    // Resolve nested probeResults if requested
    if (trimmed.includes("probeResults")) {
      const { data: probes } = await ctx.supabase
        .from("probe_results")
        .select("*")
        .eq("audit_id", auditId);

      result.probeResults = (probes || []).map((p) => ({
        id: p.id,
        probeName: p.probe_name,
        indicatorId: p.indicator_id,
        theory: p.theory,
        prompt: p.prompt,
        response: p.response,
        score: p.score,
        evidenceType: p.evidence_type,
        analysis: p.analysis,
      }));
    }

    return { data: { audit: result } };
  }

  if (trimmed.includes("audits")) {
    if (!ctx.userId) {
      return { errors: [{ message: "Authentication required" }] };
    }

    const limitMatch = trimmed.match(/limit:\s*(\d+)/);
    const offsetMatch = trimmed.match(/offset:\s*(\d+)/);
    const limit = limitMatch
      ? Math.min(parseInt(limitMatch[1], 10), 100)
      : (variables.limit as number) ?? 20;
    const offset = offsetMatch
      ? parseInt(offsetMatch[1], 10)
      : (variables.offset as number) ?? 0;

    const { data: audits, error } = await ctx.supabase
      .from("audits")
      .select(
        "id, model_name, model_provider, status, overall_score, theory_scores, completed_at, created_at"
      )
      .eq("user_id", ctx.userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return { errors: [{ message: "Failed to fetch audits" }] };
    }

    return {
      data: {
        audits: (audits || []).map((a) => ({
          id: a.id,
          modelName: a.model_name,
          modelProvider: a.model_provider,
          status: a.status,
          overallScore: a.overall_score,
          theoryScores: a.theory_scores,
          completedAt: a.completed_at,
          createdAt: a.created_at,
        })),
      },
    };
  }

  if (trimmed.includes("probeResults")) {
    const auditIdMatch =
      trimmed.match(/auditId:\s*"([^"]+)"/) ??
      trimmed.match(/auditId:\s*\$(\w+)/);

    let auditId: string | undefined;
    if (auditIdMatch) {
      auditId = auditIdMatch[1].startsWith("$")
        ? (variables[auditIdMatch[1]] as string)
        : auditIdMatch[1];
    }
    if (variables.auditId) {
      auditId = variables.auditId as string;
    }

    if (!auditId) {
      return {
        errors: [
          { message: "probeResults query requires an auditId argument" },
        ],
      };
    }

    const { data: probes, error } = await ctx.supabase
      .from("probe_results")
      .select("*")
      .eq("audit_id", auditId);

    if (error) {
      return { errors: [{ message: "Failed to fetch probe results" }] };
    }

    return {
      data: {
        probeResults: (probes || []).map((p) => ({
          id: p.id,
          probeName: p.probe_name,
          indicatorId: p.indicator_id,
          theory: p.theory,
          prompt: p.prompt,
          response: p.response,
          score: p.score,
          evidenceType: p.evidence_type,
          analysis: p.analysis,
        })),
      },
    };
  }

  if (trimmed.includes("leaderboard")) {
    const limitMatch = trimmed.match(/limit:\s*(\d+)/);
    const limit = limitMatch
      ? Math.min(parseInt(limitMatch[1], 10), 50)
      : (variables.limit as number) ?? 10;

    const { data, error } = await ctx.supabase
      .from("audits")
      .select("model_name, model_provider, overall_score")
      .eq("status", "completed")
      .not("overall_score", "is", null);

    if (error) {
      return { errors: [{ message: "Failed to fetch leaderboard" }] };
    }

    // Aggregate by model
    const modelMap = new Map<
      string,
      { modelName: string; modelProvider: string; totalScore: number; count: number }
    >();
    for (const row of data || []) {
      const key = `${row.model_provider}:${row.model_name}`;
      if (!modelMap.has(key)) {
        modelMap.set(key, {
          modelName: row.model_name,
          modelProvider: row.model_provider,
          totalScore: 0,
          count: 0,
        });
      }
      const entry = modelMap.get(key)!;
      entry.totalScore += row.overall_score;
      entry.count++;
    }

    const leaderboard = Array.from(modelMap.values())
      .map((e) => ({
        modelName: e.modelName,
        modelProvider: e.modelProvider,
        avgScore: e.totalScore / e.count,
        auditCount: e.count,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, limit);

    return { data: { leaderboard } };
  }

  return { errors: [{ message: "Unsupported query" }] };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();

    const validation = graphqlRequestSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const { query, variables } = validation.data;

    const ctx: ResolverContext = {
      supabase,
      userId: user?.id ?? null,
    };

    const result = await resolveQuery(query, variables ?? {}, ctx);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { errors: [{ message: "Internal server error" }] },
      { status: 500 }
    );
  }
}

/**
 * GET handler returns the schema SDL for introspection.
 */
export async function GET() {
  return NextResponse.json({
    schema: SCHEMA_SDL,
    version: "1.0.0",
  });
}
