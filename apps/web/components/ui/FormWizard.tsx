"use client";

import {
  useState,
  useCallback,
  useMemo,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface WizardStep {
  /** Unique key for the step. */
  id: string;
  /** Display label shown in the step indicator. */
  label: string;
  /** Optional description shown beneath the label. */
  description?: string;
  /** If true, the step can be skipped. */
  optional?: boolean;
  /** Validation function — return null if valid, or an error message string. */
  validate?: () => string | null;
}

export interface WizardState {
  currentStepIndex: number;
  currentStepId: string;
  steps: WizardStep[];
  /** Per-step data bag. */
  data: Record<string, Record<string, unknown>>;
  /** Per-step validation errors. */
  errors: Record<string, string | null>;
  /** Steps that have been visited. */
  visited: Set<string>;
  /** Steps that have been completed (validated). */
  completed: Set<string>;
  /** Steps that were skipped. */
  skipped: Set<string>;
  isFirstStep: boolean;
  isLastStep: boolean;
  isSummaryStep: boolean;
  progress: number;
}

export interface WizardActions {
  goToStep: (index: number) => void;
  nextStep: () => boolean;
  prevStep: () => void;
  skipStep: () => void;
  setStepData: (stepId: string, data: Record<string, unknown>) => void;
  getStepData: <T = Record<string, unknown>>(stepId: string) => T;
  validateCurrentStep: () => string | null;
  validateAll: () => Record<string, string | null>;
  reset: () => void;
}

interface WizardContextValue {
  state: WizardState;
  actions: WizardActions;
}

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

const WizardContext = createContext<WizardContextValue | null>(null);

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used within a FormWizard");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

export interface FormWizardProps {
  steps: WizardStep[];
  /** Whether to include an auto-generated summary step at the end. */
  showSummary?: boolean;
  /** Called when the final step is submitted. */
  onComplete?: (data: Record<string, Record<string, unknown>>) => void;
  /** Render function for each step body. */
  children: (ctx: WizardContextValue) => ReactNode;
  /** Custom summary renderer. */
  renderSummary?: (data: Record<string, Record<string, unknown>>) => ReactNode;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function FormWizard({
  steps: rawSteps,
  showSummary = true,
  onComplete,
  children,
  renderSummary,
  className,
}: FormWizardProps) {
  const steps = useMemo<WizardStep[]>(() => {
    const base = [...rawSteps];
    if (showSummary) {
      base.push({ id: "__summary__", label: "Review" });
    }
    return base;
  }, [rawSteps, showSummary]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [data, setData] = useState<Record<string, Record<string, unknown>>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [visited, setVisited] = useState<Set<string>>(
    () => new Set([steps[0]?.id]),
  );
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const currentStep = steps[currentIndex];

  /* ---- Validation helpers ---- */
  const validateStep = useCallback(
    (index: number): string | null => {
      const step = steps[index];
      if (!step || step.id === "__summary__") return null;
      if (step.validate) {
        const err = step.validate();
        setErrors((prev) => ({ ...prev, [step.id]: err }));
        return err;
      }
      setErrors((prev) => ({ ...prev, [step.id]: null }));
      return null;
    },
    [steps],
  );

  const validateCurrentStep = useCallback(
    () => validateStep(currentIndex),
    [validateStep, currentIndex],
  );

  const validateAll = useCallback((): Record<string, string | null> => {
    const result: Record<string, string | null> = {};
    for (let i = 0; i < steps.length; i++) {
      result[steps[i].id] = validateStep(i);
    }
    return result;
  }, [steps, validateStep]);

  /* ---- Navigation ---- */
  const goToStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= steps.length) return;
      setCurrentIndex(index);
      setVisited((prev) => new Set([...prev, steps[index].id]));
    },
    [steps],
  );

  const nextStep = useCallback((): boolean => {
    const err = validateStep(currentIndex);
    if (err) return false;

    setCompleted((prev) => new Set([...prev, currentStep.id]));

    if (currentIndex < steps.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setVisited((prev) => new Set([...prev, steps[nextIdx].id]));
    } else {
      // Last step — complete
      onComplete?.(data);
    }

    return true;
  }, [validateStep, currentIndex, currentStep, steps, data, onComplete]);

  const prevStep = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const skipStep = useCallback(() => {
    if (!currentStep.optional) return;
    setSkipped((prev) => new Set([...prev, currentStep.id]));
    if (currentIndex < steps.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setVisited((prev) => new Set([...prev, steps[nextIdx].id]));
    }
  }, [currentStep, currentIndex, steps]);

  /* ---- Data helpers ---- */
  const setStepData = useCallback(
    (stepId: string, stepData: Record<string, unknown>) => {
      setData((prev) => ({
        ...prev,
        [stepId]: { ...(prev[stepId] ?? {}), ...stepData },
      }));
    },
    [],
  );

  const getStepData = useCallback(
    <T = Record<string, unknown>>(stepId: string): T => {
      return (data[stepId] ?? {}) as T;
    },
    [data],
  );

  const reset = useCallback(() => {
    setCurrentIndex(0);
    setData({});
    setErrors({});
    setVisited(new Set([steps[0]?.id]));
    setCompleted(new Set());
    setSkipped(new Set());
  }, [steps]);

  /* ---- Build state & actions ---- */
  const state: WizardState = {
    currentStepIndex: currentIndex,
    currentStepId: currentStep?.id ?? "",
    steps,
    data,
    errors,
    visited,
    completed,
    skipped,
    isFirstStep: currentIndex === 0,
    isLastStep: currentIndex === steps.length - 1,
    isSummaryStep: currentStep?.id === "__summary__",
    progress:
      steps.length > 1 ? currentIndex / (steps.length - 1) : 1,
  };

  const actions: WizardActions = {
    goToStep,
    nextStep,
    prevStep,
    skipStep,
    setStepData,
    getStepData,
    validateCurrentStep,
    validateAll,
    reset,
  };

  const ctx: WizardContextValue = { state, actions };

  return (
    <WizardContext.Provider value={ctx}>
      <div className={cn("flex flex-col gap-6", className)}>
        {/* Step indicator */}
        <nav aria-label="Wizard progress" className="flex items-center gap-2">
          {steps.map((step, i) => {
            const isActive = i === currentIndex;
            const isDone = completed.has(step.id);
            const isSkippedStep = skipped.has(step.id);
            const hasError = !!errors[step.id];

            return (
              <div key={step.id} className="flex items-center gap-2">
                {i > 0 && (
                  <div
                    className={cn(
                      "h-0.5 w-8 rounded-full transition-colors",
                      isDone || isActive
                        ? "bg-blue-500"
                        : "bg-gray-200 dark:bg-gray-700",
                    )}
                  />
                )}
                <button
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",
                    isActive
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : isDone
                        ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        : isSkippedStep
                          ? "border-gray-300 bg-gray-50 text-gray-400 line-through dark:border-gray-600 dark:bg-gray-800"
                          : "border-gray-300 text-gray-500 dark:border-gray-600",
                  )}
                  onClick={() => goToStep(i)}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isDone && !hasError && (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  {hasError && (
                    <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                  )}
                  <span>{step.label}</span>
                </button>
              </div>
            );
          })}
        </nav>

        {/* Progress bar */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-300"
            style={{ width: `${state.progress * 100}%` }}
          />
        </div>

        {/* Step content */}
        <div className="min-h-[200px]">
          {state.isSummaryStep ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Review your entries</h3>
              {renderSummary ? (
                renderSummary(data)
              ) : (
                <div className="space-y-3">
                  {rawSteps.map((step) => (
                    <div
                      key={step.id}
                      className="rounded-md border border-gray-200 p-3 dark:border-gray-700"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">{step.label}</h4>
                        {skipped.has(step.id) && (
                          <span className="text-xs text-gray-400">
                            Skipped
                          </span>
                        )}
                      </div>
                      <pre className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                        {JSON.stringify(data[step.id] ?? {}, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            children(ctx)
          )}
        </div>

        {/* Error message */}
        {errors[currentStep?.id] && (
          <p className="flex items-center gap-1.5 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {errors[currentStep.id]}
          </p>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between">
          <button
            className={cn(
              "flex items-center gap-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium transition hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800",
              state.isFirstStep && "invisible",
            )}
            onClick={prevStep}
            disabled={state.isFirstStep}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-2">
            {currentStep?.optional && !state.isSummaryStep && (
              <button
                className="rounded-md px-4 py-2 text-sm text-gray-500 transition hover:text-gray-700"
                onClick={skipStep}
              >
                Skip
              </button>
            )}

            <button
              className="flex items-center gap-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              onClick={nextStep}
            >
              {state.isLastStep ? "Complete" : "Next"}
              {!state.isLastStep && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </WizardContext.Provider>
  );
}

export default FormWizard;
