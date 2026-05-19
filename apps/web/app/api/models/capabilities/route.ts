/**
 * Model capability matrix API endpoint (Issue #450).
 * Returns feature support matrices (streaming, function calling, vision),
 * context windows, token limits, pricing, and provider availability.
 * Cached with periodic refresh.
 */

import { NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface ModelCapability {
  /** Model identifier (e.g. "claude-sonnet-4-20250514"). */
  modelId: string;
  /** Human-readable display name. */
  displayName: string;
  /** Provider name. */
  provider: string;
  /** Feature support flags. */
  features: FeatureMatrix;
  /** Context and token limits. */
  limits: TokenLimits;
  /** Pricing per 1M tokens (USD). */
  pricing: Pricing;
  /** Current availability status. */
  availability: AvailabilityStatus;
  /** Model family (e.g. "claude", "gpt", "gemini"). */
  family: string;
  /** Release date as ISO string. */
  releasedAt: string | null;
  /** Whether the model is deprecated. */
  deprecated: boolean;
}

interface FeatureMatrix {
  streaming: boolean;
  functionCalling: boolean;
  vision: boolean;
  jsonMode: boolean;
  systemPrompt: boolean;
  multiTurn: boolean;
  embeddings: boolean;
  fineTuning: boolean;
  batchApi: boolean;
  caching: boolean;
  thinking: boolean;
}

interface TokenLimits {
  /** Maximum context window in tokens. */
  contextWindow: number;
  /** Maximum output tokens per request. */
  maxOutputTokens: number;
  /** Maximum input tokens per request (may differ from context window). */
  maxInputTokens: number;
}

interface Pricing {
  /** Input cost per 1M tokens in USD. */
  inputPerMillion: number;
  /** Output cost per 1M tokens in USD. */
  outputPerMillion: number;
  /** Cached input cost per 1M tokens (if supported). */
  cachedInputPerMillion?: number;
}

type AvailabilityStatus = "available" | "limited" | "unavailable" | "beta";

interface CapabilitiesResponse {
  models: ModelCapability[];
  updatedAt: string;
  cacheHit: boolean;
}

/* ------------------------------------------------------------------ */
/*  Model data                                                        */
/* ------------------------------------------------------------------ */

const MODEL_CAPABILITIES: ModelCapability[] = [
  // Anthropic models
  {
    modelId: "claude-sonnet-4-20250514",
    displayName: "Claude Sonnet 4",
    provider: "anthropic",
    family: "claude",
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
      jsonMode: true,
      systemPrompt: true,
      multiTurn: true,
      embeddings: false,
      fineTuning: false,
      batchApi: true,
      caching: true,
      thinking: true,
    },
    limits: {
      contextWindow: 200_000,
      maxOutputTokens: 16_000,
      maxInputTokens: 200_000,
    },
    pricing: {
      inputPerMillion: 3.0,
      outputPerMillion: 15.0,
      cachedInputPerMillion: 0.3,
    },
    availability: "available",
    releasedAt: "2025-05-14",
    deprecated: false,
  },
  {
    modelId: "claude-opus-4-20250514",
    displayName: "Claude Opus 4",
    provider: "anthropic",
    family: "claude",
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
      jsonMode: true,
      systemPrompt: true,
      multiTurn: true,
      embeddings: false,
      fineTuning: false,
      batchApi: true,
      caching: true,
      thinking: true,
    },
    limits: {
      contextWindow: 200_000,
      maxOutputTokens: 32_000,
      maxInputTokens: 200_000,
    },
    pricing: {
      inputPerMillion: 15.0,
      outputPerMillion: 75.0,
      cachedInputPerMillion: 1.5,
    },
    availability: "available",
    releasedAt: "2025-05-14",
    deprecated: false,
  },
  {
    modelId: "claude-haiku-3-5-20241022",
    displayName: "Claude 3.5 Haiku",
    provider: "anthropic",
    family: "claude",
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
      jsonMode: true,
      systemPrompt: true,
      multiTurn: true,
      embeddings: false,
      fineTuning: false,
      batchApi: true,
      caching: true,
      thinking: false,
    },
    limits: {
      contextWindow: 200_000,
      maxOutputTokens: 8_192,
      maxInputTokens: 200_000,
    },
    pricing: {
      inputPerMillion: 0.8,
      outputPerMillion: 4.0,
      cachedInputPerMillion: 0.08,
    },
    availability: "available",
    releasedAt: "2024-10-22",
    deprecated: false,
  },
  // OpenAI models
  {
    modelId: "gpt-4o",
    displayName: "GPT-4o",
    provider: "openai",
    family: "gpt",
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
      jsonMode: true,
      systemPrompt: true,
      multiTurn: true,
      embeddings: false,
      fineTuning: true,
      batchApi: true,
      caching: false,
      thinking: false,
    },
    limits: {
      contextWindow: 128_000,
      maxOutputTokens: 16_384,
      maxInputTokens: 128_000,
    },
    pricing: {
      inputPerMillion: 2.5,
      outputPerMillion: 10.0,
    },
    availability: "available",
    releasedAt: "2024-05-13",
    deprecated: false,
  },
  {
    modelId: "gpt-4o-mini",
    displayName: "GPT-4o Mini",
    provider: "openai",
    family: "gpt",
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
      jsonMode: true,
      systemPrompt: true,
      multiTurn: true,
      embeddings: false,
      fineTuning: true,
      batchApi: true,
      caching: false,
      thinking: false,
    },
    limits: {
      contextWindow: 128_000,
      maxOutputTokens: 16_384,
      maxInputTokens: 128_000,
    },
    pricing: {
      inputPerMillion: 0.15,
      outputPerMillion: 0.6,
    },
    availability: "available",
    releasedAt: "2024-07-18",
    deprecated: false,
  },
  {
    modelId: "o3",
    displayName: "o3",
    provider: "openai",
    family: "gpt",
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
      jsonMode: true,
      systemPrompt: true,
      multiTurn: true,
      embeddings: false,
      fineTuning: false,
      batchApi: true,
      caching: false,
      thinking: true,
    },
    limits: {
      contextWindow: 200_000,
      maxOutputTokens: 100_000,
      maxInputTokens: 200_000,
    },
    pricing: {
      inputPerMillion: 10.0,
      outputPerMillion: 40.0,
    },
    availability: "available",
    releasedAt: "2025-04-16",
    deprecated: false,
  },
  // Google models
  {
    modelId: "gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    provider: "google",
    family: "gemini",
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
      jsonMode: true,
      systemPrompt: true,
      multiTurn: true,
      embeddings: false,
      fineTuning: false,
      batchApi: false,
      caching: true,
      thinking: true,
    },
    limits: {
      contextWindow: 1_000_000,
      maxOutputTokens: 65_536,
      maxInputTokens: 1_000_000,
    },
    pricing: {
      inputPerMillion: 1.25,
      outputPerMillion: 10.0,
    },
    availability: "available",
    releasedAt: "2025-03-25",
    deprecated: false,
  },
  {
    modelId: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    provider: "google",
    family: "gemini",
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
      jsonMode: true,
      systemPrompt: true,
      multiTurn: true,
      embeddings: false,
      fineTuning: false,
      batchApi: false,
      caching: true,
      thinking: true,
    },
    limits: {
      contextWindow: 1_000_000,
      maxOutputTokens: 65_536,
      maxInputTokens: 1_000_000,
    },
    pricing: {
      inputPerMillion: 0.15,
      outputPerMillion: 0.6,
    },
    availability: "available",
    releasedAt: "2025-04-17",
    deprecated: false,
  },
  // Local models
  {
    modelId: "llama-3.3-70b",
    displayName: "Llama 3.3 70B",
    provider: "ollama",
    family: "llama",
    features: {
      streaming: true,
      functionCalling: true,
      vision: false,
      jsonMode: true,
      systemPrompt: true,
      multiTurn: true,
      embeddings: false,
      fineTuning: false,
      batchApi: false,
      caching: false,
      thinking: false,
    },
    limits: {
      contextWindow: 128_000,
      maxOutputTokens: 8_192,
      maxInputTokens: 128_000,
    },
    pricing: {
      inputPerMillion: 0,
      outputPerMillion: 0,
    },
    availability: "available",
    releasedAt: "2024-12-06",
    deprecated: false,
  },
];

