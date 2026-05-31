import { fnv1aHash, hashObject } from "@chetana/shared";

/**
 * Tamper-evident compliance audit log (issue #745).
 *
 * Append-only, hash-chained log of sensitive actions. Each entry's hash covers
 * its content plus the previous entry's hash, so any modification breaks the
 * chain from that point forward.
 */

export interface AuditLogEntry {
  timestamp: string;
  actor: string;
  action: string;
  target?: string;
  /** Hash of (content + prevHash); set by appendAuditLogEntry. */
  hash: string;
  prevHash: string;
}

export type AuditLogContent = Omit<AuditLogEntry, "hash" | "prevHash">;

const GENESIS = "0".repeat(8);

export function appendAuditLogEntry(chain: AuditLogEntry[], content: AuditLogContent): AuditLogEntry[] {
  const prevHash = chain.length > 0 ? chain[chain.length - 1].hash : GENESIS;
  const hash = fnv1aHash(hashObject(content) + prevHash);
  return [...chain, { ...content, hash, prevHash }];
}

export interface VerificationResult {
  valid: boolean;
  /** Index of the first broken entry, or -1 if intact. */
  brokenAt: number;
}

export function verifyAuditLog(chain: AuditLogEntry[]): VerificationResult {
  let prevHash = GENESIS;
  for (let i = 0; i < chain.length; i++) {
    const { hash, prevHash: storedPrev, ...content } = chain[i];
    const expected = fnv1aHash(hashObject(content) + prevHash);
    if (storedPrev !== prevHash || hash !== expected) {
      return { valid: false, brokenAt: i };
    }
    prevHash = hash;
  }
  return { valid: true, brokenAt: -1 };
}
