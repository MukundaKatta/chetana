/**
 * API connection pool manager (Issue #482).
 * Per-provider pools, configurable size/timeout,
 * health monitoring, pool statistics, graceful drain.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type ConnectionState = "idle" | "active" | "draining" | "closed";

export interface PoolConfig {
  /** Maximum number of connections in the pool (default 10). */
  maxSize: number;
  /** Minimum idle connections to maintain (default 2). */
  minIdle: number;
  /** Connection timeout in ms (default 30000). */
  connectionTimeoutMs: number;
  /** Idle timeout before connection is released in ms (default 60000). */
  idleTimeoutMs: number;
  /** Health check interval in ms (default 30000). */
  healthCheckIntervalMs: number;
  /** Maximum number of times to retry acquiring a connection (default 3). */
  maxRetries: number;
  /** Time to wait before retrying in ms (default 1000). */
  retryDelayMs: number;
}

export interface PoolConnection<T = unknown> {
  id: string;
  provider: string;
  client: T;
  state: ConnectionState;
  createdAt: number;
  lastUsedAt: number;
  lastHealthCheckAt: number;
  healthy: boolean;
  requestCount: number;
}

export interface PoolStats {
  provider: string;
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  drainingConnections: number;
  closedConnections: number;
  totalRequestsServed: number;
  averageAcquireTimeMs: number;
  healthyConnections: number;
  unhealthyConnections: number;
  poolUtilizationPercent: number;
  oldestConnectionAgeMs: number;
  config: PoolConfig;
}

export interface HealthCheckResult {
  provider: string;
  connectionId: string;
  healthy: boolean;
  latencyMs: number;
  timestamp: string;
  error?: string;
}

export interface PoolEvent {
  type:
    | "connection_created"
    | "connection_acquired"
    | "connection_released"
    | "connection_closed"
    | "connection_health_check"
    | "pool_drain_started"
    | "pool_drain_completed"
    | "acquire_timeout"
    | "acquire_retry";
  provider: string;
  connectionId?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface ConnectionFactory<T> {
  create(provider: string): Promise<T>;
  destroy(client: T): Promise<void>;
  validate(client: T): Promise<boolean>;
}

/* ------------------------------------------------------------------ */
/*  Default configuration                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_CONFIG: PoolConfig = {
  maxSize: 10,
  minIdle: 2,
  connectionTimeoutMs: 30_000,
  idleTimeoutMs: 60_000,
  healthCheckIntervalMs: 30_000,
  maxRetries: 3,
  retryDelayMs: 1_000,
};

/* ------------------------------------------------------------------ */
/*  Connection Pool                                                   */
/* ------------------------------------------------------------------ */

export class ConnectionPool<T = unknown> {
  private readonly provider: string;
  private readonly config: PoolConfig;
  private readonly factory: ConnectionFactory<T>;
  private readonly connections: Map<string, PoolConnection<T>> = new Map();
  private readonly events: PoolEvent[] = [];
  private readonly acquireTimes: number[] = [];
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private idleCheckTimer: ReturnType<typeof setInterval> | null = null;
  private draining = false;

