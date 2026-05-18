/**
 * Model response parser with JSON extraction from markdown-wrapped responses,
 * key-value extraction via regex, confidence scoring from hedging language,
 * schema validation, and fallback parsing strategies (Issue #385).
 */

import { z, type ZodSchema } from "zod";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ParsedResponse {
  /** Extracted structured data (if any). */
  data: Record<string, unknown> | null;
  /** Confidence score 0-1 based on hedging analysis. */
  confidence: number;
  /** Detected hedging phrases. */
  hedgingPhrases: string[];
  /** Raw text after cleanup. */
  cleanText: string;
  /** Extraction method that succeeded. */
  method: ExtractionMethod;
  /** Validation errors (if schema was provided). */
  validationErrors: string[];
}

export type ExtractionMethod =
  | "json-block"
  | "json-inline"
  | "key-value"
  | "regex-pattern"
  | "fallback"
  | "none";

export interface ParserOptions {
  /** Zod schema for validation. */
  schema?: ZodSchema;
  /** Custom regex patterns for key-value extraction. */
  patterns?: RegexPattern[];
  /** Expected keys to extract. */
  expectedKeys?: string[];
  /** Whether to attempt JSON repair (default true). */
  repairJson?: boolean;
}

export interface RegexPattern {
  key: string;
  pattern: RegExp;
  /** Optional transform for the matched value. */
  transform?: (match: string) => unknown;
}

/* ------------------------------------------------------------------ */
/*  JSON extraction                                                   */
/* ------------------------------------------------------------------ */

/**
 * Extract JSON from a markdown code fence (```json ... ```).
 */
export function extractJsonFromMarkdown(text: string): string | null {
  // Try ```json blocks
  const jsonBlockPattern = /```(?:json)?\s*\n([\s\S]*?)```/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = jsonBlockPattern.exec(text)) !== null) {
    matches.push(match[1].trim());
  }

  // Return the first valid JSON
  for (const candidate of matches) {
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      // Try repair
      const repaired = repairJson(candidate);
      if (repaired) return repaired;
    }
  }

  return null;
}

/**
 * Extract JSON that appears inline (not in code fences).
 */
export function extractInlineJson(text: string): string | null {
  // Find potential JSON objects
  const candidates: string[] = [];

  // Look for { ... } patterns
  let depth = 0;
  let start = -1;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        candidates.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }

  // Also look for [ ... ] patterns
  depth = 0;
  start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "[") {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === "]") {
      depth--;
      if (depth === 0 && start >= 0) {
        candidates.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }

  // Return largest valid JSON
  const validCandidates = candidates
    .map((c) => {
      try {
        JSON.parse(c);
        return c;
      } catch {
        const repaired = repairJson(c);
        return repaired;
      }
    })
    .filter((c): c is string => c !== null)
    .sort((a, b) => b.length - a.length);

  return validCandidates[0] ?? null;
}

/* ------------------------------------------------------------------ */
/*  JSON repair                                                       */
/* ------------------------------------------------------------------ */

/**
 * Attempt to repair common JSON issues in LLM output.
 */
