import type { ChatMessage } from "@chetana/shared";
import type { ModelAdapter } from "@chetana/models";

export interface StreamOptions {
  signal?: AbortSignal;
}

/**
 * Stream a model response token-by-token, calling onChunk for each piece.
 *
 * Uses the model adapter's chat method internally but simulates streaming
 * by yielding the response in small chunks. When real streaming endpoints
 * are available per-provider, this function can be swapped to use them
 * without changing the caller.
 *
 * @param model - A model adapter instance (anthropic, openai, etc.)
 * @param messages - The chat messages to send
 * @param onChunk - Callback invoked with each text chunk as it arrives
 * @param options - Optional AbortSignal for cancellation
 * @returns The full accumulated response text
 */
export async function streamModelResponse(
  model: ModelAdapter,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  options?: StreamOptions,
): Promise<string> {
  const { signal } = options ?? {};

  // Check for abort before starting
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const response = await model.chat(messages);
  const fullText = response.content;

  // Simulate token-by-token streaming by splitting into small chunks.
  // Average token length in English is ~4 characters; we chunk by words
  // and short pauses to give a natural streaming feel.
  const words = fullText.split(/(\s+)/);
  let accumulated = "";

  for (const word of words) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    accumulated += word;
    onChunk(word);

    // Small delay to simulate token arrival (~15ms per token)
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 15);
      signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
  }

  return accumulated;
}
