/**
 * Config validator: validate against schemas, check env vars,
 * detect conflicts, report missing dependencies, suggest fixes
 * (Issue #501).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SchemaFieldType =
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object"
  | "enum"
  | "url"
  | "email"
  | "port";

export interface SchemaField {
  key: string;
  type: SchemaFieldType;
  required?: boolean;
  default?: unknown;
  description?: string;
  enumValues?: string[];
  min?: number;
  max?: number;
  pattern?: string;
  /** Other config keys this field depends on. */
  dependsOn?: string[];
  /** Keys that conflict with this field. */
  conflictsWith?: string[];
}

export interface ConfigSchema {
  name: string;
  version: string;
  fields: SchemaField[];
}

export type Severity = "error" | "warning" | "info";

export interface ValidationIssue {
  severity: Severity;
  field: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  checkedFields: number;
  missingRequired: string[];
  conflicts: Array<{ fieldA: string; fieldB: string }>;
  missingDependencies: Array<{ field: string; missingDep: string }>;
}

export interface EnvCheckResult {
  name: string;
  present: boolean;
  hasValue: boolean;
  suggestion?: string;
}

// ---------------------------------------------------------------------------
// Schema validation
// ---------------------------------------------------------------------------

function validateFieldType(
  value: unknown,
  field: SchemaField
): ValidationIssue | null {
  if (value === undefined || value === null) return null; // handled by required check

  switch (field.type) {
    case "string":
      if (typeof value !== "string") {
        return {
          severity: "error",
          field: field.key,
          message: `Expected string, got ${typeof value}`,
          suggestion: `Convert to string: String(${JSON.stringify(value)})`,
        };
      }
      if (field.pattern && !new RegExp(field.pattern).test(value)) {
        return {
          severity: "error",
          field: field.key,
          message: `Value does not match pattern /${field.pattern}/`,
          suggestion: `Ensure value matches: ${field.pattern}`,
        };
      }
      break;

    case "number": {
      const num = typeof value === "number" ? value : NaN;
      if (typeof value !== "number" || isNaN(num)) {
        return {
          severity: "error",
          field: field.key,
          message: `Expected number, got ${typeof value}`,
          suggestion: `Provide a numeric value`,
        };
      }
      if (field.min !== undefined && num < field.min) {
        return {
          severity: "error",
          field: field.key,
          message: `Value ${num} is below minimum ${field.min}`,
          suggestion: `Set to at least ${field.min}`,
        };
      }
      if (field.max !== undefined && num > field.max) {
        return {
          severity: "error",
          field: field.key,
          message: `Value ${num} exceeds maximum ${field.max}`,
          suggestion: `Set to at most ${field.max}`,
        };
      }
      break;
    }

    case "boolean":
      if (typeof value !== "boolean") {
        return {
          severity: "error",
          field: field.key,
          message: `Expected boolean, got ${typeof value}`,
          suggestion: `Use true or false`,
        };
      }
      break;

    case "array":
      if (!Array.isArray(value)) {
        return {
          severity: "error",
          field: field.key,
          message: `Expected array, got ${typeof value}`,
          suggestion: `Wrap in array: [${JSON.stringify(value)}]`,
        };
      }
      break;

    case "object":
      if (typeof value !== "object" || Array.isArray(value)) {
        return {
          severity: "error",
          field: field.key,
          message: `Expected object, got ${Array.isArray(value) ? "array" : typeof value}`,
        };
      }
      break;

    case "enum":
      if (field.enumValues && !field.enumValues.includes(String(value))) {
        return {
          severity: "error",
          field: field.key,
          message: `Invalid value "${value}". Must be one of: ${field.enumValues.join(", ")}`,
          suggestion: `Use one of: ${field.enumValues.join(", ")}`,
        };
      }
      break;

    case "url":
      if (typeof value === "string") {
        try {
          new URL(value);
        } catch {
          return {
            severity: "error",
            field: field.key,
            message: `Invalid URL: ${value}`,
            suggestion: `Provide a valid URL starting with http:// or https://`,
          };
        }
      }
      break;

    case "email":
      if (typeof value === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return {
          severity: "error",
          field: field.key,
          message: `Invalid email: ${value}`,
          suggestion: `Provide a valid email address`,
        };
      }
      break;

    case "port": {
      const port = typeof value === "number" ? value : parseInt(String(value), 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        return {
          severity: "error",
          field: field.key,
          message: `Invalid port: ${value}. Must be 1-65535`,
          suggestion: `Use a port number between 1 and 65535`,
        };
      }
      break;
    }
  }

  return null;
}

