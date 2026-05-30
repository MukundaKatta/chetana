import type { ChatMessage, ModelResponse } from "@chetana/shared";
import type { ModelAdapter, ModelAdapterConfig } from "./interface";

// DashScope international OpenAI-compatible endpoint. Override via config.baseUrl
// to target a self-hosted or regional deployment.
const DEFAULT_QWEN_API_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";

const SUPPORTED_MODELS = [
  "qwen3-max",
  "qwen3-235b-a22b",
  "qwen3-32b",
  "qwen-max",
  "qwen-plus",
];

/**
 * Adapter for the Qwen 3 model family (issue #563).
 * Supports both the hosted DashScope API and local/OpenAI-compatible
 * deployments via `baseUrl`.
 */
export class QwenAdapter implements ModelAdapter {
  readonly provider = "qwen";
  readonly modelId: string;
  private apiKey: string;
  private baseUrl: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: ModelAdapterConfig) {
    this.modelId = config.modelId;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_QWEN_API_URL;
    this.maxTokens = config.maxTokens ?? 4096;
    this.temperature = config.temperature ?? 0.7;

    if (!SUPPORTED_MODELS.includes(this.modelId)) {
      console.warn(
        `Model "${this.modelId}" is not in the known Qwen models list: ${SUPPORTED_MODELS.join(", ")}`
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
      throw new Error(`Qwen API error (${response.status}): ${errorBody}`);
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
