/**
 * Probe sampling strategies (Issue #457).
 * Stratified by theory/indicator, random with seed, importance-weighted,
 * sample-size calculator, coverage statistics report.
 */

import type {
  ProbeDefinition,
  Theory,
  IndicatorId,
  EvidenceType,
} from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type SamplingStrategy =
  | "random"
  | "stratified-theory"
  | "stratified-indicator"
  | "importance-weighted";

export interface SamplingConfig {
  /** Which strategy to use. */
  strategy: SamplingStrategy;
  /** Desired sample size. */
  sampleSize: number;
  /** Optional seed for deterministic random sampling. */
  seed?: number;
  /** Importance weights by probe id (for importance-weighted strategy). */
  weights?: Record<string, number>;
  /** If true, guarantee at least one probe per stratum. */
  ensureCoverage?: boolean;
}

export interface CoverageStatistics {
  totalProbes: number;
  sampledCount: number;
  samplingRate: number;
  theoryCoverage: Record<Theory, { total: number; sampled: number; rate: number }>;
  indicatorCoverage: Record<string, { total: number; sampled: number; rate: number }>;
  evidenceTypeCoverage: Record<EvidenceType, { total: number; sampled: number; rate: number }>;
  missingTheories: Theory[];
  missingIndicators: string[];
}

export interface SampleSizeParams {
  /** Expected effect size (Cohen's d). */
  effectSize: number;
  /** Desired statistical power (0-1, default 0.8). */
  power?: number;
  /** Significance level (default 0.05). */
  alpha?: number;
  /** Number of groups / theories being compared. */
  groups?: number;
}

/* ------------------------------------------------------------------ */
/*  Seeded PRNG (xoshiro128**)                                        */
/* ------------------------------------------------------------------ */

export class SeededRNG {
  private s: Uint32Array;

  constructor(seed: number) {
    this.s = new Uint32Array(4);
    // SplitMix32 to expand seed into 4 words
    let z = seed | 0;
    for (let i = 0; i < 4; i++) {
      z = (z + 0x9e3779b9) | 0;
      let t = z ^ (z >>> 16);
      t = Math.imul(t, 0x21f0aaad);
      t = t ^ (t >>> 15);
      t = Math.imul(t, 0x735a2d97);
      t = t ^ (t >>> 15);
      this.s[i] = t >>> 0;
    }
  }

  /** Returns a float in [0, 1). */
  next(): number {
    const s = this.s;
    const result = Math.imul(s[1] * 5, 7) >>> 0;
    const t = (s[1] << 9) >>> 0;

    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];
    s[2] ^= t;
    s[3] = ((s[3] << 11) | (s[3] >>> 21)) >>> 0;

    return (result >>> 0) / 0x100000000;
  }

  /** Shuffle an array in place (Fisher-Yates). */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

/* ------------------------------------------------------------------ */
/*  Sampling functions                                                */
/* ------------------------------------------------------------------ */

/** Simple random sampling with optional deterministic seed. */
export function randomSample(
  probes: ProbeDefinition[],
  size: number,
  seed?: number,
): ProbeDefinition[] {
  const rng = new SeededRNG(seed ?? Date.now());
  const shuffled = rng.shuffle([...probes]);
  return shuffled.slice(0, Math.min(size, shuffled.length));
}

/** Group probes by a key function. */
function groupBy<K extends string>(
  probes: ProbeDefinition[],
  keyFn: (p: ProbeDefinition) => K,
): Map<K, ProbeDefinition[]> {
  const map = new Map<K, ProbeDefinition[]>();
  for (const p of probes) {
    const key = keyFn(p);
    const arr = map.get(key) ?? [];
    arr.push(p);
    map.set(key, arr);
  }
  return map;
}