export function validateConfig(
  config: Record<string, unknown>,
  schema: ConfigSchema
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const missingRequired: string[] = [];
  const conflicts: Array<{ fieldA: string; fieldB: string }> = [];
  const missingDependencies: Array<{ field: string; missingDep: string }> = [];

  for (const field of schema.fields) {
    const value = config[field.key];

    // Required check
    if (field.required && (value === undefined || value === null || value === "")) {
      missingRequired.push(field.key);
      issues.push({
        severity: "error",
        field: field.key,
        message: `Required field "${field.key}" is missing`,
        suggestion: field.default !== undefined
          ? `Use default: ${JSON.stringify(field.default)}`
          : field.description
            ? `${field.description}`
            : undefined,
      });
      continue;
    }

    // Type validation
    if (value !== undefined && value !== null) {
      const typeIssue = validateFieldType(value, field);
      if (typeIssue) issues.push(typeIssue);
    }

    // Dependency check
    if (field.dependsOn && value !== undefined) {
      for (const dep of field.dependsOn) {
        if (config[dep] === undefined || config[dep] === null) {
          missingDependencies.push({ field: field.key, missingDep: dep });
          issues.push({
            severity: "error",
            field: field.key,
            message: `Field "${field.key}" requires "${dep}" to be set`,
            suggestion: `Set "${dep}" before using "${field.key}"`,
          });
        }
      }
    }

    // Conflict check
    if (field.conflictsWith && value !== undefined) {
      for (const conflictKey of field.conflictsWith) {
        if (config[conflictKey] !== undefined && config[conflictKey] !== null) {
          const existing = conflicts.find(
            (c) =>
              (c.fieldA === field.key && c.fieldB === conflictKey) ||
              (c.fieldA === conflictKey && c.fieldB === field.key)
          );
          if (!existing) {
            conflicts.push({ fieldA: field.key, fieldB: conflictKey });
            issues.push({
              severity: "error",
              field: field.key,
              message: `"${field.key}" conflicts with "${conflictKey}" — only one should be set`,
              suggestion: `Remove either "${field.key}" or "${conflictKey}"`,
            });
          }
        }
      }
    }
  }

  // Warn about unknown keys
  const knownKeys = new Set(schema.fields.map((f) => f.key));
  for (const key of Object.keys(config)) {
    if (!knownKeys.has(key)) {
      issues.push({
        severity: "warning",
        field: key,
        message: `Unknown config key "${key}" is not in the schema`,
        suggestion: `Check for typos or remove this key`,
      });
    }
  }

  return {
    valid: !issues.some((i) => i.severity === "error"),
    issues,
    checkedFields: schema.fields.length,
    missingRequired,
    conflicts,
    missingDependencies,
  };
}

// ---------------------------------------------------------------------------
// Env var checking
// ---------------------------------------------------------------------------

