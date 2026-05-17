"use client";

import { useState, useCallback } from "react";

interface Annotation {
  id: string;
  text: string;
  createdAt: string;
}

interface AnnotationPanelProps {
  auditId: string;
  annotations: Annotation[];
  onAdd: (text: string) => void;
  onDelete: (id: string) => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function AnnotationPanel({
  auditId,
  annotations,
  onAdd,
  onDelete,
}: AnnotationPanelProps) {
  const [text, setText] = useState("");

  const handleSave = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setText("");
  }, [text, onAdd]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave]
  );

  return (
    <div className="rounded-xl border border-white/10 bg-gray-900/50 p-5">
      <h3 className="text-sm font-semibold text-gray-200">Annotations</h3>
      <p className="mt-1 text-xs text-gray-500">
        Add notes and observations for audit {auditId.slice(0, 8)}...
      </p>

      {/* Input */}
      <div className="mt-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a note..."
          rows={3}
          className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-chetana-500 focus:outline-none focus:ring-1 focus:ring-chetana-500"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-gray-600">
            Cmd+Enter to save
          </span>
          <button
            type="button"
            onClick={handleSave}
            disabled={!text.trim()}
            className="rounded-lg bg-chetana-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-chetana-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>

      {/* Annotations list */}
      {annotations.length > 0 && (
        <div className="mt-5 space-y-3">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {annotations.length} note{annotations.length !== 1 ? "s" : ""}
          </div>
          {annotations.map((annotation) => (
            <div
              key={annotation.id}
              className="group rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {annotation.text}
                </p>
                <button
                  type="button"
                  onClick={() => onDelete(annotation.id)}
                  className="flex-shrink-0 rounded p-1 text-gray-600 opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                  aria-label="Delete annotation"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
              <div className="mt-2 text-xs text-gray-600">
                {formatRelativeTime(annotation.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      {annotations.length === 0 && (
        <div className="mt-5 rounded-lg border border-dashed border-white/10 py-6 text-center">
          <p className="text-sm text-gray-600">No annotations yet</p>
        </div>
      )}
    </div>
  );
}
