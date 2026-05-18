import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const webhookEventTypes = z.enum([
  "audit.started",
  "audit.completed",
  "audit.failed",
  "score.threshold",
  "schedule.triggered",
  "batch.completed",
]);

const webhookConfigSchema = z.object({
  events: z
    .array(webhookEventTypes)
    .min(1, "At least one event type is required"),
  modelFilter: z.string().optional(),
  scoreThreshold: z
    .number()
    .min(0)
    .max(1)
    .optional(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: webhooks, error } = await supabase
      .from("webhook_configs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch webhook configs" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      configs: (webhooks || []).map((w) => ({
        id: w.id,
        url: w.url,
        events: w.events,
        modelFilter: w.model_filter,
        scoreThreshold: w.score_threshold,
        enabled: w.enabled,
        createdAt: w.created_at,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const updateSchema = z.object({
      id: z.string().uuid("Webhook config id is required"),
      ...webhookConfigSchema.shape,
    });

    const validation = updateSchema.safeParse(body);
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

    const { id, events, modelFilter, scoreThreshold } = validation.data;

    const { data: updated, error: updateError } = await supabase
      .from("webhook_configs")
      .update({
        events,
        model_filter: modelFilter ?? null,
        score_threshold: scoreThreshold ?? null,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: "Failed to update webhook config" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      config: {
        id: updated.id,
        url: updated.url,
        events: updated.events,
        modelFilter: updated.model_filter,
        scoreThreshold: updated.score_threshold,
        enabled: updated.enabled,
        createdAt: updated.created_at,
      },
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
