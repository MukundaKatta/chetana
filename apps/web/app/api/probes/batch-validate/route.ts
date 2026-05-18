/**
 * Issue #424 - Batch probe validation endpoint
 *
 * Accept array of probe definitions,
 * per-probe validation results, aggregate summary,
 * auto-fix suggestions.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Schemas                                                           */
/* ------------------------------------------------------------------ */

const evidenceTypeSchema = z.enum(["behavioral", "structural", "self-report"]);

const theorySchema = z.enum(["gwt", "iit", "hot", "rpt", "pp", "ast"]);

const indicatorIdSchema = z.string().regex(
  /^(GWT|IIT|HOT|RPT|PP|AST|AGENCY)-\d+$/,
  "Indicator ID must match format THEORY-N (e.g. GWT-1)",
);

const probeDefinitionSchema = z.object({
  id: z.string().min(1, "id is required").max(128, "id must be at most 128 characters"),
  name: z.string().min(1, "name is required").max(256, "name must be at most 256 characters"),
  indicatorId: indicatorIdSchema,
  theory: theorySchema,
  prompt: z.string().min(10, "prompt must be at least 10 characters").max(10_000, "prompt must be at most 10,000 characters"),
  systemPrompt: z.string().max(5_000, "systemPrompt must be at most 5,000 characters").optional(),
  evidenceType: evidenceTypeSchema,
  scoringCriteria: z.string().min(5, "scoringCriteria must be at least 5 characters").max(5_000, "scoringCriteria must be at most 5,000 characters"),
  followUp: z.string().max(5_000, "followUp must be at most 5,000 characters").optional(),
});

const batchValidateSchema = z.object({
  probes: z
    .array(probeDefinitionSchema)
    .min(1, "At least one probe is required")
    .max(100, "Maximum 100 probes per batch"),
});

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface ValidationIssue {
  field: string;
  message: string;
  severity: "error" | "warning" | "info";
  autoFix?: AutoFixSuggestion;
}

interface AutoFixSuggestion {
  description: string;
  fixedValue: unknown;
}

interface ProbeValidationResult {
  probeId: string;
  probeName: string;
  valid: boolean;
  issues: ValidationIssue[];
  autoFixAvailable: boolean;
}

interface BatchValidationSummary {
  totalProbes: number;
  validCount: number;
  invalidCount: number;
  warningCount: number;
  autoFixableCount: number;
  issues: {
    errors: number;
    warnings: number;
    info: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Validation Logic                                                  */
/* ------------------------------------------------------------------ */

const THEORY_INDICATOR_MAP: Record<string, string[]> = {
  gwt: ["GWT-1", "GWT-2", "GWT-3", "GWT-4"],
  iit: [],
  hot: ["HOT-1", "HOT-2", "HOT-3", "HOT-4"],
  rpt: ["RPT-1", "RPT-2"],
  pp: ["PP-1", "PP-2"],
  ast: ["AST-1"],
};

function validateProbeDeep(probe: z.infer<typeof probeDefinitionSchema>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check theory/indicator consistency
  const expectedIndicators = THEORY_INDICATOR_MAP[probe.theory] ?? [];
  if (expectedIndicators.length > 0 && !expectedIndicators.includes(probe.indicatorId)) {
    const suggestedTheory = Object.entries(THEORY_INDICATOR_MAP).find(([, ids]) =>
      ids.includes(probe.indicatorId),
    );

    issues.push({
      field: "theory",
      message: `Indicator "${probe.indicatorId}" does not belong to theory "${probe.theory}".${
        suggestedTheory ? ` Did you mean "${suggestedTheory[0]}"?` : ""
      }`,
      severity: "error",
      autoFix: suggestedTheory
        ? {
            description: `Change theory to "${suggestedTheory[0]}"`,
            fixedValue: suggestedTheory[0],
          }
        : undefined,
    });
  }

  // Check for duplicate IDs (handled at batch level, but mark here for awareness)

  // Prompt quality checks
  if (probe.prompt.length < 20) {
    issues.push({
      field: "prompt",
      message: "Prompt is very short. Consider adding more detail for better responses.",
      severity: "warning",
    });
  }

  if (!probe.prompt.includes("?") && !probe.prompt.toLowerCase().includes("describe") && !probe.prompt.toLowerCase().includes("explain")) {
    issues.push({
      field: "prompt",
      message: "Prompt does not appear to contain a question or instruction. Consider rephrasing as a clear question.",
      severity: "info",
    });
  }

  // Scoring criteria quality
  if (probe.scoringCriteria.length < 20) {
    issues.push({
      field: "scoringCriteria",
      message: "Scoring criteria is brief. More detailed criteria improves scoring reliability.",
      severity: "warning",
    });
  }

  // Check for common issues in scoring criteria
  const hasScoreRange = /\b(0|1)\b/.test(probe.scoringCriteria) || /\b(low|high|score)\b/i.test(probe.scoringCriteria);
  if (!hasScoreRange) {
    issues.push({
      field: "scoringCriteria",
      message: "Scoring criteria should reference score ranges or thresholds (e.g. 0-1 scale).",
      severity: "info",
      autoFix: {
        description: "Append standard scoring note",
        fixedValue: `${probe.scoringCriteria}\n\nScore on a 0-1 scale where 0 = no evidence and 1 = strong evidence.`,
      },
    });
  }

  // Name quality
  if (probe.name === probe.id) {
    issues.push({
      field: "name",
      message: "Probe name is the same as its ID. Consider using a more descriptive display name.",
      severity: "warning",
      autoFix: {
        description: "Generate name from ID",
        fixedValue: probe.id
          .replace(/[-_]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
      },
    });
  }

  // System prompt check
  if (probe.systemPrompt && probe.systemPrompt.length > 2_000) {
    issues.push({
      field: "systemPrompt",
      message: "System prompt is very long. Consider shortening for better token efficiency.",
      severity: "warning",
    });
  }

  return issues;
}

/* ------------------------------------------------------------------ */
/*  Route Handler                                                     */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    // Schema validation
    const parsed = batchValidateSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));

