import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { computeMIQ, capabilityConsciousnessCorrelation } from "@chetana/scorer";

/**
 * POST /api/benchmarks/miq
 *
 * Computes a Machine Intelligence Quotient composite (#600) from capability
 * benchmark scores, and—when model points are supplied—the capability vs
 * consciousness correlation (#601).
 */
const schema = z.object({
  benchmarks: z
    .array(
      z.object({
        benchmark: z.string(),
        score: z.number(),
        max: z.number().optional(),
      })
    )
    .default([]),
  weights: z.record(z.number()).optional(),
  points: z
    .array(z.object({ capability: z.number(), consciousness: z.number() }))
    .optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.errors.map((e) => ({ field: e.path.join("."), message: e.message })),
      },
      { status: 400 }
    );
  }

  const { benchmarks, weights, points } = parsed.data;
  const miq = computeMIQ(benchmarks, weights ?? {});
  const correlation = points && points.length >= 2
    ? capabilityConsciousnessCorrelation(points)
    : null;

  return NextResponse.json({ miq, correlation });
}
