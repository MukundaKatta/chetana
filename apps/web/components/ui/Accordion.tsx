"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionContextValue {
  openItems: Set<string>;
  toggle: (id: string) => void;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

function useAccordionContext(): AccordionContextValue {
  const ctx = useContext(AccordionContext);
  if (!ctx) {
    throw new Error("AccordionItem must be used within an Accordion");
  }
  return ctx;
}

export interface AccordionProps {
  children: ReactNode;
  mode?: "single" | "multiple";
  defaultOpen?: string[];
  className?: string;
}

export function Accordion({
  children,
  mode = "multiple",
  defaultOpen = [],
  className,
}: AccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(
    new Set(defaultOpen)
  );

  const toggle = useCallback(
    (id: string) => {
      setOpenItems((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          if (mode === "single") {
            next.clear();
          }
          next.add(id);
        }
        return next;
      });
    },
    [mode]
  );

  return (
    <AccordionContext.Provider value={{ openItems, toggle }}>
      <div className={cn("divide-y divide-white/10", className)}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

export interface AccordionItemProps {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function AccordionItem({
  id,
  title,
  children,
  className,
  disabled = false,
}: AccordionItemProps) {
  const { openItems, toggle } = useAccordionContext();
  const isOpen = openItems.has(id);
  const contentRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState<number>(0);

  useEffect(() => {
    if (contentRef.current) {
      setMaxHeight(contentRef.current.scrollHeight);
    }
  }, [isOpen, children]);

  return (
    <div className={cn("overflow-hidden", className)}>
      <button
        onClick={() => {
          if (!disabled) toggle(id);
        }}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-controls={`accordion-panel-${id}`}
        id={`accordion-header-${id}`}
        className={cn(
          "flex w-full items-center justify-between py-3 text-left text-sm font-medium text-white transition-colors hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
          disabled && "cursor-not-allowed opacity-40"
        )}
      >
        <span>{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-white/50 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <div
        id={`accordion-panel-${id}`}
        role="region"
        aria-labelledby={`accordion-header-${id}`}
        style={{ maxHeight: isOpen ? `${maxHeight}px` : "0px" }}
        className="overflow-hidden transition-[max-height] duration-200 ease-in-out"
      >
        <div ref={contentRef} className="pb-3 text-sm text-white/60">
          {children}
        </div>
      </div>
    </div>
  );
}
