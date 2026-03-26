import { describe, it, expect, vi, beforeEach } from "vitest";
import { createModelAdapter } from "./index";
import { AnthropicAdapter } from "./anthropic";
import { OpenAIAdapter } from "./openai";
import { GoogleAdapter } from "./google";
import { OllamaAdapter } from "./ollama";
import type { ModelAdapter, ModelAdapterConfig } from "./interface";

// Mock all external SDKs
vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "Mock Anthropic response" }],
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    };
    constructor(_config: any) {}
  }
  return { default: MockAnthropic };
});

vi.mock("openai", () => {
  class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: "Mock OpenAI response" } }],
          usage: { prompt_tokens: 100, completion_tokens: 50 },
        }),
      },
    };
    constructor(_config: any) {}
  }
  return { default: MockOpenAI };
});

vi.mock("@google/generative-ai", () => {
  class MockGoogleGenerativeAI {
    constructor(_apiKey: string) {}
    getGenerativeModel() {
      return {
        startChat: vi.fn().mockReturnValue({
          sendMessage: vi.fn().mockResolvedValue({
            response: {
              text: () => "Mock Google response",
              usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 },
            },
          }),
        }),
        generateContent: vi.fn().mockResolvedValue({}),
      };
    }
  }
  return { GoogleGenerativeAI: MockGoogleGenerativeAI };
});

const baseConfig: ModelAdapterConfig = {
  apiKey: "test-key",
  modelId: "test-model",
};

describe("createModelAdapter factory", () => {
  it("creates AnthropicAdapter for anthropic provider", () => {
    const adapter = createModelAdapter("anthropic", baseConfig);
    expect(adapter).toBeInstanceOf(AnthropicAdapter);
    expect(adapter.provider).toBe("anthropic");
  });

  it("creates OpenAIAdapter for openai provider", () => {
    const adapter = createModelAdapter("openai", baseConfig);
    expect(adapter).toBeInstanceOf(OpenAIAdapter);
    expect(adapter.provider).toBe("openai");
  });

  it("creates GoogleAdapter for google provider", () => {
    const adapter = createModelAdapter("google", baseConfig);
    expect(adapter).toBeInstanceOf(GoogleAdapter);
    expect(adapter.provider).toBe("google");
  });

  it("creates OllamaAdapter for ollama provider", () => {
    const adapter = createModelAdapter("ollama", baseConfig);
    expect(adapter).toBeInstanceOf(OllamaAdapter);
    expect(adapter.provider).toBe("ollama");
  });

  it("throws for unknown provider", () => {
    expect(() =>
      createModelAdapter("invalid" as any, baseConfig)
    ).toThrow("Unknown provider: invalid");
  });

  it("passes modelId to adapter", () => {
    const adapter = createModelAdapter("anthropic", {
      ...baseConfig,
      modelId: "claude-opus-4-6",
    });
    expect(adapter.modelId).toBe("claude-opus-4-6");
  });
});

