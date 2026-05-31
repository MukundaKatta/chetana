/**
 * API reference (issues #71, #534). Documents the public compute endpoints
 * added alongside the 2026 cores so they can be used programmatically.
 */
export const metadata = {
  title: "API Reference — Chetana",
  description: "Public API endpoints for consciousness-audit analysis.",
};

interface Endpoint {
  method: string;
  path: string;
  description: string;
  example?: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/api/models/registry",
    description: "Model-version registry, including 2026 frontier models. Optional ?provider= filter.",
    example: "curl https://chetana.dev/api/models/registry?provider=openai",
  },
  {
    method: "POST",
    path: "/api/audit/welfare",
    description: "Welfare assessment + ethics-review gating from welfare signals.",
    example: `curl -X POST .../api/audit/welfare -d '{"distress":0.6,"optOutPreference":0.4,"consciousnessProbability":0.72}'`,
  },
  {
    method: "POST",
    path: "/api/audit/reliability",
    description: "Judge-ensemble agreement, Krippendorff's alpha, and calibration ECE.",
    example: `curl -X POST .../api/audit/reliability -d '{"ratings":[[0.8,0.8],[0.2,0.3]]}'`,
  },
  {
    method: "POST",
    path: "/api/benchmarks/miq",
    description: "MIQ composite from capability benchmarks + capability/consciousness correlation.",
    example: `curl -X POST .../api/benchmarks/miq -d '{"benchmarks":[{"benchmark":"gpqa","score":0.9}]}'`,
  },
  {
    method: "POST",
    path: "/api/audit/anomalies",
    description: "Anomaly detection (z-score / IQR) over an audit's indicator scores.",
  },
];

export default function ApiReferencePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-white">API Reference</h1>
        <p className="mt-3 max-w-2xl text-gray-400">
          Public compute endpoints for programmatic consciousness-audit analysis.
          Request and response bodies are JSON.
        </p>
      </header>

      <ul className="space-y-4">
        {ENDPOINTS.map((e) => (
          <li key={e.path} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <div className="flex items-center gap-3">
              <span className="rounded bg-chetana-600/20 px-2 py-0.5 font-mono text-xs font-semibold text-chetana-300">
                {e.method}
              </span>
              <code className="font-mono text-sm text-gray-200">{e.path}</code>
            </div>
            <p className="mt-2 text-sm text-gray-400">{e.description}</p>
            {e.example && (
              <pre className="mt-2 overflow-x-auto rounded-lg border border-white/8 bg-black/30 p-3 text-xs text-gray-400">
                {e.example}
              </pre>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
