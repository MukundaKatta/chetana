/**
 * Issue #425 - Score decay tracking
 *
 * Time-series storage per model, decay rate calculation,
 * trend line with projection, alert below threshold,
 * seasonal adjustment.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ScoreDataPoint {
  timestamp: number;
  score: number;
  auditId: string;
  modelVersion?: string;
}

export interface ModelScoreTimeSeries {
  modelId: string;
  modelName: string;
  dataPoints: ScoreDataPoint[];
  lastUpdated: number;
}

export interface DecayRate {
  /** Score change per day (negative = decay). */
  perDay: number;
  /** Score change per week. */
  perWeek: number;
  /** Score change per month (30 days). */
  perMonth: number;
  /** Percentage change per day. */
  percentPerDay: number;
  /** R-squared goodness of fit. */
  rSquared: number;
  /** Direction of trend. */
  direction: "improving" | "decaying" | "stable";
}

export interface TrendProjection {
  /** Projected score values at future timestamps. */
  projectedPoints: Array<{ timestamp: number; score: number }>;
  /** Timestamp when score would reach the alert threshold. */
  thresholdBreachDate: number | null;
  /** Confidence in the projection (0-1). */
  confidence: number;
}

export interface DecayAlert {
  modelId: string;
  modelName: string;
  currentScore: number;
  previousScore: number;
  threshold: number;
  decayRate: DecayRate;
  severity: "info" | "warning" | "critical";
  message: string;
  triggeredAt: number;
}

export interface SeasonalAdjustment {
  /** Raw score. */
  raw: number;
  /** Seasonally adjusted score. */
  adjusted: number;
  /** Seasonal factor applied. */
  seasonalFactor: number;
  /** Period used for adjustment (7 = weekly, 30 = monthly). */
  period: number;
}

export interface DecayTrackingConfig {
  alertThreshold: number;
  projectionDays: number;
  seasonalPeriod: number;
  minDataPointsForTrend: number;
  stableThreshold: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "chetana:score-decay";
const MS_PER_DAY = 86_400_000;
const MS_PER_WEEK = MS_PER_DAY * 7;
const MS_PER_MONTH = MS_PER_DAY * 30;

const DEFAULT_CONFIG: DecayTrackingConfig = {
  alertThreshold: 0.5,
  projectionDays: 90,
  seasonalPeriod: 30,
  minDataPointsForTrend: 3,
  stableThreshold: 0.001,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Linear Regression                                                 */
/* ------------------------------------------------------------------ */

interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
}

function linearRegression(xs: number[], ys: number[]): RegressionResult {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, rSquared: 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
    sumXY += xs[i] * ys[i];
    sumXX += xs[i] * xs[i];
  }

  const meanX = sumX / n;
  const meanY = sumY / n;
  const denominator = sumXX - (sumX * sumX) / n;

  if (denominator === 0) return { slope: 0, intercept: meanY, rSquared: 0 };

  const slope = (sumXY - (sumX * sumY) / n) / denominator;
  const intercept = meanY - slope * meanX;

  // R-squared
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * xs[i] + intercept;
    ssRes += (ys[i] - predicted) ** 2;
    ssTot += (ys[i] - meanY) ** 2;
  }

  const rSquared = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, rSquared: Math.max(0, rSquared) };
}

/* ------------------------------------------------------------------ */
/*  Score Decay Tracker                                               */
/* ------------------------------------------------------------------ */

export class ScoreDecayTracker {
  private series: Map<string, ModelScoreTimeSeries> = new Map();
  private config: DecayTrackingConfig;

  constructor(config: Partial<DecayTrackingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.load();
  }

  private load(): void {
    const storage = getStorage();
    if (!storage) return;
    const data = safeJsonParse<Record<string, ModelScoreTimeSeries>>(
      storage.getItem(STORAGE_KEY),
      {},
    );
    for (const [key, value] of Object.entries(data)) {
      this.series.set(key, value);
    }
  }

  private persist(): void {
    const storage = getStorage();
    if (!storage) return;
    const obj: Record<string, ModelScoreTimeSeries> = {};
    for (const [key, value] of this.series) {
      obj[key] = value;
    }
    storage.setItem(STORAGE_KEY, JSON.stringify(obj));
  }

  /** Record a new score data point. */
  addDataPoint(
    modelId: string,
    modelName: string,
    score: number,
    auditId: string,
    modelVersion?: string,
  ): void {
    let ts = this.series.get(modelId);
    if (!ts) {
      ts = { modelId, modelName, dataPoints: [], lastUpdated: Date.now() };
      this.series.set(modelId, ts);
    }

    ts.dataPoints.push({
      timestamp: Date.now(),
      score,
      auditId,
      modelVersion,
    });

    // Sort by timestamp
    ts.dataPoints.sort((a, b) => a.timestamp - b.timestamp);
    ts.lastUpdated = Date.now();

    this.persist();
  }