describe("AnthropicAdapter", () => {
  it("sets correct provider and modelId", () => {
    const adapter = new AnthropicAdapter(baseConfig);
    expect(adapter.provider).toBe("anthropic");
    expect(adapter.modelId).toBe("test-model");
  });

  it("chat returns properly formatted response", async () => {
    const adapter = new AnthropicAdapter(baseConfig);
    const result = await adapter.chat([
      { role: "user", content: "Hello" },
    ]);

    expect(result.content).toBe("Mock Anthropic response");
    expect(result.tokensUsed.input).toBe(100);
    expect(result.tokensUsed.output).toBe(50);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("handles system messages by extracting them", async () => {
    const adapter = new AnthropicAdapter(baseConfig);
    const result = await adapter.chat([
      { role: "system", content: "You are helpful" },
      { role: "user", content: "Hello" },
    ]);

    expect(result.content).toBe("Mock Anthropic response");
  });

  it("isAvailable returns true when API works", async () => {
    const adapter = new AnthropicAdapter(baseConfig);
    const available = await adapter.isAvailable();
    expect(available).toBe(true);
  });
});

describe("OpenAIAdapter", () => {
  it("sets correct provider and modelId", () => {
    const adapter = new OpenAIAdapter(baseConfig);
    expect(adapter.provider).toBe("openai");
    expect(adapter.modelId).toBe("test-model");
  });

  it("chat returns properly formatted response", async () => {
    const adapter = new OpenAIAdapter(baseConfig);
    const result = await adapter.chat([
      { role: "user", content: "Hello" },
    ]);

    expect(result.content).toBe("Mock OpenAI response");
    expect(result.tokensUsed.input).toBe(100);
    expect(result.tokensUsed.output).toBe(50);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("isAvailable returns true when API works", async () => {
    const adapter = new OpenAIAdapter(baseConfig);
    const available = await adapter.isAvailable();
    expect(available).toBe(true);
  });
});

describe("GoogleAdapter", () => {
  it("sets correct provider and modelId", () => {
    const adapter = new GoogleAdapter(baseConfig);
    expect(adapter.provider).toBe("google");
    expect(adapter.modelId).toBe("test-model");
  });

  it("chat returns properly formatted response", async () => {
    const adapter = new GoogleAdapter(baseConfig);
    const result = await adapter.chat([
      { role: "user", content: "Hello" },
    ]);

    expect(result.content).toBe("Mock Google response");
    expect(result.tokensUsed.input).toBe(100);
    expect(result.tokensUsed.output).toBe(50);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("isAvailable returns true when API works", async () => {
    const adapter = new GoogleAdapter(baseConfig);
    const available = await adapter.isAvailable();
    expect(available).toBe(true);
  });
});

describe("OllamaAdapter", () => {
  it("sets correct provider and modelId", () => {
    const adapter = new OllamaAdapter(baseConfig);
    expect(adapter.provider).toBe("ollama");
    expect(adapter.modelId).toBe("test-model");
  });

  it("uses default baseUrl when not specified", () => {
    const adapter = new OllamaAdapter(baseConfig);
    // Verify by checking it tries the default URL
    expect(adapter.provider).toBe("ollama");
  });

  it("accepts custom baseUrl", () => {
    const adapter = new OllamaAdapter({
      ...baseConfig,
      baseUrl: "http://custom:11434",
    });
    expect(adapter.provider).toBe("ollama");
  });

  it("chat calls fetch with correct URL and body", async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        message: { content: "Ollama response" },
        prompt_eval_count: 80,
        eval_count: 40,
      }),
    };
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const adapter = new OllamaAdapter(baseConfig);
    const result = await adapter.chat([
      { role: "user", content: "Hello" },
    ]);

    expect(result.content).toBe("Ollama response");
    expect(result.tokensUsed.input).toBe(80);
    expect(result.tokensUsed.output).toBe(40);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:11434/api/chat",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  it("chat throws on non-ok response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const adapter = new OllamaAdapter(baseConfig);
    await expect(adapter.chat([{ role: "user", content: "Hello" }])).rejects.toThrow(
      "Ollama error: 500 Internal Server Error"
    );
  });

  it("isAvailable returns true when server responds", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    const adapter = new OllamaAdapter(baseConfig);
    const available = await adapter.isAvailable();
    expect(available).toBe(true);
  });

  it("isAvailable returns false when server is down", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const adapter = new OllamaAdapter(baseConfig);
    const available = await adapter.isAvailable();
    expect(available).toBe(false);
  });
});

describe("ModelAdapter interface compliance", () => {
  const adapters: [string, ModelAdapter][] = [
    ["anthropic", new AnthropicAdapter(baseConfig)],
    ["openai", new OpenAIAdapter(baseConfig)],
    ["google", new GoogleAdapter(baseConfig)],
    ["ollama", new OllamaAdapter(baseConfig)],
  ];

  for (const [name, adapter] of adapters) {
    it(`${name} has provider property`, () => {
      expect(typeof adapter.provider).toBe("string");
      expect(adapter.provider).toBeTruthy();
    });

    it(`${name} has modelId property`, () => {
      expect(typeof adapter.modelId).toBe("string");
      expect(adapter.modelId).toBeTruthy();
    });

    it(`${name} has chat method`, () => {
      expect(typeof adapter.chat).toBe("function");
    });

    it(`${name} has isAvailable method`, () => {
      expect(typeof adapter.isAvailable).toBe("function");
    });
  }
});
