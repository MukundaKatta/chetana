/**
 * Audit sharing with expiring links (Issue #437).
 * Generates unique share tokens with configurable expiry and permission
 * levels, tracks access analytics, and supports revocation.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type ExpiryDuration = "1h" | "24h" | "7d" | "30d" | "never";

export type PermissionLevel = "view" | "view+comment";

export interface ShareLinkConfig {
  /** Audit ID to share. */
  auditId: string;
  /** Who created the link. */
  createdBy: string;
  /** Expiry duration (default "24h"). */
  expiry?: ExpiryDuration;
  /** Permission level (default "view"). */
  permission?: PermissionLevel;
  /** Optional label for this link. */
  label?: string;
  /** Maximum number of accesses allowed (undefined = unlimited). */
  maxAccesses?: number;
}

export interface ShareLink {
  /** Unique share token (URL-safe). */
  token: string;
  /** The audit being shared. */
  auditId: string;
  /** User ID of the creator. */
  createdBy: string;
  /** ISO timestamp of creation. */
  createdAt: string;
  /** ISO timestamp of expiry, or null for "never". */
  expiresAt: string | null;
  /** Permission level granted by this link. */
  permission: PermissionLevel;
  /** Human-readable label. */
  label: string;
  /** Whether the link has been explicitly revoked. */
  revoked: boolean;
  /** Maximum accesses allowed (null = unlimited). */
  maxAccesses: number | null;
  /** Current access count. */
  accessCount: number;
}

export interface AccessRecord {
  /** Share token that was used. */
  token: string;
  /** ISO timestamp of access. */
  accessedAt: string;
  /** IP address (hashed for privacy). */
  ipHash: string;
  /** User agent string. */
  userAgent: string;
  /** Country code from geo-lookup (optional). */
  country?: string;
}

export interface AccessAnalytics {
  /** Total access count. */
  totalAccesses: number;
  /** Unique visitors (by IP hash). */
  uniqueVisitors: number;
  /** Access counts by day (ISO date string -> count). */
  accessesByDay: Record<string, number>;
  /** Access counts by country. */
  accessesByCountry: Record<string, number>;
  /** Most recent access timestamp. */
  lastAccessAt: string | null;
}

export interface ShareLinkValidation {
  valid: boolean;
  reason?: "expired" | "revoked" | "max_accesses_reached" | "not_found";
  link?: ShareLink;
}

/* ------------------------------------------------------------------ */
/*  Token generation                                                  */
/* ------------------------------------------------------------------ */

/**
 * Generate a cryptographically secure URL-safe token.
 */
export function generateShareToken(length: number = 32): string {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const values = new Uint8Array(length);

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(values);
  } else {
    // Fallback for environments without Web Crypto
    for (let i = 0; i < length; i++) {
      values[i] = Math.floor(Math.random() * 256);
    }
  }

  let token = "";
  for (let i = 0; i < length; i++) {
    token += charset[values[i] % charset.length];
  }
  return token;
}

/* ------------------------------------------------------------------ */
/*  Expiry calculation                                                */
/* ------------------------------------------------------------------ */

const EXPIRY_MS: Record<ExpiryDuration, number | null> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  never: null,
};

/**
 * Compute the expiry ISO timestamp from a duration key.
 */
export function computeExpiry(
  duration: ExpiryDuration,
  from: Date = new Date(),
): string | null {
  const ms = EXPIRY_MS[duration];
  if (ms === null) return null;
  return new Date(from.getTime() + ms).toISOString();
}

/**
 * Check if a share link is expired.
 */
