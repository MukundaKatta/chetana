import { NextRequest, NextResponse } from "next/server";
import { modelProviderSchema } from "@chetana/shared";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Simple cron expression validation (min hour dom month dow)
const cronRegex = /^(\*|(\d+|\d+-\d+)(\/\d+)?)(,(\*|(\d+|\d+-\d+)(\/\d+)?))*(\s+(\*|(\d+|\d+-\d+)(\/\d+)?)(,(\*|(\d+|\d+-\d+)(\/\d+)?))*){4}$/;

const createScheduleSchema = z.object({
  cronExpression: z
    .string()
    .min(1, "cronExpression is required")
    .regex(cronRegex, "Invalid cron expression format (expected: min hour dom month dow)"),
  modelName: z.string().min(1, "modelName is required"),
  modelProvider: modelProviderSchema,
  probeSet: z.string().optional(),
  enabled: z.boolean().default(true),
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

    const validation = createScheduleSchema.safeParse(body);
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

    const input = validation.data;

    // Check existing schedule count
    const { data: existingSchedules } = await supabase
      .from("audit_schedules")
      .select("id")
      .eq("user_id", user.id);

    if (existingSchedules && existingSchedules.length >= 10) {
      return NextResponse.json(
        { error: "Maximum of 10 schedules allowed per user" },
        { status: 429 }
      );
    }

    const { data: schedule, error: insertError } = await supabase
      .from("audit_schedules")
      .insert({
        user_id: user.id,
        cron_expression: input.cronExpression,
        model_name: input.modelName,
        model_provider: input.modelProvider,
        probe_set: input.probeSet ?? null,
        enabled: input.enabled,
      })
      .select()
      .single();

    if (insertError || !schedule) {
      return NextResponse.json(
        { error: "Failed to create schedule" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      schedule: {
        id: schedule.id,
        cronExpression: schedule.cron_expression,
        modelName: schedule.model_name,
        modelProvider: schedule.model_provider,
        probeSet: schedule.probe_set,
        enabled: schedule.enabled,
        createdAt: schedule.created_at,
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

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: schedules, error } = await supabase
      .from("audit_schedules")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch schedules" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      schedules: (schedules || []).map((s) => ({
        id: s.id,
        cronExpression: s.cron_expression,
        modelName: s.model_name,
        modelProvider: s.model_provider,
        probeSet: s.probe_set,
        enabled: s.enabled,
        lastRunAt: s.last_run_at,
        nextRunAt: s.next_run_at,
        createdAt: s.created_at,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const scheduleId = searchParams.get("id");

    if (!scheduleId) {
      return NextResponse.json(
        { error: "Schedule id query parameter is required" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from("audit_schedules")
      .delete()
      .eq("id", scheduleId)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete schedule" },
        { status: 500 }
      );
    }

    return NextResponse.json({ deleted: true, id: scheduleId });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
