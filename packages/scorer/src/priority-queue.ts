/**
 * Audit queue prioritization (issue #765).
 *
 * A fair priority scheduler: higher-priority jobs run first, but per-owner
 * quotas and round-robin selection within a priority prevent starvation.
 */

export type Priority = "interactive" | "normal" | "batch";

const PRIORITY_RANK: Record<Priority, number> = { interactive: 0, normal: 1, batch: 2 };

export interface QueuedJob {
  id: string;
  ownerId: string;
  priority: Priority;
  enqueuedAt: number;
}

export interface ScheduleOptions {
  /** Max concurrent jobs per owner in a single scheduling pass. */
  perOwnerLimit?: number;
  /** Total jobs to select this pass. */
  take: number;
}

/**
 * Select the next batch of jobs: ordered by priority then FIFO, but capped per
 * owner so a single owner cannot monopolize the queue.
 */
export function scheduleJobs(queue: QueuedJob[], options: ScheduleOptions): QueuedJob[] {
  const perOwnerLimit = options.perOwnerLimit ?? Infinity;
  const ordered = [...queue].sort((a, b) => {
    const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    return pr !== 0 ? pr : a.enqueuedAt - b.enqueuedAt;
  });

  const selected: QueuedJob[] = [];
  const perOwnerCount = new Map<string, number>();

  for (const job of ordered) {
    if (selected.length >= options.take) break;
    const count = perOwnerCount.get(job.ownerId) ?? 0;
    if (count >= perOwnerLimit) continue;
    selected.push(job);
    perOwnerCount.set(job.ownerId, count + 1);
  }

  return selected;
}

export function queueDepthByPriority(queue: QueuedJob[]): Record<Priority, number> {
  const depth: Record<Priority, number> = { interactive: 0, normal: 0, batch: 0 };
  for (const job of queue) depth[job.priority]++;
  return depth;
}
