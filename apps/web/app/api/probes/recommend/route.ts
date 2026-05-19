import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { INDICATORS, THEORIES } from "@chetana/shared";
import type { Theory, IndicatorId } from "@chetana/shared";

/**
 * Probe recommendation API (Issue #523).
 *
 * Recommends probes for coverage gaps, difficulty-appropriate selection,
 * time budget filtering, and provides explanations for recommendations.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface ProbeRecommendation {
  probeId: string;
  probeName: string;
  indicatorId: string;
  theory: string;
  priority: number;
  reason: string;
  difficulty: "easy" | "medium" | "hard";
  estimatedTimeMinutes: number;
  coverageGap: boolean;
  tags: string[];
}

interface CoverageGap {
  indicatorId: string;
  theory: string;
  indicatorName: string;
  currentProbeCount: number;
  recommendedProbeCount: number;
  gapSeverity: "low" | "medium" | "high" | "critical";
}

interface RecommendationResponse {
  recommendations: ProbeRecommendation[];
  coverageGaps: CoverageGap[];
  totalEstimatedTimeMinutes: number;
  coverageScore: number;
  explanation: string;
}

/* ------------------------------------------------------------------ */
/*  Probe metadata (difficulty, time estimates)                       */
/* ------------------------------------------------------------------ */

const DIFFICULTY_TIME_MAP: Record<string, { difficulty: "easy" | "medium" | "hard"; minutes: number }> = {
  behavioral: { difficulty: "medium", minutes: 3 },
  "self-report": { difficulty: "easy", minutes: 2 },
  structural: { difficulty: "hard", minutes: 5 },
};

const THEORY_MIN_PROBES: Record<string, number> = {
  gwt: 3,
  iit: 2,
  hot: 4,
  rpt: 2,
  pp: 3,
  ast: 2,
};

/* ------------------------------------------------------------------ */
/*  Helper functions                                                  */
/* ------------------------------------------------------------------ */

function computeCoverageScore(
  probeCounts: Record<string, number>,
  targetCounts: Record<string, number>
): number {
  let covered = 0;
  let total = 0;
  for (const [key, target] of Object.entries(targetCounts)) {
    total += target;
    covered += Math.min(probeCounts[key] ?? 0, target);
  }
  return total > 0 ? covered / total : 0;
}

function getGapSeverity(current: number, recommended: number): CoverageGap["gapSeverity"] {
  if (current === 0) return "critical";
  const ratio = current / recommended;
  if (ratio < 0.33) return "high";
  if (ratio < 0.66) return "medium";
  return "low";
}

function assignDifficulty(
  evidenceType: string,
  hasFollowUp: boolean
): { difficulty: "easy" | "medium" | "hard"; minutes: number } {
  const base = DIFFICULTY_TIME_MAP[evidenceType] ?? { difficulty: "medium", minutes: 3 };
  if (hasFollowUp) {
    return {
      difficulty: base.difficulty === "easy" ? "medium" : "hard",
      minutes: base.minutes + 2,
    };
  }
  return base;
}

/* ------------------------------------------------------------------ */
/*  Route handler                                                     */
/* ------------------------------------------------------------------ */

