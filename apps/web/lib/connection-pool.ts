/**
 * Supabase server-side client singleton with lazy initialisation and
 * health checking.  Avoids creating multiple clients per request in
 * long-running server processes (edge / serverless re-use scenarios).
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let pooledClient: SupabaseClient | null = null;

/**
 * Return the singleton Supabase client for server-side use.
 * The client is lazily created on first call and reused thereafter.
 *
 * NOTE: This uses the service-role key so it should ONLY be used in
 * server contexts (API routes, server actions) — never expose to the
 * browser.  For per-request auth-aware clients, continue using the
 * helpers in `lib/supabase/server.ts`.
 */
export function getPooledClient(): SupabaseClient {
  if (pooledClient) return pooledClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)"
    );
  }

  pooledClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return pooledClient;
}

/**
 * Lightweight health check — executes a trivial query to verify the
 * connection is alive.  Returns true on success, false on failure.
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const client = getPooledClient();
    // Use a no-op RPC or simple query. Selecting from a nonexistent table
    // returns an error, but `.from()` itself succeeding proves connectivity.
    const { error } = await client.from("_health").select("1").limit(0);
    // A "relation does not exist" error still means the connection is live.
    if (error && !error.message.includes("does not exist")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Reset the singleton (for tests or forced reconnection).
 */
export function resetPooledClient(): void {
  pooledClient = null;
}
