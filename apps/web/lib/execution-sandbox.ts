/**
 * Probe execution sandbox (Issue #452).
 * Runs probe executions with configurable timeouts, graceful timeout
 * handling, resource monitoring (tokens, time), isolation between runs,
 * and detailed execution logs with timing.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type ExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "timeout"
  | "error"
  | "cancelled";

export interface ExecutionConfig {
  /** Timeout in milliseconds (default 30000). */
  timeoutMs?: number;
  /** Maximum tokens allowed (default 4096). */
  maxTokens?: number;
  /** Maximum retries on transient errors (default 0). */
  maxRetries?: number;
  /** Whether to enforce strict isolation (default true). */
  isolate?: boolean;
  /** Tags for categorizing this execution. */
  tags?: string[];
}

export interface ResourceUsage {
  /** Tokens consumed (input + output). */
  tokensUsed: number;
  /** Input tokens. */
  inputTokens: number;
  /** Output tokens. */
  outputTokens: number;
  /** Wall-clock time in milliseconds. */
  wallTimeMs: number;
  /** Processing time in ms (excluding network wait). */
  processingTimeMs: number;
}

export interface ExecutionLogEntry {
  /** ISO timestamp. */
  timestamp: string;
  /** Elapsed milliseconds since execution start. */
  elapsedMs: number;
  /** Log level. */
  level: "debug" | "info" | "warn" | "error";
  /** Log message. */
  message: string;
  /** Optional structured data. */
  data?: Record<string, unknown>;
}

export interface ExecutionResult<T = unknown> {
  /** Unique execution ID. */
  executionId: string;
  /** Probe ID being executed. */
  probeId: string;
  /** Final execution status. */
  status: ExecutionStatus;
  /** The result data (null if not completed). */
  result: T | null;
  /** Error message if status is "error" or "timeout". */
  error?: string;
  /** Resource usage. */
  resources: ResourceUsage;
  /** Execution log. */
  log: ExecutionLogEntry[];
  /** Execution configuration used. */
  config: Required<ExecutionConfig>;
  /** ISO timestamp of execution start. */
  startedAt: string;
  /** ISO timestamp of execution end. */
  endedAt: string | null;
  /** Retry count. */
  retryCount: number;
}

export type ProbeExecutor<T = unknown> = (
  context: ExecutionContext,
) => Promise<T>;

export interface ExecutionContext {
  /** Execution ID. */
  executionId: string;
  /** Probe ID. */
  probeId: string;
  /** Signal that is aborted on timeout or cancellation. */
  signal: AbortSignal;
  /** Log a message to the execution log. */
  log: (
    level: ExecutionLogEntry["level"],
    message: string,
    data?: Record<string, unknown>,
  ) => void;
  /** Report token usage. */
  reportTokens: (input: number, output: number) => void;
  /** Check if the execution should stop. */
  shouldStop: () => boolean;
}

/* ------------------------------------------------------------------ */
/*  ID generation                                                     */
/* ------------------------------------------------------------------ */

let nextExecId = 0;

function generateExecutionId(): string {
  return `exec_${Date.now()}_${++nextExecId}`;
}

/* ------------------------------------------------------------------ */
/*  Execution sandbox                                                 */
/* ------------------------------------------------------------------ */

export class ExecutionSandbox {
  private activeExecutions = new Map<string, AbortController>();
  private completedExecutions: ExecutionResult[] = [];
  private maxHistory: number;

  constructor(maxHistory: number = 200) {
    this.maxHistory = maxHistory;
  }

  /**
   * Execute a probe within the sandbox.
   */
  async execute<T>(
    probeId: string,
    executor: ProbeExecutor<T>,
    config: ExecutionConfig = {},
  ): Promise<ExecutionResult<T>> {
    const resolvedConfig: Required<ExecutionConfig> = {
      timeoutMs: config.timeoutMs ?? 30_000,
      maxTokens: config.maxTokens ?? 4096,
      maxRetries: config.maxRetries ?? 0,
      isolate: config.isolate ?? true,
      tags: config.tags ?? [],
    };

    const executionId = generateExecutionId();
    const abortController = new AbortController();
    this.activeExecutions.set(executionId, abortController);

    const startTime = Date.now();
    const log: ExecutionLogEntry[] = [];
    const resources: ResourceUsage = {
      tokensUsed: 0,
      inputTokens: 0,
      outputTokens: 0,
      wallTimeMs: 0,
      processingTimeMs: 0,
    };

    const addLog = (
      level: ExecutionLogEntry["level"],
      message: string,
      data?: Record<string, unknown>,
    ) => {
      log.push({
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - startTime,
        level,
        message,
        data,
      });
    };

    const reportTokens = (input: number, output: number) => {
      resources.inputTokens += input;
      resources.outputTokens += output;
      resources.tokensUsed = resources.inputTokens + resources.outputTokens;

      if (resources.tokensUsed > resolvedConfig.maxTokens) {
        addLog("warn", `Token limit exceeded: ${resources.tokensUsed}/${resolvedConfig.maxTokens}`);
      }
    };

    const context: ExecutionContext = {
      executionId,
      probeId,
      signal: abortController.signal,
      log: addLog,
      reportTokens,
      shouldStop: () => abortController.signal.aborted,
    };

    addLog("info", `Execution started for probe ${probeId}`, {
      config: resolvedConfig,
    });

    let result: ExecutionResult<T> = {
      executionId,
      probeId,
      status: "running",
      result: null,
      resources,
      log,
      config: resolvedConfig,
      startedAt: new Date(startTime).toISOString(),
      endedAt: null,
      retryCount: 0,
    };

    let lastError: string | undefined;

    for (
      let attempt = 0;
      attempt <= resolvedConfig.maxRetries;
      attempt++
    ) {
      if (attempt > 0) {
        addLog("info", `Retry attempt ${attempt}/${resolvedConfig.maxRetries}`);
        result.retryCount = attempt;
      }

      try {
        const processingStart = Date.now();
        const execResult = await this.executeWithTimeout(
          executor,
          context,
          resolvedConfig.timeoutMs,
          abortController,
        );
        resources.processingTimeMs += Date.now() - processingStart;

        result.status = "completed";
        result.result = execResult;
        addLog("info", "Execution completed successfully");
        break;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);

        if (abortController.signal.aborted) {
          if (message.includes("timeout")) {
            result.status = "timeout";
            result.error = `Execution timed out after ${resolvedConfig.timeoutMs}ms`;
            addLog("error", result.error);
          } else {
            result.status = "cancelled";
            result.error = "Execution was cancelled";
            addLog("warn", result.error);
          }
          break;
        }

        lastError = message;
        addLog("error", `Execution error: ${message}`);

        if (attempt >= resolvedConfig.maxRetries) {
          result.status = "error";
          result.error = lastError;
        }
      }
    }

