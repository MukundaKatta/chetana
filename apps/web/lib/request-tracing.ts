/**
 * Request tracing with correlation IDs (Issue #446).
 * Generates unique correlation IDs per request chain, propagates them
 * through downstream calls, and provides a trace viewer with waterfall
 * visualization and per-span performance breakdown.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface Span {
  /** Unique span identifier. */
  spanId: string;
  /** Parent span ID (null for root spans). */
  parentSpanId: string | null;
  /** Correlation ID this span belongs to. */
  correlationId: string;
  /** Human-readable operation name. */
  operationName: string;
  /** Service or component that owns this span. */
  serviceName: string;
  /** Start time as ISO timestamp. */
  startTime: string;
  /** End time as ISO timestamp (null if still active). */
  endTime: string | null;
  /** Duration in milliseconds (null if still active). */
  durationMs: number | null;
  /** Span status. */
  status: SpanStatus;
  /** Key-value metadata. */
  attributes: Record<string, string | number | boolean>;
  /** Log entries within this span. */
  logs: SpanLog[];
}

export type SpanStatus = "ok" | "error" | "timeout" | "in_progress";

export interface SpanLog {
  /** ISO timestamp. */
  timestamp: string;
  /** Log level. */
  level: "debug" | "info" | "warn" | "error";
  /** Log message. */
  message: string;
  /** Optional structured data. */
  data?: Record<string, unknown>;
}

export interface Trace {
  /** The correlation ID for this trace. */
  correlationId: string;
  /** All spans in this trace, ordered by start time. */
  spans: Span[];
  /** Trace-level metadata. */
  metadata: Record<string, string | number | boolean>;
  /** ISO timestamp of trace start. */
  startTime: string;
  /** ISO timestamp of trace end (last span to complete). */
  endTime: string | null;
  /** Total duration in ms. */
  totalDurationMs: number | null;
}

export interface WaterfallRow {
  span: Span;
  /** Indentation depth (0 for root). */
  depth: number;
  /** Offset from trace start in ms. */
  offsetMs: number;
  /** Duration in ms. */
  durationMs: number;
  /** Fraction of total trace duration (0-1). */
  fraction: number;
  /** Offset fraction (0-1). */
  offsetFraction: number;
}

export interface PerformanceBreakdown {
  correlationId: string;
  totalDurationMs: number;
  spanCount: number;
  /** Breakdown by service. */
  byService: Array<{
    serviceName: string;
    totalMs: number;
    spanCount: number;
    averageMs: number;
    percentOfTotal: number;
  }>;
  /** Critical path (longest chain of dependent spans). */
  criticalPath: Span[];
  /** Spans sorted by duration (slowest first). */
  slowestSpans: Span[];
}

/* ------------------------------------------------------------------ */
/*  ID generation                                                     */
/* ------------------------------------------------------------------ */

/**
 * Generate a unique correlation ID.
 */
export function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `trace_${timestamp}_${random}`;
}

/**
 * Generate a unique span ID.
 */
export function generateSpanId(): string {
  const random = Math.random().toString(36).slice(2, 14);
  return `span_${random}`;
}

/* ------------------------------------------------------------------ */
/*  Header propagation                                                */
/* ------------------------------------------------------------------ */

const CORRELATION_HEADER = "x-correlation-id";
const SPAN_HEADER = "x-span-id";

/**
 * Extract tracing headers from an incoming request.
 */
export function extractTraceHeaders(
  headers: Record<string, string | string[] | undefined>,
): { correlationId: string; parentSpanId: string | null } {
  const rawCorrelation = headers[CORRELATION_HEADER];
  const correlationId =
    (Array.isArray(rawCorrelation) ? rawCorrelation[0] : rawCorrelation) ??
    generateCorrelationId();

  const rawSpan = headers[SPAN_HEADER];
  const parentSpanId =
    (Array.isArray(rawSpan) ? rawSpan[0] : rawSpan) ?? null;

  return { correlationId, parentSpanId };
}

/**
 * Build tracing headers for a downstream request.
 */
export function buildTraceHeaders(
  correlationId: string,
  spanId: string,
): Record<string, string> {
  return {
    [CORRELATION_HEADER]: correlationId,
    [SPAN_HEADER]: spanId,
  };
}

/* ------------------------------------------------------------------ */
/*  Trace store                                                       */
/* ------------------------------------------------------------------ */

export class TraceStore {
  private traces = new Map<string, Trace>();
  private maxTraces: number;

  constructor(maxTraces: number = 1000) {
    this.maxTraces = maxTraces;
  }

