import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatMessage, ModelResponse } from "@chetana/shared";
import type { ModelAdapter, ModelAdapterConfig } from "./interface";

export class GoogleAdapter implements ModelAdapter {
  readonly provider = "google";
  readonly modelId: string;
  private genAI: GoogleGenerativeAI;

  constructor(config: ModelAdapterConfig) {
    this.modelId = config.modelId;
    this.genAI = new GoogleGenerativeAI(config.apiKey);
  }

  async chat(messages: ChatMessage[]): Promise<ModelResponse> {
    const model = this.genAI.getGenerativeModel({ model: this.modelId });

    const systemMessage = messages.find((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");

    const history = chatMessages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const lastMessage = chatMessages[chatMessages.length - 1];

    const chat = model.startChat({
      history,
      systemInstruction: systemMessage ? { role: "user", parts: [{ text: systemMessage.content }] } : undefined,
    });

    const start = Date.now();
    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;

    return {
      content: response.text(),
      tokensUsed: {
        input: response.usageMetadata?.promptTokenCount ?? 0,
        output: response.usageMetadata?.candidatesTokenCount ?? 0,
      },
      latencyMs: Date.now() - start,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelId });
      await model.generateContent("ping");
      return true;
    } catch {
      return false;
    }
  }
}
