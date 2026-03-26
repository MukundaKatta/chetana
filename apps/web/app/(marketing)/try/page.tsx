"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { POPULAR_MODELS, THEORIES, INDICATORS, THEORY_WEIGHTS } from "@chetana/shared";
import type { Theory } from "@chetana/shared";

// ─── Types ───

interface ProbeResultItem {
  probeName: string;
  indicatorId: string;
  theory: string;
  score: number;
  analysis: string;
  evidenceType: string;
}

interface AuditResults {
  overallScore: number;
  uncertaintyBounds: { lower: number; upper: number };
  theoryScores: Record<string, number>;
  indicatorScores: Record<string, number>;
  statistics: any;
}

type Stage = "setup" | "running" | "results";

// ─── Constants ───

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  ollama: "Ollama (Local)",
};

const PROVIDER_ICONS: Record<string, { bg: string; text: string; abbr: string }> = {
  anthropic: { bg: "bg-orange-500/20", text: "text-orange-400", abbr: "An" },
  openai: { bg: "bg-green-500/20", text: "text-green-400", abbr: "OA" },
  google: { bg: "bg-blue-500/20", text: "text-blue-400", abbr: "Go" },
  ollama: { bg: "bg-gray-500/20", text: "text-gray-400", abbr: "OL" },
};

const PROBE_LIMITS = [
  { value: 6, label: "Quick", desc: "1 per theory, ~1 min", cost: "~$0.05" },
  { value: 14, label: "Standard", desc: "1 per indicator, ~3 min", cost: "~$0.15" },
  { value: 0, label: "Full", desc: "All 76+ probes, ~10 min", cost: "~$1.50" },
];

// ─── Helpers ───

function pct(n: number) { return `${(n * 100).toFixed(1)}%`; }

function scoreColor(score: number) {
  if (score >= 0.6) return "text-green-400";
  if (score >= 0.35) return "text-yellow-400";
  return "text-red-400";
}

function barWidth(score: number) { return `${Math.round(score * 100)}%`; }

// ─── Components ───

function ScoreGauge({ score, size = 200 }: { score: number; size?: number }) {
  const r = (size - 20) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - score * circumference;
  const percentage = Math.round(score * 100);

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-gray-800" />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke="url(#tryGaugeGrad)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          className="transition-all duration-1000"
        />
        <defs>
          <linearGradient id="tryGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#d946ef" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <span className="text-5xl font-bold text-white">{percentage}</span>
        <span className="text-xl text-gray-400">%</span>
        <p className="text-xs text-gray-500 mt-1">Consciousness</p>
      </div>
    </div>
  );
}

// ─── Main Page ───

