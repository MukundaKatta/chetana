import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const usageQuerySchema = z.object({
  startDate: z.string().datetime("startDate must be a valid ISO datetime"),
  endDate: z.string().datetime("endDate must be a valid ISO datetime"),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const validation = usageQuerySchema.safeParse({
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
    });

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

    const { startDate, endDate } = validation.data;

    // Fetch API request logs within the date range
    const { data: requestLogs, error: logsError } = await supabase
      .from("api_request_logs")
      .select("endpoint, model, response_time_ms, created_at")
      .eq("user_id", user.id)
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: true });

    if (logsError) {
      return NextResponse.json(
        { error: "Failed to fetch usage data" },
        { status: 500 }
      );
    }

    const logs = requestLogs || [];

    // Requests per endpoint
    const endpointCounts: Record<string, number> = {};
    for (const log of logs) {
      const ep = log.endpoint ?? "unknown";
      endpointCounts[ep] = (endpointCounts[ep] ?? 0) + 1;
    }

    // Most-used models
    const modelCounts: Record<string, number> = {};
    for (const log of logs) {
      if (log.model) {
        modelCounts[log.model] = (modelCounts[log.model] ?? 0) + 1;
      }
    }
    const mostUsedModels = Object.entries(modelCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([model, count]) => ({ model, count }));

    // Average response times per endpoint
    const responseTimes: Record<string, number[]> = {};
    for (const log of logs) {
      const ep = log.endpoint ?? "unknown";
      if (log.response_time_ms != null) {
        if (!responseTimes[ep]) responseTimes[ep] = [];
        responseTimes[ep].push(log.response_time_ms);
      }
    }
    const avgResponseTimes: Record<string, number> = {};
    for (const [ep, times] of Object.entries(responseTimes)) {
      const sum = times.reduce((a, b) => a + b, 0);
      avgResponseTimes[ep] = Math.round(sum / times.length);
    }

    // Time-series data: group by day
    const timeSeries: Record<string, { requests: number; avgResponseMs: number }> = {};
    for (const log of logs) {
      const day = log.created_at?.slice(0, 10) ?? "unknown";
      if (!timeSeries[day]) {
        timeSeries[day] = { requests: 0, avgResponseMs: 0 };
      }
      timeSeries[day].requests += 1;
    }

    // Compute avg response time per day
    const dayResponseTimes: Record<string, number[]> = {};
    for (const log of logs) {
      const day = log.created_at?.slice(0, 10) ?? "unknown";
      if (log.response_time_ms != null) {
        if (!dayResponseTimes[day]) dayResponseTimes[day] = [];
        dayResponseTimes[day].push(log.response_time_ms);
      }
    }
    for (const [day, times] of Object.entries(dayResponseTimes)) {
      const sum = times.reduce((a, b) => a + b, 0);
      if (timeSeries[day]) {
        timeSeries[day].avgResponseMs = Math.round(sum / times.length);
      }
    }

    const timeSeriesArray = Object.entries(timeSeries)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));

    return NextResponse.json({
      period: { startDate, endDate },
      totalRequests: logs.length,
      requestsPerEndpoint: endpointCounts,
      mostUsedModels,
      avgResponseTimes,
      timeSeries: timeSeriesArray,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
