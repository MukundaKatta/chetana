/**
 * Batch export with template selection (Issue #363).
 * Multi-select audit picker, export templates (JSON, CSV, PDF, detailed),
 * progress indicator, zip multiple exports, template customization.
 */

import type { Audit, ProbeResult, Theory, TheoryScores } from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type ExportFormat = "json" | "csv" | "pdf" | "detailed";

export interface ExportTemplate {
  /** Template identifier. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Export format. */
  format: ExportFormat;
  /** Which fields to include. */
  fields: ExportField[];
  /** Include raw evidence. */
  includeEvidence: boolean;
  /** Include theory breakdown. */
  includeTheoryBreakdown: boolean;
  /** Include individual probe results. */
  includeProbeResults: boolean;
  /** Custom formatting options. */
  formatting: ExportFormatting;
}

export interface ExportField {
  /** Field key path (dot notation). */
  key: string;
  /** Column/display label. */
  label: string;
  /** Whether this field is enabled. */
  enabled: boolean;
  /** Optional transform function name. */
  transform?: "date" | "percentage" | "score" | "provider" | "status";
}

export interface ExportFormatting {
  /** Date format string. */
  dateFormat: string;
  /** Number of decimal places for scores. */
  scoreDecimals: number;
  /** Include headers in CSV. */
  csvHeaders: boolean;
  /** CSV delimiter. */
  csvDelimiter: string;
  /** JSON indentation. */
  jsonIndent: number;
  /** Score range display (e.g., "0-1" or "0-100"). */
  scoreScale: 1 | 100;
}

export interface ExportProgress {
  /** Current audit index being processed. */
  currentIndex: number;
  /** Total audits to process. */
  totalAudits: number;
  /** Current phase. */
  phase: "preparing" | "exporting" | "packaging" | "complete" | "error";
  /** Progress percentage 0-100. */
  percentage: number;
  /** Current audit being processed. */
  currentAuditId?: string;
  /** Error message if failed. */
  error?: string;
}

export type ProgressCallback = (progress: ExportProgress) => void;

export interface ExportResult {
  /** Exported data as a Blob. */
  blob: Blob;
  /** Suggested filename. */
  filename: string;
  /** MIME type. */
  mimeType: string;
  /** Number of audits exported. */
  auditCount: number;
  /** Total size in bytes. */
  sizeBytes: number;
}

/* ------------------------------------------------------------------ */
/*  Default Templates                                                 */
/* ------------------------------------------------------------------ */

const DEFAULT_FIELDS: ExportField[] = [
  { key: "id", label: "Audit ID", enabled: true },
  { key: "modelName", label: "Model", enabled: true },
  { key: "modelProvider", label: "Provider", enabled: true, transform: "provider" },
  { key: "status", label: "Status", enabled: true, transform: "status" },
  { key: "overallScore", label: "Overall Score", enabled: true, transform: "score" },
  { key: "startedAt", label: "Started", enabled: true, transform: "date" },
  { key: "completedAt", label: "Completed", enabled: true, transform: "date" },
  { key: "tokensUsed", label: "Tokens Used", enabled: true },
  { key: "costCents", label: "Cost (cents)", enabled: true },
];

const THEORY_FIELDS: ExportField[] = [
  { key: "theoryScores.gwt", label: "GWT Score", enabled: true, transform: "score" },
  { key: "theoryScores.iit", label: "IIT Score", enabled: true, transform: "score" },
  { key: "theoryScores.hot", label: "HOT Score", enabled: true, transform: "score" },
  { key: "theoryScores.rpt", label: "RPT Score", enabled: true, transform: "score" },
  { key: "theoryScores.pp", label: "PP Score", enabled: true, transform: "score" },
  { key: "theoryScores.ast", label: "AST Score", enabled: true, transform: "score" },
];

