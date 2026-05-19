/**
 * Query optimizer (Issue #529).
 *
 * Query plan analysis, index suggestion, query caching,
 * slow query detection, and performance metrics.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface QueryPlan {
  id: string;
  query: string;
  table: string;
  operation: "select" | "insert" | "update" | "delete" | "aggregate";
  estimatedRows: number;
  estimatedCost: number;
  usesIndex: boolean;
  indexName?: string;
  scanType: "seq_scan" | "index_scan" | "index_only_scan" | "bitmap_scan";
  filters: QueryFilter[];
  joins: QueryJoin[];
  sorts: QuerySort[];
  suggestions: OptimizationSuggestion[];
}

export interface QueryFilter {
  column: string;
  operator: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "in" | "like" | "between";
  selectivity: number; // 0-1, lower is more selective
}

export interface QueryJoin {
  table: string;
  type: "inner" | "left" | "right" | "full";
  column: string;
  foreignColumn: string;
  estimatedRows: number;
}

export interface QuerySort {
  column: string;
  direction: "asc" | "desc";
  usesIndex: boolean;
}

export interface OptimizationSuggestion {
  type: "add_index" | "use_index" | "limit_rows" | "avoid_select_star" | "use_where" | "optimize_join" | "add_pagination";
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  estimatedImprovement: number; // percentage
}

export interface IndexSuggestion {
  table: string;
  columns: string[];
  type: "btree" | "hash" | "gin" | "gist";
  reason: string;
  estimatedBenefit: number;
  createStatement: string;
}

export interface SlowQuery {
  query: string;
  executionTimeMs: number;
  timestamp: string;
  plan?: QueryPlan;
  frequency: number;
}

export interface QueryMetrics {
  totalQueries: number;
  averageTimeMs: number;
  p50TimeMs: number;
  p95TimeMs: number;
  p99TimeMs: number;
  slowQueryCount: number;
  cacheHitRate: number;
  indexUsageRate: number;
  queriesPerSecond: number;
  topSlowQueries: SlowQuery[];
}

export interface CachedQuery<T = unknown> {
  key: string;
  result: T;
  executionTimeMs: number;
  cachedAt: number;
  expiresAt: number;
  hitCount: number;
}

export interface TableSchema {
  name: string;
  columns: ColumnDef[];
  indexes: IndexDef[];
  rowCount: number;
}

export interface ColumnDef {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  foreignKey?: { table: string; column: string };
}

export interface IndexDef {
  name: string;
  columns: string[];
  unique: boolean;
  type: "btree" | "hash" | "gin" | "gist";
}

/* ------------------------------------------------------------------ */
/*  In-memory stores                                                  */
/* ------------------------------------------------------------------ */

const queryCache = new Map<string, CachedQuery>();
const queryLog: Array<{ query: string; timeMs: number; timestamp: string; usedCache: boolean }> = [];
const slowQueries = new Map<string, SlowQuery>();
const schemas = new Map<string, TableSchema>();

/** Slow query threshold in ms. */
let slowThresholdMs = 500;

/* ------------------------------------------------------------------ */
/*  Configuration                                                     */
/* ------------------------------------------------------------------ */

export function setSlowQueryThreshold(ms: number): void {
  slowThresholdMs = ms;
}

export function registerSchema(schema: TableSchema): void {
  schemas.set(schema.name, schema);
}

/* ------------------------------------------------------------------ */
/*  Query plan analysis                                               */
/* ------------------------------------------------------------------ */

/**
 * Analyze a query string and produce a query plan with suggestions.
 * This is a simplified heuristic analyzer (not a real SQL parser).
 */
