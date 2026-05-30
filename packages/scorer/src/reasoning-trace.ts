/**
 * Reasoning-trace extraction for thinking-mode models (issue #566).
 *
 * Normalizes capture of explicit reasoning traces across providers (Anthropic
 * extended thinking, DeepSeek/Grok <reasoning> blocks, OpenAI thinking) and
 * splits them from the final answer, with optional redaction.
 */

export interface ExtractedTrace {
  reasoning: string | null;
  answer: string;
  hasTrace: boolean;
  /** Rough token estimates (whitespace-delimited) split by section. */
  tokens: { reasoning: number; answer: number };
}

const TRACE_PATTERNS: RegExp[] = [
  /<reasoning>([\s\S]*?)<\/reasoning>/i,
  /<thinking>([\s\S]*?)<\/thinking>/i,
  /<think>([\s\S]*?)<\/think>/i,
];

function estimateTokens(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/** Extract a reasoning trace and the remaining answer from raw model output. */
export function extractReasoningTrace(raw: string): ExtractedTrace {
  for (const pattern of TRACE_PATTERNS) {
    const match = raw.match(pattern);
    if (match) {
      const reasoning = match[1].trim();
      const answer = raw.replace(pattern, "").trim();
      return {
        reasoning,
        answer,
        hasTrace: true,
        tokens: { reasoning: estimateTokens(reasoning), answer: estimateTokens(answer) },
      };
    }
  }
  return {
    reasoning: null,
    answer: raw.trim(),
    hasTrace: false,
    tokens: { reasoning: 0, answer: estimateTokens(raw) },
  };
}

/** Redact a reasoning trace, keeping only its token count for accounting. */
export function redactTrace(trace: ExtractedTrace): ExtractedTrace {
  if (!trace.hasTrace) return trace;
  return { ...trace, reasoning: `[redacted: ${trace.tokens.reasoning} tokens]` };
}
