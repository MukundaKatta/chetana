import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { INDICATORS, THEORIES } from "@chetana/shared";
import type { Theory } from "@chetana/shared";

interface ProbeSuggestion {
  indicatorId: string;
  theory: string;
  reason: string;
  priority: number;
  confidence: number;
  coverageGap: boolean;
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
    const model = searchParams.get("model");
    const previousAuditId = searchParams.get("previousAuditId");

    if (!model) {
      return NextResponse.json(
        { error: "model query parameter is required" },
        { status: 400 }
      );
    }

    // Analyze previous audit if provided
    let previousScores: Record<string, number> = {};
    let previousProbeCount: Record<string, number> = {};

    if (previousAuditId) {
      const { data: probeResults } = await supabase
        .from("probe_results")
        .select("indicator_id, theory, score")
        .eq("audit_id", previousAuditId);

      if (probeResults) {
        for (const result of probeResults) {
          const key = result.indicator_id;
          if (!previousScores[key]) {
            previousScores[key] = 0;
            previousProbeCount[key] = 0;
          }
          previousScores[key] += result.score;
          previousProbeCount[key]++;
        }
        // Average the scores
        for (const key of Object.keys(previousScores)) {
          previousScores[key] =
            previousScores[key] / previousProbeCount[key];
        }
      }
    }

    // Generate suggestions based on coverage gaps and low-confidence areas
    const suggestions: ProbeSuggestion[] = [];

    // Theory coverage analysis
    const theoryCoverage: Record<string, { probeCount: number; avgScore: number }> = {};
    for (const theory of Object.keys(THEORIES) as Theory[]) {
      const theoryIndicators = INDICATORS.filter((i) => i.theory === theory);
      let totalScore = 0;
      let totalCount = 0;

      for (const indicator of theoryIndicators) {
        const count = previousProbeCount[indicator.id] ?? 0;
        const score = previousScores[indicator.id] ?? 0;
        totalScore += score;
        totalCount += count;
      }

      theoryCoverage[theory] = {
        probeCount: totalCount,
        avgScore: totalCount > 0 ? totalScore / theoryIndicators.length : 0,
      };
    }

    for (const indicator of INDICATORS) {
      const probeCount = previousProbeCount[indicator.id] ?? 0;
      const avgScore = previousScores[indicator.id] ?? 0;
      const isCoverageGap = probeCount === 0;

      // Calculate priority: higher for gaps and low-confidence areas
      let priority = 0;
      let reason = "";

      if (isCoverageGap) {
        priority = 100;
        reason = `No probes have targeted ${indicator.name} - coverage gap`;
      } else if (avgScore >= 0.4 && avgScore <= 0.6) {
        // Ambiguous scores need more probes for confidence
        priority = 80;
        reason = `Score of ${avgScore.toFixed(2)} is ambiguous - more probes needed for confidence`;
      } else if (probeCount < 2) {
        priority = 60;
        reason = `Only ${probeCount} probe(s) for ${indicator.name} - insufficient for reliability`;
      } else {
        priority = 20;
        reason = `Additional probe for broader coverage of ${indicator.name}`;
      }

      // Boost priority for under-covered theories
      const tc = theoryCoverage[indicator.theory];
      if (tc && tc.probeCount < 3) {
        priority += 15;
        reason += ` (theory ${indicator.theory.toUpperCase()} under-covered)`;
      }

      const confidence = probeCount > 0
        ? Math.min(1, probeCount / 5)
        : 0;

      suggestions.push({
        indicatorId: indicator.id,
        theory: indicator.theory,
        reason,
        priority,
        confidence,
        coverageGap: isCoverageGap,
      });
    }

    // Sort by priority descending
    suggestions.sort((a, b) => b.priority - a.priority);

    return NextResponse.json({
      model,
      previousAuditId: previousAuditId ?? null,
      suggestions,
      theoryCoverage,
      totalSuggestions: suggestions.length,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
