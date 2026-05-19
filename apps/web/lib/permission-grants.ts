/**
 * Fine-grained permission grants (Issue #481).
 * Scope-based grants, grant types (read/write/admin),
 * delegation, expiring grants, permission check middleware.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type GrantType = "read" | "write" | "admin";

export type ResourceScope =
  | "audit"
  | "audit:*"
  | "probe"
  | "probe:*"
  | "report"
  | "report:*"
  | "experiment"
  | "experiment:*"
  | "settings"
  | "settings:*"
  | "team"
  | "team:*"
  | "user"
  | "user:*"
  | "webhook"
  | "api-key"
  | "*";

export interface PermissionGrant {
  id: string;
  /** The user receiving the grant. */
  granteeId: string;
  /** The user who issued the grant. */
  grantorId: string;
  /** Resource scope pattern (e.g. "audit:*", "probe:abc123"). */
  scope: string;
  /** Grant type determines allowed operations. */
  grantType: GrantType;
  /** Whether this grant can be delegated to others. */
  delegatable: boolean;
  /** ISO timestamp when the grant expires (null = permanent). */
  expiresAt: string | null;
  /** ISO timestamp when the grant was created. */
  createdAt: string;
  /** ISO timestamp when the grant was revoked (null = active). */
  revokedAt: string | null;
  /** Optional reason / context. */
  reason?: string;
  /** If this grant was delegated, the original grant ID. */
  parentGrantId?: string;
}

export interface PermissionCheckResult {
  allowed: boolean;
  matchedGrant: PermissionGrant | null;
  reason: string;
}

export interface GrantQuery {
  granteeId?: string;
  grantorId?: string;
  scope?: string;
  grantType?: GrantType;
  includeExpired?: boolean;
  includeRevoked?: boolean;
}

export interface DelegationRequest {
  originalGrantId: string;
  delegatorId: string;
  newGranteeId: string;
  /** Optionally narrow the scope (must be subset of original). */
  narrowedScope?: string;
  /** Optionally set a more restrictive grant type. */
  narrowedGrantType?: GrantType;
  /** Optionally set an earlier expiration. */
  expiresAt?: string;
  reason?: string;
}

