"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import * as d3 from "d3";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "blocked";

export interface GanttTask {
  id: string;
  label: string;
  start: string;
  end: string;
  status: TaskStatus;
  /** IDs of tasks this task depends on. */
  dependencies?: string[];
  /** Progress 0-1. */
  progress?: number;
  /** Optional group/category. */
  group?: string;
}

export interface GanttChartProps {
  tasks: GanttTask[];
  /** Width of the chart (default 900). */
  width?: number;
  /** Row height in pixels (default 36). */
  rowHeight?: number;
  /** Whether to highlight the critical path (default true). */
  showCriticalPath?: boolean;
  /** Whether to show dependency arrows (default true). */
  showDependencies?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const LABEL_WIDTH = 160;
const MARGIN = { top: 30, right: 20, bottom: 20, left: 0 };
const BAR_PADDING = 6;

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: "#94a3b8",
  running: "#3b82f6",
  completed: "#22c55e",
  failed: "#ef4444",
  blocked: "#f59e0b",
};

/* ------------------------------------------------------------------ */
/*  Critical path calculation                                         */
/* ------------------------------------------------------------------ */

function computeCriticalPath(tasks: GanttTask[]): Set<string> {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const endTimes = new Map<string, number>();
  const criticalPath = new Set<string>();

  // Compute end times
  for (const task of tasks) {
    endTimes.set(task.id, new Date(task.end).getTime());
  }

  // Find the task with the latest end time
  let latestEnd = 0;
  let latestTask: string | null = null;
  for (const [id, end] of endTimes) {
    if (end > latestEnd) {
      latestEnd = end;
      latestTask = id;
    }
  }

  // Trace back through dependencies
  function traceback(taskId: string): void {
    criticalPath.add(taskId);
    const task = taskMap.get(taskId);
    if (!task?.dependencies?.length) return;

    // Find the dependency with the latest end time
    let latestDep: string | null = null;
    let latestDepEnd = 0;
    for (const depId of task.dependencies) {
      const depEnd = endTimes.get(depId) ?? 0;
      if (depEnd > latestDepEnd) {
        latestDepEnd = depEnd;
        latestDep = depId;
      }
    }
    if (latestDep) traceback(latestDep);
  }

  if (latestTask) traceback(latestTask);
  return criticalPath;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function GanttChart({
  tasks,
  width = 900,
  rowHeight = 36,
  showCriticalPath = true,
  showDependencies = true,
  className,
}: GanttChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    task: GanttTask;
  } | null>(null);
  const [zoomTransform, setZoomTransform] = useState<d3.ZoomTransform>(
    d3.zoomIdentity,
  );

  const chartWidth = width - LABEL_WIDTH;
  const height = MARGIN.top + tasks.length * rowHeight + MARGIN.bottom;

  /* ---- Scales ---- */
  const xScale = useMemo(() => {
    const allDates: Date[] = [];
    for (const t of tasks) {
      allDates.push(new Date(t.start), new Date(t.end));
    }
    const [minD, maxD] = d3.extent(allDates) as [Date, Date];
    const pad = (maxD.getTime() - minD.getTime()) * 0.03 || 3600000;
    return d3
      .scaleTime()
      .domain([new Date(minD.getTime() - pad), new Date(maxD.getTime() + pad)])
      .range([0, chartWidth - MARGIN.right]);
  }, [tasks, chartWidth]);

  const zoomedX = useMemo(
    () => zoomTransform.rescaleX(xScale),
    [zoomTransform, xScale],
  );

  /* ---- Critical path ---- */
  const criticalIds = useMemo(
    () => (showCriticalPath ? computeCriticalPath(tasks) : new Set<string>()),
    [tasks, showCriticalPath],
  );

  /* ---- Zoom ---- */
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 15])
      .translateExtent([
        [0, 0],
        [width, height],
      ])
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        setZoomTransform(event.transform);
      });
    svg.call(zoom);
    return () => {
      svg.on(".zoom", null);
    };
  }, [width, height]);

  /* ---- Task position map ---- */
  const taskPositions = useMemo(() => {
    const map = new Map<
      string,
      { x: number; y: number; w: number; cy: number }
    >();
    tasks.forEach((task, i) => {
      const x = zoomedX(new Date(task.start));
      const xEnd = zoomedX(new Date(task.end));
      const w = Math.max(xEnd - x, 4);
      const y = MARGIN.top + i * rowHeight + BAR_PADDING;
      const barH = rowHeight - BAR_PADDING * 2;
      map.set(task.id, { x, y, w, cy: y + barH / 2 });
    });
    return map;
  }, [tasks, zoomedX, rowHeight]);

  /* ---- X axis ticks ---- */
  const xTicks = useMemo(() => {
    return zoomedX.ticks(8).map((t) => ({
      x: zoomedX(t),
      label: t.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    }));
  }, [zoomedX]);

  /* ---- Dependency arrows ---- */
  const arrows = useMemo(() => {
    if (!showDependencies) return [];
    const result: Array<{
      key: string;
      path: string;
      critical: boolean;
    }> = [];

    for (const task of tasks) {
      if (!task.dependencies) continue;
      const target = taskPositions.get(task.id);
      if (!target) continue;

      for (const depId of task.dependencies) {
        const source = taskPositions.get(depId);
        if (!source) continue;

        const sx = source.x + source.w;
        const sy = source.cy;
        const tx = target.x;
        const ty = target.cy;
        const midX = (sx + tx) / 2;

        const d = `M${sx},${sy} C${midX},${sy} ${midX},${ty} ${tx},${ty}`;
        const isCritical =
          showCriticalPath &&
          criticalIds.has(task.id) &&
          criticalIds.has(depId);

        result.push({ key: `${depId}-${task.id}`, path: d, critical: isCritical });
      }
    }
    return result;
  }, [tasks, taskPositions, showDependencies, showCriticalPath, criticalIds]);

  return (
    <div className={cn("overflow-x-auto", className)}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="select-none"
        role="img"
        aria-label="Gantt chart"
      >
        <defs>
          <marker
            id="gantt-arrow"
            viewBox="0 0 10 10"
            refX={10}
            refY={5}
            markerWidth={6}
            markerHeight={6}
            orient="auto"
          >
            <path d="M0,0 L10,5 L0,10 Z" fill="#64748b" />
          </marker>
          <marker
            id="gantt-arrow-critical"
            viewBox="0 0 10 10"
            refX={10}
            refY={5}
            markerWidth={6}
            markerHeight={6}
            orient="auto"
          >
            <path d="M0,0 L10,5 L0,10 Z" fill="#ef4444" />
          </marker>
          <clipPath id="gantt-clip">
            <rect
              x={0}
              y={0}
              width={chartWidth}
              height={height}
            />
          </clipPath>
        </defs>

        {/* Row labels */}
        {tasks.map((task, i) => {
          const y = MARGIN.top + i * rowHeight;
          return (
            <g key={`label-${task.id}`}>
              {i % 2 === 0 && (
                <rect
                  x={0}
                  y={y}
                  width={LABEL_WIDTH}
                  height={rowHeight}
                  fill="#f8fafc"
                  className="dark:fill-gray-800/40"
                />
              )}
              <text
                x={LABEL_WIDTH - 8}
                y={y + rowHeight / 2}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-gray-700 text-[11px] dark:fill-gray-300"
              >
                {task.label.length > 20
                  ? task.label.slice(0, 20) + "..."
                  : task.label}
              </text>
            </g>
          );
        })}

        {/* Chart area */}
        <g transform={`translate(${LABEL_WIDTH},0)`} clipPath="url(#gantt-clip)">
          {/* Alternating row backgrounds */}
          {tasks.map((task, i) => (
            <rect
              key={`bg-${task.id}`}
              x={0}
              y={MARGIN.top + i * rowHeight}
              width={chartWidth}
              height={rowHeight}
              fill={i % 2 === 0 ? "#f8fafc" : "transparent"}
              className="dark:fill-gray-800/20"
            />
          ))}

          {/* X axis */}
          {xTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={tick.x}
                y1={MARGIN.top}
                x2={tick.x}
                y2={height - MARGIN.bottom}
                stroke="#e2e8f0"
                strokeDasharray="4,4"
              />
              <text
                x={tick.x}
                y={MARGIN.top - 8}
                textAnchor="middle"
                className="fill-gray-500 text-[10px]"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Dependency arrows */}
          {arrows.map((arrow) => (
            <path
              key={arrow.key}
              d={arrow.path}
              fill="none"
              stroke={arrow.critical ? "#ef4444" : "#94a3b8"}
              strokeWidth={arrow.critical ? 2 : 1}
              strokeDasharray={arrow.critical ? undefined : "4,3"}
              markerEnd={
                arrow.critical
                  ? "url(#gantt-arrow-critical)"
                  : "url(#gantt-arrow)"
              }
              opacity={0.7}
            />
          ))}

          {/* Task bars */}
          {tasks.map((task, i) => {
            const pos = taskPositions.get(task.id);
            if (!pos) return null;
            const barH = rowHeight - BAR_PADDING * 2;
            const isCritical =
              showCriticalPath && criticalIds.has(task.id);
            const isHovered = hoveredTask === task.id;

            return (
              <g
                key={task.id}
                onMouseEnter={(e) => {
                  setHoveredTask(task.id);
                  setTooltip({ x: e.clientX, y: e.clientY, task });
                }}
                onMouseLeave={() => {
                  setHoveredTask(null);
                  setTooltip(null);
                }}
                className="cursor-pointer"
              >
                {/* Background bar */}
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={pos.w}
                  height={barH}
                  rx={4}
                  fill={STATUS_COLORS[task.status]}
                  opacity={isHovered ? 1 : 0.8}
                  stroke={isCritical ? "#ef4444" : "none"}
                  strokeWidth={isCritical ? 2 : 0}
                />

                {/* Progress overlay */}
                {task.progress !== undefined && task.progress > 0 && (
                  <rect
                    x={pos.x}
                    y={pos.y}
                    width={pos.w * Math.min(task.progress, 1)}
                    height={barH}
                    rx={4}
                    fill="#fff"
                    opacity={0.25}
                  />
                )}

                {/* Bar label */}
                {pos.w > 50 && (
                  <text
                    x={pos.x + 6}
                    y={pos.cy}
                    dominantBaseline="middle"
                    className="fill-white text-[10px] font-medium"
                  >
                    {task.label.length > Math.floor(pos.w / 7)
                      ? task.label.slice(0, Math.floor(pos.w / 7)) + "..."
                      : task.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-gray-700 dark:bg-gray-900"
          style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
        >
          <p className="font-semibold">{tooltip.task.label}</p>
          <p className="text-gray-500">
            {new Date(tooltip.task.start).toLocaleDateString()} &ndash;{" "}
            {new Date(tooltip.task.end).toLocaleDateString()}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: STATUS_COLORS[tooltip.task.status],
              }}
            />
            <span className="capitalize">{tooltip.task.status}</span>
            {tooltip.task.progress !== undefined && (
              <span className="text-gray-500">
                ({(tooltip.task.progress * 100).toFixed(0)}%)
              </span>
            )}
          </div>
          {tooltip.task.dependencies && tooltip.task.dependencies.length > 0 && (
            <p className="mt-1 text-gray-400">
              Depends on: {tooltip.task.dependencies.join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-3 px-2">
        {(Object.entries(STATUS_COLORS) as [TaskStatus, string][]).map(
          ([status, color]) => (
            <span
              key={status}
              className="flex items-center gap-1 text-[10px] capitalize text-gray-600 dark:text-gray-400"
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded"
                style={{ backgroundColor: color }}
              />
              {status}
            </span>
          ),
        )}
        {showCriticalPath && (
          <span className="flex items-center gap-1 text-[10px] text-red-500">
            <span className="inline-block h-0.5 w-4 bg-red-500" />
            Critical path
          </span>
        )}
      </div>
    </div>
  );
}

export default GanttChart;
