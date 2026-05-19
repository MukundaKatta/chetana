/**
 * Error code registry (Issue #455).
 * Provides unique error codes with categories (AUTH, PROBE, SCORE, API),
 * human-readable messages, suggested fixes, lookup utilities, and a
 * documentation generator.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type ErrorCategory =
  | "AUTH"
  | "PROBE"
  | "SCORE"
  | "API"
  | "EXPORT"
  | "AUDIT"
  | "MODEL"
  | "SYSTEM";

export type ErrorSeverity = "info" | "warning" | "error" | "critical";

export interface ErrorDefinition {
  /** Unique error code (e.g. "AUTH_001"). */
  code: string;
  /** Error category. */
  category: ErrorCategory;
  /** Short human-readable title. */
  title: string;
  /** Detailed human-readable description. */
  message: string;
  /** Suggested fix or next steps. */
  suggestedFix: string;
  /** Severity level. */
  severity: ErrorSeverity;
  /** HTTP status code to use when returning this error (optional). */
  httpStatus?: number;
  /** Whether this error is retryable. */
  retryable: boolean;
  /** Link to documentation (optional). */
  docsUrl?: string;
}

export interface RegistryError extends Error {
  /** The error code from the registry. */
  code: string;
  /** The full error definition. */
  definition: ErrorDefinition;
  /** Additional context. */
  context?: Record<string, unknown>;
  /** ISO timestamp. */
  timestamp: string;
}

export interface ErrorDocEntry {
  code: string;
  category: string;
  title: string;
  message: string;
  suggestedFix: string;
  severity: string;
  retryable: boolean;
}

/* ------------------------------------------------------------------ */
/*  Built-in error definitions                                        */
/* ------------------------------------------------------------------ */

