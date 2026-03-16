"use client";

import { useState } from "react";

const PLACEHOLDER_EXPERIMENTS = [
  {
    id: "exp_001",
    name: "Metacognitive Loop Test",
    description: "Testing whether models can accurately report on their own reasoning process across 5 recursive self-reflection prompts.",
    model: "Claude Sonnet 4.6",
    status: "completed" as const,
    probeCount: 5,
    createdAt: "2026-03-14T10:00:00Z",
  },
  {
    id: "exp_002",
    name: "Counterfactual Reasoning Depth",
    description: "Evaluating how deep models can reason about hypothetical scenarios that require chaining multiple counterfactual steps.",
    model: "GPT-4o",
    status: "running" as const,
    probeCount: 8,
    createdAt: "2026-03-15T14:30:00Z",
  },
  {
    id: "exp_003",
    name: "Attention Schema Probes",
    description: "Custom probes designed to test if models can build and manipulate a model of their own attention processes.",
    model: "Gemini 2.5 Pro",
    status: "draft" as const,
    probeCount: 6,
    createdAt: "2026-03-16T09:00:00Z",
  },
];

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-500/10 text-green-400 ring-green-500/20",
  running: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
  draft: "bg-gray-500/10 text-gray-400 ring-gray-500/20",
};

export default function ExperimentsPage() {
  const [experiments] = useState(PLACEHOLDER_EXPERIMENTS);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Experiments
          </h1>
          <p className="mt-2 text-gray-400">
            Design and run custom consciousness probes beyond the standard audit.
          </p>
        </div>
        <button className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500">
          + New Experiment
        </button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {experiments.map((exp) => (
          <div
            key={exp.id}
            className="group rounded-xl border border-white/10 bg-gray-900 p-5 transition-colors hover:border-white/20"
          >
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-semibold text-white group-hover:text-violet-400 transition-colors">
                {exp.name}
              </h3>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${STATUS_STYLES[exp.status]}`}
              >
                {exp.status}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-400 line-clamp-3">
              {exp.description}
            </p>
            <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
              <span>{exp.model}</span>
              <span>{exp.probeCount} probes</span>
            </div>
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
              <span className="text-xs text-gray-600">
                {new Date(exp.createdAt).toLocaleDateString()}
              </span>
              <button className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors">
                View Details
              </button>
            </div>
          </div>
        ))}

        {/* Empty state card for creating new */}
        <button className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-gray-900/50 p-8 text-center transition-colors hover:border-violet-500/50 hover:bg-gray-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10 text-violet-400">
            <span className="text-2xl">+</span>
          </div>
          <p className="mt-3 text-sm font-medium text-gray-400">
            Create New Experiment
          </p>
          <p className="mt-1 text-xs text-gray-600">
            Design custom probes to test specific consciousness hypotheses
          </p>
        </button>
      </div>
    </div>
  );
}