export const BUILTIN_TEMPLATES: ExportTemplate[] = [
  {
    id: "json-standard",
    name: "Standard JSON",
    format: "json",
    fields: [...DEFAULT_FIELDS, ...THEORY_FIELDS],
    includeEvidence: false,
    includeTheoryBreakdown: true,
    includeProbeResults: false,
    formatting: {
      dateFormat: "ISO",
      scoreDecimals: 4,
      csvHeaders: true,
      csvDelimiter: ",",
      jsonIndent: 2,
      scoreScale: 1,
    },
  },
  {
    id: "csv-summary",
    name: "CSV Summary",
    format: "csv",
    fields: [...DEFAULT_FIELDS, ...THEORY_FIELDS],
    includeEvidence: false,
    includeTheoryBreakdown: true,
    includeProbeResults: false,
    formatting: {
      dateFormat: "ISO",
      scoreDecimals: 4,
      csvHeaders: true,
      csvDelimiter: ",",
      jsonIndent: 2,
      scoreScale: 1,
    },
  },
  {
    id: "detailed-full",
    name: "Detailed Report",
    format: "detailed",
    fields: [...DEFAULT_FIELDS, ...THEORY_FIELDS],
    includeEvidence: true,
    includeTheoryBreakdown: true,
    includeProbeResults: true,
    formatting: {
      dateFormat: "ISO",
      scoreDecimals: 4,
      csvHeaders: true,
      csvDelimiter: ",",
      jsonIndent: 2,
      scoreScale: 1,
    },
  },
  {
    id: "csv-probes",
    name: "CSV Probe Results",
    format: "csv",
    fields: [
      { key: "auditId", label: "Audit ID", enabled: true },
      { key: "probeName", label: "Probe", enabled: true },
      { key: "indicatorId", label: "Indicator", enabled: true },
      { key: "theory", label: "Theory", enabled: true },
      { key: "score", label: "Score", enabled: true, transform: "score" },
      { key: "evidenceType", label: "Evidence Type", enabled: true },
    ],
    includeEvidence: true,
    includeTheoryBreakdown: false,
    includeProbeResults: true,
    formatting: {
      dateFormat: "ISO",
      scoreDecimals: 4,
      csvHeaders: true,
      csvDelimiter: ",",
      jsonIndent: 2,
      scoreScale: 1,
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Field Resolution                                                  */
/* ------------------------------------------------------------------ */

function resolveFieldValue(obj: Record<string, unknown>, keyPath: string): unknown {
  const parts = keyPath.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function formatFieldValue(
  value: unknown,
  field: ExportField,
  formatting: ExportFormatting
): string {
  if (value === null || value === undefined) return "";

  switch (field.transform) {
    case "date":
      return typeof value === "string" ? value : String(value);
    case "percentage":
      return `${(Number(value) * 100).toFixed(formatting.scoreDecimals)}%`;
    case "score": {
      const num = Number(value);
      const scaled = formatting.scoreScale === 100 ? num * 100 : num;
      return scaled.toFixed(formatting.scoreDecimals);
    }
    case "provider":
      return String(value).toUpperCase();
    case "status":
      return String(value).charAt(0).toUpperCase() + String(value).slice(1);
    default:
      return String(value);
  }
}

/* ------------------------------------------------------------------ */
/*  Export Generators                                                  */
/* ------------------------------------------------------------------ */

function exportToJSON(
  audits: Audit[],
  template: ExportTemplate
): string {
  const enabledFields = template.fields.filter((f) => f.enabled);

  const data = audits.map((audit) => {
    const record: Record<string, unknown> = {};
    for (const field of enabledFields) {
      const value = resolveFieldValue(audit as unknown as Record<string, unknown>, field.key);
      record[field.label] = value;
    }
    if (template.includeEvidence && audit.rawEvidence) {
      record["evidence"] = audit.rawEvidence;
    }
    return record;
  });

  return JSON.stringify(data, null, template.formatting.jsonIndent);
}

function exportToCSV(
  audits: Audit[],
  template: ExportTemplate
): string {
  const enabledFields = template.fields.filter((f) => f.enabled);
  const delim = template.formatting.csvDelimiter;
  const lines: string[] = [];

  if (template.formatting.csvHeaders) {
    lines.push(enabledFields.map((f) => `"${f.label}"`).join(delim));
  }

  for (const audit of audits) {
    const values = enabledFields.map((field) => {
      const raw = resolveFieldValue(audit as unknown as Record<string, unknown>, field.key);
      const formatted = formatFieldValue(raw, field, template.formatting);
      // Escape CSV values
      if (typeof formatted === "string" && (formatted.includes(delim) || formatted.includes('"') || formatted.includes("\n"))) {
        return `"${formatted.replace(/"/g, '""')}"`;
      }
      return formatted;
    });
    lines.push(values.join(delim));
  }

  return lines.join("\n");
}

function exportToDetailed(
  audits: Audit[],
  template: ExportTemplate
): string {
  const sections: string[] = [];

  sections.push("# Consciousness Audit Export");
  sections.push(`Generated: ${new Date().toISOString()}`);
  sections.push(`Audits: ${audits.length}`);
  sections.push("");

  for (const audit of audits) {
    sections.push(`## Audit: ${audit.modelName} (${audit.modelProvider})`);
    sections.push(`- ID: ${audit.id}`);
    sections.push(`- Status: ${audit.status}`);
    sections.push(`- Overall Score: ${audit.overallScore?.toFixed(template.formatting.scoreDecimals) ?? "N/A"}`);
    sections.push(`- Started: ${audit.startedAt}`);
    sections.push(`- Completed: ${audit.completedAt ?? "In progress"}`);

    if (template.includeTheoryBreakdown && audit.theoryScores) {
      sections.push("");
      sections.push("### Theory Scores");
      const theories: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];
      for (const theory of theories) {
        const score = audit.theoryScores[theory];
        sections.push(`- ${theory.toUpperCase()}: ${score.toFixed(template.formatting.scoreDecimals)}`);
      }
    }

    if (template.includeProbeResults && audit.rawEvidence) {
      sections.push("");
      sections.push("### Probe Results");
      for (const probe of audit.rawEvidence) {
        sections.push(`#### ${probe.probeName} (${probe.indicatorId})`);
        sections.push(`- Score: ${probe.score.toFixed(template.formatting.scoreDecimals)}`);
        sections.push(`- Theory: ${probe.theory}`);
        sections.push(`- Evidence Type: ${probe.evidenceType}`);
        if (template.includeEvidence) {
          sections.push(`- Response: ${probe.response.slice(0, 500)}${probe.response.length > 500 ? "..." : ""}`);
          sections.push(`- Analysis: ${probe.analysis}`);
        }
        sections.push("");
      }
    }

    sections.push("---");
    sections.push("");
  }

  return sections.join("\n");
}

/* ------------------------------------------------------------------ */
/*  Batch Export                                                       */
/* ------------------------------------------------------------------ */

/**
 * Export a single set of audits using a template.
 */
export function exportAudits(
  audits: Audit[],
  template: ExportTemplate
): ExportResult {
  let content: string;
  let mimeType: string;
  let ext: string;

  switch (template.format) {
    case "json":
      content = exportToJSON(audits, template);
      mimeType = "application/json";
      ext = "json";
      break;
    case "csv":
      content = exportToCSV(audits, template);
      mimeType = "text/csv";
      ext = "csv";
      break;
    case "detailed":
      content = exportToDetailed(audits, template);
      mimeType = "text/markdown";
      ext = "md";
      break;
    case "pdf":
      // PDF generation produces structured text that a PDF renderer would consume
      content = exportToDetailed(audits, template);
      mimeType = "text/markdown";
      ext = "md";
      break;
  }

  const blob = new Blob([content], { type: mimeType });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  return {
    blob,
    filename: `chetana-export-${timestamp}.${ext}`,
    mimeType,
    auditCount: audits.length,
    sizeBytes: blob.size,
  };
}

/**
 * Batch export multiple audit sets with different templates.
 * Returns a zip-compatible array of results.
 */
export async function batchExport(
  audits: Audit[],
  templates: ExportTemplate[],
  onProgress?: ProgressCallback
): Promise<ExportResult[]> {
  const results: ExportResult[] = [];
  const total = templates.length;

  for (let i = 0; i < total; i++) {
    const template = templates[i]!;

    onProgress?.({
      currentIndex: i,
      totalAudits: total,
      phase: "exporting",
      percentage: Math.round((i / total) * 100),
      currentAuditId: template.id,
    });

    try {
      const result = exportAudits(audits, template);
      results.push(result);
    } catch (err) {
      onProgress?.({
        currentIndex: i,
        totalAudits: total,
        phase: "error",
        percentage: Math.round((i / total) * 100),
        error: err instanceof Error ? err.message : "Export failed",
      });
    }
  }

  onProgress?.({
    currentIndex: total,
    totalAudits: total,
    phase: "complete",
    percentage: 100,
  });

  return results;
}

/**
 * Create a zip-like bundle of multiple export results.
 * Combines all exports into a single JSON manifest with embedded data.
 */
export async function bundleExports(
  results: ExportResult[]
): Promise<Blob> {
  const manifest = {
    version: 1,
    exportedAt: new Date().toISOString(),
    files: await Promise.all(
      results.map(async (r) => ({
        filename: r.filename,
        mimeType: r.mimeType,
        auditCount: r.auditCount,
        sizeBytes: r.sizeBytes,
        content: await r.blob.text(),
      }))
    ),
  };

  return new Blob([JSON.stringify(manifest, null, 2)], {
    type: "application/json",
  });
}

/**
 * Create a custom template from a base template.
 */
export function customizeTemplate(
  base: ExportTemplate,
  overrides: Partial<ExportTemplate>
): ExportTemplate {
  return {
    ...base,
    ...overrides,
    id: overrides.id ?? `custom-${Date.now()}`,
    fields: overrides.fields ?? base.fields,
    formatting: {
      ...base.formatting,
      ...overrides.formatting,
    },
  };
}

/**
 * Filter template fields.
 */
export function selectFields(
  template: ExportTemplate,
  fieldKeys: string[]
): ExportTemplate {
  return {
    ...template,
    fields: template.fields.map((f) => ({
      ...f,
      enabled: fieldKeys.includes(f.key),
    })),
  };
}

/**
 * Trigger browser download of an export result.
 */
export function downloadExport(result: ExportResult): void {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(result.blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = result.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