  /** Get time series for a model. */
  getTimeSeries(modelId: string): ModelScoreTimeSeries | null {
    return this.series.get(modelId) ?? null;
  }

  /** Get all tracked model IDs. */
  getTrackedModels(): string[] {
    return Array.from(this.series.keys());
  }

  /** Calculate decay rate for a model. */
  calculateDecayRate(modelId: string): DecayRate | null {
    const ts = this.series.get(modelId);
    if (!ts || ts.dataPoints.length < this.config.minDataPointsForTrend) {
      return null;
    }

    // Normalize timestamps to days
    const firstTimestamp = ts.dataPoints[0].timestamp;
    const xs = ts.dataPoints.map((p) => (p.timestamp - firstTimestamp) / MS_PER_DAY);
    const ys = ts.dataPoints.map((p) => p.score);

    const regression = linearRegression(xs, ys);

    const perDay = regression.slope;
    const perWeek = perDay * 7;
    const perMonth = perDay * 30;
    const latestScore = ys[ys.length - 1];
    const percentPerDay = latestScore > 0 ? (perDay / latestScore) * 100 : 0;

    let direction: DecayRate["direction"];
    if (Math.abs(perDay) < this.config.stableThreshold) {
      direction = "stable";
    } else if (perDay > 0) {
      direction = "improving";
    } else {
      direction = "decaying";
    }

    return {
      perDay,
      perWeek,
      perMonth,
      percentPerDay,
      rSquared: regression.rSquared,
      direction,
    };
  }

  /** Project future scores. */
  projectTrend(modelId: string, days?: number): TrendProjection | null {
    const ts = this.series.get(modelId);
    if (!ts || ts.dataPoints.length < this.config.minDataPointsForTrend) {
      return null;
    }

    const projectionDays = days ?? this.config.projectionDays;

    const firstTimestamp = ts.dataPoints[0].timestamp;
    const xs = ts.dataPoints.map((p) => (p.timestamp - firstTimestamp) / MS_PER_DAY);
    const ys = ts.dataPoints.map((p) => p.score);

    const regression = linearRegression(xs, ys);
    const now = Date.now();
    const nowDays = (now - firstTimestamp) / MS_PER_DAY;

    const projectedPoints: Array<{ timestamp: number; score: number }> = [];
    let thresholdBreachDate: number | null = null;

    for (let d = 1; d <= projectionDays; d++) {
      const dayOffset = nowDays + d;
      const projectedScore = Math.max(0, Math.min(1, regression.slope * dayOffset + regression.intercept));
      const timestamp = now + d * MS_PER_DAY;

      projectedPoints.push({ timestamp, score: projectedScore });

      if (
        thresholdBreachDate === null &&
        projectedScore < this.config.alertThreshold &&
        regression.slope < 0
      ) {
        thresholdBreachDate = timestamp;
      }
    }

    // Confidence decays with projection distance and depends on R-squared
    const dataSpanDays = xs[xs.length - 1] - xs[0];
    const projectionRatio = projectionDays / Math.max(dataSpanDays, 1);
    const confidence = Math.max(
      0,
      Math.min(1, regression.rSquared * (1 / (1 + projectionRatio * 0.5))),
    );

    return { projectedPoints, thresholdBreachDate, confidence };
  }

  /** Check if any models need alerts. */
  checkAlerts(): DecayAlert[] {
    const alerts: DecayAlert[] = [];

    for (const [modelId, ts] of this.series) {
      if (ts.dataPoints.length < 2) continue;

      const latest = ts.dataPoints[ts.dataPoints.length - 1];
      const previous = ts.dataPoints[ts.dataPoints.length - 2];
      const decayRate = this.calculateDecayRate(modelId);

      if (!decayRate) continue;

      // Below threshold alert
      if (latest.score < this.config.alertThreshold) {
        alerts.push({
          modelId,
          modelName: ts.modelName,
          currentScore: latest.score,
          previousScore: previous.score,
          threshold: this.config.alertThreshold,
          decayRate,
          severity: latest.score < this.config.alertThreshold * 0.7 ? "critical" : "warning",
          message: `${ts.modelName} score (${(latest.score * 100).toFixed(1)}%) is below threshold (${(this.config.alertThreshold * 100).toFixed(0)}%).`,
          triggeredAt: Date.now(),
        });
      }

      // Rapid decay alert
      if (decayRate.direction === "decaying" && Math.abs(decayRate.perDay) > 0.01) {
        alerts.push({
          modelId,
          modelName: ts.modelName,
          currentScore: latest.score,
          previousScore: previous.score,
          threshold: this.config.alertThreshold,
          decayRate,
          severity: Math.abs(decayRate.perDay) > 0.05 ? "critical" : "info",
          message: `${ts.modelName} is decaying at ${(Math.abs(decayRate.perDay) * 100).toFixed(2)}% per day.`,
          triggeredAt: Date.now(),
        });
      }
    }

    return alerts;
  }

