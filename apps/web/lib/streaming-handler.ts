/**
 * Streaming response handler with SSE parsing, progressive display,
 * cancellation, and fallback to non-streaming (Issue #377).
 */

import type { ModelProvider, ChatMessage, ModelResponse } from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type StreamEventType =
  | "token"
  | "start"
  | "end"
  | "error"
  | "metadata";

export interface StreamEvent {
  type: StreamEventType;
  data: string;
  timestamp: number;
}

export interface StreamCallbacks {
  onToken?: (token: string, accumulated: string) => void;
  onStart?: () => void;
  onEnd?: (full: string, metadata: StreamMetadata) => void;
  onError?: (error: StreamError) => void;
}

export interface StreamMetadata {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  provider: ModelProvider;
  finishReason: string | null;
}

export interface StreamError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface StreamOptions {
  provider: ModelProvider;
  model: string;
  messages: ChatMessage[];
  apiKey: string;
  baseUrl?: string;
  signal?: AbortSignal;
  temperature?: number;
  maxTokens?: number;
}

export interface StreamHandle {
  /** Abort the ongoing stream. */
  cancel: () => void;
  /** Promise that resolves when stream completes (or rejects on error). */
  done: Promise<string>;
}

/* ------------------------------------------------------------------ */
/*  SSE line parser                                                   */
/* ------------------------------------------------------------------ */

interface SSEParserState {
  buffer: string;
  eventType: string;
  data: string;
}

export function createSSEParser(
  onEvent: (event: { type: string; data: string }) => void,
): (chunk: string) => void {
  const state: SSEParserState = {
    buffer: "",
    eventType: "",
    data: "",
  };

  return (chunk: string) => {
    state.buffer += chunk;
    const lines = state.buffer.split("\n");
    // Keep last potentially incomplete line
    state.buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("event:")) {
        state.eventType = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        state.data += (state.data ? "\n" : "") + line.slice(5).trim();
      } else if (line.trim() === "") {
        // Empty line = dispatch event
        if (state.data) {
          onEvent({
            type: state.eventType || "message",
            data: state.data,
          });
        }
        state.eventType = "";
        state.data = "";
      }
    }
  };
}

/* ------------------------------------------------------------------ */
/*  Provider-specific token extraction                                */
/* ------------------------------------------------------------------ */

interface ProviderTokenResult {
  token: string | null;
  done: boolean;
  inputTokens?: number;
  outputTokens?: number;
  finishReason?: string | null;
}

function parseAnthropicEvent(
  eventType: string,
  data: string,
): ProviderTokenResult {
  if (data === "[DONE]") return { token: null, done: true };

  try {
    const parsed = JSON.parse(data);

    if (eventType === "content_block_delta" && parsed.delta?.text) {
      return { token: parsed.delta.text, done: false };
    }

    if (eventType === "message_delta") {
      return {
        token: null,
        done: parsed.delta?.stop_reason != null,
        outputTokens: parsed.usage?.output_tokens,
        finishReason: parsed.delta?.stop_reason ?? null,
      };
    }

    if (eventType === "message_start") {
      return {
        token: null,
        done: false,
        inputTokens: parsed.message?.usage?.input_tokens,
      };
    }

    return { token: null, done: false };
  } catch {
    return { token: null, done: false };
  }
}

function parseOpenAIEvent(
  _eventType: string,
  data: string,
): ProviderTokenResult {
  if (data === "[DONE]") return { token: null, done: true };

  try {
    const parsed = JSON.parse(data);
    const choice = parsed.choices?.[0];

    if (choice?.delta?.content) {
      return { token: choice.delta.content, done: false };
    }

    if (choice?.finish_reason) {
      return {
        token: null,
        done: true,
        finishReason: choice.finish_reason,
        outputTokens: parsed.usage?.completion_tokens,
        inputTokens: parsed.usage?.prompt_tokens,
      };
    }

    return { token: null, done: false };
  } catch {
    return { token: null, done: false };
  }
}

function parseGoogleEvent(
  _eventType: string,
  data: string,
): ProviderTokenResult {
  if (data === "[DONE]") return { token: null, done: true };

  try {
    const parsed = JSON.parse(data);
    const candidate = parsed.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

    if (text) {
      return { token: text, done: false };
    }

    if (candidate?.finishReason) {
      return {
        token: null,
        done: true,
        finishReason: candidate.finishReason,
        inputTokens: parsed.usageMetadata?.promptTokenCount,
        outputTokens: parsed.usageMetadata?.candidatesTokenCount,
      };
    }

    return { token: null, done: false };
  } catch {
    return { token: null, done: false };
  }
}

function parseGenericEvent(
  _eventType: string,
  data: string,
): ProviderTokenResult {
  if (data === "[DONE]") return { token: null, done: true };

  try {
    const parsed = JSON.parse(data);

    // Try OpenAI-compatible format (used by most providers)
    const choice = parsed.choices?.[0];
    if (choice?.delta?.content) {
      return { token: choice.delta.content, done: false };
    }
    if (choice?.finish_reason) {
      return { token: null, done: true, finishReason: choice.finish_reason };
    }

    // Try extracting text from common fields
    if (parsed.token?.text) {
      return { token: parsed.token.text, done: false };
    }
    if (parsed.text) {
      return { token: parsed.text, done: false };
    }

    return { token: null, done: false };
  } catch {
    return { token: null, done: false };
  }
}

