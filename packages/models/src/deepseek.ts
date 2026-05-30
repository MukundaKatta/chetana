import type { ChatMessage, ModelResponse } from "@chetana/shared";
import type { ModelAdapter, ModelAdapterConfig } from "./interface";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

const SUPPORTED_MODELS = ["deepseek-chat", "deepseek-reasoner", "deepseek-r2"];

export class DeepSeekAdapter implements ModelAdapter {
  readonly provider = "deepseek";
  readonly modelId: string;
  private apiKey: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: ModelAdapterConfig) {
    this.modelId = config.modelId;
    this.apiKey = config.apiKey;
    this.maxTokens = config.maxTokens ?? 4096;
    this.temperature = config.temperature ?? 0.7;

    if (!SUPPORTED_MODELS.includes(this.modelId)) {
      console.warn(
        `Model "${this.modelId}" is not in the known DeepSeek models list: ${SUPPORTED_MODELS.join(", ")}`
      );
    }
  }

  async chat(messages: ChatMessage[]): Promise<ModelResponse> {
    const start = Date.now();

    const response = await fetch(DEEPSEEK_API_URL, {
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
      throw new Error(
        `DeepSeek API error (${response.status}): ${errorBody}`
      );
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    // The reasoning models (deepseek-reasoner / deepseek-r2) return
    // reasoning_content alongside content.
    let content = choice?.message?.content ?? "";
    if (
      (this.modelId === "deepseek-reasoner" || this.modelId === "deepseek-r2") &&
      choice?.message?.reasoning_content
    ) {
      content = `<reasoning>\n${choice.message.reasoning_content}\n</reasoning>\n\n${content}`;
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
      const response = await fetch(DEEPSEEK_API_URL, {
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