    // Finalize
    const endTime = Date.now();
    resources.wallTimeMs = endTime - startTime;
    result.endedAt = new Date(endTime).toISOString();

    this.activeExecutions.delete(executionId);
    this.completedExecutions.push(result);
    this.trimHistory();

    return result;
  }

  /**
   * Execute with a timeout using AbortController.
   */
  private async executeWithTimeout<T>(
    executor: ProbeExecutor<T>,
    context: ExecutionContext,
    timeoutMs: number,
    abortController: AbortController,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        abortController.abort(new Error("timeout"));
        reject(new Error(`Execution timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      executor(context)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Cancel an active execution.
   */
  cancel(executionId: string): boolean {
    const controller = this.activeExecutions.get(executionId);
    if (!controller) return false;
    controller.abort(new Error("cancelled"));
    return true;
  }

  /**
   * Cancel all active executions.
   */
  cancelAll(): number {
    let count = 0;
    for (const [, controller] of this.activeExecutions) {
      controller.abort(new Error("cancelled"));
      count++;
    }
    return count;
  }

  /**
   * Get the status of an active execution.
   */
  getActiveExecution(executionId: string): boolean {
    return this.activeExecutions.has(executionId);
  }

  /**
   * Get the number of active executions.
   */
  getActiveCount(): number {
    return this.activeExecutions.size;
  }

  /**
   * Get completed execution results.
   */
  getHistory(
    probeId?: string,
    limit: number = 50,
  ): ExecutionResult[] {
    let results = [...this.completedExecutions];
    if (probeId) {
      results = results.filter((r) => r.probeId === probeId);
    }
    return results.slice(-limit);
  }

  /**
   * Get aggregate statistics for a probe.
   */
  getProbeStats(probeId: string): {
    totalExecutions: number;
    successCount: number;
    errorCount: number;
    timeoutCount: number;
    avgDurationMs: number;
    avgTokensUsed: number;
    p95DurationMs: number;
  } {
    const runs = this.completedExecutions.filter(
      (r) => r.probeId === probeId,
    );

    if (runs.length === 0) {
      return {
        totalExecutions: 0,
        successCount: 0,
        errorCount: 0,
        timeoutCount: 0,
        avgDurationMs: 0,
        avgTokensUsed: 0,
        p95DurationMs: 0,
      };
    }

    const durations = runs
      .map((r) => r.resources.wallTimeMs)
      .sort((a, b) => a - b);

    const p95Index = Math.min(
      Math.ceil(durations.length * 0.95) - 1,
      durations.length - 1,
    );

    return {
      totalExecutions: runs.length,
      successCount: runs.filter((r) => r.status === "completed").length,
      errorCount: runs.filter((r) => r.status === "error").length,
      timeoutCount: runs.filter((r) => r.status === "timeout").length,
      avgDurationMs:
        durations.reduce((s, d) => s + d, 0) / durations.length,
      avgTokensUsed:
        runs.reduce((s, r) => s + r.resources.tokensUsed, 0) /
        runs.length,
      p95DurationMs: durations[p95Index],
    };
  }

  /**
   * Clear completed execution history.
   */
  clearHistory(): void {
    this.completedExecutions = [];
  }

  private trimHistory(): void {
    if (this.completedExecutions.length > this.maxHistory) {
      this.completedExecutions = this.completedExecutions.slice(
        -this.maxHistory,
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Singleton                                                         */
/* ------------------------------------------------------------------ */

let _sandbox: ExecutionSandbox | null = null;

export function getExecutionSandbox(): ExecutionSandbox {
  if (!_sandbox) {
    _sandbox = new ExecutionSandbox();
  }
  return _sandbox;
}
