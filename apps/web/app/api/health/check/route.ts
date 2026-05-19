import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type ComponentStatus = "healthy" | "degraded" | "down" | "unknown";

interface ComponentHealth {
  name: string;
  status: ComponentStatus;
  responseTimeMs: number;
  details?: string;
  lastChecked: string;
}

interface HealthCheckResponse {
  status: ComponentStatus;
  timestamp: string;
  uptimeMs: number;
  components: ComponentHealth[];
  version: string;
}

/* ------------------------------------------------------------------ */
/*  Server start time (module-level for uptime calculation)           */
/* ------------------------------------------------------------------ */

const serverStartTime = Date.now();

/* ------------------------------------------------------------------ */
/*  Individual checks                                                 */
/* ------------------------------------------------------------------ */

async function checkDatabase(): Promise<ComponentHealth> {
  const now = new Date().toISOString();
  const start = performance.now();

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("audits").select("id").limit(1);
    const elapsed = Math.round(performance.now() - start);

    if (error) {
      return {
        name: "database",
        status: elapsed > 5000 ? "down" : "degraded",
        responseTimeMs: elapsed,
        details: error.message,
        lastChecked: now,
      };
    }

    return {
      name: "database",
      status: elapsed > 2000 ? "degraded" : "healthy",
      responseTimeMs: elapsed,
      lastChecked: now,
    };
  } catch (err) {
    return {
      name: "database",
      status: "down",
      responseTimeMs: Math.round(performance.now() - start),
      details: err instanceof Error ? err.message : "Unknown error",
      lastChecked: now,
    };
  }
}

async function checkProviderReachability(
  providerName: string,
  url: string
): Promise<ComponentHealth> {
  const now = new Date().toISOString();
  const start = performance.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const elapsed = Math.round(performance.now() - start);

    if (response.ok || response.status === 401 || response.status === 403) {
      // 401/403 means the server is reachable but we lack credentials — still healthy
      return {
        name: `provider:${providerName}`,
        status: elapsed > 5000 ? "degraded" : "healthy",
        responseTimeMs: elapsed,
        lastChecked: now,
      };
    }

    return {
      name: `provider:${providerName}`,
      status: "degraded",
      responseTimeMs: elapsed,
      details: `HTTP ${response.status}`,
      lastChecked: now,
    };
  } catch (err) {
    return {
      name: `provider:${providerName}`,
      status: "down",
      responseTimeMs: Math.round(performance.now() - start),
      details: err instanceof Error ? err.message : "Unreachable",
      lastChecked: now,
    };
  }
}

async function checkCache(): Promise<ComponentHealth> {
  const now = new Date().toISOString();
  const start = performance.now();

  try {
    // Simple in-process cache health: check if we can allocate and read
    const testKey = `__health_${Date.now()}`;
    const testVal = { ok: true };
    const cache = new Map<string, unknown>();
    cache.set(testKey, testVal);
    const retrieved = cache.get(testKey);
    const elapsed = Math.round(performance.now() - start);

    return {
      name: "cache",
      status: retrieved ? "healthy" : "degraded",
      responseTimeMs: elapsed,
      lastChecked: now,
    };
  } catch (err) {
    return {
      name: "cache",
      status: "down",
      responseTimeMs: Math.round(performance.now() - start),
      details: err instanceof Error ? err.message : "Cache error",
      lastChecked: now,
    };
  }
}

async function checkAPI(): Promise<ComponentHealth> {
  const now = new Date().toISOString();
  const start = performance.now();

  return {
    name: "api",
    status: "healthy",
    responseTimeMs: Math.round(performance.now() - start),
    lastChecked: now,
  };
}

/* ------------------------------------------------------------------ */
/*  Aggregate status                                                  */
/* ------------------------------------------------------------------ */

function aggregateStatus(components: ComponentHealth[]): ComponentStatus {
  const statuses = components.map((c) => c.status);
  if (statuses.every((s) => s === "healthy")) return "healthy";
  if (statuses.some((s) => s === "down")) return "down";
  if (statuses.some((s) => s === "degraded")) return "degraded";
  return "unknown";
}

/* ------------------------------------------------------------------ */
/*  Route handler                                                     */
/* ------------------------------------------------------------------ */

export async function GET() {
  const components: ComponentHealth[] = [];

  // Run checks in parallel for speed
  const [api, db, cache, anthropic, openai] = await Promise.allSettled([
    checkAPI(),
    checkDatabase(),
    checkCache(),
    checkProviderReachability("anthropic", "https://api.anthropic.com"),
    checkProviderReachability("openai", "https://api.openai.com"),
  ]);

  // Collect results (handle rejected promises gracefully)
  for (const result of [api, db, cache, anthropic, openai]) {
    if (result.status === "fulfilled") {
      components.push(result.value);
    } else {
      components.push({
        name: "unknown",
        status: "down",
        responseTimeMs: 0,
        details: result.reason instanceof Error ? result.reason.message : "Check failed",
        lastChecked: new Date().toISOString(),
      });
    }
  }

  const overallStatus = aggregateStatus(components);

  const response: HealthCheckResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptimeMs: Date.now() - serverStartTime,
    components,
    version: process.env.APP_VERSION ?? "unknown",
  };

  const httpStatus = overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503;

  return NextResponse.json(response, {
    status: httpStatus,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
