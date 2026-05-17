"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface AnimatedScoreProps {
  /** Target value to animate toward. */
  value: number;
  /** Animation duration in ms (default 1200). */
  duration?: number;
  /**
   * Format the displayed number.
   * Defaults to `(n) => n.toFixed(1)`.
   */
  format?: (value: number) => string;
  /** Optional prefix shown before the number (e.g. "Φ = "). */
  prefix?: string;
  /** Optional suffix shown after the number (e.g. "%"). */
  suffix?: string;
  /** Extra classes applied to the outer <span>. */
  className?: string;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function AnimatedScore({
  value,
  duration = 1200,
  format = (n) => n.toFixed(1),
  prefix = "",
  suffix = "",
  className,
}: AnimatedScoreProps) {
  const [display, setDisplay] = useState(format(0));
  const startRef = useRef<number | null>(null);
  const prevValueRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = prevValueRef.current;
    const to = value;

    if (from === to) {
      setDisplay(format(to));
      return;
    }

    startRef.current = null;

    const animate = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const current = from + (to - from) * eased;

      setDisplay(format(current));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        prevValueRef.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration, format]);

  return (
    <span className={cn("tabular-nums", className)}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
