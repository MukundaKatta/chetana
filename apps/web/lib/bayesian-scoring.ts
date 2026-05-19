/**
 * Bayesian scoring engine for consciousness theories (Issue #436).
 * Computes posterior distributions from prior beliefs and probe results
 * using Bayes' theorem with support for credible intervals and
 * prior sensitivity analysis.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type Theory = "gwt" | "iit" | "hot" | "rpt" | "pp" | "ast";

/** Parameters of a Beta distribution used as conjugate prior. */
export interface BetaPrior {
  /** Alpha (successes + 1). Must be > 0. */
  alpha: number;
  /** Beta (failures + 1). Must be > 0. */
  beta: number;
}

/** A single probe observation for Bayesian updating. */
export interface ProbeObservation {
  /** Probe identifier. */
  probeId: string;
  /** Theory being evaluated. */
  theory: Theory;
  /** Score from 0-1 representing evidence strength. */
  score: number;
  /** Number of effective trials this observation represents (default 1). */
  weight?: number;
}

/** Result of Bayesian posterior computation. */
export interface PosteriorResult {
  theory: Theory;
  prior: BetaPrior;
  posterior: BetaPrior;
  /** Mean of the posterior distribution. */
  posteriorMean: number;
  /** Mode of the posterior distribution (MAP estimate). */
  posteriorMode: number;
  /** Variance of the posterior distribution. */
  posteriorVariance: number;
  /** Credible interval at the requested level. */
  credibleInterval: CredibleInterval;
  /** Number of observations incorporated. */
  observationCount: number;
}

export interface CredibleInterval {
  /** Lower bound. */
  lower: number;
  /** Upper bound. */
  upper: number;
  /** Credibility level (e.g. 0.95). */
  level: number;
}

/** Result of prior sensitivity analysis. */
export interface SensitivityResult {
  theory: Theory;
  /** Posterior means under different prior specifications. */
  variations: SensitivityVariation[];
  /** Maximum absolute difference in posterior means. */
  maxDelta: number;
  /** Whether the conclusion is robust across priors. */
  isRobust: boolean;
}

export interface SensitivityVariation {
  label: string;
  prior: BetaPrior;
  posteriorMean: number;
  credibleInterval: CredibleInterval;
}

export interface BayesianScoringConfig {
  /** Default prior per theory. If not specified, uses uninformative Beta(1,1). */
  priors?: Partial<Record<Theory, BetaPrior>>;
  /** Credible interval level (default 0.95). */
  credibleLevel?: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const DEFAULT_PRIOR: BetaPrior = { alpha: 1, beta: 1 };
const DEFAULT_CREDIBLE_LEVEL = 0.95;

const ALL_THEORIES: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];

/* ------------------------------------------------------------------ */
/*  Beta distribution utilities                                       */
/* ------------------------------------------------------------------ */

/** Mean of a Beta distribution. */
export function betaMean(prior: BetaPrior): number {
  return prior.alpha / (prior.alpha + prior.beta);
}

/** Mode of a Beta distribution. Returns 0.5 for Beta(1,1). */
export function betaMode(prior: BetaPrior): number {
  if (prior.alpha <= 1 && prior.beta <= 1) return 0.5;
  if (prior.alpha <= 1) return 0;
  if (prior.beta <= 1) return 1;
  return (prior.alpha - 1) / (prior.alpha + prior.beta - 2);
}

