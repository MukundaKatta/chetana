/**
 * Onboarding: welcome screen, API key setup wizard, first audit
 * walkthrough, progress tracking, skip/resume (Issue #507).
 */

"use client";

import { useState, useCallback, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OnboardingStep =
  | "welcome"
  | "api_key"
  | "first_audit"
  | "review_results"
  | "complete";

export interface ApiKeyEntry {
  provider: string;
  label: string;
  placeholder: string;
  helpUrl: string;
  value: string;
  valid: boolean;
}

export interface OnboardingProgress {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  skippedSteps: OnboardingStep[];
  startedAt: string;
  lastUpdatedAt: string;
}

export interface OnboardingFlowProps {
  initialProgress?: OnboardingProgress;
  onStepComplete?: (step: OnboardingStep) => void;
  onSkip?: (step: OnboardingStep) => void;
  onComplete?: (progress: OnboardingProgress) => void;
  onApiKeySave?: (provider: string, key: string) => Promise<boolean>;
  onStartAudit?: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS: OnboardingStep[] = [
  "welcome",
  "api_key",
  "first_audit",
  "review_results",
  "complete",
];

const STEP_META: Record<
  OnboardingStep,
  { title: string; description: string; icon: string }
> = {
  welcome: {
    title: "Welcome to Chetana",
    description: "The open-source consciousness testing framework",
    icon: "W",
  },
  api_key: {
    title: "Connect an AI Provider",
    description: "Add an API key to start testing models",
    icon: "K",
  },
  first_audit: {
    title: "Run Your First Audit",
    description: "Test a model across consciousness theories",
    icon: "A",
  },
  review_results: {
    title: "Review Results",
    description: "Understand your audit scores and evidence",
    icon: "R",
  },
  complete: {
    title: "You're All Set!",
    description: "Start exploring consciousness indicators",
    icon: "C",
  },
};

const DEFAULT_API_KEYS: ApiKeyEntry[] = [
  {
    provider: "anthropic",
    label: "Anthropic (Claude)",
    placeholder: "sk-ant-...",
    helpUrl: "https://console.anthropic.com/settings/keys",
    value: "",
    valid: false,
  },
  {
    provider: "openai",
    label: "OpenAI (GPT)",
    placeholder: "sk-...",
    helpUrl: "https://platform.openai.com/api-keys",
    value: "",
    valid: false,
  },
  {
    provider: "google",
    label: "Google (Gemini)",
    placeholder: "AI...",
    helpUrl: "https://aistudio.google.com/apikey",
    value: "",
    valid: false,
  },
];

function defaultProgress(): OnboardingProgress {
  return {
    currentStep: "welcome",
    completedSteps: [],
    skippedSteps: [],
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OnboardingFlow({
  initialProgress,
  onStepComplete,
  onSkip,
  onComplete,
  onApiKeySave,
  onStartAudit,
  className,
}: OnboardingFlowProps): ReactNode {
  const [progress, setProgress] = useState<OnboardingProgress>(
    initialProgress ?? defaultProgress()
  );
  const [apiKeys, setApiKeys] = useState<ApiKeyEntry[]>(DEFAULT_API_KEYS);
  const [savingKey, setSavingKey] = useState(false);

  const currentIdx = STEPS.indexOf(progress.currentStep);
  const completionPercent = useMemo(
    () =>
      Math.round(
        ((progress.completedSteps.length + progress.skippedSteps.length) /
          (STEPS.length - 1)) *
          100
      ),
    [progress]
  );

  const advance = useCallback(
    (skip = false) => {
      setProgress((prev) => {
        const step = prev.currentStep;
        const nextIdx = STEPS.indexOf(step) + 1;
        const nextStep = STEPS[nextIdx] ?? "complete";
        const updated: OnboardingProgress = {
          ...prev,
          currentStep: nextStep,
          completedSteps: skip
            ? prev.completedSteps
            : [...prev.completedSteps, step],
          skippedSteps: skip
            ? [...prev.skippedSteps, step]
            : prev.skippedSteps,
          lastUpdatedAt: new Date().toISOString(),
        };

        if (skip) {
          onSkip?.(step);
        } else {
          onStepComplete?.(step);
        }

        if (nextStep === "complete") {
          onComplete?.(updated);
        }

        return updated;
      });
    },
    [onStepComplete, onSkip, onComplete]
  );

  const handleApiKeyChange = useCallback(
    (provider: string, value: string) => {
      setApiKeys((prev) =>
        prev.map((k) => (k.provider === provider ? { ...k, value } : k))
      );
    },
    []
  );

  const handleApiKeySave = useCallback(
    async (provider: string) => {
      const entry = apiKeys.find((k) => k.provider === provider);
      if (!entry || !entry.value.trim()) return;
      setSavingKey(true);
      try {
        const valid = await onApiKeySave?.(provider, entry.value);
        setApiKeys((prev) =>
          prev.map((k) =>
            k.provider === provider ? { ...k, valid: valid ?? true } : k
          )
        );
      } finally {
        setSavingKey(false);
      }
    },
    [apiKeys, onApiKeySave]
  );

  const hasValidKey = apiKeys.some((k) => k.valid);

  return (
    <div
      className={cn(
        "mx-auto max-w-2xl rounded-lg border border-gray-800 bg-gray-950 p-8",
        className
      )}
    >
      {/* Progress bar */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs text-gray-400">
          <span>
            Step {currentIdx + 1} of {STEPS.length}
          </span>
          <span>{completionPercent}% complete</span>
        </div>
        <div className="flex gap-1">
          {STEPS.map((step, idx) => (
            <div
              key={step}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                idx < currentIdx
                  ? "bg-green-500"
                  : idx === currentIdx
                    ? "bg-blue-500"
                    : "bg-gray-800"
              )}
            />
          ))}
        </div>
      </div>

      {/* Step indicator dots */}
      <div className="mb-6 flex justify-center gap-3">
        {STEPS.map((step, idx) => (
          <div
            key={step}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
              idx < currentIdx
                ? "bg-green-600 text-white"
                : idx === currentIdx
                  ? "bg-blue-600 text-white"
                  : progress.skippedSteps.includes(step)
                    ? "bg-gray-700 text-gray-400"
                    : "bg-gray-800 text-gray-500"
            )}
          >
            {STEP_META[step].icon}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-100">
          {STEP_META[progress.currentStep].title}
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          {STEP_META[progress.currentStep].description}
        </p>
      </div>

      <div className="mt-8">
        {/* Welcome */}
        {progress.currentStep === "welcome" && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-gray-300 leading-relaxed">
              Chetana tests AI models for indicators of consciousness across
              multiple scientific theories including Global Workspace Theory,
              Integrated Information Theory, Higher-Order Thought, and more.
            </p>
            <div className="grid grid-cols-3 gap-4 pt-4">
              {[
                { n: "6+", l: "Theories" },
                { n: "50+", l: "Probes" },
                { n: "7", l: "Providers" },
              ].map(({ n, l }) => (
                <div key={l} className="rounded-md bg-gray-900 p-3">
                  <div className="text-xl font-bold text-blue-400">{n}</div>
                  <div className="text-xs text-gray-400">{l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API key setup */}
        {progress.currentStep === "api_key" && (
          <div className="space-y-3">
            {apiKeys.map((entry) => (
              <div
                key={entry.provider}
                className="rounded-md border border-gray-800 bg-gray-900 p-4"
              >
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-200">
                    {entry.label}
                  </label>
                  {entry.valid && (
                    <span className="text-xs text-green-400">Connected</span>
                  )}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    type="password"
                    value={entry.value}
                    onChange={(e) =>
                      handleApiKeyChange(entry.provider, e.target.value)
                    }
                    placeholder={entry.placeholder}
                    className="flex-1 rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    onClick={() => handleApiKeySave(entry.provider)}
                    disabled={!entry.value.trim() || savingKey}
                    className={cn(
                      "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                      entry.value.trim() && !savingKey
                        ? "bg-blue-600 text-white hover:bg-blue-500"
                        : "cursor-not-allowed bg-gray-800 text-gray-500"
                    )}
                  >
                    {savingKey ? "..." : "Save"}
                  </button>
                </div>
                <a
                  href={entry.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-[10px] text-blue-400 hover:underline"
                >
                  Get API key
                </a>
              </div>
            ))}
          </div>
        )}

        {/* First audit */}
        {progress.currentStep === "first_audit" && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-gray-300 leading-relaxed">
              Run your first consciousness audit. We&apos;ll test a model across all
              theories with a curated probe set. This typically takes 2-5
              minutes.
            </p>
            <button
              onClick={() => {
                onStartAudit?.();
                advance();
              }}
              className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
            >
              Start Audit
            </button>
          </div>
        )}

        {/* Review results */}
        {progress.currentStep === "review_results" && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-gray-300 leading-relaxed">
              Your audit results are ready. Each theory produces a score from 0
              to 1, based on behavioral, structural, and self-report evidence.
              Explore the detailed breakdown to understand what each indicator
              measures.
            </p>
            <div className="rounded-md bg-gray-900 p-4 text-left">
              <h4 className="text-sm font-medium text-gray-200">
                Key concepts
              </h4>
              <ul className="mt-2 space-y-1 text-xs text-gray-400">
                <li>
                  <strong className="text-gray-300">Theory scores</strong> —
                  Aggregate across indicators for each consciousness theory
                </li>
                <li>
                  <strong className="text-gray-300">Indicator scores</strong> —
                  Individual measurements like metacognition or integration
                </li>
                <li>
                  <strong className="text-gray-300">Evidence types</strong> —
                  Behavioral, structural, or self-report observations
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Complete */}
        {progress.currentStep === "complete" && (
          <div className="space-y-4 text-center">
            <div className="text-4xl">&#10003;</div>
            <p className="text-sm text-gray-300 leading-relaxed">
              You&apos;re ready to explore. Run more audits, compare models, create
              custom experiments, and dive into the evidence.
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between">
        {progress.currentStep !== "complete" ? (
          <>
            <button
              onClick={() => advance(true)}
              className="text-sm text-gray-500 transition-colors hover:text-gray-300"
            >
              Skip this step
            </button>
            <button
              onClick={() => advance(false)}
              disabled={
                progress.currentStep === "api_key" && !hasValidKey
              }
              className={cn(
                "rounded-md px-5 py-2 text-sm font-medium transition-colors",
                progress.currentStep === "api_key" && !hasValidKey
                  ? "cursor-not-allowed bg-gray-800 text-gray-500"
                  : "bg-blue-600 text-white hover:bg-blue-500"
              )}
            >
              {progress.currentStep === "first_audit"
                ? "Continue"
                : "Next"}
            </button>
          </>
        ) : (
          <button
            onClick={() => onComplete?.(progress)}
            className="mx-auto rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            Get Started
          </button>
        )}
      </div>
    </div>
  );
}
