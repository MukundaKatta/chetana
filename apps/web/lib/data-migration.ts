/**
 * Data migration utilities with forward/rollback support and
 * version tracking (Issue #345).
 */

export interface Migration {
  /** Unique version identifier (e.g., "001", "20240101_add_column"). */
  version: string;
  /** Human-readable description. */
  description: string;
  /** Forward migration function. */
  up: () => Promise<void>;
  /** Rollback migration function. */
  down: () => Promise<void>;
}

export interface MigrationRecord {
  version: string;
  description: string;
  appliedAt: string;
  status: "applied" | "rolled_back" | "failed";
}

export class MigrationRunner {
  private migrations: Migration[] = [];
  private applied: MigrationRecord[] = [];

  /**
   * Register a migration. Migrations are applied in registration order.
   */
  register(migration: Migration): void {
    // Prevent duplicate versions
    if (this.migrations.some((m) => m.version === migration.version)) {
      throw new Error(`Migration version "${migration.version}" is already registered`);
    }
    this.migrations.push(migration);
  }

  /**
   * Register multiple migrations at once.
   */
  registerAll(migrations: Migration[]): void {
    for (const m of migrations) {
      this.register(m);
    }
  }

  /**
   * Get all registered migrations.
   */
  getRegistered(): Migration[] {
    return [...this.migrations];
  }

  /**
   * Get the history of applied/rolled-back migrations.
   */
  getHistory(): MigrationRecord[] {
    return [...this.applied];
  }

  /**
   * Get the current version (last successfully applied migration).
   */
  getCurrentVersion(): string | null {
    const appliedVersions = this.applied.filter(
      (r) => r.status === "applied"
    );
    if (appliedVersions.length === 0) return null;
    return appliedVersions[appliedVersions.length - 1].version;
  }

  /**
   * Get migrations that have not yet been applied.
   */
  getPendingMigrations(): Migration[] {
    const appliedVersions = new Set(
      this.applied
        .filter((r) => r.status === "applied")
        .map((r) => r.version)
    );
    return this.migrations.filter((m) => !appliedVersions.has(m.version));
  }

  /**
   * Run all pending migrations in order.
   * Stops at the first failure and marks it as failed.
   *
   * @returns The list of migration records for this run
   */
  async runPendingMigrations(): Promise<MigrationRecord[]> {
    const pending = this.getPendingMigrations();
    const results: MigrationRecord[] = [];

    for (const migration of pending) {
      const record: MigrationRecord = {
        version: migration.version,
        description: migration.description,
        appliedAt: new Date().toISOString(),
        status: "applied",
      };

      try {
        await migration.up();
        this.applied.push(record);
        results.push(record);
      } catch (err) {
        record.status = "failed";
        this.applied.push(record);
        results.push(record);
        throw new Error(
          `Migration "${migration.version}" failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    return results;
  }

  /**
   * Run a single migration forward by version.
   */
  async runMigration(version: string): Promise<MigrationRecord> {
    const migration = this.migrations.find((m) => m.version === version);
    if (!migration) {
      throw new Error(`Migration version "${version}" not found`);
    }

    const alreadyApplied = this.applied.find(
      (r) => r.version === version && r.status === "applied"
    );
    if (alreadyApplied) {
      throw new Error(`Migration "${version}" is already applied`);
    }

    const record: MigrationRecord = {
      version: migration.version,
      description: migration.description,
      appliedAt: new Date().toISOString(),
      status: "applied",
    };

    try {
      await migration.up();
      this.applied.push(record);
      return record;
    } catch (err) {
      record.status = "failed";
      this.applied.push(record);
      throw new Error(
        `Migration "${version}" failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * Rollback the last successfully applied migration.
   *
   * @returns The rolled-back migration record, or null if nothing to roll back
   */
  async rollbackLast(): Promise<MigrationRecord | null> {
    // Find last applied migration
    const appliedRecords = this.applied.filter(
      (r) => r.status === "applied"
    );
    if (appliedRecords.length === 0) return null;

    const lastApplied = appliedRecords[appliedRecords.length - 1];
    const migration = this.migrations.find(
      (m) => m.version === lastApplied.version
    );

    if (!migration) {
      throw new Error(
        `Cannot rollback: migration "${lastApplied.version}" definition not found`
      );
    }

    try {
      await migration.down();
      lastApplied.status = "rolled_back";

      const record: MigrationRecord = {
        version: migration.version,
        description: migration.description,
        appliedAt: new Date().toISOString(),
        status: "rolled_back",
      };
      return record;
    } catch (err) {
      throw new Error(
        `Rollback of "${migration.version}" failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * Rollback a specific migration by version.
   */
  async rollbackMigration(version: string): Promise<MigrationRecord> {
    const migration = this.migrations.find((m) => m.version === version);
    if (!migration) {
      throw new Error(`Migration version "${version}" not found`);
    }

    const appliedRecord = this.applied.find(
      (r) => r.version === version && r.status === "applied"
    );
    if (!appliedRecord) {
      throw new Error(`Migration "${version}" is not currently applied`);
    }

    try {
      await migration.down();
      appliedRecord.status = "rolled_back";

      return {
        version: migration.version,
        description: migration.description,
        appliedAt: new Date().toISOString(),
        status: "rolled_back",
      };
    } catch (err) {
      throw new Error(
        `Rollback of "${version}" failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}
