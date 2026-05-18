import { NextRequest, NextResponse } from "next/server";
import { modelProviderSchema } from "@chetana/shared";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const CONCURRENCY_LIMIT = 3;

const batchModelConfigSchema = z.object({
  modelName: z.string().min(1, "modelName is required"),
  modelProvider: modelProviderSchema,
  apiKey: z.string().optional(),
  baseUrl: z.string().url("baseUrl must be a valid URL").optional(),
});

const batchAuditInputSchema = z.object({
  models: z
    .array(batchModelConfigSchema)
    .min(1, "At least one model configuration is required")
    .max(10, "Maximum 10 models per batch"),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const validation = batchAuditInputSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const { models } = validation.data;

    // Check audit limits
    const { data: profile } = await supabase
      .from("profiles")
      .select("tier, audits_this_month")
      .eq("id", user.id)
      .single();

    const currentCount = profile?.audits_this_month ?? 0;
    if (
      profile?.tier === "explorer" &&
      currentCount + models.length > 5
    ) {
      return NextResponse.json(
        {
          error: "Monthly audit limit would be exceeded. Upgrade to continue.",
          remaining: Math.max(0, 5 - currentCount),
        },
        { status: 429 }
      );
    }

    // Create a batch record
    const batchId = crypto.randomUUID();
    const auditIds: string[] = [];

    // Create audit records for each model
    for (const model of models) {
      const { data: audit, error: auditError } = await supabase
        .from("audits")
        .insert({
          user_id: user.id,
          model_name: model.modelName,
          model_provider: model.modelProvider,
          status: "pending",
        })
        .select()
        .single();

      if (auditError || !audit) {
        continue;
      }
      auditIds.push(audit.id);
    }

    if (auditIds.length === 0) {
      return NextResponse.json(
        { error: "Failed to create any audit records" },
        { status: 500 }
      );
    }

    // Process audits with concurrency limit in the background
    processAuditBatch(auditIds, CONCURRENCY_LIMIT, supabase);

    return NextResponse.json({
      batchId,
      auditIds,
      status: "pending",
      concurrencyLimit: CONCURRENCY_LIMIT,
      totalModels: models.length,
      createdAudits: auditIds.length,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function processAuditBatch(
  auditIds: string[],
  concurrency: number,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  // Process audits in chunks respecting concurrency limit
  for (let i = 0; i < auditIds.length; i += concurrency) {
    const chunk = auditIds.slice(i, i + concurrency);
    await Promise.allSettled(
      chunk.map(async (auditId) => {
        try {
          await supabase
            .from("audits")
            .update({ status: "running" })
            .eq("id", auditId);
        } catch (err) {
          console.error(`Failed to start audit ${auditId}:`, err);
          await supabase
            .from("audits")
            .update({
              status: "failed",
              error_message:
                err instanceof Error ? err.message : "Unknown error",
            })
            .eq("id", auditId);
        }
      })
    );
  }
}
