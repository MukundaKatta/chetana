import type { ChatMessage, ModelResponse } from "@chetana/shared";
import type { ModelAdapter, ModelAdapterConfig } from "./interface";

const XAI_API_URL = "https://api.x.ai/v1/chat/completions";

const SUPPORTED_MODELS = ["grok-4.20", "grok-4", "grok-3", "grok-beta"];

/**
 * Adapter for xAI's Grok models (issue #558).
 * Grok 4.20 (2026) adds enhanced real-time web access; when `liveSearch`
 * is enabled the adapter requests source citations alongside the answer.
 * The xAI API is OpenAI-compatible.
 */
export class XAIAdapter implements ModelAdapter {
  readonly provider = "xai";
  readonly modelId: string;
  private apiKey: string;
  private maxTokens: number;
  private temperature: number;
  private liveSearch: boolean;

  constructor(config: ModelAdapterConfig & { liveSearch?: boolean }) {
    this.modelId = config.modelId;
    this.apiKey = config.apiKey;
    this.maxTokens = config.maxTokens ?? 4096;
    this.temperature = config.temperature ?? 0.7;
    this.liveSearch = config.liveSearch ?? false;

    if (!SUPPORTED_MODELS.includes(this.modelId)) {
      console.warn(
        `Model "${this.modelId}" is not in the known xAI models list: ${SUPPORTED_MODELS.join(", ")}`
      );
    }
  }

  async chat(messages: ChatMessage[]): Promise<ModelResponse> {
    const start = Date.now();

    const response = await fetch(XAI_API_URL, {
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
        ...(this.liveSearch
          ? { search_parameters: { mode: "auto", return_citations: true } }
          : {}),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`xAI API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    // When live search is on, append captured citations for downstream probes.
    let content = choice?.message?.content ?? "";
    const citations: string[] = data.citations ?? choice?.message?.citations ?? [];
    if (this.liveSearch && citations.length > 0) {
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
    try {
      const response = await fetch(XAI_API_URL, {
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