export interface GrantAuditEntry {
  action: "created" | "revoked" | "delegated" | "expired" | "checked";
  grantId: string;
  actorId: string;
  timestamp: string;
  details: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const GRANT_TYPE_HIERARCHY: Record<GrantType, number> = {
  read: 1,
  write: 2,
  admin: 3,
};

function grantTypeIncludes(
  granted: GrantType,
  required: GrantType
): boolean {
  return GRANT_TYPE_HIERARCHY[granted] >= GRANT_TYPE_HIERARCHY[required];
}

function scopeMatches(grantScope: string, requestedScope: string): boolean {
  if (grantScope === "*") return true;
  if (grantScope === requestedScope) return true;

  // Wildcard matching: "audit:*" matches "audit:123"
  if (grantScope.endsWith(":*")) {
    const prefix = grantScope.slice(0, -1); // "audit:"
    return requestedScope.startsWith(prefix);
  }

  // Parent scope matching: "audit" matches "audit:123"
  if (requestedScope.startsWith(grantScope + ":")) {
    return true;
  }

  return false;
}

function isNarrowerScope(child: string, parent: string): boolean {
  if (parent === "*") return true;
  if (child === parent) return true;
  return scopeMatches(parent, child) && child !== parent;
}

function generateId(): string {
  return `grant_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/* ------------------------------------------------------------------ */
/*  Grant store                                                       */
/* ------------------------------------------------------------------ */

export class PermissionGrantStore {
  private grants: Map<string, PermissionGrant> = new Map();
  private auditLog: GrantAuditEntry[] = [];

  /* -- Create / Revoke ---------------------------------------------- */

  createGrant(params: {
    granteeId: string;
    grantorId: string;
    scope: string;
    grantType: GrantType;
    delegatable?: boolean;
    expiresAt?: string | null;
    reason?: string;
  }): PermissionGrant {
    const grant: PermissionGrant = {
      id: generateId(),
      granteeId: params.granteeId,
      grantorId: params.grantorId,
      scope: params.scope,
      grantType: params.grantType,
      delegatable: params.delegatable ?? false,
      expiresAt: params.expiresAt ?? null,
      createdAt: new Date().toISOString(),
      revokedAt: null,
      reason: params.reason,
    };

    this.grants.set(grant.id, grant);
    this.log("created", grant.id, params.grantorId, { scope: params.scope });
    return grant;
  }

  revokeGrant(grantId: string, revokedBy: string): boolean {
    const grant = this.grants.get(grantId);
    if (!grant || grant.revokedAt) return false;

    grant.revokedAt = new Date().toISOString();
    this.log("revoked", grantId, revokedBy, {});

    // Also revoke all delegated child grants
    for (const child of this.grants.values()) {
      if (child.parentGrantId === grantId && !child.revokedAt) {
        child.revokedAt = new Date().toISOString();
        this.log("revoked", child.id, revokedBy, {
          reason: "parent_grant_revoked",
        });
      }
    }

    return true;
  }

  /* -- Delegation --------------------------------------------------- */

  delegate(request: DelegationRequest): PermissionGrant {
    const original = this.grants.get(request.originalGrantId);

    if (!original) {
      throw new Error(`Grant "${request.originalGrantId}" not found.`);
    }
    if (original.revokedAt) {
      throw new Error("Cannot delegate a revoked grant.");
    }
    if (!original.delegatable) {
      throw new Error("This grant is not delegatable.");
    }
    if (original.granteeId !== request.delegatorId) {
      throw new Error("Only the grantee can delegate their grant.");
    }
    if (this.isExpired(original)) {
      throw new Error("Cannot delegate an expired grant.");
    }

    // Validate narrowed scope
    const newScope = request.narrowedScope ?? original.scope;
    if (!isNarrowerScope(newScope, original.scope)) {
      throw new Error(
        `Delegated scope "${newScope}" is not a subset of "${original.scope}".`
      );
    }

    // Validate narrowed grant type
    const newType = request.narrowedGrantType ?? original.grantType;
    if (!grantTypeIncludes(original.grantType, newType)) {
      throw new Error(
        `Delegated grant type "${newType}" exceeds original "${original.grantType}".`
      );
    }

    // Validate expiration
    let expiresAt = request.expiresAt ?? original.expiresAt;
    if (
      expiresAt &&
      original.expiresAt &&
      new Date(expiresAt) > new Date(original.expiresAt)
    ) {
      expiresAt = original.expiresAt;
    }

    const delegated: PermissionGrant = {
      id: generateId(),
      granteeId: request.newGranteeId,
      grantorId: request.delegatorId,
      scope: newScope,
      grantType: newType,
      delegatable: false, // delegated grants cannot be re-delegated by default
      expiresAt,
      createdAt: new Date().toISOString(),
      revokedAt: null,
      reason: request.reason,
      parentGrantId: request.originalGrantId,
    };

    this.grants.set(delegated.id, delegated);
    this.log("delegated", delegated.id, request.delegatorId, {
      originalGrantId: request.originalGrantId,
      newGranteeId: request.newGranteeId,
    });

    return delegated;
  }

  /* -- Permission check --------------------------------------------- */

  checkPermission(
    userId: string,
    scope: string,
    requiredType: GrantType
  ): PermissionCheckResult {
    const now = new Date().toISOString();

    for (const grant of this.grants.values()) {
      if (grant.granteeId !== userId) continue;
      if (grant.revokedAt) continue;
      if (grant.expiresAt && grant.expiresAt < now) continue;

      if (
        scopeMatches(grant.scope, scope) &&
        grantTypeIncludes(grant.grantType, requiredType)
      ) {
        this.log("checked", grant.id, userId, {
          scope,
          requiredType,
          result: "allowed",
        });
        return {
          allowed: true,
          matchedGrant: grant,
          reason: `Matched grant ${grant.id} (scope: ${grant.scope}, type: ${grant.grantType}).`,
        };
      }
    }

    this.log("checked", "none", userId, {
      scope,
      requiredType,
      result: "denied",
    });

    return {
      allowed: false,
      matchedGrant: null,
      reason: `No active grant found for user "${userId}" with scope "${scope}" and type "${requiredType}".`,
    };
  }

  /* -- Query -------------------------------------------------------- */

  queryGrants(query: GrantQuery): PermissionGrant[] {
    const results: PermissionGrant[] = [];
    const now = new Date().toISOString();

    for (const grant of this.grants.values()) {
      if (query.granteeId && grant.granteeId !== query.granteeId) continue;
      if (query.grantorId && grant.grantorId !== query.grantorId) continue;
      if (query.scope && !scopeMatches(grant.scope, query.scope)) continue;
      if (query.grantType && grant.grantType !== query.grantType) continue;
      if (!query.includeRevoked && grant.revokedAt) continue;
      if (
        !query.includeExpired &&
        grant.expiresAt &&
        grant.expiresAt < now
      )
        continue;

      results.push(grant);
    }

    return results;
  }

  getGrant(id: string): PermissionGrant | undefined {
    return this.grants.get(id);
  }

  /* -- Expiration management ---------------------------------------- */

  isExpired(grant: PermissionGrant): boolean {
    if (!grant.expiresAt) return false;
    return new Date(grant.expiresAt) <= new Date();
  }

  cleanupExpired(): number {
    let count = 0;
    const now = new Date().toISOString();

    for (const grant of this.grants.values()) {
      if (
        !grant.revokedAt &&
        grant.expiresAt &&
        grant.expiresAt < now
      ) {
        this.log("expired", grant.id, "system", {});
        count++;
      }
    }

    return count;
  }

  /* -- Middleware helper --------------------------------------------- */

  /**
   * Returns a middleware-style check function that can be used in API routes.
   */
  createMiddleware(scope: string, requiredType: GrantType) {
    return (userId: string): PermissionCheckResult => {
      return this.checkPermission(userId, scope, requiredType);
    };
  }

  /**
   * Higher-order function for protecting async handlers.
   */
  protect<TArgs extends unknown[], TResult>(
    scope: string,
    requiredType: GrantType,
    handler: (userId: string, ...args: TArgs) => TResult | Promise<TResult>
  ): (userId: string, ...args: TArgs) => Promise<TResult> {
    return async (userId: string, ...args: TArgs) => {
      const check = this.checkPermission(userId, scope, requiredType);
      if (!check.allowed) {
        throw new PermissionDeniedError(userId, scope, requiredType, check.reason);
      }
      return handler(userId, ...args);
    };
  }

  /* -- Audit log ---------------------------------------------------- */

  getAuditLog(
    filter?: { grantId?: string; actorId?: string; action?: string }
  ): readonly GrantAuditEntry[] {
    if (!filter) return this.auditLog;

    return this.auditLog.filter((entry) => {
      if (filter.grantId && entry.grantId !== filter.grantId) return false;
      if (filter.actorId && entry.actorId !== filter.actorId) return false;
      if (filter.action && entry.action !== filter.action) return false;
      return true;
    });
  }

  private log(
    action: GrantAuditEntry["action"],
    grantId: string,
    actorId: string,
    details: Record<string, unknown>
  ): void {
    this.auditLog.push({
      action,
      grantId,
      actorId,
      timestamp: new Date().toISOString(),
      details,
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Error class                                                       */
/* ------------------------------------------------------------------ */

export class PermissionDeniedError extends Error {
  public readonly userId: string;
  public readonly scope: string;
  public readonly requiredType: GrantType;

  constructor(
    userId: string,
    scope: string,
    requiredType: GrantType,
    reason: string
  ) {
    super(`Permission denied: ${reason}`);
    this.name = "PermissionDeniedError";
    this.userId = userId;
    this.scope = scope;
    this.requiredType = requiredType;
  }
}

/* ------------------------------------------------------------------ */
/*  Singleton convenience                                             */
/* ------------------------------------------------------------------ */

let defaultStore: PermissionGrantStore | null = null;

export function getPermissionStore(): PermissionGrantStore {
  if (!defaultStore) {
    defaultStore = new PermissionGrantStore();
  }
  return defaultStore;
}

export function resetPermissionStore(): void {
  defaultStore = null;
}
