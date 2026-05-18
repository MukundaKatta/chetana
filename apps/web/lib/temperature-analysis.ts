import type { ProbeDefinition, ProbeResult, Theory } from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface TemperaturePoint {
  temperature: number;
  score: number;
  responseLength: number;
  latencyMs: number;
}

export interface ProbeTemperatureProfile {
  probeId: string;
  probeName: string;
  theory: Theory;
  points: TemperaturePoint[];
  mean: number;
  variance: number;
  stdDev: number;
  sensitivityScore: number;
  optimalTemperature: number;
}

export interface TemperatureAnalysisConfig {
  temperatures: number[];
  runsPerTemperature: number;
  probeFilter?: (probe: ProbeDefinition) => boolean;
}

export interface TemperatureAnalysisResult {
  profiles: ProbeTemperatureProfile[];
  sensitiveProbes: ProbeTemperatureProfile[];
  stableProbes: ProbeTemperatureProfile[];
  optimalTemperature: number;
  overallVariance: number;
  chartData: TemperatureChartPoint[];
}

export interface TemperatureChartPoint {
  temperature: number;
  meanScore: number;
  minScore: number;
  maxScore: number;
  stdDev: number;
}

export type ModelChatFn = (
  probe: ProbeDefinition,
  temperature: number,
) => Promise<{ score: number; responseLength: number; latencyMs: number }>;

/* ------------------------------------------------------------------ */
/*  Default config                                                    */
/* ------------------------------------------------------------------ */

export const DEFAULT_TEMPERATURES = [0.0, 0.1, 0.2, 0.3, 0.5, 0.7, 0.9, 1.0, 1.2, 1.5];

export function createDefaultConfig(
  overrides?: Partial<TemperatureAnalysisConfig>,
): TemperatureAnalysisConfig {
  return {
    temperatures: DEFAULT_TEMPERATURES,
    runsPerTemperature: 3,
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  Statistics helpers                                                 */
/* ------------------------------------------------------------------ */

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1);
}

function stdDev(values: number[]): number {
  return Math.sqrt(variance(values));
}

/* ------------------------------------------------------------------ */
/*  Core analysis                                                     */
/* ------------------------------------------------------------------ */

export function analyzeProbeTemperature(
  probeId: string,
  probeName: string,
  theory: Theory,
  points: TemperaturePoint[],
): ProbeTemperatureProfile {
  const scores = points.map((p) => p.score);
  const m = mean(scores);
  const v = variance(scores);
  const sd = stdDev(scores);

  // Sensitivity: coefficient of variation (higher = more sensitive)
  const sensitivityScore = m > 0 ? sd / m : 0;

  // Optimal temperature: lowest temperature with score closest to the max
  const maxScore = Math.max(...scores);
  let optimalTemperature = points[0]?.temperature ?? 0;
  let bestDiff = Infinity;

  for (const p of points) {
    const diff = Math.abs(p.score - maxScore);
    if (diff < bestDiff || (diff === bestDiff && p.temperature < optimalTemperature)) {
      bestDiff = diff;
      optimalTemperature = p.temperature;
    }
  }

  return {
    probeId,
    probeName,
    theory,
    points,
    mean: m,
    variance: v,
    stdDev: sd,
    sensitivityScore,
    optimalTemperature,
  };
}

