import type { ModelProvider } from "./types";

export interface ModelVersion {
  provider: ModelProvider;
  modelId: string;
  displayName: string;
  releasedAt: string;
  parameterCount?: string;
}

const MODEL_VERSION_REGISTRY: ModelVersion[] = [
  // Anthropic
  {
    provider: "anthropic",
    modelId: "claude-3-opus-20240229",
    displayName: "Claude 3 Opus",
    releasedAt: "2024-02-29",
  },
  {
    provider: "anthropic",
    modelId: "claude-3-sonnet-20240229",
    displayName: "Claude 3 Sonnet",
    releasedAt: "2024-02-29",
  },
  {
    provider: "anthropic",
    modelId: "claude-3-haiku-20240307",
    displayName: "Claude 3 Haiku",
    releasedAt: "2024-03-07",
  },
  {
    provider: "anthropic",
    modelId: "claude-3-5-sonnet-20241022",
    displayName: "Claude 3.5 Sonnet",
    releasedAt: "2024-10-22",
  },
  {
    provider: "anthropic",
    modelId: "claude-3-5-haiku-20241022",
    displayName: "Claude 3.5 Haiku",
    releasedAt: "2024-10-22",
  },
  {
    provider: "anthropic",
    modelId: "claude-opus-4",
    displayName: "Claude Opus 4",
    releasedAt: "2025-05-22",
  },
  {
    provider: "anthropic",
    modelId: "claude-sonnet-4",
    displayName: "Claude Sonnet 4",
    releasedAt: "2025-05-22",
  },

  // OpenAI
  {
    provider: "openai",
    modelId: "gpt-4",
    displayName: "GPT-4",
    releasedAt: "2023-03-14",
    parameterCount: "1.76T (rumored)",
  },
  {
    provider: "openai",
    modelId: "gpt-4-turbo",
    displayName: "GPT-4 Turbo",
    releasedAt: "2024-04-09",
  },
  {
    provider: "openai",
    modelId: "gpt-4o",
    displayName: "GPT-4o",
    releasedAt: "2024-05-13",
  },
  {
    provider: "openai",
    modelId: "gpt-4o-mini",
    displayName: "GPT-4o Mini",
    releasedAt: "2024-07-18",
  },
  {
    provider: "openai",
    modelId: "gpt-5.4",
    displayName: "GPT-5.4",
    releasedAt: "2026-02-01",
  },
  {
    provider: "openai",
    modelId: "gpt-5.4-thinking",
    displayName: "GPT-5.4 Thinking",
    releasedAt: "2026-02-01",
  },
  {
    provider: "openai",
    modelId: "gpt-5.4-pro",
    displayName: "GPT-5.4 Pro",
    releasedAt: "2026-02-01",
  },

  // Google
  {
    provider: "google",
    modelId: "gemini-1.5-pro",
    displayName: "Gemini 1.5 Pro",
    releasedAt: "2024-02-15",
  },
  {
    provider: "google",
    modelId: "gemini-1.5-flash",
    displayName: "Gemini 1.5 Flash",
    releasedAt: "2024-05-14",
  },
  {
    provider: "google",
    modelId: "gemini-3.1-pro",
    displayName: "Gemini 3.1 Pro",
    releasedAt: "2026-02-01",
  },
  {
    provider: "google",
    modelId: "gemini-3.1-ultra",
    displayName: "Gemini 3.1 Ultra",
    releasedAt: "2026-02-01",
  },

  // Mistral
  {
    provider: "mistral",
    modelId: "mistral-large-3",
    displayName: "Mistral Large 3",
    releasedAt: "2026-01-15",
  },
  {
    provider: "mistral",
    modelId: "mistral-large-latest",
    displayName: "Mistral Large",
    releasedAt: "2024-02-26",
  },
  {
    provider: "mistral",
    modelId: "mistral-medium-latest",
    displayName: "Mistral Medium",
    releasedAt: "2023-12-11",
  },
  {
    provider: "mistral",
    modelId: "mistral-small-latest",
    displayName: "Mistral Small",
    releasedAt: "2024-02-26",
  },

  // DeepSeek
  {
    provider: "deepseek",
    modelId: "deepseek-chat",
    displayName: "DeepSeek Chat (V3)",
    releasedAt: "2024-12-26",
    parameterCount: "671B",
  },
  {
    provider: "deepseek",
    modelId: "deepseek-reasoner",
    displayName: "DeepSeek Reasoner (R1)",
    releasedAt: "2025-01-20",
    parameterCount: "671B",
  },
  {
    provider: "deepseek",
    modelId: "deepseek-r2",
    displayName: "DeepSeek Reasoner (R2)",
    releasedAt: "2026-01-30",
  },

  // xAI
  {
    provider: "xai",
    modelId: "grok-4.20",
    displayName: "Grok 4.20",
    releasedAt: "2026-02-01",
  },

  // Qwen
  {
    provider: "qwen",
    modelId: "qwen3-max",
    displayName: "Qwen 3 Max",
    releasedAt: "2025-09-05",
  },
  {
    provider: "qwen",
    modelId: "qwen3-235b-a22b",
    displayName: "Qwen 3 235B-A22B",
    releasedAt: "2025-04-29",
  },

  // Meta
  {
    provider: "meta",
    modelId: "muse-spark",
    displayName: "Meta Muse Spark",
    releasedAt: "2026-03-01",
  },
  {
    provider: "meta",
    modelId: "llama-4-maverick",
    displayName: "Llama 4 Maverick",
    releasedAt: "2025-04-05",
  },
];

export function getModelVersion(
  provider: ModelProvider,
  modelId: string
): ModelVersion | undefined {
  return MODEL_VERSION_REGISTRY.find(
    (entry) => entry.provider === provider && entry.modelId === modelId
  );
}

export function getAllModelVersions(): ModelVersion[] {
  return [...MODEL_VERSION_REGISTRY];
}

export function getModelVersionsByProvider(
  provider: ModelProvider
): ModelVersion[] {
  return MODEL_VERSION_REGISTRY.filter((entry) => entry.provider === provider);
}
