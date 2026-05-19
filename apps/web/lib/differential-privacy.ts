/**
 * Differential privacy utilities (Issue #516).
 *
 * Laplace noise injection, configurable epsilon, privacy loss accounting,
 * utility-privacy trade-off analysis, and private aggregates for
 * consciousness scoring data.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface PrivacyBudget {
  /** Total epsilon budget available. */
  totalEpsilon: number;
  /** Epsilon consumed so far. */
  consumedEpsilon: number;
  /** Total delta budget (for approximate DP). */
  totalDelta: number;
  /** Delta consumed so far. */
  consumedDelta: number;
  /** Number of queries executed. */
  queryCount: number;
}

export interface PrivacyConfig {
  /** Privacy parameter epsilon (lower = more private). */
  epsilon: number;
  /** Privacy parameter delta for approximate DP (default 1e-5). */
  delta: number;
  /** Sensitivity of the query (maximum change from one record). */
  sensitivity: number;
  /** Clipping bounds for values [min, max]. */
  clippingBounds?: [number, number];
}

export interface NoisyResult<T> {
  /** The noisy (private) value. */
  value: T;
  /** The noise magnitude added. */
  noiseMagnitude: number;
  /** Epsilon spent for this query. */
  epsilonSpent: number;
  /** Estimated accuracy at 95% confidence. */
  accuracyBound: number;
}

export interface UtilityPrivacyPoint {
  epsilon: number;
  expectedError: number;
  privacyGuarantee: string;
  utilityScore: number;
}

export interface PrivateAggregateResult {
  noisyMean: number;
  noisyCount: number;
  noisySum: number;
  noisyMedian: number;
  noisyVariance: number;
  epsilonPerQuery: number;
  totalEpsilonSpent: number;
  confidenceBounds: { lower: number; upper: number };
}

export interface PrivacyLossRecord {
  timestamp: string;
  queryType: string;
  epsilonSpent: number;
  deltaSpent: number;
  cumulativeEpsilon: number;
  cumulativeDelta: number;
}

/* ------------------------------------------------------------------ */
/*  Privacy loss accountant                                           */
/* ------------------------------------------------------------------ */

export class PrivacyAccountant {
  private budget: PrivacyBudget;
  private history: PrivacyLossRecord[] = [];

  constructor(totalEpsilon: number, totalDelta: number = 1e-5) {
    this.budget = {
      totalEpsilon,
      consumedEpsilon: 0,
      totalDelta,
      consumedDelta: 0,
      queryCount: 0,
    };
  }

  /** Returns current budget status. */
  getBudget(): PrivacyBudget {
    return { ...this.budget };
  }

  /** Returns remaining epsilon. */
  remainingEpsilon(): number {
    return Math.max(0, this.budget.totalEpsilon - this.budget.consumedEpsilon);
  }

  /** Returns remaining delta. */
  remainingDelta(): number {
    return Math.max(0, this.budget.totalDelta - this.budget.consumedDelta);
  }

  /** Check whether a query with the given cost can be executed. */
  canSpend(epsilon: number, delta: number = 0): boolean {
    return (
      this.budget.consumedEpsilon + epsilon <= this.budget.totalEpsilon &&
      this.budget.consumedDelta + delta <= this.budget.totalDelta
    );
  }

  /**
   * Record privacy expenditure for a query.
   * Uses basic sequential composition (epsilon adds up).
   */
  recordSpend(
    epsilon: number,
    delta: number = 0,
    queryType: string = "unknown"
  ): void {
    if (!this.canSpend(epsilon, delta)) {
      throw new Error(
        `Privacy budget exceeded. Remaining epsilon: ${this.remainingEpsilon().toFixed(4)}, requested: ${epsilon}`
      );
    }
    this.budget.consumedEpsilon += epsilon;
    this.budget.consumedDelta += delta;
    this.budget.queryCount += 1;

    this.history.push({
      timestamp: new Date().toISOString(),
      queryType,
      epsilonSpent: epsilon,
      deltaSpent: delta,
      cumulativeEpsilon: this.budget.consumedEpsilon,
      cumulativeDelta: this.budget.consumedDelta,
    });
  }

  /**
   * Advanced composition (strong composition theorem).
   * For k queries each with epsilon_0, the total epsilon is bounded by
   * sqrt(2k ln(1/delta')) * epsilon_0 + k * epsilon_0 * (exp(epsilon_0) - 1)
   */
  advancedComposition(
    epsilonPerQuery: number,
    numQueries: number,
    deltaPrime: number = 1e-5
  ): number {
    const term1 =
      Math.sqrt(2 * numQueries * Math.log(1 / deltaPrime)) * epsilonPerQuery;
    const term2 =
      numQueries * epsilonPerQuery * (Math.exp(epsilonPerQuery) - 1);
    return term1 + term2;
  }

  /** Return the full history of privacy expenditures. */
  getHistory(): PrivacyLossRecord[] {
    return [...this.history];
  }

  /** Reset the accountant. */
  reset(): void {
    this.budget.consumedEpsilon = 0;
    this.budget.consumedDelta = 0;
    this.budget.queryCount = 0;
    this.history = [];
  }
}

