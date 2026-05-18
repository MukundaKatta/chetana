/* ------------------------------------------------------------------ */
/*  Event Sourcing for Audit State                                    */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type AuditEventType =
  | "audit_created"
  | "probe_started"
  | "response_received"
  | "score_computed"
  | "audit_completed"
  | "audit_failed"
  | "weight_adjusted"
  | "probe_retried";

export interface AuditEvent<T extends AuditEventType = AuditEventType> {
  readonly id: string;
  readonly auditId: string;
  readonly type: T;
  readonly timestamp: string;
  readonly payload: Readonly<AuditEventPayloads[T]>;
  readonly version: number;
}

export interface AuditEventPayloads {
  audit_created: { modelName: string; modelProvider: string; probeCount: number };
  probe_started: { probeId: string; probeName: string };
  response_received: { probeId: string; response: string; tokensUsed: number; latencyMs: number };
  score_computed: { probeId: string; score: number; analysis: string; confidence: number };
  audit_completed: { overallScore: number; theoryScores: Record<string, number> };
  audit_failed: { error: string; failedProbeId?: string };
  weight_adjusted: { theory: string; oldWeight: number; newWeight: number };
  probe_retried: { probeId: string; attempt: number; reason: string };
}

export interface AuditState {
  auditId: string;
  modelName: string;
  modelProvider: string;
  status: "pending" | "running" | "completed" | "failed";
  probeCount: number;
  completedProbes: number;
  probeStates: Map<string, ProbeState>;
  overallScore: number | null;
  theoryScores: Record<string, number> | null;
  error: string | null;
  lastEventVersion: number;
}

export interface ProbeState {
  probeId: string;
  probeName: string;
  status: "pending" | "running" | "responded" | "scored";
  response: string | null;
  score: number | null;
  analysis: string | null;
  confidence: number | null;
  tokensUsed: number;
  latencyMs: number;
}

/* ------------------------------------------------------------------ */
/*  Immutable event log                                               */
/* ------------------------------------------------------------------ */

export class EventLog {
  private readonly events: AuditEvent[] = [];

  get length(): number {
    return this.events.length;
  }

  append<T extends AuditEventType>(
    auditId: string,
    type: T,
    payload: AuditEventPayloads[T],
  ): AuditEvent<T> {
    const event: AuditEvent<T> = Object.freeze({
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      auditId,
      type,
      timestamp: new Date().toISOString(),
      payload: Object.freeze(payload),
      version: this.events.length + 1,
    });
    this.events.push(event);
    return event;
  }

  getAll(): readonly AuditEvent[] {
    return Object.freeze([...this.events]);
  }

  getByAudit(auditId: string): readonly AuditEvent[] {
    return Object.freeze(this.events.filter((e) => e.auditId === auditId));
  }

  getByType<T extends AuditEventType>(type: T): readonly AuditEvent<T>[] {
    return Object.freeze(
      this.events.filter((e): e is AuditEvent<T> => e.type === type),
    );
  }

  getAfterVersion(version: number): readonly AuditEvent[] {
    return Object.freeze(this.events.filter((e) => e.version > version));
  }

  /**
   * Compact the log by removing intermediate probe events for completed probes,
   * keeping only the final score_computed event.
   */
  compact(auditId: string): AuditEvent[] {
    const auditEvents = this.events.filter((e) => e.auditId === auditId);
    const scoredProbes = new Set<string>();

    for (const e of auditEvents) {
      if (e.type === "score_computed") {
        scoredProbes.add((e.payload as AuditEventPayloads["score_computed"]).probeId);
      }
    }

    return auditEvents.filter((e) => {
      if (e.type === "probe_started" || e.type === "response_received") {
        const probeId =
          (e.payload as AuditEventPayloads["probe_started"]).probeId ??
          (e.payload as AuditEventPayloads["response_received"]).probeId;
        return !scoredProbes.has(probeId);
      }
      return true;
    });
  }
}

/* ------------------------------------------------------------------ */
/*  State reducer (replay from log)                                   */
/* ------------------------------------------------------------------ */

function createInitialState(auditId: string): AuditState {
  return {
    auditId,
    modelName: "",
    modelProvider: "",
    status: "pending",
    probeCount: 0,
    completedProbes: 0,
    probeStates: new Map(),
    overallScore: null,
    theoryScores: null,
    error: null,
    lastEventVersion: 0,
  };
}

