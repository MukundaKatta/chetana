"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4 text-center">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
        <AlertTriangle className="h-10 w-10 text-red-400" />
      </div>

      <h1 className="mb-2 text-4xl font-bold text-white">500</h1>
      <h2 className="mb-4 text-lg font-medium text-gray-300">
        Something went wrong
      </h2>
      <p className="mb-2 max-w-md text-sm text-gray-500">
        An unexpected error occurred. This may be a temporary issue with our
        consciousness analysis infrastructure.
      </p>
      {error.message && (
        <p className="mb-8 max-w-md rounded-lg bg-red-500/5 border border-red-500/10 px-4 py-2 text-xs font-mono text-red-300">
          {error.message}
        </p>
      )}

      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Home className="h-4 w-4" />
          Home
        </Link>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}
