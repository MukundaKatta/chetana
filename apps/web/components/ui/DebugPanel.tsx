"use client";

/**
 * Issue #518 - Debug panel
 *
 * Collapsible panel toggled by keyboard shortcut, JSON state inspector,
 * network request log, performance timing, and feature flag overrides.
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface NetworkLogEntry {
  id: string;
  method: string;
  url: string;
  status: number | null;
  startedAt: number;
  completedAt: number | null;
  durationMs: number | null;
  requestBody?: string;
  responseBody?: string;
  error?: string;
}

export interface PerformanceTiming {
  label: string;
  startMs: number;
  endMs: number | null;
  durationMs: number | null;
}

export interface FeatureFlagOverride {
  name: string;
  originalValue: boolean;
  overrideValue: boolean;
}

export interface DebugState {
  [key: string]: unknown;
}

export interface DebugPanelProps {
  /** App state to inspect. */
  state?: DebugState;
  /** Keyboard shortcut to toggle (default "ctrl+shift+d"). */
  shortcut?: string;
  /** Initial open state (default false). */
  defaultOpen?: boolean;
  /** Position on screen (default "right"). */
  position?: "left" | "right" | "bottom";
  /** Width/height of panel in px (default 400). */
  panelSize?: number;
  /** Feature flags available for override. */
  featureFlags?: Record<string, boolean>;
  /** Called when a feature flag override changes. */
  onFeatureFlagChange?: (name: string, value: boolean) => void;
  /** Additional custom tabs. */
  customTabs?: Array<{ id: string; label: string; content: ReactNode }>;
  /** Max network log entries (default 100). */
  maxNetworkLogs?: number;
  className?: string;
  children?: ReactNode;
}

type Tab = "state" | "network" | "performance" | "flags" | string;

/* ------------------------------------------------------------------ */
/*  Network logger (module-level singleton)                           */
/* ------------------------------------------------------------------ */

let networkLog: NetworkLogEntry[] = [];
let networkListeners: Array<() => void> = [];
let maxLogs = 100;

function addNetworkEntry(entry: NetworkLogEntry): void {
  networkLog = [entry, ...networkLog].slice(0, maxLogs);
  networkListeners.forEach((fn) => fn());
}

