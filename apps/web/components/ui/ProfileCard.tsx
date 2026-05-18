"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ProfileCardProps {
  name: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  memberSince?: Date;
  variant?: "compact" | "expanded";
  className?: string;
  children?: ReactNode;
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

const roleBadgeColors: Record<string, string> = {
  admin: "border-red-500/30 bg-red-500/10 text-red-400",
  owner: "border-purple-500/30 bg-purple-500/10 text-purple-400",
  member: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  viewer: "border-gray-500/30 bg-gray-500/10 text-gray-400",
};

function getRoleBadgeClass(role: string): string {
  return (
    roleBadgeColors[role.toLowerCase()] ||
    "border-blue-500/30 bg-blue-500/10 text-blue-400"
  );
}

export function ProfileCard({
  name,
  email,
  role,
  avatarUrl,
  memberSince,
  variant = "expanded",
  className,
  children,
}: ProfileCardProps) {
  const initial = getInitial(name);
  const isCompact = variant === "compact";

  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm transition-colors",
        isCompact ? "flex items-center gap-3 p-3" : "p-5",
        className
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-purple-600 font-semibold text-white",
          isCompact ? "h-10 w-10 text-sm" : "mx-auto h-16 w-16 text-xl"
        )}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{initial}</span>
        )}
      </div>

      {/* Info */}
      <div className={cn(isCompact ? "min-w-0 flex-1" : "mt-4 text-center")}>
        <p
          className={cn(
            "font-semibold text-white",
            isCompact ? "text-sm" : "text-base"
          )}
        >
          {name}
        </p>

        {email && (
          <p
            className={cn(
              "text-white/50",
              isCompact ? "truncate text-xs" : "mt-0.5 text-sm"
            )}
          >
            {email}
          </p>
        )}

        {role && (
          <span
            className={cn(
              "inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
              isCompact ? "mt-1" : "mt-2",
              getRoleBadgeClass(role)
            )}
          >
            {role}
          </span>
        )}

        {!isCompact && memberSince && (
          <p className="mt-2 text-xs text-white/30">
            Member since {formatDate(memberSince)}
          </p>
        )}

        {!isCompact && children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}
