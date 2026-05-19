"use client";

/**
 * Issue #495 - Mobile-optimized dashboard
 *
 * Bottom nav bar, collapsible sidebar for tablet,
 * touch-optimized controls, swipe gestures,
 * adaptive chart sizing.
 */

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { cn } from "@/lib/utils";
import {
  Home,
  BarChart3,
  FileText,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type NavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
};

export type DeviceType = "mobile" | "tablet" | "desktop";

export interface MobileDashboardProps {
  /** Navigation items for bottom bar / sidebar. */
  navItems?: NavItem[];
  /** Currently active nav item ID. */
  activeNav?: string;
  /** Called when nav item changes. */
  onNavChange?: (id: string) => void;
  /** Main content to render. */
  children: React.ReactNode;
  /** Sidebar content (shown on tablet as collapsible). */
  sidebarContent?: React.ReactNode;
  /** Header content. */
  headerContent?: React.ReactNode;
  /** Title displayed in header. */
  title?: string;
  /** Enable swipe navigation between pages. */
  swipeEnabled?: boolean;
  /** Ordered list of page IDs for swipe navigation. */
  pageOrder?: string[];
  className?: string;
}

export interface ChartSizeConfig {
  width: number;
  height: number;
  compact: boolean;
}

/* ------------------------------------------------------------------ */
/*  Default nav items                                                 */
/* ------------------------------------------------------------------ */

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", icon: <Home className="h-5 w-5" /> },
  {
    id: "audits",
    label: "Audits",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    id: "reports",
    label: "Reports",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    id: "settings",
    label: "Settings",
    icon: <Settings className="h-5 w-5" />,
  },
];

/* ------------------------------------------------------------------ */
/*  Hooks                                                             */
/* ------------------------------------------------------------------ */

function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>("desktop");

  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      if (w < 640) setDeviceType("mobile");
      else if (w < 1024) setDeviceType("tablet");
      else setDeviceType("desktop");
    }

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return deviceType;
}

function useSwipe(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  enabled: boolean
) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchEnd = useRef<{ x: number; y: number } | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      touchEnd.current = null;
      touchStart.current = {
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
      };
    },
    [enabled]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      touchEnd.current = {
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
      };
    },
    [enabled]
  );

  const onTouchEnd = useCallback(() => {
    if (!enabled || !touchStart.current || !touchEnd.current) return;

    const distX = touchStart.current.x - touchEnd.current.x;
    const distY = touchStart.current.y - touchEnd.current.y;

    // Only trigger horizontal swipes (not vertical scrolling)
    if (Math.abs(distX) < Math.abs(distY)) return;

    if (Math.abs(distX) >= minSwipeDistance) {
      if (distX > 0) onSwipeLeft();
      else onSwipeRight();
    }
  }, [enabled, onSwipeLeft, onSwipeRight]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}

/* ------------------------------------------------------------------ */
/*  Adaptive chart sizing                                             */
/* ------------------------------------------------------------------ */

export function useAdaptiveChartSize(): ChartSizeConfig {
  const [size, setSize] = useState<ChartSizeConfig>({
    width: 600,
    height: 400,
    compact: false,
  });

  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      if (w < 640) {
        setSize({
          width: Math.min(w - 32, 360),
          height: 240,
          compact: true,
        });
      } else if (w < 1024) {
        setSize({
          width: Math.min(w - 64, 500),
          height: 320,
          compact: false,
        });
      } else {
        setSize({ width: 600, height: 400, compact: false });
      }
    }

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return size;
}

/* ------------------------------------------------------------------ */
/*  Bottom nav bar                                                    */
/* ------------------------------------------------------------------ */

