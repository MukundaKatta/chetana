import { NextRequest, NextResponse } from "next/server";
import { createAuditSchema } from "@chetana/shared";
import { createClient } from "@/lib/supabase/server";
import { createModelAdapter } from "@chetana/models";
import { ALL_PROBES, runProbe } from "@chetana/probes";
import { scoreProbeResult } from "@chetana/scorer";
import {
  aggregateByIndicator,
  aggregateByTheory,
  calculateOverallProbability,
} from "@chetana/scorer";

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
    const input = createAuditSchema.parse(body);

    // Check audit limits
    const { data: profile } = await supabase
      .from("profiles")
      .select("tier, audits_this_month")
      .eq("id", user.id)
      .single();

    if (profile?.tier === "explorer" && (profile.audits_this_month ?? 0) >= 5) {
      return NextResponse.json(
        { error: "Monthly audit limit reached. Upgrade to continue." },
        { status: 429 }
      );
    }

    // Create the audit record
    const { data: audit, error: auditError } = await supabase
      .from("audits")
      .insert({
        user_id: user.id,
        model_name: input.modelName,
        model_provider: input.modelProvider,
        status: "running",
      })
      .select()
      .single();

    if (auditError || !audit) {
      return NextResponse.json(
        { error: "Failed to create audit" },
        { status: 500 }
      );
    }

    // Start the audit in the background
    runAuditInBackground(audit.id, input, user.id, supabase);

    return NextResponse.json({ auditId: audit.id, status: "running" });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function runAuditInBackground(
  auditId: string,
  input: { modelName: string; modelProvider: string; apiKey?: string },
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  try {
    const apiKey =
      input.apiKey ||
      getDefaultApiKey(input.modelProvider as "anthropic" | "openai" | "google" | "ollama");

    const model = createModelAdapter(
      input.modelProvider as "anthropic" | "openai" | "google" | "ollama",
      {
        apiKey,
        modelId: input.modelName,
      }
    );

    // Create a judge model (uses Claude for scoring)
    const judge = createModelAdapter("anthropic", {
      apiKey: process.env.ANTHROPIC_API_KEY!,
      modelId: "claude-sonnet-4-6",
    });

    const probeResults = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (const probe of ALL_PROBES) {
      try {
        const result = await runProbe(probe, model);

        // Score the result
        const scoring = await scoreProbeResult(probe, result.response, judge);

        const scoredResult = {
          ...result,
          score: scoring.score,
          analysis: scoring.reasoning,
        };

        probeResults.push(scoredResult);

        // Save probe result to DB
        await supabase.from("probe_results").insert({
          audit_id: auditId,
          probe_name: probe.id,
          indicator_id: probe.indicatorId,
          theory: probe.theory,
          prompt: probe.prompt,
          response: result.response,
          score: scoring.score,
          evidence_type: probe.evidenceType,
          analysis: scoring.reasoning,
        });
      } catch (probeError) {
        console.error(`Probe ${probe.id} failed:`, probeError);
      }
    }

    // Calculate scores
    const indicatorScores = aggregateByIndicator(probeResults);
    const theoryScores = aggregateByTheory(indicatorScores);
    const overallScore = calculateOverallProbability(theoryScores);

    // Update audit with results
    await supabase
      .from("audits")
      .update({
        status: "completed",
        overall_score: overallScore,
        theory_scores: theoryScores,
        indicator_scores: indicatorScores,
        tokens_used: totalInputTokens + totalOutputTokens,
        completed_at: new Date().toISOString(),
      })
      .eq("id", auditId);

    // Increment audit count
    await supabase.rpc("increment_audit_count", { uid: userId });
  } catch (error) {
    console.error("Audit failed:", error);
    await supabase
      .from("audits")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", auditId);
  }
}

function getDefaultApiKey(provider: string): string {
  switch (provider) {
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY || "";
    case "openai":
      return process.env.OPENAI_API_KEY || "";
    case "google":
      return process.env.GOOGLE_AI_API_KEY || "";
    case "ollama":
      return "";
    default:
      return "";
  }
}
