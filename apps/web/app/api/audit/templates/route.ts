import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const createTemplateSchema = z.object({
  name: z.string().min(1, "name is required").max(200, "name must be at most 200 characters"),
  description: z.string().max(1000).optional(),
  probeIds: z.array(z.string().uuid()).min(1, "At least one probe is required"),
  modelProvider: z.string().min(1).optional(),
  modelName: z.string().min(1).optional(),
  settings: z.record(z.unknown()).optional(),
});

const updateTemplateSchema = createTemplateSchema.partial().extend({
  template_id: z.string().uuid("template_id must be a valid UUID"),
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

    const validation = createTemplateSchema.safeParse(body);
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

    const { data: template, error: insertError } = await supabase
      .from("audit_templates")
      .insert({
        user_id: user.id,
        name: input.name,
        description: input.description ?? null,
        probe_ids: input.probeIds,
        model_provider: input.modelProvider ?? null,
        model_name: input.modelName ?? null,
        settings: input.settings ?? null,
      })
      .select()
      .single();

    if (insertError || !template) {
      return NextResponse.json(
        { error: "Failed to create template" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        probeIds: template.probe_ids,
        modelProvider: template.model_provider,
        modelName: template.model_name,
        settings: template.settings,
        createdAt: template.created_at,
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

    const { data: templates, error } = await supabase
      .from("audit_templates")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch templates" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      templates: (templates || []).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        probeIds: t.probe_ids,
        modelProvider: t.model_provider,
        modelName: t.model_name,
        settings: t.settings,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
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

    const validation = updateTemplateSchema.safeParse(body);
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

    const { template_id, ...updates } = validation.data;

    const updatePayload: Record<string, unknown> = {};
    if (updates.name !== undefined) updatePayload.name = updates.name;
    if (updates.description !== undefined) updatePayload.description = updates.description;
    if (updates.probeIds !== undefined) updatePayload.probe_ids = updates.probeIds;
    if (updates.modelProvider !== undefined) updatePayload.model_provider = updates.modelProvider;
    if (updates.modelName !== undefined) updatePayload.model_name = updates.modelName;
    if (updates.settings !== undefined) updatePayload.settings = updates.settings;
    updatePayload.updated_at = new Date().toISOString();

    const { data: template, error: updateError } = await supabase
      .from("audit_templates")
      .update(updatePayload)
      .eq("id", template_id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError || !template) {
      return NextResponse.json(
        { error: "Failed to update template or template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        probeIds: template.probe_ids,
        modelProvider: template.model_provider,
        modelName: template.model_name,
        settings: template.settings,
        createdAt: template.created_at,
        updatedAt: template.updated_at,
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
    const templateId = searchParams.get("template_id");

    if (!templateId) {
      return NextResponse.json(
        { error: "template_id query parameter is required" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from("audit_templates")
      .delete()
      .eq("id", templateId)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete template" },
        { status: 500 }
      );
    }

    return NextResponse.json({ deleted: true, id: templateId });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
