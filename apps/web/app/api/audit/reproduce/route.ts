import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const reproduceInputSchema = z.object({
  auditId: z.string().uuid("auditId must be a valid UUID"),
});

interface VarianceAnalysis {
  indicator: string;
  originalScore: number;
  reproducedScore: number;
  delta: number;
  withinTolerance: boolean;
}

const REPRODUCIBILITY_TOLERANCE = 0.05;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const validation = reproduceInputSchema.safeParse(body);
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

    const { auditId } = validation.data;

    // Fetch the original audit
    const { data: originalAudit, error: auditError } = await supabase
      .from("audits")
      .select("*")
      .eq("id", auditId)
      .eq("user_id", user.id)
      .single();

    if (auditError || !originalAudit) {
      return NextResponse.json(
        { error: "Audit not found" },
        { status: 404 }
      );
    }

    if (originalAudit.status !== "completed") {
      return NextResponse.json(
        { error: "Can only reproduce completed audits" },
        { status: 400 }
      );
    }

    // Fetch original probe results
    const { data: originalProbes } = await supabase
      .from("probe_results")
      .select("*")
      .eq("audit_id", auditId);

    if (!originalProbes || originalProbes.length === 0) {
      return NextResponse.json(
        { error: "No probe results found for original audit" },
        { status: 404 }
      );
    }

    // Create a new audit record for the reproduction
    const { data: reproAudit, error: reproError } = await supabase
      .from("audits")
      .insert({
        user_id: user.id,
        model_name: originalAudit.model_name,
        model_provider: originalAudit.model_provider,
        status: "running",
      })
      .select()
      .single();

    if (reproError || !reproAudit) {
      return NextResponse.json(
        { error: "Failed to create reproduction audit" },
        { status: 500 }
      );
    }

    // Build original scores by indicator for comparison
    const originalScoresByIndicator: Record<string, number[]> = {};
    for (const probe of originalProbes) {
      const key = probe.indicator_id;
      if (!originalScoresByIndicator[key]) {
        originalScoresByIndicator[key] = [];
      }
      originalScoresByIndicator[key].push(probe.score);
    }

    const originalAvgByIndicator: Record<string, number> = {};
    for (const [key, scores] of Object.entries(originalScoresByIndicator)) {
      originalAvgByIndicator[key] =
        scores.reduce((a, b) => a + b, 0) / scores.length;
    }

    // Return the reproduction audit ID and original analysis for later comparison
    // The actual re-run would be handled by the audit runner (same as audit/run)
    return NextResponse.json({
      reproductionAuditId: reproAudit.id,
      originalAuditId: auditId,
      status: "running",
      originalScores: {
        overall: originalAudit.overall_score,
        byIndicator: originalAvgByIndicator,
        theoryScores: originalAudit.theory_scores,
      },
      probeCount: originalProbes.length,
      tolerance: REPRODUCIBILITY_TOLERANCE,
      message:
        "Reproduction audit started. Poll the audit status to get results and compare.",
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
