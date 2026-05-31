/**
 * Access control: RBAC (issue #712) and PII masking policy (issue #750).
 */

// --- RBAC (#712) -----------------------------------------------------------

export type Role = "owner" | "admin" | "editor" | "viewer";
export type Permission =
  | "audit:read" | "audit:write" | "audit:delete"
  | "probe:read" | "probe:write"
  | "settings:read" | "settings:write"
  | "member:manage"
  | "billing:manage";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    "audit:read", "audit:write", "audit:delete", "probe:read", "probe:write",
    "settings:read", "settings:write", "member:manage", "billing:manage",
  ],
  admin: [
    "audit:read", "audit:write", "audit:delete", "probe:read", "probe:write",
    "settings:read", "settings:write", "member:manage",
  ],
  editor: ["audit:read", "audit:write", "probe:read", "probe:write", "settings:read"],
  viewer: ["audit:read", "probe:read", "settings:read"],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function permissionsFor(role: Role): Permission[] {
  return [...(ROLE_PERMISSIONS[role] ?? [])];
}

/** Highest role wins when a user has multiple. */
const ROLE_RANK: Record<Role, number> = { viewer: 0, editor: 1, admin: 2, owner: 3 };
export function effectiveRole(roles: Role[]): Role {
  return roles.reduce<Role>((best, r) => (ROLE_RANK[r] > ROLE_RANK[best] ? r : best), "viewer");
}

// --- PII masking policy (#750) ---------------------------------------------

export interface MaskingPolicy {
  /** Roles permitted to view unmasked PII. */
  revealRoles: Role[];
}

/** Mask all but the last `keep` characters of a value. */
export function maskValue(value: string, keep = 0): string {
  if (value.length <= keep) return "*".repeat(value.length);
  return "*".repeat(value.length - keep) + value.slice(value.length - keep);
}

/** Returns the field value masked unless the role is permitted to reveal it. */
export function applyMasking(value: string, role: Role, policy: MaskingPolicy, keep = 0): string {
  return policy.revealRoles.includes(role) ? value : maskValue(value, keep);
}
