import { cn } from "@/lib/utils";

/**
 * Accessible callout/alert box for notes, warnings, and caveats.
 */
export type CalloutVariant = "info" | "warning" | "success" | "caveat";

const VARIANTS: Record<CalloutVariant, { border: string; bg: string; text: string; icon: string; role: string }> = {
  info: { border: "border-chetana-500/30", bg: "bg-chetana-500/5", text: "text-chetana-200/90", icon: "ℹ", role: "note" },
  warning: { border: "border-amber-500/30", bg: "bg-amber-500/5", text: "text-amber-200/90", icon: "⚠", role: "alert" },
  success: { border: "border-emerald-500/30", bg: "bg-emerald-500/5", text: "text-emerald-200/90", icon: "✓", role: "status" },
  caveat: { border: "border-white/15", bg: "bg-white/[0.03]", text: "text-gray-300", icon: "✱", role: "note" },
};

export interface CalloutProps {
  variant?: CalloutVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Callout({ variant = "info", title, children, className }: CalloutProps) {
  const v = VARIANTS[variant];
  return (
    <div role={v.role} className={cn("rounded-xl border p-4", v.border, v.bg, className)}>
      <div className="flex gap-3">
        <span aria-hidden className={cn("select-none text-sm", v.text)}>{v.icon}</span>
        <div className={cn("text-sm", v.text)}>
          {title && <p className="mb-1 font-medium">{title}</p>}
          <div className="leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}
