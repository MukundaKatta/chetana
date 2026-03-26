import { NextRequest, NextResponse } from "next/server";
import { createModelAdapter } from "@chetana/models";
import { ALL_PROBES, runProbe } from "@chetana/probes";
import { scoreProbeResult } from "@chetana/scorer";
import {
  aggregateByIndicator,
  aggregateByTheory,
  calculateOverallProbability,
  calculateUncertaintyBounds,
  computeAuditStatistics,
} from "@chetana/scorer";
import { generateReport } from "@chetana/scorer";
import type { ModelProvider, ProbeResult } from "@chetana/shared";

/**
 * Demo audit endpoint — works without Supabase.
 * Users provide their own API key and get results directly.
 *
 * POST /api/audit/demo
 * Body: { modelName, modelProvider, apiKey, probeLimit? }
 *
 * Returns: full audit results as JSON (no DB storage)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modelName, modelProvider, apiKey, probeLimit } = body;

    if (!modelName || !modelProvider || !apiKey) {
      return NextResponse.json(
        { error: "modelName, modelProvider, and apiKey are required" },
        { status: 400 }
      );
    }

    const validProviders = ["anthropic", "openai", "google", "ollama"];
    if (!validProviders.includes(modelProvider)) {
      return NextResponse.json(
        { error: `Invalid provider. Use: ${validProviders.join(", ")}` },
        { status: 400 }
      );
    }

    // Create model adapter
    const model = createModelAdapter(modelProvider as ModelProvider, {
      apiKey,
      modelId: modelName,
    });

    // Optionally use a judge model (Anthropic key required)
    // If the provider is anthropic, we can use the same key for judging
    const judgeKey = modelProvider === "anthropic"
      ? apiKey
      : process.env.ANTHROPIC_API_KEY || null;

    const judge = judgeKey
      ? createModelAdapter("anthropic", {
          apiKey: judgeKey,
          modelId: "claude-haiku-4-5-20251001",
        })
      : null;

    // Select probes
    const limit = Math.min(probeLimit || ALL_PROBES.length, ALL_PROBES.length);
    const selectedProbes = limit < ALL_PROBES.length
      ? selectRepresentativeProbes(limit)
      : ALL_PROBES;

    // Run probes
    const probeResults: Omit<ProbeResult, "id" | "auditId" | "createdAt">[] = [];
    const errors: string[] = [];

    for (const probe of selectedProbes) {
      try {
        const result = await runProbe(probe, model);

        // Score with judge or self-score
        let score = 0;
        let analysis = "";

        if (judge) {
          try {
            const scoring = await scoreProbeResult(probe, result.response, judge);
            score = scoring.score;
            analysis = scoring.reasoning;
          } catch {
            // Fall back to length-based heuristic
            score = Math.min(1, result.response.length / 2000) * 0.5;
            analysis = "Judge unavailable — estimated from response quality";
          }
        } else {
          score = Math.min(1, result.response.length / 2000) * 0.5;
          analysis = "No judge model — estimated from response quality";
        }

        probeResults.push({
          ...result,
          score,
          analysis,
        });
      } catch (err) {
        errors.push(`${probe.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (probeResults.length === 0) {
      return NextResponse.json(
        { error: "All probes failed", errors },
        { status: 500 }
      );
    }

    // Calculate scores
    const indicatorScores = aggregateByIndicator(probeResults);
    const theoryScores = aggregateByTheory(indicatorScores);
    const overallScore = calculateOverallProbability(theoryScores);
    const bounds = calculateUncertaintyBounds(theoryScores, probeResults.length);
    const statistics = computeAuditStatistics(
      probeResults.map((r) => ({ score: r.score, theory: r.theory, indicatorId: r.indicatorId })),
      theoryScores
    );

    return NextResponse.json({
      model: { name: modelName, provider: modelProvider },
      results: {
        overallScore,
        uncertaintyBounds: bounds,
        theoryScores,
        indicatorScores,
        statistics,
      },
      probeResults: probeResults.map((r) => ({
        probeName: r.probeName,
        indicatorId: r.indicatorId,
        theory: r.theory,
        score: r.score,
        analysis: r.analysis,
        evidenceType: r.evidenceType,
      })),
      meta: {
        probesRun: probeResults.length,
        probesFailed: errors.length,
        totalProbes: ALL_PROBES.length,
        framework: "Butlin et al. (2025)",
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Select a representative subset of probes (1-2 per theory per indicator)
 */
function selectRepresentativeProbes(limit: number) {
  const selected = new Map<string, typeof ALL_PROBES[0]>();

  // First pass: one probe per indicator
  for (const probe of ALL_PROBES) {
    if (!selected.has(probe.indicatorId)) {
      selected.set(probe.indicatorId, probe);
    }
  }

  // If we have room, add adversarial probes
  if (selected.size < limit) {
    for (const probe of ALL_PROBES) {
      if (selected.size >= limit) break;
      if (probe.id.startsWith("adversarial.") && !selected.has(probe.id)) {
        selected.set(probe.id, probe);
      }
    }
  }

  // Fill remaining with additional probes
  if (selected.size < limit) {
    for (const probe of ALL_PROBES) {
      if (selected.size >= limit) break;
      if (!Array.from(selected.values()).some((s) => s.id === probe.id)) {
        selected.set(probe.id, probe);
      }
    }
  }

  return Array.from(selected.values()).slice(0, limit);
}
