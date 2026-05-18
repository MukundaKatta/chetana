"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import {
  Bell,
  X,
  CheckCheck,
  Info,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NotificationCategory =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "message";

export interface Notification {
  id: string;
  title: string;
  description?: string;
  category: NotificationCategory;
  read: boolean;
  timestamp: Date;
}

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  add: (notification: Omit<Notification, "id" | "read" | "timestamp">) => string;
  dismiss: (id: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null
);

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return ctx;
}

let notificationCounter = 0;

const categoryConfig: Record<
  NotificationCategory,
  { icon: typeof Info; className: string }
> = {
  info: { icon: Info, className: "text-blue-400" },
  success: { icon: CheckCircle2, className: "text-green-400" },
  warning: { icon: AlertTriangle, className: "text-yellow-400" },
  error: { icon: AlertCircle, className: "text-red-400" },
  message: { icon: MessageSquare, className: "text-purple-400" },
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const add = useCallback(
    (data: Omit<Notification, "id" | "read" | "timestamp">) => {
      const id = `notif-${++notificationCounter}`;
      setNotifications((prev) => [
        { ...data, id, read: false, timestamp: new Date() },
        ...prev,
      ]);
      return id;
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, add, dismiss, markRead, markAllRead }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const { notifications, unreadCount, dismiss, markRead, markAllRead } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-white/10 bg-gray-900 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-white/40">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => {
                const config = categoryConfig[notification.category];
                const Icon = config.icon;

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-3 border-b border-white/5 px-4 py-3 transition-colors hover:bg-white/5",
                      !notification.read && "bg-blue-500/5"
                    )}
                  >
                    <Icon
                      className={cn("mt-0.5 h-4 w-4 shrink-0", config.className)}
                    />
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => markRead(notification.id)}
                        className="w-full text-left"
                      >
                        <p
                          className={cn(
                            "text-sm",
                            notification.read
                              ? "text-white/60"
                              : "font-medium text-white"
                          )}
                        >
                          {notification.title}
                        </p>
                        {notification.description && (
                          <p className="mt-0.5 text-xs text-white/40">
                            {notification.description}
                          </p>
                        )}
                      </button>
                      <p className="mt-1 text-[10px] text-white/30">
                        {formatTimestamp(notification.timestamp)}
                      </p>
                    </div>
                    <button
                      onClick={() => dismiss(notification.id)}
                      className="shrink-0 rounded p-0.5 text-white/30 hover:text-white/60"
                      aria-label="Dismiss notification"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