  constructor(
    provider: string,
    factory: ConnectionFactory<T>,
    config?: Partial<PoolConfig>
  ) {
    this.provider = provider;
    this.factory = factory;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /* -- Lifecycle ---------------------------------------------------- */

  async initialize(): Promise<void> {
    // Pre-create minimum idle connections
    const createPromises: Promise<void>[] = [];
    for (let i = 0; i < this.config.minIdle; i++) {
      createPromises.push(this.createConnection().then(() => undefined));
    }
    await Promise.all(createPromises);

    // Start health check and idle check timers
    this.healthCheckTimer = setInterval(
      () => void this.runHealthChecks(),
      this.config.healthCheckIntervalMs
    );
    this.idleCheckTimer = setInterval(
      () => void this.evictIdleConnections(),
      this.config.idleTimeoutMs
    );
  }

  async drain(): Promise<void> {
    this.draining = true;
    this.emit("pool_drain_started");

    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
    if (this.idleCheckTimer) clearInterval(this.idleCheckTimer);

    // Mark all idle connections for draining
    for (const conn of this.connections.values()) {
      if (conn.state === "idle") {
        conn.state = "draining";
      }
    }

    // Wait for active connections to be released, then close all
    const drainStart = Date.now();
    const timeout = this.config.connectionTimeoutMs;

    while (Date.now() - drainStart < timeout) {
      const active = this.getConnectionsByState("active");
      if (active.length === 0) break;
      await sleep(100);
    }

    // Force close remaining
    const closePromises: Promise<void>[] = [];
    for (const conn of this.connections.values()) {
      closePromises.push(this.destroyConnection(conn));
    }
    await Promise.allSettled(closePromises);

    this.connections.clear();
    this.draining = false;
    this.emit("pool_drain_completed");
  }

  /* -- Acquire / Release -------------------------------------------- */

  async acquire(): Promise<PoolConnection<T>> {
    if (this.draining) {
      throw new Error(`Pool for "${this.provider}" is draining; cannot acquire.`);
    }

    const start = Date.now();

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      // Try to find an idle, healthy connection
      for (const conn of this.connections.values()) {
        if (conn.state === "idle" && conn.healthy) {
          conn.state = "active";
          conn.lastUsedAt = Date.now();
          conn.requestCount++;
          this.recordAcquireTime(Date.now() - start);
          this.emit("connection_acquired", conn.id);
          return conn;
        }
      }

      // Try to create a new connection if under max
      if (this.connections.size < this.config.maxSize) {
        try {
          const conn = await this.createConnection();
          conn.state = "active";
          conn.lastUsedAt = Date.now();
          conn.requestCount++;
          this.recordAcquireTime(Date.now() - start);
          this.emit("connection_acquired", conn.id);
          return conn;
        } catch {
          // Fall through to retry
        }
      }

      // Check timeout
      if (Date.now() - start > this.config.connectionTimeoutMs) {
        this.emit("acquire_timeout");
        throw new Error(
          `Timed out acquiring connection from pool "${this.provider}" after ${this.config.connectionTimeoutMs}ms.`
        );
      }

      // Retry after delay
      if (attempt < this.config.maxRetries) {
        this.emit("acquire_retry", undefined, { attempt: attempt + 1 });
        await sleep(this.config.retryDelayMs);
      }
    }

    throw new Error(
      `Failed to acquire connection from pool "${this.provider}" after ${this.config.maxRetries} retries.`
    );
  }

  release(connection: PoolConnection<T>): void {
    const conn = this.connections.get(connection.id);
    if (!conn) return;

    if (this.draining) {
      void this.destroyConnection(conn);
      return;
    }

    conn.state = "idle";
    conn.lastUsedAt = Date.now();
    this.emit("connection_released", conn.id);
  }

  /**
   * Execute a function with an acquired connection, automatically releasing it afterward.
   */
  async withConnection<R>(fn: (client: T) => Promise<R>): Promise<R> {
    const conn = await this.acquire();
    try {
      return await fn(conn.client);
    } finally {
      this.release(conn);
    }
  }

  /* -- Health checks ------------------------------------------------ */

