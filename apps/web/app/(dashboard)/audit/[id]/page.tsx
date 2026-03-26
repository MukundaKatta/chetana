"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { THEORIES, INDICATORS, THEORY_WEIGHTS } from "@chetana/shared";
import type { Theory } from "@chetana/shared";

interface AuditData {
  id: string;
  model_name: string;
  model_provider: string;
  status: string;
  overall_score: number | null;
  theory_scores: Record<string, number> | null;
  indicator_scores: Record<string, number> | null;
  tokens_used: number | null;
  cost_cents: number | null;
  started_at: string;
  completed_at: string | null;
  error_message?: string;
}

interface ProbeResultData {
  id: string;
  probe_name: string;
  indicator_id: string;
  theory: string;
  prompt: string;
  response: string;
  score: number;
  evidence_type: string;
  analysis: string;
  created_at: string;
}

function ScoreGauge({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - score * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r="70" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-800" />
        <circle
          cx="90" cy="90" r="70" fill="none"
          stroke="url(#gaugeGradient)" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform="rotate(-90 90 90)"
          className="transition-all duration-1000"
        />
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#d946ef" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <span className="text-4xl font-bold text-white">{percentage}</span>
        <span className="text-lg text-gray-400">%</span>
        <p className="text-xs text-gray-500 mt-1">Consciousness Score</p>
      </div>
    </div>
  );
}

