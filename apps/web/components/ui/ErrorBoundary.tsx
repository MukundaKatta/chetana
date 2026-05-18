"use client";

import {
  Component,
  useState,
  useCallback,
  type ReactNode,
  type ErrorInfo,
} from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showStackTrace?: boolean;
  className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export interface ErrorLogEntry {
  id: string;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  userAgent: string;
  url: string;
}

/* ------------------------------------------------------------------ */
/*  Error logging                                                     */
/* ------------------------------------------------------------------ */

const errorLog: ErrorLogEntry[] = [];
const MAX_LOG_SIZE = 100;

function logError(error: Error, errorInfo: ErrorInfo): ErrorLogEntry {
  const entry: ErrorLogEntry = {
    id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack ?? undefined,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    url: typeof window !== "undefined" ? window.location.href : "unknown",
  };

  errorLog.unshift(entry);
  if (errorLog.length > MAX_LOG_SIZE) {
    errorLog.length = MAX_LOG_SIZE;
  }

  // Persist to sessionStorage for debugging
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.setItem("chetana:error-log", JSON.stringify(errorLog.slice(0, 20)));
    } catch {
      // Ignore storage errors
    }
  }

  return entry;
}

export function getErrorLog(): readonly ErrorLogEntry[] {
  return errorLog;
}

export function clearErrorLog(): void {
  errorLog.length = 0;
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem("chetana:error-log");
    } catch {
      // Ignore
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Default fallback UI                                               */
/* ------------------------------------------------------------------ */

function DefaultFallback({
  error,
  errorInfo,
  showStackTrace,
  onRetry,
}: {
  error: Error;
  errorInfo: ErrorInfo | null;
  showStackTrace: boolean;
  onRetry: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const isDev = process.env.NODE_ENV === "development";

  const copyErrorDetails = useCallback(() => {
    const details = [
      `Error: ${error.message}`,
      "",
      `Stack Trace:`,
      error.stack ?? "(no stack trace)",
      "",
      `Component Stack:`,
      errorInfo?.componentStack ?? "(no component stack)",
    ].join("\n");

    void navigator.clipboard.writeText(details);
  }, [error, errorInfo]);

  return (
    <div
      role="alert"
      className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center"
    >
      {/* Icon */}
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
        <svg
          className="h-6 w-6 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>

      {/* Title & description */}
      <div>
        <h3 className="text-lg font-semibold text-white">Something went wrong</h3>
        <p className="mt-1 text-sm text-neutral-400">
          {error.message || "An unexpected error occurred in this component."}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/30"
        >
          Retry
        </button>
        {(isDev || showStackTrace) && (
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-neutral-400 transition-colors hover:bg-white/5 hover:text-neutral-300"
          >
            {showDetails ? "Hide Details" : "Show Details"}
          </button>
        )}
        <button
          type="button"
          onClick={copyErrorDetails}
          className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-neutral-400 transition-colors hover:bg-white/5 hover:text-neutral-300"
        >
          Copy Error
        </button>
      </div>

      {/* Stack trace (dev mode) */}
      {showDetails && (isDev || showStackTrace) && (
        <div className="w-full text-left">
          <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-white/10 bg-black/30 p-4">
            <div className="mb-2 text-xs font-semibold text-red-400">Stack Trace</div>
            <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-neutral-400">
              {error.stack ?? "No stack trace available"}
            </pre>

            {errorInfo?.componentStack && (
              <>
                <div className="mb-2 mt-4 text-xs font-semibold text-red-400">
                  Component Stack
                </div>
                <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-neutral-400">
                  {errorInfo.componentStack}
                </pre>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Error Boundary (class component required by React)                */
/* ------------------------------------------------------------------ */

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    logError(error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Custom fallback
      if (this.props.fallback) {
        if (typeof this.props.fallback === "function") {
          return this.props.fallback(this.state.error, this.handleReset);
        }
        return this.props.fallback;
      }

      // Default fallback
      return (
        <div className={cn("p-4", this.props.className)}>
          <DefaultFallback
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            showStackTrace={this.props.showStackTrace ?? false}
            onRetry={this.handleReset}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
