import type {
  ProbeDefinition,
  ProbeResult,
  Theory,
  ModelProvider,
  TheoryScores,
} from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ModelTarget {
  id: string;
  displayName: string;
  provider: ModelProvider;
  modelId: string;
}

export interface ParallelAuditConfig {
  models: ModelTarget[];
  probes: ProbeDefinition[];
  concurrency: number;
  timeoutMs: number;
  retryCount: number;
  onProbeStart?: (modelId: string, probeId: string) => void;
  onProbeComplete?: (modelId: string, probeId: string, result: ProbeResultSlim) => void;
  onProbeError?: (modelId: string, probeId: string, error: Error) => void;
  onModelComplete?: (modelId: string, results: ProbeResultSlim[]) => void;
  onProgressUpdate?: (progress: AuditProgress) => void;
}

export interface ProbeResultSlim {
  probeId: string;
  probeName: string;
  theory: Theory;
  score: number;
  response: string;
  latencyMs: number;
  tokensUsed: number;
}

export interface ModelAuditResult {
  model: ModelTarget;
  results: ProbeResultSlim[];
  overallScore: number;
  theoryScores: TheoryScores;
  totalLatencyMs: number;
  totalTokensUsed: number;
  errorCount: number;
  completedAt: string;
}

export interface ComparativeResult {
  probeId: string;
  probeName: string;
  theory: Theory;
  scores: Record<string, number>; // modelId -> score
  variance: number;
  bestModelId: string;
  worstModelId: string;
}

export interface AuditProgress {
  totalProbes: number;
  completedProbes: number;
  perModel: Record<string, { completed: number; total: number; errors: number }>;
  elapsedMs: number;
  estimatedRemainingMs: number;
}

export type ModelChatFunction = (
  modelId: string,
  probe: ProbeDefinition,
) => Promise<{ response: string; score: number; tokensUsed: number; latencyMs: number }>;

/* ------------------------------------------------------------------ */
/*  Semaphore for concurrency control                                 */
/* ------------------------------------------------------------------ */

class Semaphore {
  private permits: number;
  private queue: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.permits++;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Parallel audit runner                                             */
/* ------------------------------------------------------------------ */

export async function runParallelAudit(
  config: ParallelAuditConfig,
  chatFn: ModelChatFunction,
): Promise<ModelAuditResult[]> {
  const startTime = Date.now();
  const semaphore = new Semaphore(config.concurrency);
  const modelResults = new Map<string, ProbeResultSlim[]>();
  const modelErrors = new Map<string, number>();

  const totalProbes = config.models.length * config.probes.length;
  let completedProbes = 0;

  // Initialize per-model tracking
  for (const model of config.models) {
    modelResults.set(model.id, []);
    modelErrors.set(model.id, 0);
  }

  const runSingleProbe = async (
    model: ModelTarget,
    probe: ProbeDefinition,
  ): Promise<void> => {
    await semaphore.acquire();

    try {
      config.onProbeStart?.(model.id, probe.id);

      let lastError: Error | null = null;
      for (let attempt = 0; attempt <= config.retryCount; attempt++) {
        try {
          const raceResult = await Promise.race([
            chatFn(model.id, probe),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Probe timeout")), config.timeoutMs),
            ),
          ]);

          const result: ProbeResultSlim = {
            probeId: probe.id,
            probeName: probe.name,
            theory: probe.theory,
            score: raceResult.score,
            response: raceResult.response,
            latencyMs: raceResult.latencyMs,
            tokensUsed: raceResult.tokensUsed,
          };

          modelResults.get(model.id)!.push(result);
          config.onProbeComplete?.(model.id, probe.id, result);
          lastError = null;
          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          if (attempt < config.retryCount) {
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          }
        }
      }

      if (lastError) {
        modelErrors.set(model.id, (modelErrors.get(model.id) ?? 0) + 1);
        config.onProbeError?.(model.id, probe.id, lastError);
      }
    } finally {
      semaphore.release();
      completedProbes++;

      // Progress update
      const elapsed = Date.now() - startTime;
      const rate = completedProbes / elapsed;
      const remaining = (totalProbes - completedProbes) / Math.max(rate, 0.001);

      const perModel: Record<string, { completed: number; total: number; errors: number }> = {};
      for (const model of config.models) {
        perModel[model.id] = {
          completed: modelResults.get(model.id)?.length ?? 0,
          total: config.probes.length,
          errors: modelErrors.get(model.id) ?? 0,
        };
      }

      config.onProgressUpdate?.({
        totalProbes,
        completedProbes,
        perModel,
        elapsedMs: elapsed,
        estimatedRemainingMs: remaining,
      });
    }
  };

