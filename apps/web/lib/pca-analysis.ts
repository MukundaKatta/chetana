/**
 * PCA dimensionality reduction (Issue #484).
 * PCA computation, scree plot data, biplot data (scores + loadings),
 * component interpretation, export components.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface PCAInput {
  /** Rows = observations, columns = variables. */
  data: number[][];
  /** Labels for each variable (column). */
  variableNames: string[];
  /** Labels for each observation (row). */
  observationLabels?: string[];
  /** Whether to center the data (default true). */
  center?: boolean;
  /** Whether to scale to unit variance (default true). */
  scale?: boolean;
}

export interface PCAResult {
  /** Eigenvalues for each component (descending). */
  eigenvalues: number[];
  /** Proportion of variance explained by each component. */
  varianceExplained: number[];
  /** Cumulative proportion of variance explained. */
  cumulativeVariance: number[];
  /** Loadings matrix: rows = variables, cols = components. */
  loadings: number[][];
  /** Scores matrix: rows = observations, cols = components. */
  scores: number[][];
  /** Variable names carried through. */
  variableNames: string[];
  /** Observation labels carried through. */
  observationLabels: string[];
  /** Number of components retained. */
  nComponents: number;
  /** Mean of each variable (used for centering). */
  means: number[];
  /** Std dev of each variable (used for scaling). */
  stdDevs: number[];
}

export interface ScreePlotData {
  components: ScreePlotPoint[];
  /** Suggested cutoff via Kaiser criterion (eigenvalue > 1). */
  kaiserCutoff: number;
  /** Suggested cutoff via elbow detection. */
  elbowCutoff: number;
}

export interface ScreePlotPoint {
  component: number;
  eigenvalue: number;
  varianceExplained: number;
  cumulativeVariance: number;
}

export interface BiplotData {
  /** Score points for the biplot (observations projected onto 2 PCs). */
  scores: BiplotScore[];
  /** Loading arrows for the biplot (variable contributions). */
  loadings: BiplotLoading[];
  /** Which PCs are displayed. */
  pcX: number;
  pcY: number;
  /** Variance explained by the two displayed PCs. */
  varianceX: number;
  varianceY: number;
}

export interface BiplotScore {
  label: string;
  x: number;
  y: number;
}

export interface BiplotLoading {
  variable: string;
  x: number;
  y: number;
  /** Length of the loading vector (importance). */
  magnitude: number;
}

export interface ComponentInterpretation {
  component: number;
  varianceExplained: number;
  topPositiveLoadings: { variable: string; loading: number }[];
  topNegativeLoadings: { variable: string; loading: number }[];
  suggestedLabel: string;
}

export interface ExportedComponents {
  components: {
    index: number;
    eigenvalue: number;
    varianceExplained: number;
    loadings: { variable: string; value: number }[];
    scores: { label: string; value: number }[];
  }[];
  metadata: {
    nObservations: number;
    nVariables: number;
    totalVarianceRetained: number;
    centered: boolean;
    scaled: boolean;
  };
}

/* ------------------------------------------------------------------ */
/*  Linear algebra helpers                                            */
/* ------------------------------------------------------------------ */

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr: number[], m: number): number {
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function transpose(matrix: number[][]): number[][] {
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;
  const result: number[][] = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j][i] = matrix[i][j];
    }
  }
  return result;
}

function matMul(a: number[][], b: number[][]): number[][] {
  const rowsA = a.length;
  const colsA = a[0]?.length ?? 0;
  const colsB = b[0]?.length ?? 0;
  const result: number[][] = Array.from({ length: rowsA }, () =>
    new Array(colsB).fill(0)
  );
  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      let sum = 0;
      for (let k = 0; k < colsA; k++) {
        sum += a[i][k] * b[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

/**
 * Compute covariance matrix of a centered data matrix.
 */
function covarianceMatrix(data: number[][]): number[][] {
  const n = data.length;
  const p = data[0]?.length ?? 0;
  const cov: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));

  for (let i = 0; i < p; i++) {
    for (let j = i; j < p; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += data[k][i] * data[k][j];
      }
      const val = sum / (n - 1);
      cov[i][j] = val;
      cov[j][i] = val;
    }
  }

  return cov;
}

/**
 * Simple eigenvalue decomposition via power iteration with deflation.
 * Suitable for small-to-medium covariance matrices typical of
 * consciousness indicator data (< 50 variables).
 */
