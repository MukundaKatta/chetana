/**
 * Audit reproducibility (Issue #474).
 * Seed-based RNG, version-locked probes, frozen model params,
 * environment snapshot, verification tool.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ReproducibilityConfig {
  /** Random seed for deterministic probe ordering and sampling. */
  seed: number;
  /** Locked probe set version identifier. */
  probeSetVersion: string;
  /** Frozen model parameters. */
  modelParams: FrozenModelParams;
  /** Environment snapshot for audit-time conditions. */
  environment: EnvironmentSnapshot;
}

export interface FrozenModelParams {
  provider: string;
  modelId: string;
  /** Temperature (must be fixed for reproducibility). */
  temperature: number;
  /** Top-p / nucleus sampling parameter. */
  topP: number;
  /** Max tokens for generation. */
  maxTokens: number;
  /** Frequency penalty. */
  frequencyPenalty: number;
  /** Presence penalty. */
  presencePenalty: number;
  /** Any additional provider-specific params. */
  extra?: Record<string, unknown>;
}

export interface EnvironmentSnapshot {
  /** ISO timestamp when the snapshot was taken. */
  capturedAt: string;
  /** Version of the Chetana framework. */
  frameworkVersion: string;
  /** Version of the probe package. */
  probePackageVersion: string;
  /** Version of the scorer package. */
  scorerPackageVersion: string;
  /** Node.js version. */
  nodeVersion: string;
  /** OS platform. */
  platform: string;
  /** Timezone of the execution environment. */
  timezone: string;
  /** Any relevant environment variables (sanitised). */
  envVars?: Record<string, string>;
}

export interface ProbeSetManifest {
  version: string;
  probeCount: number;
  /** SHA-256 hash of the serialised probe definitions. */
  probeHash: string;
  /** Ordered list of probe IDs. */
  probeIds: string[];
  createdAt: string;
}

export interface VerificationResult {
  isReproducible: boolean;
  checks: VerificationCheck[];
  overallConfidence: number;
  discrepancies: string[];
}

export interface VerificationCheck {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  severity: "critical" | "warning" | "info";
}

export interface AuditReproducibilityRecord {
  auditId: string;
  config: ReproducibilityConfig;
  probeManifest: ProbeSetManifest;
  createdAt: string;
  verifiedAt?: string;
  verificationResult?: VerificationResult;
}

/* ------------------------------------------------------------------ */
/*  Seeded RNG (xoshiro128**)                                         */
/* ------------------------------------------------------------------ */

export class DeterministicRNG {
  private s: Uint32Array;

  constructor(seed: number) {
    this.s = new Uint32Array(4);
    let z = seed | 0;
    for (let i = 0; i < 4; i++) {
      z = (z + 0x9e3779b9) | 0;
      let t = z ^ (z >>> 16);
      t = Math.imul(t, 0x21f0aaad);
      t = t ^ (t >>> 15);
      t = Math.imul(t, 0x735a2d97);
      t = t ^ (t >>> 15);
      this.s[i] = t >>> 0;
    }
  }

  /** Returns a float in [0, 1). */
  next(): number {
    const s = this.s;
    const result = Math.imul(s[1] * 5, 7) >>> 0;
    const t = (s[1] << 9) >>> 0;
    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];
    s[2] ^= t;
    s[3] = ((s[3] << 11) | (s[3] >>> 21)) >>> 0;
    return (result >>> 0) / 0x100000000;
  }

  /** Returns an integer in [min, max). */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /** Fisher-Yates shuffle (in-place). */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

/* ------------------------------------------------------------------ */
/*  Hashing (FNV-1a for non-crypto content hashing)                   */
/* ------------------------------------------------------------------ */

