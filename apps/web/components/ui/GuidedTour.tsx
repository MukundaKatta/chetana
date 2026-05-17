"use client";

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  useRef,
  type ReactNode,
} from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TourStep {
  /** CSS selector for the target element to highlight */
  target: string;
  /** Title of the tooltip */
  title: string;
  /** Description text */
  content: string;
  /** Preferred placement of the tooltip */
  placement?: "top" | "bottom" | "left" | "right";
}

interface TourContextValue {
  isActive: boolean;
  currentStep: number;
  steps: TourStep[];
  start: (steps: TourStep[]) => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  goTo: (index: number) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return ctx;
}

const STORAGE_KEY = "chetana-tour-completed";

function getCompletedTours(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function markTourCompleted(tourId: string) {
  const completed = getCompletedTours();
  if (!completed.includes(tourId)) {
    completed.push(tourId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
  }
}

export function isTourCompleted(tourId: string): boolean {
  return getCompletedTours().includes(tourId);
}

interface TooltipPosition {
  top: number;
  left: number;
}

function computeTooltipPosition(
  targetRect: DOMRect,
  placement: "top" | "bottom" | "left" | "right"
): TooltipPosition {
  const gap = 12;
  switch (placement) {
    case "top":
      return {
        top: targetRect.top + window.scrollY - gap,
        left: targetRect.left + window.scrollX + targetRect.width / 2,
      };
    case "bottom":
      return {
        top: targetRect.bottom + window.scrollY + gap,
        left: targetRect.left + window.scrollX + targetRect.width / 2,
      };
    case "left":
      return {
        top: targetRect.top + window.scrollY + targetRect.height / 2,
        left: targetRect.left + window.scrollX - gap,
      };
    case "right":
      return {
        top: targetRect.top + window.scrollY + targetRect.height / 2,
        left: targetRect.right + window.scrollX + gap,
      };
  }
}

const placementTranslate: Record<string, string> = {
  top: "-translate-x-1/2 -translate-y-full",
  bottom: "-translate-x-1/2",
  left: "-translate-x-full -translate-y-1/2",
  right: "-translate-y-1/2",
};

export function TourProvider({
  tourId = "default",
  children,
}: {
  tourId?: string;
  children: ReactNode;
}) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const start = useCallback((tourSteps: TourStep[]) => {
    setSteps(tourSteps);
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const finish = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    setSteps([]);
    markTourCompleted(tourId);
  }, [tourId]);

  const next = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      finish();
    }
  }, [currentStep, steps.length, finish]);

  const prev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  const goTo = useCallback(
    (index: number) => {
      if (index >= 0 && index < steps.length) {
        setCurrentStep(index);
      }
    },
    [steps.length]
  );

  // Track the target element's position
  useEffect(() => {
    if (!isActive || steps.length === 0) {
      setTargetRect(null);
      return;
    }

    const step = steps[currentStep];
    if (!step) return;

    const el = document.querySelector(step.target);
    if (!el) {
      setTargetRect(null);
      return;
    }

    const update = () => {
      setTargetRect(el.getBoundingClientRect());
    };

    update();
    el.scrollIntoView({ behavior: "smooth", block: "center" });

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [isActive, currentStep, steps]);

  const step = steps[currentStep];
  const placement = step?.placement || "bottom";

  const tooltipPos =
    targetRect && step ? computeTooltipPosition(targetRect, placement) : null;

  return (
    <TourContext.Provider
      value={{ isActive, currentStep, steps, start, next, prev, skip, goTo }}
    >
      {children}

      {isActive && targetRect && step && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-[9998]"
            style={{
              background: "rgba(0,0,0,0.5)",
              // Cut out the target element with a box-shadow trick
              clipPath: `polygon(
                0% 0%, 0% 100%,
                ${targetRect.left - 4}px 100%,
                ${targetRect.left - 4}px ${targetRect.top - 4}px,
                ${targetRect.right + 4}px ${targetRect.top - 4}px,
                ${targetRect.right + 4}px ${targetRect.bottom + 4}px,
                ${targetRect.left - 4}px ${targetRect.bottom + 4}px,
                ${targetRect.left - 4}px 100%,
                100% 100%, 100% 0%
              )`,
            }}
            onClick={skip}
            aria-hidden="true"
          />

          {/* Highlight ring around target */}
          <div
            className="fixed z-[9999] rounded-lg border-2 border-blue-400 pointer-events-none"
            style={{
              top: targetRect.top - 4,
              left: targetRect.left - 4,
              width: targetRect.width + 8,
              height: targetRect.height + 8,
            }}
          />

          {/* Tooltip */}
          {tooltipPos && (
            <div
              ref={tooltipRef}
              role="dialog"
              aria-label={step.title}
              className={cn(
                "absolute z-[10000] w-80 rounded-xl border border-white/10 bg-gray-900 p-4 shadow-2xl",
                placementTranslate[placement]
              )}
              style={{
                top: tooltipPos.top,
                left: tooltipPos.left,
              }}
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">
                  {step.title}
                </h3>
                <button
                  onClick={skip}
                  className="shrink-0 rounded p-0.5 text-white/50 hover:bg-white/10 hover:text-white"
                  aria-label="Close tour"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mb-4 text-sm text-white/70">{step.content}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">
                  {currentStep + 1} / {steps.length}
                </span>
                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <button
                      onClick={prev}
                      className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
                    >
                      <ChevronLeft className="h-3 w-3" />
                      Back
                    </button>
                  )}
                  <button
                    onClick={next}
                    className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
                  >
                    {currentStep === steps.length - 1 ? "Finish" : "Next"}
                    {currentStep < steps.length - 1 && (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </TourContext.Provider>
  );
}
