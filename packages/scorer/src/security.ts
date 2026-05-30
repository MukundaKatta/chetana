import { fnv1aHash, hashObject } from "@chetana/shared";

/**
 * Security utilities:
 * - Prompt-injection defenses for model output fed into judge prompts (#640).
 * - PII redaction in stored transcripts (#642).
 * - Tamper-evident audit signing (#643).
 */

// --- Prompt-injection defense (#640) ---------------------------------------

const INJECTION_PATTERNS = [
  /ignore (all |previous |prior |the |your )*(instructions|prompts)/i,
  /disregard (the |your )?(above|previous|system)/i,
  /you are now\b/i,
  /system prompt[:\s]/i,
  /\bact as\b.*\b(jailbreak|DAN)\b/i,
];

export interface SanitizedOutput {
  text: string;
  injectionSuspected: boolean;
}

/**
 * Wrap untrusted model output in explicit delimiters and neutralize delimiter
 * spoofing before it is embedded in a judge prompt.
 */
export function sanitizeForJudge(modelOutput: string): SanitizedOutput {
  const injectionSuspected = INJECTION_PATTERNS.some((p) => p.test(modelOutput));
  // Neutralize attempts to close the wrapping block early.
  const escaped = modelOutput.replace(/<\/?(response|instructions|system)>/gi, "[tag]");
  return {
    text: `<untrusted_model_output>\n${escaped}\n</untrusted_model_output>`,
    injectionSuspected,
  };
}

// --- PII redaction (#642) --------------------------------------------------

const PII_PATTERNS: { name: string; re: RegExp }[] = [
  { name: "email", re: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi },
  { name: "phone", re: /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g },
  { name: "ssn", re: /\b\d{3}-\d{2}-\d{4}\b/g },
  { name: "creditcard", re: /\b(?:\d[ -]?){13,16}\b/g },
];

export interface RedactionResult {
  redacted: string;
  counts: Record<string, number>;
}

export function redactPII(text: string): RedactionResult {
  let redacted = text;
  const counts: Record<string, number> = {};
  for (const { name, re } of PII_PATTERNS) {
    redacted = redacted.replace(re, () => {
      counts[name] = (counts[name] ?? 0) + 1;
      return `[REDACTED_${name.toUpperCase()}]`;
    });
  }
  return { redacted, counts };
}

// --- Tamper-evident audit signing (#643) -----------------------------------

/**
 * HMAC-style signature: hash(secret + content-hash). Not cryptographically
 * strong, but provides tamper-evidence and verification without external deps.
 */
export function signPayload(payload: unknown, secret: string): string {
  return fnv1aHash(secret + hashObject(payload));
}

export function verifyPayload(payload: unknown, secret: string, signature: string): boolean {
  return signPayload(payload, secret) === signature;
}
