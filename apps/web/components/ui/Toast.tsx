"use client";

import {
  useState,
  useCallback,
  useEffect,
  createContext,
  useContext,
  useRef,
  type ReactNode,
} from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastData {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (options: Omit<ToastData, "id">) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

let toastCounter = 0;

const variantConfig: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; className: string }
> = {
  success: {
    icon: CheckCircle2,
    className: "border-green-500/30 bg-green-500/10 text-green-400",
  },
  error: {
    icon: AlertCircle,
    className: "border-red-500/30 bg-red-500/10 text-red-400",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  },
  info: {
    icon: Info,
    className: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  },
};

const DEFAULT_DURATION = 5000;

function ToastItem({
  toast: t,
  onDismiss,
}: {
  toast: ToastData;
  onDismiss: (id: string) => void;
}) {
  const config = variantConfig[t.variant];
  const Icon = config.icon;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const dur = t.duration ?? DEFAULT_DURATION;
    if (dur > 0) {
      timerRef.current = setTimeout(() => onDismiss(t.id), dur);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [t.id, t.duration, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "pointer-events-auto flex w-80 items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-sm transition-all animate-in slide-in-from-right-full",
        config.className
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{t.title}</p>
        {t.description && (
          <p className="mt-0.5 text-xs text-white/60">{t.description}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(t.id)}
        className="shrink-0 rounded p-0.5 text-white/40 hover:text-white"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const toast = useCallback((options: Omit<ToastData, "id">) => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev, { ...options, id }]);
    return id;
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss, dismissAll }}>
      {children}

      {/* Toast container */}
      <div
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-2"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
