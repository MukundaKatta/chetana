import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const consensusInputSchema = z.object({
  auditIds: z
    .array(z.string().uuid())
    .min(2, "At least 2 audit IDs are required")
    .max(10, "Maximum 10 audits for consensus analysis"),
});

interface IndicatorConsensus {
  indicator: string;
  scores: number[];
  mean: number;
  stdDev: number;
  agreement: "strong" | "moderate" | "weak";
  divergent: boolean;
}

interface TheoryConsensus {
  theory: string;
  scores: number[];
  mean: number;
  stdDev: number;
  agreement: "strong" | "moderate" | "weak";
}

function computeStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function classifyAgreement(stdDev: number): "strong" | "moderate" | "weak" {
  if (stdDev <= 0.05) return "strong";
  if (stdDev <= 0.15) return "moderate";
  return "weak";
}

/**
 * Compute Fleiss' kappa-like inter-rater agreement for continuous scores.
 * We discretize into 3 bins: low (<0.33), medium (0.33-0.66), high (>0.66).
 */
function computeInterRaterAgreement(
  scoreMatrix: number[][]
): number {
  if (scoreMatrix.length === 0 || scoreMatrix[0].length < 2) return 0;

  const n = scoreMatrix.length; // number of items (indicators)
  const k = scoreMatrix[0].length; // number of raters (audits)
  const categories = 3;

  // For each item, count how many raters assigned each category
  const ratings: number[][] = [];
  for (let i = 0; i < n; i++) {
    const counts = [0, 0, 0]; // low, medium, high
    for (let j = 0; j < k; j++) {
      const score = scoreMatrix[i][j];
      if (score < 0.33) counts[0]++;
      else if (score < 0.66) counts[1]++;
      else counts[2]++;
    }
    ratings.push(counts);
  }

  // Compute P_i for each item
  const pItems: number[] = [];
  for (const counts of ratings) {
    let sumSquared = 0;
    for (let c = 0; c < categories; c++) {
      sumSquared += counts[c] * counts[c];
    }
    pItems.push((sumSquared - k) / (k * (k - 1)));
  }

  // Compute P_bar (mean agreement)
  const pBar = pItems.reduce((a, b) => a + b, 0) / n;

  // Compute P_e (expected agreement)
  const categoryTotals = [0, 0, 0];
  for (const counts of ratings) {
    for (let c = 0; c < categories; c++) {
      categoryTotals[c] += counts[c];
    }
  }
  const totalRatings = n * k;
  let pE = 0;
  for (let c = 0; c < categories; c++) {
    pE += (categoryTotals[c] / totalRatings) ** 2;
  }

  if (pE >= 1) return 1;
  return (pBar - pE) / (1 - pE);
}

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

    const validation = consensusInputSchema.safeParse(body);
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

    const { auditIds } = validation.data;

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
        { error: "Could not find at least 2 completed audits" },
        { status: 404 }
      );
    }

    // Collect all indicator keys
    const allIndicators = new Set<string>();
    for (const audit of audits) {
      const is = audit.indicator_scores as Record<string, number> | null;
      if (is) {
        Object.keys(is).forEach((k) => allIndicators.add(k));
      }
    }

    // Build indicator consensus
    const indicatorConsensus: IndicatorConsensus[] = [];
    const scoreMatrix: number[][] = [];

    for (const indicator of allIndicators) {
      const scores: number[] = [];
      for (const audit of audits) {
        const is = audit.indicator_scores as Record<string, number> | null;
        if (is && indicator in is) {
          scores.push(is[indicator]);
        }
      }

      if (scores.length < 2) continue;

      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
      const stdDev = computeStdDev(scores);
      const agreement = classifyAgreement(stdDev);

      indicatorConsensus.push({
        indicator,
        scores,
        mean: Math.round(mean * 10000) / 10000,
        stdDev: Math.round(stdDev * 10000) / 10000,
        agreement,
        divergent: agreement === "weak",
      });

      scoreMatrix.push(scores);
    }

    // Build theory consensus
    const theories = ["gwt", "iit", "hot", "rpt", "pp", "ast"];
    const theoryConsensus: TheoryConsensus[] = theories.map((theory) => {
      const scores: number[] = [];
      for (const audit of audits) {
        const ts = audit.theory_scores as Record<string, number> | null;
        if (ts && theory in ts) {
          scores.push(ts[theory]);
        }
      }
      const mean =
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;
      const stdDev = computeStdDev(scores);
      return {
        theory,
        scores,
        mean: Math.round(mean * 10000) / 10000,
        stdDev: Math.round(stdDev * 10000) / 10000,
        agreement: classifyAgreement(stdDev),
      };
    });

    // Compute overall inter-rater agreement
    const interRaterAgreement = computeInterRaterAgreement(scoreMatrix);

    // Overall consensus score
    const overallScores = audits
      .map((a) => a.overall_score)
      .filter((s): s is number => s !== null);
    const overallMean =
      overallScores.length > 0
        ? overallScores.reduce((a, b) => a + b, 0) / overallScores.length
        : 0;
    const overallStdDev = computeStdDev(overallScores);

    const divergentIndicators = indicatorConsensus.filter((c) => c.divergent);

    return NextResponse.json({
      audits: audits.map((a) => ({
        id: a.id,
        modelName: a.model_name,
        modelProvider: a.model_provider,
        overallScore: a.overall_score,
        completedAt: a.completed_at,
      })),
      consensus: {
        overallMean: Math.round(overallMean * 10000) / 10000,
        overallStdDev: Math.round(overallStdDev * 10000) / 10000,
        overallAgreement: classifyAgreement(overallStdDev),
        interRaterAgreement:
          Math.round(interRaterAgreement * 10000) / 10000,
      },
      theoryConsensus,
      indicatorConsensus,
      divergenceIndicators: divergentIndicators.map((d) => d.indicator),
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
