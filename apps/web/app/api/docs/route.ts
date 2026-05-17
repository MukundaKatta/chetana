import { NextResponse } from "next/server";

/**
 * GET /api/docs
 *
 * Returns OpenAPI 3.0 specification for the Chetana API.
 */
export async function GET() {
  const spec = {
    openapi: "3.0.3",
    info: {
      title: "Chetana API",
      description:
        "AI Consciousness Research Platform API. Run consciousness audits on AI models using the Butlin et al. (2025) framework.",
      version: "1.0.0",
      contact: {
        name: "Chetana",
      },
    },
    servers: [
      {
        url: "/api",
        description: "Current server",
      },
    ],
    paths: {
      "/audit/run": {
        post: {
          summary: "Run a new audit",
          description:
            "Start a consciousness audit on a specified model. Requires authentication. The audit runs asynchronously and results can be polled via GET /audit/{id}.",
          tags: ["Audits"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["modelName", "modelProvider"],
                  properties: {
                    modelName: {
                      type: "string",
                      description: "Model identifier (e.g., 'claude-sonnet-4-20250514')",
                      example: "claude-sonnet-4-20250514",
                    },
                    modelProvider: {
                      type: "string",
                      enum: ["anthropic", "openai", "google", "ollama"],
                      description: "Model provider",
                    },
                    apiKey: {
                      type: "string",
                      description: "Optional API key for the model provider",
                    },
                    baseUrl: {
                      type: "string",
                      format: "uri",
                      description: "Optional base URL for custom endpoints",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Audit started successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      auditId: {
                        type: "string",
                        format: "uuid",
                        description: "Unique audit identifier",
                      },
                      status: {
                        type: "string",
                        enum: ["running"],
                      },
                    },
                  },
                },
              },
            },
            "400": {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ValidationError" },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "429": {
              description: "Monthly audit limit reached",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
      "/audit/{id}": {
        get: {
          summary: "Get audit details",
          description:
            "Retrieve a specific audit by ID, including all probe results. Only accessible by the audit owner.",
          tags: ["Audits"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
              description: "Audit ID",
            },
          ],
          responses: {
            "200": {
              description: "Audit details with probe results",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      audit: { $ref: "#/components/schemas/Audit" },
                      probeResults: {
                        type: "array",
                        items: { $ref: "#/components/schemas/ProbeResult" },
                      },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "404": {
              description: "Audit not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
      "/audits": {
        get: {
          summary: "List user audits",
          description:
            "Retrieve all audits for the authenticated user, ordered by creation date (newest first).",
          tags: ["Audits"],
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "List of audits",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      audits: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string", format: "uuid" },
                            model_name: { type: "string" },
                            model_provider: { type: "string" },
                            status: {
                              type: "string",
                              enum: ["pending", "running", "completed", "failed"],
                            },
                            overall_score: {
                              type: "number",
                              nullable: true,
                              minimum: 0,
                              maximum: 1,
                            },
                            theory_scores: {
                              type: "object",
                              nullable: true,
                            },
                            started_at: { type: "string", format: "date-time" },
                            completed_at: {
                              type: "string",
                              format: "date-time",
                              nullable: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
      "/leaderboard": {
        get: {
          summary: "Get model leaderboard",
          description:
            "Public endpoint returning aggregated consciousness scores across all models. Supports pagination, sorting, and filtering.",
          tags: ["Leaderboard"],
          parameters: [
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1, minimum: 1 },
              description: "Page number",
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 20, minimum: 1, maximum: 100 },
              description: "Results per page",
            },
            {
              name: "sort_by",
              in: "query",
              schema: {
                type: "string",
                enum: ["overall_score", "gwt", "iit", "hot", "rpt", "pp", "ast"],
                default: "overall_score",
              },
              description: "Field to sort by",
            },
            {
              name: "sort_order",
              in: "query",
              schema: { type: "string", enum: ["asc", "desc"], default: "desc" },
              description: "Sort direction",
            },
            {
              name: "model_provider",
              in: "query",
              schema: {
                type: "string",
                enum: ["anthropic", "openai", "google", "ollama"],
              },
              description: "Filter by model provider",
            },
            {
              name: "date_from",
              in: "query",
              schema: { type: "string", format: "date-time" },
              description: "Filter audits completed after this date",
            },
            {
              name: "date_to",
              in: "query",
              schema: { type: "string", format: "date-time" },
              description: "Filter audits completed before this date",
            },
          ],
          responses: {
            "200": {
              description: "Leaderboard data with pagination",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      leaderboard: {
                        type: "array",
                        items: { $ref: "#/components/schemas/LeaderboardEntry" },
                      },
                      pagination: {
                        $ref: "#/components/schemas/Pagination",
                      },
                    },
                  },
                },
              },
            },
            "500": {
              description: "Server error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
      "/audit/{id}/export": {
        get: {
          summary: "Export audit results",
          description:
            "Export audit results in JSON or CSV format. Includes full probe results, statistics, and metadata.",
          tags: ["Audits"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
              description: "Audit ID",
            },
            {
              name: "format",
              in: "query",
              schema: { type: "string", enum: ["json", "csv"], default: "json" },
              description: "Export format",
            },
          ],
          responses: {
            "200": {
              description: "Exported audit data",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      metadata: {
                        type: "object",
                        properties: {
                          platform: { type: "string" },
                          version: { type: "string" },
                          framework: { type: "string" },
                          exportedAt: { type: "string", format: "date-time" },
                        },
                      },
                      audit: { $ref: "#/components/schemas/Audit" },
                      probeResults: {
                        type: "array",
                        items: { $ref: "#/components/schemas/ProbeResult" },
                      },
                      statistics: { type: "object", nullable: true },
                    },
                  },
                },
                "text/csv": {
                  schema: { type: "string" },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "404": {
              description: "Audit not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description:
            "Supabase JWT token obtained via authentication",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: { type: "string", description: "Error message" },
          },
          required: ["error"],
        },
        ValidationError: {
          type: "object",
          properties: {
            error: { type: "string" },
            details: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        Audit: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            user_id: { type: "string", format: "uuid" },
            model_name: { type: "string" },
            model_provider: {
              type: "string",
              enum: ["anthropic", "openai", "google", "ollama"],
            },
            status: {
              type: "string",
              enum: ["pending", "running", "completed", "failed"],
            },
            overall_score: {
              type: "number",
              nullable: true,
              minimum: 0,
              maximum: 1,
              description: "Overall consciousness probability score (0-1)",
            },
            theory_scores: {
              type: "object",
              nullable: true,
              description:
                "Scores per theory: gwt, iit, hot, rpt, pp, ast",
              properties: {
                gwt: { type: "number" },
                iit: { type: "number" },
                hot: { type: "number" },
                rpt: { type: "number" },
                pp: { type: "number" },
                ast: { type: "number" },
              },
            },
            indicator_scores: {
              type: "object",
              nullable: true,
              description: "Scores per indicator",
            },
            tokens_used: { type: "integer", nullable: true },
            error_message: { type: "string", nullable: true },
            started_at: { type: "string", format: "date-time" },
            completed_at: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            created_at: { type: "string", format: "date-time" },
          },
        },
        ProbeResult: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            audit_id: { type: "string", format: "uuid" },
            probe_name: { type: "string" },
            indicator_id: { type: "string" },
            theory: {
              type: "string",
              enum: ["gwt", "iit", "hot", "rpt", "pp", "ast"],
            },
            prompt: { type: "string" },
            response: { type: "string" },
            score: {
              type: "number",
              minimum: 0,
              maximum: 1,
            },
            evidence_type: {
              type: "string",
              enum: ["behavioral", "structural", "self-report"],
            },
            analysis: { type: "string" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        LeaderboardEntry: {
          type: "object",
          properties: {
            modelName: { type: "string" },
            modelProvider: { type: "string" },
            auditCount: { type: "integer" },
            avgScore: {
              type: "number",
              description: "Average overall score across all audits",
            },
            lastAuditAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            theoryAvgs: {
              type: "object",
              description: "Average score per consciousness theory",
              properties: {
                gwt: { type: "number" },
                iit: { type: "number" },
                hot: { type: "number" },
                rpt: { type: "number" },
                pp: { type: "number" },
                ast: { type: "number" },
              },
            },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            page: { type: "integer" },
            limit: { type: "integer" },
            totalCount: { type: "integer" },
            totalPages: { type: "integer" },
            hasNext: { type: "boolean" },
            hasPrev: { type: "boolean" },
          },
        },
      },
    },
  };

  return NextResponse.json(spec);
}