const BUILTIN_ERRORS: ErrorDefinition[] = [
  // AUTH errors
  {
    code: "AUTH_001",
    category: "AUTH",
    title: "Authentication Required",
    message: "You must be authenticated to perform this action.",
    suggestedFix: "Please sign in or provide a valid API key in the Authorization header.",
    severity: "error",
    httpStatus: 401,
    retryable: false,
  },
  {
    code: "AUTH_002",
    category: "AUTH",
    title: "Invalid API Key",
    message: "The provided API key is invalid or has expired.",
    suggestedFix: "Check your API key in the settings page and regenerate if necessary.",
    severity: "error",
    httpStatus: 401,
    retryable: false,
  },
  {
    code: "AUTH_003",
    category: "AUTH",
    title: "Insufficient Permissions",
    message: "Your account does not have permission to perform this action.",
    suggestedFix: "Contact an administrator to request the necessary permissions.",
    severity: "error",
    httpStatus: 403,
    retryable: false,
  },
  {
    code: "AUTH_004",
    category: "AUTH",
    title: "Session Expired",
    message: "Your session has expired.",
    suggestedFix: "Please sign in again to continue.",
    severity: "warning",
    httpStatus: 401,
    retryable: false,
  },
  {
    code: "AUTH_005",
    category: "AUTH",
    title: "Rate Limited",
    message: "Too many authentication attempts. Please wait before trying again.",
    suggestedFix: "Wait for the rate limit to reset, then try again.",
    severity: "warning",
    httpStatus: 429,
    retryable: true,
  },

  // PROBE errors
  {
    code: "PROBE_001",
    category: "PROBE",
    title: "Probe Not Found",
    message: "The requested probe does not exist.",
    suggestedFix: "Verify the probe ID and check that it has not been deleted.",
    severity: "error",
    httpStatus: 404,
    retryable: false,
  },
  {
    code: "PROBE_002",
    category: "PROBE",
    title: "Probe Execution Timeout",
    message: "The probe execution exceeded the configured timeout.",
    suggestedFix: "Increase the timeout in probe settings or simplify the probe prompt.",
    severity: "error",
    httpStatus: 504,
    retryable: true,
  },
  {
    code: "PROBE_003",
    category: "PROBE",
    title: "Invalid Probe Configuration",
    message: "The probe configuration is invalid or incomplete.",
    suggestedFix: "Review the probe settings and ensure all required fields are filled.",
    severity: "error",
    httpStatus: 400,
    retryable: false,
  },
  {
    code: "PROBE_004",
    category: "PROBE",
    title: "Probe Template Error",
    message: "The probe prompt template contains syntax errors.",
    suggestedFix: "Check for unmatched {{brackets}} and validate variable names.",
    severity: "error",
    httpStatus: 400,
    retryable: false,
  },
  {
    code: "PROBE_005",
    category: "PROBE",
    title: "Token Limit Exceeded",
    message: "The probe response exceeded the maximum token limit.",
    suggestedFix: "Reduce the expected response length or increase the token limit.",
    severity: "warning",
    httpStatus: 413,
    retryable: true,
  },

  // SCORE errors
  {
    code: "SCORE_001",
    category: "SCORE",
    title: "Scoring Failed",
    message: "Failed to compute the score for the given probe response.",
    suggestedFix: "Check the scoring rubric and ensure the response format is valid.",
    severity: "error",
    httpStatus: 500,
    retryable: true,
  },
  {
    code: "SCORE_002",
    category: "SCORE",
    title: "Invalid Score Range",
    message: "The computed score is outside the valid range (0-1).",
    suggestedFix: "Review the scoring algorithm for potential normalization issues.",
    severity: "error",
    httpStatus: 500,
    retryable: false,
  },
  {
    code: "SCORE_003",
    category: "SCORE",
    title: "Insufficient Data",
    message: "Not enough probe results to compute a reliable score.",
    suggestedFix: "Run additional probes before requesting a score.",
    severity: "warning",
    httpStatus: 400,
    retryable: false,
  },
  {
    code: "SCORE_004",
    category: "SCORE",
    title: "Bayesian Prior Error",
    message: "The Bayesian prior distribution parameters are invalid.",
    suggestedFix: "Ensure alpha and beta parameters are positive numbers.",
    severity: "error",
    httpStatus: 400,
    retryable: false,
  },

  // API errors
  {
    code: "API_001",
    category: "API",
    title: "Invalid Request",
    message: "The request body is malformed or missing required fields.",
    suggestedFix: "Check the API documentation for the correct request format.",
    severity: "error",
    httpStatus: 400,
    retryable: false,
  },
  {
    code: "API_002",
    category: "API",
    title: "Resource Not Found",
    message: "The requested resource was not found.",
    suggestedFix: "Verify the URL path and resource ID.",
    severity: "error",
    httpStatus: 404,
    retryable: false,
  },
  {
    code: "API_003",
    category: "API",
    title: "Rate Limit Exceeded",
    message: "You have exceeded the API rate limit.",
    suggestedFix: "Reduce request frequency or upgrade your plan for higher limits.",
    severity: "warning",
    httpStatus: 429,
    retryable: true,
  },
  {
    code: "API_004",
    category: "API",
    title: "Internal Server Error",
    message: "An unexpected error occurred on the server.",
    suggestedFix: "Try again later. If the problem persists, contact support.",
    severity: "critical",
    httpStatus: 500,
    retryable: true,
  },
  {
    code: "API_005",
    category: "API",
    title: "Service Unavailable",
    message: "The service is temporarily unavailable.",
    suggestedFix: "Wait a few minutes and try again. Check the status page for updates.",
    severity: "critical",
    httpStatus: 503,
    retryable: true,
  },

  // AUDIT errors
  {
    code: "AUDIT_001",
    category: "AUDIT",
    title: "Audit Not Found",
    message: "The requested audit does not exist.",
    suggestedFix: "Verify the audit ID in the URL.",
    severity: "error",
    httpStatus: 404,
    retryable: false,
  },
  {
    code: "AUDIT_002",
    category: "AUDIT",
    title: "Audit In Progress",
    message: "This audit is still running and cannot be modified.",
    suggestedFix: "Wait for the audit to complete before making changes.",
    severity: "warning",
    httpStatus: 409,
    retryable: true,
  },
  {
    code: "AUDIT_003",
    category: "AUDIT",
    title: "Audit Template Invalid",
    message: "The audit template configuration is invalid.",
    suggestedFix: "Review and fix the template configuration.",
    severity: "error",
    httpStatus: 400,
    retryable: false,
  },

  // MODEL errors
  {
    code: "MODEL_001",
    category: "MODEL",
    title: "Model Unavailable",
    message: "The requested model is currently unavailable.",
    suggestedFix: "Check the model status on the availability page or try a different model.",
    severity: "error",
    httpStatus: 503,
    retryable: true,
  },
  {
    code: "MODEL_002",
    category: "MODEL",
    title: "Model API Key Missing",
    message: "No API key configured for the selected model provider.",
    suggestedFix: "Add the API key in Settings > API Keys.",
    severity: "error",
    httpStatus: 400,
    retryable: false,
  },
  {
    code: "MODEL_003",
    category: "MODEL",
    title: "Context Window Exceeded",
    message: "The input exceeds the model's context window.",
    suggestedFix: "Reduce the input size or choose a model with a larger context window.",
    severity: "error",
    httpStatus: 413,
    retryable: false,
  },

  // EXPORT errors
  {
    code: "EXPORT_001",
    category: "EXPORT",
    title: "Export Failed",
    message: "Failed to export data in the requested format.",
    suggestedFix: "Try a different export format or reduce the data size.",
    severity: "error",
    httpStatus: 500,
    retryable: true,
  },
  {
    code: "EXPORT_002",
    category: "EXPORT",
    title: "Export Size Limit",
    message: "The export exceeds the maximum allowed size.",
    suggestedFix: "Apply filters to reduce the export size.",
    severity: "warning",
    httpStatus: 413,
    retryable: false,
  },

  // SYSTEM errors
  {
    code: "SYSTEM_001",
    category: "SYSTEM",
    title: "Database Connection Error",
    message: "Could not connect to the database.",
    suggestedFix: "Check your database configuration and ensure the service is running.",
    severity: "critical",
    httpStatus: 503,
    retryable: true,
  },
  {
    code: "SYSTEM_002",
    category: "SYSTEM",
    title: "Configuration Error",
    message: "A required configuration value is missing.",
    suggestedFix: "Check your environment variables and configuration files.",
    severity: "critical",
    httpStatus: 500,
    retryable: false,
  },
];

