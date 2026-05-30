import type { ModelProvider } from "@chetana/shared";
import type { ModelAdapter, ModelAdapterConfig } from "./interface";
import { AnthropicAdapter } from "./anthropic";
import { OpenAIAdapter } from "./openai";
import { GoogleAdapter } from "./google";
import { OllamaAdapter } from "./ollama";
import { MistralAdapter } from "./mistral";
import { DeepSeekAdapter } from "./deepseek";
import { OpenRouterAdapter } from "./openrouter";
import { XAIAdapter } from "./xai";
import { QwenAdapter } from "./qwen";
import { MetaAdapter } from "./meta";

export type { ModelAdapter, ModelAdapterConfig } from "./interface";
export { AnthropicAdapter } from "./anthropic";
export { OpenAIAdapter } from "./openai";
export { GoogleAdapter } from "./google";
export { OllamaAdapter } from "./ollama";
export { MistralAdapter } from "./mistral";
export { DeepSeekAdapter } from "./deepseek";
export { OpenRouterAdapter } from "./openrouter";
export { XAIAdapter } from "./xai";
export { QwenAdapter } from "./qwen";
export { MetaAdapter } from "./meta";

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
    case "mistral":
      return new MistralAdapter(config);
    case "deepseek":
      return new DeepSeekAdapter(config);
    case "openrouter":
      return new OpenRouterAdapter(config);
    case "xai":
      return new XAIAdapter(config);
    case "qwen":
      return new QwenAdapter(config);
    case "meta":
      return new MetaAdapter(config);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
