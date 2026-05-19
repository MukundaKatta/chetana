/**
 * Optimistic UI updates (Issue #449).
 * Applies optimistic state immediately on user action, rolls back on
 * error, shows visual indicators for unconfirmed changes, handles
 * queue reconciliation, and resolves conflicts from concurrent updates.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type UpdateStatus =
  | "pending"
  | "confirmed"
  | "rolled_back"
  | "conflict";

export interface OptimisticUpdate<T> {
  /** Unique update identifier. */
  id: string;
  /** Timestamp when the update was initiated. */
  timestamp: number;
  /** The optimistic (new) value. */
  optimisticValue: T;
  /** The original value before the update. */
  previousValue: T;
  /** Current status of the update. */
  status: UpdateStatus;
  /** Error message if rolled back. */
  error?: string;
  /** Retry count. */
  retryCount: number;
  /** Maximum retries before permanent rollback. */
  maxRetries: number;
}

export interface OptimisticState<T> {
  /** The current effective value (optimistic or confirmed). */
  value: T;
  /** Whether there are pending (unconfirmed) updates. */
  hasPending: boolean;
  /** Number of pending updates. */
  pendingCount: number;
  /** All tracked updates. */
  updates: OptimisticUpdate<T>[];
}

export interface ConflictResolution<T> {
  /** Strategy for resolving conflicts. */
  strategy: ConflictStrategy;
  /** Custom merge function (required for "merge" strategy). */
  mergeFn?: (local: T, remote: T) => T;
}

export type ConflictStrategy =
  | "client_wins"
  | "server_wins"
  | "merge"
  | "manual";

export type UpdateAction<T> = (
  currentValue: T,
) => Promise<T>;

export type StatusChangeCallback<T> = (
  update: OptimisticUpdate<T>,
  state: OptimisticState<T>,
) => void;

/* ------------------------------------------------------------------ */
/*  ID generation                                                     */
/* ------------------------------------------------------------------ */

let nextUpdateId = 0;

function generateUpdateId(): string {
  return `opt_${Date.now()}_${++nextUpdateId}`;
}

/* ------------------------------------------------------------------ */
/*  Optimistic update manager                                         */
/* ------------------------------------------------------------------ */

export class OptimisticUpdateManager<T> {
  private currentValue: T;
  private confirmedValue: T;
  private updates: OptimisticUpdate<T>[] = [];
  private listeners = new Set<StatusChangeCallback<T>>();
  private conflictResolution: ConflictResolution<T>;
  private maxQueueSize: number;

  constructor(
    initialValue: T,
    conflictResolution: ConflictResolution<T> = {
      strategy: "server_wins",
    },
    maxQueueSize: number = 50,
  ) {
    this.currentValue = initialValue;
    this.confirmedValue = initialValue;
    this.conflictResolution = conflictResolution;
    this.maxQueueSize = maxQueueSize;
  }

  /**
   * Get the current optimistic state.
   */
  getState(): OptimisticState<T> {
    const pending = this.updates.filter((u) => u.status === "pending");
    return {
      value: this.currentValue,
      hasPending: pending.length > 0,
      pendingCount: pending.length,
      updates: [...this.updates],
    };
  }

  /**
   * Get the last confirmed (server-validated) value.
   */
  getConfirmedValue(): T {
    return this.confirmedValue;
  }

  /**
   * Apply an optimistic update and execute the server action.
   */
  async applyUpdate(
    optimisticValue: T,
    serverAction: UpdateAction<T>,
    maxRetries: number = 2,
  ): Promise<OptimisticUpdate<T>> {
    const update: OptimisticUpdate<T> = {
      id: generateUpdateId(),
      timestamp: Date.now(),
      optimisticValue,
      previousValue: this.currentValue,
      status: "pending",
      retryCount: 0,
      maxRetries,
    };

    this.updates.push(update);
    this.trimQueue();

    // Apply optimistic value immediately
    this.currentValue = optimisticValue;
    this.notifyListeners(update);

    // Execute server action
    try {
      const confirmedValue = await serverAction(optimisticValue);
      return this.confirmUpdate(update.id, confirmedValue);
    } catch (error) {
      return this.handleError(
        update.id,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Confirm an update with the server's response value.
   */
  confirmUpdate(updateId: string, serverValue: T): OptimisticUpdate<T> {
    const update = this.updates.find((u) => u.id === updateId);
    if (!update) throw new Error(`Update ${updateId} not found.`);

    update.status = "confirmed";
    this.confirmedValue = serverValue;

    // Rebase current value on the confirmed value
    this.rebaseState();
    this.notifyListeners(update);

    return update;
  }

  /**
   * Roll back an update.
   */
  rollback(updateId: string, error?: string): OptimisticUpdate<T> {
    const update = this.updates.find((u) => u.id === updateId);
    if (!update) throw new Error(`Update ${updateId} not found.`);

    update.status = "rolled_back";
    update.error = error;

    // Rebase state without this update
    this.rebaseState();
    this.notifyListeners(update);

    return update;
  }

  /**
   * Handle a server error for an update.
   */
  private async handleError(
    updateId: string,
    errorMessage: string,
  ): Promise<OptimisticUpdate<T>> {
    const update = this.updates.find((u) => u.id === updateId);
    if (!update) throw new Error(`Update ${updateId} not found.`);

    update.retryCount++;

    if (update.retryCount <= update.maxRetries) {
      // Will retry — keep as pending
      update.error = `Retry ${update.retryCount}/${update.maxRetries}: ${errorMessage}`;
      this.notifyListeners(update);
      return update;
    }

    // Max retries exceeded — roll back
    return this.rollback(updateId, errorMessage);
  }

  /**
   * Handle a conflict where the server value differs from both
   * the previous and optimistic values.
   */
  resolveConflict(
    updateId: string,
    serverValue: T,
  ): OptimisticUpdate<T> {
    const update = this.updates.find((u) => u.id === updateId);
    if (!update) throw new Error(`Update ${updateId} not found.`);

    switch (this.conflictResolution.strategy) {
      case "client_wins":
        update.status = "confirmed";
        this.confirmedValue = update.optimisticValue;
        break;

      case "server_wins":
        update.status = "confirmed";
        this.confirmedValue = serverValue;
        break;

      case "merge":
        if (this.conflictResolution.mergeFn) {
          const merged = this.conflictResolution.mergeFn(
            update.optimisticValue,
            serverValue,
          );
          update.status = "confirmed";
          update.optimisticValue = merged;
          this.confirmedValue = merged;
        } else {
          // Fallback to server wins
          update.status = "confirmed";
          this.confirmedValue = serverValue;
        }
        break;

      case "manual":
        update.status = "conflict";
        break;
    }

    this.rebaseState();
    this.notifyListeners(update);

    return update;
  }

  /**
   * Manually resolve a conflict by choosing a value.
   */
  manualResolve(updateId: string, resolvedValue: T): OptimisticUpdate<T> {
    const update = this.updates.find((u) => u.id === updateId);
    if (!update) throw new Error(`Update ${updateId} not found.`);

    update.status = "confirmed";
    update.optimisticValue = resolvedValue;
    this.confirmedValue = resolvedValue;

    this.rebaseState();
    this.notifyListeners(update);

    return update;
  }

  /**
   * Rebase the current state by replaying pending updates on top
   * of the confirmed value.
   */
  private rebaseState(): void {
    let value = this.confirmedValue;

    for (const update of this.updates) {
      if (update.status === "pending") {
        value = update.optimisticValue;
      }
    }

    this.currentValue = value;
  }

  /**
   * Subscribe to status changes.
   */
  subscribe(callback: StatusChangeCallback<T>): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of a state change.
   */
  private notifyListeners(update: OptimisticUpdate<T>): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(update, state);
      } catch {
        // Prevent listener errors from propagating
      }
    }
  }

