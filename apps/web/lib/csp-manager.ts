/**
 * Content Security Policy manager (Issue #440).
 * Builds CSP headers with directives, supports report-only mode,
 * nonce generation, violation reporting, and policy validation.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type CSPDirective =
  | "default-src"
  | "script-src"
  | "style-src"
  | "img-src"
  | "font-src"
  | "connect-src"
  | "media-src"
  | "object-src"
  | "frame-src"
  | "frame-ancestors"
  | "child-src"
  | "worker-src"
  | "manifest-src"
  | "base-uri"
  | "form-action"
  | "navigate-to"
  | "report-uri"
  | "report-to"
  | "upgrade-insecure-requests"
  | "block-all-mixed-content";

export type CSPSourceValue =
  | "'self'"
  | "'unsafe-inline'"
  | "'unsafe-eval'"
  | "'strict-dynamic'"
  | "'unsafe-hashes'"
  | "'none'"
  | `'nonce-${string}'`
  | `'sha256-${string}'`
  | `'sha384-${string}'`
  | `'sha512-${string}'`
  | string;

export interface CSPViolationReport {
  /** The URI of the resource that was blocked. */
  blockedUri: string;
  /** The directive that was violated. */
  effectiveDirective: string;
  /** The original policy. */
  originalPolicy: string;
  /** The URI of the document where the violation occurred. */
  documentUri: string;
  /** Referrer. */
  referrer: string;
  /** Status code. */
  statusCode: number;
  /** Violated directive. */
  violatedDirective: string;
  /** Source file. */
  sourceFile?: string;
  /** Line number. */
  lineNumber?: number;
  /** Column number. */
  columnNumber?: number;
  /** Timestamp. */
  timestamp: string;
}

export interface CSPValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export interface CSPConfig {
  /** Whether to use Content-Security-Policy-Report-Only header. */
  reportOnly?: boolean;
  /** Reporting endpoint URL. */
  reportUri?: string;
  /** Report-To group name. */
  reportTo?: string;
}

/* ------------------------------------------------------------------ */
/*  Nonce generation                                                  */
/* ------------------------------------------------------------------ */

/**
 * Generate a cryptographic nonce for CSP inline script/style directives.
 */
export function generateNonce(length: number = 16): string {
  const values = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(values);
  } else {
    for (let i = 0; i < length; i++) {
      values[i] = Math.floor(Math.random() * 256);
    }
  }
  // Base64 encode
  let binary = "";
  for (let i = 0; i < values.length; i++) {
    binary += String.fromCharCode(values[i]);
  }
  if (typeof btoa === "function") {
    return btoa(binary);
  }
  return Buffer.from(values).toString("base64");
}

/* ------------------------------------------------------------------ */
/*  CSP Builder                                                       */
/* ------------------------------------------------------------------ */

export class CSPBuilder {
  private directives = new Map<CSPDirective, CSPSourceValue[]>();
  private config: Required<CSPConfig>;
  private nonces: string[] = [];

  constructor(config: CSPConfig = {}) {
    this.config = {
      reportOnly: config.reportOnly ?? false,
      reportUri: config.reportUri ?? "",
      reportTo: config.reportTo ?? "",
    };
  }

  /**
   * Add one or more source values to a directive.
   */
  addDirective(
    directive: CSPDirective,
    ...sources: CSPSourceValue[]
  ): CSPBuilder {
    const existing = this.directives.get(directive) ?? [];
    this.directives.set(directive, [...existing, ...sources]);
    return this;
  }

  /**
   * Set a directive, replacing any existing values.
   */
  setDirective(
    directive: CSPDirective,
    ...sources: CSPSourceValue[]
  ): CSPBuilder {
    this.directives.set(directive, sources);
    return this;
  }

  /**
   * Remove a directive entirely.
   */
  removeDirective(directive: CSPDirective): CSPBuilder {
    this.directives.delete(directive);
    return this;
  }

  /**
   * Generate a nonce and add it to script-src and style-src.
   */
  addNonce(): string {
    const nonce = generateNonce();
    this.nonces.push(nonce);
    this.addDirective("script-src", `'nonce-${nonce}'`);
    this.addDirective("style-src", `'nonce-${nonce}'`);
    return nonce;
  }

  /**
   * Enable report-only mode.
   */
  setReportOnly(enabled: boolean): CSPBuilder {
    this.config.reportOnly = enabled;
    return this;
  }

  /**
   * Set the violation reporting endpoint.
   */
  setReportUri(uri: string): CSPBuilder {
    this.config.reportUri = uri;
    return this;
  }

  /**
   * Set the Report-To group name.
   */
  setReportTo(group: string): CSPBuilder {
    this.config.reportTo = group;
    return this;
  }

  /**
   * Build the CSP header value string.
   */
  build(): string {
    const parts: string[] = [];

    for (const [directive, sources] of this.directives) {
      // Directives like upgrade-insecure-requests have no values
      if (
        directive === "upgrade-insecure-requests" ||
        directive === "block-all-mixed-content"
      ) {
        parts.push(directive);
      } else {
        // Deduplicate sources
        const uniqueSources = [...new Set(sources)];
        parts.push(`${directive} ${uniqueSources.join(" ")}`);
      }
    }

    // Add reporting directives
    if (this.config.reportUri) {
      parts.push(`report-uri ${this.config.reportUri}`);
    }
    if (this.config.reportTo) {
      parts.push(`report-to ${this.config.reportTo}`);
    }

    return parts.join("; ");
  }

