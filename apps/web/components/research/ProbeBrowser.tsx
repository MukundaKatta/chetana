"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export interface ProbeSummary {
  id: string;
  name: string;
  theory: string;
  indicatorId: string;
  evidenceType: string;
  promptPreview: string;
}

const THEORIES = ["gwt", "iit", "hot", "rpt", "pp", "ast"] as const;

const THEORY_COLOR: Record<string, string> = {
  gwt: "bg-blue-600/20 text-blue-300",
  iit: "bg-purple-600/20 text-purple-300",
  hot: "bg-orange-600/20 text-orange-300",
  rpt: "bg-emerald-600/20 text-emerald-300",
  pp: "bg-amber-600/20 text-amber-300",
  ast: "bg-pink-600/20 text-pink-300",
};

/**
 * Probe library browser (issue #649) — filter the full probe set by theory and
 * free-text search. Surfaces every probe, including the 2026 trend probes
 * (CoT faithfulness, substrate independence, welfare, agentic, multimodal,
 * eval-awareness, introspective accuracy, ...).
 */
export function ProbeBrowser({ probes }: { probes: ProbeSummary[] }) {
  const [theory, setTheory] = useState<string>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return probes.filter((p) => {
      if (theory !== "all" && p.theory !== theory) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.promptPreview.toLowerCase().includes(q)
      );
    });
  }, [probes, theory, query]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setTheory("all")}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            theory === "all" ? "bg-white/15 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"
          )}
        >
          All ({probes.length})
        </button>
        {THEORIES.map((t) => {
          const count = probes.filter((p) => p.theory === t).length;
          return (
            <button
              key={t}
              onClick={() => setTheory(t)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium uppercase",
                theory === t ? "bg-white/15 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"
              )}
            >
              {t} ({count})
            </button>
          );
        })}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search probes…"
          className="ml-auto w-56 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-200 placeholder:text-gray-500 focus:border-chetana-500/50 focus:outline-none"
        />
      </div>

      <p className="mb-4 text-sm text-gray-500">{filtered.length} probes</p>

      <ul className="space-y-3">
        {filtered.map((p) => (
          <li key={p.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2">
              <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase", THEORY_COLOR[p.theory] ?? "bg-white/10 text-gray-300")}>
                {p.theory}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-gray-500">{p.evidenceType}</span>
              <span className="ml-auto font-mono text-[10px] text-gray-600">{p.indicatorId}</span>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-100">{p.name}</h3>
            <p className="mt-1 line-clamp-2 text-xs text-gray-500">{p.promptPreview}</p>
            <code className="mt-2 block font-mono text-[10px] text-gray-600">{p.id}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}
