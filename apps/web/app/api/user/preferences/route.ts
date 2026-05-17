import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const notificationSettingsSchema = z.object({
  auditComplete: z.boolean().default(true),
  weeklyDigest: z.boolean().default(false),
  scoreAlerts: z.boolean().default(true),
  emailNotifications: z.boolean().default(true),
});

const userPreferencesSchema = z.object({
  defaultModel: z.string().optional(),
  preferredProbeSet: z.string().optional(),
  theme: z.enum(["light", "dark", "system"]).default("system"),
  exportFormat: z.enum(["json", "csv"]).default("json"),
  notificationSettings: notificationSettingsSchema.default({}),
});

const DEFAULT_PREFERENCES = {
  defaultModel: null,
  preferredProbeSet: null,
  theme: "system",
  exportFormat: "json",
  notificationSettings: {
    auditComplete: true,
    weeklyDigest: false,
    scoreAlerts: true,
    emailNotifications: true,
  },
};

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("id", user.id)
      .single();

    const preferences = profile?.preferences ?? DEFAULT_PREFERENCES;

    return NextResponse.json({ preferences });
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

    const validation = userPreferencesSchema.safeParse(body);
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

    const preferences = validation.data;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ preferences })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update preferences" },
        { status: 500 }
      );
    }

    return NextResponse.json({ preferences });
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