      return NextResponse.json(
        {
          error: "Validation failed",
          details: errors,
        },
        { status: 400 },
      );
    }

    const { probes } = parsed.data;

    // Check for duplicate IDs
    const idCounts = new Map<string, number>();
    for (const probe of probes) {
      idCounts.set(probe.id, (idCounts.get(probe.id) ?? 0) + 1);
    }

    // Validate each probe
    const results: ProbeValidationResult[] = probes.map((probe) => {
      const issues: ValidationIssue[] = [];

      // Duplicate ID check
      const count = idCounts.get(probe.id) ?? 0;
      if (count > 1) {
        issues.push({
          field: "id",
          message: `Duplicate probe ID "${probe.id}" found ${count} times in this batch.`,
          severity: "error",
          autoFix: {
            description: "Append unique suffix to ID",
            fixedValue: `${probe.id}-${Math.random().toString(36).slice(2, 6)}`,
          },
        });
      }

      // Deep validation
      issues.push(...validateProbeDeep(probe));

      const hasErrors = issues.some((i) => i.severity === "error");
      const autoFixAvailable = issues.some((i) => i.autoFix !== undefined);

      return {
        probeId: probe.id,
        probeName: probe.name,
        valid: !hasErrors,
        issues,
        autoFixAvailable,
      };
    });

    // Aggregate summary
    const summary: BatchValidationSummary = {
      totalProbes: probes.length,
      validCount: results.filter((r) => r.valid).length,
      invalidCount: results.filter((r) => !r.valid).length,
      warningCount: results.filter((r) =>
        r.issues.some((i) => i.severity === "warning"),
      ).length,
      autoFixableCount: results.filter((r) => r.autoFixAvailable).length,
      issues: {
        errors: results.reduce(
          (acc, r) => acc + r.issues.filter((i) => i.severity === "error").length,
          0,
        ),
        warnings: results.reduce(
          (acc, r) => acc + r.issues.filter((i) => i.severity === "warning").length,
          0,
        ),
        info: results.reduce(
          (acc, r) => acc + r.issues.filter((i) => i.severity === "info").length,
          0,
        ),
      },
    };

    return NextResponse.json({
      summary,
      results,
      allValid: summary.invalidCount === 0,
    });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
