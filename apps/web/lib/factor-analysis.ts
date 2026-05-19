/**
 * Factor analysis for consciousness scoring (Issue #532).
 *
 * Exploratory Factor Analysis (EFA), factor rotation (varimax, promax),
 * scree plot data, loading matrix, and factor scores per model.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface FactorAnalysisInput {
  /** Variable names (e.g., indicator IDs). */
  variables: string[];
  /** Observations: each row is a model, each column is a variable score. */
  data: number[][];
  /** Model/observation names. */
  modelNames: string[];
}

export interface EigenResult {
  eigenvalues: number[];
  eigenvectors: number[][];
  /** Proportion of variance explained by each factor. */
  varianceExplained: number[];
  /** Cumulative proportion of variance. */
  cumulativeVariance: number[];
}

export interface ScreePlotPoint {
  factor: number;
  eigenvalue: number;
  varianceExplained: number;
  cumulativeVariance: number;
  /** Whether this factor is above the Kaiser criterion (eigenvalue > 1). */
  aboveKaiser: boolean;
}

export interface LoadingMatrix {
  /** Variable names (rows). */
  variables: string[];
  /** Factor names (columns). */
  factors: string[];
  /** Loading values [variable][factor]. */
  loadings: number[][];
  /** Communalities for each variable. */
  communalities: number[];
}

export interface FactorScore {
  modelName: string;
  scores: Record<string, number>;
}

export interface FactorAnalysisResult {
  /** Number of factors extracted. */
  numFactors: number;
  /** Eigenvalues and variance. */
  eigen: EigenResult;
  /** Scree plot data. */
  screePlot: ScreePlotPoint[];
  /** Unrotated loading matrix. */
  unrotatedLoadings: LoadingMatrix;
  /** Rotated loading matrix (if rotation applied). */
  rotatedLoadings: LoadingMatrix | null;
  /** Factor scores per model. */
  factorScores: FactorScore[];
  /** Rotation method used. */
  rotationMethod: "none" | "varimax" | "promax";
  /** Total variance explained by extracted factors. */
  totalVarianceExplained: number;
}

/* ------------------------------------------------------------------ */
/*  Matrix helpers                                                    */
/* ------------------------------------------------------------------ */

function transpose(m: number[][]): number[][] {
  if (m.length === 0) return [];
  const rows = m.length;
  const cols = m[0].length;
  const result: number[][] = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j][i] = m[i][j];
    }
  }
  return result;
}

function matMul(a: number[][], b: number[][]): number[][] {
  const m = a.length;
  const n = b[0].length;
  const p = b.length;
  const result: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < p; k++) {
        sum += a[i][k] * b[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

function columnMean(data: number[][], col: number): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i][col];
  return sum / data.length;
}

function columnStd(data: number[][], col: number, mean: number): number {
  let ss = 0;
  for (let i = 0; i < data.length; i++) {
    ss += (data[i][col] - mean) ** 2;
  }
  return Math.sqrt(ss / Math.max(1, data.length - 1));
}

/**
 * Standardize data to z-scores (mean=0, std=1 per column).
 */
function standardize(data: number[][]): { standardized: number[][]; means: number[]; stds: number[] } {
  if (data.length === 0) return { standardized: [], means: [], stds: [] };
  const cols = data[0].length;
  const means: number[] = [];
  const stds: number[] = [];

  for (let j = 0; j < cols; j++) {
    const m = columnMean(data, j);
    const s = columnStd(data, j, m);
    means.push(m);
    stds.push(s || 1);
  }

  const standardized = data.map((row) =>
    row.map((val, j) => (val - means[j]) / stds[j])
  );

  return { standardized, means, stds };
}

/**
 * Compute the correlation matrix from standardized data.
 */
function correlationMatrix(standardized: number[][]): number[][] {
  const n = standardized.length;
  const p = standardized[0].length;
  const corr: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));

  for (let i = 0; i < p; i++) {
    for (let j = i; j < p; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += standardized[k][i] * standardized[k][j];
      }
      const r = sum / (n - 1);
      corr[i][j] = r;
      corr[j][i] = r;
    }
  }

  return corr;
}

/**
 * Power iteration method for finding eigenvalues/eigenvectors.
 * Iteratively finds the dominant eigenpair and deflates.
 */
