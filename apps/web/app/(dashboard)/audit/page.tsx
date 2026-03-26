"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { THEORIES } from "@chetana/shared";

interface AuditSummary {
  id: string;
  model_name: string;
  model_provider: string;
  status: string;
  overall_score: number | null;
  theory_scores: Record<string, number> | null;
  started_at: string;
  completed_at: string | null;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-gray-500/10", text: "text-gray-400", label: "Pending" },
  running: { bg: "bg-blue-500/10", text: "text-blue-400", label: "Running" },
  completed: { bg: "bg-green-500/10", text: "text-green-400", label: "Complete" },
  failed: { bg: "bg-red-500/10", text: "text-red-400", label: "Failed" },
};

export default function MyAuditsPage() {
  const [audits, setAudits] = useState<AuditSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAudits() {
      try {
        const res = await fetch("/api/audits");
        if (res.ok) {
          const data = await res.json();
          setAudits(data.audits || []);
        }
      } catch {
        // silently fail
      }
      setLoading(false);
    }
    fetchAudits();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">My Audits</h1>
          <p className="mt-1 text-gray-400">
            Track and review all your consciousness audits.
          </p>
        </div>
        <Link
          href="/audit/new"
          className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
        >
          New Audit
        </Link>
      </div>

      {loading ? (
        <div className="mt-16 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      ) : audits.length === 0 ? (
        <div className="mt-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
            <span className="text-2xl text-gray-500">A</span>
          </div>
          <h3 className="mt-4 text-lg font-medium text-white">No audits yet</h3>
          <p className="mt-2 text-sm text-gray-400">
            Start your first consciousness audit to evaluate an AI model.
          </p>
          <Link
            href="/audit/new"
            className="mt-6 inline-block rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
          >
            Run Your First Audit
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {audits.map((audit) => {
            const status = STATUS_STYLES[audit.status] || STATUS_STYLES.pending;
            const pct = audit.overall_score ? Math.round(audit.overall_score * 100) : null;

            return (
              <Link
                key={audit.id}
                href={`/audit/${audit.id}`}
                className="block rounded-xl border border-white/10 bg-gray-900 p-5 transition-colors hover:border-white/20 hover:bg-gray-900/80"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
                      <span className="text-lg font-bold text-violet-400">
                        {pct !== null ? pct : "?"}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{audit.model_name}</p>
                      <p className="text-xs text-gray-500">
                        {audit.model_provider} &middot;{" "}
                        {new Date(audit.started_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Mini theory scores */}
                    {audit.theory_scores && audit.status === "completed" && (
                      <div className="hidden md:flex items-center gap-3">
                        {Object.entries(audit.theory_scores).map(([t, s]) => {
                          const info = THEORIES[t as keyof typeof THEORIES];
                          return (
                            <div key={t} className="text-center">
                              <p className="text-[10px] text-gray-500">{info?.name || t}</p>
                              <p className="text-xs font-semibold text-gray-300">
                                {Math.round((s as number) * 100)}%
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <span className={`rounded-full ${status.bg} px-3 py-1 text-xs font-medium ${status.text} ring-1 ring-current/20`}>
                      {status.label}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
