"use client";

import { useState, useCallback, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WizardStep {
  /** Step identifier. */
  id: string;
  /** Step label shown in the progress bar. */
  label: string;
  /** Validate the current step before proceeding. Return null/undefined if valid, or an error message string. */
  validate?: () => string | null | undefined;
  /** The content to render for this step. */
  content: ReactNode;
}

export interface AuditWizardProps {
  /** The wizard steps. Should be exactly 4 for the audit flow. */
  steps: WizardStep[];
  /** Called when the user completes the final step. */
  onComplete: () => void | Promise<void>;
  /** Optional className. */
  className?: string;
}

/**
 * Multi-step audit wizard (Issue #252).
 * Guides users through a 4-step process: model, probes, params, review.
 */
export function AuditWizard({ steps, onComplete, className }: AuditWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const step = steps[currentStep];

  const validateCurrentStep = useCallback((): boolean => {
    const validateFn = step?.validate;
    if (!validateFn) return true;

    const error = validateFn();
    if (error) {
      setErrors((prev) => ({ ...prev, [currentStep]: error }));
      return false;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next[currentStep];
      return next;
    });
    return true;
  }, [step, currentStep]);

  const handleNext = useCallback(async () => {
    if (!validateCurrentStep()) return;

    if (isLastStep) {
      setIsSubmitting(true);
      try {
        await onComplete();
      } catch (err) {
        setErrors((prev) => ({
          ...prev,
          [currentStep]: err instanceof Error ? err.message : "Submission failed",
        }));
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setCurrentStep((s) => s + 1);
    }
  }, [validateCurrentStep, isLastStep, onComplete, currentStep]);

  const handleBack = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep((s) => s - 1);
    }
  }, [isFirstStep]);

  const goToStep = useCallback(
    (index: number) => {
      // Only allow going back to previously visited steps
      if (index < currentStep) {
        setCurrentStep(index);
      }
    },
    [currentStep]
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Progress bar */}
      <div className="flex items-center gap-1" role="navigation" aria-label="Wizard progress">
        {steps.map((s, i) => {
          const isComplete = i < currentStep;
          const isCurrent = i === currentStep;
          const isClickable = i < currentStep;

          return (
            <div key={s.id} className="flex flex-1 items-center">
              {/* Step indicator */}
              <button
                onClick={() => goToStep(i)}
                disabled={!isClickable}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all",
                  isComplete &&
                    "border-violet-500 bg-violet-500 text-white",
                  isCurrent &&
                    "border-violet-500 bg-violet-500/20 text-violet-300",
                  !isComplete &&
                    !isCurrent &&
                    "border-white/15 bg-transparent text-white/30",
                  isClickable && "cursor-pointer hover:border-violet-400"
                )}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Step ${i + 1}: ${s.label}`}
              >
                {isComplete ? <Check className="h-4 w-4" /> : i + 1}
              </button>

              {/* Step label */}
              <span
                className={cn(
                  "ml-2 hidden text-xs font-medium sm:inline",
                  isCurrent ? "text-white" : "text-white/40"
                )}
              >
                {s.label}
              </span>

              {/* Connector line */}
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-3 h-px flex-1",
                    isComplete ? "bg-violet-500" : "bg-white/10"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="min-h-[300px]">
        {step?.content}

        {/* Validation error */}
        {errors[currentStep] && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
            <p className="text-sm text-red-300">{errors[currentStep]}</p>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between border-t border-white/10 pt-4">
        <button
          onClick={handleBack}
          disabled={isFirstStep}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
            isFirstStep
              ? "cursor-not-allowed text-white/20"
              : "text-white/70 hover:bg-white/5 hover:text-white"
          )}
          aria-label="Go to previous step"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        <div className="text-xs text-white/30">
          Step {currentStep + 1} of {steps.length}
        </div>

        <button
          onClick={handleNext}
          disabled={isSubmitting}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors",
            isSubmitting
              ? "cursor-not-allowed bg-violet-500/40"
              : "bg-violet-600 hover:bg-violet-500"
          )}
          aria-label={isLastStep ? "Complete wizard" : "Go to next step"}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : isLastStep ? (
            <>
              Complete
              <Check className="h-4 w-4" />
            </>
          ) : (
            <>
              Next
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
