"use client";

import { type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepState = "completed" | "current" | "upcoming";

export interface Step {
  id: string;
  label: string;
  description?: string;
}

export interface ProgressStepsProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function ProgressSteps({
  steps,
  currentStep,
  className,
}: ProgressStepsProps) {
  const getStepState = (index: number): StepState => {
    if (index < currentStep) return "completed";
    if (index === currentStep) return "current";
    return "upcoming";
  };

  return (
    <div className={cn("w-full", className)} role="group" aria-label="Progress">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const state = getStepState(index);
          const isLast = index === steps.length - 1;

          return (
            <div
              key={step.id}
              className={cn("flex items-center", !isLast && "flex-1")}
            >
              {/* Step dot */}
              <div className="flex flex-col items-center">
                <div
                  aria-current={state === "current" ? "step" : undefined}
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-300",
                    state === "completed" &&
                      "border-green-500 bg-green-500 text-white",
                    state === "current" &&
                      "border-blue-500 bg-blue-500/20 text-blue-400 ring-4 ring-blue-500/20",
                    state === "upcoming" &&
                      "border-white/20 bg-white/5 text-white/40"
                  )}
                >
                  {state === "completed" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "mt-2 text-center text-xs font-medium transition-colors",
                    state === "completed" && "text-green-400",
                    state === "current" && "text-white",
                    state === "upcoming" && "text-white/40"
                  )}
                >
                  {step.label}
                </span>

                {step.description && (
                  <span
                    className={cn(
                      "mt-0.5 text-center text-[10px]",
                      state === "upcoming" ? "text-white/25" : "text-white/50"
                    )}
                  >
                    {step.description}
                  </span>
                )}
              </div>

              {/* Connecting line */}
              {!isLast && (
                <div className="mx-3 h-0.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500 ease-in-out",
                      state === "completed"
                        ? "w-full bg-green-500"
                        : state === "current"
                          ? "w-1/2 bg-blue-500"
                          : "w-0 bg-white/20"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