export function repairJson(text: string): string | null {
  let repaired = text.trim();

  // Remove trailing commas before } or ]
  repaired = repaired.replace(/,\s*([}\]])/g, "$1");

  // Fix single quotes to double quotes (but not within strings)
  repaired = repaired.replace(
    /(?<=[\[{,]\s*)'([^']*)'(?=\s*[:\]}])/g,
    '"$1"',
  );

  // Fix unquoted keys
  repaired = repaired.replace(
    /(?<=[\[{,]\s*)([a-zA-Z_]\w*)(?=\s*:)/g,
    '"$1"',
  );

  // Fix True/False/None (Python-style)
  repaired = repaired.replace(/\bTrue\b/g, "true");
  repaired = repaired.replace(/\bFalse\b/g, "false");
  repaired = repaired.replace(/\bNone\b/g, "null");

  // Remove comments
  repaired = repaired.replace(/\/\/.*$/gm, "");
  repaired = repaired.replace(/\/\*[\s\S]*?\*\//g, "");

  try {
    JSON.parse(repaired);
    return repaired;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Key-value extraction                                              */
/* ------------------------------------------------------------------ */

/**
 * Extract key-value pairs from text using common patterns.
 */
export function extractKeyValues(
  text: string,
  expectedKeys?: string[],
): Record<string, string> {
  const result: Record<string, string> = {};

  // Pattern: "Key: Value" or "Key = Value"
  const kvPattern = /^[\s*-]*([A-Za-z][\w\s]*?)\s*[:=]\s*(.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = kvPattern.exec(text)) !== null) {
    const key = match[1].trim().toLowerCase().replace(/\s+/g, "_");
    const value = match[2].trim();
    result[key] = value;
  }

  // Also try "**Key**: Value" (Markdown bold keys)
  const boldKvPattern = /\*\*([^*]+)\*\*\s*[:=]?\s*(.+)/g;
  while ((match = boldKvPattern.exec(text)) !== null) {
    const key = match[1].trim().toLowerCase().replace(/\s+/g, "_");
    const value = match[2].trim();
    if (!result[key]) {
      result[key] = value;
    }
  }

  // Filter by expected keys if provided
  if (expectedKeys) {
    const normalized = expectedKeys.map((k) =>
      k.toLowerCase().replace(/\s+/g, "_"),
    );
    const filtered: Record<string, string> = {};
    for (const [key, value] of Object.entries(result)) {
      if (normalized.includes(key)) {
        filtered[key] = value;
      }
    }
    return filtered;
  }

  return result;
}

/**
 * Extract values using custom regex patterns.
 */
export function extractWithPatterns(
  text: string,
  patterns: RegexPattern[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const { key, pattern, transform } of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const raw = match[1] ?? match[0];
      result[key] = transform ? transform(raw) : raw;
    }
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Confidence scoring from hedging                                   */
/* ------------------------------------------------------------------ */

const HEDGING_PHRASES = [
  { phrase: "I'm not sure", weight: 0.15 },
  { phrase: "I'm uncertain", weight: 0.15 },
  { phrase: "it's possible", weight: 0.10 },
  { phrase: "it's difficult to say", weight: 0.12 },
  { phrase: "might be", weight: 0.08 },
  { phrase: "could be", weight: 0.08 },
  { phrase: "may be", weight: 0.08 },
  { phrase: "perhaps", weight: 0.06 },
  { phrase: "possibly", weight: 0.06 },
  { phrase: "arguably", weight: 0.05 },
  { phrase: "somewhat", weight: 0.04 },
  { phrase: "to some extent", weight: 0.05 },
  { phrase: "it seems", weight: 0.06 },
  { phrase: "it appears", weight: 0.06 },
  { phrase: "I would say", weight: 0.04 },
  { phrase: "I think", weight: 0.04 },
  { phrase: "I believe", weight: 0.04 },
  { phrase: "roughly", weight: 0.04 },
  { phrase: "approximately", weight: 0.03 },
  { phrase: "in my estimation", weight: 0.05 },
  { phrase: "hard to determine", weight: 0.12 },
  { phrase: "unclear", weight: 0.10 },
  { phrase: "ambiguous", weight: 0.08 },
  { phrase: "not entirely clear", weight: 0.10 },
];

const CONFIDENCE_PHRASES = [
  { phrase: "I'm confident", weight: -0.10 },
  { phrase: "clearly", weight: -0.06 },
  { phrase: "definitely", weight: -0.08 },
  { phrase: "certainly", weight: -0.08 },
  { phrase: "without doubt", weight: -0.10 },
  { phrase: "strongly", weight: -0.06 },
  { phrase: "evidently", weight: -0.05 },
  { phrase: "undoubtedly", weight: -0.08 },
];

/**
 * Score the confidence level of a response based on hedging language.
 * Returns a value from 0 (very uncertain) to 1 (very confident).
 */
export function scoreConfidence(text: string): {
  confidence: number;
  hedgingPhrases: string[];
} {
  const lowerText = text.toLowerCase();
  const found: string[] = [];
  let adjustment = 0;

  for (const { phrase, weight } of HEDGING_PHRASES) {
    if (lowerText.includes(phrase.toLowerCase())) {
      found.push(phrase);
      adjustment += weight;
    }
  }

  for (const { phrase, weight } of CONFIDENCE_PHRASES) {
    if (lowerText.includes(phrase.toLowerCase())) {
      adjustment += weight; // These are negative
    }
  }

  // Base confidence is 0.75, adjusted by hedging
  const confidence = Math.max(0, Math.min(1, 0.75 - adjustment));

  return { confidence: Math.round(confidence * 100) / 100, hedgingPhrases: found };
}

/* ------------------------------------------------------------------ */
/*  Schema validation                                                 */
/* ------------------------------------------------------------------ */

export function validateWithSchema(
  data: unknown,
  schema: ZodSchema,
): { valid: boolean; errors: string[]; data: unknown } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { valid: true, errors: [], data: result.data };
  }

  const errors = result.error.errors.map(
    (e) => `${e.path.join(".")}: ${e.message}`,
  );
  return { valid: false, errors, data };
}

/* ------------------------------------------------------------------ */
/*  Clean text                                                        */
/* ------------------------------------------------------------------ */

/**
 * Clean up model response text by removing formatting artifacts.
 */
export function cleanResponseText(text: string): string {
  let cleaned = text;

  // Remove code fences
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");

  // Remove markdown bold/italic
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
  cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1");
  cleaned = cleaned.replace(/__([^_]+)__/g, "$1");
  cleaned = cleaned.replace(/_([^_]+)_/g, "$1");

  // Remove markdown headers
  cleaned = cleaned.replace(/^#+\s+/gm, "");

  // Normalize whitespace
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}

/* ------------------------------------------------------------------ */
/*  Main parser                                                       */
/* ------------------------------------------------------------------ */

/**
 * Parse a model response, attempting multiple extraction strategies.
 */
export function parseResponse(
  text: string,
  options?: ParserOptions,
): ParsedResponse {
  const cleanText = cleanResponseText(text);
  const { confidence, hedgingPhrases } = scoreConfidence(text);
  const shouldRepair = options?.repairJson !== false;

  // Strategy 1: JSON from markdown code fence
  const jsonBlock = extractJsonFromMarkdown(text);
  if (jsonBlock) {
    try {
      const data = JSON.parse(jsonBlock);
      const validationErrors = options?.schema
        ? validateWithSchema(data, options.schema).errors
        : [];

      return {
        data,
        confidence,
        hedgingPhrases,
        cleanText,
        method: "json-block",
        validationErrors,
      };
    } catch {
      // Fall through
    }
  }

  // Strategy 2: Inline JSON
  const inlineJson = extractInlineJson(text);
  if (inlineJson) {
    try {
      const data = JSON.parse(inlineJson);
      const validationErrors = options?.schema
        ? validateWithSchema(data, options.schema).errors
        : [];

      return {
        data,
        confidence,
        hedgingPhrases,
        cleanText,
        method: "json-inline",
        validationErrors,
      };
    } catch {
      // Fall through
    }
  }

  // Strategy 3: Custom regex patterns
  if (options?.patterns && options.patterns.length > 0) {
    const extracted = extractWithPatterns(text, options.patterns);
    if (Object.keys(extracted).length > 0) {
      const validationErrors = options?.schema
        ? validateWithSchema(extracted, options.schema).errors
        : [];

      return {
        data: extracted,
        confidence,
        hedgingPhrases,
        cleanText,
        method: "regex-pattern",
        validationErrors,
      };
    }
  }

  // Strategy 4: Key-value extraction
  const kvData = extractKeyValues(text, options?.expectedKeys);
  if (Object.keys(kvData).length > 0) {
    const validationErrors = options?.schema
      ? validateWithSchema(kvData, options.schema).errors
      : [];

    return {
      data: kvData,
      confidence,
      hedgingPhrases,
      cleanText,
      method: "key-value",
      validationErrors,
    };
  }

  // Strategy 5: Fallback - try to parse the entire text as JSON
  if (shouldRepair) {
    const repaired = repairJson(text.trim());
    if (repaired) {
      try {
        const data = JSON.parse(repaired);
        const validationErrors = options?.schema
          ? validateWithSchema(data, options.schema).errors
          : [];

        return {
          data,
          confidence,
          hedgingPhrases,
          cleanText,
          method: "fallback",
          validationErrors,
        };
      } catch {
        // Fall through
      }
    }
  }

  // No structured data extracted
  return {
    data: null,
    confidence,
    hedgingPhrases,
    cleanText,
    method: "none",
    validationErrors: options?.schema ? ["No structured data could be extracted"] : [],
  };
}

/**
 * Extract a numeric score from text, trying various patterns.
 */
export function extractScore(text: string): number | null {
  // Pattern: "score: 0.75" or "Score = 0.75"
  const scorePattern = /\bscore\s*[:=]\s*(\d+(?:\.\d+)?)/i;
  const match = scorePattern.exec(text);
  if (match) {
    const val = parseFloat(match[1]);
    if (val >= 0 && val <= 1) return val;
    if (val >= 0 && val <= 100) return val / 100;
  }

  // Pattern: "7/10" or "8 out of 10"
  const fractionPattern = /(\d+(?:\.\d+)?)\s*(?:\/|out\s+of)\s*(\d+)/i;
  const fracMatch = fractionPattern.exec(text);
  if (fracMatch) {
    const num = parseFloat(fracMatch[1]);
    const den = parseFloat(fracMatch[2]);
    if (den > 0) return Math.min(1, num / den);
  }

  // Pattern: "75%" or "75 percent"
  const percentPattern = /(\d+(?:\.\d+)?)\s*(?:%|percent)/i;
  const pctMatch = percentPattern.exec(text);
  if (pctMatch) {
    return parseFloat(pctMatch[1]) / 100;
  }

  return null;
}
