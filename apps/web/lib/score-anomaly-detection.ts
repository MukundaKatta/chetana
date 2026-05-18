/**
 * Anomaly detection in score trends with z-score, IQR,
 * isolation-forest-style detection, change point analysis,
 * alert generation, historical log, and configurable sensitivity
 * (Issue #389).
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type AnomalyMethod = "zscore" | "iqr" | "isolation-forest";

export type AlertSeverity = "critical" | "warning" | "info";

export interface AnomalyConfig {
  /** Detection methods to use (default: all). */
  methods?: AnomalyMethod[];
  /** Z-score threshold (default 2.5). */
  zScoreThreshold?: number;
  /** IQR multiplier (default 1.5). */
  iqrMultiplier?: number;
  /** Isolation forest contamination rate (default 0.1). */
  contamination?: number;
  /** Minimum data points required (default 5). */
  minDataPoints?: number;
  /** Sensitivity: 0 (least sensitive) to 1 (most sensitive). Default 0.5 */
  sensitivity?: number;
}

export interface ScorePoint {
  timestamp: string;
  value: number;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface Anomaly {
  point: ScorePoint;
  index: number;
  methods: AnomalyMethod[];
  zScore: number | null;
  iqrDistance: number | null;
  isolationScore: number | null;
  severity: AlertSeverity;
  description: string;
}

export interface ChangePoint {
  index: number;
  timestamp: string;
  beforeMean: number;
  afterMean: number;
  delta: number;
  significance: number;
  description: string;
}

export interface AnomalyAlert {
  id: string;
  timestamp: string;
  severity: AlertSeverity;
  anomaly: Anomaly | null;
  changePoint: ChangePoint | null;
  message: string;
  acknowledged: boolean;
}

export interface AnomalyDetectionResult {
  anomalies: Anomaly[];
  changePoints: ChangePoint[];
  alerts: AnomalyAlert[];
  stats: {
    mean: number;
    stdDev: number;
    q1: number;
    q3: number;
    iqr: number;
    totalPoints: number;
    anomalyCount: number;
    anomalyRate: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Stats helpers                                                     */
/* ------------------------------------------------------------------ */

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance =
    values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function sortedValues(values: number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

/* ------------------------------------------------------------------ */
/*  Z-score detection                                                 */
/* ------------------------------------------------------------------ */

function detectZScoreAnomalies(
  points: ScorePoint[],
  threshold: number,
): Map<number, number> {
  const values = points.map((p) => p.value);
  const m = mean(values);
  const sd = stdDev(values);

  const anomalies = new Map<number, number>();
  if (sd === 0) return anomalies;

  for (let i = 0; i < values.length; i++) {
    const z = Math.abs((values[i] - m) / sd);
    if (z > threshold) {
      anomalies.set(i, z);
    }
  }

  return anomalies;
}

/* ------------------------------------------------------------------ */
/*  IQR detection                                                     */
/* ------------------------------------------------------------------ */

function detectIQRAnomalies(
  points: ScorePoint[],
  multiplier: number,
): Map<number, number> {
  const values = points.map((p) => p.value);
  const sorted = sortedValues(values);

  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;

  const lowerBound = q1 - multiplier * iqr;
  const upperBound = q3 + multiplier * iqr;

  const anomalies = new Map<number, number>();

  for (let i = 0; i < values.length; i++) {
    if (values[i] < lowerBound) {
      anomalies.set(i, (lowerBound - values[i]) / (iqr || 1));
    } else if (values[i] > upperBound) {
      anomalies.set(i, (values[i] - upperBound) / (iqr || 1));
    }
  }

  return anomalies;
}

/* ------------------------------------------------------------------ */
/*  Isolation forest (simplified)                                     */
/* ------------------------------------------------------------------ */

/**
 * Simplified isolation forest anomaly scoring.
 * Instead of building actual trees, we use a statistical approximation:
 * points that are far from the center have shorter expected path lengths.
 */
function detectIsolationForestAnomalies(
  points: ScorePoint[],
  contamination: number,
): Map<number, number> {
  const values = points.map((p) => p.value);
  const n = values.length;
  if (n < 4) return new Map();

  // Compute pairwise distance to mean as proxy for isolation
  const m = mean(values);
  const sd = stdDev(values) || 1;

  const isolationScores: Array<{ index: number; score: number }> = values.map(
    (v, i) => {
      // Score based on distance from center, normalized
      const distance = Math.abs(v - m) / sd;
      // Approximate path length: closer to center = longer path
      const pathLength = Math.log2(n) - distance;
      // Anomaly score: shorter path = more anomalous
      const score = Math.pow(2, -pathLength / Math.log2(n));
      return { index: i, score: Math.min(1, Math.max(0, score)) };
    },
  );

  // Take top `contamination` fraction as anomalies
  const threshold = Math.max(1, Math.floor(n * contamination));
  const sorted = [...isolationScores].sort((a, b) => b.score - a.score);

  const anomalies = new Map<number, number>();
  for (let i = 0; i < threshold; i++) {
    if (sorted[i].score > 0.5) {
      anomalies.set(sorted[i].index, sorted[i].score);
    }
  }

  return anomalies;
}

/* ------------------------------------------------------------------ */
/*  Change point detection                                            */
/* ------------------------------------------------------------------ */

/**
 * Detect change points using CUSUM-inspired approach.
 */
export function detectChangePoints(
  points: ScorePoint[],
  minSegmentSize: number = 3,
): ChangePoint[] {
  const values = points.map((p) => p.value);
  const n = values.length;

  if (n < minSegmentSize * 2) return [];

  const changePoints: ChangePoint[] = [];

  // Sliding window: compare mean of left vs right segments
  for (let i = minSegmentSize; i <= n - minSegmentSize; i++) {
    const leftValues = values.slice(0, i);
    const rightValues = values.slice(i);

    const leftMean = mean(leftValues);
    const rightMean = mean(rightValues);
    const delta = rightMean - leftMean;

    // Compute significance using two-sample t-test approximation
    const leftSD = stdDev(leftValues) || 0.001;
    const rightSD = stdDev(rightValues) || 0.001;
    const se = Math.sqrt(
      (leftSD ** 2) / leftValues.length +
        (rightSD ** 2) / rightValues.length,
    );
    const tStat = Math.abs(delta) / se;
    // Approximate p-value (simplified)
    const significance = Math.min(1, tStat / 3);

    if (significance > 0.7) {
      changePoints.push({
        index: i,
        timestamp: points[i].timestamp,
        beforeMean: round(leftMean),
        afterMean: round(rightMean),
        delta: round(delta),
        significance: round(significance),
        description: `Score ${delta > 0 ? "increased" : "decreased"} by ${round(Math.abs(delta))} at index ${i}`,
      });
    }
  }

  // Deduplicate: keep only the most significant change point in each cluster
  const deduped: ChangePoint[] = [];
  const clusterRadius = minSegmentSize;

  for (const cp of changePoints.sort(
    (a, b) => b.significance - a.significance,
  )) {
    const tooClose = deduped.some(
      (existing) => Math.abs(existing.index - cp.index) < clusterRadius,
    );
    if (!tooClose) {
      deduped.push(cp);
    }
  }

  return deduped.sort((a, b) => a.index - b.index);
}

/* ------------------------------------------------------------------ */
/*  Alert generation                                                  */
/* ------------------------------------------------------------------ */

function classifySeverity(
  zScore: number | null,
  iqrDistance: number | null,
  isolationScore: number | null,
  methodCount: number,
  sensitivity: number,
): AlertSeverity {
  const highThreshold = 1 - sensitivity * 0.3;
  const critThreshold = 1 - sensitivity * 0.2;

  if (methodCount >= 3) return "critical";
  if (
    (zScore && zScore > 3 * critThreshold) ||
    (iqrDistance && iqrDistance > 2 * critThreshold)
  ) {
    return "critical";
  }
  if (
    methodCount >= 2 ||
    (zScore && zScore > 2 * highThreshold) ||
    (iqrDistance && iqrDistance > 1 * highThreshold)
  ) {
    return "warning";
  }
  return "info";
}

function generateAlertId(): string {
  return `alert_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/* ------------------------------------------------------------------ */
/*  Main detection                                                    */
/* ------------------------------------------------------------------ */

const DEFAULT_CONFIG: Required<AnomalyConfig> = {
  methods: ["zscore", "iqr", "isolation-forest"],
  zScoreThreshold: 2.5,
  iqrMultiplier: 1.5,
  contamination: 0.1,
  minDataPoints: 5,
  sensitivity: 0.5,
};

/**
 * Run anomaly detection on a time series of scores.
 */
export function detectAnomalies(
  points: ScorePoint[],
  config?: AnomalyConfig,
): AnomalyDetectionResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Adjust thresholds by sensitivity (higher sensitivity = lower thresholds)
  const sensitivityFactor = 1 - cfg.sensitivity * 0.5;
  const zThreshold = cfg.zScoreThreshold * sensitivityFactor;
  const iqrMult = cfg.iqrMultiplier * sensitivityFactor;

  if (points.length < cfg.minDataPoints) {
    return {
      anomalies: [],
      changePoints: [],
      alerts: [],
      stats: computeStats(points),
    };
  }

  // Run each method
  const zScoreAnomalies = cfg.methods.includes("zscore")
    ? detectZScoreAnomalies(points, zThreshold)
    : new Map<number, number>();

  const iqrAnomalies = cfg.methods.includes("iqr")
    ? detectIQRAnomalies(points, iqrMult)
    : new Map<number, number>();

  const iforestAnomalies = cfg.methods.includes("isolation-forest")
    ? detectIsolationForestAnomalies(points, cfg.contamination)
    : new Map<number, number>();

  // Merge anomalies
  const allIndices = new Set([
    ...zScoreAnomalies.keys(),
    ...iqrAnomalies.keys(),
    ...iforestAnomalies.keys(),
  ]);

  const anomalies: Anomaly[] = [];

  for (const idx of allIndices) {
    const methods: AnomalyMethod[] = [];
    if (zScoreAnomalies.has(idx)) methods.push("zscore");
    if (iqrAnomalies.has(idx)) methods.push("iqr");
    if (iforestAnomalies.has(idx)) methods.push("isolation-forest");

    const zScore = zScoreAnomalies.get(idx) ?? null;
    const iqrDist = iqrAnomalies.get(idx) ?? null;
    const isoScore = iforestAnomalies.get(idx) ?? null;

    const severity = classifySeverity(
      zScore,
      iqrDist,
      isoScore,
      methods.length,
      cfg.sensitivity,
    );

    anomalies.push({
      point: points[idx],
      index: idx,
      methods,
      zScore: zScore !== null ? round(zScore) : null,
      iqrDistance: iqrDist !== null ? round(iqrDist) : null,
      isolationScore: isoScore !== null ? round(isoScore) : null,
      severity,
      description: `Anomalous score ${round(points[idx].value)} at ${points[idx].timestamp} (detected by ${methods.join(", ")})`,
    });
  }

  // Change point detection
  const changePoints = detectChangePoints(points);

  // Generate alerts
  const alerts: AnomalyAlert[] = [];

  for (const anomaly of anomalies) {
    alerts.push({
      id: generateAlertId(),
      timestamp: anomaly.point.timestamp,
      severity: anomaly.severity,
      anomaly,
      changePoint: null,
      message: anomaly.description,
      acknowledged: false,
    });
  }

  for (const cp of changePoints) {
    alerts.push({
      id: generateAlertId(),
      timestamp: cp.timestamp,
      severity: cp.significance > 0.9 ? "critical" : "warning",
      anomaly: null,
      changePoint: cp,
      message: cp.description,
      acknowledged: false,
    });
  }

  // Sort alerts by severity then timestamp
  const severityOrder: Record<AlertSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  alerts.sort(
    (a, b) =>
      severityOrder[a.severity] - severityOrder[b.severity] ||
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return {
    anomalies: anomalies.sort((a, b) => a.index - b.index),
    changePoints,
    alerts,
    stats: computeStats(points),
  };
}

function computeStats(points: ScorePoint[]): AnomalyDetectionResult["stats"] {
  const values = points.map((p) => p.value);
  const sorted = sortedValues(values);
  const m = mean(values);
  const sd = stdDev(values);
  const q1 = sorted.length > 0 ? quantile(sorted, 0.25) : 0;
  const q3 = sorted.length > 0 ? quantile(sorted, 0.75) : 0;

  return {
    mean: round(m),
    stdDev: round(sd),
    q1: round(q1),
    q3: round(q3),
    iqr: round(q3 - q1),
    totalPoints: points.length,
    anomalyCount: 0, // Updated by caller
    anomalyRate: 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Historical anomaly log                                            */
/* ------------------------------------------------------------------ */

export class AnomalyLog {
  private alerts: AnomalyAlert[] = [];
  private maxEntries: number;

  constructor(maxEntries: number = 1000) {
    this.maxEntries = maxEntries;
  }

  add(alert: AnomalyAlert): void {
    this.alerts.push(alert);
    if (this.alerts.length > this.maxEntries) {
      this.alerts = this.alerts.slice(-this.maxEntries);
    }
  }

  addAll(alerts: AnomalyAlert[]): void {
    for (const alert of alerts) {
      this.add(alert);
    }
  }

  acknowledge(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (!alert) return false;
    alert.acknowledged = true;
    return true;
  }

  getUnacknowledged(severity?: AlertSeverity): AnomalyAlert[] {
    let filtered = this.alerts.filter((a) => !a.acknowledged);
    if (severity) {
      filtered = filtered.filter((a) => a.severity === severity);
    }
    return filtered;
  }

  getAll(options?: {
    severity?: AlertSeverity;
    from?: string;
    to?: string;
    limit?: number;
  }): AnomalyAlert[] {
    let filtered = [...this.alerts];

    if (options?.severity) {
      filtered = filtered.filter((a) => a.severity === options.severity);
    }
    if (options?.from) {
      const fromTime = new Date(options.from).getTime();
      filtered = filtered.filter(
        (a) => new Date(a.timestamp).getTime() >= fromTime,
      );
    }
    if (options?.to) {
      const toTime = new Date(options.to).getTime();
      filtered = filtered.filter(
        (a) => new Date(a.timestamp).getTime() <= toTime,
      );
    }
    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  clear(): void {
    this.alerts = [];
  }

  size(): number {
    return this.alerts.length;
  }
}

/* ------------------------------------------------------------------ */
/*  Utilities                                                         */
/* ------------------------------------------------------------------ */

function round(v: number, decimals: number = 4): number {
  const factor = 10 ** decimals;
  return Math.round(v * factor) / factor;
}
