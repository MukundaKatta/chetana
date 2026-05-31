import type { ChatMessage, ModelResponse } from "@chetana/shared";
import type { ModelAdapter, ModelAdapterConfig } from "./interface";

/**
 * Generic adapter for the many 2026 providers that expose an OpenAI-compatible
 * `/chat/completions` endpoint (issues #691-#704): Groq, Together, Fireworks,
 * Perplexity, Cohere (compat), AI21, Amazon Nova, Reka, Azure OpenAI,
 * self-hosted vLLM, Apple MLX, Microsoft Phi-4, and Bedrock/Vertex via gateways.
 *
 * Each registered provider supplies a default endpoint and known model list;
 * `baseUrl` overrides the endpoint for self-hosted/regional deployments. Auth is
 * a bearer token via `apiKey`; providers needing SigV4/GCP/Azure-AD auth can be
 * pointed at an authenticating gateway through `baseUrl`.
 */
export interface OpenAICompatibleProviderSpec {
  defaultUrl: string;
  models: string[];
  /** Some providers send extra body fields (e.g. Perplexity citations). */
  extraBody?: Record<string, unknown>;
  /** Whether to surface citations from the response when present. */
  captureCitations?: boolean;
}

export const OPENAI_COMPATIBLE_PROVIDERS = {
  groq: { defaultUrl: "https://api.groq.com/openai/v1/chat/completions", models: ["llama-3.3-70b", "mixtral-8x7b"] },
  together: { defaultUrl: "https://api.together.xyz/v1/chat/completions", models: ["meta-llama/Llama-4-Maverick", "Qwen/Qwen3-235B"] },
  fireworks: { defaultUrl: "https://api.fireworks.ai/inference/v1/chat/completions", models: ["accounts/fireworks/models/llama4-maverick"] },
  perplexity: { defaultUrl: "https://api.perplexity.ai/chat/completions", models: ["sonar", "sonar-pro"], captureCitations: true },
  cohere: { defaultUrl: "https://api.cohere.ai/compatibility/v1/chat/completions", models: ["command-a", "command-r-plus"] },
  ai21: { defaultUrl: "https://api.ai21.com/studio/v1/chat/completions", models: ["jamba-large", "jamba-mini"] },
  nova: { defaultUrl: "https://bedrock-runtime.us-east-1.amazonaws.com/openai/v1/chat/completions", models: ["amazon.nova-pro", "amazon.nova-lite"] },
  reka: { defaultUrl: "https://api.reka.ai/v1/chat/completions", models: ["reka-core", "reka-flash"] },
  azure: { defaultUrl: "", models: [] }, // requires baseUrl (deployment endpoint)
  vllm: { defaultUrl: "http://localhost:8000/v1/chat/completions", models: [] },
  mlx: { defaultUrl: "http://localhost:8080/v1/chat/completions", models: [] },
  phi: { defaultUrl: "https://models.inference.ai.azure.com/chat/completions", models: ["Phi-4", "Phi-4-mini"] },
  bedrock: { defaultUrl: "https://bedrock-runtime.us-east-1.amazonaws.com/openai/v1/chat/completions", models: [] },
  vertex: { defaultUrl: "", models: [] }, // requires baseUrl (project/region endpoint)
} as const satisfies Record<string, OpenAICompatibleProviderSpec>;

export type OpenAICompatibleProvider = keyof typeof OPENAI_COMPATIBLE_PROVIDERS;

export class OpenAICompatibleAdapter implements ModelAdapter {
  readonly provider: string;
  readonly modelId: string;
  private apiKey: string;
  private apiUrl: string;
  private maxTokens: number;
  private temperature: number;
  private spec: OpenAICompatibleProviderSpec;

  constructor(provider: OpenAICompatibleProvider, config: ModelAdapterConfig) {
    this.provider = provider;
    this.modelId = config.modelId;
    this.apiKey = config.apiKey;
    this.maxTokens = config.maxTokens ?? 4096;
    this.temperature = config.temperature ?? 0.7;
    this.spec = OPENAI_COMPATIBLE_PROVIDERS[provider];
    this.apiUrl = config.baseUrl ?? this.spec.defaultUrl;

    if (!this.apiUrl) {
      throw new Error(`Provider "${provider}" requires a baseUrl (deployment endpoint).`);
    }
    if (this.spec.models.length > 0 && !this.spec.models.includes(this.modelId)) {
      console.warn(
        `Model "${this.modelId}" is not in the known ${provider} models list: ${this.spec.models.join(", ")}`
      );
    }
  }

  async chat(messages: ChatMessage[]): Promise<ModelResponse> {
    const start = Date.now();
    const response = await fetch(this.apiUrl, {
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
        ...(this.spec.extraBody ?? {}),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`${this.provider} API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    let content = choice?.message?.content ?? "";

    const citations: string[] = data.citations ?? choice?.message?.citations ?? [];
    if (this.spec.captureCitations && citations.length > 0) {
      content = `${content}\n\n<citations>\n${citations.join("\n")}\n</citations>`;
    }

    return {
      content,
      tokensUsed: {
        input: data.usage?.prompt_tokens ?? 0,
        output: data.usage?.completion_tokens ?? 0,
      },
      latencyMs: Date.now() - start,
    };
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiUrl) return false;
    try {
      const response = await fetch(this.apiUrl, {
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
