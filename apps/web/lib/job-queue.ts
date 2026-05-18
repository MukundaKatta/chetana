/**
 * In-memory audit job queue with priority support, configurable
 * concurrency, and retry with exponential backoff (Issue #342).
 */

export type JobStatus = "queued" | "running" | "done" | "failed";

export interface Job<T = unknown> {
  id: string;
  status: JobStatus;
  priority: number;
  payload: T;
  result?: unknown;
  error?: string;
  attempts: number;
  maxRetries: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface JobQueueOptions {
  /** Maximum number of jobs running concurrently (default 3). */
  concurrency?: number;
  /** Maximum retry attempts per job (default 3). */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff (default 1000). */
  baseDelayMs?: number;
}

type JobHandler<T> = (payload: T) => Promise<unknown>;

export class JobQueue<T = unknown> {
  private jobs = new Map<string, Job<T>>();
  private queue: string[] = [];
  private running = 0;
  private concurrency: number;
  private maxRetries: number;
  private baseDelayMs: number;
  private handler: JobHandler<T>;

  constructor(handler: JobHandler<T>, options: JobQueueOptions = {}) {
    this.handler = handler;
    this.concurrency = options.concurrency ?? 3;
    this.maxRetries = options.maxRetries ?? 3;
    this.baseDelayMs = options.baseDelayMs ?? 1000;
  }

  /**
   * Add a job to the queue.
   * Higher priority values are processed first.
   */
  enqueue(payload: T, options?: { priority?: number; id?: string }): string {
    const id = options?.id ?? crypto.randomUUID();
    const priority = options?.priority ?? 0;

    const job: Job<T> = {
      id,
      status: "queued",
      priority,
      payload,
      attempts: 0,
      maxRetries: this.maxRetries,
      createdAt: Date.now(),
    };

    this.jobs.set(id, job);
    this.queue.push(id);

    // Sort queue by priority (descending) — highest priority first
    this.queue.sort((a, b) => {
      const jobA = this.jobs.get(a);
      const jobB = this.jobs.get(b);
      return (jobB?.priority ?? 0) - (jobA?.priority ?? 0);
    });

    this.processNext();

    return id;
  }

  /**
   * Dequeue and return the next job (for manual processing).
   * Returns null if the queue is empty.
   */
  dequeue(): Job<T> | null {
    if (this.queue.length === 0) return null;

    const id = this.queue.shift()!;
    const job = this.jobs.get(id);
    return job ?? null;
  }

  /**
   * Get the status of a specific job.
   */
  status(jobId: string): Job<T> | null {
    return this.jobs.get(jobId) ?? null;
  }

  /**
   * Get all jobs, optionally filtered by status.
   */
  listJobs(filterStatus?: JobStatus): Job<T>[] {
    const all = Array.from(this.jobs.values());
    if (filterStatus) {
      return all.filter((j) => j.status === filterStatus);
    }
    return all;
  }

  /**
   * Get queue statistics.
   */
  stats(): {
    queued: number;
    running: number;
    done: number;
    failed: number;
    total: number;
  } {
    let queued = 0;
    let running = 0;
    let done = 0;
    let failed = 0;
    for (const job of this.jobs.values()) {
      switch (job.status) {
        case "queued":
          queued++;
          break;
        case "running":
          running++;
          break;
        case "done":
          done++;
          break;
        case "failed":
          failed++;
          break;
      }
    }
    return { queued, running, done, failed, total: this.jobs.size };
  }

  private async processNext(): Promise<void> {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const id = this.queue.shift();
      if (!id) break;

      const job = this.jobs.get(id);
      if (!job || job.status !== "queued") continue;

      this.running++;
      job.status = "running";
      job.startedAt = Date.now();

      this.executeJob(job).finally(() => {
        this.running--;
        this.processNext();
      });
    }
  }

  private async executeJob(job: Job<T>): Promise<void> {
    try {
      job.attempts++;
      const result = await this.handler(job.payload);
      job.status = "done";
      job.result = result;
      job.completedAt = Date.now();
    } catch (err) {
      if (job.attempts < job.maxRetries) {
        // Exponential backoff retry
        const delay = this.baseDelayMs * Math.pow(2, job.attempts - 1);
        job.status = "queued";
        await new Promise((resolve) => setTimeout(resolve, delay));
        this.queue.push(job.id);
        this.queue.sort((a, b) => {
          const jobA = this.jobs.get(a);
          const jobB = this.jobs.get(b);
          return (jobB?.priority ?? 0) - (jobA?.priority ?? 0);
        });
      } else {
        job.status = "failed";
        job.error = err instanceof Error ? err.message : String(err);
        job.completedAt = Date.now();
      }
    }
  }
}
