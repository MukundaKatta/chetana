/**
 * Cursor-based pagination (issue #769).
 *
 * Stable, opaque cursors over a sorted key so insertions don't shift pages.
 * Cursors encode the last-seen sort key + id; the page is everything strictly
 * after that key.
 */

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface CursorPayload {
  key: string | number;
  id: string;
}

const MAX_PAGE_SIZE = 100;

export function encodeCursor(payload: CursorPayload): string {
  // Base64 of JSON — opaque to clients.
  const json = JSON.stringify(payload);
  return typeof btoa === "function"
    ? btoa(json)
    : Buffer.from(json, "utf-8").toString("base64");
}

export function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const json =
      typeof atob === "function" ? atob(cursor) : Buffer.from(cursor, "base64").toString("utf-8");
    const parsed = JSON.parse(json);
    if (parsed && (typeof parsed.key === "string" || typeof parsed.key === "number") && typeof parsed.id === "string") {
      return parsed as CursorPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export interface PaginateOptions<T> {
  pageSize?: number;
  after?: string | null;
  /** Stable sort key extractor (string or number). */
  keyOf: (item: T) => string | number;
  idOf: (item: T) => string;
}

/**
 * Paginate an already-sorted array (ascending by key, then id). Stable under
 * inserts because the cursor references a key/id, not an offset.
 */
export function paginate<T>(sortedItems: T[], options: PaginateOptions<T>): Paginated<T> {
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, options.pageSize ?? 20));
  const cursor = options.after ? decodeCursor(options.after) : null;

  let start = 0;
  if (cursor) {
    start = sortedItems.findIndex((item) => {
      const k = options.keyOf(item);
      const id = options.idOf(item);
      return k > cursor.key || (k === cursor.key && id > cursor.id);
    });
    if (start === -1) start = sortedItems.length;
  }

  const items = sortedItems.slice(start, start + pageSize);
  const hasMore = start + pageSize < sortedItems.length;
  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last ? encodeCursor({ key: options.keyOf(last), id: options.idOf(last) }) : null;

  return { items, nextCursor, hasMore };
}