  /** Apply seasonal adjustment to a data point. */
  seasonalAdjust(modelId: string, score: number): SeasonalAdjustment {
    const ts = this.series.get(modelId);
    const period = this.config.seasonalPeriod;

    if (!ts || ts.dataPoints.length < period * 2) {
      return { raw: score, adjusted: score, seasonalFactor: 1, period };
    }

    // Compute seasonal indices using moving average
    const scores = ts.dataPoints.map((p) => p.score);
    const movingAvg: number[] = [];

    for (let i = 0; i < scores.length; i++) {
      const start = Math.max(0, i - Math.floor(period / 2));
      const end = Math.min(scores.length, i + Math.ceil(period / 2));
      const slice = scores.slice(start, end);
      movingAvg.push(slice.reduce((a, b) => a + b, 0) / slice.length);
    }

    // Seasonal factors: ratio of actual to moving average
    const seasonalFactors: number[] = scores.map((s, i) =>
      movingAvg[i] > 0 ? s / movingAvg[i] : 1,
    );

    // Average seasonal factor for current position in cycle
    const currentPosition = ts.dataPoints.length % period;
    const matchingFactors = seasonalFactors.filter(
      (_, i) => i % period === currentPosition,
    );
    const avgFactor =
      matchingFactors.length > 0
        ? matchingFactors.reduce((a, b) => a + b, 0) / matchingFactors.length
        : 1;

    const adjusted = avgFactor > 0 ? score / avgFactor : score;

    return {
      raw: score,
      adjusted: Math.max(0, Math.min(1, adjusted)),
      seasonalFactor: avgFactor,
      period,
    };
  }

  /** Clear data for a model. */
  clearModel(modelId: string): boolean {
    const deleted = this.series.delete(modelId);
    if (deleted) this.persist();
    return deleted;
  }

  /** Clear all decay data. */
  clearAll(): void {
    this.series.clear();
    this.persist();
  }

  /** Update tracking configuration. */
  updateConfig(config: Partial<DecayTrackingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /** Get current configuration. */
  getConfig(): DecayTrackingConfig {
    return { ...this.config };
  }
}

/* ------------------------------------------------------------------ */
/*  Singleton                                                         */
/* ------------------------------------------------------------------ */

let _instance: ScoreDecayTracker | null = null;

export function getScoreDecayTracker(
  config?: Partial<DecayTrackingConfig>,
): ScoreDecayTracker {
  if (!_instance) {
    _instance = new ScoreDecayTracker(config);
  }
  return _instance;
}

/* ------------------------------------------------------------------ */
/*  Display Helpers                                                   */
/* ------------------------------------------------------------------ */

export function formatDecayRate(rate: DecayRate): string {
  if (rate.direction === "stable") return "Stable";

  const sign = rate.perDay > 0 ? "+" : "";
  const daily = `${sign}${(rate.perDay * 100).toFixed(2)}%/day`;
  return `${rate.direction === "improving" ? "Improving" : "Decaying"}: ${daily}`;
}

export function getDecayColor(rate: DecayRate): string {
  switch (rate.direction) {
    case "improving":
      return "text-green-400";
    case "decaying":
      return "text-red-400";
    case "stable":
      return "text-gray-400";
  }
}

export function formatProjectionDate(timestamp: number | null): string {
  if (timestamp === null) return "No breach projected";
  const date = new Date(timestamp);
  const diff = timestamp - Date.now();
  const days = Math.ceil(diff / MS_PER_DAY);
  if (days <= 0) return "Already breached";
  if (days === 1) return `Tomorrow (${date.toLocaleDateString()})`;
  if (days <= 7) return `In ${days} days (${date.toLocaleDateString()})`;
  if (days <= 30) return `In ${Math.ceil(days / 7)} weeks (${date.toLocaleDateString()})`;
  return `In ${Math.ceil(days / 30)} months (${date.toLocaleDateString()})`;
}
