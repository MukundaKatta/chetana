import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// In-memory webhook URL store (per-user)
const webhookStore = new Map<string, Set<string>>();

/**
 * POST /api/webhooks/notify
 *
 * Register a webhook URL to receive notifications when audits complete.
 * Body: { url: string }
 *
 * When an audit completes, all registered webhooks for that user receive:
 * { event: "audit.completed", audit_id, model, overall_score, timestamp }
 */
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
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "url is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "url must be a valid URL" },
        { status: 400 }
      );
    }

    // Store webhook URL for this user
    if (!webhookStore.has(user.id)) {
      webhookStore.set(user.id, new Set());
    }
    webhookStore.get(user.id)!.add(url);

    return NextResponse.json({
      success: true,
      message: "Webhook registered",
      registeredUrls: Array.from(webhookStore.get(user.id)!),
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

/**
 * GET /api/webhooks/notify
 *
 * List registered webhook URLs for the authenticated user.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const urls = webhookStore.has(user.id)
      ? Array.from(webhookStore.get(user.id)!)
      : [];

    return NextResponse.json({ webhooks: urls });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/webhooks/notify
 *
 * Unregister a webhook URL.
 * Body: { url: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "url is required and must be a string" },
        { status: 400 }
      );
    }

    const userWebhooks = webhookStore.get(user.id);
    if (userWebhooks) {
      userWebhooks.delete(url);
      if (userWebhooks.size === 0) {
        webhookStore.delete(user.id);
      }
    }

    return NextResponse.json({ success: true, message: "Webhook removed" });
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

/**
 * Notify all registered webhooks for a given user when an audit completes.
 * Called internally from the audit run pipeline.
 */
export async function notifyWebhooks(
  userId: string,
  payload: {
    audit_id: string;
    model: string;
    overall_score: number;
  }
) {
  const userWebhooks = webhookStore.get(userId);
  if (!userWebhooks || userWebhooks.size === 0) return;

  const event = {
    event: "audit.completed" as const,
    audit_id: payload.audit_id,
    model: payload.model,
    overall_score: payload.overall_score,
    timestamp: new Date().toISOString(),
  };

  const notifications = Array.from(userWebhooks).map(async (url) => {
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(10000),
      });
    } catch (error) {
      console.error(`Webhook delivery failed for ${url}:`, error);
    }
  });

  await Promise.allSettled(notifications);
}
