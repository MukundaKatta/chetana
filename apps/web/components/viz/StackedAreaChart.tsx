"use client";

import { useState, useCallback, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import * as d3 from "d3";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface StackedAreaDataPoint {
  /** X-axis label (e.g. timestamp or step). */
  time: string;
  /** Theory/layer name -> value. */
  [key: string]: string | number;
}

export interface StackedAreaChartProps {
  data: StackedAreaDataPoint[];
  /** Layer keys (theory names) to stack. */
  layers: string[];
  /** Optional colour map. Falls back to d3 scheme. */
  colors?: Record<string, string>;
  /** Chart height (default 360). */
  height?: number;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function StackedAreaChart({
  data,
  layers,
  colors,
  height = 360,
  className,
}: StackedAreaChartProps) {
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set());

  const colorScale = useMemo(() => {
    const scale = d3.scaleOrdinal(d3.schemeTableau10);
    return (key: string) => colors?.[key] ?? scale(key);
  }, [colors]);

  const toggleLayer = useCallback((key: string) => {
    setHiddenLayers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const visibleLayers = useMemo(
    () => layers.filter((l) => !hiddenLayers.has(l)),
    [layers, hiddenLayers],
  );

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              {layers.map((key) => (
                <linearGradient
                  key={key}
                  id={`stacked-grad-${key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={colorScale(key)}
                    stopOpacity={0.6}
                  />
                  <stop
                    offset="95%"
                    stopColor={colorScale(key)}
                    stopOpacity={0.05}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
            />
            <XAxis
              dataKey="time"
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
              domain={[0, "auto"]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgb(23, 23, 23)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 8,
                fontSize: 11,
              }}
              labelStyle={{ color: "rgba(255,255,255,0.7)" }}
              itemStyle={{ color: "rgba(255,255,255,0.6)" }}
            />
            {visibleLayers.map((key) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId="1"
                stroke={colorScale(key)}
                fill={`url(#stacked-grad-${key})`}
                strokeWidth={2}
                animationDuration={800}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Clickable legend to toggle layers */}
      <div className="flex flex-wrap justify-center gap-3">
        {layers.map((key) => {
          const hidden = hiddenLayers.has(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleLayer(key)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                hidden
                  ? "border-white/5 bg-transparent text-neutral-600 line-through"
                  : "border-white/10 bg-white/[0.04] text-neutral-300 hover:bg-white/[0.08]",
              )}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: hidden ? "transparent" : colorScale(key),
                  border: hidden ? `1px solid ${colorScale(key)}` : "none",
                }}
              />
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
