/* ------------------------------------------------------------------ */
/*  Smart Notification Routing                                        */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type NotificationPriority = "critical" | "high" | "medium" | "low" | "info";

export type NotificationChannel = "in-app" | "email" | "webhook" | "push";

export interface Notification {
  id: string;
  title: string;
  body: string;
  priority: NotificationPriority;
  category: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface UserNotificationPreferences {
  userId: string;
  channels: Record<NotificationChannel, boolean>;
  priorityChannels: Partial<Record<NotificationPriority, NotificationChannel[]>>;
  quietHours: QuietHoursConfig | null;
  batchingEnabled: boolean;
  batchIntervalMinutes: number;
  mutedCategories: string[];
}

export interface QuietHoursConfig {
  enabled: boolean;
  startHour: number; // 0-23
  endHour: number; // 0-23
  timezone: string;
  allowCritical: boolean;
}

export interface DeliveryResult {
  notificationId: string;
  channel: NotificationChannel;
  status: "delivered" | "queued" | "suppressed" | "failed";
  reason?: string;
  deliveredAt?: string;
}

export interface ChannelHandler {
  channel: NotificationChannel;
  send: (notification: Notification, userId: string) => Promise<boolean>;
}

export interface BatchedNotification {
  userId: string;
  notifications: Notification[];
  scheduledAt: string;
}

/* ------------------------------------------------------------------ */
/*  Priority ordering                                                 */
/* ------------------------------------------------------------------ */

const PRIORITY_ORDER: Record<NotificationPriority, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

export function comparePriority(a: NotificationPriority, b: NotificationPriority): number {
  return PRIORITY_ORDER[b] - PRIORITY_ORDER[a];
}

/* ------------------------------------------------------------------ */
/*  Default preferences                                               */
/* ------------------------------------------------------------------ */

export function createDefaultPreferences(userId: string): UserNotificationPreferences {
  return {
    userId,
    channels: {
      "in-app": true,
      email: true,
      webhook: false,
      push: true,
    },
    priorityChannels: {
      critical: ["in-app", "email", "push"],
      high: ["in-app", "push"],
      medium: ["in-app"],
      low: ["in-app"],
      info: ["in-app"],
    },
    quietHours: null,
    batchingEnabled: false,
    batchIntervalMinutes: 15,
    mutedCategories: [],
  };
}

/* ------------------------------------------------------------------ */
/*  Quiet hours logic                                                 */
/* ------------------------------------------------------------------ */

export function isInQuietHours(config: QuietHoursConfig, now?: Date): boolean {
  if (!config.enabled) return false;

  const d = now ?? new Date();
  // Simple hour-based check; timezone handling deferred to Intl
  let currentHour: number;
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: config.timezone,
    });
    currentHour = parseInt(formatter.format(d), 10);
  } catch {
    currentHour = d.getHours();
  }

  if (config.startHour <= config.endHour) {
    return currentHour >= config.startHour && currentHour < config.endHour;
  }
  // Wraps midnight (e.g., 22:00 - 07:00)
  return currentHour >= config.startHour || currentHour < config.endHour;
}

/* ------------------------------------------------------------------ */
/*  Notification Router                                               */
/* ------------------------------------------------------------------ */

export class NotificationRouter {
  private handlers: Map<NotificationChannel, ChannelHandler> = new Map();
  private batchQueues: Map<string, BatchedNotification> = new Map();
  private batchTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  registerHandler(handler: ChannelHandler): void {
    this.handlers.set(handler.channel, handler);
  }

