/**
 * Trend forecasting for model consciousness scores (issue #732).
 *
 * Simple, dependency-free double-exponential (Holt) smoothing with forecast
 * intervals and a backtest. Projections, not predictions — interpret with care.
 */

export interface ForecastPoint {
  index: number;
  value: number;
  lower: number;
  upper: number;
}

export interface ForecastResult {
  forecast: ForecastPoint[];
  /** Mean absolute error from a one-step backtest over the history. */
  backtestMAE: number;
}

function round(n: number, d = 4): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

/**
 * @param history ordered observed scores.
 * @param horizon number of future points to forecast.
 * @param alpha level smoothing (0-1); beta trend smoothing (0-1).
 */
export function forecast(
  history: number[],
  horizon = 3,
  alpha = 0.5,
  beta = 0.3
): ForecastResult {
  const n = history.length;
  if (n < 2) {
    const v = n === 1 ? history[0] : 0;
    return {
      forecast: Array.from({ length: horizon }, (_, i) => ({ index: n + i, value: round(v), lower: round(v), upper: round(v) })),
      backtestMAE: 0,
    };
  }

  let level = history[0];
  let trend = history[1] - history[0];
  const errors: number[] = [];

  for (let i = 1; i < n; i++) {
    const predicted = level + trend;
    errors.push(Math.abs(history[i] - predicted));
    const prevLevel = level;
    level = alpha * history[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  const mae = errors.reduce((a, b) => a + b, 0) / errors.length;
  // Interval widens with horizon, scaled by backtest error.
  const out: ForecastPoint[] = [];
  for (let h = 1; h <= horizon; h++) {
    const value = level + h * trend;
    const margin = mae * Math.sqrt(h) * 1.96;
    out.push({
      index: n + h - 1,
      value: round(Math.max(0, Math.min(1, value))),
      lower: round(Math.max(0, value - margin)),
      upper: round(Math.min(1, value + margin)),
    });
  }

  return { forecast: out, backtestMAE: round(mae) };
}