/** Stratified sampling — proportional allocation across strata. */
export function stratifiedSample(
  probes: ProbeDefinition[],
  size: number,
  stratumKey: "theory" | "indicator",
  seed?: number,
  ensureCoverage = false,
): ProbeDefinition[] {
  const rng = new SeededRNG(seed ?? Date.now());
  const keyFn =
    stratumKey === "theory"
      ? (p: ProbeDefinition) => p.theory
      : (p: ProbeDefinition) => p.indicatorId;

  const groups = groupBy(probes, keyFn);
  const total = probes.length;
  const result: ProbeDefinition[] = [];
  let remaining = Math.min(size, total);

  // If ensureCoverage, first pick one from each stratum
  if (ensureCoverage) {
    for (const [, group] of groups) {
      if (remaining <= 0) break;
      const idx = Math.floor(rng.next() * group.length);
      result.push(group[idx]);
      remaining--;
    }
  }

  // Proportional allocation for the rest
  const alreadyIds = new Set(result.map((p) => p.id));
  for (const [, group] of groups) {
    const proportion = group.length / total;
    const count = Math.max(0, Math.round(proportion * remaining));
    const candidates = group.filter((p) => !alreadyIds.has(p.id));
    rng.shuffle(candidates);
    for (let i = 0; i < count && i < candidates.length; i++) {
      result.push(candidates[i]);
      alreadyIds.add(candidates[i].id);
    }
  }

  // Fill if short
  if (result.length < size) {
    const leftover = probes.filter((p) => !alreadyIds.has(p.id));
    rng.shuffle(leftover);
    for (const p of leftover) {
      if (result.length >= size) break;
      result.push(p);
    }
  }

  return result.slice(0, size);
}

