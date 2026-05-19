/**
 * Regression analysis (Issue #551).
 * Linear with R-squared, multiple regression, residual diagnostics,
 * prediction intervals, AIC/BIC comparison.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface LinearRegressionResult {
  /** Slope coefficient. */
  slope: number;
  /** Y-intercept. */
  intercept: number;
  /** R-squared (coefficient of determination). */
  rSquared: number;
  /** Adjusted R-squared. */
  adjustedRSquared: number;
  /** Standard error of the estimate. */
  standardError: number;
  /** F-statistic. */
  fStatistic: number;
  /** p-value for the F-test. */
  pValue: number;
  /** Number of observations. */
  n: number;
  /** Residuals for each observation. */
  residuals: number[];
  /** Fitted/predicted values. */
  fitted: number[];
}

export interface MultipleRegressionResult {
  /** Coefficients (including intercept at index 0). */
  coefficients: number[];
  /** Feature names. */
  featureNames: string[];
  /** R-squared. */
  rSquared: number;
  /** Adjusted R-squared. */
  adjustedRSquared: number;
  /** Standard error of the estimate. */
  standardError: number;
  /** Standard errors for each coefficient. */
  coefficientStdErrors: number[];
  /** t-statistics for each coefficient. */
  tStatistics: number[];
  /** F-statistic. */
  fStatistic: number;
  /** Number of observations. */
  n: number;
  /** Number of predictors (excluding intercept). */
  k: number;
  /** Residuals. */
  residuals: number[];
  /** Fitted values. */
  fitted: number[];
}

export interface ResidualDiagnostics {
  /** Mean of residuals (should be near 0). */
  mean: number;
  /** Standard deviation of residuals. */
  stdDev: number;
  /** Skewness. */
  skewness: number;
  /** Kurtosis. */
  kurtosis: number;
  /** Durbin-Watson statistic (autocorrelation). */
  durbinWatson: number;
  /** Shapiro-like normality indicator (true = likely normal). */
  likelyNormal: boolean;
  /** Standardized residuals. */
  standardized: number[];
  /** Cook's distance for each observation. */
  cooksDistance: number[];
}

export interface PredictionInterval {
  predicted: number;
  lowerBound: number;
  upperBound: number;
  confidenceLevel: number;
}

export interface ModelComparison {
  modelName: string;
  rSquared: number;
  adjustedRSquared: number;
  aic: number;
  bic: number;
  n: number;
  k: number;
  residualStdError: number;
}

/* ------------------------------------------------------------------ */
/*  Helper: basic stats                                               */
/* ------------------------------------------------------------------ */

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function sumOfSquares(arr: number[], m?: number): number {
  const mu = m ?? mean(arr);
  return arr.reduce((sum, x) => sum + (x - mu) ** 2, 0);
}

/** Standard normal CDF (Abramowitz & Stegun). */
function normalCdf(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

/** Approximate t-distribution critical value via normal (adequate for n > 30). */
function tCritical(alpha: number, _df: number): number {
  // Inverse normal approximation
  const p = 1 - alpha / 2;
  // Rational approximation (Beasley-Springer-Moro)
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
    -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0,
    3.754408661907416e0,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  } else if (p <= pHigh) {
    q = p - 0.5;
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Matrix helpers (for multiple regression)                          */
/* ------------------------------------------------------------------ */

type Matrix = number[][];

function transpose(m: Matrix): Matrix {
  const rows = m.length;
  const cols = m[0].length;
  const result: Matrix = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j][i] = m[i][j];
    }
  }
  return result;
}

function multiply(a: Matrix, b: Matrix): Matrix {
  const rowsA = a.length;
  const colsA = a[0].length;
  const colsB = b[0].length;
  const result: Matrix = Array.from({ length: rowsA }, () => new Array(colsB).fill(0));
  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      for (let k = 0; k < colsA; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return result;
}

function invertMatrix(m: Matrix): Matrix {
  const n = m.length;
  const augmented: Matrix = m.map((row, i) => {
    const identity = new Array(n).fill(0);
    identity[i] = 1;
    return [...row, ...identity];
  });

  // Gauss-Jordan elimination
  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(augmented[row][col]) > Math.abs(augmented[maxRow][col])) {
        maxRow = row;
      }
    }
    [augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]];

    const pivot = augmented[col][col];
    if (Math.abs(pivot) < 1e-12) {
      throw new Error("Matrix is singular or near-singular");
    }

    for (let j = 0; j < 2 * n; j++) {
      augmented[col][j] /= pivot;
    }

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = augmented[row][col];
      for (let j = 0; j < 2 * n; j++) {
        augmented[row][j] -= factor * augmented[col][j];
      }
    }
  }

  return augmented.map((row) => row.slice(n));
}

