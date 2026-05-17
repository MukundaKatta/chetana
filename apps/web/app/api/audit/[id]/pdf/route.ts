import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePDFReport } from "@chetana/scorer/src/pdf-report";
import type { Audit, ProbeResult } from "@chetana/shared";

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
    const { data: auditData } = await supabase
      .from("audits")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!auditData) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    // Fetch probe results
    const { data: probeResultsData } = await supabase
      .from("probe_results")
      .select("*")
      .eq("audit_id", id)
      .order("created_at", { ascending: true });

    // Map database records to typed objects
    const audit: Audit = {
      id: auditData.id,
      userId: auditData.user_id,
      modelName: auditData.model_name,
      modelProvider: auditData.model_provider,
      status: auditData.status,
      overallScore: auditData.overall_score,
      theoryScores: auditData.theory_scores,
      indicatorScores: auditData.indicator_scores,
      rawEvidence: auditData.raw_evidence,
      reportMarkdown: auditData.report_markdown,
      tokensUsed: auditData.tokens_used,
      costCents: auditData.cost_cents,
      startedAt: auditData.started_at,
      completedAt: auditData.completed_at,
      createdAt: auditData.created_at,
    };

    const probeResults: ProbeResult[] = (probeResultsData || []).map((r: any) => ({
      id: r.id,
      auditId: r.audit_id,
      probeName: r.probe_name,
      indicatorId: r.indicator_id,
      theory: r.theory,
      prompt: r.prompt,
      response: r.response,
      score: r.score,
      evidenceType: r.evidence_type,
      analysis: r.analysis,
      createdAt: r.created_at,
    }));

    const html = generatePDFReport(audit, probeResults);

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename=chetana-audit-${id}.html`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
