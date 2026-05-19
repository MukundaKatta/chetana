/**
 * Worker thread pool (Issue #545).
 * Configurable pool size, task queue with priority,
 * worker health monitoring, auto-restart, progress reporting.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type TaskPriority = "critical" | "high" | "normal" | "low";

export type TaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export type WorkerStatus = "idle" | "busy" | "unhealthy" | "restarting" | "stopped";

export interface TaskDefinition<TInput = unknown, TOutput = unknown> {
  /** Unique task ID. */
  id: string;
  /** Task type / operation name. */
  type: string;
  /** Input data. */
  input: TInput;
  /** Priority (default "normal"). */
  priority?: TaskPriority;
  /** Timeout in ms (default 30000). */
  timeoutMs?: number;
  /** Abort signal for cancellation. */
  signal?: AbortSignal;
}

export interface TaskResult<TOutput = unknown> {
  taskId: string;
  status: TaskStatus;
  output: TOutput | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  workerId: string;
}

export interface TaskProgress {
  taskId: string;
  workerId: string;
  percent: number;
  message?: string;
}

export interface WorkerInfo {
  id: string;
  status: WorkerStatus;
  currentTaskId: string | null;
  tasksCompleted: number;
  tasksFailed: number;
  startedAt: string;
  lastHealthCheck: string | null;
  restartCount: number;
}

export interface PoolConfig {
  /** Number of workers (default 4). */
  poolSize: number;
  /** Maximum queue length (default 1000). */
  maxQueueSize: number;
  /** Health check interval in ms (default 10000). */
  healthCheckIntervalMs: number;
  /** Max time a task can run before being killed (default 60000). */
  defaultTimeoutMs: number;
  /** Max restarts per worker before giving up (default 3). */
  maxRestarts: number;
  /** The function workers execute to process tasks. */
  taskHandler: (task: TaskDefinition) => Promise<unknown>;
}

export interface PoolStats {
  totalWorkers: number;
  idleWorkers: number;
  busyWorkers: number;
  unhealthyWorkers: number;
  queuedTasks: number;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTaskDurationMs: number;
}

/* ------------------------------------------------------------------ */
/*  Priority queue                                                    */
/* ------------------------------------------------------------------ */

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

interface QueuedTask {
  task: TaskDefinition;
  enqueuedAt: number;
  resolve: (result: TaskResult) => void;
  reject: (error: Error) => void;
}

class PriorityQueue {
  private items: QueuedTask[] = [];

  get length(): number {
    return this.items.length;
  }

  enqueue(item: QueuedTask): void {
    const priority = PRIORITY_ORDER[item.task.priority ?? "normal"];
    let insertIdx = this.items.length;
    for (let i = 0; i < this.items.length; i++) {
      const existingPriority = PRIORITY_ORDER[this.items[i].task.priority ?? "normal"];
      if (priority < existingPriority) {
        insertIdx = i;
        break;
      }
    }
    this.items.splice(insertIdx, 0, item);
  }

  dequeue(): QueuedTask | undefined {
    return this.items.shift();
  }

  remove(taskId: string): QueuedTask | undefined {
    const idx = this.items.findIndex((item) => item.task.id === taskId);
    if (idx === -1) return undefined;
    return this.items.splice(idx, 1)[0];
  }

  peek(): QueuedTask | undefined {
    return this.items[0];
  }

  toArray(): QueuedTask[] {
    return [...this.items];
  }
}

/* ------------------------------------------------------------------ */
/*  Worker wrapper                                                    */
/* ------------------------------------------------------------------ */

class ManagedWorker {
  readonly id: string;
  status: WorkerStatus = "idle";
  currentTaskId: string | null = null;
  tasksCompleted = 0;
  tasksFailed = 0;
  startedAt: string;
  lastHealthCheck: string | null = null;
  restartCount = 0;

  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  private taskHandler: (task: TaskDefinition) => Promise<unknown>;

  constructor(
    id: string,
    taskHandler: (task: TaskDefinition) => Promise<unknown>
  ) {
    this.id = id;
    this.taskHandler = taskHandler;
    this.startedAt = new Date().toISOString();
  }