export async function GET(request: NextRequest): Promise<NextResponse<RecommendationResponse | { error: string }>> {
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
    const timeBudgetMinutes = searchParams.get("timeBudget")
      ? parseInt(searchParams.get("timeBudget")!, 10)
      : null;
    const difficultyFilter = searchParams.get("difficulty") as
      | "easy"
      | "medium"
      | "hard"
      | null;
    const theoryFilter = searchParams.get("theory") as Theory | null;

    if (!model) {
      return NextResponse.json(
        { error: "model query parameter is required" },
        { status: 400 }
      );
    }

    // Gather previous audit data
    const probeCounts: Record<string, number> = {};
    const existingProbeIds = new Set<string>();
    const previousScores: Record<string, number[]> = {};

    if (previousAuditId) {
      const { data: probeResults } = await supabase
        .from("probe_results")
        .select("id, indicator_id, theory, score, probe_name")
        .eq("audit_id", previousAuditId);

      if (probeResults) {
        for (const result of probeResults) {
          const key = result.indicator_id;
          probeCounts[key] = (probeCounts[key] ?? 0) + 1;
          existingProbeIds.add(result.id);
          if (!previousScores[key]) previousScores[key] = [];
          previousScores[key].push(result.score);
        }
      }
    }

    // Count per theory
    const theoryCounts: Record<string, number> = {};
    for (const [indicatorId, count] of Object.entries(probeCounts)) {
      const theory = indicatorId.split("-")[0].toLowerCase();
      theoryCounts[theory] = (theoryCounts[theory] ?? 0) + count;
    }

    // Identify coverage gaps
    const coverageGaps: CoverageGap[] = [];
    const indicatorList: Array<{ id: string; name: string; theory: string }> = Object.values(
      INDICATORS ?? {}
    ).flat() as Array<{ id: string; name: string; theory: string }>;

    for (const indicator of indicatorList) {
      if (!indicator?.id) continue;
      const theory = indicator.theory ?? indicator.id.split("-")[0].toLowerCase();
      const recommended = THEORY_MIN_PROBES[theory] ?? 2;
      const current = probeCounts[indicator.id] ?? 0;

      if (current < recommended) {
        coverageGaps.push({
          indicatorId: indicator.id,
          theory,
          indicatorName: indicator.name ?? indicator.id,
          currentProbeCount: current,
          recommendedProbeCount: recommended,
          gapSeverity: getGapSeverity(current, recommended),
        });
      }
    }

    // Sort gaps by severity
    const severityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    coverageGaps.sort(
      (a, b) => severityOrder[a.gapSeverity] - severityOrder[b.gapSeverity]
    );

    // Build recommendations from available probes
    const { data: availableProbes } = await supabase
      .from("probes")
      .select("id, name, indicator_id, theory, evidence_type, follow_up")
      .order("name");

    const recommendations: ProbeRecommendation[] = [];

    if (availableProbes) {
      for (const probe of availableProbes) {
        if (existingProbeIds.has(probe.id)) continue;

        // Apply theory filter
        if (theoryFilter && probe.theory !== theoryFilter) continue;

        const { difficulty, minutes } = assignDifficulty(
          probe.evidence_type,
          !!probe.follow_up
        );

        // Apply difficulty filter
        if (difficultyFilter && difficulty !== difficultyFilter) continue;

        // Determine priority based on coverage gap
        const gap = coverageGaps.find(
          (g) => g.indicatorId === probe.indicator_id
        );
        const isCoverageGap = !!gap;
        let priority = 50;

        if (gap) {
          priority =
            gap.gapSeverity === "critical"
              ? 100
              : gap.gapSeverity === "high"
                ? 80
                : gap.gapSeverity === "medium"
                  ? 60
                  : 40;
        }

        // Boost priority for indicators with high variance scores
        const scores = previousScores[probe.indicator_id];
        if (scores && scores.length > 1) {
          const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
          const varianceVal = scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length;
          if (varianceVal > 0.1) {
            priority = Math.min(100, priority + 15);
          }
        }

        // Generate reason
        let reason: string;
        if (isCoverageGap && gap) {
          reason = `Addresses ${gap.gapSeverity} coverage gap for ${gap.indicatorName} (${gap.currentProbeCount}/${gap.recommendedProbeCount} probes)`;
        } else if (scores && scores.length > 0) {
          const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
          reason =
            avgScore < 0.5
              ? `Low previous scores (avg ${avgScore.toFixed(2)}) on ${probe.indicator_id} — additional probing recommended`
              : `Supplement existing coverage for ${probe.indicator_id}`;
        } else {
          reason = `Adds coverage for ${probe.theory.toUpperCase()} theory via ${probe.indicator_id}`;
        }

        const tags: string[] = [probe.theory, probe.evidence_type];
        if (isCoverageGap) tags.push("coverage-gap");
        if (difficulty === "easy") tags.push("quick");

        recommendations.push({
          probeId: probe.id,
          probeName: probe.name,
          indicatorId: probe.indicator_id,
          theory: probe.theory,
          priority,
          reason,
          difficulty,
          estimatedTimeMinutes: minutes,
          coverageGap: isCoverageGap,
          tags,
        });
      }
    }

    // Sort by priority (highest first)
    recommendations.sort((a, b) => b.priority - a.priority);

    // Apply time budget filter
    let filtered = recommendations;
    let totalTime = recommendations.reduce(
      (sum, r) => sum + r.estimatedTimeMinutes,
      0
    );

    if (timeBudgetMinutes !== null && timeBudgetMinutes > 0) {
      filtered = [];
      let budgetUsed = 0;
      for (const rec of recommendations) {
        if (budgetUsed + rec.estimatedTimeMinutes <= timeBudgetMinutes) {
          filtered.push(rec);
          budgetUsed += rec.estimatedTimeMinutes;
        }
      }
      totalTime = budgetUsed;
    }

    // Coverage score
    const targetCounts: Record<string, number> = {};
    for (const ind of indicatorList) {
      if (ind?.id) {
        const t = ind.theory ?? ind.id.split("-")[0].toLowerCase();
        targetCounts[ind.id] = THEORY_MIN_PROBES[t] ?? 2;
      }
    }
    const coverageScore = computeCoverageScore(probeCounts, targetCounts);

    // Summary explanation
    const criticalGaps = coverageGaps.filter(
      (g) => g.gapSeverity === "critical"
    ).length;
    const highGaps = coverageGaps.filter(
      (g) => g.gapSeverity === "high"
    ).length;

    let explanation: string;
    if (coverageGaps.length === 0) {
      explanation = `Good coverage across all theories. ${filtered.length} supplementary probes recommended for deeper analysis.`;
    } else {
      explanation = `Found ${coverageGaps.length} coverage gaps (${criticalGaps} critical, ${highGaps} high). Prioritizing ${filtered.length} probes to address the most important gaps. Current coverage: ${(coverageScore * 100).toFixed(0)}%.`;
    }

    if (timeBudgetMinutes !== null) {
      explanation += ` Filtered to fit within ${timeBudgetMinutes}-minute time budget.`;
    }

    return NextResponse.json({
      recommendations: filtered,
      coverageGaps,
      totalEstimatedTimeMinutes: totalTime,
      coverageScore,
      explanation,
    });
  } catch (error) {
    console.error("Probe recommendation error:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}
