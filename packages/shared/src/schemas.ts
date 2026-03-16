import { z } from "zod";

export const theorySchema = z.enum(["gwt", "iit", "hot", "rpt", "pp", "ast"]);

export const indicatorIdSchema = z.enum([
  "GWT-1", "GWT-2", "GWT-3", "GWT-4",
  "RPT-1", "RPT-2",
  "HOT-1", "HOT-2", "HOT-3", "HOT-4",
  "PP-1", "PP-2",
  "AST-1",
  "AGENCY-1",
]);

export const modelProviderSchema = z.enum([
  "anthropic", "openai", "google", "ollama",
]);

export const auditStatusSchema = z.enum([
  "pending", "running", "completed", "failed",
]);

export const evidenceTypeSchema = z.enum([
  "behavioral", "structural", "self-report",
]);

export const createAuditSchema = z.object({
  modelName: z.string().min(1),
  modelProvider: modelProviderSchema,
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
});

export const createExperimentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  modelName: z.string().min(1),
  customProbes: z.array(
    z.object({
      prompt: z.string().min(1),
      indicatorId: indicatorIdSchema,
      theory: theorySchema,
      evidenceType: evidenceTypeSchema,
      scoringCriteria: z.string().min(1),
    })
  ).min(1),
});

export const createNoteSchema = z.object({
  auditId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  tags: z.array(z.string()).default([]),
});

export type CreateAuditInput = z.infer<typeof createAuditSchema>;
export type CreateExperimentInput = z.infer<typeof createExperimentSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
