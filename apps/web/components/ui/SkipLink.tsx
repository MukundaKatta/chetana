"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";

export interface SkipLinkTarget {
  /** CSS selector or element ID for the target. */
  id: string;
  /** Visible label for the skip link. */
  label: string;
}

const DEFAULT_TARGETS: SkipLinkTarget[] = [
  { id: "main-content", label: "Skip to main content" },
  { id: "main-nav", label: "Skip to navigation" },
];

export interface SkipLinkProps {
  /** Targets to render. Defaults to "main content" and "navigation". */
  targets?: SkipLinkTarget[];
  /** Extra className. */
  className?: string;
}

/**
 * Accessibility skip links (Issue #290).
 * Rendered at the top of the page, visible only on keyboard focus.
 * Moves focus to the target element for screen reader and keyboard users.
 */
export function SkipLink({
  targets = DEFAULT_TARGETS,
  className,
}: SkipLinkProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      e.preventDefault();
      const target = document.getElementById(id);
      if (target) {
        // Ensure the target is focusable
        if (!target.hasAttribute("tabindex")) {
          target.setAttribute("tabindex", "-1");
        }
        target.focus({ preventScroll: false });
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    []
  );

  return (
    <div className={cn("fixed left-0 top-0 z-[9999]", className)}>
      {targets.map((target) => (
        <a
          key={target.id}
          href={`#${target.id}`}
          onClick={(e) => handleClick(e, target.id)}
          className={cn(
            "absolute -translate-y-full bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform",
            "focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-gray-950",
            "rounded-b-lg"
          )}
        >
          {target.label}
        </a>
      ))}
    </div>
  );
}
