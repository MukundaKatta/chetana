"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface StreamingResponseProps {
  text: string;
  isStreaming: boolean;
}

export function StreamingResponse({ text, isStreaming }: StreamingResponseProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as new text arrives
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [text]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative max-h-80 overflow-y-auto rounded-xl border border-white/10 bg-gray-950/60 p-4 font-mono text-sm leading-relaxed text-gray-200",
        isStreaming && "pr-6",
      )}
    >
      {text.length === 0 && isStreaming ? (
        <span className="text-gray-500">Waiting for response...</span>
      ) : (
        <span className="streaming-text whitespace-pre-wrap break-words">
          {text}
        </span>
      )}

      {/* Blinking cursor */}
      {isStreaming && (
        <span
          className="ml-0.5 inline-block h-4 w-[2px] translate-y-[2px] animate-pulse bg-cyan-400"
          aria-hidden="true"
        />
      )}

      <style jsx>{`
        .streaming-text {
          animation: fadeIn 0.1s ease-in;
        }
        @keyframes fadeIn {
          from {
            opacity: 0.6;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