  /**
   * Build the complete header entry (name + value).
   */
  buildHeader(): { name: string; value: string } {
    const name = this.config.reportOnly
      ? "Content-Security-Policy-Report-Only"
      : "Content-Security-Policy";
    return { name, value: this.build() };
  }

  /**
   * Get all generated nonces.
   */
  getNonces(): string[] {
    return [...this.nonces];
  }

  /**
   * Clone the builder for creating variations.
   */
  clone(): CSPBuilder {
    const cloned = new CSPBuilder(this.config);
    for (const [directive, sources] of this.directives) {
      cloned.directives.set(directive, [...sources]);
    }
    cloned.nonces = [...this.nonces];
    return cloned;
  }
}

/* ------------------------------------------------------------------ */
/*  Policy validation                                                 */
/* ------------------------------------------------------------------ */

/**
 * Validate a CSP policy string for common issues.
 */
export function validatePolicy(policy: string): CSPValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!policy.trim()) {
    errors.push("Policy is empty.");
    return { valid: false, warnings, errors };
  }

  const directives = policy.split(";").map((d) => d.trim()).filter(Boolean);

  const seenDirectives = new Set<string>();
  let hasDefaultSrc = false;

  for (const directive of directives) {
    const parts = directive.split(/\s+/);
    const name = parts[0];

    if (!name) continue;

    if (seenDirectives.has(name)) {
      errors.push(`Duplicate directive: ${name}`);
    }
    seenDirectives.add(name);

    if (name === "default-src") hasDefaultSrc = true;

    const sources = parts.slice(1);

    // Check for unsafe directives
    if (sources.includes("'unsafe-inline'")) {
      warnings.push(
        `${name} uses 'unsafe-inline' which reduces CSP effectiveness.`,
      );
    }
    if (sources.includes("'unsafe-eval'")) {
      warnings.push(
        `${name} uses 'unsafe-eval' which allows arbitrary code execution.`,
      );
    }

    // Check for wildcards
    if (sources.includes("*")) {
      warnings.push(
        `${name} uses wildcard '*' which allows any source.`,
      );
    }

    // Check for http: in sources
    if (sources.some((s) => s === "http:" || s.startsWith("http://"))) {
      warnings.push(
        `${name} allows insecure HTTP sources.`,
      );
    }

    // Check for data: URI
    if (sources.includes("data:")) {
      warnings.push(
        `${name} allows data: URIs which can be used for XSS.`,
      );
    }
  }

  if (!hasDefaultSrc) {
    warnings.push(
      "No default-src directive. Each resource type must be explicitly covered.",
    );
  }

  return { valid: errors.length === 0, warnings, errors };
}

/* ------------------------------------------------------------------ */
/*  Violation report handling                                         */
/* ------------------------------------------------------------------ */

/**
 * Parse a CSP violation report from the request body.
 */
export function parseViolationReport(
  body: unknown,
): CSPViolationReport | null {
  if (!body || typeof body !== "object") return null;

  const report =
    "csp-report" in (body as Record<string, unknown>)
      ? (body as Record<string, unknown>)["csp-report"]
      : body;

  if (!report || typeof report !== "object") return null;

  const r = report as Record<string, unknown>;

  return {
    blockedUri: String(r["blocked-uri"] ?? r.blockedUri ?? ""),
    effectiveDirective: String(
      r["effective-directive"] ?? r.effectiveDirective ?? "",
    ),
    originalPolicy: String(
      r["original-policy"] ?? r.originalPolicy ?? "",
    ),
    documentUri: String(r["document-uri"] ?? r.documentUri ?? ""),
    referrer: String(r.referrer ?? ""),
    statusCode: Number(r["status-code"] ?? r.statusCode ?? 0),
    violatedDirective: String(
      r["violated-directive"] ?? r.violatedDirective ?? "",
    ),
    sourceFile: r["source-file"]
      ? String(r["source-file"])
      : undefined,
    lineNumber: r["line-number"]
      ? Number(r["line-number"])
      : undefined,
    columnNumber: r["column-number"]
      ? Number(r["column-number"])
      : undefined,
    timestamp: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/*  Presets                                                           */
/* ------------------------------------------------------------------ */

/**
 * Create a strict CSP suitable for the Chetana application.
 */
export function createStrictCSP(
  reportUri?: string,
): CSPBuilder {
  const builder = new CSPBuilder({ reportUri });
  const nonce = builder.addNonce();

  builder
    .setDirective("default-src", "'self'")
    .setDirective("script-src", "'self'", `'nonce-${nonce}'`, "'strict-dynamic'")
    .setDirective("style-src", "'self'", `'nonce-${nonce}'`)
    .setDirective("img-src", "'self'", "data:", "https:")
    .setDirective("font-src", "'self'")
    .setDirective("connect-src", "'self'", "https:", "wss:")
    .setDirective("media-src", "'none'")
    .setDirective("object-src", "'none'")
    .setDirective("frame-ancestors", "'none'")
    .setDirective("base-uri", "'self'")
    .setDirective("form-action", "'self'")
    .addDirective("upgrade-insecure-requests");

  return builder;
}

/**
 * Create a permissive CSP suitable for development.
 */
export function createDevCSP(): CSPBuilder {
  return new CSPBuilder({ reportOnly: true })
    .setDirective("default-src", "'self'", "'unsafe-inline'", "'unsafe-eval'")
    .setDirective("script-src", "'self'", "'unsafe-inline'", "'unsafe-eval'")
    .setDirective("style-src", "'self'", "'unsafe-inline'")
    .setDirective("img-src", "*", "data:", "blob:")
    .setDirective("connect-src", "*")
    .setDirective("font-src", "*");
}