/* ------------------------------------------------------------------ */
/*  Laplace mechanism                                                 */
/* ------------------------------------------------------------------ */

/**
 * Sample from a Laplace distribution with location 0 and scale b.
 * Uses inverse CDF method: X = -b * sign(u) * ln(1 - 2|u|) where u ~ Uniform(-0.5, 0.5).
 */
function sampleLaplace(scale: number): number {
  const u = Math.random() - 0.5;
  const sign = u < 0 ? -1 : 1;
  return -scale * sign * Math.log(1 - 2 * Math.abs(u));
}

/**
 * Compute the scale parameter for Laplace noise given sensitivity and epsilon.
 */
function laplaceScale(sensitivity: number, epsilon: number): number {
  if (epsilon <= 0) throw new Error("Epsilon must be positive");
  return sensitivity / epsilon;
}

/**
 * Add Laplace noise to a numeric value.
 */
export function addLaplaceNoise(
  value: number,
  config: PrivacyConfig,
  accountant?: PrivacyAccountant
): NoisyResult<number> {
  const scale = laplaceScale(config.sensitivity, config.epsilon);
  const noise = sampleLaplace(scale);
  let noisy = value + noise;

  // Apply clipping bounds if specified
  if (config.clippingBounds) {
    noisy = Math.max(config.clippingBounds[0], Math.min(config.clippingBounds[1], noisy));
  }

  if (accountant) {
    accountant.recordSpend(config.epsilon, 0, "laplace");
  }

  // Accuracy bound: P(|noise| > t) = exp(-t * epsilon / sensitivity)
  // At 95% confidence: t = scale * ln(1/0.05)
  const accuracyBound = scale * Math.log(1 / 0.05);

  return {
    value: noisy,
    noiseMagnitude: Math.abs(noise),
    epsilonSpent: config.epsilon,
    accuracyBound,
  };
}

/**
 * Add Laplace noise to an array of values (each independently).
 */
export function addLaplaceNoiseVector(
  values: number[],
  config: PrivacyConfig,
  accountant?: PrivacyAccountant
): NoisyResult<number[]> {
  const scale = laplaceScale(config.sensitivity, config.epsilon);
  const noisyValues: number[] = [];
  let totalNoise = 0;

  for (const v of values) {
    const noise = sampleLaplace(scale);
    let noisy = v + noise;
    if (config.clippingBounds) {
      noisy = Math.max(config.clippingBounds[0], Math.min(config.clippingBounds[1], noisy));
    }
    noisyValues.push(noisy);
    totalNoise += Math.abs(noise);
  }

  // Total epsilon for vector query (composition)
  const totalEpsilon = config.epsilon * values.length;

  if (accountant) {
    accountant.recordSpend(totalEpsilon, 0, "laplace_vector");
  }

  const accuracyBound = scale * Math.log(1 / 0.05);

  return {
    value: noisyValues,
    noiseMagnitude: totalNoise / values.length,
    epsilonSpent: totalEpsilon,
    accuracyBound,
  };
}

/* ------------------------------------------------------------------ */
/*  Private aggregates                                                */
/* ------------------------------------------------------------------ */

/**
 * Clip a value to [lower, upper].
 */
function clip(value: number, lower: number, upper: number): number {
  return Math.max(lower, Math.min(upper, value));
}

/**
 * Compute private aggregates (mean, count, sum, median, variance) over data.
 * Splits the epsilon budget evenly across the 5 aggregates.
 */
