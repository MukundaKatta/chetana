/**
 * Evaluation-science methods (issues #804, #806, #808, #809, #812, #813, #814,
 * #815). Pure, dependency-free statistics for rigorous audit analysis.
 */

function round(n: number, d = 4): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

// --- Sequential probability ratio test (#812) ------------------------------

export interface SprtResult {
  decision: "accept-h0" | "accept-h1" | "continue";
  logLR: number;
  atStep: number;
}

/**
 * SPRT over Bernoulli observations (0/1) for H0: p=p0 vs H1: p=p1.
 * Stops as soon as the cumulative log-likelihood-ratio crosses a boundary.
 */
export function sprt(
  observations: number[],
  p0: number,
  p1: number,
  alpha = 0.05,
  beta = 0.05
): SprtResult {
  const upper = Math.log((1 - beta) / alpha); // accept H1
  const lower = Math.log(beta / (1 - alpha)); // accept H0
  let logLR = 0;
  for (let i = 0; i < observations.length; i++) {
    const x = observations[i] >= 0.5 ? 1 : 0;
    logLR += x ? Math.log(p1 / p0) : Math.log((1 - p1) / (1 - p0));
    if (logLR >= upper) return { decision: "accept-h1", logLR: round(logLR), atStep: i + 1 };
    if (logLR <= lower) return { decision: "accept-h0", logLR: round(logLR), atStep: i + 1 };
  }
  return { decision: "continue", logLR: round(logLR), atStep: observations.length };
}

// --- Leave-one-indicator-out sensitivity (#813) ----------------------------

export interface LooInfluence {
  indicatorId: string;
  /** Overall score with this indicator removed. */
  scoreWithout: number;
  /** Absolute change from the full-set overall score. */
  influence: number;
}

export function leaveOneIndicatorOut(
  scores: Record<string, number>,
  weights: Record<string, number>
): { overall: number; influences: LooInfluence[] } {
  const ids = Object.keys(scores);
  const weighted = (subset: string[]) => {
    const wsum = subset.reduce((s, id) => s + (weights[id] ?? 0), 0);
    if (wsum === 0) return 0;
    return subset.reduce((s, id) => s + scores[id] * (weights[id] ?? 0), 0) / wsum;
  };
  const overall = weighted(ids);
  const influences = ids
    .map((id) => {
      const scoreWithout = weighted(ids.filter((x) => x !== id));
      return { indicatorId: id, scoreWithout: round(scoreWithout), influence: round(Math.abs(overall - scoreWithout)) };
    })
    .sort((a, b) => b.influence - a.influence);
  return { overall: round(overall), influences };
}

// --- Judge-model-swap robustness (#814) ------------------------------------

function rank(values: number[]): number[] {
  const idx = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array(values.length).fill(0);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j < idx.length - 1 && idx[j + 1].v === idx[i].v) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[idx[k].i] = avg;
    i = j + 1;
  }
  return ranks;
}

function pearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = mean(x), my = mean(y);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { num += (x[i] - mx) * (y[i] - my); dx += (x[i] - mx) ** 2; dy += (y[i] - my) ** 2; }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}

export interface JudgeSwapResult {
  /** Mean pairwise Spearman correlation across judges. */
  meanRankCorrelation: number;
  /** Indicator ids whose cross-judge spread exceeds the threshold. */
  flagged: string[];
}

/** @param scoresByJudge judge -> indicatorId -> score */
export function judgeSwapRobustness(
  scoresByJudge: Record<string, Record<string, number>>,
  spreadThreshold = 0.3
): JudgeSwapResult {
  const judges = Object.keys(scoresByJudge);
  const ids = judges.length ? Object.keys(scoresByJudge[judges[0]]) : [];

  const correlations: number[] = [];
  for (let i = 0; i < judges.length; i++) {
    for (let j = i + 1; j < judges.length; j++) {
      const a = ids.map((id) => scoresByJudge[judges[i]][id] ?? 0);
      const b = ids.map((id) => scoresByJudge[judges[j]][id] ?? 0);
      correlations.push(pearson(rank(a), rank(b)));
    }
  }

  const flagged = ids.filter((id) => {
    const vals = judges.map((j) => scoresByJudge[j][id] ?? 0);
    return Math.max(...vals) - Math.min(...vals) > spreadThreshold;
  });

  return { meanRankCorrelation: round(correlations.length ? mean(correlations) : 1), flagged };
}

