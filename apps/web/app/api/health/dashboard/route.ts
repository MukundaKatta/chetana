import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ServiceStatus {
  name: string;
  status: "healthy" | "degraded" | "down";
  responseTimeMs: number;
  lastChecked: string;
  details?: string;
}

const startTime = Date.now();

export async function GET() {
  try {
    const services: ServiceStatus[] = [];
    const now = new Date().toISOString();

    // Check API health
    const apiStart = performance.now();
    services.push({
      name: "api",
      status: "healthy",
      responseTimeMs: Math.round(performance.now() - apiStart),
      lastChecked: now,
    });

    // Check database health
    const dbStart = performance.now();
    let dbStatus: ServiceStatus["status"] = "down";
    let dbDetails: string | undefined;
    try {
      const supabase = await createClient();
      const { error } = await supabase
        .from("audits")
        .select("id")
        .limit(1);

      if (error) {
        dbStatus = "degraded";
        dbDetails = error.message;
      } else {
        dbStatus = "healthy";
      }
    } catch (err) {
      dbStatus = "down";
      dbDetails = err instanceof Error ? err.message : "Connection failed";
    }
    services.push({
      name: "database",
      status: dbStatus,
      responseTimeMs: Math.round(performance.now() - dbStart),
      lastChecked: now,
      details: dbDetails,
    });

    // Check AI providers
    const providers = ["anthropic", "openai", "google"] as const;
    const providerEnvKeys: Record<string, string> = {
      anthropic: "ANTHROPIC_API_KEY",
      openai: "OPENAI_API_KEY",
      google: "GOOGLE_AI_API_KEY",
    };

    for (const provider of providers) {
      const envKey = providerEnvKeys[provider];
      const hasKey = !!process.env[envKey];
      services.push({
        name: `ai_provider:${provider}`,
        status: hasKey ? "healthy" : "degraded",
        responseTimeMs: 0,
        lastChecked: now,
        details: hasKey ? "API key configured" : "API key not configured",
      });
    }

    // Calculate error rate from recent audit failures
    let errorRate = 0;
    try {
      const supabase = await createClient();
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { data: recentAudits } = await supabase
        .from("audits")
        .select("status")
        .gte("created_at", oneHourAgo);

      if (recentAudits && recentAudits.length > 0) {
        const failed = recentAudits.filter((a) => a.status === "failed").length;
        errorRate = failed / recentAudits.length;
      }
    } catch {
      // Error rate unknown if DB is down
    }

    // Calculate uptime
    const uptimeMs = Date.now() - startTime;
    const uptimeSeconds = Math.floor(uptimeMs / 1000);

    const overallStatus = services.some((s) => s.status === "down")
      ? "down"
      : services.some((s) => s.status === "degraded")
        ? "degraded"
        : "healthy";

    return NextResponse.json({
      status: overallStatus,
      uptimeSeconds,
      errorRate: Math.round(errorRate * 10000) / 10000,
      services,
      checkedAt: now,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
