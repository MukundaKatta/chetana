/**
 * Webhook delivery system with configurable endpoints,
 * HMAC signature verification, retry with backoff,
 * delivery log, and payload templates (Issue #382).
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type WebhookEventType =
  | "audit.started"
  | "audit.completed"
  | "audit.failed"
  | "probe.scored"
  | "report.generated"
  | "experiment.created"
  | "experiment.completed"
  | "drift.detected"
  | "anomaly.detected";

export interface WebhookEndpoint {
  id: string;
  url: string;
  /** Events this endpoint subscribes to. */
  events: WebhookEventType[];
  /** Secret for HMAC signature. */
  secret: string;
  /** Whether endpoint is active. */
  active: boolean;
  /** Optional description. */
  description?: string;
  /** Custom headers to include. */
  headers?: Record<string, string>;
  /** Payload template ID (if using templates). */
  templateId?: string;
  /** Max retries (default 3). */
  maxRetries?: number;
  createdAt: string;
}

export interface WebhookPayload {
  id: string;
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  event: WebhookEventType;
  payload: WebhookPayload;
  status: "pending" | "success" | "failed" | "retrying";
  attempts: DeliveryAttempt[];
  createdAt: string;
  completedAt: string | null;
}

export interface DeliveryAttempt {
  attemptNumber: number;
  timestamp: string;
  statusCode: number | null;
  responseBody: string | null;
  error: string | null;
  durationMs: number;
}

export interface PayloadTemplate {
  id: string;
  name: string;
  description?: string;
  /** Handlebars-like template for the JSON body. */
  template: string;
}

export interface WebhookStats {
  totalDeliveries: number;
  successful: number;
  failed: number;
  pending: number;
  averageLatencyMs: number;
  endpointStats: Record<
    string,
    { total: number; success: number; failed: number }
  >;
}

/* ------------------------------------------------------------------ */
/*  HMAC signature                                                    */
/* ------------------------------------------------------------------ */

/**
 * Compute HMAC-SHA256 signature for webhook payload verification.
 */
export async function computeHMACSignature(
  payload: string,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const payloadData = encoder.encode(payload);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, payloadData);
  const bytes = new Uint8Array(signature);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verify an incoming webhook signature.
 */
export async function verifyHMACSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const expected = await computeHMACSignature(payload, secret);
  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

/* ------------------------------------------------------------------ */
/*  Retry with exponential backoff                                    */
/* ------------------------------------------------------------------ */

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

function computeBackoffDelay(attempt: number, config: RetryConfig): number {
  const delay =
    config.baseDelayMs * config.backoffMultiplier ** attempt;
  // Add jitter (up to 25% of delay)
  const jitter = delay * 0.25 * Math.random();
  return Math.min(delay + jitter, config.maxDelayMs);
}

/* ------------------------------------------------------------------ */
/*  Payload templates                                                 */
/* ------------------------------------------------------------------ */

const builtinTemplates: PayloadTemplate[] = [
  {
    id: "default",
    name: "Default",
    description: "Standard webhook payload",
    template: '{"event":"{{event}}","timestamp":"{{timestamp}}","data":{{data}}}',
  },
  {
    id: "slack",
    name: "Slack Notification",
    description: "Formatted for Slack incoming webhooks",
    template:
      '{"text":"*{{event}}*\\n{{summary}}","blocks":[{"type":"section","text":{"type":"mrkdwn","text":"*{{event}}*\\n{{summary}}"}}]}',
  },
  {
    id: "discord",
    name: "Discord Notification",
    description: "Formatted for Discord webhooks",
    template:
      '{"content":"**{{event}}**\\n{{summary}}","embeds":[{"title":"{{event}}","description":"{{summary}}","color":5814783}]}',
  },
];

/**
 * Apply a template to event data, replacing {{placeholders}}.
 */
export function applyTemplate(
  template: string,
  data: Record<string, unknown>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(flattenObject(data))) {
    const placeholder = `{{${key}}}`;
    const replacement =
      typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
    result = result.replaceAll(placeholder, replacement);
  }
  return result;
}