  /**
   * Start a new trace.
   */
  startTrace(
    correlationId: string,
    metadata: Record<string, string | number | boolean> = {},
  ): Trace {
    const trace: Trace = {
      correlationId,
      spans: [],
      metadata,
      startTime: new Date().toISOString(),
      endTime: null,
      totalDurationMs: null,
    };

    this.traces.set(correlationId, trace);
    this.evictOldTraces();

    return trace;
  }

  /**
   * Start a new span within a trace.
   */
  startSpan(
    correlationId: string,
    operationName: string,
    serviceName: string,
    parentSpanId: string | null = null,
    attributes: Record<string, string | number | boolean> = {},
  ): Span {
    const span: Span = {
      spanId: generateSpanId(),
      parentSpanId,
      correlationId,
      operationName,
      serviceName,
      startTime: new Date().toISOString(),
      endTime: null,
      durationMs: null,
      status: "in_progress",
      attributes,
      logs: [],
    };

    let trace = this.traces.get(correlationId);
    if (!trace) {
      trace = this.startTrace(correlationId);
    }
    trace.spans.push(span);

    return span;
  }

  /**
   * End a span and compute its duration.
   */
  endSpan(
    correlationId: string,
    spanId: string,
    status: SpanStatus = "ok",
  ): Span | null {
    const trace = this.traces.get(correlationId);
    if (!trace) return null;

    const span = trace.spans.find((s) => s.spanId === spanId);
    if (!span) return null;

    span.endTime = new Date().toISOString();
    span.durationMs =
      new Date(span.endTime).getTime() -
      new Date(span.startTime).getTime();
    span.status = status;

    // Update trace end time
    this.updateTraceEnd(trace);

    return span;
  }

  /**
   * Add a log entry to a span.
   */
  addLog(
    correlationId: string,
    spanId: string,
    level: SpanLog["level"],
    message: string,
    data?: Record<string, unknown>,
  ): void {
    const trace = this.traces.get(correlationId);
    if (!trace) return;

    const span = trace.spans.find((s) => s.spanId === spanId);
    if (!span) return;

    span.logs.push({
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    });
  }

  /**
   * Retrieve a trace by correlation ID.
   */
  getTrace(correlationId: string): Trace | null {
    return this.traces.get(correlationId) ?? null;
  }

  /**
   * Get all stored traces.
   */
  getAllTraces(): Trace[] {
    return Array.from(this.traces.values()).sort(
      (a, b) =>
        new Date(b.startTime).getTime() -
        new Date(a.startTime).getTime(),
    );
  }

  /**
   * Generate waterfall rows for a trace viewer.
   */
  buildWaterfall(correlationId: string): WaterfallRow[] {
    const trace = this.traces.get(correlationId);
    if (!trace || trace.spans.length === 0) return [];

    const traceStart = new Date(trace.startTime).getTime();
    const totalDuration = trace.totalDurationMs ?? 1;

    // Build tree structure
    const childMap = new Map<string | null, Span[]>();
    for (const span of trace.spans) {
      const parentKey = span.parentSpanId;
      if (!childMap.has(parentKey)) {
        childMap.set(parentKey, []);
      }
      childMap.get(parentKey)!.push(span);
    }

    // DFS to produce rows in visual order
    const rows: WaterfallRow[] = [];

    const visit = (spanId: string | null, depth: number) => {
      const children = childMap.get(spanId) ?? [];
      children.sort(
        (a, b) =>
          new Date(a.startTime).getTime() -
          new Date(b.startTime).getTime(),
      );

      for (const span of children) {
        const offsetMs =
          new Date(span.startTime).getTime() - traceStart;
        const durationMs = span.durationMs ?? 0;

        rows.push({
          span,
          depth,
          offsetMs,
          durationMs,
          fraction: totalDuration > 0 ? durationMs / totalDuration : 0,
          offsetFraction:
            totalDuration > 0 ? offsetMs / totalDuration : 0,
        });

        visit(span.spanId, depth + 1);
      }
    };

    visit(null, 0);

    // If no root spans found (all have parents not in trace), fall back to flat list
    if (rows.length === 0) {
      for (const span of trace.spans) {
        const offsetMs =
          new Date(span.startTime).getTime() - traceStart;
        const durationMs = span.durationMs ?? 0;
        rows.push({
          span,
          depth: 0,
          offsetMs,
          durationMs,
          fraction: totalDuration > 0 ? durationMs / totalDuration : 0,
          offsetFraction:
            totalDuration > 0 ? offsetMs / totalDuration : 0,
        });
      }
    }

    return rows;
  }

