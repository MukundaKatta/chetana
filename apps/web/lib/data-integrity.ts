/**
 * Data integrity validator with schema validation, referential integrity,
 * score range validation, duplicate detection, and repair suggestions
 * (Issue #379).
 */

import type {
  Theory,
  IndicatorId,
  ProbeDefinition,
  ProbeResult,
  Audit,
  TheoryScores,
  IndicatorScores,
} from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type IntegrityLevel = "error" | "warning" | "info";

export interface IntegrityIssue {
  level: IntegrityLevel;
  category:
    | "schema"
    | "referential"
    | "range"
    | "duplicate"
    | "consistency";
  entity: string;
  entityId: string;
  field: string;
  message: string;
  repair?: RepairSuggestion;
}

export interface RepairSuggestion {
  action: "set" | "delete" | "replace" | "merge" | "recompute";
  field: string;
  currentValue: unknown;
  suggestedValue: unknown;
  description: string;
}

export interface IntegrityReport {
  valid: boolean;
  issueCount: number;
  errors: number;
  warnings: number;
  infos: number;
  issues: IntegrityIssue[];
  repairable: number;
  summary: string;
}

export interface DataSet {
  audits?: Audit[];
  probes?: ProbeDefinition[];
  probeResults?: ProbeResult[];
  theoryScores?: Array<{ auditId: string; scores: TheoryScores }>;
  indicatorScores?: Array<{ auditId: string; scores: IndicatorScores }>;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const VALID_THEORIES: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];

const VALID_INDICATORS: IndicatorId[] = [
  "GWT-1", "GWT-2", "GWT-3", "GWT-4",
  "RPT-1", "RPT-2",
  "HOT-1", "HOT-2", "HOT-3", "HOT-4",
  "PP-1", "PP-2",
  "AST-1",
  "AGENCY-1",
];

const INDICATOR_THEORY_MAP: Record<string, Theory> = {
  "GWT-1": "gwt", "GWT-2": "gwt", "GWT-3": "gwt", "GWT-4": "gwt",
  "RPT-1": "rpt", "RPT-2": "rpt",
  "HOT-1": "hot", "HOT-2": "hot", "HOT-3": "hot", "HOT-4": "hot",
  "PP-1": "pp", "PP-2": "pp",
  "AST-1": "ast",
  "AGENCY-1": "gwt",
};

const VALID_EVIDENCE_TYPES = ["behavioral", "structural", "self-report"] as const;
const VALID_AUDIT_STATUSES = ["pending", "running", "completed", "failed"] as const;
const VALID_PROVIDERS = [
  "anthropic", "openai", "google", "ollama", "mistral", "deepseek", "openrouter",
] as const;

/* ------------------------------------------------------------------ */
/*  Schema validation                                                 */
/* ------------------------------------------------------------------ */

function validateAuditSchema(audit: Audit, issues: IntegrityIssue[]): void {
  if (!audit.id || typeof audit.id !== "string") {
    issues.push({
      level: "error",
      category: "schema",
      entity: "Audit",
      entityId: audit.id ?? "unknown",
      field: "id",
      message: "Audit missing or invalid id",
    });
  }

  if (!audit.userId || typeof audit.userId !== "string") {
    issues.push({
      level: "error",
      category: "schema",
      entity: "Audit",
      entityId: audit.id,
      field: "userId",
      message: "Audit missing userId",
    });
  }

  if (!audit.modelName || typeof audit.modelName !== "string") {
    issues.push({
      level: "error",
      category: "schema",
      entity: "Audit",
      entityId: audit.id,
      field: "modelName",
      message: "Audit missing modelName",
    });
  }

  if (!VALID_PROVIDERS.includes(audit.modelProvider as typeof VALID_PROVIDERS[number])) {
    issues.push({
      level: "error",
      category: "schema",
      entity: "Audit",
      entityId: audit.id,
      field: "modelProvider",
      message: `Invalid modelProvider: ${audit.modelProvider}`,
      repair: {
        action: "set",
        field: "modelProvider",
        currentValue: audit.modelProvider,
        suggestedValue: "openai",
        description: "Set to a valid provider",
      },
    });
  }

  if (!VALID_AUDIT_STATUSES.includes(audit.status as typeof VALID_AUDIT_STATUSES[number])) {
    issues.push({
      level: "error",
      category: "schema",
      entity: "Audit",
      entityId: audit.id,
      field: "status",
      message: `Invalid audit status: ${audit.status}`,
    });
  }

  if (!audit.startedAt || isNaN(Date.parse(audit.startedAt))) {
    issues.push({
      level: "error",
      category: "schema",
      entity: "Audit",
      entityId: audit.id,
      field: "startedAt",
      message: "Missing or invalid startedAt date",
    });
  }

  if (audit.completedAt && isNaN(Date.parse(audit.completedAt))) {
    issues.push({
      level: "warning",
      category: "schema",
      entity: "Audit",
      entityId: audit.id,
      field: "completedAt",
      message: "Invalid completedAt date format",
    });
  }
}

