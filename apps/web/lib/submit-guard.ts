"use client";

import { useState, useCallback, useRef } from "react";

/**
 * Double-click / double-submit prevention (Issue #288).
 * Provides a hook that guards async submit handlers and
 * generates server-side idempotency keys.
 */

/**
 * Generates a unique idempotency key for a form submission.
 * This should be sent with the request so the server can de-duplicate.
 */
export function generateIdempotencyKey(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `idk_${timestamp}_${random}`;
}

export interface SubmitGuardReturn<T = void> {
  /** Whether a submission is currently in flight. */
  isSubmitting: boolean;
  /** Wraps an async handler to prevent concurrent submissions. */
  guardedSubmit: (handler: (idempotencyKey: string) => Promise<T>) => Promise<T | undefined>;
  /** The current idempotency key (regenerated after each successful submission). */
  idempotencyKey: string;
  /** Manually reset the guard (e.g., when remounting a form). */
  reset: () => void;
}

/**
 * React hook that prevents double-click / double-submit issues.
 *
 * Usage:
 * ```tsx
 * const { isSubmitting, guardedSubmit } = useSubmitGuard();
 *
 * const handleSubmit = () => guardedSubmit(async (idempotencyKey) => {
 *   await fetch("/api/audits", {
 *     method: "POST",
 *     headers: { "Idempotency-Key": idempotencyKey },
 *     body: JSON.stringify(formData),
 *   });
 * });
 * ```
 */
export function useSubmitGuard<T = void>(): SubmitGuardReturn<T> {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    generateIdempotencyKey()
  );
  const submittingRef = useRef(false);

  const reset = useCallback(() => {
    setIsSubmitting(false);
    submittingRef.current = false;
    setIdempotencyKey(generateIdempotencyKey());
  }, []);

  const guardedSubmit = useCallback(
    async (
      handler: (idempotencyKey: string) => Promise<T>
    ): Promise<T | undefined> => {
      // Bail immediately if already submitting (ref check is synchronous
      // and avoids React batching race conditions)
      if (submittingRef.current) return undefined;

      submittingRef.current = true;
      setIsSubmitting(true);

      try {
        const result = await handler(idempotencyKey);
        // Generate a fresh key for the next submission
        setIdempotencyKey(generateIdempotencyKey());
        return result;
      } catch (error) {
        // Re-enable the guard so the user can retry
        throw error;
      } finally {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [idempotencyKey]
  );

  return { isSubmitting, guardedSubmit, idempotencyKey, reset };
}