function eigenDecomposition(
  matrix: number[][],
  nComponents: number,
  maxIter: number = 1000,
  tol: number = 1e-10
): { eigenvalues: number[]; eigenvectors: number[][] } {
  const p = matrix.length;
  const eigenvalues: number[] = [];
  const eigenvectors: number[][] = [];

  // Work on a copy
  const A: number[][] = matrix.map((row) => [...row]);

  for (let comp = 0; comp < Math.min(nComponents, p); comp++) {
    // Power iteration
    let v = Array.from({ length: p }, () => Math.random());
    let norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    v = v.map((x) => x / norm);

    let eigenvalue = 0;

    for (let iter = 0; iter < maxIter; iter++) {
      // Multiply A * v
      const Av = new Array(p).fill(0);
      for (let i = 0; i < p; i++) {
        for (let j = 0; j < p; j++) {
          Av[i] += A[i][j] * v[j];
        }
      }

      // New eigenvalue estimate
      const newEigenvalue = v.reduce((s, vi, i) => s + vi * Av[i], 0);

      // Normalize
      norm = Math.sqrt(Av.reduce((s, x) => s + x * x, 0));
      if (norm < tol) break;
      v = Av.map((x) => x / norm);

      if (Math.abs(newEigenvalue - eigenvalue) < tol) {
        eigenvalue = newEigenvalue;
        break;
      }
      eigenvalue = newEigenvalue;
    }

    eigenvalues.push(Math.max(0, eigenvalue));
    eigenvectors.push(v);

    // Deflate: A = A - eigenvalue * v * v^T
    for (let i = 0; i < p; i++) {
      for (let j = 0; j < p; j++) {
        A[i][j] -= eigenvalue * v[i] * v[j];
      }
    }
  }

  return { eigenvalues, eigenvectors };
}

/* ------------------------------------------------------------------ */
/*  Core PCA computation                                              */
/* ------------------------------------------------------------------ */

export function computePCA(input: PCAInput): PCAResult {
  const { data, variableNames, observationLabels } = input;
  const doCenter = input.center !== false;
  const doScale = input.scale !== false;

  const n = data.length;
  const p = variableNames.length;

  if (n === 0 || p === 0) {
    throw new Error("PCA requires non-empty data.");
  }

  // Compute means
  const means: number[] = new Array(p).fill(0);
  for (let j = 0; j < p; j++) {
    means[j] = mean(data.map((row) => row[j]));
  }

  // Compute std devs
  const stdDevs: number[] = new Array(p).fill(1);
  if (doScale) {
    for (let j = 0; j < p; j++) {
      stdDevs[j] = stdDev(
        data.map((row) => row[j]),
        means[j]
      );
      if (stdDevs[j] === 0) stdDevs[j] = 1; // prevent division by zero
    }
  }

  // Center and scale data
  const normalized: number[][] = data.map((row) =>
    row.map((val, j) => {
      let v = val;
      if (doCenter) v -= means[j];
      if (doScale) v /= stdDevs[j];
      return v;
    })
  );

  // Covariance matrix
  const cov = covarianceMatrix(normalized);

  // Eigendecomposition
  const nComponents = Math.min(n, p);
  const { eigenvalues, eigenvectors } = eigenDecomposition(cov, nComponents);

  // Total variance
  const totalVariance = eigenvalues.reduce((s, v) => s + v, 0);

  // Variance explained
  const varianceExplained = eigenvalues.map((ev) =>
    totalVariance > 0 ? ev / totalVariance : 0
  );

  // Cumulative variance
  const cumulativeVariance: number[] = [];
  let cumSum = 0;
  for (const ve of varianceExplained) {
    cumSum += ve;
    cumulativeVariance.push(cumSum);
  }

  // Loadings: eigenvectors as columns (transpose of eigenvectors array)
  const loadings = transpose(eigenvectors);

  // Scores: project data onto components
  const scores = matMul(normalized, loadings);

  const labels = observationLabels ?? data.map((_, i) => `obs_${i + 1}`);

  return {
    eigenvalues,
    varianceExplained,
    cumulativeVariance,
    loadings,
    scores,
    variableNames,
    observationLabels: labels,
    nComponents,
    means,
    stdDevs,
  };
}

/* ------------------------------------------------------------------ */
/*  Scree plot data                                                   */
/* ------------------------------------------------------------------ */

