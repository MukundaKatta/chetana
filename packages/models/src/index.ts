import type { ModelProvider } from "@chetana/shared";
import type { ModelAdapter, ModelAdapterConfig } from "./interface";
import { AnthropicAdapter } from "./anthropic";
import { OpenAIAdapter } from "./openai";
import { GoogleAdapter } from "./google";
import { OllamaAdapter } from "./ollama";

export type { ModelAdapter, ModelAdapterConfig } from "./interface";
export { AnthropicAdapter } from "./anthropic";
export { OpenAIAdapter } from "./openai";
export { GoogleAdapter } from "./google";
export { OllamaAdapter } from "./ollama";

export function createModelAdapter(
  provider: ModelProvider,
  config: ModelAdapterConfig
): ModelAdapter {
  switch (provider) {
    case "anthropic":
      return new AnthropicAdapter(config);
    case "openai":
      return new OpenAIAdapter(config);
    case "google":
      return new GoogleAdapter(config);
    case "ollama":
      return new OllamaAdapter(config);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
