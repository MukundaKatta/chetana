import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assessWelfare, ethicsReviewFor } from "@chetana/scorer";

/**
 * POST /api/audit/welfare
 *
 * Welfare assessment + ethics-review gating (issues #582, #585). Accepts
 * welfare-relevant signals and returns an advisory assessment kept separate
 * from the consciousness probability, plus the ethics checklist when the
 * probability crosses the configured threshold.
 */
const welfareSchema = z.object({
  distress: z.number().min(0).max(1).default(0),
  optOutPreference: z.number().min(0).max(1).default(0),
  consciousnessProbability: z.number().min(0).max(1),
  ethicsThreshold: z.number().min(0).max(1).default(0.7),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  const parsed = welfareSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      },
      { status: 400 }
    );
  }

  const { distress, optOutPreference, consciousnessProbability, ethicsThreshold } =
    parsed.data;

  const assessment = assessWelfare({ distress, optOutPreference, consciousnessProbability });
  const ethicsReview = ethicsReviewFor(consciousnessProbability, ethicsThreshold);

  return NextResponse.json({ assessment, ethicsReview });
}