const KNOWN_ENV_VARS: Record<string, { required: boolean; description: string; suggestion: string }> = {
  NEXT_PUBLIC_SUPABASE_URL: {
    required: true,
    description: "Supabase project URL",
    suggestion: "Get from Supabase dashboard → Settings → API",
  },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: {
    required: true,
    description: "Supabase anonymous key",
    suggestion: "Get from Supabase dashboard → Settings → API → anon public",
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    required: false,
    description: "Supabase service role key (server-side only)",
    suggestion: "Get from Supabase dashboard → Settings → API → service_role",
  },
  OPENAI_API_KEY: {
    required: false,
    description: "OpenAI API key for GPT model audits",
    suggestion: "Get from platform.openai.com/api-keys",
  },
  ANTHROPIC_API_KEY: {
    required: false,
    description: "Anthropic API key for Claude model audits",
    suggestion: "Get from console.anthropic.com/settings/keys",
  },
  GOOGLE_AI_API_KEY: {
    required: false,
    description: "Google AI API key for Gemini model audits",
    suggestion: "Get from aistudio.google.com/apikey",
  },
};

export function checkEnvVars(
  env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env as Record<string, string | undefined> : {}
): EnvCheckResult[] {
  return Object.entries(KNOWN_ENV_VARS).map(([name, meta]) => {
    const value = env[name];
    const present = value !== undefined;
    const hasValue = present && value !== "";
    return {
      name,
      present,
      hasValue,
      suggestion: !hasValue ? meta.suggestion : undefined,
    };
  });
}

export function getMissingRequiredEnvVars(
  env?: Record<string, string | undefined>
): EnvCheckResult[] {
  return checkEnvVars(env).filter((r) => {
    const meta = KNOWN_ENV_VARS[r.name];
    return meta.required && !r.hasValue;
  });
}

// ---------------------------------------------------------------------------
// Predefined app config schema
// ---------------------------------------------------------------------------

export const appConfigSchema: ConfigSchema = {
  name: "chetana-web",
  version: "1.0.0",
  fields: [
    {
      key: "supabaseUrl",
      type: "url",
      required: true,
      description: "Supabase project URL",
    },
    {
      key: "supabaseAnonKey",
      type: "string",
      required: true,
      description: "Supabase anonymous key",
    },
    {
      key: "defaultModel",
      type: "string",
      required: false,
      default: "claude-sonnet-4-20250514",
      description: "Default model for new audits",
    },
    {
      key: "defaultProvider",
      type: "enum",
      required: false,
      enumValues: ["anthropic", "openai", "google", "ollama", "mistral", "deepseek", "openrouter"],
      default: "anthropic",
    },
    {
      key: "maxConcurrentAudits",
      type: "number",
      required: false,
      default: 3,
      min: 1,
      max: 10,
    },
    {
      key: "enableExperimentalFeatures",
      type: "boolean",
      required: false,
      default: false,
    },
    {
      key: "apiRateLimit",
      type: "number",
      required: false,
      default: 60,
      min: 1,
      max: 1000,
      description: "Max API requests per minute",
    },
    {
      key: "debugMode",
      type: "boolean",
      required: false,
      default: false,
      conflictsWith: ["productionMode"],
    },
    {
      key: "productionMode",
      type: "boolean",
      required: false,
      default: false,
      conflictsWith: ["debugMode"],
    },
    {
      key: "webhookUrl",
      type: "url",
      required: false,
      description: "Webhook endpoint for audit completion",
    },
    {
      key: "webhookSecret",
      type: "string",
      required: false,
      dependsOn: ["webhookUrl"],
      description: "Secret for signing webhook payloads",
    },
  ],
};

// ---------------------------------------------------------------------------
// Suggestion engine
// ---------------------------------------------------------------------------

export function suggestFixes(result: ValidationResult): string[] {
  const suggestions: string[] = [];

  for (const issue of result.issues) {
    if (issue.suggestion) {
      suggestions.push(`[${issue.severity.toUpperCase()}] ${issue.field}: ${issue.suggestion}`);
    }
  }

  if (result.missingRequired.length > 0) {
    suggestions.push(
      `Set required fields: ${result.missingRequired.join(", ")}`
    );
  }

  if (result.conflicts.length > 0) {
    for (const c of result.conflicts) {
      suggestions.push(
        `Resolve conflict: "${c.fieldA}" and "${c.fieldB}" cannot both be set`
      );
    }
  }

  return suggestions;
}
