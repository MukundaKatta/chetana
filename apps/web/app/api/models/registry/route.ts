import { NextResponse } from "next/server";
import { getAllModelVersions, getModelVersionsByProvider, type ModelProvider } from "@chetana/shared";

/**
 * GET /api/models/registry
 *
 * Public endpoint exposing the model-version registry (issue #565), including
 * the 2026 frontier models (GPT-5.4, Gemini 3.1, Claude Opus 4, Grok 4.20,
 * Qwen 3, Muse Spark, DeepSeek R2, Mistral Large 3).
 *
 * Optional ?provider=<provider> filters by provider.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider") as ModelProvider | null;

  const models = provider
    ? getModelVersionsByProvider(provider)
    : getAllModelVersions();

  return NextResponse.json({
    count: models.length,
    provider: provider ?? "all",
    models,
  });
}
