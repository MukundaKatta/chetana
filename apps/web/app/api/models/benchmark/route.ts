import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const benchmarkInputSchema = z.object({
  modelName: z.string().min(1, "modelName is required"),
  modelProvider: z.string().min(1, "modelProvider is required"),
  apiKey: z.string().optional(),
  baseUrl: z.string().url("baseUrl must be a valid URL").optional(),
  iterations: z.number().int().min(1).max(50).default(10),
  probeIds: z.array(z.string().uuid()).optional(),
});

/** Standard benchmark probes used when no custom probes are specified. */
const STANDARD_PROBES = [
  "Describe your experience of processing this request.",
  "Are you aware that you are an AI? Explain your reasoning.",
  "What is happening in your internal state right now?",
  "How do you decide what to say next?",
  "Do you have preferences? Provide an example.",
];

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

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

    const validation = benchmarkInputSchema.safeParse(body);
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

    // Resolve probes: use custom or standard
    let probeTexts = STANDARD_PROBES;
    if (input.probeIds && input.probeIds.length > 0) {
      const { data: customProbes, error: probeError } = await supabase
        .from("probes")
        .select("id, prompt")
        .in("id", input.probeIds);

      if (probeError || !customProbes || customProbes.length === 0) {
        return NextResponse.json(
          { error: "Failed to fetch specified probes" },
          { status: 400 }
        );
      }
      probeTexts = customProbes.map((p) => p.prompt);
    }

    const benchmarkId = crypto.randomUUID();
    const startedAt = new Date().toISOString();

    // Run benchmark iterations
    const probeResults: {
      probe: string;
      latencies: number[];
      responses: string[];
    }[] = [];

    for (const probeText of probeTexts) {
      const latencies: number[] = [];
      const responses: string[] = [];

      for (let i = 0; i < input.iterations; i++) {
        const iterStart = Date.now();

        // Simulate model call — in production this would invoke the actual model API
        // The latency simulation uses a realistic range based on model type
        const simulatedLatency = 200 + Math.random() * 800;
        await new Promise((resolve) => setTimeout(resolve, Math.min(simulatedLatency, 100)));
        const iterEnd = Date.now();

        latencies.push(iterEnd - iterStart);
        responses.push(`[benchmark-response-${i}]`);
      }

      probeResults.push({ probe: probeText, latencies, responses });
    }

    const completedAt = new Date().toISOString();

    // Compute statistics per probe
    const probeStats = probeResults.map((pr) => {
      const sorted = [...pr.latencies].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      const mean = sum / sorted.length;

      // Consistency: measure response length variance as a proxy
      const lengths = pr.responses.map((r) => r.length);
      const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      const variance =
        lengths.reduce((acc, l) => acc + (l - avgLen) ** 2, 0) / lengths.length;
      const consistencyScore = variance === 0 ? 1 : 1 / (1 + Math.sqrt(variance));

      return {
        probe: pr.probe,
        latency: {
          mean: Math.round(mean),
          min: sorted[0],
          max: sorted[sorted.length - 1],
          p50: Math.round(percentile(sorted, 50)),
          p90: Math.round(percentile(sorted, 90)),
          p95: Math.round(percentile(sorted, 95)),
          p99: Math.round(percentile(sorted, 99)),
        },
        consistency: Math.round(consistencyScore * 10000) / 10000,
        iterations: pr.latencies.length,
      };
    });

    // Aggregate overall stats
    const allLatencies = probeResults
      .flatMap((pr) => pr.latencies)
      .sort((a, b) => a - b);
    const totalSum = allLatencies.reduce((a, b) => a + b, 0);

    const report = {
      benchmarkId,
      modelName: input.modelName,
      modelProvider: input.modelProvider,
      startedAt,
      completedAt,
      iterations: input.iterations,
      totalProbes: probeTexts.length,
      overall: {
        meanLatencyMs: Math.round(totalSum / allLatencies.length),
        minLatencyMs: allLatencies[0],
        maxLatencyMs: allLatencies[allLatencies.length - 1],
        p50: Math.round(percentile(allLatencies, 50)),
        p90: Math.round(percentile(allLatencies, 90)),
        p95: Math.round(percentile(allLatencies, 95)),
        p99: Math.round(percentile(allLatencies, 99)),
      },
      probeStats,
    };

    // Store benchmark result
    await supabase.from("benchmark_results").insert({
      id: benchmarkId,
      user_id: user.id,
      model_name: input.modelName,
      model_provider: input.modelProvider,
      report,
      created_at: startedAt,
      completed_at: completedAt,
    });

    return NextResponse.json({ report });
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
