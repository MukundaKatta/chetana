/**
 * Request deduplication — coalesces identical concurrent GET requests
 * so only one network call is made and the response is shared.
 */

interface PendingRequest<T = unknown> {
  promise: Promise<T>;
  refCount: number;
}

const pending = new Map<string, PendingRequest>();

/**
 * Create a fingerprint for a request. Only GET-like (safe) methods are
 * eligible for dedup; mutation methods return null to skip dedup.
 */
export function fingerprintRequest(
  url: string,
  init?: RequestInit
): string | null {
  const method = (init?.method ?? "GET").toUpperCase();

  // Never deduplicate mutations
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    return null;
  }

  // Include relevant headers that can change the response
  const accept = getHeader(init?.headers, "accept") ?? "*/*";
  const auth = getHeader(init?.headers, "authorization") ?? "";

  return `${method}:${url}:${accept}:${auth}`;
}

/**
 * Perform a fetch with automatic deduplication of identical concurrent
 * GET requests. Mutation requests (POST, PUT, PATCH, DELETE) are never
 * deduplicated and always go straight to fetch().
 */
export async function dedupFetch<T = unknown>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const fp = fingerprintRequest(url, init);

  // No fingerprint means this is a mutation — skip dedup
  if (fp === null) {
    const res = await fetch(url, init);
    return res.json() as Promise<T>;
  }

  // If an identical request is already in flight, piggyback on it
  const inflight = pending.get(fp);
  if (inflight) {
    inflight.refCount++;
    return inflight.promise as Promise<T>;
  }

  // Otherwise, start a new request
  const promise = executeFetch<T>(url, init, fp);
  pending.set(fp, { promise: promise as Promise<unknown>, refCount: 1 });

  return promise;
}

// --- Internals ---

async function executeFetch<T>(
  url: string,
  init: RequestInit | undefined,
  fingerprint: string
): Promise<T> {
  try {
    const response = await fetch(url, init);
    if (!response.ok) {
      throw new Error(
        `Request failed: ${response.status} ${response.statusText}`
      );
    }
    return (await response.json()) as T;
  } finally {
    pending.delete(fingerprint);
  }
}

/**
 * Return the number of currently in-flight deduplicated requests.
 * Useful for tests and debugging.
 */
export function pendingCount(): number {
  return pending.size;
}

/**
 * Clear all pending dedup entries (e.g. for test teardown).
 */
export function clearPending(): void {
  pending.clear();
}

// --- Helpers ---

function getHeader(
  headers: HeadersInit | undefined,
  name: string
): string | undefined {
  if (!headers) return undefined;

  if (headers instanceof Headers) {
    return headers.get(name) ?? undefined;
  }

  if (Array.isArray(headers)) {
    const pair = headers.find(
      ([key]) => key.toLowerCase() === name.toLowerCase()
    );
    return pair ? pair[1] : undefined;
  }

  // Plain object
  const key = Object.keys(headers).find(
    (k) => k.toLowerCase() === name.toLowerCase()
  );
  return key ? (headers as Record<string, string>)[key] : undefined;
}
