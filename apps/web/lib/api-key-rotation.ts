/**
 * API key rotation manager (Issue #370).
 * Multiple keys per provider, automatic rotation on error/expiry,
 * health check, usage tracking, expiry notifications.
 */

import type { ModelProvider } from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface APIKey {
  /** Unique key identifier. */
  id: string;
  /** The actual API key (masked for display). */
  key: string;
  /** Provider this key belongs to. */
  provider: ModelProvider;
  /** Human-readable label. */
  label: string;
  /** Key status. */
  status: "active" | "exhausted" | "expired" | "error" | "disabled";
  /** ISO timestamp when the key was added. */
  addedAt: string;
  /** ISO timestamp when the key expires (if known). */
  expiresAt: string | null;
  /** Total number of requests made with this key. */
  requestCount: number;
  /** Total tokens consumed. */
  tokensUsed: number;
  /** Number of consecutive errors. */
  consecutiveErrors: number;
  /** Last error message. */
  lastError: string | null;
  /** ISO timestamp of last successful use. */
  lastUsedAt: string | null;
  /** ISO timestamp of last health check. */
  lastHealthCheckAt: string | null;
  /** Whether the last health check passed. */
  healthCheckPassed: boolean;
  /** Rate limit remaining (if reported by API). */
  rateLimitRemaining: number | null;
  /** Rate limit reset time (ISO timestamp). */
  rateLimitResetAt: string | null;
  /** Priority for rotation (higher = preferred). */
  priority: number;
}

export interface RotationConfig {
  /** Maximum consecutive errors before marking key as error (default 3). */
  maxConsecutiveErrors: number;
  /** Cool-down period in ms after marking a key as error (default 60000). */
  errorCooldownMs: number;
  /** How often to run health checks in ms (default 300000 = 5 min). */
  healthCheckIntervalMs: number;
  /** Days before expiry to start warning (default 7). */
  expiryWarningDays: number;
  /** Callback when a key is about to expire. */
  onExpiryWarning?: (key: APIKey, daysRemaining: number) => void;
  /** Callback when a key is rotated out due to errors. */
  onKeyRotated?: (fromKey: APIKey, toKey: APIKey) => void;
  /** Callback when all keys for a provider are exhausted. */
  onAllKeysExhausted?: (provider: ModelProvider) => void;
  /** Health check function. */
  healthCheckFn?: (key: APIKey) => Promise<boolean>;
}

export interface UsageStats {
  provider: ModelProvider;
  totalRequests: number;
  totalTokens: number;
  activeKeys: number;
  exhaustedKeys: number;
  errorKeys: number;
}

export interface RotationEvent {
  type: "rotation" | "error" | "expiry" | "recovery" | "exhausted";
  provider: ModelProvider;
  keyId: string;
  message: string;
  timestamp: string;
}

const DEFAULT_CONFIG: RotationConfig = {
  maxConsecutiveErrors: 3,
  errorCooldownMs: 60_000,
  healthCheckIntervalMs: 300_000,
  expiryWarningDays: 7,
};

/* ------------------------------------------------------------------ */
/*  APIKeyRotationManager                                             */
/* ------------------------------------------------------------------ */

export class APIKeyRotationManager {
  private keys: Map<string, APIKey> = new Map();
  private config: RotationConfig;
  private events: RotationEvent[] = [];
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private cooldowns: Map<string, number> = new Map(); // keyId -> cooldown expiry timestamp

