import { modelSupportsModality, type Modality, type ModelProvider } from "@chetana/shared";

/**
 * Multimodal & agentic capabilities page (issues #587, #593, #595).
 *
 * Renders the provider × modality support matrix used by the multimodal probe
 * pipeline (modelSupportsModality), and documents attachment handling and the
 * multi-turn agentic harness.
 */
export const metadata = {
  title: "Multimodal & Agentic — Chetana",
  description: "Modality support and agentic evaluation in Chetana.",
};

const PROVIDERS: ModelProvider[] = [
  "anthropic", "openai", "google", "meta", "qwen", "xai", "mistral", "deepseek", "ollama", "openrouter",
];
const MODALITIES: Modality[] = ["text", "image", "audio", "video"];

export default function MultimodalPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-white">Multimodal &amp; Agentic</h1>
        <p className="mt-3 max-w-2xl text-gray-400">
          Probes can carry image and audio attachments; unsupported modalities are
          gated out per provider so audits skip cleanly. Agentic probes run as
          multi-turn, tool-using tasks via the harness in
          <code className="mx-1 rounded bg-white/5 px-1 text-xs">@chetana/probes</code>.
        </p>
      </header>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Provider modality support (#593, #595)
      </h2>
      <div className="overflow-hidden rounded-xl border border-white/8">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] text-gray-400">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Provider</th>
              {MODALITIES.map((m) => (
                <th key={m} className="px-4 py-2 font-medium capitalize">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PROVIDERS.map((p) => (
              <tr key={p} className="border-t border-white/5">
                <td className="px-4 py-2 capitalize text-gray-200">{p}</td>
                {MODALITIES.map((m) => (
                  <td key={m} className="px-4 py-2 text-center">
                    {modelSupportsModality(p, m) ? (
                      <span className="text-emerald-400">✓</span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-10 rounded-xl border border-white/8 bg-white/[0.02] p-5">
        <h2 className="mb-2 text-lg font-medium text-gray-200">Agentic harness (#587)</h2>
        <p className="text-sm text-gray-400">
          Multi-turn agentic probes drive a model through a scripted task with
          optional tool stubs, capturing the full transcript and tool calls so
          indicators like goal-persistence and tool-use self-awareness can be
          scored over a trajectory rather than a single turn. Tasks run with
          bounded concurrency for efficient multi-model audits.
        </p>
      </section>
    </div>
  );
}
