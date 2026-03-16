"use client";

import { useState, useCallback } from "react";
import { cn, formatScore, getScoreColor } from "@/lib/utils";

interface Probe {
  probeName: string;
  prompt: string;
  response: string;
  score: number;
  analysis: string;
}

interface EvidencePanelProps {
  probes: Probe[];
}

function ProbeItem({ probe }: { probe: Probe }) {
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => setExpanded((prev) => !prev), []);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border transition-colors",
        expanded
          ? "border-white/15 bg-white/[0.04]"
          : "border-white/8 bg-white/[0.02] hover:border-white/12"
      )}
    >
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <svg
            className={cn(
              "h-4 w-4 flex-shrink-0 text-neutral-500 transition-transform duration-200",
              expanded && "rotate-90"
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span className="truncate text-sm font-medium text-neutral-200">
            {probe.probeName}
          </span>
        </div>
        <span
          className={cn(
            "flex-shrink-0 text-sm font-semibold tabular-nums",
            getScoreColor(probe.score)
          )}
        >
          {formatScore(probe.score)}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-white/8 px-4 py-4 space-y-4">
          <div>
            <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Prompt
            </h4>
            <p className="rounded-md bg-white/[0.03] px-3 py-2 text-sm leading-relaxed text-neutral-300 font-mono">
              {probe.prompt}
            </p>
          </div>
          <div>
            <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Model Response
            </h4>
            <p className="rounded-md bg-white/[0.03] px-3 py-2 text-sm leading-relaxed text-neutral-300 whitespace-pre-wrap">
              {probe.response}
            </p>
          </div>
          <div>
            <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Analysis
            </h4>
            <p className="text-sm leading-relaxed text-neutral-400">
              {probe.analysis}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function EvidencePanel({ probes }: EvidencePanelProps) {
  if (probes.length === 0) {
    return (
      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-8 text-center">
        <p className="text-sm text-neutral-500">No probe evidence available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-300">
          Probe Evidence
        </h3>
        <span className="text-xs text-neutral-500">
          {probes.length} probe{probes.length !== 1 ? "s" : ""}
        </span>
      </div>
      {probes.map((probe, idx) => (
        <ProbeItem key={`${probe.probeName}-${idx}`} probe={probe} />
      ))}
    </div>
  );
}