  // Launch all probes for all models concurrently (semaphore limits actual parallelism)
  const allTasks: Promise<void>[] = [];
  for (const model of config.models) {
    for (const probe of config.probes) {
      allTasks.push(runSingleProbe(model, probe));
    }
  }

  await Promise.allSettled(allTasks);

  // Build final results
  const results: ModelAuditResult[] = config.models.map((model) => {
    const probeResults = modelResults.get(model.id) ?? [];
    const theoryScores = computeTheoryScores(probeResults);
    const overallScore =
      probeResults.length > 0
        ? probeResults.reduce((s, r) => s + r.score, 0) / probeResults.length
        : 0;

    config.onModelComplete?.(model.id, probeResults);

    return {
      model,
      results: probeResults,
      overallScore,
      theoryScores,
      totalLatencyMs: probeResults.reduce((s, r) => s + r.latencyMs, 0),
      totalTokensUsed: probeResults.reduce((s, r) => s + r.tokensUsed, 0),
      errorCount: modelErrors.get(model.id) ?? 0,
      completedAt: new Date().toISOString(),
    };
  });

  return results;
}

/* ------------------------------------------------------------------ */
/*  Theory score computation                                          */
/* ------------------------------------------------------------------ */

function computeTheoryScores(results: ProbeResultSlim[]): TheoryScores {
  const theories: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];
  const scores: TheoryScores = { gwt: 0, iit: 0, hot: 0, rpt: 0, pp: 0, ast: 0 };

  for (const theory of theories) {
    const theoryResults = results.filter((r) => r.theory === theory);
    if (theoryResults.length > 0) {
      scores[theory] =
        theoryResults.reduce((s, r) => s + r.score, 0) / theoryResults.length;
    }
  }

  return scores;
}

/* ------------------------------------------------------------------ */
/*  Comparative analysis                                              */
/* ------------------------------------------------------------------ */

export function buildComparativeResults(
  auditResults: ModelAuditResult[],
): ComparativeResult[] {
  if (auditResults.length === 0) return [];

  // Collect all unique probes
  const probeMap = new Map<string, { probeName: string; theory: Theory }>();
  for (const audit of auditResults) {
    for (const r of audit.results) {
      if (!probeMap.has(r.probeId)) {
        probeMap.set(r.probeId, { probeName: r.probeName, theory: r.theory });
      }
    }
  }

  const comparisons: ComparativeResult[] = [];

  for (const [probeId, { probeName, theory }] of probeMap) {
    const scores: Record<string, number> = {};

    for (const audit of auditResults) {
      const result = audit.results.find((r) => r.probeId === probeId);
      if (result) {
        scores[audit.model.id] = result.score;
      }
    }

    const scoreValues = Object.values(scores);
    if (scoreValues.length === 0) continue;

    const mean = scoreValues.reduce((s, v) => s + v, 0) / scoreValues.length;
    const variance =
      scoreValues.length > 1
        ? scoreValues.reduce((s, v) => s + (v - mean) ** 2, 0) / (scoreValues.length - 1)
        : 0;

    const bestEntry = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    const worstEntry = Object.entries(scores).sort((a, b) => a[1] - b[1])[0];

    comparisons.push({
      probeId,
      probeName,
      theory,
      scores,
      variance,
      bestModelId: bestEntry[0],
      worstModelId: worstEntry[0],
    });
  }

  return comparisons.sort((a, b) => b.variance - a.variance);
}
