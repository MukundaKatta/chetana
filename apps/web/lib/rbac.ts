/**
 * Role-based access control with roles (admin, auditor, reviewer, viewer),
 * permission matrix, team management, audit ownership/delegation,
 * and activity log (Issue #390).
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type Role = "admin" | "auditor" | "reviewer" | "viewer";

export type Resource =
  | "audit"
  | "probe"
  | "report"
  | "experiment"
  | "settings"
  | "team"
  | "user"
  | "webhook"
  | "api-key";

export type Action =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "execute"
  | "export"
  | "delegate"
  | "manage";

export interface Permission {
  resource: Resource;
  actions: Action[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  teamIds: string[];
  createdAt: string;
  lastActiveAt: string | null;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  memberIds: string[];
  createdAt: string;
}

export interface AuditOwnership {
  auditId: string;
  ownerId: string;
  delegatedTo: string | null;
  delegatedAt: string | null;
  delegatedBy: string | null;
}

export interface ActivityLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: Resource;
  resourceId: string;
  details: string;
  timestamp: string;
  ip?: string;
}

export interface AccessCheckResult {
  allowed: boolean;
  reason: string;
}

/* ------------------------------------------------------------------ */
/*  Permission matrix                                                 */
/* ------------------------------------------------------------------ */

const PERMISSION_MATRIX: Record<Role, Permission[]> = {
  admin: [
    { resource: "audit", actions: ["create", "read", "update", "delete", "execute", "export", "delegate", "manage"] },
    { resource: "probe", actions: ["create", "read", "update", "delete", "manage"] },
    { resource: "report", actions: ["create", "read", "update", "delete", "export"] },
    { resource: "experiment", actions: ["create", "read", "update", "delete", "execute"] },
    { resource: "settings", actions: ["read", "update", "manage"] },
    { resource: "team", actions: ["create", "read", "update", "delete", "manage"] },
    { resource: "user", actions: ["create", "read", "update", "delete", "manage"] },
    { resource: "webhook", actions: ["create", "read", "update", "delete", "manage"] },
    { resource: "api-key", actions: ["create", "read", "delete", "manage"] },
  ],
  auditor: [
    { resource: "audit", actions: ["create", "read", "update", "execute", "export", "delegate"] },
    { resource: "probe", actions: ["create", "read", "update"] },
    { resource: "report", actions: ["create", "read", "export"] },
    { resource: "experiment", actions: ["create", "read", "update", "execute"] },
    { resource: "settings", actions: ["read"] },
    { resource: "team", actions: ["read"] },
    { resource: "user", actions: ["read"] },
    { resource: "webhook", actions: ["create", "read", "update"] },
    { resource: "api-key", actions: ["create", "read"] },
  ],
  reviewer: [
    { resource: "audit", actions: ["read", "update", "export"] },
    { resource: "probe", actions: ["read"] },
    { resource: "report", actions: ["read", "export"] },
    { resource: "experiment", actions: ["read"] },
    { resource: "settings", actions: ["read"] },
    { resource: "team", actions: ["read"] },
    { resource: "user", actions: ["read"] },
    { resource: "webhook", actions: ["read"] },
    { resource: "api-key", actions: [] },
  ],
  viewer: [
    { resource: "audit", actions: ["read"] },
    { resource: "probe", actions: ["read"] },
    { resource: "report", actions: ["read"] },
    { resource: "experiment", actions: ["read"] },
    { resource: "settings", actions: [] },
    { resource: "team", actions: ["read"] },
    { resource: "user", actions: [] },
    { resource: "webhook", actions: [] },
    { resource: "api-key", actions: [] },
  ],
};

/**
 * Get the full permission matrix.
 */
export function getPermissionMatrix(): Record<Role, Permission[]> {
  return { ...PERMISSION_MATRIX };
}

/**
 * Get permissions for a specific role.
 */
export function getRolePermissions(role: Role): Permission[] {
  return PERMISSION_MATRIX[role] ?? [];
}

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(
  role: Role,
  resource: Resource,
  action: Action,
): boolean {
  const permissions = PERMISSION_MATRIX[role];
  if (!permissions) return false;

  const resourcePerm = permissions.find((p) => p.resource === resource);
  if (!resourcePerm) return false;

  return resourcePerm.actions.includes(action);
}

/**
 * Check access with detailed result.
 */
