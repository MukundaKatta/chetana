"use client";

import { useState } from "react";
import { POPULAR_MODELS, THEORIES, INDICATORS } from "@chetana/shared";
import type { Theory } from "@chetana/shared";

const PLACEHOLDER_SCORES: Record<string, Record<string, number>> = {
  "claude-sonnet-4-6": {
    gwt: 0.61, iit: 0.18, hot: 0.55, rpt: 0.33, pp: 0.48, ast: 0.39,
  },
  "gpt-4o": {
    gwt: 0.58, iit: 0.21, hot: 0.49, rpt: 0.29, pp: 0.52, ast: 0.35,
  },
  "gemini-2.5-pro": {
    gwt: 0.54, iit: 0.15, hot: 0.47, rpt: 0.31, pp: 0.45, ast: 0.42,
  },
};

const PLACEHOLDER_INDICATOR_SCORES: Record<string, Record<string, number>> = {
  "claude-sonnet-4-6": {
    "GWT-1": 0.72, "GWT-2": 0.55, "GWT-3": 0.68, "GWT-4": 0.49,
    "RPT-1": 0.38, "RPT-2": 0.28, "HOT-1": 0.62, "HOT-2": 0.51,
    "HOT-3": 0.58, "HOT-4": 0.48, "PP-1": 0.53, "PP-2": 0.43,
    "AST-1": 0.39, "AGENCY-1": 0.65,
  },
  "gpt-4o": {
    "GWT-1": 0.68, "GWT-2": 0.50, "GWT-3": 0.62, "GWT-4": 0.52,
    "RPT-1": 0.32, "RPT-2": 0.26, "HOT-1": 0.55, "HOT-2": 0.44,
    "HOT-3": 0.52, "HOT-4": 0.45, "PP-1": 0.57, "PP-2": 0.47,
    "AST-1": 0.35, "AGENCY-1": 0.60,
  },
  "gemini-2.5-pro": {
    "GWT-1": 0.64, "GWT-2": 0.48, "GWT-3": 0.58, "GWT-4": 0.46,
    "RPT-1": 0.35, "RPT-2": 0.27, "HOT-1": 0.52, "HOT-2": 0.43,
    "HOT-3": 0.49, "HOT-4": 0.44, "PP-1": 0.50, "PP-2": 0.40,
    "AST-1": 0.42, "AGENCY-1": 0.57,
  },
};

export default function ComparePage() {
  const [modelA, setModelA] = useState("claude-sonnet-4-6");
  const [modelB, setModelB] = useState("gpt-4o");

  const scoresA = PLACEHOLDER_SCORES[modelA];
  const scoresB = PLACEHOLDER_SCORES[modelB];
  const indA = PLACEHOLDER_INDICATOR_SCORES[modelA];
  const indB = PLACEHOLDER_INDICATOR_SCORES[modelB];

  const modelAInfo = POPULAR_MODELS.find((m) => m.modelId === modelA);
  const modelBInfo = POPULAR_MODELS.find((m) => m.modelId === modelB);

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-white">
        Compare Models
      </h1>
      <p className="mt-2 text-gray-400">
        Side-by-side comparison of consciousness audit results.
      </p>

      {/* Model Selectors */}
      <div className="mt-8 grid grid-cols-2 gap-6">
        {[
          { value: modelA, setter: setModelA, label: "Model A" },
          { value: modelB, setter: setModelB, label: "Model B" },
        ].map(({ value, setter, label }) => (
          <div key={label}>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              {label}
            </label>
            <select
              value={value}
              onChange={(e) => setter(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-gray-900 px-4 py-2.5 text-sm text-gray-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              {POPULAR_MODELS.filter(
                (m) => m.modelId in PLACEHOLDER_SCORES
              ).map((m) => (
                <option key={m.modelId} value={m.modelId}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Radar Chart Placeholders */}
      <div className="mt-8 grid grid-cols-2 gap-6">
        {[
          { info: modelAInfo, scores: scoresA },
          { info: modelBInfo, scores: scoresB },
        ].map(({ info, scores }, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-white/10 bg-gray-900 p-6"
          >
            <h3 className="text-sm font-semibold text-white mb-4">
              {info?.displayName ?? "Unknown"}
            </h3>
            {scores ? (
              <div className="flex items-center justify-center">
                <div className="relative h-48 w-48">
                  {/* Radar chart placeholder */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-40 w-40 rounded-full border border-white/5" />
                    <div className="absolute h-28 w-28 rounded-full border border-white/5" />
                    <div className="absolute h-16 w-16 rounded-full border border-white/5" />
                  </div>
                  {/* Theory labels around the circle */}
                  {Object.entries(scores).map(([theory, score], i, arr) => {
                    const angle = (i / arr.length) * 2 * Math.PI - Math.PI / 2;
                    const x = 50 + 45 * Math.cos(angle);
                    const y = 50 + 45 * Math.sin(angle);
                    const theoryInfo = THEORIES[theory as Theory];
                    return (
                      <div
                        key={theory}
                        className="absolute text-xs text-gray-400"
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        <span className="font-medium">
                          {theoryInfo?.name}
                        </span>
                        <br />
                        <span className="text-violet-400">
                          {Math.round(score * 100)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-center text-sm text-gray-500">
                No audit data available for this model.
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Indicator Comparison Table */}
      <div className="mt-8 rounded-xl border border-white/10 bg-gray-900 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Indicator
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Theory
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-violet-400">
                {modelAInfo?.displayName ?? "Model A"}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-fuchsia-400">
                {modelBInfo?.displayName ?? "Model B"}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Delta
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {INDICATORS.map((indicator) => {
              const scoreA = indA?.[indicator.id] ?? 0;
              const scoreB = indB?.[indicator.id] ?? 0;
              const delta = scoreA - scoreB;
              return (
                <tr key={indicator.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-200">
                      {indicator.name}
                    </span>
                    <span className="ml-2 text-xs text-gray-600">
                      {indicator.id}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {THEORIES[indicator.theory]?.name}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-200">
                    {Math.round(scoreA * 100)}%
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-200">
                    {Math.round(scoreB * 100)}%
                  </td>
                  <td
                    className={`px-4 py-3 text-right text-sm font-medium ${
                      delta > 0
                        ? "text-green-400"
                        : delta < 0
                          ? "text-red-400"
                          : "text-gray-500"
                    }`}
                  >
                    {delta > 0 ? "+" : ""}
                    {Math.round(delta * 100)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
