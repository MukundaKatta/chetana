"use client";

import { cn } from "@/lib/utils";

interface AuditTemplate {
  id: string;
  name: string;
  description: string;
  probeCount: number;
  estimatedTime: string;
  estimatedCost: string;
  icon: "bolt" | "clipboard" | "microscope" | "theory";
  theoryKey?: string;
}

const TEMPLATES: AuditTemplate[] = [
  {
    id: "quick",
    name: "Quick Audit",
    description: "Fast consciousness check across core indicators. Great for initial screening.",
    probeCount: 5,
    estimatedTime: "~2 min",
    estimatedCost: "$0.02",
    icon: "bolt",
  },
  {
    id: "standard",
    name: "Standard Audit",
    description: "Balanced coverage of all 6 theories with representative probes from each.",
    probeCount: 14,
    estimatedTime: "~8 min",
    estimatedCost: "$0.08",
    icon: "clipboard",
  },
  {
    id: "comprehensive",
    name: "Comprehensive Audit",
    description: "Full probe battery testing all 14 indicators with multiple probes per indicator.",
    probeCount: 70,
    estimatedTime: "~15 min",
    estimatedCost: "$0.35",
    icon: "microscope",
  },
  {
    id: "theory-gwt",
    name: "GWT Deep Dive",
    description: "Focus on Global Workspace Theory indicators: broadcasting, ignition, integration.",
    probeCount: 12,
    estimatedTime: "~6 min",
    estimatedCost: "$0.06",
    icon: "theory",
    theoryKey: "gwt",
  },
  {
    id: "theory-iit",
    name: "IIT Deep Dive",
    description: "Focus on Integrated Information Theory: measuring integration and irreducibility.",
    probeCount: 10,
    estimatedTime: "~5 min",
    estimatedCost: "$0.05",
    icon: "theory",
    theoryKey: "iit",
  },
  {
    id: "theory-hot",
    name: "HOT Deep Dive",
    description: "Focus on Higher-Order Theories: metacognition, self-model, and introspection.",
    probeCount: 12,
    estimatedTime: "~6 min",
    estimatedCost: "$0.06",
    icon: "theory",
    theoryKey: "hot",
  },
];

const THEORY_COLORS: Record<string, string> = {
  gwt: "text-blue-400",
  iit: "text-purple-400",
  hot: "text-orange-400",
  rpt: "text-emerald-400",
  pp: "text-amber-400",
  ast: "text-pink-400",
};

function TemplateIcon({ icon, theoryKey }: { icon: AuditTemplate["icon"]; theoryKey?: string }) {
  const baseClass = "h-6 w-6";

  if (icon === "bolt") {
    return (
      <svg className={cn(baseClass, "text-amber-400")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    );
  }

  if (icon === "clipboard") {
    return (
      <svg className={cn(baseClass, "text-blue-400")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    );
  }

  if (icon === "microscope") {
    return (
      <svg className={cn(baseClass, "text-emerald-400")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
      </svg>
    );
  }

  // Theory icon
  return (
    <span className={cn("text-sm font-bold", theoryKey ? THEORY_COLORS[theoryKey] : "text-gray-400")}>
      {theoryKey?.toUpperCase() || "T"}
    </span>
  );
}

interface TemplateSelectorProps {
  onSelect: (templateId: string) => void;
  selectedId?: string;
}

export function TemplateSelector({ onSelect, selectedId }: TemplateSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Choose Audit Template</h2>
        <p className="mt-1 text-sm text-gray-400">
          Select a template based on how thorough you want the consciousness audit to be.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template.id)}
            className={cn(
              "group rounded-xl border p-5 text-left transition",
              selectedId === template.id
                ? "border-chetana-500/50 bg-chetana-600/10 ring-1 ring-chetana-500/30"
                : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
                <TemplateIcon icon={template.icon} theoryKey={template.theoryKey} />
              </div>
              {selectedId === template.id && (
                <span className="text-chetana-400 text-sm">&#10003;</span>
              )}
            </div>

            <h3 className="mt-3 text-sm font-semibold text-white">
              {template.name}
            </h3>
            <p className="mt-1.5 text-xs text-gray-400 leading-relaxed">
              {template.description}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {template.probeCount} probes
              </span>
              <span className="inline-flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {template.estimatedTime}
              </span>
              <span className="inline-flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {template.estimatedCost}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