export function getScreePlotData(result: PCAResult): ScreePlotData {
  const components: ScreePlotPoint[] = result.eigenvalues.map((ev, i) => ({
    component: i + 1,
    eigenvalue: ev,
    varianceExplained: result.varianceExplained[i],
    cumulativeVariance: result.cumulativeVariance[i],
  }));

  // Kaiser criterion: eigenvalue > 1 (for scaled data)
  const kaiserCutoff =
    result.eigenvalues.filter((ev) => ev > 1).length || 1;

  // Elbow detection: largest drop
  let elbowCutoff = 1;
  let maxDrop = 0;
  for (let i = 1; i < result.eigenvalues.length; i++) {
    const drop = result.eigenvalues[i - 1] - result.eigenvalues[i];
    if (drop > maxDrop) {
      maxDrop = drop;
      elbowCutoff = i; // component before the drop
    }
  }

  return { components, kaiserCutoff, elbowCutoff };
}

/* ------------------------------------------------------------------ */
/*  Biplot data                                                       */
/* ------------------------------------------------------------------ */

export function getBiplotData(
  result: PCAResult,
  pcX: number = 0,
  pcY: number = 1
): BiplotData {
  const scores: BiplotScore[] = result.scores.map((row, i) => ({
    label: result.observationLabels[i],
    x: row[pcX],
    y: row[pcY],
  }));

  const loadings: BiplotLoading[] = result.variableNames.map((name, i) => {
    const lx = result.loadings[i][pcX];
    const ly = result.loadings[i][pcY];
    return {
      variable: name,
      x: lx,
      y: ly,
      magnitude: Math.sqrt(lx * lx + ly * ly),
    };
  });

  return {
    scores,
    loadings,
    pcX,
    pcY,
    varianceX: result.varianceExplained[pcX],
    varianceY: result.varianceExplained[pcY],
  };
}

/* ------------------------------------------------------------------ */
/*  Component interpretation                                          */
/* ------------------------------------------------------------------ */

export function interpretComponents(
  result: PCAResult,
  topN: number = 3
): ComponentInterpretation[] {
  const interpretations: ComponentInterpretation[] = [];

  for (let c = 0; c < result.nComponents; c++) {
    const loadingPairs = result.variableNames.map((name, i) => ({
      variable: name,
      loading: result.loadings[i][c],
    }));

    // Sort by absolute loading
    const sorted = [...loadingPairs].sort(
      (a, b) => Math.abs(b.loading) - Math.abs(a.loading)
    );

    const topPositive = sorted
      .filter((p) => p.loading > 0)
      .slice(0, topN);
    const topNegative = sorted
      .filter((p) => p.loading < 0)
      .slice(0, topN);

    // Generate a suggested label from top loadings
    const topVars = sorted.slice(0, 2).map((p) => p.variable);
    const suggestedLabel =
      topVars.length > 0
        ? `PC${c + 1}: ${topVars.join(" / ")}`
        : `PC${c + 1}`;

    interpretations.push({
      component: c + 1,
      varianceExplained: result.varianceExplained[c],
      topPositiveLoadings: topPositive,
      topNegativeLoadings: topNegative,
      suggestedLabel,
    });
  }

  return interpretations;
}

/* ------------------------------------------------------------------ */
/*  Export components                                                  */
/* ------------------------------------------------------------------ */

export function exportComponents(
  result: PCAResult,
  nComponents?: number
): ExportedComponents {
  const nc = nComponents ?? result.nComponents;

  const components = Array.from({ length: nc }, (_, c) => ({
    index: c + 1,
    eigenvalue: result.eigenvalues[c],
    varianceExplained: result.varianceExplained[c],
    loadings: result.variableNames.map((name, i) => ({
      variable: name,
      value: result.loadings[i][c],
    })),
    scores: result.observationLabels.map((label, i) => ({
      label,
      value: result.scores[i][c],
    })),
  }));

  return {
    components,
    metadata: {
      nObservations: result.scores.length,
      nVariables: result.variableNames.length,
      totalVarianceRetained: result.cumulativeVariance[nc - 1] ?? 0,
      centered: true,
      scaled: true,
    },
  };
}

/**
 * Export components as CSV string.
 */
export function exportComponentsCSV(
  result: PCAResult,
  nComponents?: number
): string {
  const nc = nComponents ?? Math.min(result.nComponents, 5);
  const rows: string[] = [];

  // Header
  const header = [
    "observation",
    ...Array.from({ length: nc }, (_, i) => `PC${i + 1}`),
  ];
  rows.push(header.join(","));

  // Data rows
  for (let i = 0; i < result.scores.length; i++) {
    const label = result.observationLabels[i];
    const values = Array.from({ length: nc }, (_, c) =>
      result.scores[i][c].toFixed(6)
    );
    rows.push([label, ...values].join(","));
  }

  return rows.join("\n");
}