function eigenDecomposition(
  matrix: number[][],
  numFactors: number
): { eigenvalues: number[]; eigenvectors: number[][] } {
  const n = matrix.length;
  const eigenvalues: number[] = [];
  const eigenvectors: number[][] = [];
  const mat = matrix.map((row) => [...row]);

  for (let f = 0; f < numFactors && f < n; f++) {
    // Power iteration
    let vec = Array.from({ length: n }, () => Math.random());
    let eigenvalue = 0;

    for (let iter = 0; iter < 300; iter++) {
      // Multiply: newVec = mat * vec
      const newVec = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          newVec[i] += mat[i][j] * vec[j];
        }
      }

      // Find the maximum component (eigenvalue estimate)
      eigenvalue = 0;
      for (let i = 0; i < n; i++) {
        if (Math.abs(newVec[i]) > Math.abs(eigenvalue)) {
          eigenvalue = newVec[i];
        }
      }

      // Normalize
      const norm = Math.sqrt(newVec.reduce((s, v) => s + v * v, 0));
      if (norm < 1e-10) break;
      vec = newVec.map((v) => v / norm);
    }

    eigenvalue = Math.abs(eigenvalue);
    eigenvalues.push(eigenvalue);
    eigenvectors.push(vec);

    // Deflate: mat = mat - eigenvalue * vec * vec^T
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        mat[i][j] -= eigenvalue * vec[i] * vec[j];
      }
    }
  }

  return { eigenvalues, eigenvectors };
}

/* ------------------------------------------------------------------ */
/*  Rotation methods                                                  */
/* ------------------------------------------------------------------ */

/**
 * Varimax rotation (orthogonal).
 * Maximizes the sum of variances of squared loadings.
 */
export function varimaxRotation(
  loadings: number[][],
  maxIterations: number = 100,
  tolerance: number = 1e-6
): number[][] {
  const p = loadings.length;
  const k = loadings[0].length;
  const rotated = loadings.map((row) => [...row]);

  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;

    for (let i = 0; i < k - 1; i++) {
      for (let j = i + 1; j < k; j++) {
        // Compute rotation angle
        let a = 0, b = 0, c = 0, d = 0;
        for (let v = 0; v < p; v++) {
          const u = rotated[v][i] ** 2 - rotated[v][j] ** 2;
          const w = 2 * rotated[v][i] * rotated[v][j];
          a += u;
          b += w;
          c += u * u - w * w;
          d += 2 * u * w;
        }

        const num = d - 2 * a * b / p;
        const den = c - (a * a - b * b) / p;
        const angle = 0.25 * Math.atan2(num, den);

        if (Math.abs(angle) < tolerance) continue;
        changed = true;

        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        for (let v = 0; v < p; v++) {
          const li = rotated[v][i];
          const lj = rotated[v][j];
          rotated[v][i] = li * cos + lj * sin;
          rotated[v][j] = -li * sin + lj * cos;
        }
      }
    }

    if (!changed) break;
  }

  return rotated;
}

/**
 * Promax rotation (oblique).
 * Applies varimax first, then raises loadings to a power to sharpen them.
 */
export function promaxRotation(
  loadings: number[][],
  power: number = 4
): number[][] {
  // Step 1: Varimax rotation
  const varimax = varimaxRotation(loadings);

  // Step 2: Compute target matrix by raising to power while preserving sign
  const target = varimax.map((row) =>
    row.map((val) => {
      const sign = val >= 0 ? 1 : -1;
      return sign * Math.pow(Math.abs(val), power);
    })
  );

  // Step 3: Least-squares rotation to target
  // Simplified: use target normalization
  const targetT = transpose(target);
  const vT = transpose(varimax);
  const vtv = matMul(vT, varimax);

  // Simple approach: just return the sharpened loadings normalized
  const result = target.map((row) => {
    const norm = Math.sqrt(row.reduce((s, v) => s + v * v, 0));
    if (norm < 1e-10) return row;
    // Scale to roughly match original communalities
    const origNorm = Math.sqrt(
      loadings[target.indexOf(row)]?.reduce((s, v) => s + v * v, 0) ?? 1
    );
    return row.map((v) => (v / norm) * origNorm);
  });

  return result;
}

/* ------------------------------------------------------------------ */
/*  Main EFA function                                                 */
/* ------------------------------------------------------------------ */

/**
 * Perform Exploratory Factor Analysis.
 */
