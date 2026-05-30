/**
 * Self-consistency sampling for probe scoring stability (issue #569).
 *
 * Runs each probe multiple times and aggregates to reduce variance in
 * reasoning-model outputs — a standard 2026 technique. Reports per-probe
 * variance / standard error so noisy probes are visible.
 */

export type SampleAggregation = "mean" | "median" | "majority";

export interface SampleAggregateResult {
  value: number;
  standardError: number;
  variance: number;
  n: number;
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 === 0 ? (s[n / 2 - 1] + s[n / 2]) / 2 : s[Math.floor(n / 2)];
}

/** Majority vote after rounding scores to the nearest 0.1 bucket. */
function majority(xs: number[]): number {
  const counts = new Map<number, number>();
  for (const x of xs) {
    const bucket = Math.round(x * 10) / 10;
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  let best = xs[0];
  let bestCount = -1;
  for (const [bucket, c] of counts) {
    if (c > bestCount) {
      best = bucket;
      bestCount = c;
    }
  }
  return best;
}

function round(n: number, d = 4): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export function aggregateSamples(
  samples: number[],
  method: SampleAggregation = "mean"
): SampleAggregateResult {
  const n = samples.length;
  if (n === 0) return { value: 0, standardError: 0, variance: 0, n: 0 };
  if (n === 1) return { value: round(samples[0]), standardError: 0, variance: 0, n: 1 };

  const m = mean(samples);
  const variance = samples.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1);
  const standardError = Math.sqrt(variance / n);

  let value: number;
  switch (method) {
    case "median":
      value = median(samples);
      break;
    case "majority":
      value = majority(samples);
      break;
    default:
      value = m;
  }

  return {
    value: round(value),
    standardError: round(standardError),
    variance: round(variance),
    n,
  };
}

/** Estimate API cost/time scaling for a given sample count. */
export function samplingCostMultiplier(sampleCount: number): number {
  return Math.max(1, Math.floor(sampleCount));
}
