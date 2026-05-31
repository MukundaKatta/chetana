import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  scoreEnsemble,
  krippendorffAlpha,
  interpretAlpha,
  expectedCalibrationError,
} from "@chetana/scorer";

/**
 * POST /api/audit/reliability
 *
 * Scoring reliability analysis: judge-ensemble agreement (#602), inter-rater
 * reliability via Krippendorff's alpha (#606), and calibration error against
 * human ratings (#604). All inputs are posted directly (no DB needed).
 */
const schema = z.object({
  ensembleItems: z
    .array(
      z.object({
        probeId: z.string(),
        judgeScores: z.array(z.object({ judgeId: z.string(), score: z.number().min(0).max(1) })),
      })
    )
    .optional(),
  ratings: z.array(z.array(z.number().min(0).max(1).nullable())).optional(),
  calibrationPairs: z
    .array(z.object({ judge: z.number().min(0).max(1), human: z.number().min(0).max(1) }))
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

  const { ensembleItems, ratings, calibrationPairs } = parsed.data;

  const ensemble = ensembleItems ? scoreEnsemble(ensembleItems) : null;

  let reliability = null;
  if (ratings && ratings.length > 0) {
    const r = krippendorffAlpha(ratings);
    reliability = { ...r, interpretation: interpretAlpha(r.alpha) };
  }

  const calibrationError = calibrationPairs ? expectedCalibrationError(calibrationPairs) : null;

  return NextResponse.json({ ensemble, reliability, calibrationError });
}
