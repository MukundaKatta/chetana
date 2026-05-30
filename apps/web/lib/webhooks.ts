/**
 * Webhook registry + delivery (issue #634 / #72-style webhook notifications).
 *
 * Lives in `lib/` rather than the route file because Next.js route modules may
 * only export HTTP method handlers and route config — not arbitrary helpers.
 */

// In-memory webhook URL store (per-user).
export const webhookStore = new Map<string, Set<string>>();

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
