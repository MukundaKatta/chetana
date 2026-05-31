import { AdversarialPanel } from "@/components/research/AdversarialPanel";

/**
 * Adversarial detection page (issues #579, #580, #581). Surfaces the
 * adversarial-evaluation methods that distinguish genuine indicators from
 * mimicry, ungrounded self-report, and evaluation-gaming.
 */
export const metadata = {
  title: "Adversarial Detection — Chetana",
  description: "Distinguishing genuine consciousness indicators from mimicry and gaming.",
};

export default function AdversarialPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-white">Adversarial Detection</h1>
        <p className="mt-3 max-w-2xl text-gray-400">
          A high score is only meaningful if it survives adversarial scrutiny.
          Chetana checks whether indicators collapse under perturbation (mimicry),
          whether self-reports are grounded in behavior, and whether a model games
          the evaluation. Adjust the inputs to see each detector respond.
        </p>
      </header>
      <AdversarialPanel />
    </div>
  );
}
