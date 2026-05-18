import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const exportFormatEnum = z.enum(["json", "csv", "xlsx", "pdf"]);

const exportConfigSchema = z.object({
  format: exportFormatEnum.default("json"),
  columns: z
    .array(z.string().min(1))
    .min(1, "At least one column is required")
    .optional(),
  template: z.string().max(500, "template name must be at most 500 characters").optional(),
  includeMetadata: z.boolean().default(true),
  includeTimestamps: z.boolean().default(true),
  delimiter: z.string().max(5).optional(),
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

    const { data: config, error } = await supabase
      .from("export_configs")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json(
        { error: "Failed to fetch export config" },
        { status: 500 }
      );
    }

    // Return defaults if no config exists yet
    if (!config) {
      return NextResponse.json({
        config: {
          format: "json",
          columns: null,
          template: null,
          includeMetadata: true,
          includeTimestamps: true,
          delimiter: null,
        },
      });
    }

    return NextResponse.json({
      config: {
        format: config.format,
        columns: config.columns,
        template: config.template,
        includeMetadata: config.include_metadata,
        includeTimestamps: config.include_timestamps,
        delimiter: config.delimiter,
        updatedAt: config.updated_at,
      },
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

    const validation = exportConfigSchema.safeParse(body);
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

    const { data: config, error: upsertError } = await supabase
      .from("export_configs")
      .upsert(
        {
          user_id: user.id,
          format: input.format,
          columns: input.columns ?? null,
          template: input.template ?? null,
          include_metadata: input.includeMetadata,
          include_timestamps: input.includeTimestamps,
          delimiter: input.delimiter ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (upsertError || !config) {
      return NextResponse.json(
        { error: "Failed to update export config" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      config: {
        format: config.format,
        columns: config.columns,
        template: config.template,
        includeMetadata: config.include_metadata,
        includeTimestamps: config.include_timestamps,
        delimiter: config.delimiter,
        updatedAt: config.updated_at,
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