  async runHealthChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    for (const conn of this.connections.values()) {
      if (conn.state === "closed") continue;

      const start = Date.now();
      try {
        const healthy = await this.factory.validate(conn.client);
        const latencyMs = Date.now() - start;

        conn.healthy = healthy;
        conn.lastHealthCheckAt = Date.now();

        results.push({
          provider: this.provider,
          connectionId: conn.id,
          healthy,
          latencyMs,
          timestamp: new Date().toISOString(),
        });

        this.emit("connection_health_check", conn.id, { healthy, latencyMs });

        // Replace unhealthy idle connections
        if (!healthy && conn.state === "idle") {
          await this.destroyConnection(conn);
          if (this.getConnectionsByState("idle").length < this.config.minIdle) {
            await this.createConnection();
          }
        }
      } catch (err) {
        const latencyMs = Date.now() - start;
        conn.healthy = false;
        conn.lastHealthCheckAt = Date.now();

        results.push({
          provider: this.provider,
          connectionId: conn.id,
          healthy: false,
          latencyMs,
          timestamp: new Date().toISOString(),
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return results;
  }

  /* -- Statistics --------------------------------------------------- */

  getStats(): PoolStats {
    const now = Date.now();
    const conns = Array.from(this.connections.values());
    const active = conns.filter((c) => c.state === "active");
    const idle = conns.filter((c) => c.state === "idle");
    const draining = conns.filter((c) => c.state === "draining");
    const closed = conns.filter((c) => c.state === "closed");
    const healthy = conns.filter((c) => c.healthy);

    const totalServed = conns.reduce((s, c) => s + c.requestCount, 0);
    const avgAcquire =
      this.acquireTimes.length > 0
        ? this.acquireTimes.reduce((a, b) => a + b, 0) / this.acquireTimes.length
        : 0;

    const oldest = conns.reduce(
      (min, c) => Math.min(min, c.createdAt),
      now
    );

    return {
      provider: this.provider,
      totalConnections: conns.length,
      activeConnections: active.length,
      idleConnections: idle.length,
      drainingConnections: draining.length,
      closedConnections: closed.length,
      totalRequestsServed: totalServed,
      averageAcquireTimeMs: Math.round(avgAcquire * 100) / 100,
      healthyConnections: healthy.length,
      unhealthyConnections: conns.length - healthy.length,
      poolUtilizationPercent:
        conns.length > 0
          ? Math.round((active.length / this.config.maxSize) * 10_000) / 100
          : 0,
      oldestConnectionAgeMs: conns.length > 0 ? now - oldest : 0,
      config: { ...this.config },
    };
  }

  getEvents(): readonly PoolEvent[] {
    return this.events;
  }

  /* -- Internal helpers --------------------------------------------- */

  private async createConnection(): Promise<PoolConnection<T>> {
    const client = await this.factory.create(this.provider);
    const now = Date.now();
    const conn: PoolConnection<T> = {
      id: `conn_${now}_${Math.random().toString(36).slice(2, 8)}`,
      provider: this.provider,
      client,
      state: "idle",
      createdAt: now,
      lastUsedAt: now,
      lastHealthCheckAt: now,
      healthy: true,
      requestCount: 0,
    };

    this.connections.set(conn.id, conn);
    this.emit("connection_created", conn.id);
    return conn;
  }

  private async destroyConnection(conn: PoolConnection<T>): Promise<void> {
    conn.state = "closed";
    try {
      await this.factory.destroy(conn.client);
    } finally {
      this.connections.delete(conn.id);
      this.emit("connection_closed", conn.id);
    }
  }

  private getConnectionsByState(state: ConnectionState): PoolConnection<T>[] {
    return Array.from(this.connections.values()).filter(
      (c) => c.state === state
    );
  }

  private async evictIdleConnections(): Promise<void> {
    const now = Date.now();
    const idleConns = this.getConnectionsByState("idle");
    const surplus = idleConns.length - this.config.minIdle;

    if (surplus <= 0) return;

    // Sort by last used (oldest first) and evict surplus
    const sorted = idleConns.sort((a, b) => a.lastUsedAt - b.lastUsedAt);
    let evicted = 0;

    for (const conn of sorted) {
      if (evicted >= surplus) break;
      if (now - conn.lastUsedAt > this.config.idleTimeoutMs) {
        await this.destroyConnection(conn);
        evicted++;
      }
    }
  }

  private recordAcquireTime(ms: number): void {
    this.acquireTimes.push(ms);
    // Keep only last 100 measurements
    if (this.acquireTimes.length > 100) {
      this.acquireTimes.shift();
    }
  }

  private emit(
    type: PoolEvent["type"],
    connectionId?: string,
    details?: Record<string, unknown>
  ): void {
    this.events.push({
      type,
      provider: this.provider,
      connectionId,
      timestamp: new Date().toISOString(),
      details,
    });

    // Keep events bounded
    if (this.events.length > 1000) {
      this.events.splice(0, this.events.length - 1000);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Pool Manager (per-provider)                                       */
/* ------------------------------------------------------------------ */

export class ConnectionPoolManager<T = unknown> {
  private readonly pools: Map<string, ConnectionPool<T>> = new Map();
  private readonly factory: ConnectionFactory<T>;
  private readonly defaultConfig: Partial<PoolConfig>;

  constructor(
    factory: ConnectionFactory<T>,
    defaultConfig?: Partial<PoolConfig>
  ) {
    this.factory = factory;
    this.defaultConfig = defaultConfig ?? {};
  }

  async getPool(
    provider: string,
    config?: Partial<PoolConfig>
  ): Promise<ConnectionPool<T>> {
    const existing = this.pools.get(provider);
    if (existing) return existing;

    const pool = new ConnectionPool<T>(provider, this.factory, {
      ...this.defaultConfig,
      ...config,
    });
    await pool.initialize();
    this.pools.set(provider, pool);
    return pool;
  }

  hasPool(provider: string): boolean {
    return this.pools.has(provider);
  }

  getAllStats(): PoolStats[] {
    return Array.from(this.pools.values()).map((p) => p.getStats());
  }

  async drainAll(): Promise<void> {
    const drainPromises = Array.from(this.pools.values()).map((p) => p.drain());
    await Promise.allSettled(drainPromises);
    this.pools.clear();
  }

  async drainProvider(provider: string): Promise<void> {
    const pool = this.pools.get(provider);
    if (pool) {
      await pool.drain();
      this.pools.delete(provider);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Utility                                                           */
/* ------------------------------------------------------------------ */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
