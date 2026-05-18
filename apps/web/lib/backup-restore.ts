/**
 * Backup and restore utilities with checksum validation and
 * incremental backup support (Issue #346).
 */

export interface BackupMetadata {
  version: string;
  userId: string;
  createdAt: string;
  checksum: string;
  incremental: boolean;
  baseBackupId?: string;
  tables: string[];
  recordCount: number;
}

export interface BackupData {
  metadata: BackupMetadata;
  data: Record<string, unknown[]>;
}

const BACKUP_VERSION = "1.0.0";

/**
 * Compute a simple checksum for data integrity verification.
 * Uses a djb2-style hash over the JSON-serialised data.
 */
function computeChecksum(data: Record<string, unknown[]>): string {
  const serialized = JSON.stringify(data);
  let hash = 5381;
  for (let i = 0; i < serialized.length; i++) {
    hash = (hash << 5) + hash + serialized.charCodeAt(i);
    hash |= 0; // Keep as 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

/**
 * Verify the integrity of a backup by recomputing its checksum.
 */
export function verifyChecksum(backup: BackupData): boolean {
  const computed = computeChecksum(backup.data);
  return computed === backup.metadata.checksum;
}

/**
 * Export a full backup for a user.
 * Collects data from the specified tables (or defaults) and
 * packages it as a JSON blob with a checksum.
 *
 * @param userId - The user whose data to export
 * @param fetcher - Function to fetch data for a given table/user
 * @param tables - Tables to back up (defaults to standard set)
 */
export async function exportBackup(
  userId: string,
  fetcher: (table: string, userId: string) => Promise<unknown[]>,
  tables?: string[]
): Promise<BackupData> {
  const tablesToBackup = tables ?? [
    "audits",
    "audit_templates",
    "export_configs",
    "audit_schedules",
    "profiles",
  ];

  const data: Record<string, unknown[]> = {};
  let totalRecords = 0;

  for (const table of tablesToBackup) {
    const records = await fetcher(table, userId);
    data[table] = records;
    totalRecords += records.length;
  }

  const checksum = computeChecksum(data);

  const metadata: BackupMetadata = {
    version: BACKUP_VERSION,
    userId,
    createdAt: new Date().toISOString(),
    checksum,
    incremental: false,
    tables: tablesToBackup,
    recordCount: totalRecords,
  };

  return { metadata, data };
}

/**
 * Export an incremental backup containing only records changed since
 * a given timestamp.
 *
 * @param userId - The user whose data to export
 * @param since - ISO timestamp; only records updated after this are included
 * @param fetcher - Function to fetch incremental data for a table/user/since
 * @param baseBackupId - ID of the base backup this increment builds upon
 * @param tables - Tables to back up
 */
export async function exportIncrementalBackup(
  userId: string,
  since: string,
  fetcher: (table: string, userId: string, since: string) => Promise<unknown[]>,
  baseBackupId: string,
  tables?: string[]
): Promise<BackupData> {
  const tablesToBackup = tables ?? [
    "audits",
    "audit_templates",
    "export_configs",
    "audit_schedules",
    "profiles",
  ];

  const data: Record<string, unknown[]> = {};
  let totalRecords = 0;

  for (const table of tablesToBackup) {
    const records = await fetcher(table, userId, since);
    data[table] = records;
    totalRecords += records.length;
  }

  const checksum = computeChecksum(data);

  const metadata: BackupMetadata = {
    version: BACKUP_VERSION,
    userId,
    createdAt: new Date().toISOString(),
    checksum,
    incremental: true,
    baseBackupId,
    tables: tablesToBackup,
    recordCount: totalRecords,
  };

  return { metadata, data };
}

/**
 * Import (restore) a backup for a user.
 * Validates the checksum before restoring and calls the restorer
 * for each table's data.
 *
 * @param userId - The user to restore data for
 * @param backup - The backup data to import
 * @param restorer - Function that upserts records for a given table
 * @returns Summary of what was restored
 */
export async function importBackup(
  userId: string,
  backup: BackupData,
  restorer: (table: string, userId: string, records: unknown[]) => Promise<number>
): Promise<{ tablesRestored: string[]; totalRecords: number; errors: string[] }> {
  // Validate version
  if (backup.metadata.version !== BACKUP_VERSION) {
    throw new Error(
      `Unsupported backup version "${backup.metadata.version}". Expected "${BACKUP_VERSION}".`
    );
  }

  // Validate ownership
  if (backup.metadata.userId !== userId) {
    throw new Error("Backup belongs to a different user");
  }

  // Validate checksum
  if (!verifyChecksum(backup)) {
    throw new Error("Backup checksum validation failed. Data may be corrupted.");
  }

  const tablesRestored: string[] = [];
  let totalRecords = 0;
  const errors: string[] = [];

  for (const table of backup.metadata.tables) {
    const records = backup.data[table];
    if (!records || records.length === 0) continue;

    try {
      const count = await restorer(table, userId, records);
      tablesRestored.push(table);
      totalRecords += count;
    } catch (err) {
      errors.push(
        `Failed to restore table "${table}": ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return { tablesRestored, totalRecords, errors };
}
