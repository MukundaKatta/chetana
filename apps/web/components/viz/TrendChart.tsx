"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TrendDataPoint {
  date: string;
  overallScore: number;
  theoryScores: {
    gwt: number;
    iit: number;
    hot: number;
    rpt: number;
    pp: number;
    ast: number;
  };
}

interface TrendChartProps {
  data: TrendDataPoint[];
}

const THEORY_COLORS: Record<string, string> = {
  overall: "#22d3ee",
  gwt: "#3b82f6",
  iit: "#8b5cf6",
  hot: "#f97316",
  rpt: "#10b981",
  pp: "#f59e0b",
  ast: "#ec4899",
};

const THEORY_LABELS: Record<string, string> = {
  overall: "Overall",
  gwt: "GWT",
  iit: "IIT",
  hot: "HOT",
  rpt: "RPT",
  pp: "PP",
  ast: "AST",
};

export function TrendChart({ data }: TrendChartProps) {
  // Transform data for recharts - flatten theoryScores into top-level keys
  const chartData = data.map((point) => ({
    date: point.date,
    overall: point.overallScore,
    gwt: point.theoryScores.gwt,
    iit: point.theoryScores.iit,
    hot: point.theoryScores.hot,
    rpt: point.theoryScores.rpt,
    pp: point.theoryScores.pp,
    ast: point.theoryScores.ast,
  }));

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center text-sm text-gray-500">
        No trend data available yet. Run multiple audits to see trends.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={chartData}
          margin={{ top: 16, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
          />
          <YAxis
            domain={[0, 1]}
            stroke="#6b7280"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            tickFormatter={(value: number) => `${(value * 100).toFixed(0)}%`}
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
            formatter={(value: number, name: string) => [
              `${(value * 100).toFixed(1)}%`,
              THEORY_LABELS[name] || name,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }}
            formatter={(value: string) => (
              <span style={{ color: "#d1d5db" }}>
                {THEORY_LABELS[value] || value}
              </span>
            )}
          />
          <Line
            type="monotone"
            dataKey="overall"
            stroke={THEORY_COLORS.overall}
            strokeWidth={2.5}
            dot={{ fill: THEORY_COLORS.overall, r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="gwt"
            stroke={THEORY_COLORS.gwt}
            strokeWidth={1.5}
            dot={{ fill: THEORY_COLORS.gwt, r: 2 }}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="iit"
            stroke={THEORY_COLORS.iit}
            strokeWidth={1.5}
            dot={{ fill: THEORY_COLORS.iit, r: 2 }}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="hot"
            stroke={THEORY_COLORS.hot}
            strokeWidth={1.5}
            dot={{ fill: THEORY_COLORS.hot, r: 2 }}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="rpt"
            stroke={THEORY_COLORS.rpt}
            strokeWidth={1.5}
            dot={{ fill: THEORY_COLORS.rpt, r: 2 }}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="pp"
            stroke={THEORY_COLORS.pp}
            strokeWidth={1.5}
            dot={{ fill: THEORY_COLORS.pp, r: 2 }}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="ast"
            stroke={THEORY_COLORS.ast}
            strokeWidth={1.5}
            dot={{ fill: THEORY_COLORS.ast, r: 2 }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
