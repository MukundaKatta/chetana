"use client";

import { type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "success" | "warning" | "error" | "info";
export type BadgeSize = "sm" | "md" | "lg";

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "border-white/20 bg-white/10 text-white/80",
  success: "border-green-500/30 bg-green-500/10 text-green-400",
  warning: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  error: "border-red-500/30 bg-red-500/10 text-red-400",
  info: "border-blue-500/30 bg-blue-500/10 text-blue-400",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-white/60",
  success: "bg-green-400",
  warning: "bg-yellow-400",
  error: "bg-red-400",
  info: "bg-blue-400",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-1.5 py-0.5 text-[10px] gap-1",
  md: "px-2 py-0.5 text-xs gap-1.5",
  lg: "px-3 py-1 text-sm gap-2",
};

const dotSizes: Record<BadgeSize, string> = {
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
  lg: "h-2 w-2",
};

const iconSizes: Record<BadgeSize, string> = {
  sm: "[&>svg]:h-3 [&>svg]:w-3",
  md: "[&>svg]:h-3.5 [&>svg]:w-3.5",
  lg: "[&>svg]:h-4 [&>svg]:w-4",
};

const dismissSizes: Record<BadgeSize, string> = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
};

export function Badge({
  children,
  variant = "default",
  size = "md",
  dot = false,
  icon,
  onDismiss,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium leading-none",
        variantStyles[variant],
        sizeStyles[size],
        icon && iconSizes[size],
        className
      )}
    >
      {dot && (
        <span
          className={cn("shrink-0 rounded-full", dotColors[variant], dotSizes[size])}
          aria-hidden="true"
        />
      )}

      {icon && <span className="shrink-0">{icon}</span>}

      <span>{children}</span>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 rounded-full p-0.5 transition-colors hover:bg-white/10"
          aria-label="Remove"
        >
          <X className={cn(dismissSizes[size])} />
        </button>
      )}
    </span>
  );
}