export function analyzeQuery(
  query: string,
  table: string,
): QueryPlan {
  const normalized = query.trim().toLowerCase();
  const schema = schemas.get(table);

  // Determine operation
  let operation: QueryPlan["operation"] = "select";
  if (normalized.startsWith("insert")) operation = "insert";
  else if (normalized.startsWith("update")) operation = "update";
  else if (normalized.startsWith("delete")) operation = "delete";
  else if (normalized.includes("count(") || normalized.includes("sum(") || normalized.includes("avg(")) {
    operation = "aggregate";
  }

  // Extract filters (simplified)
  const filters: QueryFilter[] = [];
  const whereMatch = normalized.match(/where\s+(.+?)(?:order|group|limit|$)/);
  if (whereMatch) {
    const conditions = whereMatch[1].split(/\s+and\s+/);
    for (const cond of conditions) {
      const eqMatch = cond.match(/(\w+)\s*(=|!=|>|<|>=|<=|like|in|between)\s*/);
      if (eqMatch) {
        const opMap: Record<string, QueryFilter["operator"]> = {
          "=": "eq", "!=": "neq", ">": "gt", "<": "lt",
          ">=": "gte", "<=": "lte", like: "like", in: "in", between: "between",
        };
        filters.push({
          column: eqMatch[1],
          operator: opMap[eqMatch[2]] ?? "eq",
          selectivity: eqMatch[2] === "=" ? 0.01 : 0.3,
        });
      }
    }
  }

  // Extract joins
  const joins: QueryJoin[] = [];
  const joinRegex = /(inner|left|right|full)?\s*join\s+(\w+)\s+on\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/gi;
  let joinMatch: RegExpExecArray | null;
  while ((joinMatch = joinRegex.exec(normalized)) !== null) {
    joins.push({
      table: joinMatch[2],
      type: (joinMatch[1] ?? "inner") as QueryJoin["type"],
      column: joinMatch[4],
      foreignColumn: joinMatch[6],
      estimatedRows: 100,
    });
  }

  // Extract sorts
  const sorts: QuerySort[] = [];
  const orderMatch = normalized.match(/order\s+by\s+(.+?)(?:limit|$)/);
  if (orderMatch) {
    const sortCols = orderMatch[1].split(",");
    for (const s of sortCols) {
      const parts = s.trim().split(/\s+/);
      const col = parts[0];
      const dir = parts[1] === "desc" ? "desc" : "asc";
      const indexCoversSort = schema?.indexes.some((idx) => idx.columns.includes(col)) ?? false;
      sorts.push({ column: col, direction: dir as "asc" | "desc", usesIndex: indexCoversSort });
    }
  }

  // Determine scan type
  let scanType: QueryPlan["scanType"] = "seq_scan";
  let usesIndex = false;
  let indexName: string | undefined;

  if (schema && filters.length > 0) {
    for (const idx of schema.indexes) {
      const filterCols = filters.map((f) => f.column);
      if (idx.columns.some((c) => filterCols.includes(c))) {
        usesIndex = true;
        indexName = idx.name;
        scanType = "index_scan";
        break;
      }
    }
  }

  // Estimate cost
  const baseRows = schema?.rowCount ?? 1000;
  const filterReduction = filters.reduce((acc, f) => acc * f.selectivity, 1);
  const estimatedRows = Math.max(1, Math.round(baseRows * filterReduction));
  const estimatedCost = usesIndex
    ? Math.log2(baseRows) * estimatedRows
    : baseRows;

  // Generate suggestions
  const suggestions = generateSuggestions(
    normalized, filters, joins, sorts, usesIndex, schema
  );

  return {
    id: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    query,
    table,
    operation,
    estimatedRows,
    estimatedCost,
    usesIndex,
    indexName,
    scanType,
    filters,
    joins,
    sorts,
    suggestions,
  };
}

