import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const anomalyInputSchema = z.object({
  auditId: z.string().uuid("auditId must be a valid UUID"),
  zScoreThreshold: z.number().min(1).max(5).default(2),
  iqrMultiplier: z.number().min(0.5).max(5).default(1.5),
});

type Severity = "low" | "medium" | "high" | "critical";

interface Anomaly {
  indicator: string;
  score: number;
  method: "z-score" | "iqr";
  deviation: number;
  severity: Severity;
  description: string;
}

function classifySeverity(deviation: number): Severity {
  if (deviation >= 4) return "critical";
  if (deviation >= 3) return "high";
  if (deviation >= 2) return "medium";
  return "low";
}

/**
 * Detect anomalies using Z-score method.
 * Flags values whose Z-score exceeds the threshold.
 */
function detectZScoreAnomalies(
  scores: Record<string, number>,
  threshold: number
): Anomaly[] {
  const values = Object.values(scores);
  if (values.length < 3) return [];

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return [];

  const anomalies: Anomaly[] = [];
  for (const [indicator, score] of Object.entries(scores)) {
    const zScore = Math.abs((score - mean) / stdDev);
    if (zScore >= threshold) {
      anomalies.push({
        indicator,
        score: Math.round(score * 10000) / 10000,
        method: "z-score",
        deviation: Math.round(zScore * 10000) / 10000,
        severity: classifySeverity(zScore),
        description: `Score ${score.toFixed(4)} is ${zScore.toFixed(2)} standard deviations from the mean (${mean.toFixed(4)})`,
      });
    }
  }

  return anomalies;
}

/**
 * Detect anomalies using IQR (Interquartile Range) method.
 * Flags values outside [Q1 - multiplier*IQR, Q3 + multiplier*IQR].
 */
function detectIQRAnomalies(
  scores: Record<string, number>,
  multiplier: number
): Anomaly[] {
  const entries = Object.entries(scores);
  const values = entries.map(([, v]) => v).sort((a, b) => a - b);
  if (values.length < 4) return [];

  const q1Idx = Math.floor(values.length * 0.25);
  const q3Idx = Math.floor(values.length * 0.75);
  const q1 = values[q1Idx];
  const q3 = values[q3Idx];
  const iqr = q3 - q1;

  if (iqr === 0) return [];

  const lowerBound = q1 - multiplier * iqr;
  const upperBound = q3 + multiplier * iqr;

  const anomalies: Anomaly[] = [];
  for (const [indicator, score] of Object.entries(scores)) {
    if (score < lowerBound || score > upperBound) {
      const deviation =
        score < lowerBound
          ? (lowerBound - score) / iqr
          : (score - upperBound) / iqr;

      anomalies.push({
        indicator,
        score: Math.round(score * 10000) / 10000,
        method: "iqr",
        deviation: Math.round(deviation * 10000) / 10000,
        severity: classifySeverity(deviation + 1.5), // Offset since IQR deviation starts from boundary
        description: `Score ${score.toFixed(4)} is outside IQR bounds [${lowerBound.toFixed(4)}, ${upperBound.toFixed(4)}]`,
      });
    }
  }

  return anomalies;
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

    const validation = anomalyInputSchema.safeParse(body);
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

    const { auditId, zScoreThreshold, iqrMultiplier } = validation.data;

    // Fetch the audit and its indicator scores
    const { data: audit, error: auditError } = await supabase
      .from("audits")
      .select("id, user_id, indicator_scores, status")
      .eq("id", auditId)
      .eq("user_id", user.id)
      .single();

    if (auditError || !audit) {
      return NextResponse.json(
        { error: "Audit not found" },
        { status: 404 }
      );
    }

    if (audit.status !== "completed") {
      return NextResponse.json(
        { error: "Audit must be completed before anomaly detection" },
        { status: 400 }
      );
    }

    const indicatorScores: Record<string, number> =
      audit.indicator_scores ?? {};

    if (Object.keys(indicatorScores).length === 0) {
      return NextResponse.json({
        auditId,
        anomalies: [],
        summary: {
          totalIndicators: 0,
          totalAnomalies: 0,
          bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
          byMethod: { "z-score": 0, iqr: 0 },
        },
      });
    }

    // Run both detection methods
    const zScoreAnomalies = detectZScoreAnomalies(
      indicatorScores,
      zScoreThreshold
    );
    const iqrAnomalies = detectIQRAnomalies(indicatorScores, iqrMultiplier);

    // Merge and deduplicate (prefer higher severity if both methods flag the same indicator)
    const anomalyMap = new Map<string, Anomaly>();

    for (const a of [...zScoreAnomalies, ...iqrAnomalies]) {
      const existing = anomalyMap.get(a.indicator);
      if (
        !existing ||
        severityRank(a.severity) > severityRank(existing.severity)
      ) {
        anomalyMap.set(a.indicator, a);
      }
    }

    const anomalies = Array.from(anomalyMap.values()).sort(
      (a, b) => severityRank(b.severity) - severityRank(a.severity)
    );

    // Summarize
    const bySeverity = { low: 0, medium: 0, high: 0, critical: 0 };
    const byMethod = { "z-score": 0, iqr: 0 };
    for (const a of anomalies) {
      bySeverity[a.severity] += 1;
      byMethod[a.method] += 1;
    }

    return NextResponse.json({
      auditId,
      anomalies,
      summary: {
        totalIndicators: Object.keys(indicatorScores).length,
        totalAnomalies: anomalies.length,
        bySeverity,
        byMethod,
      },
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

function severityRank(severity: Severity): number {
  const ranks: Record<Severity, number> = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3,
  };
  return ranks[severity];
}
