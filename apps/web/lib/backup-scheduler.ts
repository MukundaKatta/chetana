/**
 * Backup scheduler: daily/weekly/monthly, incremental backup,
 * checksum verification, rotation (keep last N), restore with
 * validation (Issue #515).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BackupFrequency = "daily" | "weekly" | "monthly";

export type BackupStatus = "pending" | "running" | "completed" | "failed" | "verified";

export interface BackupMetadata {
  id: string;
  createdAt: string;
  completedAt: string | null;
  frequency: BackupFrequency;
  status: BackupStatus;
  sizeBytes: number;
  checksum: string;
  incremental: boolean;
  parentBackupId: string | null;
  dataKeys: string[];
  error?: string;
}

export interface BackupScheduleConfig {
  frequency: BackupFrequency;
  /** Max number of backups to keep per frequency. */
  retentionCount: number;
  /** Whether to use incremental backups (only changed data). */
  incremental: boolean;
  /** Enable automatic checksum verification after backup. */
  verifyAfterBackup: boolean;
}

export interface BackupData {
  metadata: BackupMetadata;
  payload: Record<string, unknown>;
}

export interface RestoreResult {
  success: boolean;
  backupId: string;
  restoredKeys: string[];
  errors: string[];
  validationPassed: boolean;
}

export interface BackupSchedulerState {
  schedules: Map<BackupFrequency, BackupScheduleConfig>;
  backups: BackupMetadata[];
  lastBackupByFrequency: Map<BackupFrequency, string>;
  running: boolean;
}