function generateSuggestions(
  query: string,
  filters: QueryFilter[],
  joins: QueryJoin[],
  sorts: QuerySort[],
  usesIndex: boolean,
  schema?: TableSchema,
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];

  // No WHERE clause
  if (filters.length === 0 && query.startsWith("select")) {
    suggestions.push({
      type: "use_where",
      description: "Add WHERE clause to filter rows and reduce scan size",
      priority: "high",
      estimatedImprovement: 60,
    });
  }

  // No index used despite filters
  if (filters.length > 0 && !usesIndex) {
    const cols = filters.map((f) => f.column).join(", ");
    suggestions.push({
      type: "add_index",
      description: `Create an index on (${cols}) to speed up filtering`,
      priority: "high",
      estimatedImprovement: 70,
    });
  }

  // SELECT * pattern
  if (query.includes("select *")) {
    suggestions.push({
      type: "avoid_select_star",
      description: "Select only needed columns instead of using SELECT *",
      priority: "medium",
      estimatedImprovement: 20,
    });
  }

  // No LIMIT
  if (!query.includes("limit") && query.startsWith("select")) {
    suggestions.push({
      type: "add_pagination",
      description: "Add LIMIT/OFFSET for pagination to reduce result set size",
      priority: "medium",
      estimatedImprovement: 40,
    });
  }

  // Unsorted join columns without index
  if (joins.length > 0 && schema) {
    for (const join of joins) {
      const hasJoinIndex = schema.indexes.some((idx) =>
        idx.columns.includes(join.column)
      );
      if (!hasJoinIndex) {
        suggestions.push({
          type: "optimize_join",
          description: `Add index on ${join.column} to optimize join with ${join.table}`,
          priority: "high",
          estimatedImprovement: 50,
        });
      }
    }
  }

  // Sort without index
  for (const sort of sorts) {
    if (!sort.usesIndex) {
      suggestions.push({
        type: "add_index",
        description: `Add index on ${sort.column} to avoid file sort`,
        priority: "medium",
        estimatedImprovement: 30,
      });
    }
  }

  return suggestions;
}

/* ------------------------------------------------------------------ */
/*  Index suggestion                                                  */
/* ------------------------------------------------------------------ */

/**
 * Suggest indexes for a table based on query patterns.
 */
export function suggestIndexes(
  table: string,
  queries: string[]
): IndexSuggestion[] {
  const schema = schemas.get(table);
  const columnFrequency = new Map<string, number>();
  const suggestions: IndexSuggestion[] = [];

  // Analyze queries for column usage
  for (const q of queries) {
    const plan = analyzeQuery(q, table);
    for (const filter of plan.filters) {
      columnFrequency.set(
        filter.column,
        (columnFrequency.get(filter.column) ?? 0) + 1
      );
    }
    for (const sort of plan.sorts) {
      columnFrequency.set(
        sort.column,
        (columnFrequency.get(sort.column) ?? 0) + 1
      );
    }
  }

  // Sort by frequency and suggest indexes
  const sorted = Array.from(columnFrequency.entries()).sort(
    (a, b) => b[1] - a[1]
  );

  for (const [column, freq] of sorted) {
    // Skip if index already exists
    if (schema?.indexes.some((idx) => idx.columns[0] === column)) continue;

    const colDef = schema?.columns.find((c) => c.name === column);
    const indexType = colDef?.type === "jsonb" ? "gin" : "btree";

    suggestions.push({
      table,
      columns: [column],
      type: indexType,
      reason: `Column "${column}" is used in ${freq} queries as filter/sort`,
      estimatedBenefit: Math.min(80, freq * 15),
      createStatement: `CREATE INDEX idx_${table}_${column} ON ${table} USING ${indexType} (${column});`,
    });
  }

  return suggestions;
}

/* ------------------------------------------------------------------ */
/*  Query caching                                                     */
/* ------------------------------------------------------------------ */

/**
 * Cache a query result.
 */
export function cacheQuery<T>(
  query: string,
  result: T,
  executionTimeMs: number,
  ttlMs: number = 60_000
): CachedQuery<T> {
  const key = normalizeQuery(query);
  const entry: CachedQuery<T> = {
    key,
    result,
    executionTimeMs,
    cachedAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
    hitCount: 0,
  };
  queryCache.set(key, entry as CachedQuery);
  return entry;
}

