"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "chetana-sidebar-collapsed";

export interface SidebarItem {
  href: string;
  label: string;
  icon: string;
}

const DEFAULT_NAV_ITEMS: SidebarItem[] = [
  { href: "/audit/new", label: "New Audit", icon: "+" },
  { href: "/audit", label: "My Audits", icon: "A" },
  { href: "/compare", label: "Compare", icon: "C" },
  { href: "/experiments", label: "Experiments", icon: "E" },
  { href: "/leaderboard", label: "Leaderboard", icon: "L" },
  { href: "/research", label: "Research Notes", icon: "R" },
  { href: "/settings", label: "Settings", icon: "S" },
];

function readCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export interface SidebarProps {
  /** Navigation items. Defaults to the standard nav. */
  items?: SidebarItem[];
  /** Extra className. */
  className?: string;
}

/**
 * Collapsible sidebar (Issue #245).
 * Collapses to icon-only mode with state persisted in localStorage.
 */
export function Sidebar({ items = DEFAULT_NAV_ITEMS, className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => readCollapsed());
  const pathname = usePathname();

  // Persist collapsed state
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // Ignore
    }
  }, [collapsed]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-white/10 bg-gray-900 transition-all duration-200",
        collapsed ? "w-16" : "w-64",
        className
      )}
      aria-label="Main sidebar"
    >
      {/* Branding */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">
          C
        </div>
        {!collapsed && (
          <span className="text-lg font-semibold tracking-tight text-white">
            Chetana
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(item.href + "/"));

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-100",
                collapsed && "justify-center px-2"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold",
                  isActive
                    ? "bg-violet-500/20 text-violet-300"
                    : "bg-white/5 text-gray-400"
                )}
              >
                {item.icon}
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-white/10 p-3">
        <button
          onClick={toggleCollapsed}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

/**
 * Hook to read the current sidebar collapsed state.
 * Useful for adjusting main content margin.
 */
export function useSidebarCollapsed(): boolean {
  const [collapsed, setCollapsed] = useState(() => readCollapsed());

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setCollapsed(e.newValue === "true");
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return collapsed;
}