  /**
   * Trim the queue to prevent unbounded growth.
   */
  private trimQueue(): void {
    // Remove old confirmed/rolled-back updates
    const completed = this.updates.filter(
      (u) => u.status === "confirmed" || u.status === "rolled_back",
    );
    if (completed.length > this.maxQueueSize) {
      const toRemove = completed.slice(
        0,
        completed.length - this.maxQueueSize,
      );
      const removeIds = new Set(toRemove.map((u) => u.id));
      this.updates = this.updates.filter((u) => !removeIds.has(u.id));
    }
  }

  /**
   * Clear all tracked updates and reset state.
   */
  reset(value?: T): void {
    if (value !== undefined) {
      this.currentValue = value;
      this.confirmedValue = value;
    }
    this.updates = [];
  }

  /**
   * Get updates that are in a specific status.
   */
  getUpdatesByStatus(status: UpdateStatus): OptimisticUpdate<T>[] {
    return this.updates.filter((u) => u.status === status);
  }

  /**
   * Check if a specific update is still pending.
   */
  isPending(updateId: string): boolean {
    const update = this.updates.find((u) => u.id === updateId);
    return update?.status === "pending";
  }
}

/* ------------------------------------------------------------------ */
/*  Queue reconciliation                                              */
/* ------------------------------------------------------------------ */

/**
 * Reconcile a batch of pending updates against the server state.
 * Confirms updates that match, flags conflicts, and rolls back stale ones.
 */
export function reconcileQueue<T>(
  manager: OptimisticUpdateManager<T>,
  serverValue: T,
  isEqual: (a: T, b: T) => boolean,
): { confirmed: number; conflicts: number; rolledBack: number } {
  const state = manager.getState();
  const pending = state.updates.filter((u) => u.status === "pending");

  let confirmed = 0;
  let conflicts = 0;
  let rolledBack = 0;

  if (pending.length === 0) return { confirmed, conflicts, rolledBack };

  // If the server value matches the latest optimistic value, confirm all
  const latestPending = pending[pending.length - 1];
  if (isEqual(latestPending.optimisticValue, serverValue)) {
    for (const update of pending) {
      manager.confirmUpdate(update.id, serverValue);
      confirmed++;
    }
    return { confirmed, conflicts, rolledBack };
  }

  // Otherwise, resolve conflicts for each pending update
  for (const update of pending) {
    if (isEqual(update.optimisticValue, serverValue)) {
      manager.confirmUpdate(update.id, serverValue);
      confirmed++;
    } else {
      manager.resolveConflict(update.id, serverValue);
      const resolved = manager
        .getState()
        .updates.find((u) => u.id === update.id);
      if (resolved?.status === "conflict") {
        conflicts++;
      } else if (resolved?.status === "rolled_back") {
        rolledBack++;
      } else {
        confirmed++;
      }
    }
  }

  return { confirmed, conflicts, rolledBack };
}

/**
 * Create a visual indicator descriptor for an optimistic update.
 */
export function getUpdateIndicator<T>(
  update: OptimisticUpdate<T>,
): {
  label: string;
  color: string;
  icon: "pending" | "check" | "x" | "alert";
} {
  switch (update.status) {
    case "pending":
      return { label: "Saving...", color: "#f59e0b", icon: "pending" };
    case "confirmed":
      return { label: "Saved", color: "#22c55e", icon: "check" };
    case "rolled_back":
      return {
        label: update.error ?? "Failed",
        color: "#ef4444",
        icon: "x",
      };
    case "conflict":
      return {
        label: "Conflict detected",
        color: "#f97316",
        icon: "alert",
      };
  }
}
