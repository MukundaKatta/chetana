import { NextResponse } from "next/server";
import { POPULAR_MODELS } from "@chetana/shared";

interface ModelAvailability {
  provider: string;
  modelId: string;
  displayName: string;
  status: "available" | "unavailable" | "unknown";
  estimatedLatencyMs: number | null;
  version: string | null;
  checkedAt: string;
}

let cachedResults: ModelAvailability[] | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const providerEnvKeys: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_AI_API_KEY",
};

const providerVersions: Record<string, string> = {
  anthropic: "2025-01-01",
  openai: "2024-12-01",
  google: "v1",
  ollama: "local",
};

// Estimated latencies per provider in ms
const estimatedLatencies: Record<string, number> = {
  anthropic: 350,
  openai: 300,
  google: 250,
  ollama: 500,
};

async function checkAvailability(): Promise<ModelAvailability[]> {
  const now = new Date().toISOString();
  const results: ModelAvailability[] = [];

  for (const model of POPULAR_MODELS) {
    const envKey = providerEnvKeys[model.provider];
    const hasKey = model.provider === "ollama" || !!process.env[envKey ?? ""];

    results.push({
      provider: model.provider,
      modelId: model.modelId,
      displayName: model.displayName,
      status: hasKey ? "available" : "unavailable",
      estimatedLatencyMs: hasKey
        ? estimatedLatencies[model.provider] ?? null
        : null,
      version: providerVersions[model.provider] ?? null,
      checkedAt: now,
    });
  }

  return results;
}

export async function GET() {
  try {
    const now = Date.now();

    if (cachedResults && now - cachedAt < CACHE_TTL_MS) {
      return NextResponse.json({
        models: cachedResults,
        cached: true,
        cachedAt: new Date(cachedAt).toISOString(),
        ttlRemainingMs: CACHE_TTL_MS - (now - cachedAt),
      });
    }

    const results = await checkAvailability();
    cachedResults = results;
    cachedAt = now;

    return NextResponse.json({
      models: results,
      cached: false,
      cachedAt: new Date(cachedAt).toISOString(),
      ttlRemainingMs: CACHE_TTL_MS,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
