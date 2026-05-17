"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface ScoreDistributionProps {
  scores: number[];
  title?: string;
}

const BIN_COLORS = [
  "#ef4444", // 0.0-0.1 red
  "#f87171", // 0.1-0.2
  "#fb923c", // 0.2-0.3
  "#fbbf24", // 0.3-0.4
  "#facc15", // 0.4-0.5
  "#a3e635", // 0.5-0.6
  "#4ade80", // 0.6-0.7
  "#34d399", // 0.7-0.8
  "#22c55e", // 0.8-0.9
  "#16a34a", // 0.9-1.0
];

export function ScoreDistribution({ scores, title }: ScoreDistributionProps) {
  const bins = useMemo(() => {
    const binData = Array.from({ length: 10 }, (_, i) => ({
      range: `${(i * 0.1).toFixed(1)}-${((i + 1) * 0.1).toFixed(1)}`,
      count: 0,
    }));

    scores.forEach((score) => {
      const clamped = Math.max(0, Math.min(1, score));
      const binIndex = Math.min(9, Math.floor(clamped * 10));
      binData[binIndex].count++;
    });

    return binData;
  }, [scores]);

  if (scores.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center text-sm text-gray-500">
        No score data available for distribution.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
      {title && (
        <h3 className="mb-3 text-sm font-semibold text-gray-200">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={bins}
          margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />
          <XAxis
            dataKey="range"
            stroke="#6b7280"
            fontSize={10}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            angle={-30}
            textAnchor="end"
            height={50}
          />
          <YAxis
            stroke="#6b7280"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#111827",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "0.75rem",
              fontSize: "12px",
            }}
            labelStyle={{ color: "#e5e7eb", fontWeight: 600 }}
            itemStyle={{ color: "#d1d5db" }}
            formatter={(value: number) => [`${value} probes`, "Count"]}
            labelFormatter={(label: string) => `Score range: ${label}`}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {bins.map((_, index) => (
              <Cell key={`cell-${index}`} fill={BIN_COLORS[index]} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center justify-between px-2 text-[10px] text-gray-500">
        <span>Low scores (0)</span>
        <span>{scores.length} total probes</span>
        <span>High scores (1)</span>
      </div>
    </div>
  );
}
