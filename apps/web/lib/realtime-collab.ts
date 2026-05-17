"use client";

/**
 * Real-time observation helpers for live audit collaboration (Issue #209).
 * Wraps Supabase Realtime channels for presence tracking and live score updates.
 */

import { createClient } from "@/lib/supabase/client";

export interface PresenceUser {
  userId: string;
  displayName: string;
  joinedAt: string;
}

export interface LiveScoreUpdate {
  auditId: string;
  indicatorId: string;
  score: number;
  updatedAt: string;
}

export interface AuditChannelCallbacks {
  /** Called when presence changes (users join/leave). */
  onPresenceChange?: (users: PresenceUser[]) => void;
  /** Called when a score is updated in real-time. */
  onScoreUpdate?: (update: LiveScoreUpdate) => void;
  /** Called on connection errors. */
  onError?: (error: Error) => void;
}

export interface AuditChannel {
  /** Manually broadcast a score update. */
  broadcastScore: (update: Omit<LiveScoreUpdate, "auditId">) => void;
  /** Track current user's presence. */
  trackPresence: (user: PresenceUser) => void;
  /** Get the list of currently present users. */
  getPresence: () => PresenceUser[];
  /** Disconnect from the channel and clean up. */
  disconnect: () => void;
}

/**
 * Connects to a real-time Supabase channel for a specific audit.
 *
 * @param auditId - The audit to observe
 * @param callbacks - Event handlers for presence and score changes
 * @returns Channel control object
 */
export function connectToAuditChannel(
  auditId: string,
  callbacks: AuditChannelCallbacks = {}
): AuditChannel {
  const supabase = createClient();
  const channelName = `audit:${auditId}`;

  let presenceUsers: PresenceUser[] = [];

  const channel = supabase.channel(channelName, {
    config: {
      presence: { key: auditId },
      broadcast: { self: false },
    },
  });

  // Presence tracking
  channel.on("presence", { event: "sync" }, () => {
    const state = channel.presenceState<PresenceUser>();
    presenceUsers = Object.values(state)
      .flat()
      .map((p) => ({
        userId: p.userId,
        displayName: p.displayName,
        joinedAt: p.joinedAt,
      }));
    callbacks.onPresenceChange?.(presenceUsers);
  });

  // Live score update subscription
  channel.on("broadcast", { event: "score_update" }, ({ payload }) => {
    const update = payload as LiveScoreUpdate;
    callbacks.onScoreUpdate?.({
      ...update,
      auditId,
    });
  });

  // Subscribe to the channel
  channel.subscribe((status) => {
    if (status === "CHANNEL_ERROR") {
      callbacks.onError?.(new Error(`Channel error for audit ${auditId}`));
    }
  });

  const broadcastScore = (update: Omit<LiveScoreUpdate, "auditId">) => {
    channel.send({
      type: "broadcast",
      event: "score_update",
      payload: { ...update, auditId },
    });
  };

  const trackPresence = (user: PresenceUser) => {
    channel.track(user);
  };

  const getPresence = () => presenceUsers;

  const disconnect = () => {
    channel.untrack();
    supabase.removeChannel(channel);
  };

  return {
    broadcastScore,
    trackPresence,
    getPresence,
    disconnect,
  };
}

/**
 * Creates a subscription to live score updates for a specific audit
 * via Supabase Postgres Changes (listens to database INSERTs/UPDATEs).
 *
 * @param auditId - The audit to watch
 * @param onUpdate - Called with each score update
 * @returns Cleanup function
 */
export function subscribeToScoreUpdates(
  auditId: string,
  onUpdate: (update: LiveScoreUpdate) => void
): () => void {
  const supabase = createClient();

  const channel = supabase
    .channel(`scores:${auditId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "probe_results",
        filter: `audit_id=eq.${auditId}`,
      },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        onUpdate({
          auditId,
          indicatorId: String(row.indicator_id ?? ""),
          score: Number(row.score ?? 0),
          updatedAt: String(row.created_at ?? new Date().toISOString()),
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
