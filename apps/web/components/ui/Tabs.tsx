"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  createContext,
  useContext,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
  registerTab: (id: string) => void;
  tabs: string[];
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error("Tabs components must be used within a Tabs provider");
  }
  return ctx;
}

export interface TabsProps {
  children: ReactNode;
  defaultTab?: string;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

export function Tabs({
  children,
  defaultTab,
  activeTab: controlledTab,
  onTabChange,
  className,
}: TabsProps) {
  const [internalTab, setInternalTab] = useState<string>(defaultTab ?? "");
  const [tabs, setTabs] = useState<string[]>([]);

  const isControlled = controlledTab !== undefined;
  const activeTab = isControlled ? controlledTab : internalTab;

  const setActiveTab = useCallback(
    (id: string) => {
      if (!isControlled) {
        setInternalTab(id);
      }
      onTabChange?.(id);
    },
    [isControlled, onTabChange]
  );

  const registerTab = useCallback((id: string) => {
    setTabs((prev) => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  }, []);

  useEffect(() => {
    if (!isControlled && !internalTab && tabs.length > 0) {
      setInternalTab(tabs[0]);
    }
  }, [isControlled, internalTab, tabs]);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, registerTab, tabs }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export interface TabListProps {
  children: ReactNode;
  className?: string;
}

export function TabList({ children, className }: TabListProps) {
  const { tabs, activeTab, setActiveTab } = useTabsContext();
  const listRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex === -1) return;

      let nextIndex = -1;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextIndex = (currentIndex + 1) % tabs.length;
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      } else if (e.key === "Home") {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        nextIndex = tabs.length - 1;
      }

      if (nextIndex !== -1) {
        setActiveTab(tabs[nextIndex]);
        const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>(
          '[role="tab"]'
        );
        buttons?.[nextIndex]?.focus();
      }
    },
    [tabs, activeTab, setActiveTab]
  );

  return (
    <div
      ref={listRef}
      role="tablist"
      onKeyDown={handleKeyDown}
      className={cn(
        "flex border-b border-white/10",
        className
      )}
    >
      {children}
    </div>
  );
}

export interface TabProps {
  id: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function Tab({ id, children, className, disabled = false }: TabProps) {
  const { activeTab, setActiveTab, registerTab } = useTabsContext();
  const isActive = activeTab === id;

  useEffect(() => {
    registerTab(id);
  }, [id, registerTab]);

  return (
    <button
      role="tab"
      id={`tab-${id}`}
      aria-selected={isActive}
      aria-controls={`tabpanel-${id}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={() => {
        if (!disabled) setActiveTab(id);
      }}
      className={cn(
        "relative px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
        isActive
          ? "text-white"
          : "text-white/50 hover:text-white/80",
        disabled && "cursor-not-allowed opacity-40",
        className
      )}
    >
      {children}
      {isActive && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 transition-all" />
      )}
    </button>
  );
}

export interface TabPanelProps {
  id: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ id, children, className }: TabPanelProps) {
  const { activeTab } = useTabsContext();
  const isActive = activeTab === id;

  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      tabIndex={0}
      className={cn("mt-4 focus-visible:outline-none", className)}
    >
      {children}
    </div>
  );
}
