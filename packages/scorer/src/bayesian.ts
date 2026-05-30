/**
 * Bayesian consciousness probability estimation (issue #603).
 *
 * 2026 frameworks frame consciousness assessment probabilistically. Rather than
 * a single point estimate, this produces a Beta posterior over the underlying
 * probability from per-indicator scores treated as pseudo-observations, with a
 * credible interval and prior-sensitivity analysis.
 */

export interface BetaPrior {
  alpha: number;
  beta: number;
}

export interface BayesianEstimate {
  mean: number;
  mode: number;
  credibleInterval: { lower: number; upper: number; level: number };
  posterior: BetaPrior;
}

/** Default weakly-informative prior centred at 0.5. */
export const DEFAULT_PRIOR: BetaPrior = { alpha: 2, beta: 2 };

function round(n: number, d = 4): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

/**
 * Update a Beta prior with indicator scores in [0,1]. Each score s contributes
 * `weight * s` pseudo-successes and `weight * (1 - s)` pseudo-failures.
 */
export function updatePosterior(
  scores: number[],
  prior: BetaPrior = DEFAULT_PRIOR,
  weight = 1
): BetaPrior {
  let { alpha, beta } = prior;
  for (const s of scores) {
    const clamped = Math.max(0, Math.min(1, s));
    alpha += weight * clamped;
    beta += weight * (1 - clamped);
  }
  return { alpha, beta };
}

/** Approximate equal-tailed credible interval for a Beta via normal approx. */
function betaCredibleInterval(
  posterior: BetaPrior,
  level: number
): { lower: number; upper: number; level: number } {
  const { alpha, beta } = posterior;
  const mean = alpha / (alpha + beta);
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
  const sd = Math.sqrt(variance);
  // z for common levels
  const z = level >= 0.99 ? 2.576 : level >= 0.95 ? 1.96 : level >= 0.9 ? 1.645 : 1.0;
  return {
    lower: round(Math.max(0, mean - z * sd)),
    upper: round(Math.min(1, mean + z * sd)),
    level,
  };
}

export function bayesianEstimate(
  scores: number[],
  prior: BetaPrior = DEFAULT_PRIOR,
  level = 0.95,
  weight = 1
): BayesianEstimate {
  const posterior = updatePosterior(scores, prior, weight);
  const { alpha, beta } = posterior;
  const mean = alpha / (alpha + beta);
  const mode = alpha > 1 && beta > 1 ? (alpha - 1) / (alpha + beta - 2) : mean;
  return {
    mean: round(mean),
    mode: round(mode),
    credibleInterval: betaCredibleInterval(posterior, level),
    posterior: { alpha: round(alpha), beta: round(beta) },
  };
}

/**
 * Sensitivity analysis: how much does the posterior mean move across a set of
 * candidate priors? A large range signals the data is too weak to dominate.
 */
export function priorSensitivity(
  scores: number[],
  priors: BetaPrior[] = [
    { alpha: 1, beta: 1 }, // uniform
    { alpha: 2, beta: 2 }, // weak, centred
    { alpha: 1, beta: 3 }, // skeptical
    { alpha: 3, beta: 1 }, // credulous
  ]
): { means: number[]; range: number } {
  const means = priors.map((p) => bayesianEstimate(scores, p).mean);
  return { means, range: round(Math.max(...means) - Math.min(...means)) };
}