function flattenObject(
  obj: Record<string, unknown>,
  prefix = "",
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  // Also include the non-flattened version for direct access
  if (prefix === "") {
    for (const [key, value] of Object.entries(obj)) {
      result[key] = value;
    }
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  Webhook delivery manager                                          */
/* ------------------------------------------------------------------ */

export class WebhookDeliveryManager {
  private endpoints = new Map<string, WebhookEndpoint>();
  private deliveryLog: WebhookDelivery[] = [];
  private templates = new Map<string, PayloadTemplate>();
  private retryConfig: RetryConfig;
  private maxLogEntries: number;

  constructor(options?: {
    retryConfig?: Partial<RetryConfig>;
    maxLogEntries?: number;
  }) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...options?.retryConfig };
    this.maxLogEntries = options?.maxLogEntries ?? 1000;

    // Load builtin templates
    for (const t of builtinTemplates) {
      this.templates.set(t.id, t);
    }
  }

  /* -- Endpoint management -- */

  registerEndpoint(endpoint: WebhookEndpoint): void {
    this.endpoints.set(endpoint.id, endpoint);
  }

  unregisterEndpoint(id: string): void {
    this.endpoints.delete(id);
  }

  getEndpoint(id: string): WebhookEndpoint | undefined {
    return this.endpoints.get(id);
  }

  listEndpoints(): WebhookEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  updateEndpoint(
    id: string,
    updates: Partial<Omit<WebhookEndpoint, "id">>,
  ): WebhookEndpoint | null {
    const endpoint = this.endpoints.get(id);
    if (!endpoint) return null;
    const updated = { ...endpoint, ...updates };
    this.endpoints.set(id, updated);
    return updated;
  }

  /* -- Template management -- */

  registerTemplate(template: PayloadTemplate): void {
    this.templates.set(template.id, template);
  }

  getTemplate(id: string): PayloadTemplate | undefined {
    return this.templates.get(id);
  }

  listTemplates(): PayloadTemplate[] {
    return Array.from(this.templates.values());
  }

  /* -- Delivery -- */

  /**
   * Dispatch an event to all matching endpoints.
   */
  async dispatch(
    event: WebhookEventType,
    data: Record<string, unknown>,
  ): Promise<WebhookDelivery[]> {
    const matchingEndpoints = Array.from(this.endpoints.values()).filter(
      (ep) => ep.active && ep.events.includes(event),
    );

    const deliveries: WebhookDelivery[] = [];

    for (const endpoint of matchingEndpoints) {
      const delivery = await this.deliverToEndpoint(endpoint, event, data);
      deliveries.push(delivery);
    }

    return deliveries;
  }

  private async deliverToEndpoint(
    endpoint: WebhookEndpoint,
    event: WebhookEventType,
    data: Record<string, unknown>,
  ): Promise<WebhookDelivery> {
    const payload: WebhookPayload = {
      id: generateId(),
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    const delivery: WebhookDelivery = {
      id: generateId(),
      endpointId: endpoint.id,
      event,
      payload,
      status: "pending",
      attempts: [],
      createdAt: new Date().toISOString(),
      completedAt: null,
    };

    const maxRetries = endpoint.maxRetries ?? this.retryConfig.maxRetries;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = computeBackoffDelay(attempt - 1, this.retryConfig);
        await sleep(delay);
        delivery.status = "retrying";
      }

      const result = await this.sendRequest(endpoint, payload);
      delivery.attempts.push(result);

      if (result.statusCode != null && result.statusCode >= 200 && result.statusCode < 300) {
        delivery.status = "success";
        delivery.completedAt = new Date().toISOString();
        break;
      }

      if (attempt === maxRetries) {
        delivery.status = "failed";
        delivery.completedAt = new Date().toISOString();
      }
    }

    this.addToLog(delivery);
    return delivery;
  }

  private async sendRequest(
    endpoint: WebhookEndpoint,
    payload: WebhookPayload,
  ): Promise<DeliveryAttempt> {
    const startTime = Date.now();
    const attemptNumber = 1;

    // Build body
    let body: string;
    if (endpoint.templateId) {
      const template = this.templates.get(endpoint.templateId);
      if (template) {
        body = applyTemplate(template.template, {
          event: payload.event,
          timestamp: payload.timestamp,
          data: JSON.stringify(payload.data),
          summary: summarizeEvent(payload),
          ...payload.data,
        });
      } else {
        body = JSON.stringify(payload);
      }
    } else {
      body = JSON.stringify(payload);
    }

    // Compute signature
    let signature: string;
    try {
      signature = await computeHMACSignature(body, endpoint.secret);
    } catch {
      signature = "";
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Webhook-Signature": `sha256=${signature}`,
      "X-Webhook-Event": payload.event,
      "X-Webhook-Id": payload.id,
      "X-Webhook-Timestamp": payload.timestamp,
      ...(endpoint.headers ?? {}),
    };

    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(30000),
      });

      let responseBody: string | null = null;
      try {
        responseBody = await response.text();
      } catch {
        // Response body not readable
      }

      return {
        attemptNumber,
        timestamp: new Date().toISOString(),
        statusCode: response.status,
        responseBody,
        error: response.ok ? null : `HTTP ${response.status}`,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        attemptNumber,
        timestamp: new Date().toISOString(),
        statusCode: null,
        responseBody: null,
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs: Date.now() - startTime,
      };
    }
  }

  /* -- Delivery log -- */

  private addToLog(delivery: WebhookDelivery): void {
    this.deliveryLog.push(delivery);
    if (this.deliveryLog.length > this.maxLogEntries) {
      this.deliveryLog = this.deliveryLog.slice(-this.maxLogEntries);
    }
  }

  getDeliveryLog(options?: {
    endpointId?: string;
    event?: WebhookEventType;
    status?: WebhookDelivery["status"];
    limit?: number;
  }): WebhookDelivery[] {
    let log = [...this.deliveryLog];

    if (options?.endpointId) {
      log = log.filter((d) => d.endpointId === options.endpointId);
    }
    if (options?.event) {
      log = log.filter((d) => d.event === options.event);
    }
    if (options?.status) {
      log = log.filter((d) => d.status === options.status);
    }

    log.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    if (options?.limit) {
      log = log.slice(0, options.limit);
    }

    return log;
  }

  getStats(): WebhookStats {
    const stats: WebhookStats = {
      totalDeliveries: this.deliveryLog.length,
      successful: 0,
      failed: 0,
      pending: 0,
      averageLatencyMs: 0,
      endpointStats: {},
    };

    let totalLatency = 0;
    let latencyCount = 0;

    for (const delivery of this.deliveryLog) {
      switch (delivery.status) {
        case "success":
          stats.successful++;
          break;
        case "failed":
          stats.failed++;
          break;
        default:
          stats.pending++;
      }

      // Track per-endpoint stats
      if (!stats.endpointStats[delivery.endpointId]) {
        stats.endpointStats[delivery.endpointId] = {
          total: 0,
          success: 0,
          failed: 0,
        };
      }
      stats.endpointStats[delivery.endpointId].total++;
      if (delivery.status === "success") {
        stats.endpointStats[delivery.endpointId].success++;
      } else if (delivery.status === "failed") {
        stats.endpointStats[delivery.endpointId].failed++;
      }

      for (const attempt of delivery.attempts) {
        totalLatency += attempt.durationMs;
        latencyCount++;
      }
    }

    stats.averageLatencyMs =
      latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0;

    return stats;
  }

  clearLog(): void {
    this.deliveryLog = [];
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function generateId(): string {
  return `wh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function summarizeEvent(payload: WebhookPayload): string {
  const data = payload.data;
  switch (payload.event) {
    case "audit.completed":
      return `Audit completed for ${data.modelName ?? "unknown model"} with score ${data.overallScore ?? "N/A"}`;
    case "audit.failed":
      return `Audit failed for ${data.modelName ?? "unknown model"}: ${data.error ?? "unknown error"}`;
    case "drift.detected":
      return `Score drift detected: delta ${data.delta ?? "N/A"}`;
    case "anomaly.detected":
      return `Anomaly detected in ${data.metric ?? "unknown metric"}`;
    default:
      return `Event: ${payload.event}`;
  }
}