export function privateAggregates(
  data: number[],
  epsilon: number,
  bounds: [number, number],
  accountant?: PrivacyAccountant
): PrivateAggregateResult {
  if (data.length === 0) {
    throw new Error("Data array must not be empty");
  }

  const numQueries = 5;
  const epsilonPerQuery = epsilon / numQueries;
  const [lower, upper] = bounds;
  const range = upper - lower;

  // Clip all data
  const clipped = data.map((v) => clip(v, lower, upper));

  // Private count (sensitivity = 1)
  const rawCount = clipped.length;
  const noisyCountResult = addLaplaceNoise(rawCount, {
    epsilon: epsilonPerQuery,
    delta: 0,
    sensitivity: 1,
  });
  const noisyCount = Math.max(1, Math.round(noisyCountResult.value));

  // Private sum (sensitivity = range)
  const rawSum = clipped.reduce((a, b) => a + b, 0);
  const noisySumResult = addLaplaceNoise(rawSum, {
    epsilon: epsilonPerQuery,
    delta: 0,
    sensitivity: range,
  });

  // Private mean = noisy_sum / noisy_count
  const noisyMean = noisySumResult.value / noisyCount;

  // Private median via exponential mechanism approximation
  // Use noisy median: sort + add noise to the index
  const sorted = [...clipped].sort((a, b) => a - b);
  const medianIndex = Math.floor(sorted.length / 2);
  const noisyMedianResult = addLaplaceNoise(sorted[medianIndex], {
    epsilon: epsilonPerQuery,
    delta: 0,
    sensitivity: range,
  });

  // Private variance (sensitivity = range^2 / n)
  const rawVariance =
    clipped.reduce((acc, v) => acc + (v - rawSum / rawCount) ** 2, 0) /
    rawCount;
  const varianceSensitivity = (range * range) / rawCount;
  const noisyVarianceResult = addLaplaceNoise(rawVariance, {
    epsilon: epsilonPerQuery,
    delta: 0,
    sensitivity: varianceSensitivity,
  });

  const totalEpsilonSpent = epsilon;

  if (accountant) {
    accountant.recordSpend(totalEpsilonSpent, 0, "aggregate");
  }

  // Confidence bounds for the mean
  const meanScale = laplaceScale(range, epsilonPerQuery) / noisyCount;
  const confBound = meanScale * Math.log(1 / 0.05);

  return {
    noisyMean: clip(noisyMean, lower, upper),
    noisyCount,
    noisySum: noisySumResult.value,
    noisyMedian: clip(noisyMedianResult.value, lower, upper),
    noisyVariance: Math.max(0, noisyVarianceResult.value),
    epsilonPerQuery,
    totalEpsilonSpent,
    confidenceBounds: {
      lower: clip(noisyMean - confBound, lower, upper),
      upper: clip(noisyMean + confBound, lower, upper),
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Utility-privacy trade-off analysis                                */
/* ------------------------------------------------------------------ */

/**
 * Compute the utility-privacy trade-off curve for a range of epsilon values.
 * Returns points showing expected error and privacy guarantee at each epsilon.
 */
export function utilityPrivacyTradeoff(
  sensitivity: number,
  epsilonRange: { min: number; max: number; steps: number }
): UtilityPrivacyPoint[] {
  const points: UtilityPrivacyPoint[] = [];
  const step =
    (epsilonRange.max - epsilonRange.min) / Math.max(1, epsilonRange.steps - 1);

  for (let i = 0; i < epsilonRange.steps; i++) {
    const epsilon = epsilonRange.min + step * i;
    const scale = sensitivity / epsilon;
    const expectedError = scale; // E[|Laplace(0, b)|] = b
    const accuracyAt95 = scale * Math.log(1 / 0.05); // ~3b

    let guarantee: string;
    if (epsilon <= 0.1) {
      guarantee = "Strong privacy (near-indistinguishable)";
    } else if (epsilon <= 1.0) {
      guarantee = "Moderate privacy";
    } else if (epsilon <= 5.0) {
      guarantee = "Weak privacy";
    } else {
      guarantee = "Minimal privacy";
    }

    // Utility score: inverse relationship with error, normalized 0-1
    const utilityScore = 1 / (1 + expectedError);

    points.push({
      epsilon,
      expectedError,
      privacyGuarantee: guarantee,
      utilityScore,
    });
  }

  return points;
}

/* ------------------------------------------------------------------ */
/*  Gaussian mechanism (for (epsilon, delta)-DP)                      */
/* ------------------------------------------------------------------ */

/**
 * Sample from a standard normal distribution using Box-Muller transform.
 */
function sampleGaussian(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Add Gaussian noise for approximate (epsilon, delta)-differential privacy.
 */
export function addGaussianNoise(
  value: number,
  config: PrivacyConfig,
  accountant?: PrivacyAccountant
): NoisyResult<number> {
  if (config.delta <= 0) {
    throw new Error("Delta must be positive for Gaussian mechanism");
  }

  // sigma = sensitivity * sqrt(2 * ln(1.25 / delta)) / epsilon
  const sigma =
    (config.sensitivity * Math.sqrt(2 * Math.log(1.25 / config.delta))) /
    config.epsilon;

  const noise = sampleGaussian() * sigma;
  let noisy = value + noise;

  if (config.clippingBounds) {
    noisy = Math.max(config.clippingBounds[0], Math.min(config.clippingBounds[1], noisy));
  }

  if (accountant) {
    accountant.recordSpend(config.epsilon, config.delta, "gaussian");
  }

  return {
    value: noisy,
    noiseMagnitude: Math.abs(noise),
    epsilonSpent: config.epsilon,
    accuracyBound: 1.96 * sigma, // 95% confidence
  };
}

/* ------------------------------------------------------------------ */
/*  Randomized response (for binary/categorical data)                 */
/* ------------------------------------------------------------------ */

/**
 * Randomized response mechanism for binary data.
 * Each true answer is reported truthfully with probability p = e^epsilon / (1 + e^epsilon).
 */
export function randomizedResponse(
  truthfulAnswer: boolean,
  epsilon: number,
  accountant?: PrivacyAccountant
): NoisyResult<boolean> {
  const p = Math.exp(epsilon) / (1 + Math.exp(epsilon));
  const coin = Math.random();
  const reported = coin < p ? truthfulAnswer : !truthfulAnswer;

  if (accountant) {
    accountant.recordSpend(epsilon, 0, "randomized_response");
  }

  return {
    value: reported,
    noiseMagnitude: reported === truthfulAnswer ? 0 : 1,
    epsilonSpent: epsilon,
    accuracyBound: 1 - p,
  };
}