function multiplyMatrixVector(m: Matrix, v: number[]): number[] {
  return m.map((row) => row.reduce((sum, val, i) => sum + val * v[i], 0));
}

/* ------------------------------------------------------------------ */
/*  Simple linear regression                                          */
/* ------------------------------------------------------------------ */

export function linearRegression(x: number[], y: number[]): LinearRegressionResult {
  if (x.length !== y.length) throw new Error("x and y must have the same length");
  const n = x.length;
  if (n < 3) throw new Error("Need at least 3 data points");

  const xMean = mean(x);
  const yMean = mean(y);

  let ssXY = 0;
  let ssXX = 0;
  for (let i = 0; i < n; i++) {
    ssXY += (x[i] - xMean) * (y[i] - yMean);
    ssXX += (x[i] - xMean) ** 2;
  }

  const slope = ssXX === 0 ? 0 : ssXY / ssXX;
  const intercept = yMean - slope * xMean;

  const fitted = x.map((xi) => intercept + slope * xi);
  const residuals = y.map((yi, i) => yi - fitted[i]);

  const ssRes = residuals.reduce((sum, r) => sum + r ** 2, 0);
  const ssTot = sumOfSquares(y);

  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  const adjustedRSquared = 1 - ((1 - rSquared) * (n - 1)) / (n - 2);

  const standardError = Math.sqrt(ssRes / (n - 2));

  const msReg = ssTot - ssRes;
  const fStatistic = standardError === 0 ? Infinity : msReg / (ssRes / (n - 2));
  // Approximate p-value from F using normal approximation
  const fZ = Math.sqrt(2 * fStatistic) - Math.sqrt(2 * 1 - 1);
  const pValue = 1 - normalCdf(fZ);

  return {
    slope,
    intercept,
    rSquared,
    adjustedRSquared,
    standardError,
    fStatistic,
    pValue: Math.max(0, Math.min(1, pValue)),
    n,
    residuals,
    fitted,
  };
}

/* ------------------------------------------------------------------ */
/*  Multiple regression (OLS via normal equations)                    */
/* ------------------------------------------------------------------ */

export function multipleRegression(
  X: number[][],
  y: number[],
  featureNames?: string[]
): MultipleRegressionResult {
  const n = X.length;
  const k = X[0].length;
  if (n !== y.length) throw new Error("X rows must match y length");
  if (n <= k + 1) throw new Error("Need more observations than predictors");

  const names = featureNames ?? X[0].map((_, i) => `x${i + 1}`);

  // Add intercept column
  const Xa: Matrix = X.map((row) => [1, ...row]);
  const p = k + 1; // including intercept

  const Xt = transpose(Xa);
  const XtX = multiply(Xt, Xa);
  const XtXInv = invertMatrix(XtX);
  const XtY = multiplyMatrixVector(Xt, y);
  const coefficients = multiplyMatrixVector(XtXInv, XtY);

  const fitted = Xa.map((row) =>
    row.reduce((sum, val, j) => sum + val * coefficients[j], 0)
  );
  const residuals = y.map((yi, i) => yi - fitted[i]);

  const ssRes = residuals.reduce((sum, r) => sum + r ** 2, 0);
  const ssTot = sumOfSquares(y);
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  const adjustedRSquared = 1 - ((1 - rSquared) * (n - 1)) / (n - p);

  const mse = ssRes / (n - p);
  const standardError = Math.sqrt(mse);

  // Coefficient standard errors
  const coefficientStdErrors = coefficients.map((_, j) =>
    Math.sqrt(mse * XtXInv[j][j])
  );

  const tStatistics = coefficients.map((coef, j) =>
    coefficientStdErrors[j] === 0 ? 0 : coef / coefficientStdErrors[j]
  );

  const msReg = (ssTot - ssRes) / k;
  const fStatistic = mse === 0 ? Infinity : msReg / mse;

  return {
    coefficients,
    featureNames: ["intercept", ...names],
    rSquared,
    adjustedRSquared,
    standardError,
    coefficientStdErrors,
    tStatistics,
    fStatistic,
    n,
    k,
    residuals,
    fitted,
  };
}