/** Variance of a Beta distribution. */
export function betaVariance(prior: BetaPrior): number {
  const { alpha, beta } = prior;
  return (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
}

/**
 * Approximate quantile of a Beta distribution using the normal approximation
 * with a continuity correction for moderate alpha+beta. Falls back to a
 * bisection approach on the regularised incomplete beta for small sample sizes.
 */
export function betaQuantile(prior: BetaPrior, p: number): number {
  // Use bisection on the CDF for accuracy
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2;
    if (betaCDF(mid, prior.alpha, prior.beta) < p) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

/**
 * Regularised incomplete beta function via continued fraction expansion.
 * Gives the CDF of the Beta distribution at x.
 */
function betaCDF(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Use the symmetry relation when x > (a+1)/(a+b+2)
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - betaCDF(1 - x, b, a);
  }

  const lnBeta = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
  const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lnBeta) / a;

  // Lentz continued fraction
  let f = 1;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  f = d;

  for (let m = 1; m <= 200; m++) {
    // Even step
    let numerator =
      (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 + numerator * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + numerator / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    f *= c * d;

    // Odd step
    numerator =
      -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + numerator * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + numerator / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const delta = c * d;
    f *= delta;

    if (Math.abs(delta - 1) < 1e-10) break;
  }

  return front * f;
}

/** Lanczos approximation for ln(Gamma(z)). */
function lnGamma(z: number): number {
  const g = 7;
  const coefs = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return (
      Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z)
    );
  }
  z -= 1;
  let x = coefs[0];
  for (let i = 1; i < g + 2; i++) {
    x += coefs[i] / (z + i);
  }
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/* ------------------------------------------------------------------ */
/*  Likelihood computation                                            */
/* ------------------------------------------------------------------ */

/**
 * Computes the likelihood contribution from a single probe observation.
 * Uses the Beta-Binomial conjugate model: the observation score is treated
 * as a proportion of `weight` effective Bernoulli trials.
 */
export function likelihoodUpdate(
  prior: BetaPrior,
  observation: ProbeObservation,
): BetaPrior {
  const weight = observation.weight ?? 1;
  const successes = observation.score * weight;
  const failures = (1 - observation.score) * weight;
  return {
    alpha: prior.alpha + successes,
    beta: prior.beta + failures,
  };
}

/* ------------------------------------------------------------------ */
/*  Core scoring engine                                               */
/* ------------------------------------------------------------------ */

/**
 * Compute the posterior distribution for each theory given observations.
 */
export function computePosteriors(
  observations: ProbeObservation[],
  config: BayesianScoringConfig = {},
): PosteriorResult[] {
  const { priors = {}, credibleLevel = DEFAULT_CREDIBLE_LEVEL } = config;

  // Group observations by theory
  const byTheory = new Map<Theory, ProbeObservation[]>();
  for (const theory of ALL_THEORIES) {
    byTheory.set(theory, []);
  }
  for (const obs of observations) {
    const list = byTheory.get(obs.theory);
    if (list) list.push(obs);
  }

  const results: PosteriorResult[] = [];

  for (const theory of ALL_THEORIES) {
    const prior = priors[theory] ?? DEFAULT_PRIOR;
    const theoryObs = byTheory.get(theory) ?? [];

    // Sequential Bayesian update
    let posterior = { ...prior };
    for (const obs of theoryObs) {
      posterior = likelihoodUpdate(posterior, obs);
    }

    const tail = (1 - credibleLevel) / 2;
    const credibleInterval: CredibleInterval = {
      lower: betaQuantile(posterior, tail),
      upper: betaQuantile(posterior, 1 - tail),
      level: credibleLevel,
    };

    results.push({
      theory,
      prior,
      posterior,
      posteriorMean: betaMean(posterior),
      posteriorMode: betaMode(posterior),
      posteriorVariance: betaVariance(posterior),
      credibleInterval,
      observationCount: theoryObs.length,
    });
  }

  return results;
}

/**
 * Compute a single theory's posterior (convenience wrapper).
 */
export function computeTheoryPosterior(
  theory: Theory,
  observations: ProbeObservation[],
  prior?: BetaPrior,
  credibleLevel?: number,
): PosteriorResult {
  const theoryObs = observations.filter((o) => o.theory === theory);
  const results = computePosteriors(theoryObs, {
    priors: prior ? { [theory]: prior } : undefined,
    credibleLevel,
  });
  return results.find((r) => r.theory === theory)!;
}