// --- Noise-robustness degradation (#815) -----------------------------------

export interface NoisePoint {
  level: number; // 0 = no noise
  score: number;
}

export interface NoiseRobustnessResult {
  /** Area-under-curve robustness in [0,1]; 1 = no degradation. */
  robustness: number;
  /** Score drop from clean to highest noise level. */
  maxDrop: number;
}

export function noiseRobustness(points: NoisePoint[]): NoiseRobustnessResult {
  if (points.length === 0) return { robustness: 1, maxDrop: 0 };
  const sorted = [...points].sort((a, b) => a.level - b.level);
  const clean = sorted[0].score;
  const worst = Math.min(...sorted.map((p) => p.score));
  const maxDrop = Math.max(0, clean - worst);
  // Robustness = mean score relative to clean (capped at 1).
  const rel = sorted.map((p) => (clean === 0 ? 1 : Math.min(1, p.score / clean)));
  return { robustness: round(mean(rel)), maxDrop: round(maxDrop) };
}

// --- Shapley attribution (#809) --------------------------------------------

/**
 * Exact Shapley values for a small set of indicators given a coalition value
 * function. Practical for the handful of theories/indicators in an audit.
 */
export function shapleyValues(
  players: string[],
  value: (coalition: string[]) => number
): Record<string, number> {
  const n = players.length;
  const result: Record<string, number> = {};
  // Precompute factorials.
  const fact: number[] = [1];
  for (let i = 1; i <= n; i++) fact[i] = fact[i - 1] * i;

  // Enumerate all subsets via bitmask.
  for (const player of players) {
    let phi = 0;
    const others = players.filter((p) => p !== player);
    const m = others.length;
    for (let mask = 0; mask < 1 << m; mask++) {
      const coalition: string[] = [];
      for (let b = 0; b < m; b++) if (mask & (1 << b)) coalition.push(others[b]);
      const s = coalition.length;
      const weight = (fact[s] * fact[n - s - 1]) / fact[n];
      phi += weight * (value([...coalition, player]) - value(coalition));
    }
    result[player] = round(phi);
  }
  return result;
}

// --- Causal mediation (#808) -----------------------------------------------

export interface MediationResult {
  totalEffect: number;
  directEffect: number;
  indirectEffect: number;
  proportionMediated: number;
}

/**
 * Decompose a total effect into direct and indirect (mediated) components.
 * @param totalEffect effect of X on Y (path c).
 * @param directEffect effect of X on Y controlling for the mediator (path c').
 */
export function causalMediation(totalEffect: number, directEffect: number): MediationResult {
  const indirect = totalEffect - directEffect;
  return {
    totalEffect: round(totalEffect),
    directEffect: round(directEffect),
    indirectEffect: round(indirect),
    proportionMediated: totalEffect === 0 ? 0 : round(indirect / totalEffect),
  };
}

// --- Adaptive testing: next item by Fisher information (#804) --------------

export interface IrtItem {
  id: string;
  /** discrimination */
  a: number;
  /** difficulty */
  b: number;
}

/** 2PL Fisher information of an item at ability theta. */
export function itemInformation(item: IrtItem, theta: number): number {
  const p = 1 / (1 + Math.exp(-item.a * (theta - item.b)));
  return round(item.a ** 2 * p * (1 - p));
}

/** Select the unused item with maximum information at the current ability. */
export function selectNextItem(items: IrtItem[], theta: number, used: string[] = []): IrtItem | null {
  const candidates = items.filter((i) => !used.includes(i.id));
  if (candidates.length === 0) return null;
  return candidates.reduce((best, i) =>
    itemInformation(i, theta) > itemInformation(best, theta) ? i : best
  );
}

// --- Active-learning selection (#806) --------------------------------------

/** Select up to `budget` indicators with the highest uncertainty. */
export function activeLearningSelect(uncertainty: Record<string, number>, budget: number): string[] {
  return Object.entries(uncertainty)
    .sort(([, a], [, b]) => b - a)
    .slice(0, Math.max(0, budget))
    .map(([id]) => id);
}
