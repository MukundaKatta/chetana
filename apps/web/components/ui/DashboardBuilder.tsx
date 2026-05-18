"use client";

import {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type WidgetType =
  | "chart-bar"
  | "chart-line"
  | "chart-radar"
  | "stat-card"
  | "stat-trend"
  | "list-recent"
  | "list-top"
  | "table"
  | "text"
  | "empty";

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  /** Grid column span (1-12). */
  colSpan: number;
  /** Grid row span (1-4). */
  rowSpan: number;
  /** Grid column start (0-based). */
  col: number;
  /** Grid row start (0-based). */
  row: number;
  /** Widget-specific settings. */
  settings: Record<string, unknown>;
}

export interface DashboardLayout {
  id: string;
  name: string;
  columns: number;
  rowHeight: number;
  widgets: WidgetConfig[];
  createdAt: string;
  updatedAt: string;
}

export interface WidgetCatalogEntry {
  type: WidgetType;
  label: string;
  description: string;
  icon: string;
  defaultColSpan: number;
  defaultRowSpan: number;
  minColSpan: number;
  minRowSpan: number;
}

export interface DashboardBuilderProps {
  /** Current layout to edit. */
  layout: DashboardLayout;
  /** Called when layout changes. */
  onLayoutChange: (layout: DashboardLayout) => void;
  /** Render function for each widget. */
  renderWidget: (config: WidgetConfig) => ReactNode;
  /** Whether editing is enabled. */
  editable?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Widget catalog                                                    */
/* ------------------------------------------------------------------ */

export const WIDGET_CATALOG: WidgetCatalogEntry[] = [
  {
    type: "chart-bar",
    label: "Bar Chart",
    description: "Vertical or horizontal bar chart",
    icon: "BarChart",
    defaultColSpan: 4,
    defaultRowSpan: 2,
    minColSpan: 2,
    minRowSpan: 1,
  },
  {
    type: "chart-line",
    label: "Line Chart",
    description: "Time series or trend line chart",
    icon: "LineChart",
    defaultColSpan: 6,
    defaultRowSpan: 2,
    minColSpan: 3,
    minRowSpan: 1,
  },
  {
    type: "chart-radar",
    label: "Radar Chart",
    description: "Multi-axis radar/spider chart",
    icon: "Radar",
    defaultColSpan: 4,
    defaultRowSpan: 2,
    minColSpan: 3,
    minRowSpan: 2,
  },
  {
    type: "stat-card",
    label: "Stat Card",
    description: "Single metric with label",
    icon: "Hash",
    defaultColSpan: 2,
    defaultRowSpan: 1,
    minColSpan: 1,
    minRowSpan: 1,
  },
  {
    type: "stat-trend",
    label: "Trend Stat",
    description: "Metric with trend indicator",
    icon: "TrendingUp",
    defaultColSpan: 3,
    defaultRowSpan: 1,
    minColSpan: 2,
    minRowSpan: 1,
  },
  {
    type: "list-recent",
    label: "Recent Items",
    description: "List of recent audits or events",
    icon: "Clock",
    defaultColSpan: 3,
    defaultRowSpan: 2,
    minColSpan: 2,
    minRowSpan: 1,
  },
  {
    type: "list-top",
    label: "Top Items",
    description: "Ranked list of top items",
    icon: "Trophy",
    defaultColSpan: 3,
    defaultRowSpan: 2,
    minColSpan: 2,
    minRowSpan: 1,
  },
  {
    type: "table",
    label: "Data Table",
    description: "Tabular data display",
    icon: "Table",
    defaultColSpan: 6,
    defaultRowSpan: 2,
    minColSpan: 3,
    minRowSpan: 1,
  },
  {
    type: "text",
    label: "Text Block",
    description: "Custom text or markdown",
    icon: "Type",
    defaultColSpan: 4,
    defaultRowSpan: 1,
    minColSpan: 1,
    minRowSpan: 1,
  },
];

/* ------------------------------------------------------------------ */
/*  Grid helpers                                                      */
/* ------------------------------------------------------------------ */

function snapToGrid(
  value: number,
  gridSize: number,
): number {
  return Math.round(value / gridSize) * gridSize;
}

function generateWidgetId(): string {
  return `w_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/* ------------------------------------------------------------------ */
/*  Layout persistence                                                */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "chetana-dashboard-layouts";

export function saveLayout(layout: DashboardLayout): void {
  if (typeof window === "undefined") return;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    stored[layout.id] = { ...layout, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage unavailable
  }
}

export function loadLayout(id: string): DashboardLayout | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return stored[id] ?? null;
  } catch {
    return null;
  }
}

export function listSavedLayouts(): DashboardLayout[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return Object.values(stored) as DashboardLayout[];
  } catch {
    return [];
  }
}

export function deleteLayout(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    delete stored[id];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage unavailable
  }
}

/**
 * Create a default empty layout.
 */
export function createDefaultLayout(name: string = "My Dashboard"): DashboardLayout {
  return {
    id: `layout_${Date.now().toString(36)}`,
    name,
    columns: 12,
    rowHeight: 120,
    widgets: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/*  Responsive adaptation                                             */
/* ------------------------------------------------------------------ */

export function adaptLayoutForWidth(
  layout: DashboardLayout,
  containerWidth: number,
): DashboardLayout {
  if (containerWidth >= 1024) return layout; // Desktop: no change

  const adapted = { ...layout, widgets: [...layout.widgets] };

  if (containerWidth >= 640) {
    // Tablet: max 6 columns
    adapted.columns = 6;
    adapted.widgets = layout.widgets.map((w) => ({
      ...w,
      colSpan: Math.min(w.colSpan, 6),
      col: Math.min(w.col, 6 - Math.min(w.colSpan, 6)),
    }));
  } else {
    // Mobile: single column stack
    adapted.columns = 1;
    let currentRow = 0;
    adapted.widgets = layout.widgets.map((w) => {
      const widget = { ...w, colSpan: 1, col: 0, row: currentRow };
      currentRow += w.rowSpan;
      return widget;
    });
  }

  return adapted;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function DashboardBuilder({
  layout,
  onLayoutChange,
  renderWidget,
  editable = true,
  className,
}: DashboardBuilderProps) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [resizing, setResizing] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const cellWidth = useMemo(() => {
    if (!gridRef.current) return 80;
    return gridRef.current.clientWidth / layout.columns;
  }, [layout.columns]);

  const maxRow = useMemo(() => {
    if (layout.widgets.length === 0) return 4;
    return Math.max(
      ...layout.widgets.map((w) => w.row + w.rowSpan),
      4,
    );
  }, [layout.widgets]);

  const updateWidget = useCallback(
    (id: string, updates: Partial<WidgetConfig>) => {
      const newWidgets = layout.widgets.map((w) =>
        w.id === id ? { ...w, ...updates } : w,
      );
      onLayoutChange({
        ...layout,
        widgets: newWidgets,
        updatedAt: new Date().toISOString(),
      });
    },
    [layout, onLayoutChange],
  );

  const removeWidget = useCallback(
    (id: string) => {
      onLayoutChange({
        ...layout,
        widgets: layout.widgets.filter((w) => w.id !== id),
        updatedAt: new Date().toISOString(),
      });
      if (selectedWidget === id) setSelectedWidget(null);
    },
    [layout, onLayoutChange, selectedWidget],
  );

  const addWidget = useCallback(
    (entry: WidgetCatalogEntry) => {
      const newWidget: WidgetConfig = {
        id: generateWidgetId(),
        type: entry.type,
        title: entry.label,
        colSpan: entry.defaultColSpan,
        rowSpan: entry.defaultRowSpan,
        col: 0,
        row: maxRow,
        settings: {},
      };

      onLayoutChange({
        ...layout,
        widgets: [...layout.widgets, newWidget],
        updatedAt: new Date().toISOString(),
      });
      setShowCatalog(false);
    },
    [layout, onLayoutChange, maxRow],
  );

  const handleDragStart = useCallback(
    (widgetId: string, e: React.MouseEvent) => {
      if (!editable) return;
      e.preventDefault();
      setDragging(widgetId);

      const widget = layout.widgets.find((w) => w.id === widgetId);
      if (!widget || !gridRef.current) return;

      const gridRect = gridRef.current.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const startCol = widget.col;
      const startRow = widget.row;

      const handleMove = (me: MouseEvent) => {
        const dx = me.clientX - startX;
        const dy = me.clientY - startY;

        const colDelta = Math.round(dx / cellWidth);
        const rowDelta = Math.round(dy / layout.rowHeight);

        const newCol = Math.max(
          0,
          Math.min(layout.columns - widget.colSpan, startCol + colDelta),
        );
        const newRow = Math.max(0, startRow + rowDelta);

        updateWidget(widgetId, { col: newCol, row: newRow });
      };

      const handleUp = () => {
        setDragging(null);
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
      };

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    },
    [editable, layout, cellWidth, updateWidget],
  );

  const handleResizeStart = useCallback(
    (widgetId: string, e: React.MouseEvent) => {
      if (!editable) return;
      e.preventDefault();
      e.stopPropagation();
      setResizing(widgetId);

      const widget = layout.widgets.find((w) => w.id === widgetId);
      if (!widget) return;

      const catalog = WIDGET_CATALOG.find((c) => c.type === widget.type);
      const minCol = catalog?.minColSpan ?? 1;
      const minRow = catalog?.minRowSpan ?? 1;

      const startX = e.clientX;
      const startY = e.clientY;
      const startColSpan = widget.colSpan;
      const startRowSpan = widget.rowSpan;

      const handleMove = (me: MouseEvent) => {
        const dx = me.clientX - startX;
        const dy = me.clientY - startY;

        const colDelta = Math.round(dx / cellWidth);
        const rowDelta = Math.round(dy / layout.rowHeight);

        const newColSpan = Math.max(
          minCol,
          Math.min(layout.columns - widget.col, startColSpan + colDelta),
        );
        const newRowSpan = Math.max(minRow, startRowSpan + rowDelta);

        updateWidget(widgetId, { colSpan: newColSpan, rowSpan: newRowSpan });
      };

      const handleUp = () => {
        setResizing(null);
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
      };

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    },
    [editable, layout, cellWidth, updateWidget],
  );

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Toolbar */}
      {editable && (
        <div className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.02] px-4 py-2">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-neutral-200">
              {layout.name}
            </h3>
            <span className="text-xs text-neutral-500">
              {layout.widgets.length} widget{layout.widgets.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCatalog(!showCatalog)}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-white/[0.08]"
            >
              + Add Widget
            </button>
            <button
              type="button"
              onClick={() => saveLayout(layout)}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-white/[0.08]"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Widget catalog dropdown */}
      {showCatalog && editable && (
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-neutral-900 p-3">
          {WIDGET_CATALOG.map((entry) => (
            <button
              key={entry.type}
              type="button"
              onClick={() => addWidget(entry)}
              className="flex flex-col items-start gap-1 rounded-lg border border-white/8 bg-white/[0.02] p-3 text-left transition-colors hover:border-white/15 hover:bg-white/[0.06]"
            >
              <span className="text-xs font-semibold text-neutral-200">
                {entry.label}
              </span>
              <span className="text-[10px] text-neutral-500">
                {entry.description}
              </span>
              <span className="text-[10px] text-neutral-600">
                {entry.defaultColSpan}x{entry.defaultRowSpan}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div
        ref={gridRef}
        className="relative w-full"
        style={{
          minHeight: maxRow * layout.rowHeight,
        }}
      >
        {/* Grid guide (visible when editing) */}
        {editable && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
              `,
              backgroundSize: `${100 / layout.columns}% ${layout.rowHeight}px`,
            }}
          />
        )}

        {/* Widgets */}
        {layout.widgets.map((widget) => {
          const isDragging = dragging === widget.id;
          const isResizing = resizing === widget.id;
          const isSelected = selectedWidget === widget.id;

          return (
            <div
              key={widget.id}
              className={cn(
                "absolute rounded-lg border transition-shadow",
                editable
                  ? "cursor-move border-white/10 hover:border-white/20"
                  : "border-white/8",
                isDragging && "z-20 shadow-2xl opacity-80",
                isResizing && "z-20",
                isSelected && "ring-1 ring-blue-500/50",
              )}
              style={{
                left: `${(widget.col / layout.columns) * 100}%`,
                top: widget.row * layout.rowHeight,
                width: `${(widget.colSpan / layout.columns) * 100}%`,
                height: widget.rowSpan * layout.rowHeight - 4,
                padding: 2,
              }}
              onClick={() => editable && setSelectedWidget(widget.id)}
              onMouseDown={(e) => editable && handleDragStart(widget.id, e)}
            >
              <div className="flex h-full flex-col overflow-hidden rounded-md bg-white/[0.02]">
                {/* Widget header */}
                <div className="flex items-center justify-between border-b border-white/5 px-3 py-1.5">
                  <span className="text-[11px] font-semibold text-neutral-300 truncate">
                    {widget.title}
                  </span>
                  {editable && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeWidget(widget.id);
                      }}
                      className="ml-2 text-[10px] text-neutral-600 hover:text-red-400 transition-colors"
                    >
                      x
                    </button>
                  )}
                </div>

                {/* Widget content */}
                <div className="flex-1 overflow-auto p-2">
                  {renderWidget(widget)}
                </div>
              </div>

              {/* Resize handle */}
              {editable && (
                <div
                  className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize"
                  onMouseDown={(e) => handleResizeStart(widget.id, e)}
                >
                  <svg
                    width={12}
                    height={12}
                    viewBox="0 0 12 12"
                    className="absolute bottom-1 right-1 text-neutral-600"
                  >
                    <path
                      d="M10 2L2 10M10 6L6 10M10 10L10 10"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
