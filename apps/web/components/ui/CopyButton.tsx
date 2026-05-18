"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface UseCopyToClipboardReturn {
  copied: boolean;
  copy: (text: string) => Promise<void>;
}

export function useCopyToClipboard(
  duration: number = 2000
): UseCopyToClipboardReturn {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), duration);
      } catch {
        // Fallback for older browsers
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), duration);
      }
    },
    [duration]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { copied, copy };
}

export interface CopyButtonProps {
  text: string;
  className?: string;
  label?: string;
}

export function CopyButton({
  text,
  className,
  label = "Copy to clipboard",
}: CopyButtonProps) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <div className="relative inline-block">
      <button
        onClick={() => copy(text)}
        className={cn(
          "relative inline-flex items-center justify-center rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
          copied && "text-green-400 hover:text-green-400",
          className
        )}
        aria-label={copied ? "Copied!" : label}
      >
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-all duration-200",
            copied ? "scale-100 opacity-100" : "scale-75 opacity-0"
          )}
        >
          <Check className="h-4 w-4" />
        </span>
        <span
          className={cn(
            "transition-all duration-200",
            copied ? "scale-75 opacity-0" : "scale-100 opacity-100"
          )}
        >
          <Copy className="h-4 w-4" />
        </span>
      </button>

      {/* Tooltip */}
      {copied && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-800 px-2 py-1 text-xs font-medium text-green-400 shadow-lg animate-in fade-in zoom-in-95">
          Copied!
        </span>
      )}
    </div>
  );
}
