"use client";

import { useState, useCallback } from "react";
import { Play, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatScore } from "@/lib/score-rounding";

interface ProbeOption {
  id: string;
  name: string;
  indicatorId: string;
  theory: string;
  prompt: string;
}

interface SandboxResult {
  response: string;
  score: number;
  analysis: string;
  latencyMs: number;
}

export interface ProbeSandboxProps {
  /** Available probes for the dropdown. */
  probes: ProbeOption[];
  /** The model to test against. */
  modelId: string;
  /** Optional className. */
  className?: string;
}

/**
 * Single-probe test sandbox (Issue #210).
 * Lets users pick a probe, run it against a model, and see the live response and score.
 */
export function ProbeSandbox({ probes, modelId, className }: ProbeSandboxProps) {
  const [selectedProbeId, setSelectedProbeId] = useState<string>(
    probes[0]?.id ?? ""
  );
  const [result, setResult] = useState<SandboxResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProbe = probes.find((p) => p.id === selectedProbeId);

  const handleRun = useCallback(async () => {
    if (!selectedProbe || isRunning) return;

    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/audits/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          probeId: selectedProbe.id,
          modelId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Probe failed: ${response.status} ${response.statusText}`);
      }

      const data: SandboxResult = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsRunning(false);
    }
  }, [selectedProbe, modelId, isRunning]);

  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-200">
          Probe Sandbox
        </h3>
        <span className="text-xs text-white/40">{modelId}</span>
      </div>

      {/* Probe selector */}
      <div className="flex gap-3">
        <select
          value={selectedProbeId}
          onChange={(e) => {
            setSelectedProbeId(e.target.value);
            setResult(null);
            setError(null);
          }}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
          aria-label="Select a probe"
        >
          {probes.map((probe) => (
            <option key={probe.id} value={probe.id}>
              [{probe.theory.toUpperCase()}] {probe.name}
            </option>
          ))}
        </select>

        <button
          onClick={handleRun}
          disabled={isRunning || !selectedProbe}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors",
            isRunning
              ? "cursor-not-allowed bg-violet-500/30"
              : "bg-violet-600 hover:bg-violet-500"
          )}
          aria-label="Run probe"
        >
          {isRunning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {isRunning ? "Running..." : "Run"}
        </button>
      </div>

      {/* Probe prompt preview */}
      {selectedProbe && (
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">
            Prompt
          </p>
          <p className="text-xs leading-relaxed text-white/60 whitespace-pre-wrap">
            {selectedProbe.prompt}
          </p>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Result display */}
      {result && (
        <div className="space-y-3">
          {/* Score preview */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">Score:</span>
              <span className="rounded-md bg-white/10 px-2 py-0.5 text-sm font-semibold tabular-nums text-white">
                {formatScore(result.score)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">Latency:</span>
              <span className="text-xs tabular-nums text-white/60">
                {result.latencyMs}ms
              </span>
            </div>
          </div>

          {/* Response */}
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">
              Response
            </p>
            <p className="max-h-60 overflow-y-auto text-sm leading-relaxed text-white/70 whitespace-pre-wrap">
              {result.response}
            </p>
          </div>

          {/* Analysis */}
          {result.analysis && (
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                Analysis
              </p>
              <p className="text-xs leading-relaxed text-white/50 whitespace-pre-wrap">
                {result.analysis}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