function getEventParser(
  provider: ModelProvider,
): (eventType: string, data: string) => ProviderTokenResult {
  switch (provider) {
    case "anthropic":
      return parseAnthropicEvent;
    case "openai":
      return parseOpenAIEvent;
    case "google":
      return parseGoogleEvent;
    default:
      return parseGenericEvent;
  }
}

/* ------------------------------------------------------------------ */
/*  Progressive display buffer                                        */
/* ------------------------------------------------------------------ */

export class TokenBuffer {
  private accumulated = "";
  private tokenCount = 0;
  private readonly onToken: (token: string, accumulated: string) => void;

  constructor(onToken: (token: string, accumulated: string) => void) {
    this.onToken = onToken;
  }

  push(token: string): void {
    this.accumulated += token;
    this.tokenCount++;
    this.onToken(token, this.accumulated);
  }

  getAccumulated(): string {
    return this.accumulated;
  }

  getTokenCount(): number {
    return this.tokenCount;
  }

  reset(): void {
    this.accumulated = "";
    this.tokenCount = 0;
  }
}

/* ------------------------------------------------------------------ */
/*  Stream handler                                                    */
/* ------------------------------------------------------------------ */

export function createStreamHandler(
  response: Response,
  provider: ModelProvider,
  callbacks: StreamCallbacks,
): StreamHandle {
  const abortController = new AbortController();
  const parseEvent = getEventParser(provider);
  const startTime = Date.now();

  const buffer = new TokenBuffer((token, accumulated) => {
    callbacks.onToken?.(token, accumulated);
  });

  let inputTokens = 0;
  let outputTokens = 0;
  let finishReason: string | null = null;

  const done = new Promise<string>((resolve, reject) => {
    callbacks.onStart?.();

    const reader = response.body?.getReader();
    if (!reader) {
      const err: StreamError = {
        code: "NO_BODY",
        message: "Response has no readable body",
        retryable: true,
      };
      callbacks.onError?.(err);
      reject(new Error(err.message));
      return;
    }

    const decoder = new TextDecoder();
    const sseParser = createSSEParser((event) => {
      const result = parseEvent(event.type, event.data);

      if (result.inputTokens) inputTokens = result.inputTokens;
      if (result.outputTokens) outputTokens = result.outputTokens;
      if (result.finishReason) finishReason = result.finishReason;

      if (result.token) {
        buffer.push(result.token);
      }
    });

    const abortHandler = () => {
      reader.cancel();
    };
    abortController.signal.addEventListener("abort", abortHandler);

    (async () => {
      try {
        while (true) {
          const { done: readerDone, value } = await reader.read();
          if (readerDone) break;
          if (abortController.signal.aborted) break;

          const chunk = decoder.decode(value, { stream: true });
          sseParser(chunk);
        }

        const full = buffer.getAccumulated();
        const metadata: StreamMetadata = {
          totalTokens: inputTokens + (outputTokens || buffer.getTokenCount()),
          inputTokens,
          outputTokens: outputTokens || buffer.getTokenCount(),
          latencyMs: Date.now() - startTime,
          provider,
          finishReason,
        };

        callbacks.onEnd?.(full, metadata);
        resolve(full);
      } catch (error) {
        if (abortController.signal.aborted) {
          resolve(buffer.getAccumulated());
          return;
        }

        const streamErr: StreamError = {
          code: "STREAM_ERROR",
          message:
            error instanceof Error ? error.message : "Unknown stream error",
          retryable: true,
        };
        callbacks.onError?.(streamErr);
        reject(new Error(streamErr.message));
      } finally {
        abortController.signal.removeEventListener("abort", abortHandler);
      }
    })();
  });

  return {
    cancel: () => abortController.abort(),
    done,
  };
}

/* ------------------------------------------------------------------ */
/*  Fallback: non-streaming fetch                                     */
/* ------------------------------------------------------------------ */

