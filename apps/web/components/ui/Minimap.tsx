"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MinimapSection {
  /** Unique ID matching the HTML element id attribute. */
  id: string;
  /** Display label. */
  label: string;
  /** Optional nesting level (0 = top-level, 1 = sub-section). */
  level?: number;
}

export interface MinimapProps {
  /** Sections to display. Each must correspond to an element with a matching id in the DOM. */
  sections: MinimapSection[];
  /** Initially collapsed (default false). */
  defaultCollapsed?: boolean;
  /** Extra className. */
  className?: string;
}

/**
 * Page minimap / table of contents sidebar (Issue #223).
 * Shows a section overview, highlights the current section via IntersectionObserver,
 * and scrolls to a section on click.
 */
export function Minimap({
  sections,
  defaultCollapsed = false,
  className,
}: MinimapProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Track which section is currently in view
  useEffect(() => {
    if (sections.length === 0) return;

    const visibleSections = new Map<string, number>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleSections.set(entry.target.id, entry.intersectionRatio);
          } else {
            visibleSections.delete(entry.target.id);
          }
        }

        // Set the most-visible section as active
        let bestId = "";
        let bestRatio = 0;
        for (const [id, ratio] of visibleSections) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }
        if (bestId) {
          setActiveId(bestId);
        }
      },
      {
        rootMargin: "-10% 0px -60% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (el) observerRef.current.observe(el);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [sections]);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <aside
      className={cn(
        "sticky top-24 transition-all duration-200",
        collapsed ? "w-8" : "w-48",
        className
      )}
      aria-label="Page sections"
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((prev) => !prev)}
        className="mb-2 flex h-7 w-7 items-center justify-center rounded-md text-white/30 transition-colors hover:bg-white/5 hover:text-white/60"
        aria-label={collapsed ? "Expand minimap" : "Collapse minimap"}
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>

      {!collapsed && (
        <nav>
          <ul className="space-y-0.5" role="list">
            {sections.map((section) => {
              const isActive = activeId === section.id;
              const indent = (section.level ?? 0) * 12;

              return (
                <li key={section.id}>
                  <button
                    onClick={() => scrollTo(section.id)}
                    className={cn(
                      "w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                      isActive
                        ? "bg-violet-500/15 font-medium text-violet-300"
                        : "text-white/40 hover:bg-white/5 hover:text-white/60"
                    )}
                    style={{ paddingLeft: `${8 + indent}px` }}
                    aria-current={isActive ? "location" : undefined}
                  >
                    {/* Active indicator bar */}
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-4 w-0.5 shrink-0 rounded-full transition-colors",
                          isActive ? "bg-violet-400" : "bg-white/10"
                        )}
                      />
                      <span className="truncate">{section.label}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </aside>
  );
}