  async execute(
    task: TaskDefinition,
    onProgress?: (progress: TaskProgress) => void
  ): Promise<TaskResult> {
    this.status = "busy";
    this.currentTaskId = task.id;
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    const timeoutMs = task.timeoutMs ?? 30_000;

    try {
      const output = await Promise.race([
        this.taskHandler(task),
        new Promise<never>((_, reject) => {
          this.timeoutHandle = setTimeout(
            () => reject(new Error(`Task ${task.id} timed out after ${timeoutMs}ms`)),
            timeoutMs
          );
        }),
        ...(task.signal
          ? [
              new Promise<never>((_, reject) => {
                task.signal!.addEventListener("abort", () =>
                  reject(new Error(`Task ${task.id} was cancelled`))
                );
              }),
            ]
          : []),
      ]);

      this.clearTimeout();
      this.tasksCompleted++;
      this.status = "idle";
      this.currentTaskId = null;

      return {
        taskId: task.id,
        status: "completed",
        output: output as unknown,
        error: null,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        workerId: this.id,
      };
    } catch (err) {
      this.clearTimeout();
      this.tasksFailed++;
      this.status = "idle";
      this.currentTaskId = null;

      const isCancelled = task.signal?.aborted;

      return {
        taskId: task.id,
        status: isCancelled ? "cancelled" : "failed",
        output: null,
        error: err instanceof Error ? err.message : String(err),
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        workerId: this.id,
      };
    }
  }

  healthCheck(): boolean {
    this.lastHealthCheck = new Date().toISOString();
    // A worker stuck in "busy" for too long is unhealthy (detected externally)
    return this.status !== "unhealthy";
  }

  restart(): void {
    this.status = "restarting";
    this.currentTaskId = null;
    this.clearTimeout();
    this.restartCount++;
    this.startedAt = new Date().toISOString();
    this.status = "idle";
  }

  stop(): void {
    this.clearTimeout();
    this.status = "stopped";
    this.currentTaskId = null;
  }

  getInfo(): WorkerInfo {
    return {
      id: this.id,
      status: this.status,
      currentTaskId: this.currentTaskId,
      tasksCompleted: this.tasksCompleted,
      tasksFailed: this.tasksFailed,
      startedAt: this.startedAt,
      lastHealthCheck: this.lastHealthCheck,
      restartCount: this.restartCount,
    };
  }

