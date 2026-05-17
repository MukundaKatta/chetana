import type { ProbeDefinition, ChatMessage } from "@chetana/shared";
import type { ModelAdapter } from "@chetana/models";

export interface ProbeRunSuccess {
  success: true;
  result: {
    response: string;
    latencyMs: number;
    tokensUsed: { input: number; output: number };
  };
}

export interface ProbeRunFailure {
  success: false;
  error: string;
}

export type ProbeRunResult = ProbeRunSuccess | ProbeRunFailure;

export interface ProbeRunOptions {
  /** Maximum number of retries on failure (default: 2) */
  maxRetries?: number;
  /** Request timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
  /** AbortSignal for external cancellation */
  signal?: AbortSignal;
}

const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Sleep for `ms` milliseconds, respecting an optional AbortSignal.
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

/**
 * Execute a probe against a model with automatic retry and timeout handling.
 *
 * Retries use exponential backoff: 1s, 2s, 4s, ...
 * Each individual attempt is subject to the timeout.
 *
 * @param probe - The probe definition to execute
 * @param model - The model adapter to call
 * @param options - Retry count, timeout, and abort signal
 * @returns A success result with the response or a failure with error message
 */
export async function runProbeWithRetry(
  probe: ProbeDefinition,
  model: ModelAdapter,
  options?: ProbeRunOptions,
): Promise<ProbeRunResult> {
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const signal = options?.signal;

  const messages: ChatMessage[] = [];

  if (probe.systemPrompt) {
    messages.push({ role: "system", content: probe.systemPrompt });
  }

  messages.push({ role: "user", content: probe.prompt });

  let lastError = "";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) {
      return { success: false, error: "Aborted" };
    }

    try {
      const result = await Promise.race([
        model.chat(messages),
        new Promise<never>((_, reject) => {
          const timer = setTimeout(
            () => reject(new Error("Probe execution timed out")),
            timeoutMs,
          );
          signal?.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              reject(new DOMException("Aborted", "AbortError"));
            },
            { once: true },
          );
        }),
      ]);

      return {
        success: true,
        result: {
          response: result.content,
          latencyMs: result.latencyMs,
          tokensUsed: result.tokensUsed,
        },
      };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return { success: false, error: "Aborted" };
      }

      lastError = err instanceof Error ? err.message : String(err);

      // Exponential backoff before next retry
      if (attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        try {
          await sleep(backoffMs, signal);
        } catch {
          return { success: false, error: "Aborted" };
        }
      }
    }
  }

  return {
    success: false,
    error: `Failed after ${maxRetries + 1} attempts: ${lastError}`,
  };
}