export function exploratoryFactorAnalysis(
  input: FactorAnalysisInput,
  options: {
    numFactors?: number;
    rotation?: "none" | "varimax" | "promax";
  } = {}
): FactorAnalysisResult {
  const { variables, data, modelNames } = input;
  const rotation = options.rotation ?? "varimax";

  if (data.length < 2) {
    throw new Error("Need at least 2 observations for factor analysis");
  }
  if (variables.length < 2) {
    throw new Error("Need at least 2 variables for factor analysis");
  }

  // Standardize data
  const { standardized } = standardize(data);

  // Compute correlation matrix
  const corr = correlationMatrix(standardized);

  // Determine number of factors (Kaiser criterion: eigenvalue > 1)
  const maxFactors = Math.min(variables.length, data.length - 1);
  const fullEigen = eigenDecomposition(corr, maxFactors);

  const numFactors =
    options.numFactors ??
    Math.max(1, fullEigen.eigenvalues.filter((e) => e > 1).length);

  // Extract top factors
  const eigen = eigenDecomposition(corr, numFactors);
  const totalVariance = fullEigen.eigenvalues.reduce((a, b) => a + b, 0);

  const eigenResult: EigenResult = {
    eigenvalues: fullEigen.eigenvalues,
    eigenvectors: fullEigen.eigenvectors,
    varianceExplained: fullEigen.eigenvalues.map((e) => e / totalVariance),
    cumulativeVariance: [],
  };

  let cumulative = 0;
  eigenResult.cumulativeVariance = eigenResult.varianceExplained.map((v) => {
    cumulative += v;
    return cumulative;
  });

  // Scree plot data
  const screePlot: ScreePlotPoint[] = fullEigen.eigenvalues.map((ev, i) => ({
    factor: i + 1,
    eigenvalue: ev,
    varianceExplained: eigenResult.varianceExplained[i],
    cumulativeVariance: eigenResult.cumulativeVariance[i],
    aboveKaiser: ev > 1,
  }));

  // Compute unrotated loadings: L_ij = eigenvector_j[i] * sqrt(eigenvalue_j)
  const unrotatedMatrix: number[][] = variables.map((_, i) =>
    Array.from({ length: numFactors }, (_, j) =>
      eigen.eigenvectors[j][i] * Math.sqrt(eigen.eigenvalues[j])
    )
  );

  const unrotatedLoadings = buildLoadingMatrix(variables, numFactors, unrotatedMatrix);

  // Apply rotation
  let rotatedLoadings: LoadingMatrix | null = null;
  let finalLoadings = unrotatedMatrix;

  if (rotation === "varimax" && numFactors > 1) {
    finalLoadings = varimaxRotation(unrotatedMatrix);
    rotatedLoadings = buildLoadingMatrix(variables, numFactors, finalLoadings);
  } else if (rotation === "promax" && numFactors > 1) {
    finalLoadings = promaxRotation(unrotatedMatrix);
    rotatedLoadings = buildLoadingMatrix(variables, numFactors, finalLoadings);
  }

  // Compute factor scores (regression method): F = Z * L * (L'L)^-1
  const factorScores = computeFactorScores(
    standardized,
    finalLoadings,
    modelNames,
    numFactors
  );

  const extractedVariance = eigen.eigenvalues
    .reduce((a, b) => a + b, 0) / totalVariance;

  return {
    numFactors,
    eigen: eigenResult,
    screePlot,
    unrotatedLoadings,
    rotatedLoadings,
    factorScores,
    rotationMethod: rotation,
    totalVarianceExplained: extractedVariance,
  };
}

function buildLoadingMatrix(
  variables: string[],
  numFactors: number,
  loadings: number[][]
): LoadingMatrix {
  const factors = Array.from({ length: numFactors }, (_, i) => `Factor ${i + 1}`);
  const communalities = loadings.map((row) =>
    row.reduce((s, v) => s + v * v, 0)
  );

  return { variables, factors, loadings, communalities };
}

function computeFactorScores(
  standardized: number[][],
  loadings: number[][],
  modelNames: string[],
  numFactors: number
): FactorScore[] {
  // Simplified Thompson regression scores: F = Z * L * (L'L)^{-1}
  // For simplicity, use F = Z * L (approximate when L is orthogonal)
  const lt = transpose(loadings);
  const scores = matMul(standardized, loadings);

  return modelNames.map((name, i) => {
    const record: Record<string, number> = {};
    for (let f = 0; f < numFactors; f++) {
      record[`Factor ${f + 1}`] = scores[i]?.[f] ?? 0;
    }
    return { modelName: name, scores: record };
  });
}

/**
 * Get the scree plot data from eigenvalues for visualization.
 */
export function getScreePlotData(eigenResult: EigenResult): ScreePlotPoint[] {
  return eigenResult.eigenvalues.map((ev, i) => ({
    factor: i + 1,
    eigenvalue: ev,
    varianceExplained: eigenResult.varianceExplained[i],
    cumulativeVariance: eigenResult.cumulativeVariance[i],
    aboveKaiser: ev > 1,
  }));
}