function BottomNavBar({
  items,
  active,
  onSelect,
}: {
  items: NavItem[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white/95 backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-900/95 sm:hidden">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                "relative flex min-w-0 flex-1 flex-col items-center gap-0.5 px-2 py-2.5 text-[10px] font-medium transition-colors",
                "active:scale-95",
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-neutral-500 dark:text-neutral-400"
              )}
            >
              <span className="relative">
                {item.icon}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -right-1.5 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </span>
              <span className="truncate">{item.label}</span>
              {isActive && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
          );
        })}
      </div>
      {/* Safe area spacer for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Collapsible sidebar (tablet)                                      */
/* ------------------------------------------------------------------ */

function CollapsibleSidebar({
  items,
  active,
  onSelect,
  children,
  collapsed,
  onToggle,
}: {
  items: NavItem[];
  active: string;
  onSelect: (id: string) => void;
  children?: React.ReactNode;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      className={cn(
        "hidden border-r border-neutral-200 bg-white transition-all duration-200 dark:border-neutral-700 dark:bg-neutral-900 sm:flex sm:flex-col lg:hidden",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className="flex h-14 items-center justify-end border-b border-neutral-200 px-3 dark:border-neutral-700">
        <button
          onClick={onToggle}
          className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors",
                "active:scale-[0.98]",
                isActive
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                  : "text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
              )}
            >
              <span className="relative flex-shrink-0">
                {item.icon}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {!collapsed && children && (
        <div className="border-t border-neutral-200 p-3 dark:border-neutral-700">
          {children}
        </div>
      )}
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile header                                                     */
/* ------------------------------------------------------------------ */

function MobileHeader({
  title,
  onMenuToggle,
  menuOpen,
  children,
}: {
  title: string;
  onMenuToggle: () => void;
  menuOpen: boolean;
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-neutral-200 bg-white/95 px-4 backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-900/95">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 sm:hidden"
        >
          {menuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
        <h1 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
          {title}
        </h1>
      </div>
      {children}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile menu overlay                                               */
/* ------------------------------------------------------------------ */

function MobileMenuOverlay({
  open,
  items,
  active,
  onSelect,
  onClose,
}: {
  open: boolean;
  items: NavItem[];
  active: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl dark:bg-neutral-900">
        <div className="flex h-14 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-700">
          <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            Menu
          </span>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="py-2">
          {items.map((item) => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelect(item.id);
                  onClose();
                }}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                  "active:scale-[0.98]",
                  isActive
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                    : "text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
                )}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-900/40 dark:text-red-400">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export function MobileDashboard({
  navItems = DEFAULT_NAV_ITEMS,
  activeNav: controlledActive,
  onNavChange,
  children,
  sidebarContent,
  headerContent,
  title = "Chetana",
  swipeEnabled = true,
  pageOrder,
  className,
}: MobileDashboardProps) {
  const deviceType = useDeviceType();
  const [internalActive, setInternalActive] = useState(
    navItems[0]?.id ?? "home"
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const active = controlledActive ?? internalActive;

  const handleNavChange = useCallback(
    (id: string) => {
      setInternalActive(id);
      onNavChange?.(id);
    },
    [onNavChange]
  );

  // Swipe navigation
  const swipePages = useMemo(
    () => pageOrder ?? navItems.map((n) => n.id),
    [pageOrder, navItems]
  );

  const handleSwipeLeft = useCallback(() => {
    const idx = swipePages.indexOf(active);
    if (idx < swipePages.length - 1) {
      handleNavChange(swipePages[idx + 1]);
    }
  }, [active, swipePages, handleNavChange]);

  const handleSwipeRight = useCallback(() => {
    const idx = swipePages.indexOf(active);
    if (idx > 0) {
      handleNavChange(swipePages[idx - 1]);
    }
  }, [active, swipePages, handleNavChange]);

  const swipeHandlers = useSwipe(
    handleSwipeLeft,
    handleSwipeRight,
    swipeEnabled && deviceType === "mobile"
  );

  return (
    <div
      className={cn(
        "flex h-screen w-full flex-col bg-neutral-50 dark:bg-neutral-950",
        className
      )}
    >
      {/* Header */}
      <MobileHeader
        title={title}
        onMenuToggle={() => setMenuOpen((prev) => !prev)}
        menuOpen={menuOpen}
      >
        {headerContent}
      </MobileHeader>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Tablet sidebar */}
        {deviceType === "tablet" && (
          <CollapsibleSidebar
            items={navItems}
            active={active}
            onSelect={handleNavChange}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((prev) => !prev)}
          >
            {sidebarContent}
          </CollapsibleSidebar>
        )}

        {/* Main content */}
        <main
          className={cn(
            "flex-1 overflow-y-auto",
            deviceType === "mobile" ? "pb-20" : "pb-4"
          )}
          {...swipeHandlers}
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-4">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      {deviceType === "mobile" && (
        <BottomNavBar
          items={navItems}
          active={active}
          onSelect={handleNavChange}
        />
      )}

      {/* Mobile menu overlay */}
      <MobileMenuOverlay
        open={menuOpen}
        items={navItems}
        active={active}
        onSelect={handleNavChange}
        onClose={() => setMenuOpen(false)}
      />
    </div>
  );
}