export function checkAccess(
  user: User,
  resource: Resource,
  action: Action,
  resourceOwnerId?: string,
): AccessCheckResult {
  // Admin always has access
  if (user.role === "admin") {
    return { allowed: true, reason: "Admin role has full access" };
  }

  // Check role permissions
  if (!hasPermission(user.role, resource, action)) {
    return {
      allowed: false,
      reason: `Role "${user.role}" does not have "${action}" permission on "${resource}"`,
    };
  }

  // Owner check for update/delete actions
  if (
    (action === "update" || action === "delete") &&
    resourceOwnerId &&
    resourceOwnerId !== user.id &&
    user.role !== "auditor"
  ) {
    return {
      allowed: false,
      reason: "Only the resource owner or an auditor can modify this resource",
    };
  }

  return { allowed: true, reason: "Permission granted" };
}

/* ------------------------------------------------------------------ */
/*  Role hierarchy                                                    */
/* ------------------------------------------------------------------ */

const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 100,
  auditor: 75,
  reviewer: 50,
  viewer: 25,
};

/**
 * Compare two roles. Returns positive if a > b, negative if a < b, 0 if equal.
 */
export function compareRoles(a: Role, b: Role): number {
  return ROLE_HIERARCHY[a] - ROLE_HIERARCHY[b];
}

/**
 * Check if a user can manage another user's role.
 */
export function canManageUser(manager: User, target: User): boolean {
  if (manager.id === target.id) return false;
  if (manager.role !== "admin") return false;
  return true;
}

/* ------------------------------------------------------------------ */
/*  RBAC Manager                                                      */
/* ------------------------------------------------------------------ */

export class RBACManager {
  private users = new Map<string, User>();
  private teams = new Map<string, Team>();
  private ownership = new Map<string, AuditOwnership>();
  private activityLog: ActivityLogEntry[] = [];
  private maxLogEntries: number;

  constructor(maxLogEntries: number = 5000) {
    this.maxLogEntries = maxLogEntries;
  }

  /* -- User management -- */

