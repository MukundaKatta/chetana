"use client";

import { useMemo } from "react";
import { buildTraceFlow } from "@chetana/scorer";
import { cn } from "@/lib/utils";

/**
 * Reasoning-trace flow visualization (issue #620).
 *
 * Renders a model's reasoning trace as an ordered sequence of steps, with
 * self-referential / revision steps highlighted, using the `buildTraceFlow`
 * transform from @chetana/scorer.
 */
export function ReasoningTraceFlow({
  trace,
  className,
}: {
  trace: string;
  className?: string;
}) {
  const nodes = useMemo(() => buildTraceFlow(trace), [trace]);

  if (nodes.length === 0) {
    return <p className={cn("text-sm text-gray-500", className)}>No reasoning trace.</p>;
  }

  return (
    <ol className={cn("space-y-2", className)}>
      {nodes.map((node) => (
        <li
          key={node.index}
          className={cn(
            "flex gap-3 rounded-lg border p-3 text-sm",
            node.selfReferential
              ? "border-amber-500/30 bg-amber-500/5"
              : "border-white/8 bg-white/[0.02]"
          )}
        >
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-medium text-gray-300">
            {node.index + 1}
          </span>
          <div>
            <p className="text-gray-200">{node.text}</p>
            {node.selfReferential && (
              <span className="mt-1 inline-block text-[10px] font-medium uppercase tracking-wide text-amber-400">
                self-referential / revision
              </span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