/** Public API to log a network request. */
export function logNetworkRequest(
  method: string,
  url: string,
  requestBody?: string
): string {
  const id = `net_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  addNetworkEntry({
    id,
    method,
    url,
    status: null,
    startedAt: performance.now(),
    completedAt: null,
    durationMs: null,
    requestBody,
  });
  return id;
}

/** Public API to complete a network request log. */
export function completeNetworkRequest(
  id: string,
  status: number,
  responseBody?: string,
  error?: string
): void {
  const entry = networkLog.find((e) => e.id === id);
  if (entry) {
    entry.status = status;
    entry.completedAt = performance.now();
    entry.durationMs = entry.completedAt - entry.startedAt;
    entry.responseBody = responseBody;
    entry.error = error;
    networkListeners.forEach((fn) => fn());
  }
}

/* ------------------------------------------------------------------ */
/*  Performance tracker (module-level singleton)                      */
/* ------------------------------------------------------------------ */

let perfTimings: PerformanceTiming[] = [];
let perfListeners: Array<() => void> = [];

/** Start a performance timing. */
export function startTiming(label: string): void {
  perfTimings = [
    { label, startMs: performance.now(), endMs: null, durationMs: null },
    ...perfTimings,
  ].slice(0, 200);
  perfListeners.forEach((fn) => fn());
}

/** End a performance timing by label. */
export function endTiming(label: string): void {
  const entry = perfTimings.find(
    (t) => t.label === label && t.endMs === null
  );
  if (entry) {
    entry.endMs = performance.now();
    entry.durationMs = entry.endMs - entry.startMs;
    perfListeners.forEach((fn) => fn());
  }
}

/* ------------------------------------------------------------------ */
/*  JSON Inspector                                                    */
/* ------------------------------------------------------------------ */

function JsonInspector({ data, depth = 0 }: { data: unknown; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (data === null) return <span className="text-gray-400">null</span>;
  if (data === undefined) return <span className="text-gray-400">undefined</span>;
  if (typeof data === "string")
    return <span className="text-green-400">&quot;{data}&quot;</span>;
  if (typeof data === "number")
    return <span className="text-blue-400">{data}</span>;
  if (typeof data === "boolean")
    return <span className="text-yellow-400">{String(data)}</span>;

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-gray-400">[]</span>;
    return (
      <span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-white"
        >
          {expanded ? "▼" : "▶"} Array({data.length})
        </button>
        {expanded && (
          <div className="ml-4 border-l border-gray-700 pl-2">
            {data.map((item, i) => (
              <div key={i} className="flex gap-1">
                <span className="text-gray-500 shrink-0">{i}:</span>
                <JsonInspector data={item} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </span>
    );
  }

  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-gray-400">{"{}"}</span>;
    return (
      <span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-white"
        >
          {expanded ? "▼" : "▶"} Object({entries.length})
        </button>
        {expanded && (
          <div className="ml-4 border-l border-gray-700 pl-2">
            {entries.map(([key, val]) => (
              <div key={key} className="flex gap-1">
                <span className="text-purple-400 shrink-0">{key}:</span>
                <JsonInspector data={val} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </span>
    );
  }

  return <span>{String(data)}</span>;
}

/* ------------------------------------------------------------------ */
/*  Shortcut parser                                                   */
/* ------------------------------------------------------------------ */

function matchesShortcut(e: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.toLowerCase().split("+");
  const needCtrl = parts.includes("ctrl");
  const needShift = parts.includes("shift");
  const needAlt = parts.includes("alt");
  const needMeta = parts.includes("meta");
  const key = parts.filter(
    (p) => !["ctrl", "shift", "alt", "meta"].includes(p)
  )[0];

  return (
    e.ctrlKey === needCtrl &&
    e.shiftKey === needShift &&
    e.altKey === needAlt &&
    e.metaKey === needMeta &&
    e.key.toLowerCase() === key
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function DebugPanel({
  state = {},
  shortcut = "ctrl+shift+d",
  defaultOpen = false,
  position = "right",
  panelSize = 400,
  featureFlags = {},
  onFeatureFlagChange,
  customTabs = [],
  maxNetworkLogs = 100,
  className,
  children,
}: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<Tab>("state");
  const [flagOverrides, setFlagOverrides] = useState<
    Record<string, boolean>
  >({});
  const [, forceUpdate] = useState(0);
  const [stateFilter, setStateFilter] = useState("");
  const [networkFilter, setNetworkFilter] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  maxLogs = maxNetworkLogs;

  // Subscribe to network and perf updates
  useEffect(() => {
    const handler = () => forceUpdate((c) => c + 1);
    networkListeners.push(handler);
    perfListeners.push(handler);
    return () => {
      networkListeners = networkListeners.filter((fn) => fn !== handler);
      perfListeners = perfListeners.filter((fn) => fn !== handler);
    };
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (matchesShortcut(e, shortcut)) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcut]);

  const handleFlagToggle = useCallback(
    (name: string) => {
      const current = flagOverrides[name] ?? featureFlags[name] ?? false;
      const newVal = !current;
      setFlagOverrides((prev) => ({ ...prev, [name]: newVal }));
      onFeatureFlagChange?.(name, newVal);
    },
    [flagOverrides, featureFlags, onFeatureFlagChange]
  );

  // Filtered state
  const filteredState = useMemo(() => {
    if (!stateFilter) return state;
    const lower = stateFilter.toLowerCase();
    const filtered: DebugState = {};
    for (const [key, val] of Object.entries(state)) {
      if (key.toLowerCase().includes(lower)) {
        filtered[key] = val;
      }
    }
    return filtered;
  }, [state, stateFilter]);

  // Filtered network log
  const filteredNetwork = useMemo(() => {
    if (!networkFilter) return networkLog;
    const lower = networkFilter.toLowerCase();
    return networkLog.filter(
      (e) =>
        e.url.toLowerCase().includes(lower) ||
        e.method.toLowerCase().includes(lower)
    );
  }, [networkFilter, networkLog]);

  const allTabs: Array<{ id: Tab; label: string }> = [
    { id: "state", label: "State" },
    { id: "network", label: `Network (${networkLog.length})` },
    { id: "performance", label: "Perf" },
    { id: "flags", label: "Flags" },
    ...customTabs.map((t) => ({ id: t.id, label: t.label })),
  ];

  if (!isOpen) {
    return (
      <>
        {children}
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-[9999] rounded-full bg-gray-800 p-2 text-xs text-gray-300 shadow-lg hover:bg-gray-700"
          title={`Debug Panel (${shortcut})`}
        >
          🛠
        </button>
      </>
    );
  }

  const positionStyles: Record<string, React.CSSProperties> = {
    right: {
      position: "fixed",
      top: 0,
      right: 0,
      width: panelSize,
      height: "100vh",
    },
    left: {
      position: "fixed",
      top: 0,
      left: 0,
      width: panelSize,
      height: "100vh",
    },
    bottom: {
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      height: panelSize,
    },
  };

  const statusColor = (status: number | null) => {
    if (status === null) return "text-gray-400";
    if (status < 300) return "text-green-400";
    if (status < 400) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <>
      {children}
      <div
        ref={panelRef}
        className={cn(
          "z-[9999] flex flex-col bg-gray-900 text-gray-200 text-xs font-mono shadow-2xl border-gray-700",
          position === "right" && "border-l",
          position === "left" && "border-r",
          position === "bottom" && "border-t",
          className
        )}
        style={positionStyles[position]}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 px-3 py-2">
          <span className="font-bold text-sm">Debug Panel</span>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 overflow-x-auto">
          {allTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "whitespace-nowrap px-3 py-1.5 border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-indigo-500 text-white"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-3">
          {/* State Inspector */}
          {activeTab === "state" && (
            <div>
              <input
                type="text"
                placeholder="Filter keys..."
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="mb-2 w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs"
              />
              <JsonInspector data={filteredState} />
            </div>
          )}

          {/* Network Log */}
          {activeTab === "network" && (
            <div>
              <div className="mb-2 flex gap-2">
                <input
                  type="text"
                  placeholder="Filter requests..."
                  value={networkFilter}
                  onChange={(e) => setNetworkFilter(e.target.value)}
                  className="flex-1 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs"
                />
                <button
                  onClick={() => {
                    networkLog = [];
                    forceUpdate((c) => c + 1);
                  }}
                  className="rounded bg-gray-700 px-2 py-1 hover:bg-gray-600"
                >
                  Clear
                </button>
              </div>
              {filteredNetwork.length === 0 ? (
                <div className="text-gray-500 text-center py-4">
                  No network requests logged
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredNetwork.map((entry) => (
                    <NetworkEntry key={entry.id} entry={entry} statusColor={statusColor} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Performance */}
          {activeTab === "performance" && (
            <div>
              <div className="mb-2 flex justify-end">
                <button
                  onClick={() => {
                    perfTimings = [];
                    forceUpdate((c) => c + 1);
                  }}
                  className="rounded bg-gray-700 px-2 py-1 hover:bg-gray-600"
                >
                  Clear
                </button>
              </div>
              {perfTimings.length === 0 ? (
                <div className="text-gray-500 text-center py-4">
                  No performance timings recorded
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400">
                      <th className="pb-1">Label</th>
                      <th className="pb-1">Duration</th>
                      <th className="pb-1">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perfTimings.map((t, i) => (
                      <tr key={i} className="border-t border-gray-800">
                        <td className="py-0.5">{t.label}</td>
                        <td
                          className={cn(
                            "py-0.5",
                            t.durationMs !== null && t.durationMs > 1000
                              ? "text-red-400"
                              : t.durationMs !== null && t.durationMs > 200
                                ? "text-yellow-400"
                                : "text-green-400"
                          )}
                        >
                          {t.durationMs !== null
                            ? `${t.durationMs.toFixed(1)}ms`
                            : "..."}
                        </td>
                        <td className="py-0.5">
                          {t.endMs !== null ? "Done" : "Running"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Feature Flags */}
          {activeTab === "flags" && (
            <div>
              <div className="mb-2 text-gray-400">
                Toggle feature flags for testing. Changes are local only.
              </div>
              {Object.keys(featureFlags).length === 0 ? (
                <div className="text-gray-500 text-center py-4">
                  No feature flags configured
                </div>
              ) : (
                <div className="space-y-1">
                  {Object.entries(featureFlags).map(([name, original]) => {
                    const current = flagOverrides[name] ?? original;
                    const isOverridden = name in flagOverrides;
                    return (
                      <div
                        key={name}
                        className="flex items-center justify-between rounded bg-gray-800 px-2 py-1"
                      >
                        <span className={cn(isOverridden && "text-yellow-400")}>
                          {name}
                          {isOverridden && " *"}
                        </span>
                        <button
                          onClick={() => handleFlagToggle(name)}
                          className={cn(
                            "rounded px-2 py-0.5 text-xs",
                            current
                              ? "bg-green-700 text-green-200"
                              : "bg-red-700 text-red-200"
                          )}
                        >
                          {current ? "ON" : "OFF"}
                        </button>
                      </div>
                    );
                  })}
                  {Object.keys(flagOverrides).length > 0 && (
                    <button
                      onClick={() => setFlagOverrides({})}
                      className="mt-2 rounded bg-gray-700 px-2 py-1 hover:bg-gray-600"
                    >
                      Reset all overrides
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Custom tabs */}
          {customTabs.map(
            (tab) =>
              activeTab === tab.id && (
                <div key={tab.id}>{tab.content}</div>
              )
          )}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Network entry sub-component                                       */
/* ------------------------------------------------------------------ */

function NetworkEntry({
  entry,
  statusColor,
}: {
  entry: NetworkLogEntry;
  statusColor: (status: number | null) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded bg-gray-800 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-2 py-1 text-left hover:bg-gray-750"
      >
        <span className="font-bold text-blue-400 w-12 shrink-0">
          {entry.method}
        </span>
        <span className={statusColor(entry.status)}>
          {entry.status ?? "..."}
        </span>
        <span className="truncate flex-1 text-gray-300">{entry.url}</span>
        <span className="text-gray-500 shrink-0">
          {entry.durationMs !== null ? `${entry.durationMs.toFixed(0)}ms` : "..."}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-gray-700 p-2 space-y-1">
          {entry.requestBody && (
            <div>
              <div className="text-gray-400">Request:</div>
              <pre className="overflow-auto max-h-32 text-gray-300">
                {entry.requestBody}
              </pre>
            </div>
          )}
          {entry.responseBody && (
            <div>
              <div className="text-gray-400">Response:</div>
              <pre className="overflow-auto max-h-32 text-gray-300">
                {entry.responseBody}
              </pre>
            </div>
          )}
          {entry.error && (
            <div className="text-red-400">Error: {entry.error}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default DebugPanel;
