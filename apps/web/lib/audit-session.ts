/**
 * Audit session persistence for pause/resume functionality.
 *
 * Saves audit progress to localStorage so users can pause a running audit
 * and resume it later without losing completed probe results.
 */

const STORAGE_KEY_PREFIX = "chetana_audit_session_";
const SESSION_INDEX_KEY = "chetana_audit_sessions";

export interface AuditSession {
  auditId: string;
  completedProbes: string[];
  pendingProbes: string[];
  partialResults: Record<string, unknown>[];
  pausedAt: string;
  modelName: string;
  modelProvider: string;
}

/**
 * Persist an audit session to localStorage.
 * Automatically called after each completed probe and when the user pauses.
 */
export function saveAuditSession(session: AuditSession): void {
  if (typeof window === "undefined") return;

  const key = `${STORAGE_KEY_PREFIX}${session.auditId}`;
  localStorage.setItem(key, JSON.stringify(session));

  // Update the session index so we can list all paused sessions
  const index = getSessionIndex();
  if (!index.includes(session.auditId)) {
    index.push(session.auditId);
    localStorage.setItem(SESSION_INDEX_KEY, JSON.stringify(index));
  }
}

/**
 * Load a previously saved audit session.
 * Returns `null` if no session exists for the given audit ID.
 */
export function loadAuditSession(auditId: string): AuditSession | null {
  if (typeof window === "undefined") return null;

  const key = `${STORAGE_KEY_PREFIX}${auditId}`;
  const raw = localStorage.getItem(key);

  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuditSession;
  } catch {
    // Corrupted data — remove it
    localStorage.removeItem(key);
    return null;
  }
}

/**
 * Remove a saved audit session (e.g. after successful completion or discard).
 */
export function clearAuditSession(auditId: string): void {
  if (typeof window === "undefined") return;

  const key = `${STORAGE_KEY_PREFIX}${auditId}`;
  localStorage.removeItem(key);

  // Remove from the index
  const index = getSessionIndex().filter((id) => id !== auditId);
  localStorage.setItem(SESSION_INDEX_KEY, JSON.stringify(index));
}

/**
 * List all paused audit sessions.
 * Filters out any entries whose data has been cleared or is corrupted.
 */
export function listPausedSessions(): AuditSession[] {
  if (typeof window === "undefined") return [];

  const index = getSessionIndex();
  const sessions: AuditSession[] = [];

  for (const auditId of index) {
    const session = loadAuditSession(auditId);
    if (session) {
      sessions.push(session);
    }
  }

  return sessions;
}

/**
 * Read the session index array from localStorage.
 */
function getSessionIndex(): string[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(SESSION_INDEX_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}