/* ------------------------------------------------------------------ */
/*  Error registry                                                    */
/* ------------------------------------------------------------------ */

export class ErrorRegistry {
  private errors = new Map<string, ErrorDefinition>();

  constructor() {
    // Register all built-in errors
    for (const def of BUILTIN_ERRORS) {
      this.errors.set(def.code, def);
    }
  }

  /**
   * Register a custom error definition.
   */
  register(definition: ErrorDefinition): void {
    this.errors.set(definition.code, definition);
  }

  /**
   * Register multiple error definitions.
   */
  registerAll(definitions: ErrorDefinition[]): void {
    for (const def of definitions) {
      this.register(def);
    }
  }

  /**
   * Look up an error by code.
   */
  lookup(code: string): ErrorDefinition | undefined {
    return this.errors.get(code);
  }

  /**
   * Get all errors in a category.
   */
  getByCategory(category: ErrorCategory): ErrorDefinition[] {
    return Array.from(this.errors.values()).filter(
      (e) => e.category === category,
    );
  }

  /**
   * Get all errors of a severity level.
   */
  getBySeverity(severity: ErrorSeverity): ErrorDefinition[] {
    return Array.from(this.errors.values()).filter(
      (e) => e.severity === severity,
    );
  }

  /**
   * Get all retryable errors.
   */
  getRetryable(): ErrorDefinition[] {
    return Array.from(this.errors.values()).filter((e) => e.retryable);
  }

  /**
   * Create a structured error from an error code.
   */
  createError(
    code: string,
    context?: Record<string, unknown>,
  ): RegistryError {
    const definition = this.errors.get(code);
    if (!definition) {
      // Fallback for unknown codes
      const fallback: ErrorDefinition = {
        code,
        category: "SYSTEM",
        title: "Unknown Error",
        message: `An unknown error occurred (code: ${code}).`,
        suggestedFix: "Contact support with this error code.",
        severity: "error",
        retryable: false,
      };

      const err = new Error(fallback.message) as RegistryError;
      err.code = code;
      err.definition = fallback;
      err.context = context;
      err.timestamp = new Date().toISOString();
      return err;
    }

    const err = new Error(definition.message) as RegistryError;
    err.name = `${definition.category}Error`;
    err.code = code;
    err.definition = definition;
    err.context = context;
    err.timestamp = new Date().toISOString();
    return err;
  }