export async function fetchNonStreaming(
  options: StreamOptions,
  callbacks: StreamCallbacks,
): Promise<ModelResponse> {
  const startTime = Date.now();
  callbacks.onStart?.();

  try {
    const response = await buildProviderRequest(options, false);
    const json = await response.json();

    const content = extractNonStreamingContent(json, options.provider);
    const tokens = extractNonStreamingTokens(json, options.provider);

    // Simulate token-by-token delivery for progressive display
    const words = content.split(/(\s+)/);
    let accumulated = "";
    for (const word of words) {
      accumulated += word;
      callbacks.onToken?.(word, accumulated);
    }

    const result: ModelResponse = {
      content,
      tokensUsed: tokens,
      latencyMs: Date.now() - startTime,
    };

    callbacks.onEnd?.(content, {
      totalTokens: tokens.input + tokens.output,
      inputTokens: tokens.input,
      outputTokens: tokens.output,
      latencyMs: result.latencyMs,
      provider: options.provider,
      finishReason: "stop",
    });

    return result;
  } catch (error) {
    const streamErr: StreamError = {
      code: "FETCH_ERROR",
      message:
        error instanceof Error ? error.message : "Non-streaming fetch failed",
      retryable: true,
    };
    callbacks.onError?.(streamErr);
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/*  Request builder per provider                                      */
/* ------------------------------------------------------------------ */

function getProviderEndpoint(options: StreamOptions, stream: boolean): string {
  if (options.baseUrl) return options.baseUrl;

  switch (options.provider) {
    case "anthropic":
      return "https://api.anthropic.com/v1/messages";
    case "openai":
      return "https://api.openai.com/v1/chat/completions";
    case "google":
      return `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:${stream ? "streamGenerateContent" : "generateContent"}`;
    default:
      return "https://api.openai.com/v1/chat/completions";
  }
}

function buildProviderHeaders(options: StreamOptions): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  switch (options.provider) {
    case "anthropic":
      headers["x-api-key"] = options.apiKey;
      headers["anthropic-version"] = "2023-06-01";
      break;
    case "google":
      headers["x-goog-api-key"] = options.apiKey;
      break;
    default:
      headers["Authorization"] = `Bearer ${options.apiKey}`;
  }

  return headers;
}

function buildProviderBody(
  options: StreamOptions,
  stream: boolean,
): Record<string, unknown> {
  switch (options.provider) {
    case "anthropic": {
      const systemMsg = options.messages.find((m) => m.role === "system");
      const nonSystem = options.messages.filter((m) => m.role !== "system");
      return {
        model: options.model,
        max_tokens: options.maxTokens ?? 4096,
        stream,
        ...(systemMsg ? { system: systemMsg.content } : {}),
        messages: nonSystem.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        ...(options.temperature != null
          ? { temperature: options.temperature }
          : {}),
      };
    }
    case "google":
      return {
        contents: options.messages
          .filter((m) => m.role !== "system")
          .map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
        ...(options.messages.find((m) => m.role === "system")
          ? {
              systemInstruction: {
                parts: [
                  {
                    text: options.messages.find((m) => m.role === "system")!
                      .content,
                  },
                ],
              },
            }
          : {}),
        generationConfig: {
          ...(options.temperature != null
            ? { temperature: options.temperature }
            : {}),
          ...(options.maxTokens ? { maxOutputTokens: options.maxTokens } : {}),
        },
      };
    default:
      return {
        model: options.model,
        stream,
        messages: options.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        ...(options.temperature != null
          ? { temperature: options.temperature }
          : {}),
        ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
      };
  }
}

async function buildProviderRequest(
  options: StreamOptions,
  stream: boolean,
): Promise<Response> {
  const url = getProviderEndpoint(options, stream);
  const headers = buildProviderHeaders(options);
  const body = buildProviderBody(options, stream);

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(
      `Provider ${options.provider} returned ${response.status}: ${await response.text()}`,
    );
  }

  return response;
}

/* ------------------------------------------------------------------ */
/*  Content extractors for non-streaming                              */
/* ------------------------------------------------------------------ */

function extractNonStreamingContent(
  json: Record<string, unknown>,
  provider: ModelProvider,
): string {
  switch (provider) {
    case "anthropic": {
      const content = json.content as Array<{ type: string; text?: string }>;
      return (
        content
          ?.filter((c) => c.type === "text")
          .map((c) => c.text)
          .join("") ?? ""
      );
    }
    case "google": {
      const candidates = json.candidates as Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      return candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    }
    default: {
      const choices = json.choices as Array<{
        message?: { content?: string };
      }>;
      return choices?.[0]?.message?.content ?? "";
    }
  }
}

function extractNonStreamingTokens(
  json: Record<string, unknown>,
  provider: ModelProvider,
): { input: number; output: number } {
  switch (provider) {
    case "anthropic": {
      const usage = json.usage as {
        input_tokens?: number;
        output_tokens?: number;
      };
      return {
        input: usage?.input_tokens ?? 0,
        output: usage?.output_tokens ?? 0,
      };
    }
    case "google": {
      const meta = json.usageMetadata as {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
      };
      return {
        input: meta?.promptTokenCount ?? 0,
        output: meta?.candidatesTokenCount ?? 0,
      };
    }
    default: {
      const usage = json.usage as {
        prompt_tokens?: number;
        completion_tokens?: number;
      };
      return {
        input: usage?.prompt_tokens ?? 0,
        output: usage?.completion_tokens ?? 0,
      };
    }
  }
}

/* ------------------------------------------------------------------ */
/*  High-level: stream with fallback                                  */
/* ------------------------------------------------------------------ */

export async function streamWithFallback(
  options: StreamOptions,
  callbacks: StreamCallbacks,
): Promise<StreamHandle> {
  try {
    const response = await buildProviderRequest(options, true);
    return createStreamHandler(response, options.provider, callbacks);
  } catch (error) {
    // Fallback to non-streaming
    const resultPromise = fetchNonStreaming(options, callbacks).then(
      (r) => r.content,
    );
    return {
      cancel: () => {},
      done: resultPromise,
    };
  }
}
