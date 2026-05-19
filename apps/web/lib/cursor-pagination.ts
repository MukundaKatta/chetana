/**
 * Cursor-based pagination (Issue #462).
 * Base64 cursor encode/decode, forward/backward, page size limits,
 * total count estimation, GraphQL connection format.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface CursorPayload {
  /** The field used for ordering. */
  field: string;
  /** The value at the cursor position. */
  value: string | number;
  /** Direction the cursor was created for. */
  direction: "forward" | "backward";
  /** Creation timestamp (ms). */
  createdAt: number;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface Edge<T> {
  node: T;
  cursor: string;
}

export interface Connection<T> {
  edges: Edge<T>[];
  pageInfo: PageInfo;
  totalCount: number | null;
}

export interface PaginationArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

export interface CursorPaginationConfig {
  /** Default page size if not specified. */
  defaultPageSize: number;
  /** Maximum allowed page size. */
  maxPageSize: number;
  /** The field name to use for cursor ordering. */
  orderField: string;
  /** Whether to compute total count (can be expensive). */
  enableTotalCount: boolean;
  /** Maximum age of a cursor in ms before it is considered stale. */
  cursorMaxAgeMs?: number;
}

/* ------------------------------------------------------------------ */
/*  Default config                                                    */
/* ------------------------------------------------------------------ */

const DEFAULT_CONFIG: CursorPaginationConfig = {
  defaultPageSize: 20,
  maxPageSize: 100,
  orderField: "id",
  enableTotalCount: true,
  cursorMaxAgeMs: 24 * 60 * 60 * 1000, // 24 hours
};

/* ------------------------------------------------------------------ */
/*  Cursor encoding / decoding                                        */
/* ------------------------------------------------------------------ */

/** Encode a cursor payload to a base64 string. */
export function encodeCursor(payload: CursorPayload): string {
  const json = JSON.stringify(payload);
  if (typeof btoa === "function") {
    return btoa(json);
  }
  // Node.js fallback
  return Buffer.from(json, "utf-8").toString("base64");
}

/** Decode a base64 cursor string to a payload. Returns null if invalid. */
export function decodeCursor(cursor: string): CursorPayload | null {
  try {
    let json: string;
    if (typeof atob === "function") {
      json = atob(cursor);
    } else {
      json = Buffer.from(cursor, "base64").toString("utf-8");
    }
    const parsed = JSON.parse(json);

    if (
      typeof parsed.field !== "string" ||
      (typeof parsed.value !== "string" && typeof parsed.value !== "number") ||
      (parsed.direction !== "forward" && parsed.direction !== "backward") ||
      typeof parsed.createdAt !== "number"
    ) {
      return null;
    }

    return parsed as CursorPayload;
  } catch {
    return null;
  }
}

/** Create a cursor string from a value and config. */
export function createCursor(
  value: string | number,
  field: string,
  direction: "forward" | "backward" = "forward",
): string {
  return encodeCursor({
    field,
    value,
    direction,
    createdAt: Date.now(),
  });
}

/** Validate that a cursor is not stale. */
export function isCursorValid(
  cursor: string,
  maxAgeMs: number = DEFAULT_CONFIG.cursorMaxAgeMs!,
): boolean {
  const payload = decodeCursor(cursor);
  if (!payload) return false;
  return Date.now() - payload.createdAt <= maxAgeMs;
}

/* ------------------------------------------------------------------ */
/*  Page size helpers                                                  */
/* ------------------------------------------------------------------ */

/** Clamp the requested page size within allowed bounds. */
export function clampPageSize(
  requested: number | undefined,
  config: Pick<CursorPaginationConfig, "defaultPageSize" | "maxPageSize"> = DEFAULT_CONFIG,
): number {
  if (requested === undefined || requested <= 0) return config.defaultPageSize;
  return Math.min(requested, config.maxPageSize);
}

/* ------------------------------------------------------------------ */
/*  Total count estimation                                            */
/* ------------------------------------------------------------------ */

export interface CountEstimate {
  count: number;
  isExact: boolean;
  estimatedAt: string;
}

/**
 * Estimate total count. Uses exact count for small tables,
 * and statistical estimation for large ones.
 */
