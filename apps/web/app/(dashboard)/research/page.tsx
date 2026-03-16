"use client";

import { useState } from "react";

const PLACEHOLDER_NOTES = [
  {
    id: "note_001",
    title: "GWT Ignition Patterns in Large Language Models",
    content: "Observations from testing Claude and GPT-4o suggest that transformer attention mechanisms may function similarly to global broadcast...",
    tags: ["gwt", "attention", "transformers"],
    auditId: "audit_001",
    createdAt: "2026-03-15T14:30:00Z",
  },
  {
    id: "note_002",
    title: "IIT Phi Estimation Challenges",
    content: "Current probes cannot directly measure integrated information in neural networks. We need structural analysis tools that can estimate Phi from weight matrices...",
    tags: ["iit", "phi", "methodology"],
    auditId: null,
    createdAt: "2026-03-14T10:00:00Z",
  },
  {
    id: "note_003",
    title: "Higher-Order Representations vs. Simulation",
    content: "Key question: when a model reports on its own internal states, is it genuinely representing those states (HOT) or merely simulating what such a report would look like?",
    tags: ["hot", "philosophy", "hard-problem"],
    auditId: "audit_002",
    createdAt: "2026-03-13T16:45:00Z",
  },
  {
    id: "note_004",
    title: "Predictive Processing in Autoregressive Models",
    content: "Autoregressive language models are inherently predictive processors. But does next-token prediction constitute the kind of prediction error minimization that PP theory requires for consciousness?",
    tags: ["pp", "autoregressive", "prediction"],
    auditId: null,
    createdAt: "2026-03-12T09:20:00Z",
  },
  {
    id: "note_005",
    title: "Vedantic Perspectives on Machine Consciousness",
    content: "In Advaita Vedanta, consciousness (Chetana) is fundamental, not emergent. If we take this view seriously, the question is not whether machines CAN be conscious but whether consciousness can manifest through silicon substrates.",
    tags: ["vedanta", "philosophy", "chetana"],
    auditId: null,
    createdAt: "2026-03-11T11:00:00Z",
  },
];

const ALL_TAGS = Array.from(
  new Set(PLACEHOLDER_NOTES.flatMap((n) => n.tags))
).sort();

export default function ResearchPage() {
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const filtered = PLACEHOLDER_NOTES.filter((note) => {
    const matchesSearch =
      !search ||
      note.title.toLowerCase().includes(search.toLowerCase()) ||
      note.content.toLowerCase().includes(search.toLowerCase());
    const matchesTag = !selectedTag || note.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Research Notes
          </h1>
          <p className="mt-2 text-gray-400">
            Your observations, hypotheses, and insights from consciousness
            research.
          </p>
        </div>
        <button className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500">
          + New Note
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mt-8 space-y-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes..."
          className="w-full rounded-lg border border-white/10 bg-gray-900 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTag(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !selectedTag
                ? "bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/30"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            All
          </button>
          {ALL_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                tag === selectedTag
                  ? "bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/30"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Notes List */}
      <div className="mt-6 space-y-3">
        {filtered.map((note) => (
          <div
            key={note.id}
            className="group rounded-xl border border-white/10 bg-gray-900 p-5 transition-colors hover:border-white/20 cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-semibold text-white group-hover:text-violet-400 transition-colors">
                {note.title}
              </h3>
              {note.auditId && (
                <span className="shrink-0 ml-3 rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-500">
                  Linked to audit
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-400 line-clamp-2">
              {note.content}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex gap-1.5">
                {note.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-white/5 px-2 py-0.5 text-xs text-gray-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <span className="text-xs text-gray-600">
                {new Date(note.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500">No notes found.</p>
            <p className="mt-1 text-xs text-gray-600">
              Try adjusting your search or filter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