  async route(
    notification: Notification,
    preferences: UserNotificationPreferences,
  ): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];

    // Check if category is muted
    if (preferences.mutedCategories.includes(notification.category)) {
      results.push({
        notificationId: notification.id,
        channel: "in-app",
        status: "suppressed",
        reason: "Category muted by user",
      });
      return results;
    }

    // Determine target channels
    const targetChannels = this.resolveChannels(notification.priority, preferences);

    // Check quiet hours
    const quietHours = preferences.quietHours;
    const inQuietHours = quietHours ? isInQuietHours(quietHours) : false;

    for (const channel of targetChannels) {
      if (inQuietHours) {
        const isCritical = notification.priority === "critical";
        if (!isCritical || !quietHours?.allowCritical) {
          results.push({
            notificationId: notification.id,
            channel,
            status: "suppressed",
            reason: "Quiet hours active",
          });
          continue;
        }
      }

      // Batching
      if (
        preferences.batchingEnabled &&
        notification.priority !== "critical" &&
        notification.priority !== "high"
      ) {
        this.addToBatch(preferences.userId, notification, preferences.batchIntervalMinutes);
        results.push({
          notificationId: notification.id,
          channel,
          status: "queued",
          reason: "Batched for delivery",
        });
        continue;
      }

      // Deliver immediately
      const result = await this.deliver(notification, preferences.userId, channel);
      results.push(result);
    }

    return results;
  }

  private resolveChannels(
    priority: NotificationPriority,
    preferences: UserNotificationPreferences,
  ): NotificationChannel[] {
    const configured = preferences.priorityChannels[priority];
    if (configured && configured.length > 0) {
      return configured.filter((ch) => preferences.channels[ch]);
    }
    // Fallback: all enabled channels for critical/high, in-app only for others
    if (PRIORITY_ORDER[priority] >= PRIORITY_ORDER.high) {
      return (Object.entries(preferences.channels) as [NotificationChannel, boolean][])
        .filter(([, enabled]) => enabled)
        .map(([ch]) => ch);
    }
    return preferences.channels["in-app"] ? ["in-app"] : [];
  }

  private async deliver(
    notification: Notification,
    userId: string,
    channel: NotificationChannel,
  ): Promise<DeliveryResult> {
    const handler = this.handlers.get(channel);
    if (!handler) {
      return {
        notificationId: notification.id,
        channel,
        status: "failed",
        reason: `No handler registered for channel: ${channel}`,
      };
    }

    try {
      const success = await handler.send(notification, userId);
      return {
        notificationId: notification.id,
        channel,
        status: success ? "delivered" : "failed",
        deliveredAt: success ? new Date().toISOString() : undefined,
        reason: success ? undefined : "Handler returned false",
      };
    } catch (error) {
      return {
        notificationId: notification.id,
        channel,
        status: "failed",
        reason: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private addToBatch(
    userId: string,
    notification: Notification,
    intervalMinutes: number,
  ): void {
    const existing = this.batchQueues.get(userId);
    if (existing) {
      existing.notifications.push(notification);
    } else {
      this.batchQueues.set(userId, {
        userId,
        notifications: [notification],
        scheduledAt: new Date(Date.now() + intervalMinutes * 60 * 1000).toISOString(),
      });

      const timer = setTimeout(() => {
        this.flushBatch(userId);
      }, intervalMinutes * 60 * 1000);
      this.batchTimers.set(userId, timer);
    }
  }

  async flushBatch(userId: string): Promise<DeliveryResult[]> {
    const batch = this.batchQueues.get(userId);
    if (!batch || batch.notifications.length === 0) return [];

    this.batchQueues.delete(userId);
    const timer = this.batchTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(userId);
    }

    // Deliver aggregated notification
    const aggregated: Notification = {
      id: `batch-${Date.now()}`,
      title: `${batch.notifications.length} notifications`,
      body: batch.notifications.map((n) => `- ${n.title}`).join("\n"),
      priority: batch.notifications
        .map((n) => n.priority)
        .sort(comparePriority)[0] ?? "info",
      category: "batch",
      createdAt: new Date().toISOString(),
    };

    const results: DeliveryResult[] = [];
    const inAppHandler = this.handlers.get("in-app");
    if (inAppHandler) {
      const result = await this.deliver(aggregated, userId, "in-app");
      results.push(result);
    }

    return results;
  }

  destroy(): void {
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    this.batchTimers.clear();
    this.batchQueues.clear();
  }
}

/* ------------------------------------------------------------------ */
/*  Factory / convenience                                             */
/* ------------------------------------------------------------------ */

export function createNotification(
  title: string,
  body: string,
  priority: NotificationPriority,
  category: string,
  metadata?: Record<string, unknown>,
): Notification {
  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    body,
    priority,
    category,
    metadata,
    createdAt: new Date().toISOString(),
  };
}
