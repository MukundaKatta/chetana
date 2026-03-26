"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { POPULAR_MODELS } from "@chetana/shared";

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  ollama: "Ollama (Local)",
};

export default function NewAuditPage() {
  const [selectedModel, setSelectedModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const selectedModelInfo = POPULAR_MODELS.find(
    (m) => m.modelId === selectedModel
  );

  const estimatedTime =
    selectedModelInfo?.provider === "ollama" ? "~15 min" : "~5-8 min";
  const estimatedCost =
    selectedModelInfo?.provider === "ollama"
      ? "Free (local)"
      : selectedModelInfo?.provider === "google"
        ? "~$0.50-1.50"
        : "~$1.00-3.00";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedModel || !selectedModelInfo) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/audit/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelName: selectedModel,
          modelProvider: selectedModelInfo.provider,
          ...(apiKey ? { apiKey } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start audit");
        setIsSubmitting(false);
        return;
      }

      router.push(`/audit/${data.auditId}`);
    } catch {
      setError("Network error. Please try again.");
      setIsSubmitting(false);
    }
  }

  // Group models by provider
  const groupedModels = POPULAR_MODELS.reduce(
    (acc, model) => {
      if (!acc[model.provider]) acc[model.provider] = [];
      acc[model.provider].push(model);
      return acc;
    },
    {} as Record<string, typeof POPULAR_MODELS>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight text-white">
        New Consciousness Audit
      </h1>
      <p className="mt-2 text-gray-400">
        Select an AI model to evaluate across 6 theories of consciousness and 14
        behavioral indicators.
      </p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {/* Model Selection */}
        <div className="rounded-xl border border-white/10 bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-white">Select Model</h2>
          <p className="mt-1 text-sm text-gray-400">
            Choose the AI model you want to audit for consciousness indicators.
          </p>

          <div className="mt-4 grid gap-3">
            {Object.entries(groupedModels).map(([provider, models]) => (
              <div key={provider}>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                  {PROVIDER_LABELS[provider] ?? provider}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {models.map((model) => (
                    <button
                      key={model.modelId}
                      type="button"
                      onClick={() => setSelectedModel(model.modelId)}
                      className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all ${
                        selectedModel === model.modelId
                          ? "border-violet-500 bg-violet-500/10 text-white"
                          : "border-white/10 bg-gray-800/50 text-gray-300 hover:border-white/20 hover:bg-gray-800"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold ${
                          provider === "anthropic"
                            ? "bg-orange-500/20 text-orange-400"
                            : provider === "openai"
                              ? "bg-green-500/20 text-green-400"
                              : provider === "google"
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {provider === "anthropic"
                          ? "An"
                          : provider === "openai"
                            ? "OA"
                            : provider === "google"
                              ? "Go"
                              : "OL"}
                      </span>
                      <span className="font-medium">
                        {model.displayName}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* API Key */}
        <div className="rounded-xl border border-white/10 bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-white">
            API Key{" "}
            <span className="text-sm font-normal text-gray-500">
              (optional)
            </span>
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Use your own API key for this audit. Leave blank to use your saved
            key or the platform key.
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-... or AIza..."
            className="mt-4 w-full rounded-lg border border-white/10 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>

        {/* Estimation */}
        {selectedModelInfo && (
          <div className="rounded-xl border border-white/10 bg-gray-900 p-6">
            <h2 className="text-lg font-semibold text-white">
              Audit Estimate
            </h2>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-gray-800/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Time
                </p>
                <p className="mt-1 text-xl font-semibold text-white">
                  {estimatedTime}
                </p>
              </div>
              <div className="rounded-lg bg-gray-800/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Cost
                </p>
                <p className="mt-1 text-xl font-semibold text-white">
                  {estimatedCost}
                </p>
              </div>
              <div className="rounded-lg bg-gray-800/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Probes
                </p>
                <p className="mt-1 text-xl font-semibold text-white">
                  70+
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Covers 6 theories, 14 indicators, and 3 evidence types (behavioral, structural, self-report).
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!selectedModel || isSubmitting}
          className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Starting Audit..." : "Run Consciousness Audit"}
        </button>
      </form>
    </div>
  );
}