  constructor(config: Partial<RotationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /* -- Key Management ---------------------------------------------- */

  /**
   * Add an API key for a provider.
   */
  addKey(
    provider: ModelProvider,
    key: string,
    options?: {
      label?: string;
      expiresAt?: string;
      priority?: number;
    }
  ): APIKey {
    const id = `key_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const apiKey: APIKey = {
      id,
      key,
      provider,
      label: options?.label ?? `${provider}-${id.slice(-4)}`,
      status: "active",
      addedAt: new Date().toISOString(),
      expiresAt: options?.expiresAt ?? null,
      requestCount: 0,
      tokensUsed: 0,
      consecutiveErrors: 0,
      lastError: null,
      lastUsedAt: null,
      lastHealthCheckAt: null,
      healthCheckPassed: true,
      rateLimitRemaining: null,
      rateLimitResetAt: null,
      priority: options?.priority ?? 0,
    };

    this.keys.set(id, apiKey);
    return apiKey;
  }

  /**
   * Remove a key by ID.
   */
  removeKey(keyId: string): boolean {
    return this.keys.delete(keyId);
  }

  /**
   * Disable a key (exclude from rotation).
   */
  disableKey(keyId: string): void {
    const key = this.keys.get(keyId);
    if (key) {
      key.status = "disabled";
    }
  }

  /**
   * Re-enable a key.
   */
  enableKey(keyId: string): void {
    const key = this.keys.get(keyId);
    if (key) {
      key.status = "active";
      key.consecutiveErrors = 0;
    }
  }

  /**
   * Get all keys for a provider.
   */
  getKeys(provider?: ModelProvider): APIKey[] {
    const all = Array.from(this.keys.values());
    return provider ? all.filter((k) => k.provider === provider) : all;
  }

  /**
   * Mask a key for display (show first 4 and last 4 chars).
   */
  static maskKey(key: string): string {
    if (key.length <= 8) return "****";
    return `${key.slice(0, 4)}${"*".repeat(Math.max(key.length - 8, 4))}${key.slice(-4)}`;
  }

  /* -- Key Selection & Rotation ------------------------------------ */

  /**
   * Get the best available key for a provider.
   * Considers status, rate limits, priority, and cooldowns.
   */
  getActiveKey(provider: ModelProvider): APIKey | null {
    const now = Date.now();
    const candidates = this.getKeys(provider).filter((k) => {
      if (k.status !== "active") return false;

      // Check cooldown
      const cooldownExpiry = this.cooldowns.get(k.id);
      if (cooldownExpiry && now < cooldownExpiry) return false;

      // Check expiry
      if (k.expiresAt && new Date(k.expiresAt).getTime() < now) {
        k.status = "expired";
        this.addEvent("expiry", provider, k.id, `Key ${k.label} has expired`);
        return false;
      }

      // Check rate limits
      if (k.rateLimitRemaining !== null && k.rateLimitRemaining <= 0) {
        if (k.rateLimitResetAt && new Date(k.rateLimitResetAt).getTime() > now) {
          return false;
        }
      }

      return true;
    });

    if (candidates.length === 0) {
      this.config.onAllKeysExhausted?.(provider);
      return null;
    }

    // Sort by priority (desc), then by least recently used
    candidates.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
      const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
      return aTime - bTime; // Prefer least recently used
    });

    return candidates[0] ?? null;
  }

  /**
   * Record a successful API call with a key.
   */
  recordSuccess(
    keyId: string,
    tokensUsed?: number,
    rateLimitInfo?: { remaining: number; resetAt: string }
  ): void {
    const key = this.keys.get(keyId);
    if (!key) return;

    key.requestCount++;
    key.consecutiveErrors = 0;
    key.lastUsedAt = new Date().toISOString();
    if (tokensUsed) key.tokensUsed += tokensUsed;
    if (rateLimitInfo) {
      key.rateLimitRemaining = rateLimitInfo.remaining;
      key.rateLimitResetAt = rateLimitInfo.resetAt;
    }
  }

  /**
   * Record a failed API call with a key.
   * Automatically rotates if too many consecutive errors.
   */
  recordError(keyId: string, error: string): APIKey | null {
    const key = this.keys.get(keyId);
    if (!key) return null;

    key.consecutiveErrors++;
    key.lastError = error;
    key.requestCount++;

    if (key.consecutiveErrors >= this.config.maxConsecutiveErrors) {
      key.status = "error";
      this.cooldowns.set(keyId, Date.now() + this.config.errorCooldownMs);

      this.addEvent(
        "error",
        key.provider,
        keyId,
        `Key ${key.label} disabled after ${key.consecutiveErrors} consecutive errors: ${error}`
      );

      // Try to get a replacement key
      const replacement = this.getActiveKey(key.provider);
      if (replacement) {
        this.config.onKeyRotated?.(key, replacement);
        this.addEvent(
          "rotation",
          key.provider,
          replacement.id,
          `Rotated from ${key.label} to ${replacement.label}`
        );
        return replacement;
      }
    }

    return null;
  }

  /* -- Health Checks ----------------------------------------------- */

  /**
   * Run health check on a specific key.
   */
  async checkKeyHealth(keyId: string): Promise<boolean> {
    const key = this.keys.get(keyId);
    if (!key) return false;

    if (!this.config.healthCheckFn) {
      // Default: just check status
      key.lastHealthCheckAt = new Date().toISOString();
      key.healthCheckPassed = key.status === "active";
      return key.healthCheckPassed;
    }

    try {
      const passed = await this.config.healthCheckFn(key);
      key.lastHealthCheckAt = new Date().toISOString();
      key.healthCheckPassed = passed;

      if (passed && key.status === "error") {
        key.status = "active";
        key.consecutiveErrors = 0;
        this.cooldowns.delete(keyId);
        this.addEvent(
          "recovery",
          key.provider,
          keyId,
          `Key ${key.label} recovered after health check`
        );
      }

      return passed;
    } catch {
      key.lastHealthCheckAt = new Date().toISOString();
      key.healthCheckPassed = false;
      return false;
    }
  }

  /**
   * Run health checks on all keys.
   */
  async checkAllHealth(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    for (const key of this.keys.values()) {
      const passed = await this.checkKeyHealth(key.id);
      results.set(key.id, passed);
    }
    return results;
  }

  /**
   * Start periodic health checks.
   */
  startHealthChecks(): void {
    this.stopHealthChecks();
    this.healthCheckTimer = setInterval(() => {
      this.checkAllHealth().catch(() => {});
      this.checkExpiryWarnings();
    }, this.config.healthCheckIntervalMs);
  }

  /**
   * Stop periodic health checks.
   */
  stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /* -- Expiry Warnings --------------------------------------------- */

  /**
   * Check for keys that are about to expire.
   */
  checkExpiryWarnings(): void {
    const now = Date.now();
    const warningMs = this.config.expiryWarningDays * 24 * 60 * 60 * 1000;

    for (const key of this.keys.values()) {
      if (!key.expiresAt || key.status === "expired") continue;

      const expiresAt = new Date(key.expiresAt).getTime();
      const remaining = expiresAt - now;

      if (remaining <= 0) {
        key.status = "expired";
        this.addEvent(
          "expiry",
          key.provider,
          key.id,
          `Key ${key.label} has expired`
        );
      } else if (remaining <= warningMs) {
        const daysRemaining = Math.ceil(remaining / (24 * 60 * 60 * 1000));
        this.config.onExpiryWarning?.(key, daysRemaining);
      }
    }
  }

  /* -- Usage Stats ------------------------------------------------- */

  /**
   * Get usage statistics per provider.
   */
  getUsageStats(provider?: ModelProvider): UsageStats[] {
    const providers = provider
      ? [provider]
      : [...new Set(Array.from(this.keys.values()).map((k) => k.provider))];

    return providers.map((p) => {
      const keys = this.getKeys(p);
      return {
        provider: p,
        totalRequests: keys.reduce((s, k) => s + k.requestCount, 0),
        totalTokens: keys.reduce((s, k) => s + k.tokensUsed, 0),
        activeKeys: keys.filter((k) => k.status === "active").length,
        exhaustedKeys: keys.filter((k) => k.status === "exhausted").length,
        errorKeys: keys.filter((k) => k.status === "error").length,
      };
    });
  }

  /* -- Events ------------------------------------------------------ */

  private addEvent(
    type: RotationEvent["type"],
    provider: ModelProvider,
    keyId: string,
    message: string
  ): void {
    this.events.push({
      type,
      provider,
      keyId,
      message,
      timestamp: new Date().toISOString(),
    });

    // Keep last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  /**
   * Get rotation events.
   */
  getEvents(filter?: {
    provider?: ModelProvider;
    type?: RotationEvent["type"];
    since?: string;
  }): RotationEvent[] {
    let results = this.events;
    if (filter?.provider) {
      results = results.filter((e) => e.provider === filter.provider);
    }
    if (filter?.type) {
      results = results.filter((e) => e.type === filter.type);
    }
    if (filter?.since) {
      results = results.filter((e) => e.timestamp >= filter.since!);
    }
    return results;
  }

  /* -- Cleanup ----------------------------------------------------- */

  /**
   * Dispose all resources.
   */
  dispose(): void {
    this.stopHealthChecks();
    this.keys.clear();
    this.cooldowns.clear();
    this.events = [];
  }
}