function TheoryScoreBar({ theory, score }: { theory: string; score: number }) {
  const info = THEORIES[theory as keyof typeof THEORIES];
  if (!info) return null;
  const pct = Math.round(score * 100);
  const weight = THEORY_WEIGHTS[theory as Theory];

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{info.name}</span>
          <span className="text-xs text-gray-500">{info.fullName}</span>
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-500">
            {Math.round(weight * 100)}% weight
          </span>
        </div>
        <span className="text-sm font-semibold text-gray-300">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-gray-800">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ProbeCard({ probe }: { probe: ProbeResultData }) {
  const [expanded, setExpanded] = useState(false);
  const pct = Math.round(probe.score * 100);

  return (
    <div className="rounded-lg border border-white/10 bg-gray-900 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-400">
            {probe.indicator_id}
          </span>
          <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
            {probe.evidence_type}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${pct >= 70 ? "text-green-400" : pct >= 40 ? "text-yellow-400" : "text-red-400"}`}>
            {pct}%
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>
      <p className="mt-2 text-sm text-gray-300">{probe.analysis || "Pending analysis..."}</p>
      {expanded && (
        <div className="mt-3 space-y-3 border-t border-white/5 pt-3">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Probe Prompt</p>
            <p className="mt-1 text-xs text-gray-400 whitespace-pre-wrap max-h-32 overflow-y-auto">
              {probe.prompt.slice(0, 500)}{probe.prompt.length > 500 ? "..." : ""}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Model Response</p>
            <p className="mt-1 text-xs text-gray-400 whitespace-pre-wrap max-h-48 overflow-y-auto">
              {probe.response.slice(0, 1000)}{probe.response.length > 1000 ? "..." : ""}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuditResultPage() {
  const params = useParams();
  const id = params.id as string;
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [probes, setProbes] = useState<ProbeResultData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTheoryFilter, setActiveTheoryFilter] = useState<string | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    async function fetchAudit() {
      try {
        const res = await fetch(`/api/audit/${id}`);
        if (!res.ok) {
          setError("Failed to load audit");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setAudit(data.audit);
        setProbes(data.probeResults || []);
        setLoading(false);

        // Stop polling when audit is done
        if (data.audit.status === "completed" || data.audit.status === "failed") {
          if (interval) clearInterval(interval);
        }
      } catch {
        setError("Network error");
        setLoading(false);
      }
    }

    fetchAudit();
    // Poll every 5s while audit is running
    interval = setInterval(fetchAudit, 5000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-400">Loading audit...</p>
        </div>
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <p className="text-red-400">{error || "Audit not found"}</p>
        </div>
      </div>
    );
  }

  // Running state: show progress
  if (audit.status === "running") {
    const totalExpected = 70; // approximate probe count
    const completed = probes.length;
    const progressPct = Math.min(Math.round((completed / totalExpected) * 100), 99);

    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Audit in Progress
        </h1>
        <p className="mt-2 text-gray-400">
          Testing {audit.model_name} across consciousness indicators...
        </p>

        <div className="mt-8 rounded-xl border border-white/10 bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-white">Running probes</span>
            <span className="text-sm text-gray-400">{completed} / ~{totalExpected}</span>
          </div>
          <div className="h-3 rounded-full bg-gray-800">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Each probe tests a specific consciousness indicator. Results are scored by an independent AI judge.
          </p>
        </div>

        {/* Live probe results */}
        {probes.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Completed Probes ({probes.length})
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {probes.slice().reverse().map((probe) => (
                <ProbeCard key={probe.id} probe={probe} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
          <div className="h-2 w-2 animate-pulse rounded-full bg-violet-500" />
          Auto-refreshing every 5 seconds
        </div>
      </div>
    );
  }

  // Failed state
  if (audit.status === "failed") {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-white">Audit Failed</h1>
        <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 p-6">
          <p className="text-sm text-red-400">{audit.error_message || "An unexpected error occurred."}</p>
        </div>
      </div>
    );
  }

  // Completed state: full results
  const filteredProbes = activeTheoryFilter
    ? probes.filter((p) => p.theory === activeTheoryFilter)
    : probes;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Audit Results</h1>
          <p className="mt-1 text-gray-400">
            {audit.model_name} &middot; Completed{" "}
            {audit.completed_at ? new Date(audit.completed_at).toLocaleDateString() : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/api/audit/${id}/export?format=json`}
            className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-gray-300 hover:bg-white/5"
          >
            Export JSON
          </a>
          <a
            href={`/api/audit/${id}/export?format=csv`}
            className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-gray-300 hover:bg-white/5"
          >
            Export CSV
          </a>
          <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400 ring-1 ring-green-500/20">
            Completed
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        {[
          { label: "Probes Run", value: probes.length },
          { label: "Theories Tested", value: 6 },
          { label: "Indicators", value: 14 },
          { label: "Tokens Used", value: audit.tokens_used ? `${Math.round(audit.tokens_used / 1000)}k` : "N/A" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-white/10 bg-gray-900 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Top section: Gauge + Theory Breakdown */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-6">
            Overall Consciousness Probability
          </h2>
          <div className="flex justify-center">
            <ScoreGauge score={audit.overall_score ?? 0} />
          </div>
          <p className="mt-4 text-center text-sm text-gray-400">
            Bayesian-weighted composite across 6 theories
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Theory Breakdown</h2>
          <div className="space-y-4">
            {audit.theory_scores &&
              Object.entries(audit.theory_scores).map(([theory, score]) => (
                <TheoryScoreBar key={theory} theory={theory} score={score as number} />
              ))}
          </div>
        </div>
      </div>

      {/* Indicator Scores Grid */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-white mb-4">Indicator Scores</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INDICATORS.map((indicator) => {
            const score = audit.indicator_scores?.[indicator.id] ?? 0;
            const pct = Math.round(score * 100);
            const theoryInfo = THEORIES[indicator.theory];
            return (
              <div key={indicator.id} className="rounded-lg border border-white/10 bg-gray-900 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">{indicator.id}</span>
                  <span className="text-xs text-gray-500">{theoryInfo?.name}</span>
                </div>
                <p className="mt-1 text-sm font-medium text-white">{indicator.name}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-gray-800">
                    <div
                      className="h-1.5 rounded-full bg-violet-500 transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-300">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Evidence / Probe Results */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Probe Evidence ({filteredProbes.length})
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTheoryFilter(null)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                !activeTheoryFilter ? "bg-violet-500/20 text-violet-400" : "bg-white/5 text-gray-400 hover:text-gray-300"
              }`}
            >
              All
            </button>
            {(["gwt", "iit", "hot", "rpt", "pp", "ast"] as Theory[]).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTheoryFilter(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTheoryFilter === t ? "bg-violet-500/20 text-violet-400" : "bg-white/5 text-gray-400 hover:text-gray-300"
                }`}
              >
                {THEORIES[t].name}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {filteredProbes.map((probe) => (
            <ProbeCard key={probe.id} probe={probe} />
          ))}
        </div>
      </div>
    </div>
  );
}
