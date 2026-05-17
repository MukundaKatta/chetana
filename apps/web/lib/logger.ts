/**
 * Structured logging with level filtering, JSON output in production,
 * and request-ID correlation.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context: string;
  timestamp: string;
  requestId?: string;
  data?: Record<string, unknown>;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");

const IS_PRODUCTION = process.env.NODE_ENV === "production";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[CURRENT_LEVEL];
}

function formatEntry(entry: LogEntry): string {
  if (IS_PRODUCTION) {
    return JSON.stringify(entry);
  }

  // Pretty print for development
  const ts = entry.timestamp.slice(11, 23); // HH:mm:ss.SSS
  const prefix = `[${ts}] ${entry.level.toUpperCase().padEnd(5)} [${entry.context}]`;
  const rid = entry.requestId ? ` rid=${entry.requestId}` : "";
  const extra = entry.data ? ` ${JSON.stringify(entry.data)}` : "";
  return `${prefix}${rid} ${entry.message}${extra}`;
}

function emit(entry: LogEntry): void {
  const formatted = formatEntry(entry);

  switch (entry.level) {
    case "debug":
      console.debug(formatted);
      break;
    case "info":
      console.info(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "error":
      console.error(formatted);
      break;
  }
}

export interface Logger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  /** Return a child logger that inherits context and carries a request ID. */
  withRequestId(requestId: string): Logger;
}

/**
 * Create a structured logger scoped to a named context.
 *
 * @param context - A short label such as "api", "auth", or a route name.
 */
export function createLogger(context: string): Logger {
  function makeLogger(requestId?: string): Logger {
    function log(
      level: LogLevel,
      message: string,
      data?: Record<string, unknown>
    ): void {
      if (!shouldLog(level)) return;

      emit({
        level,
        message,
        context,
        timestamp: new Date().toISOString(),
        requestId,
        data,
      });
    }

    return {
      debug: (msg, data) => log("debug", msg, data),
      info: (msg, data) => log("info", msg, data),
      warn: (msg, data) => log("warn", msg, data),
      error: (msg, data) => log("error", msg, data),
      withRequestId: (rid: string) => makeLogger(rid),
    };
  }

  return makeLogger();
}