export type StorageAdapter = {
  save: (id: string, data: BackupData) => Promise<void>;
  load: (id: string) => Promise<BackupData | null>;
  delete: (id: string) => Promise<void>;
  list: () => Promise<string[]>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `backup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function computeChecksum(data: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const buffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback: simple hash
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

function isDue(
  frequency: BackupFrequency,
  lastBackupTime: string | null
): boolean {
  if (!lastBackupTime) return true;

  const last = new Date(lastBackupTime).getTime();
  const now = Date.now();
  const diff = now - last;

  switch (frequency) {
    case "daily":
      return diff >= 24 * 60 * 60 * 1000;
    case "weekly":
      return diff >= 7 * 24 * 60 * 60 * 1000;
    case "monthly":
      return diff >= 30 * 24 * 60 * 60 * 1000;
  }
}

// ---------------------------------------------------------------------------
// In-memory storage adapter (default)
// ---------------------------------------------------------------------------

function createMemoryStorage(): StorageAdapter {
  const store = new Map<string, BackupData>();
  return {
    save: async (id, data) => {
      store.set(id, structuredClone(data));
    },
    load: async (id) => {
      const entry = store.get(id);
      return entry ? structuredClone(entry) : null;
    },
    delete: async (id) => {
      store.delete(id);
    },
    list: async () => Array.from(store.keys()),
  };
}

// ---------------------------------------------------------------------------
// Diff engine for incremental backups
// ---------------------------------------------------------------------------

function computeDiff(
  current: Record<string, unknown>,
  previous: Record<string, unknown> | null
): { changed: Record<string, unknown>; changedKeys: string[] } {
  if (!previous) {
    return { changed: current, changedKeys: Object.keys(current) };
  }

  const changed: Record<string, unknown> = {};
  const changedKeys: string[] = [];

  for (const [key, value] of Object.entries(current)) {
    const prevValue = previous[key];
    if (JSON.stringify(value) !== JSON.stringify(prevValue)) {
      changed[key] = value;
      changedKeys.push(key);
    }
  }

  return { changed, changedKeys };
}

// ---------------------------------------------------------------------------
// Backup scheduler
// ---------------------------------------------------------------------------

export class BackupScheduler {
  private state: BackupSchedulerState;
  private storage: StorageAdapter;
  private timer: ReturnType<typeof setInterval> | null = null;
  private dataProvider: (() => Promise<Record<string, unknown>>) | null = null;

  constructor(storage?: StorageAdapter) {
    this.storage = storage ?? createMemoryStorage();
    this.state = {
      schedules: new Map(),
      backups: [],
      lastBackupByFrequency: new Map(),
      running: false,
    };
  }

  // -----------------------------------------------------------------------
  // Configuration
  // -----------------------------------------------------------------------

  addSchedule(config: BackupScheduleConfig): void {
    this.state.schedules.set(config.frequency, config);
  }

  removeSchedule(frequency: BackupFrequency): void {
    this.state.schedules.delete(frequency);
  }

  setDataProvider(provider: () => Promise<Record<string, unknown>>): void {
    this.dataProvider = provider;
  }

  // -----------------------------------------------------------------------
  // Backup creation
  // -----------------------------------------------------------------------

  async createBackup(
    frequency: BackupFrequency,
    data: Record<string, unknown>
  ): Promise<BackupMetadata> {
    const config = this.state.schedules.get(frequency);
    const id = generateId();
    const now = new Date().toISOString();

    const metadata: BackupMetadata = {
      id,
      createdAt: now,
      completedAt: null,
      frequency,
      status: "running",
      sizeBytes: 0,
      checksum: "",
      incremental: config?.incremental ?? false,
      parentBackupId: null,
      dataKeys: [],
    };

    this.state.backups.push(metadata);

    try {
      let payload: Record<string, unknown>;
      let dataKeys: string[];

      if (config?.incremental) {
        // Find the last completed backup of the same frequency
        const lastBackup = this.getLastCompletedBackup(frequency);
        let previousData: Record<string, unknown> | null = null;

        if (lastBackup) {
          const prev = await this.storage.load(lastBackup.id);
          previousData = prev?.payload ?? null;
          metadata.parentBackupId = lastBackup.id;
        }

        const diff = computeDiff(data, previousData);
        payload = diff.changed;
        dataKeys = diff.changedKeys;
      } else {
        payload = data;
        dataKeys = Object.keys(data);
      }

      const serialized = JSON.stringify(payload);
      const checksum = await computeChecksum(serialized);

      metadata.sizeBytes = new Blob([serialized]).size;
      metadata.checksum = checksum;
      metadata.dataKeys = dataKeys;
      metadata.completedAt = new Date().toISOString();
      metadata.status = "completed";

      await this.storage.save(id, { metadata, payload });

      // Verify if configured
      if (config?.verifyAfterBackup) {
        const verified = await this.verifyBackup(id);
        metadata.status = verified ? "verified" : "failed";
        if (!verified) metadata.error = "Post-backup verification failed";
      }

      // Rotation
      if (config?.retentionCount) {
        await this.rotateBackups(frequency, config.retentionCount);
      }

      return metadata;
    } catch (err) {
      metadata.status = "failed";
      metadata.error = err instanceof Error ? err.message : "Unknown error";
      return metadata;
    }
  }

  // -----------------------------------------------------------------------
  // Verification
  // -----------------------------------------------------------------------

  async verifyBackup(backupId: string): Promise<boolean> {
    const stored = await this.storage.load(backupId);
    if (!stored) return false;

    const serialized = JSON.stringify(stored.payload);
    const actualChecksum = await computeChecksum(serialized);
    return actualChecksum === stored.metadata.checksum;
  }

  // -----------------------------------------------------------------------
  // Restoration
  // -----------------------------------------------------------------------

  async restore(backupId: string): Promise<RestoreResult> {
    const errors: string[] = [];
    const stored = await this.storage.load(backupId);

    if (!stored) {
      return {
        success: false,
        backupId,
        restoredKeys: [],
        errors: ["Backup not found"],
        validationPassed: false,
      };
    }

    // Verify integrity
    const valid = await this.verifyBackup(backupId);
    if (!valid) {
      errors.push("Checksum verification failed — backup may be corrupted");
    }

    // For incremental backups, reconstruct full data
    let fullData: Record<string, unknown>;
    if (stored.metadata.incremental && stored.metadata.parentBackupId) {
      const parentResult = await this.restore(stored.metadata.parentBackupId);
      if (!parentResult.success) {
        errors.push(`Failed to restore parent backup: ${stored.metadata.parentBackupId}`);
        return {
          success: false,
          backupId,
          restoredKeys: [],
          errors,
          validationPassed: valid,
        };
      }
      // Merge parent data with incremental changes
      const parentStored = await this.storage.load(stored.metadata.parentBackupId);
      fullData = { ...(parentStored?.payload ?? {}), ...stored.payload };
    } else {
      fullData = stored.payload;
    }

    // Validate restored data
    const restoredKeys = Object.keys(fullData);
    if (restoredKeys.length === 0) {
      errors.push("Restored data is empty");
    }

    return {
      success: errors.length === 0,
      backupId,
      restoredKeys,
      errors,
      validationPassed: valid,
    };
  }

  async getRestoredData(backupId: string): Promise<Record<string, unknown> | null> {
    const stored = await this.storage.load(backupId);
    if (!stored) return null;

    if (stored.metadata.incremental && stored.metadata.parentBackupId) {
      const parentData = await this.getRestoredData(stored.metadata.parentBackupId);
      return { ...(parentData ?? {}), ...stored.payload };
    }

    return stored.payload;
  }

  // -----------------------------------------------------------------------
  // Rotation
  // -----------------------------------------------------------------------

  async rotateBackups(
    frequency: BackupFrequency,
    keepCount: number
  ): Promise<number> {
    const frequencyBackups = this.state.backups
      .filter(
        (b) =>
          b.frequency === frequency &&
          (b.status === "completed" || b.status === "verified")
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    const toDelete = frequencyBackups.slice(keepCount);
    let deleted = 0;

    for (const backup of toDelete) {
      await this.storage.delete(backup.id);
      this.state.backups = this.state.backups.filter((b) => b.id !== backup.id);
      deleted++;
    }

    return deleted;
  }

  // -----------------------------------------------------------------------
  // Scheduling
  // -----------------------------------------------------------------------

  start(checkIntervalMs = 60_000): void {
    if (this.timer) return;
    this.state.running = true;

    this.timer = setInterval(async () => {
      await this.checkAndRun();
    }, checkIntervalMs);

    // Run immediately on start
    this.checkAndRun().catch(() => {
      /* swallow */
    });
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.state.running = false;
  }

  private async checkAndRun(): Promise<void> {
    if (!this.dataProvider) return;

    for (const [frequency, config] of this.state.schedules) {
      const lastBackup = this.getLastCompletedBackup(frequency);
      const lastTime = lastBackup?.createdAt ?? null;

      if (isDue(frequency, lastTime)) {
        try {
          const data = await this.dataProvider();
          await this.createBackup(frequency, data);
        } catch {
          // Logged via metadata.error
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------------

  getLastCompletedBackup(
    frequency: BackupFrequency
  ): BackupMetadata | null {
    const matching = this.state.backups
      .filter(
        (b) =>
          b.frequency === frequency &&
          (b.status === "completed" || b.status === "verified")
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    return matching[0] ?? null;
  }

  getAllBackups(): BackupMetadata[] {
    return [...this.state.backups].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getBackupsByFrequency(frequency: BackupFrequency): BackupMetadata[] {
    return this.state.backups
      .filter((b) => b.frequency === frequency)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }

  isRunning(): boolean {
    return this.state.running;
  }

  getSchedules(): Map<BackupFrequency, BackupScheduleConfig> {
    return new Map(this.state.schedules);
  }

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------

  destroy(): void {
    this.stop();
    this.state.backups = [];
    this.state.schedules.clear();
    this.state.lastBackupByFrequency.clear();
  }
}

// ---------------------------------------------------------------------------
// Singleton factory
// ---------------------------------------------------------------------------

let defaultScheduler: BackupScheduler | null = null;

export function getBackupScheduler(storage?: StorageAdapter): BackupScheduler {
  if (!defaultScheduler) {
    defaultScheduler = new BackupScheduler(storage);
  }
  return defaultScheduler;
}

export function resetBackupScheduler(): void {
  defaultScheduler?.destroy();
  defaultScheduler = null;
}