/* ------------------------------------------------------------------ */
/*  Residual diagnostics                                              */
/* ------------------------------------------------------------------ */

export function residualDiagnostics(
  residuals: number[],
  fitted: number[],
  k: number = 1
): ResidualDiagnostics {
  const n = residuals.length;
  const mu = mean(residuals);
  const variance = sumOfSquares(residuals, mu) / (n - 1);
  const stdDev = Math.sqrt(variance);

  // Skewness
  const skewness =
    stdDev === 0
      ? 0
      : residuals.reduce((sum, r) => sum + ((r - mu) / stdDev) ** 3, 0) / n;

  // Kurtosis (excess)
  const kurtosis =
    stdDev === 0
      ? 0
      : residuals.reduce((sum, r) => sum + ((r - mu) / stdDev) ** 4, 0) / n - 3;

  // Durbin-Watson
  let dwNum = 0;
  let dwDen = 0;
  for (let i = 0; i < n; i++) {
    dwDen += residuals[i] ** 2;
    if (i > 0) dwNum += (residuals[i] - residuals[i - 1]) ** 2;
  }
  const durbinWatson = dwDen === 0 ? 2 : dwNum / dwDen;

  // Normality check (simple: skewness and kurtosis test)
  const likelyNormal = Math.abs(skewness) < 2 && Math.abs(kurtosis) < 7;

  // Standardized residuals
  const standardized = residuals.map((r) => (stdDev === 0 ? 0 : r / stdDev));

  // Cook's distance (simplified)
  const p = k + 1;
  const mse = sumOfSquares(residuals) / (n - p);
  const cooksDistance = residuals.map((r, i) => {
    const hi = 1 / n; // Simplified leverage for OLS without hat matrix
    const si = stdDev === 0 ? 0 : r / (stdDev * Math.sqrt(1 - hi));
    return (si ** 2 * hi) / (p * (1 - hi));
  });

  return {
    mean: mu,
    stdDev,
    skewness,
    kurtosis,
    durbinWatson,
    likelyNormal,
    standardized,
    cooksDistance,
  };
}

/* ------------------------------------------------------------------ */
/*  Prediction intervals                                              */
/* ------------------------------------------------------------------ */

export function predictionInterval(
  model: LinearRegressionResult,
  x: number[],
  xNew: number,
  confidenceLevel: number = 0.95
): PredictionInterval {
  const predicted = model.intercept + model.slope * xNew;
  const n = model.n;
  const xMean = mean(x);
  const ssXX = sumOfSquares(x);

  const alpha = 1 - confidenceLevel;
  const tCrit = tCritical(alpha, n - 2);

  const se = model.standardError * Math.sqrt(
    1 + 1 / n + (xNew - xMean) ** 2 / ssXX
  );

  return {
    predicted,
    lowerBound: predicted - tCrit * se,
    upperBound: predicted + tCrit * se,
    confidenceLevel,
  };
}

/* ------------------------------------------------------------------ */
/*  AIC / BIC comparison                                              */
/* ------------------------------------------------------------------ */

export function computeAIC(n: number, k: number, ssRes: number): number {
  if (n === 0 || ssRes <= 0) return Infinity;
  return n * Math.log(ssRes / n) + 2 * (k + 1);
}

export function computeBIC(n: number, k: number, ssRes: number): number {
  if (n === 0 || ssRes <= 0) return Infinity;
  return n * Math.log(ssRes / n) + Math.log(n) * (k + 1);
}

export function compareModels(
  models: Array<{
    name: string;
    result: LinearRegressionResult | MultipleRegressionResult;
  }>
): ModelComparison[] {
  return models.map((m) => {
    const n = m.result.n;
    const k = "k" in m.result ? m.result.k : 1;
    const ssRes = m.result.residuals.reduce((sum, r) => sum + r ** 2, 0);

    return {
      modelName: m.name,
      rSquared: m.result.rSquared,
      adjustedRSquared: m.result.adjustedRSquared,
      aic: computeAIC(n, k, ssRes),
      bic: computeBIC(n, k, ssRes),
      n,
      k,
      residualStdError: m.result.standardError,
    };
  }).sort((a, b) => a.aic - b.aic);
}