  addUser(user: User): void {
    this.users.set(user.id, { ...user });
    this.log(user.id, user.name, "create", "user", user.id, `User ${user.name} added with role ${user.role}`);
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  updateUserRole(
    userId: string,
    newRole: Role,
    changedBy: User,
  ): boolean {
    const user = this.users.get(userId);
    if (!user) return false;
    if (!canManageUser(changedBy, user)) return false;

    const oldRole = user.role;
    user.role = newRole;

    this.log(
      changedBy.id,
      changedBy.name,
      "update",
      "user",
      userId,
      `Changed role from ${oldRole} to ${newRole}`,
    );

    return true;
  }

  removeUser(userId: string, removedBy: User): boolean {
    const user = this.users.get(userId);
    if (!user) return false;
    if (!canManageUser(removedBy, user)) return false;

    this.users.delete(userId);

    // Remove from teams
    for (const team of this.teams.values()) {
      team.memberIds = team.memberIds.filter((id) => id !== userId);
    }

    this.log(
      removedBy.id,
      removedBy.name,
      "delete",
      "user",
      userId,
      `Removed user ${user.name}`,
    );

    return true;
  }

  listUsers(options?: { role?: Role; teamId?: string }): User[] {
    let users = Array.from(this.users.values());

    if (options?.role) {
      users = users.filter((u) => u.role === options.role);
    }
    if (options?.teamId) {
      const team = this.teams.get(options.teamId);
      if (team) {
        const memberSet = new Set(team.memberIds);
        users = users.filter((u) => memberSet.has(u.id));
      }
    }

    return users;
  }

  /* -- Team management -- */

  createTeam(team: Team, createdBy: User): boolean {
    const access = checkAccess(createdBy, "team", "create");
    if (!access.allowed) return false;

    this.teams.set(team.id, { ...team });
    this.log(
      createdBy.id,
      createdBy.name,
      "create",
      "team",
      team.id,
      `Created team "${team.name}"`,
    );

    return true;
  }

  getTeam(teamId: string): Team | undefined {
    return this.teams.get(teamId);
  }

  addTeamMember(teamId: string, userId: string, addedBy: User): boolean {
    const access = checkAccess(addedBy, "team", "manage");
    if (!access.allowed) return false;

    const team = this.teams.get(teamId);
    const user = this.users.get(userId);
    if (!team || !user) return false;

    if (!team.memberIds.includes(userId)) {
      team.memberIds.push(userId);
    }
    if (!user.teamIds.includes(teamId)) {
      user.teamIds.push(teamId);
    }

    this.log(
      addedBy.id,
      addedBy.name,
      "update",
      "team",
      teamId,
      `Added ${user.name} to team "${team.name}"`,
    );

    return true;
  }

  removeTeamMember(
    teamId: string,
    userId: string,
    removedBy: User,
  ): boolean {
    const access = checkAccess(removedBy, "team", "manage");
    if (!access.allowed) return false;

    const team = this.teams.get(teamId);
    const user = this.users.get(userId);
    if (!team || !user) return false;

    team.memberIds = team.memberIds.filter((id) => id !== userId);
    user.teamIds = user.teamIds.filter((id) => id !== teamId);

    this.log(
      removedBy.id,
      removedBy.name,
      "update",
      "team",
      teamId,
      `Removed ${user.name} from team "${team.name}"`,
    );

    return true;
  }

  listTeams(): Team[] {
    return Array.from(this.teams.values());
  }

  /* -- Audit ownership & delegation -- */

  assignOwnership(auditId: string, ownerId: string): void {
    this.ownership.set(auditId, {
      auditId,
      ownerId,
      delegatedTo: null,
      delegatedAt: null,
      delegatedBy: null,
    });
  }

  delegateAudit(
    auditId: string,
    delegateTo: string,
    delegatedBy: User,
  ): boolean {
    const access = checkAccess(delegatedBy, "audit", "delegate");
    if (!access.allowed) return false;

    const owner = this.ownership.get(auditId);
    if (!owner) return false;

    // Only owner or admin can delegate
    if (owner.ownerId !== delegatedBy.id && delegatedBy.role !== "admin") {
      return false;
    }

    const delegateUser = this.users.get(delegateTo);
    if (!delegateUser) return false;

    // Delegate must be at least a reviewer
    if (compareRoles(delegateUser.role, "reviewer") < 0) return false;

    owner.delegatedTo = delegateTo;
    owner.delegatedAt = new Date().toISOString();
    owner.delegatedBy = delegatedBy.id;

    this.log(
      delegatedBy.id,
      delegatedBy.name,
      "delegate",
      "audit",
      auditId,
      `Delegated audit to ${delegateUser.name}`,
    );

    return true;
  }

  getOwnership(auditId: string): AuditOwnership | undefined {
    return this.ownership.get(auditId);
  }

  canAccessAudit(userId: string, auditId: string, action: Action): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    const access = checkAccess(user, "audit", action);
    if (!access.allowed) return false;

    // For read, all authorized users can access
    if (action === "read") return true;

    // For modification, check ownership
    const owner = this.ownership.get(auditId);
    if (!owner) return true; // No ownership = open

    if (user.role === "admin") return true;
    if (owner.ownerId === userId) return true;
    if (owner.delegatedTo === userId) return true;

    return false;
  }

  /* -- Activity log -- */

  private log(
    userId: string,
    userName: string,
    action: string,
    resource: Resource,
    resourceId: string,
    details: string,
  ): void {
    this.activityLog.push({
      id: `log_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      userId,
      userName,
      action,
      resource,
      resourceId,
      details,
      timestamp: new Date().toISOString(),
    });

    if (this.activityLog.length > this.maxLogEntries) {
      this.activityLog = this.activityLog.slice(-this.maxLogEntries);
    }
  }

  /**
   * Record an external activity log entry.
   */
  recordActivity(
    user: User,
    action: string,
    resource: Resource,
    resourceId: string,
    details: string,
  ): void {
    this.log(user.id, user.name, action, resource, resourceId, details);
  }

  getActivityLog(options?: {
    userId?: string;
    resource?: Resource;
    limit?: number;
    from?: string;
    to?: string;
  }): ActivityLogEntry[] {
    let log = [...this.activityLog];

    if (options?.userId) {
      log = log.filter((e) => e.userId === options.userId);
    }
    if (options?.resource) {
      log = log.filter((e) => e.resource === options.resource);
    }
    if (options?.from) {
      const fromTime = new Date(options.from).getTime();
      log = log.filter((e) => new Date(e.timestamp).getTime() >= fromTime);
    }
    if (options?.to) {
      const toTime = new Date(options.to).getTime();
      log = log.filter((e) => new Date(e.timestamp).getTime() <= toTime);
    }

    log.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    if (options?.limit) {
      log = log.slice(0, options.limit);
    }

    return log;
  }
}