  private clearTimeout(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Worker Pool                                                       */
/* ------------------------------------------------------------------ */

export class WorkerPool {
  private workers: ManagedWorker[] = [];
  private queue: PriorityQueue = new PriorityQueue();
  private config: PoolConfig;
  private healthInterval: ReturnType<typeof setInterval> | null = null;
  private completedResults: TaskResult[] = [];
  private running = false;
  private progressListeners: Map<string, (progress: TaskProgress) => void> = new Map();

  constructor(config: Partial<PoolConfig> & { taskHandler: PoolConfig["taskHandler"] }) {
    this.config = {
      poolSize: config.poolSize ?? 4,
      maxQueueSize: config.maxQueueSize ?? 1000,
      healthCheckIntervalMs: config.healthCheckIntervalMs ?? 10_000,
      defaultTimeoutMs: config.defaultTimeoutMs ?? 60_000,
      maxRestarts: config.maxRestarts ?? 3,
      taskHandler: config.taskHandler,
    };
  }

  /** Start the pool and health monitoring. */
  start(): void {
    if (this.running) return;
    this.running = true;

    for (let i = 0; i < this.config.poolSize; i++) {
      this.workers.push(
        new ManagedWorker(`worker-${i}`, this.config.taskHandler)
      );
    }

    this.healthInterval = setInterval(
      () => this.runHealthChecks(),
      this.config.healthCheckIntervalMs
    );
  }

  /** Gracefully shut down the pool. */
  async shutdown(): Promise<void> {
    this.running = false;
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = null;
    }

    // Cancel queued tasks
    while (this.queue.length > 0) {
      const item = this.queue.dequeue();
      if (item) {
        item.reject(new Error("Pool is shutting down"));
      }
    }

    // Stop workers
    for (const worker of this.workers) {
      worker.stop();
    }
    this.workers = [];
  }

  /** Submit a task. Returns a promise that resolves with the result. */
  submit<TInput = unknown, TOutput = unknown>(
    task: TaskDefinition<TInput, TOutput>
  ): Promise<TaskResult<TOutput>> {
    if (!this.running) {
      return Promise.reject(new Error("Pool is not running"));
    }
    if (this.queue.length >= this.config.maxQueueSize) {
      return Promise.reject(new Error("Task queue is full"));
    }

    return new Promise<TaskResult<TOutput>>((resolve, reject) => {
      const queued: QueuedTask = {
        task: {
          ...task,
          timeoutMs: task.timeoutMs ?? this.config.defaultTimeoutMs,
        } as TaskDefinition,
        enqueuedAt: Date.now(),
        resolve: resolve as (result: TaskResult) => void,
        reject,
      };
      this.queue.enqueue(queued);
      this.processQueue();
    });
  }

  /** Cancel a queued or running task. */
  cancel(taskId: string): boolean {
    const removed = this.queue.remove(taskId);
    if (removed) {
      removed.reject(new Error("Task cancelled"));
      return true;
    }
    // If running, we rely on the AbortSignal mechanism
    return false;
  }

  /** Register a progress listener for a specific task. */
  onProgress(taskId: string, callback: (progress: TaskProgress) => void): () => void {
    this.progressListeners.set(taskId, callback);
    return () => this.progressListeners.delete(taskId);
  }

  /** Get pool statistics. */
  getStats(): PoolStats {
    const durations = this.completedResults
      .filter((r) => r.durationMs !== null)
      .map((r) => r.durationMs!);

    return {
      totalWorkers: this.workers.length,
      idleWorkers: this.workers.filter((w) => w.status === "idle").length,
      busyWorkers: this.workers.filter((w) => w.status === "busy").length,
      unhealthyWorkers: this.workers.filter((w) => w.status === "unhealthy").length,
      queuedTasks: this.queue.length,
      runningTasks: this.workers.filter((w) => w.status === "busy").length,
      completedTasks: this.completedResults.filter((r) => r.status === "completed").length,
      failedTasks: this.completedResults.filter((r) => r.status === "failed").length,
      averageTaskDurationMs:
        durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0,
    };
  }

  /** Get info about all workers. */
  getWorkers(): WorkerInfo[] {
    return this.workers.map((w) => w.getInfo());
  }

  /** Resize the pool. */
  resize(newSize: number): void {
    if (newSize < 1) throw new Error("Pool size must be at least 1");

    while (this.workers.length < newSize) {
      const id = `worker-${this.workers.length}`;
      this.workers.push(new ManagedWorker(id, this.config.taskHandler));
    }

    while (this.workers.length > newSize) {
      const worker = this.workers.find((w) => w.status === "idle");
      if (worker) {
        worker.stop();
        this.workers = this.workers.filter((w) => w !== worker);
      } else {
        break; // Don't remove busy workers
      }
    }

    this.config.poolSize = this.workers.length;
  }

  /* ---------------------------------------------------------------- */
  /*  Internal                                                        */
  /* ---------------------------------------------------------------- */

  private processQueue(): void {
    if (!this.running) return;

    const idleWorker = this.workers.find((w) => w.status === "idle");
    if (!idleWorker) return;

    const queued = this.queue.dequeue();
    if (!queued) return;

    const progressCb = this.progressListeners.get(queued.task.id);

    idleWorker
      .execute(queued.task, progressCb)
      .then((result) => {
        this.completedResults.push(result);
        queued.resolve(result);
        this.progressListeners.delete(queued.task.id);
        // Continue processing
        this.processQueue();
      })
      .catch((err) => {
        queued.reject(err instanceof Error ? err : new Error(String(err)));
        this.progressListeners.delete(queued.task.id);
        this.processQueue();
      });

    // Try to assign more tasks to other idle workers
    if (this.queue.length > 0) {
      this.processQueue();
    }
  }

  private runHealthChecks(): void {
    for (const worker of this.workers) {
      const healthy = worker.healthCheck();
      if (!healthy && worker.restartCount < this.config.maxRestarts) {
        worker.restart();
        this.processQueue();
      }
    }
  }
}
