/**
 * Schema migration system (Issue #537).
 * Versioned scripts with up/down support, dependency resolution,
 * dry-run mode, and migration status dashboard data.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface MigrationScript {
  /** Unique version identifier, e.g. "001", "002_add_users". */
  version: string;
  /** Human-readable description. */
  description: string;
  /** Versions this migration depends on (must run first). */
  dependsOn?: string[];
  /** Apply the migration. Receives a generic executor. */
  up: (executor: MigrationExecutor) => Promise<void>;
  /** Revert the migration. */
  down: (executor: MigrationExecutor) => Promise<void>;
}

export interface MigrationExecutor {
  /** Execute a raw SQL statement (or equivalent DDL). */
  execute(sql: string): Promise<void>;
  /** Execute a query that returns rows. */
  query<T = Record<string, unknown>>(sql: string): Promise<T[]>;
}

export type MigrationDirection = "up" | "down";

export type MigrationStatus = "pending" | "applied" | "failed" | "rolled_back";

export interface MigrationRecord {
  version: string;
  description: string;
  status: MigrationStatus;
  appliedAt: string | null;
  rolledBackAt: string | null;
  durationMs: number | null;
  error: string | null;
}

export interface MigrationPlan {
  direction: MigrationDirection;
  steps: MigrationPlanStep[];
  dryRun: boolean;
}

export interface MigrationPlanStep {
  version: string;
  description: string;
  direction: MigrationDirection;
  dependsOn: string[];
  /** If dry-run, the step was NOT executed. */
  skipped: boolean;
}

export interface MigrationDashboardData {
  totalMigrations: number;
  applied: number;
  pending: number;
  failed: number;
  rolledBack: number;
  lastAppliedVersion: string | null;
  lastAppliedAt: string | null;
  records: MigrationRecord[];
}

export interface MigrationRunResult {
  success: boolean;
  plan: MigrationPlan;
  executed: MigrationRecord[];
  errors: Array<{ version: string; error: string }>;
}

/* ------------------------------------------------------------------ */
/*  Dependency resolution                                             */
/* ------------------------------------------------------------------ */

function topologicalSort(scripts: MigrationScript[]): MigrationScript[] {
  const byVersion = new Map<string, MigrationScript>();
  for (const s of scripts) byVersion.set(s.version, s);

  const visited = new Set<string>();
  const sorted: MigrationScript[] = [];

  function visit(version: string, stack: Set<string>) {
    if (visited.has(version)) return;
    if (stack.has(version)) {
      throw new Error(`Circular dependency detected involving migration "${version}"`);
    }
    const script = byVersion.get(version);
    if (!script) {
      throw new Error(`Dependency "${version}" not found in migration registry`);
    }
    stack.add(version);
    for (const dep of script.dependsOn ?? []) {
      visit(dep, stack);
    }
    stack.delete(version);
    visited.add(version);
    sorted.push(script);
  }

  for (const s of scripts) {
    visit(s.version, new Set());
  }

  return sorted;
}

/* ------------------------------------------------------------------ */
/*  Migration Registry                                                */
/* ------------------------------------------------------------------ */

export class MigrationRegistry {
  private scripts: MigrationScript[] = [];
  private records: Map<string, MigrationRecord> = new Map();
  private executor: MigrationExecutor;

  constructor(executor: MigrationExecutor) {
    this.executor = executor;
  }

  /** Register one or more migration scripts. */
  register(...scripts: MigrationScript[]): void {
    for (const s of scripts) {
      if (this.scripts.some((existing) => existing.version === s.version)) {
        throw new Error(`Duplicate migration version: "${s.version}"`);
      }
      this.scripts.push(s);
    }
  }

  /** Load previously applied migration records (e.g. from a DB table). */
  loadRecords(records: MigrationRecord[]): void {
    this.records.clear();
    for (const r of records) {
      this.records.set(r.version, r);
    }
  }

  /** Get the current status of a specific migration. */
  getStatus(version: string): MigrationStatus {
    return this.records.get(version)?.status ?? "pending";
  }

  /** Build a plan for running pending migrations UP. */
  planUp(options?: { dryRun?: boolean }): MigrationPlan {
    const sorted = topologicalSort(this.scripts);
    const steps: MigrationPlanStep[] = [];

    for (const script of sorted) {
      const status = this.getStatus(script.version);
      if (status === "applied") continue;
      steps.push({
        version: script.version,
        description: script.description,
        direction: "up",
        dependsOn: script.dependsOn ?? [],
        skipped: options?.dryRun ?? false,
      });
    }

    return { direction: "up", steps, dryRun: options?.dryRun ?? false };
  }