/**
 * Get a cached query result if available and not expired.
 */
export function getCachedQuery<T>(query: string): T | null {
  const key = normalizeQuery(query);
  const entry = queryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    queryCache.delete(key);
    return null;
  }
  entry.hitCount++;
  return entry.result as T;
}

/**
 * Invalidate cached queries matching a pattern.
 */
export function invalidateCache(pattern?: string): number {
  if (!pattern) {
    const count = queryCache.size;
    queryCache.clear();
    return count;
  }
  let count = 0;
  for (const key of queryCache.keys()) {
    if (key.includes(pattern)) {
      queryCache.delete(key);
      count++;
    }
  }
  return count;
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

/* ------------------------------------------------------------------ */
/*  Slow query detection                                              */
/* ------------------------------------------------------------------ */

/**
 * Record a query execution.
 */
export function recordQueryExecution(
  query: string,
  executionTimeMs: number,
  usedCache: boolean = false
): void {
  const now = new Date().toISOString();
  queryLog.push({ query, timeMs: executionTimeMs, timestamp: now, usedCache });

  // Track slow queries
  if (executionTimeMs > slowThresholdMs) {
    const normalized = normalizeQuery(query);
    const existing = slowQueries.get(normalized);
    if (existing) {
      existing.frequency++;
      if (executionTimeMs > existing.executionTimeMs) {
        existing.executionTimeMs = executionTimeMs;
        existing.timestamp = now;
      }
    } else {
      slowQueries.set(normalized, {
        query,
        executionTimeMs,
        timestamp: now,
        frequency: 1,
      });
    }
  }
}

/**
 * Get all recorded slow queries sorted by execution time.
 */
export function getSlowQueries(limit: number = 20): SlowQuery[] {
  return Array.from(slowQueries.values())
    .sort((a, b) => b.executionTimeMs - a.executionTimeMs)
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/*  Performance metrics                                               */
/* ------------------------------------------------------------------ */

/**
 * Compute overall query performance metrics.
 */
export function getQueryMetrics(windowMs: number = 60_000): QueryMetrics {
  const cutoff = Date.now() - windowMs;
  const recent = queryLog.filter(
    (e) => new Date(e.timestamp).getTime() > cutoff
  );

  if (recent.length === 0) {
    return {
      totalQueries: 0,
      averageTimeMs: 0,
      p50TimeMs: 0,
      p95TimeMs: 0,
      p99TimeMs: 0,
      slowQueryCount: 0,
      cacheHitRate: 0,
      indexUsageRate: 0,
      queriesPerSecond: 0,
      topSlowQueries: [],
    };
  }

  const times = recent.map((e) => e.timeMs).sort((a, b) => a - b);
  const cacheHits = recent.filter((e) => e.usedCache).length;

  const percentile = (p: number): number => {
    const idx = Math.ceil((p / 100) * times.length) - 1;
    return times[Math.max(0, idx)];
  };

  return {
    totalQueries: recent.length,
    averageTimeMs: times.reduce((a, b) => a + b, 0) / times.length,
    p50TimeMs: percentile(50),
    p95TimeMs: percentile(95),
    p99TimeMs: percentile(99),
    slowQueryCount: recent.filter((e) => e.timeMs > slowThresholdMs).length,
    cacheHitRate: recent.length > 0 ? cacheHits / recent.length : 0,
    indexUsageRate: 0, // Would need actual DB metadata
    queriesPerSecond: (recent.length / windowMs) * 1000,
    topSlowQueries: getSlowQueries(10),
  };
}

/** Clear all stored data (for testing). */
export function resetQueryOptimizer(): void {
  queryCache.clear();
  queryLog.length = 0;
  slowQueries.clear();
  schemas.clear();
}