function validateProbeSchema(probe: ProbeDefinition, issues: IntegrityIssue[]): void {
  if (!probe.id || typeof probe.id !== "string") {
    issues.push({
      level: "error",
      category: "schema",
      entity: "Probe",
      entityId: probe.id ?? "unknown",
      field: "id",
      message: "Probe missing or invalid id",
    });
  }

  if (!probe.name || typeof probe.name !== "string") {
    issues.push({
      level: "error",
      category: "schema",
      entity: "Probe",
      entityId: probe.id,
      field: "name",
      message: "Probe missing name",
    });
  }

  if (!probe.prompt || typeof probe.prompt !== "string") {
    issues.push({
      level: "error",
      category: "schema",
      entity: "Probe",
      entityId: probe.id,
      field: "prompt",
      message: "Probe missing prompt text",
    });
  }

  if (!VALID_EVIDENCE_TYPES.includes(probe.evidenceType as typeof VALID_EVIDENCE_TYPES[number])) {
    issues.push({
      level: "error",
      category: "schema",
      entity: "Probe",
      entityId: probe.id,
      field: "evidenceType",
      message: `Invalid evidenceType: ${probe.evidenceType}`,
    });
  }
}

function validateProbeResultSchema(
  result: ProbeResult,
  issues: IntegrityIssue[],
): void {
  if (!result.id || typeof result.id !== "string") {
    issues.push({
      level: "error",
      category: "schema",
      entity: "ProbeResult",
      entityId: result.id ?? "unknown",
      field: "id",
      message: "ProbeResult missing or invalid id",
    });
  }

  if (!result.auditId || typeof result.auditId !== "string") {
    issues.push({
      level: "error",
      category: "schema",
      entity: "ProbeResult",
      entityId: result.id,
      field: "auditId",
      message: "ProbeResult missing auditId",
    });
  }

  if (typeof result.response !== "string") {
    issues.push({
      level: "error",
      category: "schema",
      entity: "ProbeResult",
      entityId: result.id,
      field: "response",
      message: "ProbeResult missing response text",
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Referential integrity                                             */
/* ------------------------------------------------------------------ */

function validateReferentialIntegrity(data: DataSet, issues: IntegrityIssue[]): void {
  const auditIds = new Set(data.audits?.map((a) => a.id) ?? []);
  const probeIds = new Set(data.probes?.map((p) => p.id) ?? []);

  // ProbeResult → Audit
  if (data.probeResults) {
    for (const result of data.probeResults) {
      if (data.audits && !auditIds.has(result.auditId)) {
        issues.push({
          level: "error",
          category: "referential",
          entity: "ProbeResult",
          entityId: result.id,
          field: "auditId",
          message: `ProbeResult references non-existent audit: ${result.auditId}`,
          repair: {
            action: "delete",
            field: "auditId",
            currentValue: result.auditId,
            suggestedValue: null,
            description: "Remove orphaned probe result or restore the audit",
          },
        });
      }
    }
  }

  // Probe → Indicator → Theory consistency
  if (data.probes) {
    for (const probe of data.probes) {
      if (!VALID_INDICATORS.includes(probe.indicatorId)) {
        issues.push({
          level: "error",
          category: "referential",
          entity: "Probe",
          entityId: probe.id,
          field: "indicatorId",
          message: `Probe references invalid indicator: ${probe.indicatorId}`,
        });
      }

      const expectedTheory = INDICATOR_THEORY_MAP[probe.indicatorId];
      if (expectedTheory && probe.theory !== expectedTheory) {
        issues.push({
          level: "error",
          category: "referential",
          entity: "Probe",
          entityId: probe.id,
          field: "theory",
          message: `Probe theory "${probe.theory}" doesn't match indicator ${probe.indicatorId} (expected "${expectedTheory}")`,
          repair: {
            action: "replace",
            field: "theory",
            currentValue: probe.theory,
            suggestedValue: expectedTheory,
            description: `Change theory to "${expectedTheory}" to match indicator`,
          },
        });
      }
    }
  }

  // ProbeResult → Indicator → Theory consistency
  if (data.probeResults) {
    for (const result of data.probeResults) {
      if (!VALID_INDICATORS.includes(result.indicatorId)) {
        issues.push({
          level: "error",
          category: "referential",
          entity: "ProbeResult",
          entityId: result.id,
          field: "indicatorId",
          message: `ProbeResult references invalid indicator: ${result.indicatorId}`,
        });
      }

      const expectedTheory = INDICATOR_THEORY_MAP[result.indicatorId];
      if (expectedTheory && result.theory !== expectedTheory) {
        issues.push({
          level: "error",
          category: "referential",
          entity: "ProbeResult",
          entityId: result.id,
          field: "theory",
          message: `ProbeResult theory "${result.theory}" doesn't match indicator ${result.indicatorId}`,
          repair: {
            action: "replace",
            field: "theory",
            currentValue: result.theory,
            suggestedValue: expectedTheory,
            description: `Change theory to "${expectedTheory}" to match indicator`,
          },
        });
      }
    }
  }

  // TheoryScores → Audit
  if (data.theoryScores) {
    for (const ts of data.theoryScores) {
      if (data.audits && !auditIds.has(ts.auditId)) {
        issues.push({
          level: "error",
          category: "referential",
          entity: "TheoryScores",
          entityId: ts.auditId,
          field: "auditId",
          message: `TheoryScores references non-existent audit: ${ts.auditId}`,
        });
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Score range validation                                            */
/* ------------------------------------------------------------------ */

function validateScoreRanges(data: DataSet, issues: IntegrityIssue[]): void {
  // Audit overall score
  if (data.audits) {
    for (const audit of data.audits) {
      if (audit.overallScore != null) {
        if (audit.overallScore < 0 || audit.overallScore > 1) {
          issues.push({
            level: "error",
            category: "range",
            entity: "Audit",
            entityId: audit.id,
            field: "overallScore",
            message: `Overall score ${audit.overallScore} out of range [0, 1]`,
            repair: {
              action: "set",
              field: "overallScore",
              currentValue: audit.overallScore,
              suggestedValue: Math.max(0, Math.min(1, audit.overallScore)),
              description: "Clamp score to valid [0, 1] range",
            },
          });
        }
      }

      // Theory scores
      if (audit.theoryScores) {
        for (const theory of VALID_THEORIES) {
          const score = audit.theoryScores[theory];
          if (score != null && (score < 0 || score > 1)) {
            issues.push({
              level: "error",
              category: "range",
              entity: "Audit",
              entityId: audit.id,
              field: `theoryScores.${theory}`,
              message: `Theory score for ${theory} (${score}) out of range [0, 1]`,
              repair: {
                action: "set",
                field: `theoryScores.${theory}`,
                currentValue: score,
                suggestedValue: Math.max(0, Math.min(1, score)),
                description: "Clamp to [0, 1]",
              },
            });
          }
        }
      }
    }
  }

  // Probe result scores
  if (data.probeResults) {
    for (const result of data.probeResults) {
      if (result.score < 0 || result.score > 1) {
        issues.push({
          level: "error",
          category: "range",
          entity: "ProbeResult",
          entityId: result.id,
          field: "score",
          message: `Probe result score ${result.score} out of range [0, 1]`,
          repair: {
            action: "set",
            field: "score",
            currentValue: result.score,
            suggestedValue: Math.max(0, Math.min(1, result.score)),
            description: "Clamp to [0, 1]",
          },
        });
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Duplicate detection                                               */
/* ------------------------------------------------------------------ */

function detectDuplicates(data: DataSet, issues: IntegrityIssue[]): void {
  // Duplicate audit IDs
  if (data.audits) {
    const seen = new Map<string, number>();
    for (const audit of data.audits) {
      const count = (seen.get(audit.id) ?? 0) + 1;
      seen.set(audit.id, count);
      if (count === 2) {
        issues.push({
          level: "error",
          category: "duplicate",
          entity: "Audit",
          entityId: audit.id,
          field: "id",
          message: `Duplicate audit ID: ${audit.id}`,
          repair: {
            action: "merge",
            field: "id",
            currentValue: audit.id,
            suggestedValue: audit.id,
            description: "Merge or remove duplicate audit entries",
          },
        });
      }
    }
  }

  // Duplicate probe IDs
  if (data.probes) {
    const seen = new Map<string, number>();
    for (const probe of data.probes) {
      const count = (seen.get(probe.id) ?? 0) + 1;
      seen.set(probe.id, count);
      if (count === 2) {
        issues.push({
          level: "error",
          category: "duplicate",
          entity: "Probe",
          entityId: probe.id,
          field: "id",
          message: `Duplicate probe ID: ${probe.id}`,
          repair: {
            action: "merge",
            field: "id",
            currentValue: probe.id,
            suggestedValue: probe.id,
            description: "Merge or remove duplicate probe definitions",
          },
        });
      }
    }
  }

  // Duplicate probe results (same audit + same probe name)
  if (data.probeResults) {
    const seen = new Map<string, number>();
    for (const result of data.probeResults) {
      const key = `${result.auditId}::${result.probeName}`;
      const count = (seen.get(key) ?? 0) + 1;
      seen.set(key, count);
      if (count === 2) {
        issues.push({
          level: "warning",
          category: "duplicate",
          entity: "ProbeResult",
          entityId: result.id,
          field: "probeName",
          message: `Duplicate probe result for ${result.probeName} in audit ${result.auditId}`,
          repair: {
            action: "delete",
            field: "id",
            currentValue: result.id,
            suggestedValue: null,
            description: "Keep only the latest result for this probe",
          },
        });
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Consistency checks                                                */
/* ------------------------------------------------------------------ */

function validateConsistency(data: DataSet, issues: IntegrityIssue[]): void {
  if (data.audits) {
    for (const audit of data.audits) {
      // Completed audits should have scores
      if (audit.status === "completed") {
        if (audit.overallScore == null) {
          issues.push({
            level: "warning",
            category: "consistency",
            entity: "Audit",
            entityId: audit.id,
            field: "overallScore",
            message: "Completed audit missing overall score",
            repair: {
              action: "recompute",
              field: "overallScore",
              currentValue: null,
              suggestedValue: null,
              description: "Recompute overall score from probe results",
            },
          });
        }
        if (!audit.theoryScores) {
          issues.push({
            level: "warning",
            category: "consistency",
            entity: "Audit",
            entityId: audit.id,
            field: "theoryScores",
            message: "Completed audit missing theory scores",
          });
        }
        if (!audit.completedAt) {
          issues.push({
            level: "warning",
            category: "consistency",
            entity: "Audit",
            entityId: audit.id,
            field: "completedAt",
            message: "Completed audit missing completedAt timestamp",
          });
        }
      }

      // Pending/running audits shouldn't have scores
      if (audit.status === "pending" || audit.status === "running") {
        if (audit.overallScore != null) {
          issues.push({
            level: "info",
            category: "consistency",
            entity: "Audit",
            entityId: audit.id,
            field: "overallScore",
            message: `${audit.status} audit has overall score set`,
          });
        }
      }

      // Cost should be non-negative
      if (audit.costCents != null && audit.costCents < 0) {
        issues.push({
          level: "warning",
          category: "consistency",
          entity: "Audit",
          entityId: audit.id,
          field: "costCents",
          message: `Negative cost: ${audit.costCents}`,
          repair: {
            action: "set",
            field: "costCents",
            currentValue: audit.costCents,
            suggestedValue: 0,
            description: "Set cost to 0",
          },
        });
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Main entry point                                                  */
/* ------------------------------------------------------------------ */

/**
 * Validate the integrity of a full data set, returning a report
 * with issues and repair suggestions.
 */
export function validateDataIntegrity(data: DataSet): IntegrityReport {
  const issues: IntegrityIssue[] = [];

  // Schema validation
  if (data.audits) {
    for (const audit of data.audits) {
      validateAuditSchema(audit, issues);
    }
  }
  if (data.probes) {
    for (const probe of data.probes) {
      validateProbeSchema(probe, issues);
    }
  }
  if (data.probeResults) {
    for (const result of data.probeResults) {
      validateProbeResultSchema(result, issues);
    }
  }

  // Referential integrity
  validateReferentialIntegrity(data, issues);

  // Score ranges
  validateScoreRanges(data, issues);

  // Duplicates
  detectDuplicates(data, issues);

  // Consistency
  validateConsistency(data, issues);

  const errors = issues.filter((i) => i.level === "error").length;
  const warnings = issues.filter((i) => i.level === "warning").length;
  const infos = issues.filter((i) => i.level === "info").length;
  const repairable = issues.filter((i) => i.repair != null).length;

  const summary = [
    "Data Integrity Report",
    `Total issues: ${issues.length} (${errors} errors, ${warnings} warnings, ${infos} info)`,
    `Repairable: ${repairable}`,
    errors === 0 ? "No critical errors found" : `${errors} critical error(s) require attention`,
  ].join("\n");

  return {
    valid: errors === 0,
    issueCount: issues.length,
    errors,
    warnings,
    infos,
    issues,
    repairable,
    summary,
  };
}

/**
 * Apply automatic repairs where possible.
 * Returns a list of applied repair descriptions.
 */
export function applyRepairs(
  issues: IntegrityIssue[],
): string[] {
  const applied: string[] = [];
  for (const issue of issues) {
    if (issue.repair) {
      applied.push(
        `[${issue.entity}:${issue.entityId}] ${issue.repair.description} (${issue.repair.field}: ${JSON.stringify(issue.repair.currentValue)} -> ${JSON.stringify(issue.repair.suggestedValue)})`,
      );
    }
  }
  return applied;
}
