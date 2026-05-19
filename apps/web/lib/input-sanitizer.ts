/**
 * Input sanitization (Issue #486).
 * XSS prevention, SQL injection detection, body size limits,
 * content-type validation, Zod schema enforcement.
 */

import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface SanitizationResult {
  safe: boolean;
  sanitized: string;
  threats: ThreatDetection[];
}

export interface ThreatDetection {
  type: "xss" | "sql_injection" | "path_traversal" | "command_injection" | "prototype_pollution";
  severity: "critical" | "high" | "medium" | "low";
  pattern: string;
  location: string;
  original: string;
}

export interface BodySizeConfig {
  /** Max body size in bytes (default 1MB). */
  maxBytes: number;
  /** Max JSON depth (default 10). */
  maxDepth: number;
  /** Max number of keys in a JSON object (default 100). */
  maxKeys: number;
  /** Max string length for any single field (default 10000). */
  maxStringLength: number;
}

export interface ContentTypeRule {
  allowed: string[];
  strict: boolean;
}

export interface SanitizationConfig {
  /** Enable XSS detection and sanitization (default true). */
  xss: boolean;
  /** Enable SQL injection detection (default true). */
  sqlInjection: boolean;
  /** Enable path traversal detection (default true). */
  pathTraversal: boolean;
  /** Enable command injection detection (default true). */
  commandInjection: boolean;
  /** Enable prototype pollution detection (default true). */
  prototypePollution: boolean;
  /** Body size limits. */
  bodySizeLimits: BodySizeConfig;
  /** Custom allowed content types. */
  contentTypes: ContentTypeRule;
}

export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  errors?: string[];
  threats?: ThreatDetection[];
}

/* ------------------------------------------------------------------ */
/*  Default configuration                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_CONFIG: SanitizationConfig = {
  xss: true,
  sqlInjection: true,
  pathTraversal: true,
  commandInjection: true,
  prototypePollution: true,
  bodySizeLimits: {
    maxBytes: 1_048_576, // 1 MB
    maxDepth: 10,
    maxKeys: 100,
    maxStringLength: 10_000,
  },
  contentTypes: {
    allowed: [
      "application/json",
      "application/x-www-form-urlencoded",
      "multipart/form-data",
      "text/plain",
    ],
    strict: true,
  },
};

/* ------------------------------------------------------------------ */
/*  XSS patterns                                                      */
/* ------------------------------------------------------------------ */