/* ------------------------------------------------------------------ */
/*  Cache                                                             */
/* ------------------------------------------------------------------ */

let cachedResponse: CapabilitiesResponse | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getCapabilities(): CapabilitiesResponse {
  const now = Date.now();

  if (cachedResponse && now - cacheTimestamp < CACHE_TTL_MS) {
    return { ...cachedResponse, cacheHit: true };
  }

  // Check provider availability based on environment keys
  const providerEnvKeys: Record<string, string> = {
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    google: "GOOGLE_AI_API_KEY",
  };

  const models = MODEL_CAPABILITIES.map((model) => {
    const envKey = providerEnvKeys[model.provider];
    const hasKey =
      model.provider === "ollama" || !!process.env[envKey ?? ""];

    return {
      ...model,
      availability: hasKey
        ? model.availability
        : ("unavailable" as AvailabilityStatus),
    };
  });

  cachedResponse = {
    models,
    updatedAt: new Date().toISOString(),
    cacheHit: false,
  };
  cacheTimestamp = now;

  return cachedResponse;
}

/* ------------------------------------------------------------------ */
/*  Route handler                                                     */
/* ------------------------------------------------------------------ */

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  const data = getCapabilities();

  // Optional filters
  const provider = searchParams.get("provider");
  const feature = searchParams.get("feature");
  const family = searchParams.get("family");
  const available = searchParams.get("available");

  let filtered = data.models;

  if (provider) {
    filtered = filtered.filter((m) => m.provider === provider);
  }

  if (family) {
    filtered = filtered.filter((m) => m.family === family);
  }

  if (available === "true") {
    filtered = filtered.filter(
      (m) => m.availability === "available" || m.availability === "beta",
    );
  }

  if (feature) {
    const features = feature.split(",") as Array<keyof FeatureMatrix>;
    filtered = filtered.filter((m) =>
      features.every((f) => m.features[f] === true),
    );
  }

  return NextResponse.json(
    {
      models: filtered,
      total: filtered.length,
      updatedAt: data.updatedAt,
      cacheHit: data.cacheHit,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=900, stale-while-revalidate=1800",
      },
    },
  );
}