export function applyEvent(state: AuditState, event: AuditEvent): AuditState {
  const next = { ...state, lastEventVersion: event.version };

  switch (event.type) {
    case "audit_created": {
      const p = event.payload as AuditEventPayloads["audit_created"];
      next.modelName = p.modelName;
      next.modelProvider = p.modelProvider;
      next.probeCount = p.probeCount;
      next.status = "running";
      break;
    }
    case "probe_started": {
      const p = event.payload as AuditEventPayloads["probe_started"];
      const probeStates = new Map(state.probeStates);
      probeStates.set(p.probeId, {
        probeId: p.probeId,
        probeName: p.probeName,
        status: "running",
        response: null,
        score: null,
        analysis: null,
        confidence: null,
        tokensUsed: 0,
        latencyMs: 0,
      });
      next.probeStates = probeStates;
      break;
    }
    case "response_received": {
      const p = event.payload as AuditEventPayloads["response_received"];
      const probeStates = new Map(state.probeStates);
      const existing = probeStates.get(p.probeId);
      if (existing) {
        probeStates.set(p.probeId, {
          ...existing,
          status: "responded",
          response: p.response,
          tokensUsed: p.tokensUsed,
          latencyMs: p.latencyMs,
        });
      }
      next.probeStates = probeStates;
      break;
    }
    case "score_computed": {
      const p = event.payload as AuditEventPayloads["score_computed"];
      const probeStates = new Map(state.probeStates);
      const existing = probeStates.get(p.probeId);
      if (existing) {
        probeStates.set(p.probeId, {
          ...existing,
          status: "scored",
          score: p.score,
          analysis: p.analysis,
          confidence: p.confidence,
        });
      }
      next.probeStates = probeStates;
      next.completedProbes = Array.from(probeStates.values()).filter(
        (ps) => ps.status === "scored",
      ).length;
      break;
    }
    case "audit_completed": {
      const p = event.payload as AuditEventPayloads["audit_completed"];
      next.status = "completed";
      next.overallScore = p.overallScore;
      next.theoryScores = p.theoryScores;
      break;
    }
    case "audit_failed": {
      const p = event.payload as AuditEventPayloads["audit_failed"];
      next.status = "failed";
      next.error = p.error;
      break;
    }
    case "weight_adjusted":
    case "probe_retried":
      break;
  }

  return next;
}

/* ------------------------------------------------------------------ */
/*  Replay & time-travel                                              */
/* ------------------------------------------------------------------ */

export function replayFromLog(events: readonly AuditEvent[]): AuditState {
  if (events.length === 0) {
    return createInitialState("unknown");
  }
  const auditId = events[0].auditId;
  let state = createInitialState(auditId);
  for (const event of events) {
    state = applyEvent(state, event);
  }
  return state;
}

export function replayToVersion(events: readonly AuditEvent[], version: number): AuditState {
  const filtered = events.filter((e) => e.version <= version);
  return replayFromLog(filtered);
}

export class TimeTravelDebugger {
  private readonly events: readonly AuditEvent[];
  private currentVersion: number;

  constructor(events: readonly AuditEvent[]) {
    this.events = events;
    this.currentVersion = events.length > 0 ? events[events.length - 1].version : 0;
  }

  get maxVersion(): number {
    return this.events.length > 0 ? this.events[this.events.length - 1].version : 0;
  }

  get version(): number {
    return this.currentVersion;
  }

  getState(): AuditState {
    return replayToVersion(this.events, this.currentVersion);
  }

  stepForward(): AuditState {
    if (this.currentVersion < this.maxVersion) {
      this.currentVersion++;
    }
    return this.getState();
  }

  stepBackward(): AuditState {
    if (this.currentVersion > 0) {
      this.currentVersion--;
    }
    return this.getState();
  }

  jumpTo(version: number): AuditState {
    this.currentVersion = Math.max(0, Math.min(version, this.maxVersion));
    return this.getState();
  }

  getCurrentEvent(): AuditEvent | null {
    return this.events.find((e) => e.version === this.currentVersion) ?? null;
  }
}
