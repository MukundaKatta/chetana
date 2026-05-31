import Link from "next/link";
import { getAllModelVersions, type ModelVersion, type ModelProvider } from "@chetana/shared";

/**
 * Models registry page (issues #556-#565).
 *
 * Surfaces the model-version registry — including the 2026 frontier models
 * (GPT-5.4, Gemini 3.1, Claude Opus 4, Grok 4.20, Qwen 3, Muse Spark,
 * DeepSeek R2, Mistral Large 3) — grouped by provider. Backed by
 * `getAllModelVersions()` from @chetana/shared; also served at
 * `GET /api/models/registry`.
 */

const PROVIDER_LABEL: Record<ModelProvider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  ollama: "Ollama",
  mistral: "Mistral",
  deepseek: "DeepSeek",
  openrouter: "OpenRouter",
  xai: "xAI",
  qwen: "Qwen",
  meta: "Meta",
  bedrock: "Amazon Bedrock",
  azure: "Azure OpenAI",
  vertex: "Google Vertex AI",
  cohere: "Cohere",
  ai21: "AI21",
  groq: "Groq",
  together: "Together.ai",
  fireworks: "Fireworks AI",
  perplexity: "Perplexity",
  nova: "Amazon Nova",
  phi: "Microsoft Phi",
  reka: "Reka",
  vllm: "vLLM (self-hosted)",
  mlx: "Apple MLX",
};

function isRecent(releasedAt: string): boolean {
  return releasedAt >= "2026-01-01";
}

export default function ModelsPage() {
  const models = getAllModelVersions();

  const byProvider = models.reduce<Record<string, ModelVersion[]>>((acc, m) => {
    (acc[m.provider] ??= []).push(m);
    return acc;
  }, {});

  const providers = Object.keys(byProvider).sort() as ModelProvider[];
  const recentCount = models.filter((m) => isRecent(m.releasedAt)).length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold text-white">Supported Models</h1>
        <p className="mt-3 max-w-2xl text-gray-400">
          Chetana can audit {models.length} models across {providers.length} providers,
          including {recentCount} frontier models released in 2026. The registry is
          also available programmatically at{" "}
          <Link href="/api/models/registry" className="text-chetana-300 underline">
            /api/models/registry
          </Link>
          .
        </p>
      </header>

      <div className="space-y-8">
        {providers.map((provider) => (
          <section key={provider}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              {PROVIDER_LABEL[provider] ?? provider}
            </h2>
            <div className="overflow-hidden rounded-xl border border-white/8">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.03] text-gray-400">
                  <tr>
                    <th className="px-4 py-2 font-medium">Model</th>
                    <th className="px-4 py-2 font-medium">Model ID</th>
                    <th className="px-4 py-2 font-medium">Released</th>
                  </tr>
                </thead>
                <tbody>
                  {byProvider[provider]
                    .slice()
                    .sort((a, b) => b.releasedAt.localeCompare(a.releasedAt))
                    .map((m) => (
                      <tr key={m.modelId} className="border-t border-white/5">
                        <td className="px-4 py-2 text-gray-200">
                          {m.displayName}
                          {isRecent(m.releasedAt) && (
                            <span className="ml-2 rounded bg-chetana-600/20 px-1.5 py-0.5 text-[10px] font-medium text-chetana-300">
                              2026
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-gray-500">{m.modelId}</td>
                        <td className="px-4 py-2 tabular-nums text-gray-400">{m.releasedAt}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
