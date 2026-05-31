"use client";

import { useMemo, useState } from "react";
import { toBibTeX, toJsonLd } from "@chetana/scorer";

/**
 * Citation / export tool (issues #628, #629). Generates a BibTeX entry and a
 * JSON-LD document for an audit, using the pure export helpers from
 * @chetana/scorer.
 */
export function CitationTool() {
  const [modelName, setModelName] = useState("GPT-5.4");
  const [probability, setProbability] = useState(0.42);
  const [auditId, setAuditId] = useState("demo-audit-001");

  const input = useMemo(
    () => ({
      auditId,
      modelName,
      overallProbability: probability,
      methodologyVersion: "v3",
      createdAt: new Date().toISOString().slice(0, 10),
      theoryScores: { gwt: 0.5, hot: 0.4, pp: 0.45 },
    }),
    [auditId, modelName, probability]
  );

  const bibtex = useMemo(() => toBibTeX(input), [input]);
  const jsonld = useMemo(() => JSON.stringify(toJsonLd(input), null, 2), [input]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs text-gray-400">Model name</span>
          <input
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-200"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-gray-400">Audit ID</span>
          <input
            value={auditId}
            onChange={(e) => setAuditId(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-200"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-gray-400">Probability ({probability.toFixed(2)})</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={probability}
            onChange={(e) => setProbability(Number(e.target.value))}
            className="w-full accent-chetana-500"
          />
        </label>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-gray-200">BibTeX</h3>
        <pre className="overflow-x-auto rounded-lg border border-white/8 bg-black/30 p-4 text-xs text-gray-300">
          {bibtex}
        </pre>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-gray-200">JSON-LD</h3>
        <pre className="overflow-x-auto rounded-lg border border-white/8 bg-black/30 p-4 text-xs text-gray-300">
          {jsonld}
        </pre>
      </div>
    </div>
  );
}
