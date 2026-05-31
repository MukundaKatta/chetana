/**
 * Longitudinal cohort analysis (issue #731).
 *
 * Groups audited models into cohorts and computes per-cohort score trajectories
 * over time with simple confidence bands.
 */

function round(n: number, d = 4): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export interface CohortAuditPoint {
  cohort: string;
  date: string; // ISO
  score: number;
}

export interface TrajectoryPoint {
  date: string;
  mean: number;
  lower: number;
  upper: number;
  n: number;
}

export interface CohortTrajectory {
  cohort: string;
  points: TrajectoryPoint[];
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function stdErr(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const variance = xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance / xs.length);
}

/** Build per-cohort, per-date trajectories with 95% bands. */
export function buildCohortTrajectories(points: CohortAuditPoint[]): CohortTrajectory[] {
  const byCohort = new Map<string, Map<string, number[]>>();
  for (const p of points) {
    if (!byCohort.has(p.cohort)) byCohort.set(p.cohort, new Map());
    const dates = byCohort.get(p.cohort)!;
    (dates.get(p.date) ?? dates.set(p.date, []).get(p.date)!).push(p.score);
  }

  const trajectories: CohortTrajectory[] = [];
  for (const [cohort, dates] of byCohort) {
    const pts: TrajectoryPoint[] = [...dates.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, scores]) => {
        const m = mean(scores);
        const se = stdErr(scores);
        return {
          date,
          mean: round(m),
          lower: round(Math.max(0, m - 1.96 * se)),
          upper: round(Math.min(1, m + 1.96 * se)),
          n: scores.length,
        };
      });
    trajectories.push({ cohort, points: pts });
  }
  return trajectories.sort((a, b) => a.cohort.localeCompare(b.cohort));
}
