import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch audit
    const { data: audit } = await supabase
      .from("audits")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    // Fetch probe results
    const { data: probeResults } = await supabase
      .from("probe_results")
      .select("*")
      .eq("audit_id", id)
      .order("created_at", { ascending: true });

    const format = request.nextUrl.searchParams.get("format") || "json";

    if (format === "csv") {
      // Generate CSV
      const headers = [
        "probe_name",
        "indicator_id",
        "theory",
        "evidence_type",
        "score",
        "analysis",
        "prompt",
        "response",
      ];

      const rows = (probeResults || []).map((r) =>
        headers
          .map((h) => {
            const val = String(r[h as keyof typeof r] || "");
            // Escape CSV values
            if (val.includes(",") || val.includes('"') || val.includes("\n")) {
              return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
          })
          .join(",")
      );

      const csv = [headers.join(","), ...rows].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=chetana-audit-${id}.csv`,
        },
      });
    }

    // JSON export
    const exportData = {
      metadata: {
        platform: "Chetana",
        version: "1.0.0",
        framework: "Butlin et al. (2025)",
        exportedAt: new Date().toISOString(),
      },
      audit: {
        id: audit.id,
        modelName: audit.model_name,
        modelProvider: audit.model_provider,
        status: audit.status,
        overallScore: audit.overall_score,
        theoryScores: audit.theory_scores,
        indicatorScores: audit.indicator_scores,
        tokensUsed: audit.tokens_used,
        startedAt: audit.started_at,
        completedAt: audit.completed_at,
      },
      probeResults: (probeResults || []).map((r) => ({
        probeName: r.probe_name,
        indicatorId: r.indicator_id,
        theory: r.theory,
        evidenceType: r.evidence_type,
        score: r.score,
        analysis: r.analysis,
        prompt: r.prompt,
        response: r.response,
      })),
      statistics: computeStatistics(probeResults || []),
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename=chetana-audit-${id}.json`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function computeStatistics(probeResults: any[]) {
  if (probeResults.length === 0) return null;

  const scores = probeResults.map((r) => Number(r.score) || 0);
  const n = scores.length;
  const mean = scores.reduce((a, b) => a + b, 0) / n;
  const variance = scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / (n - 1 || 1);
  const stdDev = Math.sqrt(variance);

  // 95% confidence interval (t-distribution approximation for small samples)
  const tCritical = n > 30 ? 1.96 : 2.045; // rough approximation
  const marginOfError = tCritical * (stdDev / Math.sqrt(n));

  // Effect sizes by theory
  const byTheory: Record<string, number[]> = {};
  for (const r of probeResults) {
    if (!byTheory[r.theory]) byTheory[r.theory] = [];
    byTheory[r.theory].push(Number(r.score) || 0);
  }

  const theoryStats = Object.entries(byTheory).map(([theory, theoryScores]) => {
    const tMean = theoryScores.reduce((a, b) => a + b, 0) / theoryScores.length;
    const tVar =
      theoryScores.reduce((sum, s) => sum + (s - tMean) ** 2, 0) /
      (theoryScores.length - 1 || 1);
    return {
      theory,
      n: theoryScores.length,
      mean: Math.round(tMean * 1000) / 1000,
      stdDev: Math.round(Math.sqrt(tVar) * 1000) / 1000,
      min: Math.min(...theoryScores),
      max: Math.max(...theoryScores),
    };
  });

  return {
    overall: {
      n,
      mean: Math.round(mean * 1000) / 1000,
      stdDev: Math.round(stdDev * 1000) / 1000,
      ci95: {
        lower: Math.round(Math.max(0, mean - marginOfError) * 1000) / 1000,
        upper: Math.round(Math.min(1, mean + marginOfError) * 1000) / 1000,
      },
      min: Math.min(...scores),
      max: Math.max(...scores),
      median: scores.sort((a, b) => a - b)[Math.floor(n / 2)],
    },
    byTheory: theoryStats,
  };
}
