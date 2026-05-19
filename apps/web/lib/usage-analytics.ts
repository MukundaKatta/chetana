/**
 * Feature usage analytics (Issue #465).
 * Event tracking, usage heatmap by feature, funnel analysis,
 * retention metrics, privacy-respecting collection.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface AnalyticsEvent {
  /** Event name (e.g. "audit.start", "probe.run"). */
  name: string;
  /** ISO timestamp. */
  timestamp: string;
  /** Anonymised session ID (no PII). */
  sessionId: string;
  /** Feature area (e.g. "audits", "experiments", "dashboard"). */
  feature: string;
  /** Optional structured properties. */
  properties?: Record<string, unknown>;
}

export interface PrivacyConfig {
  /** Whether analytics collection is enabled. */
  enabled: boolean;
  /** If true, no events are stored — only aggregate counters. */
  aggregateOnly: boolean;
  /** Fields to strip from event properties before storage. */
  redactFields: string[];
  /** Whether to hash session IDs. */
  hashSessionIds: boolean;
  /** Maximum number of events to buffer before flushing. */
  bufferSize: number;
  /** Auto-flush interval in ms. */
  flushIntervalMs: number;
}

export interface FeatureUsageEntry {
  feature: string;
  eventCount: number;
  uniqueSessions: number;
  firstSeen: string;
  lastSeen: string;
}

export interface HeatmapCell {
  feature: string;
  /** Hour of day (0-23). */
  hour: number;
  /** Day of week (0 = Sunday, 6 = Saturday). */
  dayOfWeek: number;
  count: number;
}

export interface FunnelStep {
  name: string;
  eventName: string;
}

export interface FunnelResult {
  steps: Array<{
    name: string;
    eventName: string;
    count: number;
    conversionRate: number;
    dropoffRate: number;
  }>;
  overallConversionRate: number;
}

export interface RetentionCohort {
  cohortDate: string;
  cohortSize: number;
  /** Retention by period index (0 = same period, 1 = next, etc.). */
  retention: number[];
}

export interface RetentionReport {
  periodType: "day" | "week" | "month";
  cohorts: RetentionCohort[];
  averageRetention: number[];
}

/* ------------------------------------------------------------------ */
/*  Default config                                                    */
/* ------------------------------------------------------------------ */

const DEFAULT_PRIVACY_CONFIG: PrivacyConfig = {
  enabled: true,
  aggregateOnly: false,
  redactFields: ["email", "name", "ip", "apiKey", "password", "token"],
  hashSessionIds: true,
  bufferSize: 100,
  flushIntervalMs: 30_000,
};

/* ------------------------------------------------------------------ */
/*  Hashing (simple FNV-1a for session IDs)                           */
/* ------------------------------------------------------------------ */

