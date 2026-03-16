import type { ChatMessage, ModelResponse } from "@chetana/shared";

export interface ModelAdapter {
  readonly provider: string;
  readonly modelId: string;

  chat(messages: ChatMessage[]): Promise<ModelResponse>;
  isAvailable(): Promise<boolean>;
}

export interface ModelAdapterConfig {
  apiKey: string;
  modelId: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}
