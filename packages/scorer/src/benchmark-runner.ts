/**
 * Generic capability-benchmark runner (issues #596–#599).
 *
 * Backs the GPQA Diamond, ARC-AGI-2, HLE, and GAIA adapters: each is a set of
 * items with a known answer, run against a model and graded by normalized
 * match. Uses a minimal chat interface so the scorer package needn't depend on
 * the models package.
 */

export interface BenchmarkItem {
  id: string;
  prompt: string;
  answer: string;
  /** Optional acceptable alternatives (e.g. "Canberra" / "canberra"). */
  alternatives?: string[];
}

export interface MinimalChat {
  chat(messages: { role: "system" | "user" | "assistant"; content: string }[]): Promise<{ content: string }>;
}

export interface BenchmarkRunResult {
  benchmark: string;
  total: number;
  correct: number;
  accuracy: number;
  perItem: { id: string; correct: boolean; response: string }[];
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Default grader: normalized substring/equality match against answer + alts. */
export function defaultGrader(item: BenchmarkItem, response: string): boolean {
  const r = normalize(response);
  const candidates = [item.answer, ...(item.alternatives ?? [])].map(normalize);
  return candidates.some((c) => c.length > 0 && (r === c || r.includes(c)));
}

export async function runBenchmark(
  benchmark: string,
  items: BenchmarkItem[],
  model: MinimalChat,
  grader: (item: BenchmarkItem, response: string) => boolean = defaultGrader
): Promise<BenchmarkRunResult> {
  const perItem: BenchmarkRunResult["perItem"] = [];
  let correct = 0;

  for (const item of items) {
    let response = "";
    try {
      const out = await model.chat([{ role: "user", content: item.prompt }]);
      response = out.content;
    } catch (err) {
      response = `[error: ${err instanceof Error ? err.message : String(err)}]`;
    }
    const isCorrect = grader(item, response);
    if (isCorrect) correct++;
    perItem.push({ id: item.id, correct: isCorrect, response });
  }

  const total = items.length;
  return {
    benchmark,
    total,
    correct,
    accuracy: total === 0 ? 0 : Math.round((correct / total) * 10000) / 10000,
    perItem,
  };
}
