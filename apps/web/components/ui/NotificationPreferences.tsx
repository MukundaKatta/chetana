/**
 * Notification preferences: per-event toggle, channel selection,
 * quiet hours config, test notification button, notification history
 * (Issue #502).
 */

"use client";

import { useState, useCallback, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationChannel = "in-app" | "email" | "webhook";

export type NotificationEventType =
  | "audit_complete"
  | "audit_failed"
  | "score_threshold"
  | "model_deprecated"
  | "weekly_summary"
  | "new_probe_available"
  | "experiment_complete";

export interface EventPreference {
  eventType: NotificationEventType;
  enabled: boolean;
  channels: NotificationChannel[];
}

export interface QuietHours {
  enabled: boolean;
  startHour: number; // 0-23
  endHour: number; // 0-23
  timezone: string;
}

export interface NotificationHistoryEntry {
  id: string;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  title: string;
  message: string;
  read: boolean;
  sentAt: string;
}

export interface NotificationPreferencesState {
  events: EventPreference[];
  quietHours: QuietHours;
}

export interface NotificationPreferencesProps {
  initialPreferences?: NotificationPreferencesState;
  history?: NotificationHistoryEntry[];
  onSave?: (prefs: NotificationPreferencesState) => void;
  onTestNotification?: (channel: NotificationChannel) => void;
  onMarkRead?: (id: string) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const EVENT_LABELS: Record<NotificationEventType, { label: string; description: string }> = {
  audit_complete: { label: "Audit Complete", description: "When a consciousness audit finishes successfully" },
  audit_failed: { label: "Audit Failed", description: "When an audit encounters an error" },
  score_threshold: { label: "Score Threshold", description: "When a score crosses a configured threshold" },
  model_deprecated: { label: "Model Deprecated", description: "When a model you use is deprecated" },
  weekly_summary: { label: "Weekly Summary", description: "Weekly digest of audit activity" },
  new_probe_available: { label: "New Probe Available", description: "When new consciousness probes are added" },
  experiment_complete: { label: "Experiment Complete", description: "When a custom experiment finishes" },
};

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  "in-app": "In-App",
  email: "Email",
  webhook: "Webhook",
};

const DEFAULT_EVENTS: EventPreference[] = Object.keys(EVENT_LABELS).map((eventType) => ({
  eventType: eventType as NotificationEventType,
  enabled: eventType === "audit_complete" || eventType === "audit_failed",
  channels: ["in-app"] as NotificationChannel[],
}));

const DEFAULT_QUIET_HOURS: QuietHours = {
  enabled: false,
  startHour: 22,
  endHour: 7,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationPreferences({
  initialPreferences,
  history = [],
  onSave,
  onTestNotification,
  onMarkRead,
  className,
}: NotificationPreferencesProps): ReactNode {
  const [events, setEvents] = useState<EventPreference[]>(
    initialPreferences?.events ?? DEFAULT_EVENTS
  );
  const [quietHours, setQuietHours] = useState<QuietHours>(
    initialPreferences?.quietHours ?? DEFAULT_QUIET_HOURS
  );
  const [activeTab, setActiveTab] = useState<"preferences" | "history">("preferences");
  const [dirty, setDirty] = useState(false);

  const toggleEvent = useCallback((eventType: NotificationEventType) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.eventType === eventType ? { ...e, enabled: !e.enabled } : e
      )
    );
    setDirty(true);
  }, []);

  const toggleChannel = useCallback(
    (eventType: NotificationEventType, channel: NotificationChannel) => {
      setEvents((prev) =>
        prev.map((e) => {
          if (e.eventType !== eventType) return e;
          const channels = e.channels.includes(channel)
            ? e.channels.filter((c) => c !== channel)
            : [...e.channels, channel];
          return { ...e, channels };
        })
      );
      setDirty(true);
    },
    []
  );

  const handleSave = useCallback(() => {
    onSave?.({ events, quietHours });
    setDirty(false);
  }, [events, quietHours, onSave]);

  const unreadCount = useMemo(
    () => history.filter((h) => !h.read).length,
    [history]
  );

  return (
    <div className={cn("rounded-lg border border-gray-800 bg-gray-950 p-6", className)}>
      <h2 className="mb-4 text-lg font-semibold text-gray-100">
        Notification Preferences
      </h2>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-md bg-gray-900 p-1">
        <button
          className={cn(
            "flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors",
            activeTab === "preferences"
              ? "bg-gray-800 text-gray-100"
              : "text-gray-400 hover:text-gray-200"
          )}
          onClick={() => setActiveTab("preferences")}
        >
          Preferences
        </button>
        <button
          className={cn(
            "flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors",
            activeTab === "history"
              ? "bg-gray-800 text-gray-100"
              : "text-gray-400 hover:text-gray-200"
          )}
          onClick={() => setActiveTab("history")}
        >
          History
          {unreadCount > 0 && (
            <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === "preferences" && (
        <>
          {/* Per-event toggles */}
          <div className="space-y-4">
            {events.map((event) => {
              const meta = EVENT_LABELS[event.eventType];
              return (
                <div
                  key={event.eventType}
                  className="rounded-md border border-gray-800 bg-gray-900 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-100">
                        {meta.label}
                      </span>
                      <p className="text-xs text-gray-500">{meta.description}</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={event.enabled}
                      onClick={() => toggleEvent(event.eventType)}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        event.enabled ? "bg-blue-600" : "bg-gray-700"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 rounded-full bg-white transition-transform",
                          event.enabled ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>

                  {/* Channel selection */}
                  {event.enabled && (
                    <div className="mt-3 flex gap-2">
                      {(Object.keys(CHANNEL_LABELS) as NotificationChannel[]).map(
                        (channel) => (
                          <button
                            key={channel}
                            onClick={() =>
                              toggleChannel(event.eventType, channel)
                            }
                            className={cn(
                              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                              event.channels.includes(channel)
                                ? "bg-blue-600/20 text-blue-400 ring-1 ring-blue-600"
                                : "bg-gray-800 text-gray-500 hover:text-gray-300"
                            )}
                          >
                            {CHANNEL_LABELS[channel]}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quiet hours */}
          <div className="mt-6 rounded-md border border-gray-800 bg-gray-900 p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-100">
                  Quiet Hours
                </span>
                <p className="text-xs text-gray-500">
                  Suppress notifications during specific hours
                </p>
              </div>
              <button
                role="switch"
                aria-checked={quietHours.enabled}
                onClick={() => {
                  setQuietHours((q) => ({ ...q, enabled: !q.enabled }));
                  setDirty(true);
                }}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  quietHours.enabled ? "bg-blue-600" : "bg-gray-700"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 rounded-full bg-white transition-transform",
                    quietHours.enabled ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {quietHours.enabled && (
              <div className="mt-3 flex items-center gap-3">
                <label className="text-xs text-gray-400">
                  From
                  <select
                    className="ml-1 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-200"
                    value={quietHours.startHour}
                    onChange={(e) => {
                      setQuietHours((q) => ({
                        ...q,
                        startHour: Number(e.target.value),
                      }));
                      setDirty(true);
                    }}
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-gray-400">
                  To
                  <select
                    className="ml-1 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-200"
                    value={quietHours.endHour}
                    onChange={(e) => {
                      setQuietHours((q) => ({
                        ...q,
                        endHour: Number(e.target.value),
                      }));
                      setDirty(true);
                    }}
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                </label>
                <span className="text-xs text-gray-500">
                  ({quietHours.timezone})
                </span>
              </div>
            )}
          </div>

          {/* Test notification */}
          <div className="mt-6 flex items-center gap-3">
            <span className="text-sm text-gray-400">Send test:</span>
            {(Object.keys(CHANNEL_LABELS) as NotificationChannel[]).map(
              (channel) => (
                <button
                  key={channel}
                  onClick={() => onTestNotification?.(channel)}
                  className="rounded border border-gray-700 px-3 py-1 text-xs text-gray-300 transition-colors hover:bg-gray-800"
                >
                  {CHANNEL_LABELS[channel]}
                </button>
              )
            )}
          </div>

          {/* Save */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={!dirty}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                dirty
                  ? "bg-blue-600 text-white hover:bg-blue-500"
                  : "cursor-not-allowed bg-gray-800 text-gray-500"
              )}
            >
              Save Preferences
            </button>
          </div>
        </>
      )}

      {activeTab === "history" && (
        <div className="space-y-2">
          {history.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">
              No notifications yet
            </p>
          )}
          {history.map((entry) => (
            <div
              key={entry.id}
              className={cn(
                "flex items-start gap-3 rounded-md border p-3 transition-colors",
                entry.read
                  ? "border-gray-800 bg-gray-900/50"
                  : "border-blue-800/50 bg-blue-950/20"
              )}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-100">
                    {entry.title}
                  </span>
                  <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400">
                    {CHANNEL_LABELS[entry.channel]}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-400">{entry.message}</p>
                <time className="mt-1 block text-[10px] text-gray-600">
                  {new Date(entry.sentAt).toLocaleString()}
                </time>
              </div>
              {!entry.read && (
                <button
                  onClick={() => onMarkRead?.(entry.id)}
                  className="shrink-0 text-xs text-blue-400 hover:text-blue-300"
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