  /**
   * Format an error for API response.
   */
  formatForResponse(
    code: string,
    context?: Record<string, unknown>,
  ): {
    error: {
      code: string;
      title: string;
      message: string;
      suggestedFix: string;
      severity: string;
      retryable: boolean;
      context?: Record<string, unknown>;
    };
    status: number;
  } {
    const def = this.errors.get(code);
    if (!def) {
      return {
        error: {
          code,
          title: "Unknown Error",
          message: `Unknown error code: ${code}`,
          suggestedFix: "Contact support.",
          severity: "error",
          retryable: false,
          context,
        },
        status: 500,
      };
    }

    return {
      error: {
        code: def.code,
        title: def.title,
        message: def.message,
        suggestedFix: def.suggestedFix,
        severity: def.severity,
        retryable: def.retryable,
        context,
      },
      status: def.httpStatus ?? 500,
    };
  }

  /**
   * Get all registered error definitions.
   */
  getAll(): ErrorDefinition[] {
    return Array.from(this.errors.values()).sort((a, b) =>
      a.code.localeCompare(b.code),
    );
  }

  /**
   * Get all error categories.
   */
  getCategories(): ErrorCategory[] {
    const cats = new Set(
      Array.from(this.errors.values()).map((e) => e.category),
    );
    return [...cats].sort() as ErrorCategory[];
  }

  /**
   * Check if an error code exists.
   */
  has(code: string): boolean {
    return this.errors.has(code);
  }

  /**
   * Generate documentation for all registered errors.
   */
  generateDocumentation(): {
    categories: Array<{
      category: string;
      errors: ErrorDocEntry[];
    }>;
    total: number;
  } {
    const byCategory = new Map<string, ErrorDocEntry[]>();

    for (const def of this.getAll()) {
      if (!byCategory.has(def.category)) {
        byCategory.set(def.category, []);
      }
      byCategory.get(def.category)!.push({
        code: def.code,
        category: def.category,
        title: def.title,
        message: def.message,
        suggestedFix: def.suggestedFix,
        severity: def.severity,
        retryable: def.retryable,
      });
    }

    const categories = [...byCategory.entries()]
      .map(([category, errors]) => ({ category, errors }))
      .sort((a, b) => a.category.localeCompare(b.category));

    return {
      categories,
      total: this.errors.size,
    };
  }

  /**
   * Generate a markdown documentation string.
   */
  generateMarkdownDocs(): string {
    const doc = this.generateDocumentation();
    const lines: string[] = ["# Error Code Reference", ""];

    for (const { category, errors } of doc.categories) {
      lines.push(`## ${category}`, "");
      lines.push("| Code | Title | Severity | Retryable | Description |");
      lines.push("| --- | --- | --- | --- | --- |");

      for (const err of errors) {
        lines.push(
          `| \`${err.code}\` | ${err.title} | ${err.severity} | ${err.retryable ? "Yes" : "No"} | ${err.message} |`,
        );
      }
      lines.push("");
    }

    lines.push(`*Total: ${doc.total} error codes*`);
    return lines.join("\n");
  }
}

/* ------------------------------------------------------------------ */
/*  Singleton                                                         */
/* ------------------------------------------------------------------ */

let _registry: ErrorRegistry | null = null;

export function getErrorRegistry(): ErrorRegistry {
  if (!_registry) {
    _registry = new ErrorRegistry();
  }
  return _registry;
}

/**
 * Convenience: create an error from the global registry.
 */
export function createRegistryError(
  code: string,
  context?: Record<string, unknown>,
): RegistryError {
  return getErrorRegistry().createError(code, context);
}

/**
 * Convenience: look up an error definition from the global registry.
 */
export function lookupError(code: string): ErrorDefinition | undefined {
  return getErrorRegistry().lookup(code);
}
