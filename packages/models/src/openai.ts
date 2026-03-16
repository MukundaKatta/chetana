import OpenAI from "openai";
import type { ChatMessage, ModelResponse } from "@chetana/shared";
import type { ModelAdapter, ModelAdapterConfig } from "./interface";

export class OpenAIAdapter implements ModelAdapter {
  readonly provider = "openai";
  readonly modelId: string;
  private client: OpenAI;
  private maxTokens: number;

  constructor(config: ModelAdapterConfig) {
    this.modelId = config.modelId;
    this.maxTokens = config.maxTokens ?? 4096;
    this.client = new OpenAI({ apiKey: config.apiKey });
  }

  async chat(messages: ChatMessage[]): Promise<ModelResponse> {
    const start = Date.now();
    const response = await this.client.chat.completions.create({
      model: this.modelId,
      max_tokens: this.maxTokens,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const choice = response.choices[0];
    return {
      content: choice?.message?.content ?? "",
      tokensUsed: {
        input: response.usage?.prompt_tokens ?? 0,
        output: response.usage?.completion_tokens ?? 0,
      },
      latencyMs: Date.now() - start,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.chat.completions.create({
        model: this.modelId,
        max_tokens: 10,
        messages: [{ role: "user", content: "ping" }],
      });
      return true;
    } catch {
      return false;
    }
  }
}
