/**
 * Weekly digest data builder (Issue #221).
 * Builds a structured summary of a user's activity over a given week,
 * including audits completed, score trends, and new models tested.
 */

export interface DigestAuditSummary {
  auditId: string;
  modelName: string;
  overallScore: number;
  completedAt: string;
}

export interface DigestTrend {
  /** Metric name (e.g. "average_score", "audits_run"). */
  metric: string;
  /** Value this week. */
  current: number;
  /** Value previous week. */
  previous: number;
  /** Percentage change. */
  changePercent: number;
  /** Direction of change. */
  direction: "up" | "down" | "flat";
}

export interface DigestNewModel {
  modelName: string;
  provider: string;
  firstAuditedAt: string;
}

export interface WeeklyDigest {
  userId: string;
  weekStart: string;
  weekEnd: string;
  /** Audits completed this week. */
  audits: DigestAuditSummary[];
  /** Key metrics compared to previous week. */
  trends: DigestTrend[];
  /** Models tested for the first time this week. */
  newModels: DigestNewModel[];
  /** Overall stats. */
  stats: {
    totalAudits: number;
    averageScore: number;
    bestModel: string | null;
    bestScore: number;
  };
}

/**
 * Builds a weekly digest for the given user and week.
 * This is a data-layer function intended to be called from a server action or API route.
 *
 * @param userId - The user to build the digest for
 * @param weekStart - ISO date string for the start of the week (Monday)
 */
export async function buildWeeklyDigest(
  userId: string,
  weekStart: string
): Promise<WeeklyDigest> {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - 7);

  // Fetch audits for this week and previous week from the API
  const [currentWeekRes, prevWeekRes] = await Promise.all([
    fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/audits?userId=${userId}&from=${start.toISOString()}&to=${end.toISOString()}`
    ),
    fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/audits?userId=${userId}&from=${prevStart.toISOString()}&to=${start.toISOString()}`
    ),
  ]);

  const currentAudits: DigestAuditSummary[] = currentWeekRes.ok
    ? ((await currentWeekRes.json()) as Array<{
        id: string;
        modelName: string;
        overallScore: number;
        completedAt: string;
      }>)
        .filter((a) => a.completedAt)
        .map((a) => ({
          auditId: a.id,
          modelName: a.modelName,
          overallScore: a.overallScore ?? 0,
          completedAt: a.completedAt,
        }))
    : [];

  const prevAudits: DigestAuditSummary[] = prevWeekRes.ok
    ? ((await prevWeekRes.json()) as Array<{
        id: string;
        modelName: string;
        overallScore: number;
        completedAt: string;
      }>)
        .filter((a) => a.completedAt)
        .map((a) => ({
          auditId: a.id,
          modelName: a.modelName,
          overallScore: a.overallScore ?? 0,
          completedAt: a.completedAt,
        }))
    : [];

  // Compute trends
  const currentAvg =
    currentAudits.length > 0
      ? currentAudits.reduce((sum, a) => sum + a.overallScore, 0) /
        currentAudits.length
      : 0;
  const prevAvg =
    prevAudits.length > 0
      ? prevAudits.reduce((sum, a) => sum + a.overallScore, 0) /
        prevAudits.length
      : 0;

  function computeChange(current: number, previous: number): DigestTrend["direction"] {
    if (current > previous * 1.01) return "up";
    if (current < previous * 0.99) return "down";
    return "flat";
  }

  function changePercent(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  const trends: DigestTrend[] = [
    {
      metric: "audits_run",
      current: currentAudits.length,
      previous: prevAudits.length,
      changePercent: changePercent(currentAudits.length, prevAudits.length),
      direction: computeChange(currentAudits.length, prevAudits.length),
    },
    {
      metric: "average_score",
      current: Math.round(currentAvg * 1000) / 1000,
      previous: Math.round(prevAvg * 1000) / 1000,
      changePercent: changePercent(currentAvg, prevAvg),
      direction: computeChange(currentAvg, prevAvg),
    },
  ];

  // Detect new models (tested this week but not in prior history)
  const prevModelNames = new Set(prevAudits.map((a) => a.modelName));
  const newModels: DigestNewModel[] = currentAudits
    .filter((a) => !prevModelNames.has(a.modelName))
    .reduce<DigestNewModel[]>((acc, a) => {
      if (!acc.find((m) => m.modelName === a.modelName)) {
        acc.push({
          modelName: a.modelName,
          provider: "", // Provider not available in summary; could be enriched later
          firstAuditedAt: a.completedAt,
        });
      }
      return acc;
    }, []);

  // Best model
  const bestAudit = currentAudits.reduce<DigestAuditSummary | null>(
    (best, a) => (!best || a.overallScore > best.overallScore ? a : best),
    null
  );

  return {
    userId,
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    audits: currentAudits,
    trends,
    newModels,
    stats: {
      totalAudits: currentAudits.length,
      averageScore: Math.round(currentAvg * 1000) / 1000,
      bestModel: bestAudit?.modelName ?? null,
      bestScore: bestAudit?.overallScore ?? 0,
    },
  };
}