const XSS_PATTERNS: RegExp[] = [
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on\w+\s*=\s*["']/i,
  /<\s*iframe/i,
  /<\s*object/i,
  /<\s*embed/i,
  /<\s*link[\s>]/i,
  /data\s*:\s*text\/html/i,
  /vbscript\s*:/i,
  /expression\s*\(/i,
  /url\s*\(\s*["']?\s*javascript/i,
  /<\s*svg[\s>].*?on\w+/i,
  /<\s*img[^>]*\s+on\w+/i,
  /<\s*body[^>]*\s+on\w+/i,
  /&#x?[0-9a-f]+;/i,
  /<\s*meta[^>]*http-equiv/i,
  /<\s*base[\s>]/i,
  /\beval\s*\(/i,
  /\bFunction\s*\(/i,
  /\bsetTimeout\s*\(\s*["']/i,
  /\bsetInterval\s*\(\s*["']/i,
];

/* ------------------------------------------------------------------ */
/*  SQL injection patterns                                            */
/* ------------------------------------------------------------------ */

const SQL_PATTERNS: RegExp[] = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE)\b.*\b(FROM|INTO|TABLE|WHERE|SET|DATABASE|INDEX)\b)/i,
  /'\s*(OR|AND)\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i,
  /'\s*(OR|AND)\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]/i,
  /;\s*(DROP|DELETE|INSERT|UPDATE|ALTER)\s/i,
  /UNION\s+(ALL\s+)?SELECT/i,
  /'\s*;\s*--/i,
  /\/\*.*?\*\//i,
  /\bWAITFOR\s+DELAY\b/i,
  /\bBENCHMARK\s*\(/i,
  /\bSLEEP\s*\(\s*\d/i,
  /\bHAVING\s+\d+\s*=\s*\d+/i,
  /\bORDER\s+BY\s+\d+/i,
  /\b(CHAR|CHR|ASCII|CONCAT)\s*\(/i,
  /'\s*\|\|\s*'/i,
];

/* ------------------------------------------------------------------ */
/*  Path traversal patterns                                           */
/* ------------------------------------------------------------------ */

const PATH_TRAVERSAL_PATTERNS: RegExp[] = [
  /\.\.\//g,
  /\.\.\\/g,
  /%2e%2e%2f/gi,
  /%2e%2e\//gi,
  /\.\.%2f/gi,
  /%2e%2e%5c/gi,
  /\0/g,
  /\/etc\/(passwd|shadow|hosts)/i,
  /\/proc\/self/i,
  /\\windows\\system32/i,
];

/* ------------------------------------------------------------------ */
/*  Command injection patterns                                        */
/* ------------------------------------------------------------------ */

const COMMAND_INJECTION_PATTERNS: RegExp[] = [
  /[;&|`$]\s*(cat|ls|rm|mv|cp|chmod|chown|wget|curl|nc|bash|sh|zsh|python|perl|ruby|node)\b/i,
  /\$\(.*\)/,
  /`[^`]*`/,
  /\|\s*(cat|ls|rm|wget|curl|nc|bash|sh)\b/i,
  />\s*\/?(tmp|etc|var|dev)/i,
  /;\s*(rm|wget|curl)\s/i,
];

/* ------------------------------------------------------------------ */
/*  Prototype pollution patterns                                      */
/* ------------------------------------------------------------------ */

const PROTOTYPE_POLLUTION_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

/* ------------------------------------------------------------------ */
/*  XSS sanitization                                                  */
/* ------------------------------------------------------------------ */

export function sanitizeXSS(input: string): SanitizationResult {
  const threats: ThreatDetection[] = [];
  let sanitized = input;

  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(sanitized)) {
      threats.push({
        type: "xss",
        severity: "critical",
        pattern: pattern.source,
        location: "body",
        original: sanitized.match(pattern)?.[0] ?? "",
      });
    }
  }

  // Encode HTML entities
  sanitized = sanitized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

  return {
    safe: threats.length === 0,
    sanitized,
    threats,
  };
}

/* ------------------------------------------------------------------ */
/*  SQL injection detection                                           */
/* ------------------------------------------------------------------ */

export function detectSQLInjection(input: string): ThreatDetection[] {
  const threats: ThreatDetection[] = [];

  for (const pattern of SQL_PATTERNS) {
    if (pattern.test(input)) {
      threats.push({
        type: "sql_injection",
        severity: "critical",
        pattern: pattern.source,
        location: "body",
        original: input.match(pattern)?.[0] ?? "",
      });
    }
  }

  return threats;
}

/* ------------------------------------------------------------------ */
/*  Path traversal detection                                          */
/* ------------------------------------------------------------------ */

export function detectPathTraversal(input: string): ThreatDetection[] {
  const threats: ThreatDetection[] = [];

  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(input)) {
      threats.push({
        type: "path_traversal",
        severity: "high",
        pattern: pattern.source,
        location: "body",
        original: input.match(pattern)?.[0] ?? "",
      });
    }
  }

  return threats;
}

/* ------------------------------------------------------------------ */
/*  Command injection detection                                       */
/* ------------------------------------------------------------------ */

export function detectCommandInjection(input: string): ThreatDetection[] {
  const threats: ThreatDetection[] = [];

  for (const pattern of COMMAND_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      threats.push({
        type: "command_injection",
        severity: "critical",
        pattern: pattern.source,
        location: "body",
        original: input.match(pattern)?.[0] ?? "",
      });
    }
  }

  return threats;
}

/* ------------------------------------------------------------------ */
/*  Prototype pollution detection                                     */
/* ------------------------------------------------------------------ */

export function detectPrototypePollution(
  obj: unknown,
  path: string = ""
): ThreatDetection[] {
  const threats: ThreatDetection[] = [];

  if (typeof obj !== "object" || obj === null) return threats;

  for (const key of Object.keys(obj as Record<string, unknown>)) {
    const fullPath = path ? `${path}.${key}` : key;

    if (PROTOTYPE_POLLUTION_KEYS.has(key)) {
      threats.push({
        type: "prototype_pollution",
        severity: "critical",
        pattern: key,
        location: fullPath,
        original: key,
      });
    }

    const value = (obj as Record<string, unknown>)[key];
    if (typeof value === "object" && value !== null) {
      threats.push(...detectPrototypePollution(value, fullPath));
    }
  }

  return threats;
}

/* ------------------------------------------------------------------ */
/*  Body size validation                                              */
/* ------------------------------------------------------------------ */

export function validateBodySize(
  body: string | unknown,
  config: BodySizeConfig = DEFAULT_CONFIG.bodySizeLimits
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check byte size
  const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
  const byteSize = new TextEncoder().encode(bodyStr).length;
  if (byteSize > config.maxBytes) {
    errors.push(
      `Body size ${byteSize} bytes exceeds maximum ${config.maxBytes} bytes.`
    );
  }

  // Check depth and keys for objects
  if (typeof body === "object" && body !== null) {
    const depthCheck = checkDepth(body, 0, config.maxDepth);
    if (!depthCheck.valid) errors.push(depthCheck.error!);

    const keyCount = countKeys(body);
    if (keyCount > config.maxKeys) {
      errors.push(
        `Object has ${keyCount} keys, exceeds maximum ${config.maxKeys}.`
      );
    }

    // Check string lengths
    const longStrings = findLongStrings(body, config.maxStringLength);
    for (const ls of longStrings) {
      errors.push(
        `String at "${ls.path}" is ${ls.length} chars, exceeds maximum ${config.maxStringLength}.`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

function checkDepth(
  obj: unknown,
  current: number,
  max: number
): { valid: boolean; error?: string } {
  if (current > max) {
    return { valid: false, error: `Object depth ${current} exceeds maximum ${max}.` };
  }
  if (typeof obj !== "object" || obj === null) return { valid: true };

  const entries = Array.isArray(obj)
    ? obj.entries()
    : Object.entries(obj as Record<string, unknown>);

  for (const [, value] of entries) {
    const result = checkDepth(value, current + 1, max);
    if (!result.valid) return result;
  }
  return { valid: true };
}

function countKeys(obj: unknown): number {
  if (typeof obj !== "object" || obj === null) return 0;
  let count = 0;
  const entries = Array.isArray(obj)
    ? obj
    : Object.values(obj as Record<string, unknown>);
  count += Array.isArray(obj) ? 0 : Object.keys(obj as Record<string, unknown>).length;
  for (const value of entries) {
    count += countKeys(value);
  }
  return count;
}

function findLongStrings(
  obj: unknown,
  maxLen: number,
  path: string = ""
): { path: string; length: number }[] {
  const results: { path: string; length: number }[] = [];

  if (typeof obj === "string") {
    if (obj.length > maxLen) {
      results.push({ path, length: obj.length });
    }
    return results;
  }

  if (typeof obj !== "object" || obj === null) return results;

  const entries = Array.isArray(obj)
    ? obj.map((v, i) => [String(i), v] as const)
    : Object.entries(obj as Record<string, unknown>);

  for (const [key, value] of entries) {
    const fullPath = path ? `${path}.${key}` : key;
    results.push(...findLongStrings(value, maxLen, fullPath));
  }

  return results;
}

/* ------------------------------------------------------------------ */
/*  Content-type validation                                           */
/* ------------------------------------------------------------------ */

export function validateContentType(
  contentType: string | null | undefined,
  config: ContentTypeRule = DEFAULT_CONFIG.contentTypes
): { valid: boolean; error?: string } {
  if (!contentType) {
    return config.strict
      ? { valid: false, error: "Content-Type header is required." }
      : { valid: true };
  }

  const baseType = contentType.split(";")[0].trim().toLowerCase();
  const isAllowed = config.allowed.some(
    (allowed) => baseType === allowed.toLowerCase()
  );

  if (!isAllowed) {
    return {
      valid: false,
      error: `Content-Type "${baseType}" is not allowed. Allowed: ${config.allowed.join(", ")}.`,
    };
  }

  return { valid: true };
}

/* ------------------------------------------------------------------ */
/*  Zod schema enforcement                                            */
/* ------------------------------------------------------------------ */

export function enforceSchema<T>(
  data: unknown,
  schema: z.ZodType<T>,
  options?: { sanitizeBefore?: boolean; config?: Partial<SanitizationConfig> }
): ValidationResult<T> {
  const threats: ThreatDetection[] = [];
  const errors: string[] = [];

  // Optionally sanitize strings before validation
  let processedData = data;
  if (options?.sanitizeBefore !== false) {
    const sanitizeResult = sanitizeDeep(data, options?.config);
    processedData = sanitizeResult.data;
    threats.push(...sanitizeResult.threats);
  }

  // Validate with Zod
  const result = schema.safeParse(processedData);

  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push(`${issue.path.join(".")}: ${issue.message}`);
    }
    return { success: false, errors, threats };
  }

  return {
    success: threats.length === 0,
    data: result.data,
    errors: errors.length > 0 ? errors : undefined,
    threats: threats.length > 0 ? threats : undefined,
  };
}

/* ------------------------------------------------------------------ */
/*  Deep sanitization                                                 */
/* ------------------------------------------------------------------ */

function sanitizeDeep(
  data: unknown,
  config?: Partial<SanitizationConfig>
): { data: unknown; threats: ThreatDetection[] } {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const threats: ThreatDetection[] = [];

  function process(val: unknown, path: string): unknown {
    if (typeof val === "string") {
      if (cfg.xss) {
        const xssResult = sanitizeXSS(val);
        for (const t of xssResult.threats) {
          threats.push({ ...t, location: path });
        }
        // Return sanitized string
        if (!xssResult.safe) return xssResult.sanitized;
      }

      if (cfg.sqlInjection) {
        const sqlThreats = detectSQLInjection(val);
        for (const t of sqlThreats) {
          threats.push({ ...t, location: path });
        }
      }

      if (cfg.pathTraversal) {
        const ptThreats = detectPathTraversal(val);
        for (const t of ptThreats) {
          threats.push({ ...t, location: path });
        }
      }

      if (cfg.commandInjection) {
        const ciThreats = detectCommandInjection(val);
        for (const t of ciThreats) {
          threats.push({ ...t, location: path });
        }
      }

      return val;
    }

    if (Array.isArray(val)) {
      return val.map((item, i) => process(item, `${path}[${i}]`));
    }

    if (typeof val === "object" && val !== null) {
      if (cfg.prototypePollution) {
        const ppThreats = detectPrototypePollution(val, path);
        threats.push(...ppThreats);
      }

      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(val as Record<string, unknown>)) {
        if (PROTOTYPE_POLLUTION_KEYS.has(key)) continue; // strip dangerous keys
        result[key] = process(value, `${path}.${key}`);
      }
      return result;
    }

    return val;
  }

  return { data: process(data, "root"), threats };
}

/* ------------------------------------------------------------------ */
/*  Combined sanitizer                                                */
/* ------------------------------------------------------------------ */

export function sanitizeInput(
  input: string,
  config?: Partial<SanitizationConfig>
): SanitizationResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const threats: ThreatDetection[] = [];
  let sanitized = input;

  if (cfg.xss) {
    const xss = sanitizeXSS(input);
    threats.push(...xss.threats);
    sanitized = xss.sanitized;
  }

  if (cfg.sqlInjection) {
    threats.push(...detectSQLInjection(input));
  }

  if (cfg.pathTraversal) {
    threats.push(...detectPathTraversal(input));
  }

  if (cfg.commandInjection) {
    threats.push(...detectCommandInjection(input));
  }

  return {
    safe: threats.length === 0,
    sanitized,
    threats,
  };
}

/**
 * Full request validation: content-type, body size, schema, sanitization.
 */
export function validateRequest<T>(params: {
  contentType?: string | null;
  body: unknown;
  schema: z.ZodType<T>;
  config?: Partial<SanitizationConfig>;
}): ValidationResult<T> {
  const cfg = { ...DEFAULT_CONFIG, ...params.config };
  const errors: string[] = [];
  const threats: ThreatDetection[] = [];

  // Content-type
  const ctResult = validateContentType(params.contentType, cfg.contentTypes);
  if (!ctResult.valid && ctResult.error) {
    errors.push(ctResult.error);
  }

  // Body size
  const sizeResult = validateBodySize(params.body, cfg.bodySizeLimits);
  if (!sizeResult.valid) {
    errors.push(...sizeResult.errors);
  }

  // Schema + sanitization
  const schemaResult = enforceSchema(params.body, params.schema, {
    sanitizeBefore: true,
    config: cfg,
  });

  if (schemaResult.threats) threats.push(...schemaResult.threats);
  if (schemaResult.errors) errors.push(...schemaResult.errors);

  if (errors.length > 0 || threats.length > 0) {
    return {
      success: false,
      data: schemaResult.data,
      errors: errors.length > 0 ? errors : undefined,
      threats: threats.length > 0 ? threats : undefined,
    };
  }

  return { success: true, data: schemaResult.data };
}
