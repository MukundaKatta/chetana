"use client";

/**
 * Real-time collaboration cursors (Issue #369).
 * Broadcast cursor position, colored cursor avatars,
 * selection highlight sharing, presence indicators,
 * graceful degradation on connection drop.
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface CursorUser {
  /** Unique user ID. */
  id: string;
  /** Display name. */
  name: string;
  /** Avatar URL (optional). */
  avatarUrl?: string;
  /** Assigned color. */
  color: string;
}

export interface CursorPosition {
  /** User ID. */
  userId: string;
  /** X coordinate (relative to container). */
  x: number;
  /** Y coordinate (relative to container). */
  y: number;
  /** ISO timestamp. */
  timestamp: string;
}

export interface SelectionRange {
  /** User ID. */
  userId: string;
  /** Start element ID or data attribute. */
  startElementId: string;
  /** End element ID or data attribute. */
  endElementId: string;
  /** Selection start offset. */
  startOffset: number;
  /** Selection end offset. */
  endOffset: number;
}

export interface CursorBroadcaster {
  /** Send cursor position update. */
  sendPosition: (position: Omit<CursorPosition, "userId">) => void;
  /** Send selection update. */
  sendSelection: (selection: Omit<SelectionRange, "userId"> | null) => void;
  /** Disconnect. */
  disconnect: () => void;
}

export type ConnectionStatus = "connected" | "connecting" | "disconnected";

export interface CollaborationCursorsProps {
  /** Current user. */
  currentUser: CursorUser;
  /** Remote cursor positions (updated externally). */
  remoteCursors: CursorPosition[];
  /** Remote selections (updated externally). */
  remoteSelections?: SelectionRange[];
  /** Remote user info. */
  remoteUsers: CursorUser[];
  /** Connection status. */
  connectionStatus: ConnectionStatus;
  /** Whether to show presence indicators (default true). */
  showPresence?: boolean;
  /** Throttle rate for cursor updates in ms (default 50). */
  throttleMs?: number;
  /** Callback when local cursor moves. */
  onCursorMove?: (position: Omit<CursorPosition, "userId">) => void;
  /** Callback when local selection changes. */
  onSelectionChange?: (
    selection: Omit<SelectionRange, "userId"> | null
  ) => void;
  /** Container content. */
  children: ReactNode;
  /** Custom class name. */
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Cursor Colors                                                     */
/* ------------------------------------------------------------------ */

const CURSOR_COLORS = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

export function assignCursorColor(index: number): string {
  return CURSOR_COLORS[index % CURSOR_COLORS.length]!;
}

/* ------------------------------------------------------------------ */
/*  Throttle utility                                                  */
/* ------------------------------------------------------------------ */

function useThrottle<T extends (...args: never[]) => void>(
  fn: T,
  delayMs: number
): T {
  const lastCall = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      const remaining = delayMs - (now - lastCall.current);

      if (remaining <= 0) {
        lastCall.current = now;
        fn(...args);
      } else if (!timer.current) {
        timer.current = setTimeout(() => {
          lastCall.current = Date.now();
          timer.current = null;
          fn(...args);
        }, remaining);
      }
    }) as T,
    [fn, delayMs]
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function CollaborationCursors({
  currentUser,
  remoteCursors,
  remoteSelections = [],
  remoteUsers,
  connectionStatus,
  showPresence = true,
  throttleMs = 50,
  onCursorMove,
  onSelectionChange,
  children,
  className,
}: CollaborationCursorsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

  // Build user map for quick lookup
  const userMap = useMemo(() => {
    const map = new Map<string, CursorUser>();
    for (const user of remoteUsers) {
      map.set(user.id, user);
    }
    return map;
  }, [remoteUsers]);

  // Track container bounds
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateRect = () => setContainerRect(container.getBoundingClientRect());
    updateRect();

    const observer = new ResizeObserver(updateRect);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Throttled cursor broadcast
  const throttledCursorMove = useThrottle(
    useCallback(
      (x: number, y: number) => {
        onCursorMove?.({
          x,
          y,
          timestamp: new Date().toISOString(),
        });
      },
      [onCursorMove]
    ),
    throttleMs
  );

  // Handle mouse move within container
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRect || connectionStatus !== "connected") return;

      const x = e.clientX - containerRect.left;
      const y = e.clientY - containerRect.top;
      throttledCursorMove(x as never, y as never);
    },
    [containerRect, connectionStatus, throttledCursorMove]
  );

  // Handle selection change
  useEffect(() => {
    if (!onSelectionChange) return;

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        onSelectionChange(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const startEl = range.startContainer.parentElement;
      const endEl = range.endContainer.parentElement;

      if (!startEl || !endEl) return;

      onSelectionChange({
        startElementId: startEl.id || startEl.dataset.collab || "",
        endElementId: endEl.id || endEl.dataset.collab || "",
        startOffset: range.startOffset,
        endOffset: range.endOffset,
      });
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, [onSelectionChange]);

  // Filter out stale cursors (older than 10 seconds)
  const activeCursors = useMemo(() => {
    const cutoff = Date.now() - 10_000;
    return remoteCursors.filter(
      (c) =>
        c.userId !== currentUser.id &&
        new Date(c.timestamp).getTime() > cutoff
    );
  }, [remoteCursors, currentUser.id]);

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onMouseMove={handleMouseMove}
    >
      {/* Presence indicators */}
      {showPresence && (
        <div className="absolute right-2 top-2 z-30 flex items-center gap-1">
          <ConnectionBadge status={connectionStatus} />
          <div className="flex -space-x-2">
            {/* Current user */}
            <UserAvatar user={currentUser} isSelf />
            {/* Remote users with active cursors */}
            {activeCursors.map((cursor) => {
              const user = userMap.get(cursor.userId);
              if (!user) return null;
              return <UserAvatar key={user.id} user={user} />;
            })}
          </div>
        </div>
      )}

      {/* Remote cursors */}
      {activeCursors.map((cursor) => {
        const user = userMap.get(cursor.userId);
        if (!user) return null;

        return (
          <RemoteCursor
            key={cursor.userId}
            user={user}
            x={cursor.x}
            y={cursor.y}
          />
        );
      })}

      {/* Remote selections */}
      {remoteSelections.map((sel) => {
        const user = userMap.get(sel.userId);
        if (!user || sel.userId === currentUser.id) return null;

        return (
          <div
            key={`sel-${sel.userId}`}
            className="pointer-events-none absolute z-10"
            style={{
              backgroundColor: `${user.color}20`,
              borderBottom: `2px solid ${user.color}`,
            }}
          />
        );
      })}

      {/* Content */}
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function RemoteCursor({
  user,
  x,
  y,
}: {
  user: CursorUser;
  x: number;
  y: number;
}) {
  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{
        left: x,
        top: y,
        transition: "left 0.1s linear, top 0.1s linear",
      }}
    >
      {/* Cursor arrow */}
      <svg
        width="16"
        height="20"
        viewBox="0 0 16 20"
        fill="none"
        style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.2))" }}
      >
        <path
          d="M0 0 L16 12 L8 12 L4 20 Z"
          fill={user.color}
          stroke="white"
          strokeWidth="1"
        />
      </svg>
      {/* Name label */}
      <div
        className="absolute left-4 top-4 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium text-white shadow"
        style={{ backgroundColor: user.color }}
      >
        {user.name}
      </div>
    </div>
  );
}

