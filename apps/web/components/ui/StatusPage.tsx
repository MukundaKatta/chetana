"use client";

/**
 * Issue #489 - System status page
 *
 * Service cards (API, DB, Providers), uptime %,
 * incident timeline, subscribe updates, maintenance notices.
 */

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Bell,
  BellOff,
  Wrench,
  Activity,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type ServiceStatus = "operational" | "degraded" | "outage" | "maintenance";

export interface ServiceInfo {
  id: string;
  name: string;
  category: "api" | "database" | "provider" | "infrastructure";
  status: ServiceStatus;
  uptimePercent: number;
  latencyMs: number | null;
  lastCheckedAt: string;
  description?: string;
  url?: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: "critical" | "major" | "minor" | "resolved";
  status: "investigating" | "identified" | "monitoring" | "resolved";
  affectedServices: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  updates: IncidentUpdate[];
}

export interface IncidentUpdate {
  id: string;
  message: string;
  status: Incident["status"];
  timestamp: string;
}

export interface MaintenanceNotice {
  id: string;
  title: string;
  description: string;
  scheduledStart: string;
  scheduledEnd: string;
  affectedServices: string[];
  status: "scheduled" | "in_progress" | "completed";
}

export interface StatusPageProps {
  services: ServiceInfo[];
  incidents: Incident[];
  maintenanceNotices: MaintenanceNotice[];
  /** Overall system status. */
  overallStatus: ServiceStatus;
  /** Overall uptime percentage. */
  overallUptime: number;
  /** Whether the user is subscribed to updates. */
  isSubscribed?: boolean;
  /** Called when subscribe/unsubscribe is clicked. */
  onSubscribeToggle?: (subscribed: boolean) => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG: Record<
  ServiceStatus,
  { label: string; color: string; bgColor: string; icon: typeof CheckCircle2 }
> = {
  operational: {
    label: "Operational",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    icon: CheckCircle2,
  },
  degraded: {
    label: "Degraded",
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    icon: AlertTriangle,
  },
  outage: {
    label: "Outage",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    icon: XCircle,
  },
  maintenance: {
    label: "Maintenance",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    icon: Wrench,
  },
};

const SEVERITY_CONFIG: Record<
  Incident["severity"],
  { label: string; color: string; dotColor: string }
> = {
  critical: {
    label: "Critical",
    color: "text-red-600 dark:text-red-400",
    dotColor: "bg-red-500",
  },
  major: {
    label: "Major",
    color: "text-orange-600 dark:text-orange-400",
    dotColor: "bg-orange-500",
  },
  minor: {
    label: "Minor",
    color: "text-yellow-600 dark:text-yellow-400",
    dotColor: "bg-yellow-500",
  },
  resolved: {
    label: "Resolved",
    color: "text-green-600 dark:text-green-400",
    dotColor: "bg-green-500",
  },
};

const CATEGORY_LABELS: Record<ServiceInfo["category"], string> = {
  api: "API Services",
  database: "Database",
  provider: "Model Providers",
  infrastructure: "Infrastructure",
};

/* ------------------------------------------------------------------ */
/*  Service card                                                      */
/* ------------------------------------------------------------------ */

function ServiceCard({ service }: { service: ServiceInfo }) {
  const config = STATUS_CONFIG[service.status];
  const StatusIcon = config.icon;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 transition-shadow hover:shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon className={cn("h-4 w-4", config.color)} />
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
            {service.name}
          </span>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium",
            config.bgColor,
            config.color
          )}
        >
          {config.label}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
        <div className="flex items-center gap-1">
          <Activity className="h-3 w-3" />
          {service.uptimePercent.toFixed(2)}% uptime
        </div>
        {service.latencyMs !== null && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {service.latencyMs}ms
          </div>
        )}
      </div>

      {service.description && (
        <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
          {service.description}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Uptime bar                                                        */
/* ------------------------------------------------------------------ */

function UptimeBar({ percent }: { percent: number }) {
  const color =
    percent >= 99.9
      ? "bg-green-500"
      : percent >= 99
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
      <div
        className={cn("h-full rounded-full transition-all", color)}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Incident card                                                     */
/* ------------------------------------------------------------------ */

function IncidentCard({ incident }: { incident: Incident }) {
  const [expanded, setExpanded] = useState(false);
  const config = SEVERITY_CONFIG[incident.severity];

  return (
    <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span
            className={cn("h-2.5 w-2.5 rounded-full", config.dotColor)}
          />
          <div>
            <div className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
              {incident.title}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span className={config.color}>{config.label}</span>
              <span>
                {new Date(incident.createdAt).toLocaleDateString()}
              </span>
              <span className="capitalize">{incident.status}</span>
            </div>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-neutral-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-neutral-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-neutral-100 px-4 pb-4 pt-3 dark:border-neutral-800">
          {/* Affected services */}
          <div className="mb-3 flex flex-wrap gap-1">
            {incident.affectedServices.map((s) => (
              <span
                key={s}
                className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
              >
                {s}
              </span>
            ))}
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            {incident.updates.map((update) => (
              <div key={update.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="h-2 w-2 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                  <span className="w-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
                </div>
                <div className="pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] capitalize text-neutral-400">
                      {update.status}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {new Date(update.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-700 dark:text-neutral-300">
                    {update.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Maintenance notice                                                */
/* ------------------------------------------------------------------ */

function MaintenanceCard({ notice }: { notice: MaintenanceNotice }) {
  const statusLabel =
    notice.status === "scheduled"
      ? "Scheduled"
      : notice.status === "in_progress"
        ? "In Progress"
        : "Completed";

  const statusColor =
    notice.status === "in_progress"
      ? "text-blue-600 dark:text-blue-400"
      : notice.status === "completed"
        ? "text-green-600 dark:text-green-400"
        : "text-neutral-600 dark:text-neutral-400";

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
      <div className="flex items-start gap-2">
        <Wrench className="mt-0.5 h-4 w-4 text-blue-500" />
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
              {notice.title}
            </span>
            <span className={cn("text-xs font-medium", statusColor)}>
              {statusLabel}
            </span>
          </div>
          <p className="mb-2 text-xs text-neutral-600 dark:text-neutral-400">
            {notice.description}
          </p>
          <div className="flex items-center gap-3 text-[10px] text-neutral-500 dark:text-neutral-400">
            <span>
              Start:{" "}
              {new Date(notice.scheduledStart).toLocaleString()}
            </span>
            <span>
              End: {new Date(notice.scheduledEnd).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export function StatusPage({
  services,
  incidents,
  maintenanceNotices,
  overallStatus,
  overallUptime,
  isSubscribed = false,
  onSubscribeToggle,
  className,
}: StatusPageProps) {
  const [subscribed, setSubscribed] = useState(isSubscribed);

  const groupedServices = useMemo(() => {
    const groups = new Map<ServiceInfo["category"], ServiceInfo[]>();
    for (const s of services) {
      const list = groups.get(s.category) ?? [];
      list.push(s);
      groups.set(s.category, list);
    }
    return groups;
  }, [services]);

  const activeIncidents = useMemo(
    () => incidents.filter((i) => i.status !== "resolved"),
    [incidents]
  );

  const resolvedIncidents = useMemo(
    () => incidents.filter((i) => i.status === "resolved").slice(0, 5),
    [incidents]
  );

  const activeMaintenances = useMemo(
    () =>
      maintenanceNotices.filter((m) => m.status !== "completed"),
    [maintenanceNotices]
  );

  const handleSubscribe = useCallback(() => {
    const newState = !subscribed;
    setSubscribed(newState);
    onSubscribeToggle?.(newState);
  }, [subscribed, onSubscribeToggle]);

  const overallConfig = STATUS_CONFIG[overallStatus];
  const OverallIcon = overallConfig.icon;

  return (
    <div className={cn("mx-auto w-full max-w-4xl", className)}>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            System Status
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <OverallIcon className={cn("h-5 w-5", overallConfig.color)} />
            <span
              className={cn(
                "text-sm font-medium",
                overallConfig.color
              )}
            >
              {overallConfig.label}
            </span>
          </div>
        </div>
        <button
          onClick={handleSubscribe}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
            subscribed
              ? "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200"
              : "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
          )}
        >
          {subscribed ? (
            <>
              <BellOff className="h-4 w-4" />
              Unsubscribe
            </>
          ) : (
            <>
              <Bell className="h-4 w-4" />
              Subscribe to Updates
            </>
          )}
        </button>
      </div>

      {/* Overall uptime */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-neutral-600 dark:text-neutral-400">
            Overall Uptime (30 days)
          </span>
          <span className="font-medium text-neutral-800 dark:text-neutral-100">
            {overallUptime.toFixed(3)}%
          </span>
        </div>
        <UptimeBar percent={overallUptime} />
      </div>

      {/* Maintenance notices */}
      {activeMaintenances.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-neutral-800 dark:text-neutral-100">
            Scheduled Maintenance
          </h2>
          <div className="space-y-3">
            {activeMaintenances.map((m) => (
              <MaintenanceCard key={m.id} notice={m} />
            ))}
          </div>
        </div>
      )}

      {/* Active incidents */}
      {activeIncidents.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-neutral-800 dark:text-neutral-100">
            Active Incidents
          </h2>
          <div className="space-y-3">
            {activeIncidents.map((i) => (
              <IncidentCard key={i.id} incident={i} />
            ))}
          </div>
        </div>
      )}

      {/* Service groups */}
      {Array.from(groupedServices.entries()).map(
        ([category, categoryServices]) => (
          <div key={category} className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-neutral-800 dark:text-neutral-100">
              {CATEGORY_LABELS[category]}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {categoryServices.map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
          </div>
        )
      )}

      {/* Resolved incidents */}
      {resolvedIncidents.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-neutral-800 dark:text-neutral-100">
            Recent Resolved Incidents
          </h2>
          <div className="space-y-3">
            {resolvedIncidents.map((i) => (
              <IncidentCard key={i.id} incident={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
