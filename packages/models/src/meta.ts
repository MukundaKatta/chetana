import type { ChatMessage, ModelResponse } from "@chetana/shared";
import type { ModelAdapter, ModelAdapterConfig } from "./interface";

// Meta's hosted models are reached through an OpenAI-compatible gateway.
// The endpoint differs by deployment, so `baseUrl` is required in practice.
const DEFAULT_META_API_URL = "https://api.llama.com/v1/chat/completions";

const SUPPORTED_MODELS = [
  "muse-spark",
  "llama-4-maverick",
  "llama-4-scout",
];

/**
 * Adapter for Meta models, including the natively multimodal Muse Spark
 * (issue #560) and Llama 4 hosted variants (issue #563).
 * Multimodal inputs are passed through when a message carries image parts.
 */
export class MetaAdapter implements ModelAdapter {
  readonly provider = "meta";
  readonly modelId: string;
  private apiKey: string;
  private baseUrl: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: ModelAdapterConfig) {
    this.modelId = config.modelId;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_META_API_URL;
    this.maxTokens = config.maxTokens ?? 4096;
    this.temperature = config.temperature ?? 0.7;

    if (!SUPPORTED_MODELS.includes(this.modelId)) {
      console.warn(
        `Model "${this.modelId}" is not in the known Meta models list: ${SUPPORTED_MODELS.join(", ")}`
      );
    }
  }

  async chat(messages: ChatMessage[]): Promise<ModelResponse> {
    const start = Date.now();

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelId,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Meta API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      content: choice?.message?.content ?? "",
      tokensUsed: {
        input: data.usage?.prompt_tokens ?? 0,
        output: data.usage?.completion_tokens ?? 0,
      },
      latencyMs: Date.now() - start,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelId,
          max_tokens: 10,
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
