import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const DEFAULT_RETENTION_DAYS: Record<string, number> = {
  audits: 365,
  probe_results: 365,
  audit_schedules: 180,
  sessions: 90,
};

const updateRetentionSchema = z.object({
  audits: z.number().int().min(30).max(3650).optional(),
  probe_results: z.number().int().min(30).max(3650).optional(),
  audit_schedules: z.number().int().min(30).max(3650).optional(),
  sessions: z.number().int().min(7).max(3650).optional(),
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

    // Fetch user-specific retention settings or defaults
    const { data: profile } = await supabase
      .from("profiles")
      .select("retention_policies")
      .eq("id", user.id)
      .single();

    const policies = profile?.retention_policies ?? DEFAULT_RETENTION_DAYS;

    return NextResponse.json({
      policies,
      defaults: DEFAULT_RETENTION_DAYS,
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

    const validation = updateRetentionSchema.safeParse(body);
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

    const newPolicies = validation.data;

    // Merge with defaults
    const { data: profile } = await supabase
      .from("profiles")
      .select("retention_policies")
      .eq("id", user.id)
      .single();

    const currentPolicies =
      (profile?.retention_policies as Record<string, number> | null) ??
      DEFAULT_RETENTION_DAYS;
    const mergedPolicies = { ...currentPolicies, ...newPolicies };

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ retention_policies: mergedPolicies })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update retention policies" },
        { status: 500 }
      );
    }

    return NextResponse.json({ policies: mergedPolicies });
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

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch retention policies
    const { data: profile } = await supabase
      .from("profiles")
      .select("retention_policies")
      .eq("id", user.id)
      .single();

    const policies =
      (profile?.retention_policies as Record<string, number> | null) ??
      DEFAULT_RETENTION_DAYS;

    const report: Record<string, { deletedCount: number; cutoffDate: string }> = {};

    // Cleanup expired audits
    const auditCutoff = new Date(
      Date.now() - (policies.audits ?? 365) * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: expiredAudits } = await supabase
      .from("audits")
      .select("id")
      .eq("user_id", user.id)
      .lt("created_at", auditCutoff);

    if (expiredAudits && expiredAudits.length > 0) {
      const expiredIds = expiredAudits.map((a) => a.id);

      // Delete associated probe results first
      await supabase
        .from("probe_results")
        .delete()
        .in("audit_id", expiredIds);

      await supabase
        .from("audits")
        .delete()
        .in("id", expiredIds);
    }

    report.audits = {
      deletedCount: expiredAudits?.length ?? 0,
      cutoffDate: auditCutoff,
    };

    // Cleanup expired schedules
    const scheduleCutoff = new Date(
      Date.now() -
        (policies.audit_schedules ?? 180) * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: expiredSchedules } = await supabase
      .from("audit_schedules")
      .select("id")
      .eq("user_id", user.id)
      .eq("enabled", false)
      .lt("created_at", scheduleCutoff);

    if (expiredSchedules && expiredSchedules.length > 0) {
      await supabase
        .from("audit_schedules")
        .delete()
        .in(
          "id",
          expiredSchedules.map((s) => s.id)
        );
    }

    report.audit_schedules = {
      deletedCount: expiredSchedules?.length ?? 0,
      cutoffDate: scheduleCutoff,
    };

    return NextResponse.json({
      message: "Cleanup completed",
      report,
      policiesUsed: policies,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
