/**
 * Cron scheduler with expression parser/validator,
 * human-readable descriptions, next N run preview,
 * timezone-aware scheduling, and pause/resume (Issue #384).
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface CronExpression {
  /** Original cron string. */
  raw: string;
  /** Parsed fields. */
  minute: CronField;
  hour: CronField;
  dayOfMonth: CronField;
  month: CronField;
  dayOfWeek: CronField;
}

export interface CronField {
  raw: string;
  values: number[];
}

export interface ScheduledJob {
  id: string;
  name: string;
  cronExpression: string;
  timezone: string;
  handler: () => void | Promise<void>;
  status: "active" | "paused";
  lastRun: Date | null;
  nextRun: Date | null;
  runCount: number;
  createdAt: Date;
}

export interface CronValidationResult {
  valid: boolean;
  errors: string[];
  parsed?: CronExpression;
  description?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const DAY_NAMES: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

const FIELD_RANGES: Array<{ name: string; min: number; max: number }> = [
  { name: "minute", min: 0, max: 59 },
  { name: "hour", min: 0, max: 23 },
  { name: "day of month", min: 1, max: 31 },
  { name: "month", min: 1, max: 12 },
  { name: "day of week", min: 0, max: 6 },
];

const PRESETS: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

/* ------------------------------------------------------------------ */
/*  Parser                                                            */
/* ------------------------------------------------------------------ */

function replaceNames(field: string, names: Record<string, number>): string {
  let result = field.toLowerCase();
  for (const [name, value] of Object.entries(names)) {
    result = result.replaceAll(name, String(value));
  }
  return result;
}

function parseField(
  raw: string,
  min: number,
  max: number,
  fieldName: string,
  errors: string[],
): CronField {
  const values = new Set<number>();

  const parts = raw.split(",");
  for (const part of parts) {
    // Handle step values: */2, 1-5/2
    const stepMatch = part.match(/^(.+)\/(\d+)$/);
    let range: string;
    let step: number;

    if (stepMatch) {
      range = stepMatch[1];
      step = parseInt(stepMatch[2], 10);
      if (step <= 0) {
        errors.push(`Invalid step value in ${fieldName}: ${part}`);
        continue;
      }
    } else {
      range = part;
      step = 1;
    }

    if (range === "*") {
      for (let i = min; i <= max; i += step) {
        values.add(i);
      }
    } else if (range.includes("-")) {
      const [startStr, endStr] = range.split("-");
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (isNaN(start) || isNaN(end)) {
        errors.push(`Invalid range in ${fieldName}: ${part}`);
        continue;
      }
      if (start < min || start > max || end < min || end > max) {
        errors.push(`Range out of bounds in ${fieldName}: ${part} (${min}-${max})`);
        continue;
      }
      if (start > end) {
        // Wrap around (e.g., day of week 5-1)
        for (let i = start; i <= max; i += step) values.add(i);
        for (let i = min; i <= end; i += step) values.add(i);
      } else {
        for (let i = start; i <= end; i += step) values.add(i);
      }
    } else {
      const val = parseInt(range, 10);
      if (isNaN(val)) {
        errors.push(`Invalid value in ${fieldName}: ${range}`);
        continue;
      }
      if (val < min || val > max) {
        errors.push(`Value out of bounds in ${fieldName}: ${val} (${min}-${max})`);
        continue;
      }
      values.add(val);
    }
  }

  return { raw, values: Array.from(values).sort((a, b) => a - b) };
}

/**
 * Parse a cron expression string into structured fields.
 */
export function parseCron(expression: string): CronValidationResult {
  const errors: string[] = [];

  // Handle presets
  let expr = expression.trim();
  if (PRESETS[expr.toLowerCase()]) {
    expr = PRESETS[expr.toLowerCase()];
  }

  const parts = expr.split(/\s+/);
  if (parts.length !== 5) {
    return {
      valid: false,
      errors: [`Expected 5 fields, got ${parts.length}. Format: minute hour day month weekday`],
    };
  }

  // Replace month/day names
  parts[3] = replaceNames(parts[3], MONTH_NAMES);
  parts[4] = replaceNames(parts[4], DAY_NAMES);

  const fields = parts.map((part, i) =>
    parseField(part, FIELD_RANGES[i].min, FIELD_RANGES[i].max, FIELD_RANGES[i].name, errors),
  );

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const parsed: CronExpression = {
    raw: expression,
    minute: fields[0],
    hour: fields[1],
    dayOfMonth: fields[2],
    month: fields[3],
    dayOfWeek: fields[4],
  };

  return {
    valid: true,
    errors: [],
    parsed,
    description: describeExpression(parsed),
  };
}

/**
 * Validate a cron expression. Returns true if valid.
 */
export function isValidCron(expression: string): boolean {
  return parseCron(expression).valid;
}

/* ------------------------------------------------------------------ */
/*  Human-readable description                                        */
/* ------------------------------------------------------------------ */

function describeField(field: CronField, min: number, max: number): string {
  if (field.values.length === max - min + 1) return "every";
  if (field.values.length === 1) return String(field.values[0]);
  if (field.values.length <= 3) return field.values.join(", ");
  return field.raw;
}

const MONTH_LABELS = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_LABELS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

/**
 * Generate a human-readable description of a cron expression.
 */
export function describeExpression(parsed: CronExpression): string {
  const parts: string[] = [];

  // Time
  const minDesc = describeField(parsed.minute, 0, 59);
  const hourDesc = describeField(parsed.hour, 0, 23);

  if (minDesc === "every" && hourDesc === "every") {
    parts.push("Every minute");
  } else if (minDesc === "every") {
    parts.push(`Every minute during hour ${hourDesc}`);
  } else if (hourDesc === "every") {
    parts.push(`At minute ${minDesc} of every hour`);
  } else {
    const h = parsed.hour.values[0];
    const m = parsed.minute.values[0];
    if (parsed.hour.values.length === 1 && parsed.minute.values.length === 1) {
      parts.push(`At ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    } else {
      parts.push(`At minute ${minDesc} past hour ${hourDesc}`);
    }
  }

  // Day of month
  const domDesc = describeField(parsed.dayOfMonth, 1, 31);
  if (domDesc !== "every") {
    parts.push(`on day ${domDesc} of the month`);
  }

  // Month
  const monthDesc = describeField(parsed.month, 1, 12);
  if (monthDesc !== "every") {
    if (parsed.month.values.length <= 3) {
      const names = parsed.month.values.map((m) => MONTH_LABELS[m]).join(", ");
      parts.push(`in ${names}`);
    } else {
      parts.push(`in month ${monthDesc}`);
    }
  }

  // Day of week
  const dowDesc = describeField(parsed.dayOfWeek, 0, 6);
  if (dowDesc !== "every") {
    if (parsed.dayOfWeek.values.length <= 3) {
      const names = parsed.dayOfWeek.values.map((d) => DAY_LABELS[d]).join(", ");
      parts.push(`on ${names}`);
    } else {
      parts.push(`on weekday ${dowDesc}`);
    }
  }

  return parts.join(" ");
}

/**
 * Describe a cron expression from its raw string.
 */
export function describeCron(expression: string): string {
  const result = parseCron(expression);
  if (!result.valid || !result.parsed) return `Invalid: ${result.errors.join(", ")}`;
  return describeExpression(result.parsed);
}

/* ------------------------------------------------------------------ */
/*  Next N runs                                                       */
/* ------------------------------------------------------------------ */

/**
 * Compute the next N run times for a cron expression.
 */
export function getNextRuns(
  expression: string,
  count: number = 5,
  options?: {
    from?: Date;
    timezone?: string;
  },
): Date[] {
  const result = parseCron(expression);
  if (!result.valid || !result.parsed) return [];

  const parsed = result.parsed;
  const runs: Date[] = [];
  const tz = options?.timezone ?? "UTC";

  let current = options?.from ? new Date(options.from) : new Date();
  // Start from next minute
  current.setSeconds(0, 0);
  current.setMinutes(current.getMinutes() + 1);

  // Safety: max iterations to avoid infinite loop
  const maxIterations = 366 * 24 * 60; // ~1 year of minutes
  let iterations = 0;

  while (runs.length < count && iterations < maxIterations) {
    iterations++;

    // Get components in the target timezone
    const parts = getDateParts(current, tz);

    if (
      parsed.month.values.includes(parts.month) &&
      parsed.dayOfMonth.values.includes(parts.day) &&
      parsed.dayOfWeek.values.includes(parts.weekday) &&
      parsed.hour.values.includes(parts.hour) &&
      parsed.minute.values.includes(parts.minute)
    ) {
      runs.push(new Date(current));
    }

    // Advance
    current.setMinutes(current.getMinutes() + 1);
  }

  return runs;
}

function getDateParts(
  date: Date,
  timezone: string,
): { month: number; day: number; weekday: number; hour: number; minute: number } {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      weekday: "short",
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const get = (type: string) =>
      parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);

    const weekdayStr = parts.find((p) => p.type === "weekday")?.value?.toLowerCase() ?? "";
    const weekday = DAY_NAMES[weekdayStr.slice(0, 3)] ?? date.getDay();

    return {
      month: get("month"),
      day: get("day"),
      weekday,
      hour: get("hour"),
      minute: get("minute"),
    };
  } catch {
    // Fallback to UTC
    return {
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      weekday: date.getUTCDay(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Scheduler                                                         */
/* ------------------------------------------------------------------ */

export class CronScheduler {
  private jobs = new Map<string, ScheduledJob>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private defaultTimezone: string;

  constructor(timezone: string = "UTC") {
    this.defaultTimezone = timezone;
  }

  /**
   * Schedule a new job.
   */
  schedule(options: {
    id: string;
    name: string;
    cronExpression: string;
    handler: () => void | Promise<void>;
    timezone?: string;
  }): ScheduledJob {
    const validation = parseCron(options.cronExpression);
    if (!validation.valid) {
      throw new Error(`Invalid cron: ${validation.errors.join(", ")}`);
    }

    const timezone = options.timezone ?? this.defaultTimezone;
    const nextRuns = getNextRuns(options.cronExpression, 1, { timezone });

    const job: ScheduledJob = {
      id: options.id,
      name: options.name,
      cronExpression: options.cronExpression,
      timezone,
      handler: options.handler,
      status: "active",
      lastRun: null,
      nextRun: nextRuns[0] ?? null,
      runCount: 0,
      createdAt: new Date(),
    };

    this.jobs.set(job.id, job);
    this.scheduleNext(job);

    return job;
  }

  /**
   * Pause a scheduled job.
   */
  pause(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    job.status = "paused";
    const timer = this.timers.get(jobId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(jobId);
    }

    return true;
  }

  /**
   * Resume a paused job.
   */
  resume(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    job.status = "active";
    const nextRuns = getNextRuns(job.cronExpression, 1, {
      timezone: job.timezone,
    });
    job.nextRun = nextRuns[0] ?? null;
    this.scheduleNext(job);

    return true;
  }

  /**
   * Remove a job.
   */
  remove(jobId: string): boolean {
    const timer = this.timers.get(jobId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(jobId);
    }
    return this.jobs.delete(jobId);
  }

  /**
   * Get job status.
   */
  getJob(jobId: string): ScheduledJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * List all jobs.
   */
  listJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Stop all jobs and clear timers.
   */
  shutdown(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.jobs.clear();
  }

  private scheduleNext(job: ScheduledJob): void {
    if (job.status !== "active" || !job.nextRun) return;

    const delay = Math.max(0, job.nextRun.getTime() - Date.now());

    // Cap at 2^31-1 ms (~24.8 days) to avoid setTimeout overflow
    const safeDelay = Math.min(delay, 2147483647);

    const timer = setTimeout(async () => {
      if (job.status !== "active") return;

      try {
        await job.handler();
      } catch {
        // Job handler error - continue scheduling
      }

      job.lastRun = new Date();
      job.runCount++;

      // Compute next run
      const nextRuns = getNextRuns(job.cronExpression, 1, {
        timezone: job.timezone,
      });
      job.nextRun = nextRuns[0] ?? null;

      this.scheduleNext(job);
    }, safeDelay);

    this.timers.set(job.id, timer);
  }
}