function UserAvatar({
  user,
  isSelf = false,
}: {
  user: CursorUser;
  isSelf?: boolean;
}) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white",
        isSelf && "ring-2 ring-blue-400"
      )}
      style={{ backgroundColor: user.color }}
      title={`${user.name}${isSelf ? " (you)" : ""}`}
    >
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={user.name}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );
}

function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const config = {
    connected: { color: "bg-green-500", label: "Connected" },
    connecting: { color: "bg-yellow-500", label: "Connecting..." },
    disconnected: { color: "bg-red-500", label: "Disconnected" },
  }[status];

  return (
    <div className="mr-2 flex items-center gap-1.5 text-xs text-gray-500">
      <span
        className={cn(
          "inline-block h-2 w-2 rounded-full",
          config.color,
          status === "connecting" && "animate-pulse"
        )}
      />
      {config.label}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook for creating a mock broadcaster (for testing)                */
/* ------------------------------------------------------------------ */

export interface UseCollaborationCursorsConfig {
  currentUser: CursorUser;
  channelId: string;
}

export interface UseCollaborationCursorsReturn {
  remoteCursors: CursorPosition[];
  remoteSelections: SelectionRange[];
  remoteUsers: CursorUser[];
  connectionStatus: ConnectionStatus;
  handleCursorMove: (position: Omit<CursorPosition, "userId">) => void;
  handleSelectionChange: (
    selection: Omit<SelectionRange, "userId"> | null
  ) => void;
}

/**
 * Hook that manages collaboration cursor state.
 * In production, this would connect to a real-time backend (e.g., Supabase).
 * This implementation provides the interface for local state management.
 */
export function useCollaborationCursors(
  config: UseCollaborationCursorsConfig
): UseCollaborationCursorsReturn {
  const [remoteCursors, setRemoteCursors] = useState<CursorPosition[]>([]);
  const [remoteSelections, setRemoteSelections] = useState<SelectionRange[]>(
    []
  );
  const [remoteUsers, setRemoteUsers] = useState<CursorUser[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connected");

  // In production, connect to a real-time channel here
  useEffect(() => {
    setConnectionStatus("connected");
    return () => {
      setConnectionStatus("disconnected");
    };
  }, [config.channelId]);

  const handleCursorMove = useCallback(
    (position: Omit<CursorPosition, "userId">) => {
      // In production, broadcast via WebSocket/Supabase
      // For now, this is a no-op placeholder
    },
    []
  );

  const handleSelectionChange = useCallback(
    (selection: Omit<SelectionRange, "userId"> | null) => {
      // In production, broadcast via WebSocket/Supabase
    },
    []
  );

  return {
    remoteCursors,
    remoteSelections,
    remoteUsers,
    connectionStatus,
    handleCursorMove,
    handleSelectionChange,
  };
}