/** Importance-weighted sampling (probability proportional to weight). */
export function importanceWeightedSample(
  probes: ProbeDefinition[],
  size: number,
  weights: Record<string, number>,
  seed?: number,
): ProbeDefinition[] {
  const rng = new SeededRNG(seed ?? Date.now());
  const weighted = probes.map((p) => ({
    probe: p,
    weight: weights[p.id] ?? 1,
  }));

  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  const result: ProbeDefinition[] = [];
  const used = new Set<string>();

  const count = Math.min(size, probes.length);

  for (let i = 0; i < count; i++) {
    const available = weighted.filter((w) => !used.has(w.probe.id));
    if (available.length === 0) break;

    const availableWeight = available.reduce((s, w) => s + w.weight, 0);
    let r = rng.next() * availableWeight;

    for (const item of available) {
      r -= item.weight;
      if (r <= 0) {
        result.push(item.probe);
        used.add(item.probe.id);
        break;
      }
    }

    // Fallback (floating point edge)
    if (result.length === i) {
      const fallback = available[available.length - 1];
      result.push(fallback.probe);
      used.add(fallback.probe.id);
    }
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Main sampling entry point                                         */
/* ------------------------------------------------------------------ */

export function sampleProbes(
  probes: ProbeDefinition[],
  config: SamplingConfig,
): ProbeDefinition[] {
  switch (config.strategy) {
    case "random":
      return randomSample(probes, config.sampleSize, config.seed);
    case "stratified-theory":
      return stratifiedSample(
        probes,
        config.sampleSize,
        "theory",
        config.seed,
        config.ensureCoverage,
      );
    case "stratified-indicator":
      return stratifiedSample(
        probes,
        config.sampleSize,
        "indicator",
        config.seed,
        config.ensureCoverage,
      );
    case "importance-weighted":
      return importanceWeightedSample(
        probes,
        config.sampleSize,
        config.weights ?? {},
        config.seed,
      );
    default:
      throw new Error(`Unknown sampling strategy: ${config.strategy}`);
  }
}

/* ------------------------------------------------------------------ */
/*  Coverage statistics                                               */
/* ------------------------------------------------------------------ */

export function computeCoverage(
  allProbes: ProbeDefinition[],
  sampled: ProbeDefinition[],
): CoverageStatistics {
  const sampledIds = new Set(sampled.map((p) => p.id));

  const theoryCoverage = {} as CoverageStatistics["theoryCoverage"];
  const indicatorCoverage = {} as CoverageStatistics["indicatorCoverage"];
  const evidenceTypeCoverage = {} as CoverageStatistics["evidenceTypeCoverage"];

  for (const p of allProbes) {
    // Theory
    if (!theoryCoverage[p.theory]) {
      theoryCoverage[p.theory] = { total: 0, sampled: 0, rate: 0 };
    }
    theoryCoverage[p.theory].total++;
    if (sampledIds.has(p.id)) theoryCoverage[p.theory].sampled++;

    // Indicator
    if (!indicatorCoverage[p.indicatorId]) {
      indicatorCoverage[p.indicatorId] = { total: 0, sampled: 0, rate: 0 };
    }
    indicatorCoverage[p.indicatorId].total++;
    if (sampledIds.has(p.id)) indicatorCoverage[p.indicatorId].sampled++;

    // Evidence type
    if (!evidenceTypeCoverage[p.evidenceType]) {
      evidenceTypeCoverage[p.evidenceType] = { total: 0, sampled: 0, rate: 0 };
    }
    evidenceTypeCoverage[p.evidenceType].total++;
    if (sampledIds.has(p.id)) evidenceTypeCoverage[p.evidenceType].sampled++;
  }

  // Compute rates
  for (const key of Object.keys(theoryCoverage) as Theory[]) {
    const c = theoryCoverage[key];
    c.rate = c.total > 0 ? c.sampled / c.total : 0;
  }
  for (const key of Object.keys(indicatorCoverage)) {
    const c = indicatorCoverage[key];
    c.rate = c.total > 0 ? c.sampled / c.total : 0;
  }
  for (const key of Object.keys(evidenceTypeCoverage) as EvidenceType[]) {
    const c = evidenceTypeCoverage[key];
    c.rate = c.total > 0 ? c.sampled / c.total : 0;
  }

  const missingTheories = (Object.keys(theoryCoverage) as Theory[]).filter(
    (t) => theoryCoverage[t].sampled === 0,
  );
  const missingIndicators = Object.keys(indicatorCoverage).filter(
    (i) => indicatorCoverage[i].sampled === 0,
  );

  return {
    totalProbes: allProbes.length,
    sampledCount: sampled.length,
    samplingRate: allProbes.length > 0 ? sampled.length / allProbes.length : 0,
    theoryCoverage,
    indicatorCoverage,
    evidenceTypeCoverage,
    missingTheories,
    missingIndicators,
  };
}

/* ------------------------------------------------------------------ */
/*  Sample size calculator                                            */
/* ------------------------------------------------------------------ */

/** Approximate required sample size per group for a two-sample t-test. */
export function calculateSampleSize(params: SampleSizeParams): number {
  const { effectSize, power = 0.8, alpha = 0.05, groups = 2 } = params;

  if (effectSize <= 0) {
    throw new Error("Effect size must be positive");
  }

  // z-values from normal distribution (common approximations)
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(power);

  // Base formula: n = ((z_alpha + z_beta)^2 * 2) / d^2
  const baseN = Math.ceil(
    (2 * (zAlpha + zBeta) ** 2) / (effectSize ** 2),
  );

  // Bonferroni correction for multiple groups
  if (groups > 2) {
    const adjustedAlpha = alpha / (groups * (groups - 1) / 2);
    const zAlphaAdj = normalQuantile(1 - adjustedAlpha / 2);
    return Math.ceil(
      (2 * (zAlphaAdj + zBeta) ** 2) / (effectSize ** 2),
    );
  }

  return baseN;
}

/** Rational approximation of the normal quantile function. */
function normalQuantile(p: number): number {
  if (p <= 0 || p >= 1) throw new Error("p must be in (0,1)");
  if (p === 0.5) return 0;

  const sign = p < 0.5 ? -1 : 1;
  const q = p < 0.5 ? p : 1 - p;
  const t = Math.sqrt(-2 * Math.log(q));

  // Abramowitz & Stegun 26.2.23
  const c0 = 2.515517;
  const c1 = 0.802853;
  const c2 = 0.010328;
  const d1 = 1.432788;
  const d2 = 0.189269;
  const d3 = 0.001308;

  const num = c0 + c1 * t + c2 * t * t;
  const den = 1 + d1 * t + d2 * t * t + d3 * t * t * t;

  return sign * (t - num / den);
}
