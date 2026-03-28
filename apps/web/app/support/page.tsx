import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support — Chetana",
  description: "Get help with the Chetana AI Consciousness Research Platform.",
};

export default function Support() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-200 px-6 py-16 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">Support</h1>
      <p className="text-gray-400 mb-8">Need help with Chetana? We&apos;re here for you.</p>

      <section className="space-y-8 text-gray-300 leading-relaxed">
        <div>
          <h2 className="text-xl font-semibold text-white mb-3">Getting Started</h2>
          <p>
            Chetana is an AI consciousness research platform. You can start using it immediately
            in <strong>Demo Mode</strong> without creating an account or providing API keys.
          </p>
          <ol className="list-decimal list-inside space-y-2 mt-3 ml-2">
            <li>Open the app and tap <strong>Start Audit</strong></li>
            <li>Select <strong>Demo Mode</strong> to try without an account</li>
            <li>Choose an AI model to test</li>
            <li>Run the consciousness audit and explore results</li>
          </ol>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-3">Frequently Asked Questions</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-white">What AI models can I test?</h3>
              <p className="text-gray-400 mt-1">
                Claude (Anthropic), GPT (OpenAI), Gemini (Google), Llama (Meta), and any custom model
                with a compatible API.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-white">Do I need my own API keys?</h3>
              <p className="text-gray-400 mt-1">
                Demo mode works without API keys. For full audits with your preferred models,
                you can add your own API keys in Settings. Keys are stored locally on your device.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-white">What theories of consciousness are tested?</h3>
              <p className="text-gray-400 mt-1">
                Integrated Information Theory (IIT), Global Workspace Theory (GWT),
                Higher-Order Theories (HOT), Attention Schema Theory (AST),
                Predictive Processing (PP), and Embodied/Vedantic frameworks.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-white">Can I export my results?</h3>
              <p className="text-gray-400 mt-1">
                Yes, results can be exported in JSON and CSV formats for further research and analysis.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-3">Report an Issue</h2>
          <p>
            Found a bug or have a feature request? Please report it on our GitHub:
          </p>
          <a
            href="https://github.com/MukundaKatta/chetana/issues"
            className="inline-block mt-2 text-purple-400 hover:underline"
          >
            github.com/MukundaKatta/chetana/issues
          </a>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-3">Contact</h2>
          <p>
            For support inquiries, reach us at{" "}
            <a href="mailto:support@chetana.app" className="text-purple-400 hover:underline">
              support@chetana.app
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
