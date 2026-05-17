"use client";

import { useState, useMemo } from "react";

interface ProbeStats {
  name: string;
  id: string;
  meanScore: number;
  stdDev: number;
  ceilingPct: number; // % of responses scoring >= 0.9
  floorPct: number; // % of responses scoring <= 0.1
}

interface ProbeSensitivityProps {
  data: ProbeStats[];
}

type SortKey = "name" | "meanScore" | "stdDev" | "ceilingPct" | "floorPct";

const LOW_VARIANCE_THRESHOLD = 0.15;

export function ProbeSensitivity({ data }: ProbeSensitivityProps) {
  const [sortKey, setSortKey] = useState<SortKey>("stdDev");
  const [sortAsc, setSortAsc] = useState(true);

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      if (sortKey === "name") {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        return sortAsc
          ? (aVal as string).localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal as string);
      }

      aVal = a[sortKey];
      bVal = b[sortKey];
      return sortAsc
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [data, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "name");
    }
  };

  const SortHeader = ({
    label,
    column,
    className,
  }: {
    label: string;
    column: SortKey;
    className?: string;
  }) => (
    <th
      className={`cursor-pointer px-4 py-3 font-semibold transition hover:text-white ${className ?? ""}`}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {sortKey === column && (
          <span className="text-[10px] text-chetana-400">
            {sortAsc ? "▲" : "▼"}
          </span>
        )}
      </div>
    </th>
  );

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center text-sm text-gray-500">
        No probe sensitivity data available.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
      <div className="border-b border-gray-800 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-200">
          Probe Sensitivity Analysis
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          Probes highlighted in amber have low variance and may be poor
          discriminators between models.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 bg-white/[0.02] text-left text-gray-400">
              <SortHeader label="Probe" column="name" className="text-left" />
              <SortHeader
                label="Mean Score"
                column="meanScore"
                className="text-right"
              />
              <SortHeader
                label="Std Dev"
                column="stdDev"
                className="text-right"
              />
              <SortHeader
                label="Ceiling %"
                column="ceilingPct"
                className="text-right"
              />
              <SortHeader
                label="Floor %"
                column="floorPct"
                className="text-right"
              />
            </tr>
          </thead>
          <tbody>
            {sortedData.map((probe) => {
              const isLowVariance = probe.stdDev < LOW_VARIANCE_THRESHOLD;
              return (
                <tr
                  key={probe.id}
                  className={`border-b border-gray-800/50 transition ${
                    isLowVariance
                      ? "bg-amber-500/[0.04] hover:bg-amber-500/[0.08]"
                      : "hover:bg-white/[0.02]"
                  }`}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {isLowVariance && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-amber-400"
                          title="Low variance - poor discriminator"
                        />
                      )}
                      <div>
                        <div
                          className={`font-medium ${isLowVariance ? "text-amber-200" : "text-gray-200"}`}
                        >
                          {probe.name}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {probe.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-300">
                    {(probe.meanScore * 100).toFixed(1)}%
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right tabular-nums font-medium ${
                      isLowVariance ? "text-amber-400" : "text-gray-300"
                    }`}
                  >
                    {probe.stdDev.toFixed(3)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-300">
                    {probe.ceilingPct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-300">
                    {probe.floorPct.toFixed(1)}%
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
