/**
 * Structured logging (Issue #461).
 * Levels (trace -> fatal), JSON format with metadata,
 * correlation ID attachment, aggregation/search, retention policies.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  trace: 0,
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  /** Correlation ID linking related operations. */
  correlationId?: string;
  /** Arbitrary structured metadata. */
  metadata?: Record<string, unknown>;
  /** Source module / component name. */
  source?: string;
  /** Error stack trace (if applicable). */
  stack?: string;
  /** Numeric priority for the level. */
  priority: number;
}

export interface RetentionPolicy {
  /** Max number of log entries to keep in memory. */
  maxEntries: number;
  /** Max age in ms after which entries are pruned. */
  maxAgeMs: number;
  /** Levels to retain (default: all). */
  retainLevels?: LogLevel[];
}

export interface LogTransport {
  /** Name of the transport. */
  name: string;
  /** Minimum level this transport accepts. */
  minLevel: LogLevel;
  /** Write a log entry. */
  write: (entry: LogEntry) => void;
}

export interface LogSearchCriteria {
  level?: LogLevel;
  minLevel?: LogLevel;
  source?: string;
  correlationId?: string;
  messagePattern?: string | RegExp;
  from?: Date;
  to?: Date;
  metadataKey?: string;
  metadataValue?: unknown;
}

export interface LogAggregation {
  totalEntries: number;
  byLevel: Record<LogLevel, number>;
  bySource: Record<string, number>;
  byCorrelationId: Record<string, number>;
  errorsPerMinute: number;
  oldestEntry: string | null;
  newestEntry: string | null;
}

/* ------------------------------------------------------------------ */
/*  Console transport                                                 */
/* ------------------------------------------------------------------ */

export const consoleTransport: LogTransport = {
  name: "console",
  minLevel: "debug",
  write(entry) {
    const json = JSON.stringify(entry, null, 0);
    switch (entry.level) {
      case "trace":
      case "debug":
        console.debug(json);
        break;
      case "info":
        console.info(json);
        break;
      case "warn":
        console.warn(json);
        break;
      case "error":
      case "fatal":
        console.error(json);
        break;
    }
  },
};

/* ------------------------------------------------------------------ */
/*  Structured Logger                                                 */
/* ------------------------------------------------------------------ */

export class StructuredLogger {
  private entries: LogEntry[] = [];
  private transports: LogTransport[] = [];
  private retentionPolicy: RetentionPolicy;
  private defaultCorrelationId?: string;
  private defaultSource?: string;
  private defaultMetadata: Record<string, unknown> = {};

  constructor(options?: {
    source?: string;
    correlationId?: string;
    transports?: LogTransport[];
    retention?: Partial<RetentionPolicy>;
    metadata?: Record<string, unknown>;
  }) {
    this.defaultSource = options?.source;
    this.defaultCorrelationId = options?.correlationId;
    this.defaultMetadata = options?.metadata ?? {};
    this.transports = options?.transports ?? [consoleTransport];
    this.retentionPolicy = {
      maxEntries: options?.retention?.maxEntries ?? 10_000,
      maxAgeMs: options?.retention?.maxAgeMs ?? 24 * 60 * 60 * 1000, // 24h
      retainLevels: options?.retention?.retainLevels,
    };
  }

  /** Create a child logger that inherits config but overrides source/correlationId. */
  child(overrides: {
    source?: string;
    correlationId?: string;
    metadata?: Record<string, unknown>;
  }): StructuredLogger {
    const child = new StructuredLogger({
      source: overrides.source ?? this.defaultSource,
      correlationId: overrides.correlationId ?? this.defaultCorrelationId,
      transports: this.transports,
      retention: this.retentionPolicy,
      metadata: { ...this.defaultMetadata, ...(overrides.metadata ?? {}) },
    });
    // Share the same entries store for central search
    child.entries = this.entries;
    return child;
  }

  /** Set the correlation ID for subsequent log entries. */
  setCorrelationId(id: string): void {
    this.defaultCorrelationId = id;
  }

  /** Add a transport. */
  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  /* ---- Logging methods ---- */

  trace(message: string, metadata?: Record<string, unknown>): void {
    this.log("trace", message, metadata);
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log("debug", message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log("info", message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log("warn", message, metadata);
  }

  error(
    message: string,
    errorOrMeta?: Error | Record<string, unknown>,
  ): void {
    const meta: Record<string, unknown> = {};
    let stack: string | undefined;
    if (errorOrMeta instanceof Error) {
      meta.errorName = errorOrMeta.name;
      meta.errorMessage = errorOrMeta.message;
      stack = errorOrMeta.stack;
    } else if (errorOrMeta) {
      Object.assign(meta, errorOrMeta);
    }
    this.log("error", message, meta, stack);
  }

  fatal(
    message: string,
    errorOrMeta?: Error | Record<string, unknown>,
  ): void {
    const meta: Record<string, unknown> = {};
    let stack: string | undefined;
    if (errorOrMeta instanceof Error) {
      meta.errorName = errorOrMeta.name;
      meta.errorMessage = errorOrMeta.message;
      stack = errorOrMeta.stack;
    } else if (errorOrMeta) {
      Object.assign(meta, errorOrMeta);
    }
    this.log("fatal", message, meta, stack);
  }

  /* ---- Core log method ---- */

  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    stack?: string,
  ): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      correlationId: this.defaultCorrelationId,
      source: this.defaultSource,
      metadata: { ...this.defaultMetadata, ...(metadata ?? {}) },
      stack,
      priority: LOG_LEVEL_PRIORITY[level],
    };

