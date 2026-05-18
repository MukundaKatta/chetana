/* ------------------------------------------------------------------ */
/*  Cross-Session State Persistence (IndexedDB)                       */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface PersistenceConfig {
  dbName: string;
  version: number;
  storeName: string;
  maxSizeBytes: number;
}

export interface StoredEntry<T = unknown> {
  key: string;
  value: T;
  version: number;
  updatedAt: string;
  sizeBytes: number;
}

export interface MigrationFn {
  fromVersion: number;
  toVersion: number;
  migrate: (oldValue: unknown) => unknown;
}

export interface StorageQuota {
  usedBytes: number;
  maxBytes: number;
  utilizationPercent: number;
  entryCount: number;
}

/* ------------------------------------------------------------------ */
/*  Default config                                                    */
/* ------------------------------------------------------------------ */

const DEFAULT_CONFIG: PersistenceConfig = {
  dbName: "chetana-state",
  version: 1,
  storeName: "app-state",
  maxSizeBytes: 50 * 1024 * 1024, // 50 MB
};

/* ------------------------------------------------------------------ */
/*  IndexedDB Wrapper                                                 */
/* ------------------------------------------------------------------ */

function estimateSize(value: unknown): number {
  try {
    return new Blob([JSON.stringify(value)]).size;
  } catch {
    return JSON.stringify(value).length * 2;
  }
}

export class StatePersistence {
  private config: PersistenceConfig;
  private db: IDBDatabase | null = null;
  private migrations: MigrationFn[] = [];

  constructor(config?: Partial<PersistenceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  registerMigration(migration: MigrationFn): void {
    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.fromVersion - b.fromVersion);
  }

  /* ---- Connection ---- */

  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.config.storeName)) {
          db.createObjectStore(this.config.storeName, { keyPath: "key" });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /* ---- Core CRUD ---- */

  async get<T>(key: string): Promise<T | null> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.config.storeName, "readonly");
      const store = tx.objectStore(this.config.storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as StoredEntry<T> | undefined;
        if (!entry) {
          resolve(null);
          return;
        }
        // Apply migrations
        const migrated = this.applyMigrations(entry.value, entry.version);
        resolve(migrated as T);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async set<T>(key: string, value: T): Promise<void> {
    const db = await this.open();
    const sizeBytes = estimateSize(value);

    // Check quota
    const quota = await this.getQuota();
    if (quota.usedBytes + sizeBytes > this.config.maxSizeBytes) {
      throw new Error(
        `Storage quota exceeded. Used: ${quota.usedBytes}, ` +
          `Requested: ${sizeBytes}, Max: ${this.config.maxSizeBytes}`,
      );
    }

    const entry: StoredEntry<T> = {
      key,
      value,
      version: this.config.version,
      updatedAt: new Date().toISOString(),
      sizeBytes,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.config.storeName, "readwrite");
      const store = tx.objectStore(this.config.storeName);
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(key: string): Promise<void> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.config.storeName, "readwrite");
      const store = tx.objectStore(this.config.storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async keys(): Promise<string[]> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.config.storeName, "readonly");
      const store = tx.objectStore(this.config.storeName);
      const request = store.getAllKeys();

      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(): Promise<StoredEntry[]> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.config.storeName, "readonly");
      const store = tx.objectStore(this.config.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as StoredEntry[]);
      request.onerror = () => reject(request.error);
    });
  }

  /* ---- Selective persistence ---- */

  async setMany(entries: { key: string; value: unknown }[]): Promise<void> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.config.storeName, "readwrite");
      const store = tx.objectStore(this.config.storeName);

      for (const { key, value } of entries) {
        const sizeBytes = estimateSize(value);
        const entry: StoredEntry = {
          key,
          value,
          version: this.config.version,
          updatedAt: new Date().toISOString(),
          sizeBytes,
        };
        store.put(entry);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getMany<T>(keys: string[]): Promise<Map<string, T>> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.config.storeName, "readonly");
      const store = tx.objectStore(this.config.storeName);
      const results = new Map<string, T>();

      let remaining = keys.length;
      if (remaining === 0) {
        resolve(results);
        return;
      }

      for (const key of keys) {
        const request = store.get(key);
        request.onsuccess = () => {
          const entry = request.result as StoredEntry<T> | undefined;
          if (entry) {
            const migrated = this.applyMigrations(entry.value, entry.version);
            results.set(key, migrated as T);
          }
          remaining--;
          if (remaining === 0) resolve(results);
        };
        request.onerror = () => {
          remaining--;
          if (remaining === 0) resolve(results);
        };
      }
    });
  }

  /* ---- Quota management ---- */

  async getQuota(): Promise<StorageQuota> {
    const entries = await this.getAll();
    const usedBytes = entries.reduce((sum, e) => sum + (e.sizeBytes ?? 0), 0);

    return {
      usedBytes,
      maxBytes: this.config.maxSizeBytes,
      utilizationPercent: this.config.maxSizeBytes > 0 ? (usedBytes / this.config.maxSizeBytes) * 100 : 0,
      entryCount: entries.length,
    };
  }

  /* ---- Clear with confirmation ---- */

  async clear(confirm: boolean = false): Promise<{ cleared: boolean; entryCount: number }> {
    if (!confirm) {
      const quota = await this.getQuota();
      return { cleared: false, entryCount: quota.entryCount };
    }

    const db = await this.open();
    const quota = await this.getQuota();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.config.storeName, "readwrite");
      const store = tx.objectStore(this.config.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve({ cleared: true, entryCount: quota.entryCount });
      request.onerror = () => reject(request.error);
    });
  }

  /* ---- Migrations ---- */

  private applyMigrations(value: unknown, fromVersion: number): unknown {
    let current = value;
    let version = fromVersion;

    for (const migration of this.migrations) {
      if (migration.fromVersion === version && migration.toVersion > version) {
        current = migration.migrate(current);
        version = migration.toVersion;
      }
    }

    return current;
  }
}

/* ------------------------------------------------------------------ */
/*  Singleton                                                         */
/* ------------------------------------------------------------------ */

let instance: StatePersistence | null = null;

export function getStatePersistence(config?: Partial<PersistenceConfig>): StatePersistence {
  if (!instance) {
    instance = new StatePersistence(config);
  }
  return instance;
}