export function isExpired(expiresAt: string | null): boolean {
  if (expiresAt === null) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

/* ------------------------------------------------------------------ */
/*  IP hashing                                                        */
/* ------------------------------------------------------------------ */

/**
 * Hash an IP address for privacy-preserving analytics.
 * Uses a simple FNV-1a hash for client-side use.
 */
export function hashIP(ip: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < ip.length; i++) {
    hash ^= ip.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/* ------------------------------------------------------------------ */
/*  Share link manager                                                */
/* ------------------------------------------------------------------ */

export class ShareLinkManager {
  private links: Map<string, ShareLink> = new Map();
  private accessLog: AccessRecord[] = [];

  /**
   * Create a new share link for an audit.
   */
  createLink(config: ShareLinkConfig): ShareLink {
    const token = generateShareToken();
    const now = new Date();
    const expiry = config.expiry ?? "24h";
    const permission = config.permission ?? "view";

    const link: ShareLink = {
      token,
      auditId: config.auditId,
      createdBy: config.createdBy,
      createdAt: now.toISOString(),
      expiresAt: computeExpiry(expiry, now),
      permission,
      label: config.label ?? `Shared on ${now.toLocaleDateString()}`,
      revoked: false,
      maxAccesses: config.maxAccesses ?? null,
      accessCount: 0,
    };

    this.links.set(token, link);
    return link;
  }

  /**
   * Validate a share token and return the link if valid.
   */
  validateToken(token: string): ShareLinkValidation {
    const link = this.links.get(token);
    if (!link) {
      return { valid: false, reason: "not_found" };
    }
    if (link.revoked) {
      return { valid: false, reason: "revoked", link };
    }
    if (isExpired(link.expiresAt)) {
      return { valid: false, reason: "expired", link };
    }
    if (link.maxAccesses !== null && link.accessCount >= link.maxAccesses) {
      return { valid: false, reason: "max_accesses_reached", link };
    }
    return { valid: true, link };
  }

  /**
   * Record an access to a share link.
   */
  recordAccess(
    token: string,
    ip: string,
    userAgent: string,
    country?: string,
  ): boolean {
    const validation = this.validateToken(token);
    if (!validation.valid || !validation.link) return false;

    validation.link.accessCount += 1;

    this.accessLog.push({
      token,
      accessedAt: new Date().toISOString(),
      ipHash: hashIP(ip),
      userAgent,
      country,
    });

    return true;
  }

  /**
   * Revoke a share link.
   */
  revokeLink(token: string): boolean {
    const link = this.links.get(token);
    if (!link) return false;
    link.revoked = true;
    return true;
  }

  /**
   * Get all share links for an audit.
   */
  getLinksForAudit(auditId: string): ShareLink[] {
    return Array.from(this.links.values()).filter(
      (l) => l.auditId === auditId,
    );
  }

  /**
   * Get all active (non-revoked, non-expired) links for an audit.
   */
  getActiveLinks(auditId: string): ShareLink[] {
    return this.getLinksForAudit(auditId).filter(
      (l) => !l.revoked && !isExpired(l.expiresAt),
    );
  }

  /**
   * Compute access analytics for a share token.
   */
  getAccessAnalytics(token: string): AccessAnalytics {
    const records = this.accessLog.filter((r) => r.token === token);
    const uniqueIPs = new Set(records.map((r) => r.ipHash));

    const accessesByDay: Record<string, number> = {};
    const accessesByCountry: Record<string, number> = {};

    for (const record of records) {
      const day = record.accessedAt.slice(0, 10);
      accessesByDay[day] = (accessesByDay[day] ?? 0) + 1;

      if (record.country) {
        accessesByCountry[record.country] =
          (accessesByCountry[record.country] ?? 0) + 1;
      }
    }

    return {
      totalAccesses: records.length,
      uniqueVisitors: uniqueIPs.size,
      accessesByDay,
      accessesByCountry,
      lastAccessAt:
        records.length > 0
          ? records[records.length - 1].accessedAt
          : null,
    };
  }

  /**
   * Compute aggregate analytics across all links for an audit.
   */
  getAuditAnalytics(auditId: string): AccessAnalytics {
    const tokens = new Set(
      this.getLinksForAudit(auditId).map((l) => l.token),
    );
    const records = this.accessLog.filter((r) => tokens.has(r.token));
    const uniqueIPs = new Set(records.map((r) => r.ipHash));

    const accessesByDay: Record<string, number> = {};
    const accessesByCountry: Record<string, number> = {};

    for (const record of records) {
      const day = record.accessedAt.slice(0, 10);
      accessesByDay[day] = (accessesByDay[day] ?? 0) + 1;

      if (record.country) {
        accessesByCountry[record.country] =
          (accessesByCountry[record.country] ?? 0) + 1;
      }
    }

    return {
      totalAccesses: records.length,
      uniqueVisitors: uniqueIPs.size,
      accessesByDay,
      accessesByCountry,
      lastAccessAt:
        records.length > 0
          ? records[records.length - 1].accessedAt
          : null,
    };
  }

  /**
   * Clean up expired links.
   */
  purgeExpired(): number {
    let count = 0;
    for (const [token, link] of this.links) {
      if (isExpired(link.expiresAt)) {
        this.links.delete(token);
        count++;
      }
    }
    return count;
  }

  /**
   * Build the full share URL for a token.
   */
  buildShareUrl(token: string, baseUrl: string): string {
    return `${baseUrl.replace(/\/$/, "")}/shared/${token}`;
  }
}

/**
 * Singleton share link manager instance.
 */
let _instance: ShareLinkManager | null = null;

export function getShareLinkManager(): ShareLinkManager {
  if (!_instance) {
    _instance = new ShareLinkManager();
  }
  return _instance;
}