    this.entries.push(entry);
    this.enforceRetention();

    // Dispatch to transports
    for (const transport of this.transports) {
      if (LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[transport.minLevel]) {
        try {
          transport.write(entry);
        } catch {
          // Transport failures must not propagate
        }
      }
    }
  }

  /* ---- Retention ---- */

  private enforceRetention(): void {
    const { maxEntries, maxAgeMs, retainLevels } = this.retentionPolicy;
    const now = Date.now();

    // Prune by age
    this.entries = this.entries.filter((e) => {
      const age = now - new Date(e.timestamp).getTime();
      if (age > maxAgeMs) return false;
      if (retainLevels && !retainLevels.includes(e.level)) return false;
      return true;
    });

    // Prune by count
    if (this.entries.length > maxEntries) {
      this.entries = this.entries.slice(this.entries.length - maxEntries);
    }
  }

  /* ---- Search / aggregation ---- */

  search(criteria: LogSearchCriteria): LogEntry[] {
    return this.entries.filter((entry) => {
      if (criteria.level && entry.level !== criteria.level) return false;

      if (
        criteria.minLevel &&
        LOG_LEVEL_PRIORITY[entry.level] <
          LOG_LEVEL_PRIORITY[criteria.minLevel]
      )
        return false;

      if (criteria.source && entry.source !== criteria.source) return false;

      if (
        criteria.correlationId &&
        entry.correlationId !== criteria.correlationId
      )
        return false;

      if (criteria.messagePattern) {
        const pattern =
          typeof criteria.messagePattern === "string"
            ? new RegExp(criteria.messagePattern, "i")
            : criteria.messagePattern;
        if (!pattern.test(entry.message)) return false;
      }

      if (criteria.from) {
        if (new Date(entry.timestamp) < criteria.from) return false;
      }
      if (criteria.to) {
        if (new Date(entry.timestamp) > criteria.to) return false;
      }

      if (criteria.metadataKey && entry.metadata) {
        if (!(criteria.metadataKey in entry.metadata)) return false;
        if (
          criteria.metadataValue !== undefined &&
          entry.metadata[criteria.metadataKey] !== criteria.metadataValue
        )
          return false;
      }

      return true;
    });
  }

  aggregate(): LogAggregation {
    const byLevel = {} as Record<LogLevel, number>;
    const bySource: Record<string, number> = {};
    const byCorrelationId: Record<string, number> = {};
    const levels: LogLevel[] = [
      "trace",
      "debug",
      "info",
      "warn",
      "error",
      "fatal",
    ];
    for (const l of levels) byLevel[l] = 0;

    let errorsLastMinute = 0;
    const oneMinuteAgo = Date.now() - 60_000;

    for (const entry of this.entries) {
      byLevel[entry.level]++;

      if (entry.source) {
        bySource[entry.source] = (bySource[entry.source] ?? 0) + 1;
      }
      if (entry.correlationId) {
        byCorrelationId[entry.correlationId] =
          (byCorrelationId[entry.correlationId] ?? 0) + 1;
      }
      if (
        (entry.level === "error" || entry.level === "fatal") &&
        new Date(entry.timestamp).getTime() > oneMinuteAgo
      ) {
        errorsLastMinute++;
      }
    }

    return {
      totalEntries: this.entries.length,
      byLevel,
      bySource,
      byCorrelationId,
      errorsPerMinute: errorsLastMinute,
      oldestEntry: this.entries.length > 0 ? this.entries[0].timestamp : null,
      newestEntry:
        this.entries.length > 0
          ? this.entries[this.entries.length - 1].timestamp
          : null,
    };
  }

  /** Get all stored entries (for export). */
  getEntries(): readonly LogEntry[] {
    return this.entries;
  }

  /** Clear all stored entries. */
  clear(): void {
    this.entries = [];
  }
}

/* ------------------------------------------------------------------ */
/*  Singleton for app-wide use                                        */
/* ------------------------------------------------------------------ */

let _globalLogger: StructuredLogger | null = null;

export function getLogger(source?: string): StructuredLogger {
  if (!_globalLogger) {
    _globalLogger = new StructuredLogger({ source: "app" });
  }
  if (source) {
    return _globalLogger.child({ source });
  }
  return _globalLogger;
}

/** Generate a unique correlation ID. */
export function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${timestamp}-${random}`;
}
