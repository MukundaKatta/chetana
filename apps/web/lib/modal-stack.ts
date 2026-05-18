"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Nested modal management (Issue #355).
 * Manages a z-index hierarchy so stacked modals layer correctly,
 * and ensures the Escape key only closes the topmost modal.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Base z-index for the first modal. Each subsequent modal increments by STEP. */
const BASE_Z_INDEX = 50;
const Z_INDEX_STEP = 10;

// ---------------------------------------------------------------------------
// ModalStack class
// ---------------------------------------------------------------------------

export class ModalStack {
  private stack: string[] = [];
  private listeners = new Set<() => void>();

  /**
   * Pushes a modal onto the stack and returns its z-index.
   */
  push(modalId: string): number {
    // Avoid duplicate entries — move to top if already present.
    this.stack = this.stack.filter((id) => id !== modalId);
    this.stack.push(modalId);
    this.notify();
    return BASE_Z_INDEX + (this.stack.length - 1) * Z_INDEX_STEP;
  }

  /**
   * Removes a modal from the stack.
   */
  pop(modalId: string): void {
    this.stack = this.stack.filter((id) => id !== modalId);
    this.notify();
  }

  /**
   * Returns the id of the topmost (most recently pushed) modal,
   * or `null` if the stack is empty.
   */
  getTopModal(): string | null {
    return this.stack.length > 0
      ? this.stack[this.stack.length - 1]
      : null;
  }

  /**
   * Returns the z-index assigned to `modalId`, or `null` if it is
   * not on the stack.
   */
  getZIndex(modalId: string): number | null {
    const idx = this.stack.indexOf(modalId);
    return idx === -1 ? null : BASE_Z_INDEX + idx * Z_INDEX_STEP;
  }

  /**
   * Whether any modals are currently open.
   */
  get isEmpty(): boolean {
    return this.stack.length === 0;
  }

  /**
   * Number of modals on the stack.
   */
  get size(): number {
    return this.stack.length;
  }

  /** Subscribe to stack changes. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

// ---------------------------------------------------------------------------
// React context
// ---------------------------------------------------------------------------

interface ModalStackContextValue {
  stack: ModalStack;
  /** Push a modal and get its z-index. */
  push: (modalId: string) => number;
  /** Pop a modal off the stack. */
  pop: (modalId: string) => void;
  /** The id of the current topmost modal, or null. */
  topModal: string | null;
}

const ModalStackContext = createContext<ModalStackContextValue | null>(null);

// ---------------------------------------------------------------------------
// ModalStackProvider
// ---------------------------------------------------------------------------

/**
 * Provides the modal stack context and attaches a global Escape key
 * handler that only dismisses the topmost modal.
 *
 * @example
 * ```tsx
 * <ModalStackProvider onEscape={(modalId) => closeModal(modalId)}>
 *   <App />
 * </ModalStackProvider>
 * ```
 */
export function ModalStackProvider({
  children,
  onEscape,
}: {
  children: ReactNode;
  onEscape?: (modalId: string) => void;
}) {
  const stackRef = useRef<ModalStack | null>(null);
  if (stackRef.current === null) {
    stackRef.current = new ModalStack();
  }
  const stack = stackRef.current;

  const [topModal, setTopModal] = useState<string | null>(null);

  useEffect(() => {
    return stack.subscribe(() => {
      setTopModal(stack.getTopModal());
    });
  }, [stack]);

  // Global Escape handler — only closes the topmost modal.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const top = stack.getTopModal();
      if (top === null) return;

      e.stopPropagation();
      onEscape?.(top);
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [stack, onEscape]);

  const push = useCallback(
    (modalId: string) => stack.push(modalId),
    [stack]
  );

  const pop = useCallback(
    (modalId: string) => stack.pop(modalId),
    [stack]
  );

  const value = useMemo<ModalStackContextValue>(
    () => ({ stack, push, pop, topModal }),
    [stack, push, pop, topModal]
  );

  return React.createElement(
    ModalStackContext.Provider,
    { value },
    children
  );
}

// ---------------------------------------------------------------------------
// useModalStack hook
// ---------------------------------------------------------------------------

/**
 * Hook to interact with the modal stack from any component inside a
 * `ModalStackProvider`.
 *
 * @example
 * ```tsx
 * function ConfirmDialog({ id }: { id: string }) {
 *   const { push, pop, topModal } = useModalStack();
 *   const zIndex = useRef<number>();
 *
 *   useEffect(() => {
 *     zIndex.current = push(id);
 *     return () => pop(id);
 *   }, [id, push, pop]);
 *
 *   const isTop = topModal === id;
 *   // ...
 * }
 * ```
 */
export function useModalStack(): ModalStackContextValue {
  const ctx = useContext(ModalStackContext);

  if (ctx === null) {
    throw new Error(
      "useModalStack must be used within a <ModalStackProvider>."
    );
  }

  return ctx;
}
