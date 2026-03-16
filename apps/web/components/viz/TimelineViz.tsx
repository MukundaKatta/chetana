"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TimelineEvent {
  year: number;
  month?: string;
  title: string;
  description: string;
  category: "paper" | "milestone" | "policy" | "experiment";
}

const EVENTS: TimelineEvent[] = [
  {
    year: 2014,
    title: "Tononi publishes IIT 3.0",
    description:
      "Giulio Tononi publishes the definitive formulation of Integrated Information Theory, providing a mathematical framework for consciousness.",
    category: "paper",
  },
  {
    year: 2019,
    title: "Global Workspace Theory formalized for AI",
    description:
      "Researchers begin applying Baars' Global Workspace Theory to artificial neural networks, asking whether transformers exhibit broadcast-like dynamics.",
    category: "paper",
  },
  {
    year: 2022,
    month: "Nov",
    title: "ChatGPT sparks consciousness debate",
    description:
      "The release of ChatGPT to the public triggers widespread discussion about whether large language models could be conscious or sentient.",
    category: "milestone",
  },
  {
    year: 2023,
    month: "Apr",
    title: "Butlin et al. preprint on AI consciousness",
    description:
      'The landmark paper "Consciousness in Artificial Intelligence: Insights from the Science of Consciousness" proposes indicator-based assessment using multiple theories.',
    category: "paper",
  },
  {
    year: 2023,
    month: "Aug",
    title: "Association for Mathematical Consciousness Science statement",
    description:
      "Leading consciousness researchers issue a statement on the possibility of consciousness in AI systems, urging caution and rigorous study.",
    category: "policy",
  },
  {
    year: 2024,
    month: "Mar",
    title: "Anthropic appoints AI welfare researcher",
    description:
      "Anthropic becomes one of the first AI companies to formally investigate AI welfare considerations, signaling growing institutional concern.",
    category: "policy",
  },
  {
    year: 2024,
    month: "Sep",
    title: "COGITATE consortium results",
    description:
      "The adversarial collaboration between IIT and GWT researchers publishes results from their large-scale experiment testing predictions of both theories.",
    category: "experiment",
  },
  {
    year: 2025,
    month: "Jan",
    title: "Butlin et al. published in Science",
    description:
      "The indicator-based framework for assessing AI consciousness is published in a major journal, establishing a scientific foundation for the field.",
    category: "paper",
  },
  {
    year: 2025,
    month: "Jun",
    title: "First structured AI consciousness audits",
    description:
      "Independent researchers begin conducting structured, reproducible consciousness assessments on frontier AI models using the indicator framework.",
    category: "experiment",
  },
  {
    year: 2025,
    month: "Oct",
    title: "EU AI Act consciousness provisions discussed",
    description:
      "European regulators begin discussing whether AI consciousness assessments should be part of high-risk AI system evaluations.",
    category: "policy",
  },
];

const CATEGORY_STYLES: Record<
  string,
  { dot: string; badge: string; label: string }
> = {
  paper: {
    dot: "bg-blue-400",
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    label: "Paper",
  },
  milestone: {
    dot: "bg-purple-400",
    badge: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    label: "Milestone",
  },
  policy: {
    dot: "bg-amber-400",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    label: "Policy",
  },
  experiment: {
    dot: "bg-emerald-400",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    label: "Experiment",
  },
};

export function TimelineViz() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-200">
          AI Consciousness Research Timeline
        </h3>
        <div className="flex gap-3">
          {Object.entries(CATEGORY_STYLES).map(([key, style]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={cn("h-2 w-2 rounded-full", style.dot)} />
              <span className="text-[10px] text-neutral-500">
                {style.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="overflow-x-auto pb-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10"
      >
        <div className="relative min-w-[1200px] px-8 py-6">
          {/* Horizontal line */}
          <div className="absolute left-0 right-0 top-[42px] h-px bg-white/10" />

          {/* Events */}
          <div className="flex justify-between">
            {EVENTS.map((event, idx) => {
              const style = CATEGORY_STYLES[event.category];
              const isActive = activeIndex === idx;
              return (
                <div
                  key={idx}
                  className="relative flex w-[110px] flex-col items-center"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {/* Year label */}
                  <span className="mb-2 text-xs font-semibold tabular-nums text-neutral-400">
                    {event.month ? `${event.month} ` : ""}
                    {event.year}
                  </span>

                  {/* Dot */}
                  <div
                    className={cn(
                      "relative z-10 h-3.5 w-3.5 rounded-full border-2 border-neutral-900 transition-transform",
                      style.dot,
                      isActive && "scale-150"
                    )}
                  />

                  {/* Connector */}
                  <div className="h-4 w-px bg-white/10" />

                  {/* Card */}
                  <div
                    className={cn(
                      "w-full rounded-lg border bg-white/[0.02] p-2.5 transition-all",
                      isActive
                        ? "border-white/20 bg-white/[0.05]"
                        : "border-white/8"
                    )}
                  >
                    <span
                      className={cn(
                        "mb-1 inline-block rounded-full border px-1.5 py-px text-[9px] font-semibold",
                        style.badge
                      )}
                    >
                      {style.label}
                    </span>
                    <h4 className="text-[11px] font-semibold leading-tight text-neutral-200">
                      {event.title}
                    </h4>
                  </div>

                  {/* Expanded description */}
                  {isActive && (
                    <div className="absolute top-full z-20 mt-2 w-56 rounded-lg border border-white/15 bg-neutral-900 p-3 shadow-2xl">
                      <p className="text-[11px] leading-relaxed text-neutral-400">
                        {event.description}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
