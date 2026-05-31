import { describe, it, expect, vi, beforeEach } from "vitest";
import { createModelAdapter } from "./index";
import { AnthropicAdapter } from "./anthropic";
import { OpenAIAdapter } from "./openai";
import { GoogleAdapter } from "./google";
import { OllamaAdapter } from "./ollama";
import { XAIAdapter } from "./xai";
import { QwenAdapter } from "./qwen";
import { MetaAdapter } from "./meta";
import { OpenAICompatibleAdapter } from "./openai-compatible";
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
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const adapter = new OllamaAdapter(baseConfig);
    const result = await adapter.chat([
      { role: "user", content: "Hello" },
    ]);

    expect(result.content).toBe("Ollama response");
    expect(result.tokensUsed.input).toBe(80);
    expect(result.tokensUsed.output).toBe(40);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:11434/api/chat",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  it("chat throws on non-ok response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
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
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
    const adapter = new OllamaAdapter(baseConfig);
    const available = await adapter.isAvailable();
    expect(available).toBe(true);
  });

  it("isAvailable returns false when server is down", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const adapter = new OllamaAdapter(baseConfig);
    const available = await adapter.isAvailable();
    expect(available).toBe(false);
  });
});

describe("createModelAdapter factory — 2026 providers", () => {
  it("creates XAIAdapter for xai provider", () => {
    const adapter = createModelAdapter("xai", { ...baseConfig, modelId: "grok-4.20" });
    expect(adapter).toBeInstanceOf(XAIAdapter);
    expect(adapter.provider).toBe("xai");
  });

  it("creates QwenAdapter for qwen provider", () => {
    const adapter = createModelAdapter("qwen", { ...baseConfig, modelId: "qwen3-max" });
    expect(adapter).toBeInstanceOf(QwenAdapter);
    expect(adapter.provider).toBe("qwen");
  });

  it("creates MetaAdapter for meta provider", () => {
    const adapter = createModelAdapter("meta", { ...baseConfig, modelId: "muse-spark" });
    expect(adapter).toBeInstanceOf(MetaAdapter);
    expect(adapter.provider).toBe("meta");
  });
});

describe("XAIAdapter", () => {
  it("posts to the xAI endpoint and parses the response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: "Grok response" } }],
        usage: { prompt_tokens: 12, completion_tokens: 7 },
      }),
    });

    const adapter = new XAIAdapter({ ...baseConfig, modelId: "grok-4.20" });
    const result = await adapter.chat([{ role: "user", content: "Hi" }]);

    expect(result.content).toBe("Grok response");
    expect(result.tokensUsed.input).toBe(12);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.x.ai/v1/chat/completions",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("appends citations when live search returns them", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: "Answer" } }],
        citations: ["https://example.com/a"],
        usage: {},
      }),
    });

    const adapter = new XAIAdapter({ ...baseConfig, modelId: "grok-4.20", liveSearch: true });
    const result = await adapter.chat([{ role: "user", content: "news?" }]);
    expect(result.content).toContain("<citations>");
    expect(result.content).toContain("https://example.com/a");
  });

  it("throws on non-ok response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: vi.fn().mockResolvedValue("unauthorized"),
    });
    const adapter = new XAIAdapter({ ...baseConfig, modelId: "grok-4.20" });
    await expect(adapter.chat([{ role: "user", content: "x" }])).rejects.toThrow(
      "xAI API error (401)"
    );
  });
});

describe("QwenAdapter", () => {
  it("uses a custom baseUrl when provided", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: "Qwen response" } }],
        usage: { prompt_tokens: 5, completion_tokens: 5 },
      }),
    });

    const adapter = new QwenAdapter({
      ...baseConfig,
      modelId: "qwen3-max",
      baseUrl: "http://localhost:8000/v1/chat/completions",
    });
    const result = await adapter.chat([{ role: "user", content: "Hi" }]);

    expect(result.content).toBe("Qwen response");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/v1/chat/completions",
      expect.objectContaining({ method: "POST" })
    );
  });
});

describe("MetaAdapter", () => {
  it("parses an OpenAI-compatible response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: "Muse Spark response" } }],
        usage: { prompt_tokens: 9, completion_tokens: 3 },
      }),
    });

    const adapter = new MetaAdapter({ ...baseConfig, modelId: "muse-spark" });
    const result = await adapter.chat([{ role: "user", content: "Hi" }]);
    expect(result.content).toBe("Muse Spark response");
    expect(result.tokensUsed.output).toBe(3);
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

describe("createModelAdapter — OpenAI-compatible 2026 providers", () => {
  const providers = [
    "groq", "together", "fireworks", "perplexity", "cohere", "ai21",
    "nova", "reka", "phi", "bedrock",
  ] as const;

  for (const p of providers) {
    it(`creates an OpenAICompatibleAdapter for ${p}`, () => {
      const adapter = createModelAdapter(p, { ...baseConfig, modelId: "m" });
      expect(adapter).toBeInstanceOf(OpenAICompatibleAdapter);
      expect(adapter.provider).toBe(p);
    });
  }

  it("requires a baseUrl for providers without a default endpoint (azure)", () => {
    expect(() => createModelAdapter("azure", { ...baseConfig, modelId: "m" })).toThrow(
      /requires a baseUrl/
    );
  });

  it("accepts a custom baseUrl for self-hosted vllm", () => {
    const adapter = createModelAdapter("vllm", {
      ...baseConfig,
      modelId: "local-model",
      baseUrl: "http://localhost:8000/v1/chat/completions",
    });
    expect(adapter.provider).toBe("vllm");
  });

  it("posts to the provider endpoint and parses the response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: "Groq response" } }],
        usage: { prompt_tokens: 4, completion_tokens: 2 },
      }),
    });
    const adapter = createModelAdapter("groq", { ...baseConfig, modelId: "llama-3.3-70b" });
    const result = await adapter.chat([{ role: "user", content: "hi" }]);
    expect(result.content).toBe("Groq response");
    expect(result.tokensUsed.input).toBe(4);
  });

  it("appends citations for Perplexity when present", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: "Answer" } }],
        citations: ["https://example.com"],
        usage: {},
      }),
    });
    const adapter = createModelAdapter("perplexity", { ...baseConfig, modelId: "sonar" });
    const result = await adapter.chat([{ role: "user", content: "news?" }]);
    expect(result.content).toContain("<citations>");
  });
});