function fnv1aHash(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/* ------------------------------------------------------------------ */
/*  Usage Analytics Engine                                            */
/* ------------------------------------------------------------------ */

export class UsageAnalytics {
  private events: AnalyticsEvent[] = [];
  private buffer: AnalyticsEvent[] = [];
  private config: PrivacyConfig;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private flushCallbacks: Array<(events: AnalyticsEvent[]) => void> = [];
  /** Aggregate counters (used when aggregateOnly = true). */
  private counters = new Map<string, number>();

  constructor(config: Partial<PrivacyConfig> = {}) {
    this.config = { ...DEFAULT_PRIVACY_CONFIG, ...config };

    if (this.config.enabled && this.config.flushIntervalMs > 0) {
      this.flushTimer = setInterval(
        () => this.flush(),
        this.config.flushIntervalMs,
      );
    }
  }

  /** Register a callback that receives events on flush. */
  onFlush(callback: (events: AnalyticsEvent[]) => void): void {
    this.flushCallbacks.push(callback);
  }

  /** Track a single event. */
  track(
    name: string,
    feature: string,
    sessionId: string,
    properties?: Record<string, unknown>,
  ): void {
    if (!this.config.enabled) return;

    const sanitisedSession = this.config.hashSessionIds
      ? fnv1aHash(sessionId)
      : sessionId;

    const sanitisedProps = properties
      ? this.redactProperties(properties)
      : undefined;

    if (this.config.aggregateOnly) {
      const key = `${feature}::${name}`;
      this.counters.set(key, (this.counters.get(key) ?? 0) + 1);
      return;
    }

    const event: AnalyticsEvent = {
      name,
      timestamp: new Date().toISOString(),
      sessionId: sanitisedSession,
      feature,
      properties: sanitisedProps,
    };

    this.buffer.push(event);

    if (this.buffer.length >= this.config.bufferSize) {
      this.flush();
    }
  }

  /** Flush the event buffer. */
  flush(): void {
    if (this.buffer.length === 0) return;
    const batch = [...this.buffer];
    this.buffer = [];
    this.events.push(...batch);

    for (const cb of this.flushCallbacks) {
      try {
        cb(batch);
      } catch {
        // Flush callbacks must not throw
      }
    }
  }

  /** Stop the auto-flush timer. */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }

  /* ---- Privacy ---- */

  private redactProperties(
    props: Record<string, unknown>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (this.config.redactFields.some((f) => key.toLowerCase().includes(f.toLowerCase()))) {
        result[key] = "[REDACTED]";
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  /* ---- Feature usage heatmap ---- */

  getFeatureUsage(): FeatureUsageEntry[] {
    this.flush();
    const map = new Map<
      string,
      { count: number; sessions: Set<string>; first: string; last: string }
    >();

    for (const e of this.events) {
      const entry = map.get(e.feature) ?? {
        count: 0,
        sessions: new Set<string>(),
        first: e.timestamp,
        last: e.timestamp,
      };
      entry.count++;
      entry.sessions.add(e.sessionId);
      if (e.timestamp < entry.first) entry.first = e.timestamp;
      if (e.timestamp > entry.last) entry.last = e.timestamp;
      map.set(e.feature, entry);
    }

    return Array.from(map.entries()).map(([feature, data]) => ({
      feature,
      eventCount: data.count,
      uniqueSessions: data.sessions.size,
      firstSeen: data.first,
      lastSeen: data.last,
    }));
  }

  getUsageHeatmap(): HeatmapCell[] {
    this.flush();
    const cells = new Map<string, number>();

    for (const e of this.events) {
      const d = new Date(e.timestamp);
      const key = `${e.feature}::${d.getHours()}::${d.getDay()}`;
      cells.set(key, (cells.get(key) ?? 0) + 1);
    }

    return Array.from(cells.entries()).map(([key, count]) => {
      const [feature, hour, day] = key.split("::");
      return {
        feature,
        hour: parseInt(hour, 10),
        dayOfWeek: parseInt(day, 10),
        count,
      };
    });
  }

  /* ---- Funnel analysis ---- */

  analyzeFunnel(steps: FunnelStep[]): FunnelResult {
    this.flush();
    if (steps.length === 0) {
      return { steps: [], overallConversionRate: 0 };
    }

    // Group events by session
    const sessionEvents = new Map<string, AnalyticsEvent[]>();
    for (const e of this.events) {
      const arr = sessionEvents.get(e.sessionId) ?? [];
      arr.push(e);
      sessionEvents.set(e.sessionId, arr);
    }

    const stepResults = steps.map((step, i) => {
      let count = 0;

      for (const [, events] of sessionEvents) {
        const sorted = events.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );

        // Check if this session completed steps 0..i in order
        let stepIdx = 0;
        for (const event of sorted) {
          if (event.name === steps[stepIdx].eventName) {
            stepIdx++;
            if (stepIdx > i) {
              count++;
              break;
            }
          }
        }
      }

      return { ...step, count, conversionRate: 0, dropoffRate: 0 };
    });

    // Compute conversion & dropoff rates
    for (let i = 0; i < stepResults.length; i++) {
      const prev = i === 0 ? sessionEvents.size : stepResults[i - 1].count;
      stepResults[i].conversionRate = prev > 0 ? stepResults[i].count / prev : 0;
      stepResults[i].dropoffRate = prev > 0 ? 1 - stepResults[i].conversionRate : 0;
    }

    const overall =
      sessionEvents.size > 0
        ? stepResults[stepResults.length - 1].count / sessionEvents.size
        : 0;

    return { steps: stepResults, overallConversionRate: overall };
  }

  /* ---- Retention analysis ---- */

  analyzeRetention(
    periodType: "day" | "week" | "month" = "week",
    periods = 8,
  ): RetentionReport {
    this.flush();

    const periodMs = {
      day: 86_400_000,
      week: 604_800_000,
      month: 2_592_000_000,
    }[periodType];

    // Group sessions by first-seen period
    const sessionFirstSeen = new Map<string, number>();
    const sessionActivePeriods = new Map<string, Set<number>>();

    for (const e of this.events) {
      const ts = new Date(e.timestamp).getTime();
      const period = Math.floor(ts / periodMs);

      if (
        !sessionFirstSeen.has(e.sessionId) ||
        period < sessionFirstSeen.get(e.sessionId)!
      ) {
        sessionFirstSeen.set(e.sessionId, period);
      }

      const activeSet = sessionActivePeriods.get(e.sessionId) ?? new Set();
      activeSet.add(period);
      sessionActivePeriods.set(e.sessionId, activeSet);
    }

    // Build cohorts
    const cohortMap = new Map<number, string[]>();
    for (const [sessionId, firstPeriod] of sessionFirstSeen) {
      const arr = cohortMap.get(firstPeriod) ?? [];
      arr.push(sessionId);
      cohortMap.set(firstPeriod, arr);
    }

    const sortedPeriods = Array.from(cohortMap.keys()).sort();
    const cohorts: RetentionCohort[] = sortedPeriods.slice(-periods).map((period) => {
      const sessions = cohortMap.get(period)!;
      const retention: number[] = [];

      for (let offset = 0; offset < periods; offset++) {
        const targetPeriod = period + offset;
        let retained = 0;
        for (const sid of sessions) {
          if (sessionActivePeriods.get(sid)?.has(targetPeriod)) {
            retained++;
          }
        }
        retention.push(sessions.length > 0 ? retained / sessions.length : 0);
      }

      const date = new Date(period * periodMs);
      return {
        cohortDate: date.toISOString().slice(0, 10),
        cohortSize: sessions.length,
        retention,
      };
    });

    // Average retention across cohorts
    const averageRetention: number[] = [];
    for (let offset = 0; offset < periods; offset++) {
      const values = cohorts
        .filter((c) => c.retention.length > offset)
        .map((c) => c.retention[offset]);
      averageRetention.push(
        values.length > 0
          ? values.reduce((a, b) => a + b, 0) / values.length
          : 0,
      );
    }

    return { periodType, cohorts, averageRetention };
  }

  /* ---- Aggregate counters (for aggregateOnly mode) ---- */

  getCounters(): Record<string, number> {
    return Object.fromEntries(this.counters);
  }

  /** Get all stored events. */
  getEvents(): readonly AnalyticsEvent[] {
    this.flush();
    return this.events;
  }

  /** Clear all data. */
  clear(): void {
    this.events = [];
    this.buffer = [];
    this.counters.clear();
  }
}
