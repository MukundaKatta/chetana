/**
 * Audit session persistence/resume (Issue #367).
 * Serialize audit state to IndexedDB, resume from last completed probe,
 * auto-save on close, cleanup stale sessions.
 */

import type {
  Audit,
  ProbeResult,
  Theory,
  TheoryScores,
  IndicatorScores,
  ModelProvider,
  AuditStatus,
} from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface PersistedAuditSession {
  /** Session ID (matches audit ID). */
  id: string;
  /** Audit snapshot. */
  audit: Audit;
  /** Completed probe results so far. */
  completedProbes: ProbeResult[];
  /** IDs of probes remaining to be run. */
  remainingProbeIds: string[];
  /** Current probe index (for resume). */
  currentProbeIndex: number;
  /** Total number of probes. */
  totalProbes: number;
  /** Accumulated theory scores. */
  partialTheoryScores: Partial<TheoryScores>;
  /** Accumulated indicator scores. */
  partialIndicatorScores: IndicatorScores;
  /** Session status. */
  status: "active" | "paused" | "completed" | "failed";
  /** ISO timestamp when session was created. */
  createdAt: string;
  /** ISO timestamp of last update. */
  updatedAt: string;
  /** ISO timestamp of last auto-save. */
  lastAutoSaveAt: string;
  /** User ID. */
  userId: string;
  /** Model being tested. */
  modelName: string;
  /** Provider. */
  modelProvider: ModelProvider;
  /** Custom metadata. */
  metadata?: Record<string, unknown>;
}

