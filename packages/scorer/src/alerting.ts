/**
 * Alerting rules engine (issue #754).
 *
 * Evaluates configurable threshold/anomaly rules over named metrics, with
 * dedup keys and cooldown handling. Notification delivery is the caller's job.
 */

export type Comparator = "gt" | "gte" | "lt" | "lte";

export interface AlertRule {
  id: string;
  metric: string;
  comparator: Comparator;
  threshold: number;
  /** Minimum ms between repeated firings of the same rule. */
  cooldownMs?: number;
}

export interface FiredAlert {
  ruleId: string;
  metric: string;
  value: number;
  threshold: number;
  dedupKey: string;
}

function compare(value: number, comparator: Comparator, threshold: number): boolean {
  switch (comparator) {
    case "gt": return value > threshold;
    case "gte": return value >= threshold;
    case "lt": return value < threshold;
    case "lte": return value <= threshold;
  }
}

export interface EvaluateOptions {
  /** ruleId -> last fired timestamp (ms), for cooldown suppression. */
  lastFired?: Record<string, number>;
  now?: number;
}

export interface EvaluateResult {
  fired: FiredAlert[];
  /** Updated lastFired map including this evaluation's firings. */
  lastFired: Record<string, number>;
}

export function evaluateRules(
  rules: AlertRule[],
  metrics: Record<string, number>,
  options: EvaluateOptions = {}
): EvaluateResult {
  const now = options.now ?? Date.now();
  const lastFired = { ...(options.lastFired ?? {}) };
  const fired: FiredAlert[] = [];

  for (const rule of rules) {
    const value = metrics[rule.metric];
    if (value === undefined) continue;
    if (!compare(value, rule.comparator, rule.threshold)) continue;

    const cooldown = rule.cooldownMs ?? 0;
    const last = lastFired[rule.id];
    if (last !== undefined && now - last < cooldown) continue; // suppressed

    fired.push({
      ruleId: rule.id,
      metric: rule.metric,
      value,
      threshold: rule.threshold,
      dedupKey: `${rule.id}:${rule.metric}`,
    });
    lastFired[rule.id] = now;
  }

  return { fired, lastFired };
}
