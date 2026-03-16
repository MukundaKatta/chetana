import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage, ModelResponse } from "@chetana/shared";
import type { ModelAdapter, ModelAdapterConfig } from "./interface";

export class AnthropicAdapter implements ModelAdapter {
  readonly provider = "anthropic";
  readonly modelId: string;
  private client: Anthropic;
  private maxTokens: number;

  constructor(config: ModelAdapterConfig) {
    this.modelId = config.modelId;
    this.maxTokens = config.maxTokens ?? 4096;
    this.client = new Anthropic({ apiKey: config.apiKey });
  }

  async chat(messages: ChatMessage[]): Promise<ModelResponse> {
    const systemMessage = messages.find((m) => m.role === "system");
    const chatMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const start = Date.now();
    const response = await this.client.messages.create({
      model: this.modelId,
      max_tokens: this.maxTokens,
      system: systemMessage?.content,
      messages: chatMessages,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return {
      content: textBlock?.text ?? "",
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
      latencyMs: Date.now() - start,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.messages.create({
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