/* ------------------------------------------------------------------ */
/*  Credible intervals                                                */
/* ------------------------------------------------------------------ */

/**
 * Compute the highest-density credible interval (HDI) for a Beta posterior.
 * Uses bisection to find the narrowest interval containing the given mass.
 */
export function highestDensityInterval(
  posterior: BetaPrior,
  level: number = DEFAULT_CREDIBLE_LEVEL,
): CredibleInterval {
  const tail = 1 - level;
  let bestLower = 0;
  let bestUpper = 1;
  let bestWidth = 1;

  // Scan over possible lower tail probabilities
  const steps = 200;
  for (let i = 0; i <= steps; i++) {
    const pLower = (i / steps) * tail;
    const pUpper = 1 - tail + pLower;
    const lower = betaQuantile(posterior, pLower);
    const upper = betaQuantile(posterior, pUpper);
    const width = upper - lower;
    if (width < bestWidth) {
      bestWidth = width;
      bestLower = lower;
      bestUpper = upper;
    }
  }

  return { lower: bestLower, upper: bestUpper, level };
}

/* ------------------------------------------------------------------ */
/*  Prior sensitivity analysis                                        */
/* ------------------------------------------------------------------ */

/** Predefined prior specifications for sensitivity analysis. */
const SENSITIVITY_PRIORS: Array<{ label: string; prior: BetaPrior }> = [
  { label: "Uninformative (1,1)", prior: { alpha: 1, beta: 1 } },
  { label: "Skeptical (1,3)", prior: { alpha: 1, beta: 3 } },
  { label: "Optimistic (3,1)", prior: { alpha: 3, beta: 1 } },
  { label: "Neutral (2,2)", prior: { alpha: 2, beta: 2 } },
  { label: "Strong skeptical (1,10)", prior: { alpha: 1, beta: 10 } },
  { label: "Strong optimistic (10,1)", prior: { alpha: 10, beta: 1 } },
  { label: "Jeffreys (0.5,0.5)", prior: { alpha: 0.5, beta: 0.5 } },
];

/**
 * Analyse how sensitive the posterior is to different prior choices.
 *
 * @param theory - The theory to analyse.
 * @param observations - Probe observations for that theory.
 * @param customPriors - Optional additional prior specs to include.
 * @param credibleLevel - Credible interval level (default 0.95).
 * @param robustnessThreshold - Max delta for "robust" flag (default 0.1).
 */
export function priorSensitivityAnalysis(
  theory: Theory,
  observations: ProbeObservation[],
  customPriors?: Array<{ label: string; prior: BetaPrior }>,
  credibleLevel: number = DEFAULT_CREDIBLE_LEVEL,
  robustnessThreshold: number = 0.1,
): SensitivityResult {
  const priorsToTest = [...SENSITIVITY_PRIORS, ...(customPriors ?? [])];
  const theoryObs = observations.filter((o) => o.theory === theory);

  const variations: SensitivityVariation[] = priorsToTest.map(({ label, prior }) => {
    let posterior = { ...prior };
    for (const obs of theoryObs) {
      posterior = likelihoodUpdate(posterior, obs);
    }
    const tail = (1 - credibleLevel) / 2;
    return {
      label,
      prior,
      posteriorMean: betaMean(posterior),
      credibleInterval: {
        lower: betaQuantile(posterior, tail),
        upper: betaQuantile(posterior, 1 - tail),
        level: credibleLevel,
      },
    };
  });

  const means = variations.map((v) => v.posteriorMean);
  const maxDelta = Math.max(...means) - Math.min(...means);

  return {
    theory,
    variations,
    maxDelta,
    isRobust: maxDelta <= robustnessThreshold,
  };
}

/**
 * Rank theories by their posterior mean score.
 */
export function rankTheories(
  results: PosteriorResult[],
): Array<PosteriorResult & { rank: number }> {
  return [...results]
    .sort((a, b) => b.posteriorMean - a.posteriorMean)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}
