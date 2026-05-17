"use client";

import { useState, useEffect, useCallback } from "react";

const THEORY_CARDS = [
  { key: "gwt", name: "Global Workspace Theory", color: "from-blue-500 to-indigo-600", icon: "GWT" },
  { key: "iit", name: "Integrated Information", color: "from-purple-500 to-violet-600", icon: "IIT" },
  { key: "hot", name: "Higher-Order Theories", color: "from-orange-500 to-red-600", icon: "HOT" },
  { key: "rpt", name: "Recurrent Processing", color: "from-emerald-500 to-teal-600", icon: "RPT" },
  { key: "pp", name: "Predictive Processing", color: "from-amber-500 to-yellow-600", icon: "PP" },
  { key: "ast", name: "Attention Schema", color: "from-pink-500 to-rose-600", icon: "AST" },
];

const STEPS = ["Welcome", "Theories", "Setup", "First Audit"] as const;

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [setupMode, setSetupMode] = useState<"demo" | "api">("demo");
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    const completed = localStorage.getItem("onboarding_complete");
    if (!completed) {
      setVisible(true);
    }
  }, []);

  const handleComplete = useCallback(() => {
    localStorage.setItem("onboarding_complete", "true");
    setVisible(false);
  }, []);

  const handleSkip = useCallback(() => {
    localStorage.setItem("onboarding_complete", "true");
    setVisible(false);
  }, []);

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleComplete();
    }
  }, [step, handleComplete]);

  const handleBack = useCallback(() => {
    if (step > 0) {
      setStep((s) => s - 1);
    }
  }, [step]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-gray-900 p-8 shadow-2xl">
        {/* Skip button */}
        <button
          type="button"
          onClick={handleSkip}
          className="absolute right-4 top-4 text-sm text-gray-500 transition hover:text-gray-300"
        >
          Skip
        </button>

        {/* Step content */}
        <div className="min-h-[320px]">
          {step === 0 && (
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-2xl font-bold text-white">
                C
              </div>
              <h2 className="mt-6 text-2xl font-bold text-white">
                Welcome to Chetana
              </h2>
              <p className="mt-4 max-w-md text-gray-400">
                Chetana is the first scientific tool for auditing AI consciousness.
                Test models against 14 indicators from 6 theories of consciousness
                and get reproducible, evidence-based results.
              </p>
              <p className="mt-4 text-sm text-gray-500">
                Based on the Butlin et al. (2025) framework for evaluating
                consciousness in artificial systems.
              </p>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-center text-xl font-bold text-white">
                Six Theories of Consciousness
              </h2>
              <p className="mt-2 text-center text-sm text-gray-400">
                Each theory offers a different lens on what consciousness is and
                whether AI could have it.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {THEORY_CARDS.map((theory) => (
                  <div
                    key={theory.key}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center transition hover:bg-white/[0.06]"
                  >
                    <div
                      className={`mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${theory.color} text-xs font-bold text-white`}
                    >
                      {theory.icon}
                    </div>
                    <p className="mt-2 text-xs font-medium text-gray-300">
                      {theory.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-center text-xl font-bold text-white">
                Choose Your Setup
              </h2>
              <p className="mt-2 text-center text-sm text-gray-400">
                You can explore with demo mode or connect your own API key for
                live audits.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setSetupMode("demo")}
                  className={`rounded-xl border p-5 text-left transition ${
                    setupMode === "demo"
                      ? "border-chetana-500/50 bg-chetana-600/10"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="text-lg font-semibold text-white">Demo Mode</div>
                  <p className="mt-1 text-xs text-gray-400">
                    Explore with pre-recorded audit results. No API key required.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setSetupMode("api")}
                  className={`rounded-xl border p-5 text-left transition ${
                    setupMode === "api"
                      ? "border-chetana-500/50 bg-chetana-600/10"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="text-lg font-semibold text-white">API Key</div>
                  <p className="mt-1 text-xs text-gray-400">
                    Connect your own key to run live audits on any model.
                  </p>
                </button>
              </div>
              {setupMode === "api" && (
                <div className="mt-4">
                  <label
                    htmlFor="onboarding-api-key"
                    className="block text-sm font-medium text-gray-300"
                  >
                    API Key
                  </label>
                  <input
                    id="onboarding-api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-chetana-500 focus:outline-none focus:ring-1 focus:ring-chetana-500"
                  />
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-2xl">
                &#10003;
              </div>
              <h2 className="mt-6 text-2xl font-bold text-white">
                Ready to Run Your First Audit!
              </h2>
              <p className="mt-4 max-w-md text-gray-400">
                You&apos;re all set. Run your first consciousness audit and discover
                how AI models score across the 6 theories and 14 indicators.
              </p>
              <button
                type="button"
                onClick={handleComplete}
                className="mt-8 rounded-xl bg-chetana-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-chetana-600/25 transition hover:bg-chetana-500 hover:shadow-chetana-500/25"
              >
                Start My First Audit
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              step === 0
                ? "invisible"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Back
          </button>

          {/* Step indicator dots */}
          <div className="flex items-center gap-2">
            {STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 w-2 rounded-full transition ${
                  idx === step
                    ? "bg-chetana-500"
                    : idx < step
                      ? "bg-chetana-500/40"
                      : "bg-gray-700"
                }`}
              />
            ))}
          </div>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
            >
              Next
            </button>
          ) : (
            <div className="w-16" />
          )}
        </div>
      </div>
    </div>
  );
}
