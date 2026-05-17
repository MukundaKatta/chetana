import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SIGNIFICANCE_THRESHOLD = 0.1;

interface ScoreComparison {
  indicator: string;
  scores: Record<string, number>;
  delta: number | null;
  significant: boolean;
}

interface TheoryComparison {
  theory: string;
  scores: Record<string, number>;
  delta: number | null;
  significant: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const auditIds = searchParams.getAll("id");

    if (auditIds.length < 2) {
      return NextResponse.json(
        { error: "At least 2 audit IDs are required for comparison" },
        { status: 400 }
      );
    }

    if (auditIds.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 audits can be compared at once" },
        { status: 400 }
      );
    }

    // Fetch all audits
    const { data: audits, error: auditsError } = await supabase
      .from("audits")
      .select(
        "id, model_name, model_provider, overall_score, theory_scores, indicator_scores, completed_at"
      )
      .in("id", auditIds)
      .eq("user_id", user.id)
      .eq("status", "completed");

    if (auditsError) {
      return NextResponse.json(
        { error: "Failed to fetch audits" },
        { status: 500 }
      );
    }

    if (!audits || audits.length < 2) {
      return NextResponse.json(
        { error: "Could not find at least 2 completed audits matching the provided IDs" },
        { status: 404 }
      );
    }

    // Build overall comparison
    const overallScores: Record<string, number | null> = {};
    for (const audit of audits) {
      overallScores[audit.id] = audit.overall_score;
    }

    // Build theory comparisons
    const theories = ["gwt", "iit", "hot", "rpt", "pp", "ast"];
    const theoryComparisons: TheoryComparison[] = theories.map((theory) => {
      const scores: Record<string, number> = {};
      for (const audit of audits) {
        const ts = audit.theory_scores as Record<string, number> | null;
        scores[audit.id] = ts?.[theory] ?? 0;
      }
      const values = Object.values(scores);
      const delta =
        values.length === 2 ? Math.abs(values[0] - values[1]) : null;
      return {
        theory,
        scores,
        delta,
        significant: delta !== null && delta > SIGNIFICANCE_THRESHOLD,
      };
    });

    // Build indicator comparisons
    const allIndicators = new Set<string>();
    for (const audit of audits) {
      const is = audit.indicator_scores as Record<string, number> | null;
      if (is) {
        Object.keys(is).forEach((k) => allIndicators.add(k));
      }
    }

    const indicatorComparisons: ScoreComparison[] = Array.from(
      allIndicators
    ).map((indicator) => {
      const scores: Record<string, number> = {};
      for (const audit of audits) {
        const is = audit.indicator_scores as Record<string, number> | null;
        scores[audit.id] = is?.[indicator] ?? 0;
      }
      const values = Object.values(scores);
      const delta =
        values.length === 2 ? Math.abs(values[0] - values[1]) : null;
      return {
        indicator,
        scores,
        delta,
        significant: delta !== null && delta > SIGNIFICANCE_THRESHOLD,
      };
    });

    // Statistical significance check using simple effect size
    const significantDifferences = indicatorComparisons.filter(
      (c) => c.significant
    );

    // Compute summary statistics for the pair case
    let statisticalSummary = null;
    if (audits.length === 2) {
      const deltas = indicatorComparisons
        .map((c) => c.delta)
        .filter((d): d is number => d !== null);
      const meanDelta =
        deltas.length > 0
          ? deltas.reduce((a, b) => a + b, 0) / deltas.length
          : 0;
      const variance =
        deltas.length > 1
          ? deltas.reduce((sum, d) => sum + (d - meanDelta) ** 2, 0) /
            (deltas.length - 1)
          : 0;
      const stdDev = Math.sqrt(variance);

      statisticalSummary = {
        meanDelta: Math.round(meanDelta * 10000) / 10000,
        stdDev: Math.round(stdDev * 10000) / 10000,
        significantCount: significantDifferences.length,
        totalIndicators: indicatorComparisons.length,
        overallSignificant: meanDelta > SIGNIFICANCE_THRESHOLD,
      };
    }

    return NextResponse.json({
      audits: audits.map((a) => ({
        id: a.id,
        modelName: a.model_name,
        modelProvider: a.model_provider,
        overallScore: a.overall_score,
        completedAt: a.completed_at,
      })),
      overallScores,
      theoryComparisons,
      indicatorComparisons,
      significantDifferences: significantDifferences.map((d) => d.indicator),
      statisticalSummary,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