export function estimateTotalCount(
  exactCount: number | null,
  tableStats?: { estimatedRows?: number; lastAnalyzed?: string },
): CountEstimate {
  if (exactCount !== null) {
    return {
      count: exactCount,
      isExact: true,
      estimatedAt: new Date().toISOString(),
    };
  }

  if (tableStats?.estimatedRows !== undefined) {
    return {
      count: tableStats.estimatedRows,
      isExact: false,
      estimatedAt: tableStats.lastAnalyzed ?? new Date().toISOString(),
    };
  }

  return {
    count: -1,
    isExact: false,
    estimatedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/*  Build Connection from items                                       */
/* ------------------------------------------------------------------ */

/**
 * Build a GraphQL-style connection from an array of items.
 * Expects items to already be sorted and fetched with +1 overflow
 * to determine hasNextPage / hasPreviousPage.
 */
export function buildConnection<T extends Record<string, unknown>>(
  items: T[],
  args: PaginationArgs,
  config: CursorPaginationConfig = DEFAULT_CONFIG,
  totalCount: number | null = null,
): Connection<T> {
  const isForward = args.first !== undefined;
  const pageSize = clampPageSize(
    isForward ? args.first : args.last,
    config,
  );

  // We fetch pageSize + 1 to detect extra pages
  const hasExtra = items.length > pageSize;
  const sliced = hasExtra ? items.slice(0, pageSize) : items;

  const edges: Edge<T>[] = sliced.map((node) => ({
    node,
    cursor: createCursor(
      node[config.orderField] as string | number,
      config.orderField,
      isForward ? "forward" : "backward",
    ),
  }));

  const pageInfo: PageInfo = {
    hasNextPage: isForward ? hasExtra : !!args.before,
    hasPreviousPage: isForward ? !!args.after : hasExtra,
    startCursor: edges.length > 0 ? edges[0].cursor : null,
    endCursor:
      edges.length > 0 ? edges[edges.length - 1].cursor : null,
  };

  return {
    edges,
    pageInfo,
    totalCount,
  };
}

/* ------------------------------------------------------------------ */
/*  Parse pagination args (e.g. from URL query params)                */
/* ------------------------------------------------------------------ */

export function parsePaginationArgs(
  params: Record<string, string | undefined>,
): PaginationArgs {
  const args: PaginationArgs = {};

  if (params.first) {
    const n = parseInt(params.first, 10);
    if (!isNaN(n) && n > 0) args.first = n;
  }
  if (params.last) {
    const n = parseInt(params.last, 10);
    if (!isNaN(n) && n > 0) args.last = n;
  }
  if (params.after) args.after = params.after;
  if (params.before) args.before = params.before;

  // Validate: cannot use first+last or after+before simultaneously
  if (args.first !== undefined && args.last !== undefined) {
    throw new Error("Cannot specify both 'first' and 'last'");
  }
  if (args.after && args.before) {
    throw new Error("Cannot specify both 'after' and 'before'");
  }

  return args;
}

/* ------------------------------------------------------------------ */
/*  SQL clause builder                                                */
/* ------------------------------------------------------------------ */

export interface SQLPaginationClause {
  where: string;
  orderBy: string;
  limit: number;
  params: (string | number)[];
}

/**
 * Build SQL clauses for cursor pagination.
 * Returns parameterised fragments suitable for a query builder.
 */
export function buildSQLClauses(
  args: PaginationArgs,
  config: CursorPaginationConfig = DEFAULT_CONFIG,
): SQLPaginationClause {
  const isForward = args.first !== undefined || !args.last;
  const pageSize = clampPageSize(
    isForward ? args.first : args.last,
    config,
  );

  const params: (string | number)[] = [];
  let where = "";

  const cursorStr = isForward ? args.after : args.before;
  if (cursorStr) {
    const payload = decodeCursor(cursorStr);
    if (payload) {
      const op = isForward ? ">" : "<";
      where = `${config.orderField} ${op} $1`;
      params.push(payload.value);
    }
  }

  const direction = isForward ? "ASC" : "DESC";
  const orderBy = `${config.orderField} ${direction}`;

  return {
    where,
    orderBy,
    limit: pageSize + 1, // +1 for hasNext/hasPrevious detection
    params,
  };
}
