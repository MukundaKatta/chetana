"use client";

import {
  useState,
  useRef,
  useCallback,
  type ReactNode,
  type DragEvent,
} from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DragDropItem {
  id: string;
  [key: string]: unknown;
}

export interface UseDragAndDropOptions<T extends DragDropItem> {
  /** The list of items. */
  items: T[];
  /** Called when items are reordered. */
  onReorder: (items: T[]) => void;
}

export interface UseDragAndDropReturn {
  /** The index of the item currently being dragged. */
  dragIndex: number | null;
  /** The index of the current drop target. */
  dropIndex: number | null;
  /** Start dragging from an index. */
  handleDragStart: (index: number) => (e: DragEvent) => void;
  /** Handle drag over a target index. */
  handleDragOver: (index: number) => (e: DragEvent) => void;
  /** Handle drop on a target index. */
  handleDrop: (index: number) => (e: DragEvent) => void;
  /** Handle drag end (cleanup). */
  handleDragEnd: () => void;
}

/**
 * Drag and drop reordering hook (Issue #244).
 */
export function useDragAndDrop<T extends DragDropItem>({
  items,
  onReorder,
}: UseDragAndDropOptions<T>): UseDragAndDropReturn {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  const handleDragStart = useCallback(
    (index: number) => (e: DragEvent) => {
      setDragIndex(index);
      dragIndexRef.current = index;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
    },
    []
  );

  const handleDragOver = useCallback(
    (index: number) => (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDropIndex(index);
    },
    []
  );

  const handleDrop = useCallback(
    (index: number) => (e: DragEvent) => {
      e.preventDefault();
      const fromIndex = dragIndexRef.current;
      if (fromIndex === null || fromIndex === index) {
        setDragIndex(null);
        setDropIndex(null);
        return;
      }

      const newItems = [...items];
      const [moved] = newItems.splice(fromIndex, 1);
      newItems.splice(index, 0, moved);
      onReorder(newItems);

      setDragIndex(null);
      setDropIndex(null);
      dragIndexRef.current = null;
    },
    [items, onReorder]
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDropIndex(null);
    dragIndexRef.current = null;
  }, []);

  return {
    dragIndex,
    dropIndex,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  };
}

/**
 * Drag handle component - the visual grip indicator.
 */
export function DragHandle({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "cursor-grab touch-none text-white/25 transition-colors hover:text-white/50 active:cursor-grabbing",
        className
      )}
      aria-hidden="true"
    >
      <GripVertical className="h-4 w-4" />
    </span>
  );
}

/**
 * Drop target indicator - visual feedback for where an item will be placed.
 */
export function DropIndicator({
  active,
  className,
}: {
  active: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-0.5 w-full rounded-full transition-all",
        active ? "bg-violet-500 opacity-100" : "bg-transparent opacity-0",
        className
      )}
      aria-hidden="true"
    />
  );
}

/**
 * Complete draggable list component.
 */
export function DragDropList<T extends DragDropItem>({
  items,
  onReorder,
  renderItem,
  className,
}: {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number, dragHandle: ReactNode) => ReactNode;
  className?: string;
}) {
  const {
    dragIndex,
    dropIndex,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  } = useDragAndDrop({ items, onReorder });

  return (
    <div className={cn("space-y-1", className)} role="list" aria-label="Reorderable list">
      {items.map((item, index) => (
        <div key={item.id} role="listitem">
          <DropIndicator active={dropIndex === index && dragIndex !== index} />
          <div
            draggable
            onDragStart={handleDragStart(index)}
            onDragOver={handleDragOver(index)}
            onDrop={handleDrop(index)}
            onDragEnd={handleDragEnd}
            className={cn(
              "rounded-lg transition-opacity",
              dragIndex === index && "opacity-40"
            )}
          >
            {renderItem(item, index, <DragHandle />)}
          </div>
        </div>
      ))}
      {/* Final drop zone at the bottom */}
      <DropIndicator
        active={dropIndex === items.length && dragIndex !== items.length}
      />
    </div>
  );
}