  /** Build a plan for rolling back to a target version (inclusive). */
  planDown(targetVersion: string, options?: { dryRun?: boolean }): MigrationPlan {
    const sorted = topologicalSort(this.scripts);
    const reversed = [...sorted].reverse();
    const steps: MigrationPlanStep[] = [];
    let found = false;

    for (const script of reversed) {
      const status = this.getStatus(script.version);
      if (status !== "applied") continue;
      steps.push({
        version: script.version,
        description: script.description,
        direction: "down",
        dependsOn: script.dependsOn ?? [],
        skipped: options?.dryRun ?? false,
      });
      if (script.version === targetVersion) {
        found = true;
        break;
      }
    }

    if (!found && steps.length > 0) {
      throw new Error(
        `Target version "${targetVersion}" not found among applied migrations`
      );
    }

    return { direction: "down", steps, dryRun: options?.dryRun ?? false };
  }

  /** Execute pending migrations. */
  async migrateUp(options?: { dryRun?: boolean }): Promise<MigrationRunResult> {
    const plan = this.planUp(options);
    return this.executePlan(plan);
  }

  /** Roll back to a target version. */
  async migrateDown(
    targetVersion: string,
    options?: { dryRun?: boolean }
  ): Promise<MigrationRunResult> {
    const plan = this.planDown(targetVersion, options);
    return this.executePlan(plan);
  }

  /** Execute a migration plan. */
  private async executePlan(plan: MigrationPlan): Promise<MigrationRunResult> {
    const executed: MigrationRecord[] = [];
    const errors: Array<{ version: string; error: string }> = [];

    for (const step of plan.steps) {
      if (plan.dryRun) {
        executed.push({
          version: step.version,
          description: step.description,
          status: "pending",
          appliedAt: null,
          rolledBackAt: null,
          durationMs: null,
          error: null,
        });
        continue;
      }

      const script = this.scripts.find((s) => s.version === step.version);
      if (!script) {
        errors.push({ version: step.version, error: "Script not found" });
        continue;
      }

      const startTime = Date.now();
      try {
        if (step.direction === "up") {
          await script.up(this.executor);
        } else {
          await script.down(this.executor);
        }

        const record: MigrationRecord = {
          version: step.version,
          description: step.description,
          status: step.direction === "up" ? "applied" : "rolled_back",
          appliedAt: step.direction === "up" ? new Date().toISOString() : null,
          rolledBackAt: step.direction === "down" ? new Date().toISOString() : null,
          durationMs: Date.now() - startTime,
          error: null,
        };

        this.records.set(step.version, record);
        executed.push(record);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const record: MigrationRecord = {
          version: step.version,
          description: step.description,
          status: "failed",
          appliedAt: null,
          rolledBackAt: null,
          durationMs: Date.now() - startTime,
          error: errorMsg,
        };
        this.records.set(step.version, record);
        executed.push(record);
        errors.push({ version: step.version, error: errorMsg });
        // Stop on first failure
        break;
      }
    }

    return {
      success: errors.length === 0,
      plan,
      executed,
      errors,
    };
  }

  /** Generate dashboard summary data. */
  getDashboardData(): MigrationDashboardData {
    const sorted = topologicalSort(this.scripts);
    const records: MigrationRecord[] = sorted.map((s) => {
      const existing = this.records.get(s.version);
      if (existing) return existing;
      return {
        version: s.version,
        description: s.description,
        status: "pending" as const,
        appliedAt: null,
        rolledBackAt: null,
        durationMs: null,
        error: null,
      };
    });

    const applied = records.filter((r) => r.status === "applied");
    const pending = records.filter((r) => r.status === "pending");
    const failed = records.filter((r) => r.status === "failed");
    const rolledBack = records.filter((r) => r.status === "rolled_back");

    const lastApplied = applied.length > 0 ? applied[applied.length - 1] : null;

    return {
      totalMigrations: records.length,
      applied: applied.length,
      pending: pending.length,
      failed: failed.length,
      rolledBack: rolledBack.length,
      lastAppliedVersion: lastApplied?.version ?? null,
      lastAppliedAt: lastApplied?.appliedAt ?? null,
      records,
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Convenience: create an in-memory executor (for testing / dry-run) */
/* ------------------------------------------------------------------ */

export function createInMemoryExecutor(): MigrationExecutor & {
  log: string[];
} {
  const log: string[] = [];
  return {
    log,
    async execute(sql: string) {
      log.push(sql);
    },
    async query<T = Record<string, unknown>>(_sql: string): Promise<T[]> {
      log.push(_sql);
      return [] as T[];
    },
  };
}