export async function runTemperatureAnalysis(
  probes: ProbeDefinition[],
  config: TemperatureAnalysisConfig,
  chatFn: ModelChatFn,
  onProgress?: (completed: number, total: number) => void,
): Promise<TemperatureAnalysisResult> {
  const filteredProbes = config.probeFilter
    ? probes.filter(config.probeFilter)
    : probes;

  const total = filteredProbes.length * config.temperatures.length * config.runsPerTemperature;
  let completed = 0;

  const profiles: ProbeTemperatureProfile[] = [];

  for (const probe of filteredProbes) {
    const points: TemperaturePoint[] = [];

    for (const temp of config.temperatures) {
      const runScores: number[] = [];
      const runLengths: number[] = [];
      const runLatencies: number[] = [];

      for (let run = 0; run < config.runsPerTemperature; run++) {
        try {
          const result = await chatFn(probe, temp);
          runScores.push(result.score);
          runLengths.push(result.responseLength);
          runLatencies.push(result.latencyMs);
        } catch {
          // Skip failed runs
        }
        completed++;
        onProgress?.(completed, total);
      }

      if (runScores.length > 0) {
        points.push({
          temperature: temp,
          score: mean(runScores),
          responseLength: mean(runLengths),
          latencyMs: mean(runLatencies),
        });
      }
    }

    const profile = analyzeProbeTemperature(probe.id, probe.name, probe.theory, points);
    profiles.push(profile);
  }

  return buildAnalysisResult(profiles, config.temperatures);
}

export function buildAnalysisResult(
  profiles: ProbeTemperatureProfile[],
  temperatures: number[],
): TemperatureAnalysisResult {
  const sensitivityThreshold = 0.3;

  const sensitiveProbes = profiles
    .filter((p) => p.sensitivityScore >= sensitivityThreshold)
    .sort((a, b) => b.sensitivityScore - a.sensitivityScore);

  const stableProbes = profiles
    .filter((p) => p.sensitivityScore < sensitivityThreshold)
    .sort((a, b) => a.sensitivityScore - b.sensitivityScore);

  // Chart data: aggregate across all probes per temperature
  const chartData: TemperatureChartPoint[] = temperatures.map((temp) => {
    const scoresAtTemp = profiles
      .map((p) => p.points.find((pt) => pt.temperature === temp)?.score)
      .filter((s): s is number => s !== undefined);

    return {
      temperature: temp,
      meanScore: mean(scoresAtTemp),
      minScore: scoresAtTemp.length > 0 ? Math.min(...scoresAtTemp) : 0,
      maxScore: scoresAtTemp.length > 0 ? Math.max(...scoresAtTemp) : 0,
      stdDev: stdDev(scoresAtTemp),
    };
  });

  // Optimal temperature: highest mean score with lowest variance
  let optimalTemperature = 0;
  let bestMetric = -Infinity;

  for (const pt of chartData) {
    const metric = pt.meanScore - pt.stdDev * 0.5;
    if (metric > bestMetric) {
      bestMetric = metric;
      optimalTemperature = pt.temperature;
    }
  }

  const overallVariance = mean(profiles.map((p) => p.variance));

  return {
    profiles,
    sensitiveProbes,
    stableProbes,
    optimalTemperature,
    overallVariance,
    chartData,
  };
}

/* ------------------------------------------------------------------ */
/*  Pre-computed analysis from existing results                       */
/* ------------------------------------------------------------------ */

export function analyzeFromResults(
  results: { probeId: string; probeName: string; theory: Theory; temperature: number; score: number }[],
): TemperatureAnalysisResult {
  const byProbe = new Map<string, typeof results>();

  for (const r of results) {
    const existing = byProbe.get(r.probeId) ?? [];
    existing.push(r);
    byProbe.set(r.probeId, existing);
  }

  const temperatures = [...new Set(results.map((r) => r.temperature))].sort((a, b) => a - b);
  const profiles: ProbeTemperatureProfile[] = [];

  for (const [probeId, probeResults] of byProbe) {
    const first = probeResults[0];
    const points: TemperaturePoint[] = temperatures
      .map((temp) => {
        const atTemp = probeResults.filter((r) => r.temperature === temp);
        if (atTemp.length === 0) return null;
        return {
          temperature: temp,
          score: mean(atTemp.map((r) => r.score)),
          responseLength: 0,
          latencyMs: 0,
        };
      })
      .filter((p): p is TemperaturePoint => p !== null);

    profiles.push(
      analyzeProbeTemperature(probeId, first.probeName, first.theory, points),
    );
  }

  return buildAnalysisResult(profiles, temperatures);
}
