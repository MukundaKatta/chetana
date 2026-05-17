"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

export interface ChartLabel {
  /** The full label text. */
  text: string;
  /** Optional value for tooltip display. */
  value?: string | number;
}

export interface ChartLabelsProps {
  /** Labels to render. */
  labels: ChartLabel[];
  /** Available width for the label area in px. */
  containerWidth: number;
  /** Orientation: "horizontal" for X-axis, "vertical" for Y-axis. */
  orientation?: "horizontal" | "vertical";
  /** Maximum characters before truncation. */
  maxChars?: number;
  /** Extra className. */
  className?: string;
}

/** Breakpoints for responsive behavior. */
const SMALL_SCREEN = 480;
const MEDIUM_SCREEN = 768;

/**
 * Responsive chart labels (Issue #284).
 * Auto-rotates on small screens, truncates with ellipsis, and shows
 * the full label in a tooltip on hover.
 */
export function ChartLabels({
  labels,
  containerWidth,
  orientation = "horizontal",
  maxChars,
  className,
}: ChartLabelsProps) {
  const { shouldRotate, fontSize, truncateAt } = useMemo(() => {
    const isSmall = containerWidth < SMALL_SCREEN;
    const isMedium = containerWidth < MEDIUM_SCREEN;

    // Estimate how much horizontal space each label gets
    const labelSpace = containerWidth / Math.max(labels.length, 1);

    return {
      shouldRotate: orientation === "horizontal" && (isSmall || labelSpace < 60),
      fontSize: isSmall ? 9 : isMedium ? 10 : 11,
      truncateAt: maxChars ?? (isSmall ? 6 : isMedium ? 10 : 20),
    };
  }, [containerWidth, labels.length, orientation, maxChars]);

  const truncate = (text: string): string => {
    if (text.length <= truncateAt) return text;
    return text.slice(0, truncateAt - 1) + "…";
  };

  if (orientation === "vertical") {
    return (
      <div className={cn("flex flex-col justify-between", className)}>
        {labels.map((label, i) => (
          <span
            key={i}
            className="truncate text-right text-white/50"
            style={{ fontSize }}
            title={label.text}
          >
            {truncate(label.text)}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full",
        shouldRotate ? "items-start" : "items-center justify-between",
        className
      )}
    >
      {labels.map((label, i) => (
        <span
          key={i}
          className={cn(
            "text-center text-white/50 transition-all",
            shouldRotate && "origin-top-left"
          )}
          style={{
            fontSize,
            ...(shouldRotate
              ? {
                  transform: "rotate(-45deg)",
                  transformOrigin: "top right",
                  whiteSpace: "nowrap",
                  width: 0,
                  display: "inline-block",
                }
              : {
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }),
          }}
          title={label.text}
        >
          {truncate(label.text)}
        </span>
      ))}
    </div>
  );
}

/**
 * Utility to compute optimal label rotation angle based on available space.
 */
export function computeRotation(
  labelCount: number,
  containerWidth: number,
  avgLabelLength: number
): number {
  const charWidth = 7; // approximate px per character
  const spacePerLabel = containerWidth / Math.max(labelCount, 1);
  const requiredSpace = avgLabelLength * charWidth;

  if (spacePerLabel >= requiredSpace) return 0;
  if (spacePerLabel >= requiredSpace * 0.7) return -30;
  if (spacePerLabel >= requiredSpace * 0.4) return -45;
  return -90;
}