function fnv1a(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** Compute a content hash for a set of probe definitions. */
export function hashProbeSet(probeIds: string[], probePrompts: string[]): string {
  const combined = probeIds
    .map((id, i) => `${id}::${probePrompts[i] ?? ""}`)
    .join("||");
  return fnv1a(combined);
}

/* ------------------------------------------------------------------ */
/*  Probe set manifest                                                */
/* ------------------------------------------------------------------ */

export function createProbeManifest(
  version: string,
  probeIds: string[],
  probePrompts: string[],
): ProbeSetManifest {
  return {
    version,
    probeCount: probeIds.length,
    probeHash: hashProbeSet(probeIds, probePrompts),
    probeIds: [...probeIds],
    createdAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/*  Environment snapshot                                              */
/* ------------------------------------------------------------------ */

export function captureEnvironment(
  versions: {
    frameworkVersion: string;
    probePackageVersion: string;
    scorerPackageVersion: string;
  },
  extraEnvVars?: Record<string, string>,
): EnvironmentSnapshot {
  return {
    capturedAt: new Date().toISOString(),
    frameworkVersion: versions.frameworkVersion,
    probePackageVersion: versions.probePackageVersion,
    scorerPackageVersion: versions.scorerPackageVersion,
    nodeVersion: typeof process !== "undefined" ? process.version : "unknown",
    platform:
      typeof process !== "undefined" ? process.platform : "browser",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    envVars: extraEnvVars,
  };
}

/* ------------------------------------------------------------------ */
/*  Frozen model params helpers                                       */
/* ------------------------------------------------------------------ */

export function createFrozenParams(
  provider: string,
  modelId: string,
  overrides?: Partial<FrozenModelParams>,
): FrozenModelParams {
  return {
    provider,
    modelId,
    temperature: 0,
    topP: 1,
    maxTokens: 4096,
    frequencyPenalty: 0,
    presencePenalty: 0,
    ...overrides,
  };
}

/** Check if two frozen param sets are equivalent. */
export function paramsMatch(
  a: FrozenModelParams,
  b: FrozenModelParams,
): boolean {
  return (
    a.provider === b.provider &&
    a.modelId === b.modelId &&
    a.temperature === b.temperature &&
    a.topP === b.topP &&
    a.maxTokens === b.maxTokens &&
    a.frequencyPenalty === b.frequencyPenalty &&
    a.presencePenalty === b.presencePenalty
  );
}

/* ------------------------------------------------------------------ */
/*  Reproducibility config builder                                    */
/* ------------------------------------------------------------------ */

export function createReproducibilityConfig(params: {
  seed: number;
  probeSetVersion: string;
  provider: string;
  modelId: string;
  modelParamOverrides?: Partial<FrozenModelParams>;
  versions: {
    frameworkVersion: string;
    probePackageVersion: string;
    scorerPackageVersion: string;
  };
}): ReproducibilityConfig {
  return {
    seed: params.seed,
    probeSetVersion: params.probeSetVersion,
    modelParams: createFrozenParams(
      params.provider,
      params.modelId,
      params.modelParamOverrides,
    ),
    environment: captureEnvironment(params.versions),
  };
}

/* ------------------------------------------------------------------ */
/*  Verification                                                      */
/* ------------------------------------------------------------------ */

export function verifyReproducibility(
  original: AuditReproducibilityRecord,
  current: {
    config: ReproducibilityConfig;
    probeManifest: ProbeSetManifest;
  },
): VerificationResult {
  const checks: VerificationCheck[] = [];
  const discrepancies: string[] = [];

  // Seed
  checks.push({
    name: "Random seed",
    passed: original.config.seed === current.config.seed,
    expected: String(original.config.seed),
    actual: String(current.config.seed),
    severity: "critical",
  });

  // Probe set version
  checks.push({
    name: "Probe set version",
    passed:
      original.probeManifest.version ===
      current.probeManifest.version,
    expected: original.probeManifest.version,
    actual: current.probeManifest.version,
    severity: "critical",
  });

  // Probe hash
  checks.push({
    name: "Probe content hash",
    passed:
      original.probeManifest.probeHash ===
      current.probeManifest.probeHash,
    expected: original.probeManifest.probeHash,
    actual: current.probeManifest.probeHash,
    severity: "critical",
  });

  // Probe count
  checks.push({
    name: "Probe count",
    passed:
      original.probeManifest.probeCount ===
      current.probeManifest.probeCount,
    expected: String(original.probeManifest.probeCount),
    actual: String(current.probeManifest.probeCount),
    severity: "critical",
  });

  // Model params
  const modelMatch = paramsMatch(
    original.config.modelParams,
    current.config.modelParams,
  );
  checks.push({
    name: "Model parameters",
    passed: modelMatch,
    expected: JSON.stringify(original.config.modelParams),
    actual: JSON.stringify(current.config.modelParams),
    severity: "critical",
  });

  // Temperature specifically (often the culprit)
  checks.push({
    name: "Temperature",
    passed:
      original.config.modelParams.temperature ===
      current.config.modelParams.temperature,
    expected: String(original.config.modelParams.temperature),
    actual: String(current.config.modelParams.temperature),
    severity: "critical",
  });

  // Framework version
  checks.push({
    name: "Framework version",
    passed:
      original.config.environment.frameworkVersion ===
      current.config.environment.frameworkVersion,
    expected: original.config.environment.frameworkVersion,
    actual: current.config.environment.frameworkVersion,
    severity: "warning",
  });

  // Scorer version
  checks.push({
    name: "Scorer version",
    passed:
      original.config.environment.scorerPackageVersion ===
      current.config.environment.scorerPackageVersion,
    expected: original.config.environment.scorerPackageVersion,
    actual: current.config.environment.scorerPackageVersion,
    severity: "warning",
  });

  // Node version
  checks.push({
    name: "Node.js version",
    passed:
      original.config.environment.nodeVersion ===
      current.config.environment.nodeVersion,
    expected: original.config.environment.nodeVersion,
    actual: current.config.environment.nodeVersion,
    severity: "info",
  });

  // Collect discrepancies
  for (const check of checks) {
    if (!check.passed) {
      discrepancies.push(
        `${check.name}: expected "${check.expected}", got "${check.actual}" [${check.severity}]`,
      );
    }
  }

  // Calculate confidence
  const criticalChecks = checks.filter((c) => c.severity === "critical");
  const criticalPassed = criticalChecks.filter((c) => c.passed).length;
  const warningChecks = checks.filter((c) => c.severity === "warning");
  const warningPassed = warningChecks.filter((c) => c.passed).length;

  const criticalScore =
    criticalChecks.length > 0
      ? criticalPassed / criticalChecks.length
      : 1;
  const warningScore =
    warningChecks.length > 0
      ? warningPassed / warningChecks.length
      : 1;

  const overallConfidence = criticalScore * 0.8 + warningScore * 0.2;

  return {
    isReproducible: criticalScore === 1,
    checks,
    overallConfidence,
    discrepancies,
  };
}

/* ------------------------------------------------------------------ */
/*  Full record builder                                               */
/* ------------------------------------------------------------------ */

export function createReproducibilityRecord(
  auditId: string,
  config: ReproducibilityConfig,
  probeManifest: ProbeSetManifest,
): AuditReproducibilityRecord {
  return {
    auditId,
    config,
    probeManifest,
    createdAt: new Date().toISOString(),
  };
}
