/**
 * Multi-tenancy (Issue #470).
 * Org CRUD, data scoping by org ID, org-level settings,
 * member management, cross-org sharing.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type OrgRole = "owner" | "admin" | "member" | "viewer";

export type OrgPlan = "free" | "pro" | "enterprise";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: OrgPlan;
  settings: OrgSettings;
  createdAt: string;
  updatedAt: string;
}

export interface OrgSettings {
  /** Maximum number of audits per month. */
  maxAuditsPerMonth: number;
  /** Maximum number of members. */
  maxMembers: number;
  /** Allowed model providers. */
  allowedProviders: string[];
  /** Default theory weights for scoring. */
  defaultTheoryWeights?: Record<string, number>;
  /** Custom branding (enterprise). */
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    orgDisplayName?: string;
  };
  /** Data retention in days (0 = unlimited). */
  dataRetentionDays: number;
  /** Whether to allow cross-org sharing. */
  allowCrossOrgSharing: boolean;
}

export interface OrgMember {
  id: string;
  orgId: string;
  userId: string;
  email: string;
  displayName: string;
  role: OrgRole;
  joinedAt: string;
}

export interface OrgInvite {
  id: string;
  orgId: string;
  email: string;
  role: OrgRole;
  invitedBy: string;
  expiresAt: string;
  acceptedAt?: string;
}

export interface CrossOrgShare {
  id: string;
  sourceOrgId: string;
  targetOrgId: string;
  resourceType: "audit" | "experiment" | "probe-set";
  resourceId: string;
  permission: "view" | "clone";
  sharedBy: string;
  sharedAt: string;
  expiresAt?: string;
}

export interface DataScopeContext {
  orgId: string;
  userId: string;
  role: OrgRole;
}

export interface OrgUsage {
  orgId: string;
  auditsThisMonth: number;
  memberCount: number;
  storageUsedBytes: number;
  lastAuditAt: string | null;
}

/* ------------------------------------------------------------------ */
/*  Default settings by plan                                          */
/* ------------------------------------------------------------------ */

const PLAN_DEFAULTS: Record<OrgPlan, OrgSettings> = {
  free: {
    maxAuditsPerMonth: 10,
    maxMembers: 3,
    allowedProviders: ["anthropic", "openai"],
    dataRetentionDays: 30,
    allowCrossOrgSharing: false,
  },
  pro: {
    maxAuditsPerMonth: 100,
    maxMembers: 25,
    allowedProviders: [
      "anthropic",
      "openai",
      "google",
      "mistral",
      "deepseek",
    ],
    dataRetentionDays: 365,
    allowCrossOrgSharing: true,
  },
  enterprise: {
    maxAuditsPerMonth: -1, // unlimited
    maxMembers: -1,
    allowedProviders: [
      "anthropic",
      "openai",
      "google",
      "ollama",
      "mistral",
      "deepseek",
      "openrouter",
    ],
    dataRetentionDays: 0, // unlimited
    allowCrossOrgSharing: true,
  },
};

/* ------------------------------------------------------------------ */
/*  Org CRUD                                                          */
/* ------------------------------------------------------------------ */

export function createOrganization(
  name: string,
  slug: string,
  plan: OrgPlan = "free",
  settingsOverrides?: Partial<OrgSettings>,
): Organization {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name,
    slug: slugify(slug),
    plan,
    settings: { ...PLAN_DEFAULTS[plan], ...settingsOverrides },
    createdAt: now,
    updatedAt: now,
  };
}

