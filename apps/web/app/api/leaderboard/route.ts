import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("audits")
    .select("model_name, model_provider, overall_score, theory_scores")
    .eq("status", "completed")
    .not("overall_score", "is", null)
    .order("overall_score", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }

  // Aggregate by model
  const modelMap = new Map<
    string,
    {
      modelName: string;
      modelProvider: string;
      auditCount: number;
      totalScore: number;
      scores: Record<string, number[]>;
    }
  >();

  for (const row of data || []) {
    const key = `${row.model_provider}:${row.model_name}`;
    if (!modelMap.has(key)) {
      modelMap.set(key, {
        modelName: row.model_name,
        modelProvider: row.model_provider,
        auditCount: 0,
        totalScore: 0,
        scores: { gwt: [], iit: [], hot: [], rpt: [], pp: [], ast: [] },
      });
    }
    const entry = modelMap.get(key)!;
    entry.auditCount++;
    entry.totalScore += row.overall_score;
    if (row.theory_scores) {
      for (const [theory, score] of Object.entries(row.theory_scores as Record<string, number>)) {
        entry.scores[theory]?.push(score);
      }
    }
  }

  const leaderboard = Array.from(modelMap.values())
    .map((entry) => ({
      modelName: entry.modelName,
      modelProvider: entry.modelProvider,
      auditCount: entry.auditCount,
      avgScore: entry.totalScore / entry.auditCount,
      theoryAvgs: Object.fromEntries(
        Object.entries(entry.scores).map(([theory, scores]) => [
          theory,
          scores.length > 0
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : 0,
        ])
      ),
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  return NextResponse.json({ leaderboard });
}
