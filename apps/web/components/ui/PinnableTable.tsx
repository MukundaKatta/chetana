"use client";

import {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
  type CSSProperties,
} from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type PinPosition = "left" | "right" | "none";

export interface ColumnDef<T> {
  id: string;
  header: string;
  accessor: (row: T) => ReactNode;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  pin?: PinPosition;
  sortable?: boolean;
  visible?: boolean;
}

export interface PinnableTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  rowKey: (row: T) => string;
  className?: string;
  stickyHeader?: boolean;
  onColumnResize?: (columnId: string, width: number) => void;
  onPinChange?: (columnId: string, pin: PinPosition) => void;
}

interface ColumnState {
  id: string;
  width: number;
  pin: PinPosition;
  visible: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function PinnableTable<T>({
  columns,
  data,
  rowKey,
  className,
  stickyHeader = true,
  onColumnResize,
  onPinChange,
}: PinnableTableProps<T>) {
  const [columnStates, setColumnStates] = useState<ColumnState[]>(() =>
    columns.map((col) => ({
      id: col.id,
      width: col.width ?? 150,
      pin: col.pin ?? "none",
      visible: col.visible !== false,
    })),
  );

  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [resizingCol, setResizingCol] = useState<string | null>(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const getColState = useCallback(
    (id: string) => columnStates.find((c) => c.id === id),
    [columnStates],
  );

  const visibleColumns = useMemo(
    () => columns.filter((col) => getColState(col.id)?.visible !== false),
    [columns, getColState],
  );

  const leftPinned = useMemo(
    () => visibleColumns.filter((col) => getColState(col.id)?.pin === "left"),
    [visibleColumns, getColState],
  );

  const rightPinned = useMemo(
    () => visibleColumns.filter((col) => getColState(col.id)?.pin === "right"),
    [visibleColumns, getColState],
  );

  const unpinned = useMemo(
    () => visibleColumns.filter((col) => getColState(col.id)?.pin === "none"),
    [visibleColumns, getColState],
  );

  const orderedColumns = useMemo(
    () => [...leftPinned, ...unpinned, ...rightPinned],
    [leftPinned, unpinned, rightPinned],
  );

  // Compute sticky left/right offsets
  const getStickyStyle = useCallback(
    (col: ColumnDef<T>): CSSProperties => {
      const state = getColState(col.id);
      if (!state || state.pin === "none") return {};

      if (state.pin === "left") {
        let offset = 0;
        for (const lp of leftPinned) {
          if (lp.id === col.id) break;
          offset += getColState(lp.id)?.width ?? 150;
        }
        return {
          position: "sticky",
          left: offset,
          zIndex: 20,
          backgroundColor: "inherit",
        };
      }

      if (state.pin === "right") {
        let offset = 0;
        for (let i = rightPinned.length - 1; i >= 0; i--) {
          if (rightPinned[i].id === col.id) break;
          offset += getColState(rightPinned[i].id)?.width ?? 150;
        }
        return {
          position: "sticky",
          right: offset,
          zIndex: 20,
          backgroundColor: "inherit",
        };
      }

      return {};
    },
    [getColState, leftPinned, rightPinned],
  );

  // Resize handling
  const handleResizeStart = useCallback(
    (colId: string, e: React.MouseEvent) => {
      e.preventDefault();
      setResizingCol(colId);
      resizeStartX.current = e.clientX;
      resizeStartWidth.current = getColState(colId)?.width ?? 150;
    },
    [getColState],
  );

  useEffect(() => {
    if (!resizingCol) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartX.current;
      const col = columns.find((c) => c.id === resizingCol);
      const minW = col?.minWidth ?? 60;
      const maxW = col?.maxWidth ?? 600;
      const newWidth = Math.max(minW, Math.min(maxW, resizeStartWidth.current + delta));

      setColumnStates((prev) =>
        prev.map((cs) => (cs.id === resizingCol ? { ...cs, width: newWidth } : cs)),
      );
    };

    const handleMouseUp = () => {
      if (resizingCol) {
        const state = columnStates.find((cs) => cs.id === resizingCol);
        if (state) onColumnResize?.(resizingCol, state.width);
      }
      setResizingCol(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingCol, columnStates, columns, onColumnResize]);

  const togglePin = useCallback(
    (colId: string) => {
      setColumnStates((prev) =>
        prev.map((cs) => {
          if (cs.id !== colId) return cs;
          const nextPin: PinPosition =
            cs.pin === "none" ? "left" : cs.pin === "left" ? "right" : "none";
          onPinChange?.(colId, nextPin);
          return { ...cs, pin: nextPin };
        }),
      );
    },
    [onPinChange],
  );

  const toggleVisibility = useCallback((colId: string) => {
    setColumnStates((prev) =>
      prev.map((cs) => (cs.id === colId ? { ...cs, visible: !cs.visible } : cs)),
    );
  }, []);

  return (
    <div className={cn("relative", className)}>
      {/* Column visibility toggle */}
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={() => setShowColumnMenu((v) => !v)}
          className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-white/[0.08] transition-colors"
        >
          Columns
        </button>
        {showColumnMenu && (
          <div className="absolute right-0 top-10 z-50 rounded-lg border border-white/10 bg-neutral-900 p-2 shadow-xl">
            {columns.map((col) => {
              const state = getColState(col.id);
              return (
                <label
                  key={col.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs text-neutral-300 hover:bg-white/[0.06]"
                >
                  <input
                    type="checkbox"
                    checked={state?.visible !== false}
                    onChange={() => toggleVisibility(col.id)}
                    className="accent-blue-500"
                  />
                  {col.header}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Scrollable table container */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto rounded-lg border border-white/10"
      >
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr
              className={cn(
                "bg-neutral-900/95 backdrop-blur-sm",
                stickyHeader && "sticky top-0 z-30",
              )}
            >
              {orderedColumns.map((col) => {
                const state = getColState(col.id);
                return (
                  <th
                    key={col.id}
                    className="relative whitespace-nowrap border-b border-white/10 px-3 py-2.5 text-left text-xs font-semibold text-neutral-400 bg-neutral-900"
                    style={{
                      width: state?.width,
                      minWidth: col.minWidth ?? 60,
                      ...getStickyStyle(col),
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span className="truncate">{col.header}</span>
                      <button
                        type="button"
                        onClick={() => togglePin(col.id)}
                        className={cn(
                          "ml-1 shrink-0 rounded px-1 text-[10px] leading-tight transition-colors",
                          state?.pin !== "none"
                            ? "bg-blue-500/20 text-blue-400"
                            : "text-neutral-600 hover:text-neutral-400",
                        )}
                        title={`Pin: ${state?.pin ?? "none"}`}
                      >
                        {state?.pin === "left" ? "L" : state?.pin === "right" ? "R" : "·"}
                      </button>
                    </div>
                    {/* Resize handle */}
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500/50"
                      onMouseDown={(e) => handleResizeStart(col.id, e)}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-white/5 transition-colors hover:bg-white/[0.03]"
              >
                {orderedColumns.map((col) => {
                  const state = getColState(col.id);
                  return (
                    <td
                      key={col.id}
                      className="whitespace-nowrap px-3 py-2 text-neutral-300 bg-inherit"
                      style={{
                        width: state?.width,
                        minWidth: col.minWidth ?? 60,
                        ...getStickyStyle(col),
                      }}
                    >
                      {col.accessor(row)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