export function updateOrganization(
  org: Organization,
  updates: Partial<Pick<Organization, "name" | "slug" | "plan" | "settings">>,
): Organization {
  const updated = {
    ...org,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  // If plan changed, merge new plan defaults with existing overrides
  if (updates.plan && updates.plan !== org.plan) {
    updated.settings = {
      ...PLAN_DEFAULTS[updates.plan],
      ...updates.settings,
    };
  }

  return updated;
}

export function deleteOrganization(org: Organization): {
  deletedId: string;
  deletedAt: string;
} {
  return {
    deletedId: org.id,
    deletedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/*  Data scoping                                                      */
/* ------------------------------------------------------------------ */

export interface ScopedQuery {
  orgId: string;
  /** Additional WHERE-style filter. */
  additionalFilters?: Record<string, unknown>;
}

/** Build a scoped query that enforces org-level data isolation. */
export function scopeQuery(
  context: DataScopeContext,
  additionalFilters?: Record<string, unknown>,
): ScopedQuery {
  return {
    orgId: context.orgId,
    additionalFilters,
  };
}

/** Validate that a resource belongs to the given org. */
export function validateResourceAccess(
  resource: { orgId: string },
  context: DataScopeContext,
): boolean {
  return resource.orgId === context.orgId;
}

/** Check role-based permission. */
export function hasPermission(
  role: OrgRole,
  requiredRole: OrgRole,
): boolean {
  const hierarchy: OrgRole[] = ["viewer", "member", "admin", "owner"];
  return hierarchy.indexOf(role) >= hierarchy.indexOf(requiredRole);
}

/* ------------------------------------------------------------------ */
/*  Member management                                                 */
/* ------------------------------------------------------------------ */

export function addMember(
  orgId: string,
  userId: string,
  email: string,
  displayName: string,
  role: OrgRole = "member",
): OrgMember {
  return {
    id: generateId(),
    orgId,
    userId,
    email,
    displayName,
    role,
    joinedAt: new Date().toISOString(),
  };
}

export function updateMemberRole(
  member: OrgMember,
  newRole: OrgRole,
  requesterRole: OrgRole,
): OrgMember {
  // Only owners can promote to admin/owner
  if (
    (newRole === "owner" || newRole === "admin") &&
    requesterRole !== "owner"
  ) {
    throw new Error("Only owners can promote members to admin or owner");
  }

  // Cannot demote yourself
  if (member.role === "owner" && newRole !== "owner") {
    throw new Error("Owners cannot demote themselves");
  }

  return { ...member, role: newRole };
}

export function removeMember(
  member: OrgMember,
  requesterRole: OrgRole,
): { removedId: string; removedAt: string } {
  if (!hasPermission(requesterRole, "admin")) {
    throw new Error("Insufficient permission to remove members");
  }
  if (member.role === "owner") {
    throw new Error("Cannot remove the owner");
  }
  return {
    removedId: member.id,
    removedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/*  Invitations                                                       */
/* ------------------------------------------------------------------ */

export function createInvite(
  orgId: string,
  email: string,
  role: OrgRole,
  invitedBy: string,
  expiresInMs: number = 7 * 24 * 60 * 60 * 1000,
): OrgInvite {
  return {
    id: generateId(),
    orgId,
    email,
    role,
    invitedBy,
    expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
  };
}

export function acceptInvite(invite: OrgInvite): OrgInvite {
  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    throw new Error("Invite has expired");
  }
  if (invite.acceptedAt) {
    throw new Error("Invite has already been accepted");
  }
  return { ...invite, acceptedAt: new Date().toISOString() };
}

/* ------------------------------------------------------------------ */
/*  Cross-org sharing                                                 */
/* ------------------------------------------------------------------ */

export function shareResource(
  sourceOrg: Organization,
  targetOrgId: string,
  resourceType: CrossOrgShare["resourceType"],
  resourceId: string,
  permission: CrossOrgShare["permission"],
  sharedBy: string,
  expiresInMs?: number,
): CrossOrgShare {
  if (!sourceOrg.settings.allowCrossOrgSharing) {
    throw new Error("Cross-org sharing is not enabled for this organization");
  }

  return {
    id: generateId(),
    sourceOrgId: sourceOrg.id,
    targetOrgId,
    resourceType,
    resourceId,
    permission,
    sharedBy,
    sharedAt: new Date().toISOString(),
    expiresAt: expiresInMs
      ? new Date(Date.now() + expiresInMs).toISOString()
      : undefined,
  };
}

export function revokeShare(share: CrossOrgShare): {
  revokedId: string;
  revokedAt: string;
} {
  return {
    revokedId: share.id,
    revokedAt: new Date().toISOString(),
  };
}

export function isShareValid(share: CrossOrgShare): boolean {
  if (!share.expiresAt) return true;
  return new Date(share.expiresAt).getTime() > Date.now();
}

/* ------------------------------------------------------------------ */
/*  Usage tracking                                                    */
/* ------------------------------------------------------------------ */

export function checkUsageLimit(
  usage: OrgUsage,
  settings: OrgSettings,
): { withinLimits: boolean; violations: string[] } {
  const violations: string[] = [];

  if (
    settings.maxAuditsPerMonth > 0 &&
    usage.auditsThisMonth >= settings.maxAuditsPerMonth
  ) {
    violations.push(
      `Monthly audit limit reached (${usage.auditsThisMonth}/${settings.maxAuditsPerMonth})`,
    );
  }

  if (
    settings.maxMembers > 0 &&
    usage.memberCount >= settings.maxMembers
  ) {
    violations.push(
      `Member limit reached (${usage.memberCount}/${settings.maxMembers})`,
    );
  }

  return {
    withinLimits: violations.length === 0,
    violations,
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function generateId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${ts}_${rand}`;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