export interface SessionSummary {
  id: string;
  modelName: string;
  modelProvider: ModelProvider;
  status: PersistedAuditSession["status"];
  progress: number;
  completedProbes: number;
  totalProbes: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditPersistenceConfig {
  /** IndexedDB database name (default "chetana-audit-sessions"). */
  dbName: string;
  /** IndexedDB store name (default "sessions"). */
  storeName: string;
  /** Auto-save interval in ms (default 10000). */
  autoSaveIntervalMs: number;
  /** Stale session threshold in ms (default 24 hours). */
  staleThresholdMs: number;
  /** Maximum stored sessions (default 50). */
  maxSessions: number;
}

const DEFAULT_CONFIG: AuditPersistenceConfig = {
  dbName: "chetana-audit-sessions",
  storeName: "sessions",
  autoSaveIntervalMs: 10_000,
  staleThresholdMs: 24 * 60 * 60 * 1000,
  maxSessions: 50,
};

/* ------------------------------------------------------------------ */
/*  IndexedDB Helpers                                                 */
/* ------------------------------------------------------------------ */

function openDB(config: AuditPersistenceConfig): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    const request = indexedDB.open(config.dbName, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(config.storeName)) {
        const store = db.createObjectStore(config.storeName, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
        store.createIndex("userId", "userId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbPut(
  config: AuditPersistenceConfig,
  session: PersistedAuditSession
): Promise<void> {
  const db = await openDB(config);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(config.storeName, "readwrite");
    const store = tx.objectStore(config.storeName);
    const request = store.put(session);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function dbGet(
  config: AuditPersistenceConfig,
  id: string
): Promise<PersistedAuditSession | null> {
  const db = await openDB(config);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(config.storeName, "readonly");
    const store = tx.objectStore(config.storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function dbGetAll(
  config: AuditPersistenceConfig
): Promise<PersistedAuditSession[]> {
  const db = await openDB(config);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(config.storeName, "readonly");
    const store = tx.objectStore(config.storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function dbDelete(
  config: AuditPersistenceConfig,
  id: string
): Promise<void> {
  const db = await openDB(config);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(config.storeName, "readwrite");
    const store = tx.objectStore(config.storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function dbClear(config: AuditPersistenceConfig): Promise<void> {
  const db = await openDB(config);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(config.storeName, "readwrite");
    const store = tx.objectStore(config.storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

/* ------------------------------------------------------------------ */
/*  AuditPersistence Manager                                          */
/* ------------------------------------------------------------------ */

export class AuditPersistence {
  private config: AuditPersistenceConfig;
  private autoSaveTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private beforeUnloadHandler: (() => void) | null = null;

  constructor(config: Partial<AuditPersistenceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /* -- Session Creation -------------------------------------------- */

  /**
   * Create a new persisted session for an audit.
   */
  async createSession(
    audit: Audit,
    probeIds: string[],
    userId: string
  ): Promise<PersistedAuditSession> {
    const now = new Date().toISOString();
    const session: PersistedAuditSession = {
      id: audit.id,
      audit,
      completedProbes: [],
      remainingProbeIds: probeIds,
      currentProbeIndex: 0,
      totalProbes: probeIds.length,
      partialTheoryScores: {},
      partialIndicatorScores: {},
      status: "active",
      createdAt: now,
      updatedAt: now,
      lastAutoSaveAt: now,
      userId,
      modelName: audit.modelName,
      modelProvider: audit.modelProvider,
    };

    await dbPut(this.config, session);
    await this.enforceMaxSessions();
    return session;
  }

  /* -- Session Updates --------------------------------------------- */

  /**
   * Record a completed probe result and update the session.
   */
  async recordProbeResult(
    sessionId: string,
    result: ProbeResult
  ): Promise<PersistedAuditSession | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    session.completedProbes.push(result);
    session.remainingProbeIds = session.remainingProbeIds.filter(
      (id) => id !== result.probeName
    );
    session.currentProbeIndex = session.completedProbes.length;

    // Update partial scores
    const theory = result.theory as Theory;
    if (!session.partialTheoryScores[theory]) {
      session.partialTheoryScores[theory] = 0;
    }

    // Running average for theory scores
    const theoryProbes = session.completedProbes.filter(
      (p) => p.theory === theory
    );
    session.partialTheoryScores[theory] =
      theoryProbes.reduce((sum, p) => sum + p.score, 0) / theoryProbes.length;

    session.partialIndicatorScores[result.indicatorId] = result.score;
    session.updatedAt = new Date().toISOString();

    // Check if complete
    if (session.remainingProbeIds.length === 0) {
      session.status = "completed";
    }

    await dbPut(this.config, session);
    return session;
  }

  /**
   * Update session status.
   */
  async updateStatus(
    sessionId: string,
    status: PersistedAuditSession["status"]
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    session.status = status;
    session.updatedAt = new Date().toISOString();
    await dbPut(this.config, session);
  }

  /**
   * Save current session state (manual save).
   */
  async saveSession(session: PersistedAuditSession): Promise<void> {
    session.updatedAt = new Date().toISOString();
    session.lastAutoSaveAt = new Date().toISOString();
    await dbPut(this.config, session);
  }

  /* -- Session Retrieval ------------------------------------------- */

  /**
   * Get a session by ID.
   */
  async getSession(
    sessionId: string
  ): Promise<PersistedAuditSession | null> {
    return dbGet(this.config, sessionId);
  }

  /**
   * Get all sessions.
   */
  async getAllSessions(): Promise<PersistedAuditSession[]> {
    return dbGetAll(this.config);
  }

  /**
   * Get resumable sessions (active or paused).
   */
  async getResumableSessions(): Promise<PersistedAuditSession[]> {
    const all = await this.getAllSessions();
    return all.filter((s) => s.status === "active" || s.status === "paused");
  }

  /**
   * Get session summaries (lightweight list view).
   */
  async getSessionSummaries(): Promise<SessionSummary[]> {
    const all = await this.getAllSessions();
    return all.map((s) => ({
      id: s.id,
      modelName: s.modelName,
      modelProvider: s.modelProvider,
      status: s.status,
      progress:
        s.totalProbes > 0
          ? Math.round((s.completedProbes.length / s.totalProbes) * 100)
          : 0,
      completedProbes: s.completedProbes.length,
      totalProbes: s.totalProbes,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  /* -- Resume ------------------------------------------------------ */

  /**
   * Resume a session from the last completed probe.
   * Returns the session with remaining probes ready to execute.
   */
  async resumeSession(
    sessionId: string
  ): Promise<{
    session: PersistedAuditSession;
    nextProbeId: string | null;
    remainingCount: number;
  } | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    if (session.status === "completed") {
      return {
        session,
        nextProbeId: null,
        remainingCount: 0,
      };
    }

    session.status = "active";
    session.updatedAt = new Date().toISOString();
    await dbPut(this.config, session);

    return {
      session,
      nextProbeId: session.remainingProbeIds[0] ?? null,
      remainingCount: session.remainingProbeIds.length,
    };
  }

  /* -- Auto-Save --------------------------------------------------- */

  /**
   * Start auto-saving a session at regular intervals.
   */
  startAutoSave(
    sessionId: string,
    getSession: () => PersistedAuditSession | null
  ): void {
    this.stopAutoSave(sessionId);

    const timer = setInterval(async () => {
      const session = getSession();
      if (session) {
        session.lastAutoSaveAt = new Date().toISOString();
        await dbPut(this.config, session).catch(() => {
          // Silently handle auto-save failures
        });
      }
    }, this.config.autoSaveIntervalMs);

    this.autoSaveTimers.set(sessionId, timer);
  }

  /**
   * Stop auto-saving a session.
   */
  stopAutoSave(sessionId: string): void {
    const timer = this.autoSaveTimers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.autoSaveTimers.delete(sessionId);
    }
  }

  /**
   * Register a beforeunload handler to save on page close.
   */
  registerBeforeUnload(
    sessionId: string,
    getSession: () => PersistedAuditSession | null
  ): void {
    if (typeof window === "undefined") return;

    this.unregisterBeforeUnload();

    this.beforeUnloadHandler = () => {
      const session = getSession();
      if (session && session.status === "active") {
        session.status = "paused";
        session.updatedAt = new Date().toISOString();
        // Use synchronous localStorage as fallback since IndexedDB is async
        try {
          const key = `${this.config.dbName}:emergency:${sessionId}`;
          localStorage.setItem(key, JSON.stringify(session));
        } catch {
          // Best effort
        }
      }
    };

    window.addEventListener("beforeunload", this.beforeUnloadHandler);
  }

  /**
   * Unregister the beforeunload handler.
   */
  unregisterBeforeUnload(): void {
    if (typeof window === "undefined" || !this.beforeUnloadHandler) return;
    window.removeEventListener("beforeunload", this.beforeUnloadHandler);
    this.beforeUnloadHandler = null;
  }

  /**
   * Recover any emergency-saved sessions from localStorage.
   */
  async recoverEmergencySaves(): Promise<PersistedAuditSession[]> {
    if (typeof window === "undefined") return [];
    const recovered: PersistedAuditSession[] = [];
    const prefix = `${this.config.dbName}:emergency:`;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        try {
          const session: PersistedAuditSession = JSON.parse(
            localStorage.getItem(key)!
          );
          await dbPut(this.config, session);
          recovered.push(session);
          localStorage.removeItem(key);
        } catch {
          // Skip corrupted entries
        }
      }
    }

    return recovered;
  }

  /* -- Cleanup ----------------------------------------------------- */

  /**
   * Delete a session.
   */
  async deleteSession(sessionId: string): Promise<void> {
    this.stopAutoSave(sessionId);
    await dbDelete(this.config, sessionId);
  }

  /**
   * Clean up stale sessions (older than threshold).
   */
  async cleanupStaleSessions(): Promise<number> {
    const all = await this.getAllSessions();
    const now = Date.now();
    let cleaned = 0;

    for (const session of all) {
      const updatedAt = new Date(session.updatedAt).getTime();
      if (
        now - updatedAt > this.config.staleThresholdMs &&
        session.status !== "completed"
      ) {
        await dbDelete(this.config, session.id);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Enforce the maximum number of stored sessions.
   */
  private async enforceMaxSessions(): Promise<void> {
    const all = await this.getAllSessions();
    if (all.length <= this.config.maxSessions) return;

    // Sort by updatedAt, delete oldest completed sessions first
    const sorted = all.sort(
      (a, b) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
    );

    const toRemove = sorted.length - this.config.maxSessions;
    for (let i = 0; i < toRemove; i++) {
      const session = sorted[i]!;
      if (session.status === "completed" || session.status === "failed") {
        await dbDelete(this.config, session.id);
      }
    }
  }

  /**
   * Clear all sessions.
   */
  async clearAll(): Promise<void> {
    for (const timer of this.autoSaveTimers.values()) {
      clearInterval(timer);
    }
    this.autoSaveTimers.clear();
    this.unregisterBeforeUnload();
    await dbClear(this.config);
  }

  /**
   * Dispose all timers and handlers.
   */
  dispose(): void {
    for (const timer of this.autoSaveTimers.values()) {
      clearInterval(timer);
    }
    this.autoSaveTimers.clear();
    this.unregisterBeforeUnload();
  }
}