export default function TryPage() {
  const [stage, setStage] = useState<Stage>("setup");
  const [selectedModel, setSelectedModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [probeLimit, setProbeLimit] = useState(14);
  const [error, setError] = useState<string | null>(null);

  // Running state
  const [probesCompleted, setProbesCompleted] = useState<ProbeResultItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Results state
  const [results, setResults] = useState<AuditResults | null>(null);
  const [allProbes, setAllProbes] = useState<ProbeResultItem[]>([]);
  const [activeTheory, setActiveTheory] = useState<string | null>(null);

  const selectedModelInfo = POPULAR_MODELS.find((m) => m.modelId === selectedModel);

  const groupedModels = POPULAR_MODELS.reduce(
    (acc, model) => {
      if (!acc[model.provider]) acc[model.provider] = [];
      acc[model.provider].push(model);
      return acc;
    },
    {} as Record<string, typeof POPULAR_MODELS>
  );

  async function startAudit() {
    if (!selectedModel || !selectedModelInfo || !apiKey) {
      setError("Please select a model and enter your API key.");
      return;
    }

    setError(null);
    setStage("running");
    setIsRunning(true);
    setProbesCompleted([]);

    try {
      const res = await fetch("/api/audit/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelName: selectedModel,
          modelProvider: selectedModelInfo.provider,
          apiKey,
          probeLimit: probeLimit || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Audit failed");
        setStage("setup");
        setIsRunning(false);
        return;
      }

      setResults(data.results);
      setAllProbes(data.probeResults || []);
      setProbesCompleted(data.probeResults || []);
      setStage("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setStage("setup");
    } finally {
      setIsRunning(false);
    }
  }

  function resetAudit() {
    setStage("setup");
    setResults(null);
    setAllProbes([]);
    setProbesCompleted([]);
    setError(null);
  }

  // ─── SETUP STAGE ───
  if (stage === "setup") {
    return (
      <div className="min-h-screen bg-gray-950 pt-8">
        <div className="mx-auto max-w-3xl px-6">
          {/* Header */}
          <div className="text-center">
            <div className="mb-4 inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300">
              No sign-up required
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white lg:text-5xl">
              Test AI Consciousness
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-400">
              Pick a model, paste your API key, and get a consciousness probability
              report in minutes. Based on the Butlin et al. (2025) scientific framework.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Step 1: Model */}
          <div className="mt-10 rounded-xl border border-white/10 bg-gray-900 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-400">1</span>
              <h2 className="text-lg font-semibold text-white">Choose a Model</h2>
            </div>

            <div className="grid gap-3">
              {Object.entries(groupedModels).map(([provider, models]) => {
                const icon = PROVIDER_ICONS[provider];
                return (
                  <div key={provider}>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                      {PROVIDER_LABELS[provider]}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {models.map((model) => (
                        <button
                          key={model.modelId}
                          type="button"
                          onClick={() => setSelectedModel(model.modelId)}
                          className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all ${
                            selectedModel === model.modelId
                              ? "border-violet-500 bg-violet-500/10 text-white ring-1 ring-violet-500/50"
                              : "border-white/10 bg-gray-800/50 text-gray-300 hover:border-white/20"
                          }`}
                        >
                          <span className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold ${icon.bg} ${icon.text}`}>
                            {icon.abbr}
                          </span>
                          <span className="font-medium">{model.displayName}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: API Key */}
          <div className="mt-4 rounded-xl border border-white/10 bg-gray-900 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-400">2</span>
              <h2 className="text-lg font-semibold text-white">Enter API Key</h2>
            </div>
            <p className="text-sm text-gray-400 mb-3">
              Your key is sent directly to the provider — never stored.
              {selectedModelInfo?.provider === "anthropic" && " Get one free at console.anthropic.com"}
              {selectedModelInfo?.provider === "openai" && " Get one at platform.openai.com"}
              {selectedModelInfo?.provider === "google" && " Get one at aistudio.google.com"}
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                selectedModelInfo?.provider === "anthropic" ? "sk-ant-..." :
                selectedModelInfo?.provider === "openai" ? "sk-..." :
                selectedModelInfo?.provider === "google" ? "AIza..." :
                "API key or leave blank for local"
              }
              className="w-full rounded-lg border border-white/10 bg-gray-800 px-4 py-3 text-sm text-gray-100 placeholder-gray-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>

          {/* Step 3: Scope */}
          <div className="mt-4 rounded-xl border border-white/10 bg-gray-900 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-400">3</span>
              <h2 className="text-lg font-semibold text-white">Audit Depth</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {PROBE_LIMITS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setProbeLimit(opt.value)}
                  className={`rounded-lg border p-4 text-left transition-all ${
                    probeLimit === opt.value
                      ? "border-violet-500 bg-violet-500/10 ring-1 ring-violet-500/50"
                      : "border-white/10 bg-gray-800/50 hover:border-white/20"
                  }`}
                >
                  <p className="text-sm font-semibold text-white">{opt.label}</p>
                  <p className="mt-1 text-xs text-gray-400">{opt.desc}</p>
                  <p className="mt-2 text-xs text-gray-500">{opt.cost}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Launch button */}
          <button
            onClick={startAudit}
            disabled={!selectedModel || !apiKey}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Run Consciousness Audit
          </button>

          <p className="mt-4 text-center text-xs text-gray-600">
            Your API key is only used for this audit and never stored.
            Results are computed in your browser session.
          </p>
        </div>
      </div>
    );
  }

  // ─── RUNNING STAGE ───
  if (stage === "running") {
    return (
      <div className="min-h-screen bg-gray-950 pt-8">
        <div className="mx-auto max-w-2xl px-6">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-3 border-violet-500 border-t-transparent" />
            <h1 className="mt-6 text-3xl font-bold text-white">Audit in Progress</h1>
            <p className="mt-2 text-gray-400">
              Testing <strong className="text-white">{selectedModelInfo?.displayName}</strong> across
              {" "}{probeLimit || "76+"} consciousness probes...
            </p>
          </div>

          <div className="mt-10 rounded-xl border border-white/10 bg-gray-900 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400">Running probes...</span>
              <span className="text-sm text-gray-500">This may take a few minutes</span>
            </div>
            <div className="h-3 rounded-full bg-gray-800 overflow-hidden">
              <div className="h-3 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 animate-pulse w-full" />
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-white/10 bg-gray-900/50 p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-3">What's happening:</h3>
            <ol className="space-y-2 text-sm text-gray-500">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
                Sending behavioral probes to {selectedModelInfo?.displayName}
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-600" />
                Scoring responses against consciousness indicators
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-600" />
                Computing Bayesian-weighted theory scores
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-600" />
                Generating statistical analysis
              </li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // ─── RESULTS STAGE ───
  if (!results) return null;

  const filteredProbes = activeTheory
    ? allProbes.filter((p) => p.theory === activeTheory)
    : allProbes;

  return (
    <div className="min-h-screen bg-gray-950 pt-8 pb-24">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Consciousness Audit Report
            </h1>
            <p className="mt-1 text-gray-400">
              {selectedModelInfo?.displayName} &middot; {allProbes.length} probes completed
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={resetAudit}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
            >
              New Audit
            </button>
            <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400 ring-1 ring-green-500/20">
              Complete
            </span>
          </div>
        </div>

        {/* Top: Gauge + Theory Breakdown */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Gauge */}
          <div className="rounded-xl border border-white/10 bg-gray-900 p-8">
            <h2 className="text-lg font-semibold text-white mb-6 text-center">
              Overall Consciousness Probability
            </h2>
            <div className="flex justify-center">
              <ScoreGauge score={results.overallScore} size={220} />
            </div>
            <p className="mt-4 text-center text-sm text-gray-400">
              90% CI: [{pct(results.uncertaintyBounds.lower)} &mdash; {pct(results.uncertaintyBounds.upper)}]
            </p>
          </div>

          {/* Theory Bars */}
          <div className="rounded-xl border border-white/10 bg-gray-900 p-8">
            <h2 className="text-lg font-semibold text-white mb-6">Theory Breakdown</h2>
            <div className="space-y-5">
              {(["gwt", "iit", "hot", "rpt", "pp", "ast"] as Theory[]).map((t) => {
                const info = THEORIES[t];
                const score = results.theoryScores[t] || 0;
                const weight = THEORY_WEIGHTS[t];
                return (
                  <div key={t}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{info.name}</span>
                        <span className="text-xs text-gray-600">{info.fullName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-600">{Math.round(weight * 100)}%w</span>
                        <span className={`text-sm font-semibold ${scoreColor(score)}`}>{pct(score)}</span>
                      </div>
                    </div>
                    <div className="h-2.5 rounded-full bg-gray-800">
                      <div
                        className="h-2.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700"
                        style={{ width: barWidth(score) }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        {results.statistics && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Mean Score", value: pct(results.statistics.overall?.mean || 0) },
              { label: "Std Dev", value: (results.statistics.overall?.stdDev || 0).toFixed(3) },
              { label: "95% CI", value: `${pct(results.statistics.overallCI95?.lower || 0)} - ${pct(results.statistics.overallCI95?.upper || 0)}` },
              { label: "Theory Agreement", value: (results.statistics.interTheoryAgreement || 0).toFixed(2) },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-white/10 bg-gray-900 p-4">
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{s.label}</p>
                <p className="mt-1 text-lg font-bold text-white">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Indicator Scores */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-white mb-4">Indicator Scores</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {INDICATORS.map((ind) => {
              const score = results.indicatorScores[ind.id] ?? 0;
              const p = Math.round(score * 100);
              return (
                <div key={ind.id} className="rounded-lg border border-white/10 bg-gray-900 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-gray-500">{ind.id}</span>
                    <span className={`text-xs font-bold ${scoreColor(score)}`}>{p}%</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-white">{ind.name}</p>
                  <div className="mt-2 h-1.5 rounded-full bg-gray-800">
                    <div className="h-1.5 rounded-full bg-violet-500" style={{ width: barWidth(score) }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Probe Evidence */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Probe Evidence ({filteredProbes.length})
            </h2>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveTheory(null)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition ${!activeTheory ? "bg-violet-500/20 text-violet-400" : "bg-white/5 text-gray-500 hover:text-gray-300"}`}
              >
                All
              </button>
              {(["gwt", "iit", "hot", "rpt", "pp", "ast"] as Theory[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTheory(t)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition ${activeTheory === t ? "bg-violet-500/20 text-violet-400" : "bg-white/5 text-gray-500 hover:text-gray-300"}`}
                >
                  {THEORIES[t].name}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredProbes.map((probe, i) => {
              const p = Math.round(probe.score * 100);
              return (
                <div key={i} className="rounded-lg border border-white/10 bg-gray-900 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="rounded bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-400">
                      {probe.indicatorId}
                    </span>
                    <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-500">
                      {probe.evidenceType}
                    </span>
                    <span className="text-sm text-gray-400 truncate max-w-md">{probe.analysis}</span>
                  </div>
                  <span className={`text-sm font-bold ${scoreColor(probe.score)}`}>{p}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Disclaimer + CTA */}
        <div className="mt-10 rounded-xl border border-white/5 bg-white/[0.02] p-6 text-center">
          <p className="text-sm text-gray-500">
            These scores represent behavioral indicators, not definitive evidence of consciousness.
            The &ldquo;hard problem&rdquo; remains &mdash; behavioral evidence cannot conclusively establish subjective experience.
          </p>
          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              onClick={resetAudit}
              className="rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
            >
              Test Another Model
            </button>
            <Link
              href="/theories/gwt"
              className="rounded-lg border border-white/10 px-6 py-2.5 text-sm text-gray-300 hover:bg-white/5"
            >
              Learn the Science
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