  /**
   * Compute performance breakdown for a trace.
   */
  getPerformanceBreakdown(
    correlationId: string,
  ): PerformanceBreakdown | null {
    const trace = this.traces.get(correlationId);
    if (!trace) return null;

    const totalDuration = trace.totalDurationMs ?? 0;
    const completedSpans = trace.spans.filter(
      (s) => s.durationMs !== null,
    );

    // Group by service
    const serviceMap = new Map<
      string,
      { totalMs: number; spanCount: number }
    >();
    for (const span of completedSpans) {
      const entry = serviceMap.get(span.serviceName) ?? {
        totalMs: 0,
        spanCount: 0,
      };
      entry.totalMs += span.durationMs!;
      entry.spanCount++;
      serviceMap.set(span.serviceName, entry);
    }

    const byService = [...serviceMap.entries()]
      .map(([serviceName, { totalMs, spanCount }]) => ({
        serviceName,
        totalMs,
        spanCount,
        averageMs: spanCount > 0 ? totalMs / spanCount : 0,
        percentOfTotal:
          totalDuration > 0 ? (totalMs / totalDuration) * 100 : 0,
      }))
      .sort((a, b) => b.totalMs - a.totalMs);

    // Critical path: find the longest sequential chain
    const criticalPath = this.findCriticalPath(trace);

    // Slowest spans
    const slowestSpans = [...completedSpans]
      .sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0))
      .slice(0, 10);

    return {
      correlationId,
      totalDurationMs: totalDuration,
      spanCount: trace.spans.length,
      byService,
      criticalPath,
      slowestSpans,
    };
  }

  /* ---------------------------------------------------------------- */
  /*  Internal helpers                                                */
  /* ---------------------------------------------------------------- */

  private updateTraceEnd(trace: Trace): void {
    let maxEnd = 0;
    for (const span of trace.spans) {
      if (span.endTime) {
        const endMs = new Date(span.endTime).getTime();
        if (endMs > maxEnd) maxEnd = endMs;
      }
    }

    if (maxEnd > 0) {
      trace.endTime = new Date(maxEnd).toISOString();
      trace.totalDurationMs =
        maxEnd - new Date(trace.startTime).getTime();
    }
  }

  private findCriticalPath(trace: Trace): Span[] {
    // Build adjacency: parent -> children
    const childMap = new Map<string | null, Span[]>();
    for (const span of trace.spans) {
      const key = span.parentSpanId;
      if (!childMap.has(key)) childMap.set(key, []);
      childMap.get(key)!.push(span);
    }

    // Find the path with the greatest total duration
    let bestPath: Span[] = [];
    let bestDuration = 0;

    const dfs = (parentId: string | null, path: Span[], totalMs: number) => {
      const children = childMap.get(parentId) ?? [];
      if (children.length === 0) {
        if (totalMs > bestDuration) {
          bestDuration = totalMs;
          bestPath = [...path];
        }
        return;
      }
      for (const child of children) {
        dfs(child.spanId, [...path, child], totalMs + (child.durationMs ?? 0));
      }
    };

    dfs(null, [], 0);

    // Fallback: if no tree structure, return sorted by duration
    if (bestPath.length === 0 && trace.spans.length > 0) {
      bestPath = [...trace.spans]
        .filter((s) => s.durationMs !== null)
        .sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0))
        .slice(0, 5);
    }

    return bestPath;
  }

  private evictOldTraces(): void {
    if (this.traces.size <= this.maxTraces) return;

    const sorted = [...this.traces.entries()].sort(
      (a, b) =>
        new Date(a[1].startTime).getTime() -
        new Date(b[1].startTime).getTime(),
    );

    const toRemove = sorted.length - this.maxTraces;
    for (let i = 0; i < toRemove; i++) {
      this.traces.delete(sorted[i][0]);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Singleton & convenience                                           */
/* ------------------------------------------------------------------ */

let _store: TraceStore | null = null;

export function getTraceStore(): TraceStore {
  if (!_store) {
    _store = new TraceStore();
  }
  return _store;
}

/**
 * Convenience: create a traced fetch wrapper.
 */
export function createTracedFetch(
  store: TraceStore,
  serviceName: string,
): (
  correlationId: string,
  parentSpanId: string | null,
  url: string,
  init?: RequestInit,
) => Promise<Response> {
  return async (correlationId, parentSpanId, url, init = {}) => {
    const span = store.startSpan(
      correlationId,
      `fetch ${url}`,
      serviceName,
      parentSpanId,
      { url },
    );

    const headers = {
      ...Object.fromEntries(new Headers(init.headers).entries()),
      ...buildTraceHeaders(correlationId, span.spanId),
    };

    try {
      const response = await fetch(url, { ...init, headers });
      store.endSpan(
        correlationId,
        span.spanId,
        response.ok ? "ok" : "error",
      );
      store.addLog(correlationId, span.spanId, "info", `Status: ${response.status}`);
      return response;
    } catch (error) {
      store.endSpan(correlationId, span.spanId, "error");
      store.addLog(
        correlationId,
        span.spanId,
        "error",
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  };
}
