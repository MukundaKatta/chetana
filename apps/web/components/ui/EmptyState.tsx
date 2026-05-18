"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type EmptyStateVariant = "no-data" | "no-results" | "no-config" | "error";

export interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

function NoDataIllustration() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="20"
        y="30"
        width="80"
        height="60"
        rx="8"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="4 4"
        opacity="0.3"
      />
      <circle cx="60" cy="55" r="12" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      <line
        x1="60"
        y1="48"
        x2="60"
        y2="62"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.4"
      />
      <line
        x1="53"
        y1="55"
        x2="67"
        y2="55"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.4"
      />
      <rect x="35" y="75" width="50" height="4" rx="2" fill="currentColor" opacity="0.15" />
      <rect x="45" y="83" width="30" height="3" rx="1.5" fill="currentColor" opacity="0.1" />
    </svg>
  );
}

function NoResultsIllustration() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="52" cy="52" r="22" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      <line
        x1="68"
        y1="68"
        x2="90"
        y2="90"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.3"
      />
      <line
        x1="44"
        y1="46"
        x2="60"
        y2="58"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.4"
      />
      <line
        x1="60"
        y1="46"
        x2="44"
        y2="58"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.4"
      />
      <rect x="25" y="100" width="70" height="3" rx="1.5" fill="currentColor" opacity="0.1" />
    </svg>
  );
}

function NoConfigIllustration() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M60 35L65 42H55L60 35Z"
        fill="currentColor"
        opacity="0.2"
      />
      <circle cx="60" cy="60" r="20" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      <path
        d="M60 44V48M60 72V76M44 60H48M72 60H76"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.3"
      />
      <circle cx="60" cy="60" r="8" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      <path
        d="M50 82L52 78M70 82L68 78M40 70L44 68M76 70L72 68M40 50L44 52M76 50L72 52M50 38L52 42M70 38L68 42"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.2"
      />
      <rect x="35" y="95" width="50" height="3" rx="1.5" fill="currentColor" opacity="0.1" />
    </svg>
  );
}

function ErrorIllustration() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M60 28L95 88H25L60 28Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.3"
      />
      <line
        x1="60"
        y1="50"
        x2="60"
        y2="68"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.5"
      />
      <circle cx="60" cy="76" r="2" fill="currentColor" opacity="0.5" />
      <rect x="30" y="98" width="60" height="3" rx="1.5" fill="currentColor" opacity="0.1" />
    </svg>
  );
}

const illustrations: Record<EmptyStateVariant, () => ReactNode> = {
  "no-data": NoDataIllustration,
  "no-results": NoResultsIllustration,
  "no-config": NoConfigIllustration,
  error: ErrorIllustration,
};

export function EmptyState({
  variant = "no-data",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const Illustration = illustrations[variant];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        className
      )}
    >
      <div className="text-white/30">
        <Illustration />
      </div>

      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>

      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-white/50">{description}</p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
