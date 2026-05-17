/**
 * Client-side error tracking — captures uncaught errors and unhandled
 * promise rejections, groups them, and reports via a callback.
 */

export interface ErrorReport {
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  groupKey: string;
  timestamp: string;
  url?: string;
  userAgent?: string;
}

type ErrorReportCallback = (report: ErrorReport) => void;

let reportCallback: ErrorReportCallback | null = null;
let isInstalled = false;

/**
 * Derive a stable grouping key from the error so that identical errors
 * are bucketed together.
 */
function groupKey(error: Error): string {
  const firstFrame = error.stack?.split("\n")[1]?.trim() ?? "";
  return `${error.name}:${error.message}:${firstFrame}`;
}

/**
 * Build a structured error report.
 */
function buildReport(
  error: Error,
  context?: Record<string, unknown>
): ErrorReport {
  return {
    message: error.message,
    stack: error.stack,
    context,
    groupKey: groupKey(error),
    timestamp: new Date().toISOString(),
    url: typeof window !== "undefined" ? window.location.href : undefined,
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  };
}

/**
 * Report an error manually. Useful for caught errors you still want to track.
 */
export function reportError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  const err =
    error instanceof Error ? error : new Error(String(error));

  const report = buildReport(err, context);

  if (reportCallback) {
    try {
      reportCallback(report);
    } catch {
      // Avoid infinite loops if the callback itself throws
      console.error("[ErrorTracker] Report callback threw:", report);
    }
  } else {
    console.error("[ErrorTracker]", report);
  }
}

// --- Global handlers ---

function handleWindowError(event: ErrorEvent): void {
  reportError(event.error ?? new Error(event.message), {
    source: "window.onerror",
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
}

function handleUnhandledRejection(event: PromiseRejectionEvent): void {
  const error =
    event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));
  reportError(error, { source: "unhandledrejection" });
}

/**
 * Install global error and unhandled-rejection handlers.
 * Safe to call multiple times; handlers are only attached once.
 *
 * @param onReport - Callback invoked for every captured error.
 */
export function installGlobalErrorHandlers(
  onReport?: ErrorReportCallback
): void {
  if (onReport) {
    reportCallback = onReport;
  }

  if (typeof window === "undefined" || isInstalled) return;

  window.addEventListener("error", handleWindowError);
  window.addEventListener("unhandledrejection", handleUnhandledRejection);
  isInstalled = true;
}

/**
 * Remove global handlers (e.g. during HMR teardown or tests).
 */
export function removeGlobalErrorHandlers(): void {
  if (typeof window === "undefined" || !isInstalled) return;

  window.removeEventListener("error", handleWindowError);
  window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  isInstalled = false;
}
