"use client";

import { cn } from "@/lib/utils";

interface StatsCardsProps {
  stats: {
    totalAudits: number;
    avgScore: number;
    modelsCount: number;
    lastAuditAt: string;
  };
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
}

function getScoreColorClass(score: number): string {
  if (score < 30) return "text-red-400";
  if (score < 60) return "text-amber-400";
  return "text-emerald-400";
}

function TrendArrow({ positive }: { positive: boolean }) {
  if (positive) {
    return (
      <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    );
  }
  return (
    <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  );
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: "Total Audits",
      value: stats.totalAudits.toString(),
      extra: <TrendArrow positive={stats.totalAudits > 0} />,
    },
    {
      label: "Average Score",
      value: `${stats.avgScore.toFixed(1)}%`,
      extra: (
        <span className={cn("text-sm font-medium", getScoreColorClass(stats.avgScore))}>
          {stats.avgScore >= 60 ? "High" : stats.avgScore >= 30 ? "Mid" : "Low"}
        </span>
      ),
    },
    {
      label: "Models Tested",
      value: stats.modelsCount.toString(),
      extra: null,
    },
    {
      label: "Last Audit",
      value: formatRelativeTime(stats.lastAuditAt),
      extra: null,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-gray-800 bg-gray-900/50 p-6"
        >
          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
            {card.label}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-2xl font-bold text-white">{card.value}</span>
            {card.extra}
          </div>
        </div>
      ))}
    </div>
  );
}
