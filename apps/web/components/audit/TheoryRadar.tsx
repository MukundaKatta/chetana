"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { getTheoryColor } from "@/lib/utils";

interface TheoryRadarProps {
  scores: Record<string, number>;
}

const THEORY_LABELS: Record<string, string> = {
  gwt: "GWT",
  iit: "IIT",
  hot: "HOT",
  rpt: "RPT",
  pp: "PP",
  ast: "AST",
};

export function TheoryRadar({ scores }: TheoryRadarProps) {
  const data = Object.entries(THEORY_LABELS).map(([key, label]) => ({
    theory: label,
    score: Math.round((scores[key] ?? 0) * 100),
    fullMark: 100,
  }));

  return (
    <div className="flex h-full min-h-[320px] w-full items-center justify-center">
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid
            stroke="rgba(255, 255, 255, 0.08)"
            strokeDasharray="3 3"
          />
          <PolarAngleAxis
            dataKey="theory"
            tick={{
              fill: "rgba(255, 255, 255, 0.6)",
              fontSize: 12,
              fontWeight: 600,
            }}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke={getTheoryColor("gwt")}
            fill={getTheoryColor("gwt")}
            fillOpacity={0.15}
            strokeWidth={2}
            dot={{
              r: 4,
              fill: "rgba(255, 255, 255, 0.9)",
              stroke: getTheoryColor("gwt"),
              strokeWidth: 2,
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(15, 15, 20, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "13px",
            }}
            formatter={(value: number) => [`${value}%`, "Score"]}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
